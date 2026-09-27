# Rebuild notes: what was wrong, and what Biscotti does instead

Biscotti rebuilds the original app (a Firebase project I built as a student in 2020): a food ordering app for a restaurant with a few outlets. It had a React + Redux storefront, a handful of Cloud Functions, a separate admin app with an Express server, Firestore, Razorpay and SMS. Six years later I reviewed it as a senior engineer, locked the old project down, and rebuilt it as a small multi-tenant platform. Only the menu data came across.

This page lists what was wrong, how each problem is handled now, and the problems the rebuild itself ran into.

## Security

| The original app                                                                                                                                                                                                                                                                                             | Biscotti                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database rules were `allow read, write: if true` for about five and a half years. Anyone with the project ID (public in the web bundle) could read every customer's phone number and address, and change or delete anything. It started as "test mode", which expired and was "fixed" by opening everything. | Row level security is on for every table with no policies by default, and the browser roles' grants are revoked. The only reads Supabase's API serves are for live updates: a customer's own orders, and staff's current orders. Everything else goes through server code. ([ADR 0008](../adr/0008-rls-as-a-second-lock.md)) |
| The admin API checked that you were signed in, never that you were an admin. Any customer could edit the menu or make themselves an outlet user.                                                                                                                                                             | Role-based access per restaurant (owner, manager, staff). Every core function that reads or changes restaurant data calls `requirePermission` first, and it throws rather than returning false.                                                                                                                              |
| The browser sent prices; the server added them up for the payment.                                                                                                                                                                                                                                           | The browser sends dish ids and quantities only. The server loads prices, fees and tax, and the checkout page shows the server's own quote. ([ADR 0009](../adr/0009-cart-in-the-browser-priced-on-the-server.md))                                                                                                             |
| The browser wrote orders with `paymentStatus: 'Success'` hard-coded. The payment signature was never checked.                                                                                                                                                                                                | Only the server marks an order paid: after checking Razorpay's signature (browser callback) or the webhook's HMAC over the raw body, with the amount compared to the order. ([ADR 0005](../adr/0005-payments-webhook-and-callback.md))                                                                                       |
| A service-account private key was committed to git; live payment and SMS secrets were deployed inside function code.                                                                                                                                                                                         | Secrets live in an untracked `.env` locally and in the host's settings in production. Nothing secret is prefixed `NEXT_PUBLIC_`.                                                                                                                                                                                             |
| File storage let any signed-in user read or overwrite files, including ID documents.                                                                                                                                                                                                                         | Photos are uploaded through a server action that checks the role, the size and the file's real type from its bytes. Files go to the restaurant's own folder, and only those URLs (or the demo photos) are accepted.                                                                                                          |

## Correctness and data

| The original app                                                                                                                             | Biscotti                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No schema: orders were linked to users under three field names, prices were strings, typos were baked into the data (`lable`, `signnature`). | Postgres with a Prisma schema, migrations, foreign keys and check constraints. Money is integer paise. ([ADR 0004](../adr/0004-money-in-paise.md))                                                     |
| Cancelled was spelled two ways, so the cancellation SMS never fired.                                                                         | Order statuses are an enum with one transition map in core. Every change is a guarded update: `WHERE status = <the status we read>`. ([ADR 0006](../adr/0006-order-status-map-and-guarded-updates.md)) |
| SMS was sent on every write to an order, so any edit could resend it.                                                                        | Messages are sent after a status change commits, only for statuses that have a message.                                                                                                                |
| Cart updates were read-modify-write without transactions.                                                                                    | The cart lives in the browser (ids and quantities). The server prices it once, at checkout.                                                                                                            |
| Menu copied into every outlet; fan-out loops dropped failures silently.                                                                      | One menu per restaurant; outlets hold their own fees, hours and delivery area.                                                                                                                         |
| A double submit could create two orders.                                                                                                     | Each checkout attempt sends an idempotency key; a unique index turns a duplicate into the same order.                                                                                                  |

## Operations

| The original app                                                           | Biscotti                                                                                                                                                                                                                |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rules, indexes and config lived only in the console.                       | Schema, migrations, row level security, local Supabase config and CI are in the repo.                                                                                                                                   |
| The runtime was retired and billing closed, so it could not be redeployed. | Current Node LTS pinned with mise, one Next.js app on Vercel, Supabase managed Postgres. ([ADR 0003](../adr/0003-modular-monolith.md))                                                                                  |
| No tests, no CI, no staging.                                               | CI runs format, typecheck, lint and a build without a database. Check scripts in `packages/core/scripts` exercise ordering, status changes and payments against the local database. Automated tests are in the backlog. |

## Problems the rebuild ran into

A new codebase has its own bugs. These were found by check scripts or code reviews, and fixed:

- **A retried payment could be lost.** Razorpay lets a customer retry inside the same payment window (card declined, then UPI). The failed attempt's webhook arrived first, and the code then ignored the successful one. Now a failed attempt can still become captured.
- **Cancel and accept at the same moment** could flag a refund on an order that was being cooked, because a batch transaction is atomic but not conditional. It is now an interactive transaction that stops before touching the payment if the order change lost.
- **Default grants.** Supabase gives the browser roles broad privileges on new tables. Row level security blocked the rows, but a future table without it would have been open. Revoked everything, including defaults for future tables.
- **Staff could read the whole order history** (phones and addresses) through Supabase's API, because the live-update policy covered every order of their restaurant. It now matches the kitchen screen: current orders only.
- **Open redirect after sign-in:** `/\t/evil.example` passed a "starts with /" check but browsers read it as `//evil.example`. The return path is now parsed like a browser would.
- **Two owners demoting each other at once** could leave a restaurant with no owner. Those changes run in serializable transactions.
- **Photos of 1-2 MB** failed silently, because server actions accept 1 MB by default. The limit is raised, and every browser call to the server now turns a failed request into a message instead of a stuck spinner.

## Where the Redux store went

The original storefront kept everything in a global Redux store: whole Firestore collections, the cart, open modals, search text. In Biscotti:

| Redux slice                                          | Now                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| Signed-in user                                       | Supabase session cookie, read on the server                      |
| Menu, categories, outlets                            | Fetched by Server Components per request, passed as props        |
| Filtered menu (a `store.subscribe` workaround)       | Computed with `useMemo` from the menu                            |
| Cart (a server call per tap)                         | `localStorage` behind `useSyncExternalStore`, priced at checkout |
| My orders (live listener)                            | Server-rendered pages; Realtime only triggers a refresh          |
| Promo codes (every code downloaded to every browser) | Not built yet; will be checked on the server only                |
| Modals, search, filters                              | Local component state                                            |

Most of the old store was a client-side cache of server data. Server Components removed the need for it; the only state several components share in the browser is the cart.

## Decisions

- [0001 Supabase over Firebase](../adr/0001-supabase-over-firebase.md)
- [0002 Prisma and app-first logic](../adr/0002-prisma-and-app-first-logic.md)
- [0003 One Next.js app](../adr/0003-modular-monolith.md)
- [0004 Money in integer paise](../adr/0004-money-in-paise.md)
- [0005 Payments: webhook and browser callback](../adr/0005-payments-webhook-and-callback.md)
- [0006 Order status map and guarded updates](../adr/0006-order-status-map-and-guarded-updates.md)
- [0007 Path-based tenancy](../adr/0007-path-based-tenancy.md)
- [0008 Row level security as a second lock](../adr/0008-rls-as-a-second-lock.md)
- [0009 Cart in the browser, priced on the server](../adr/0009-cart-in-the-browser-priced-on-the-server.md)
- [0010 Maps without Google](../adr/0010-maps-without-google.md)
- [0011 What is deliberately not built](../adr/0011-what-is-not-built.md)
