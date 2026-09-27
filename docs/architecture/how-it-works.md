# How Biscotti works: the pieces

Biscotti lets a restaurant take orders on its own branded website instead of through a delivery app. Each restaurant gets three screens: a **storefront** for customers, a **kitchen screen** for live orders, and a **dashboard** for the menu, outlets, staff and settings.

This page explains the pieces of the app and the ideas behind them, in plain words. For the interview version (requirements, numbers, trade-offs, deep dives) see [system design](system-design.md). What the original 2020 app got wrong is in [rebuild notes](rebuild-notes.md). Terms in **bold** are in the [glossary](#glossary).

---

## 1. Who uses it

| Person         | What they do                                                                                        | Where                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Customer       | Browse the menu, fill a cart, sign in with their phone, pay online or in cash, watch the order live | `/casa-spezia`, `/casa-spezia/checkout`, `/casa-spezia/orders/…` |
| Kitchen staff  | See new orders appear, accept or reject, move them along until delivered                            | `/casa-spezia/kitchen`                                           |
| Manager, owner | Edit the menu and photos, outlets and hours, staff, branding, legal pages; handle refunds           | `/casa-spezia/dashboard/…`                                       |

Every restaurant lives under its own URL prefix (`/casa-spezia`, `/osteria-sole`). That prefix is how the app knows which restaurant a page belongs to.

---

## 2. The big picture

```
  Phone / tablet / laptop (the browser)
        │  pages, button clicks
        ▼
  ┌──────────── Next.js app (apps/web), hosted on Vercel ────────────┐
  │  Pages (Server Components): build the HTML on the server          │
  │  Server Actions: functions the browser calls when you click       │
  │  One API route: /api/webhooks/razorpay                            │
  │          │                                                        │
  │  packages/core: the business rules (prices, orders, payments,     │
  │                 who is allowed to do what)                        │
  │          │                                                        │
  │  packages/db: Prisma, the code that talks to the database         │
  └──────────┼───────────────────────────────────────────────────────┘
             ▼
  ┌──────────────────── Supabase ────────────────────────────────────┐
  │  Postgres (the database)     Auth (phone sign-in)                  │
  │  Storage (menu photos)       Realtime (pushes order changes live)  │
  └───────────────────────────────────────────────────────────────────┘
        ▲ payment confirmations                    SMS to customers ▶
     Razorpay
```

**Repo layout:** `apps/web` is the only app that is deployed. It uses `packages/core` (rules), which uses `packages/db` (database). `packages/ui` holds shared buttons and dialogs.

---

## 3. Frontend pieces

Everything here lives in `apps/web`.

| Piece                                  | Where                                                                  | What it does                                                                                                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App Router** routes                  | `app/`                                                                 | Folders are URLs: `app/[restaurant]/(storefront)/checkout/page.tsx` is `/casa-spezia/checkout`. `[restaurant]` is a variable part (the slug).                                                               |
| Route groups                           | `(storefront)`, `(staff)`                                              | Folders in parentheses do not appear in the URL; they give the customer pages and the staff pages different headers and footers.                                                                            |
| **Server Components** (default)        | every `page.tsx`, layouts                                              | Run on the server, read data through `core`, send HTML. Most of the UI is these.                                                                                                                            |
| **Client Components** (`"use client"`) | menu browser, cart, checkout form, map, kitchen board, dashboard forms | Run in the browser for anything interactive: clicks, typing, the map, live updates. They receive data from Server Components as props.                                                                      |
| Cart store                             | `lib/cart/store.ts`                                                    | The cart in `localStorage` (dish ids and quantities only), read through `useSyncExternalStore` so every component sees the same cart, across tabs too.                                                      |
| Calling the server                     | Server Actions + `lib/call-action.ts`                                  | A form or button calls an action like `placeOrderAction(...)`. It returns `{ ok: true, data }` or `{ ok: false, error }`, and a failed network request becomes an error message instead of a stuck spinner. |
| Live updates                           | `order-live.tsx`, kitchen board                                        | Subscribe to Supabase Realtime; when an order changes they call `router.refresh()`, which re-runs the page's server code. Polling every 15-20 s is the fallback.                                            |
| Theming per restaurant                 | `lib/brand.ts`, `components/styles.ts`                                 | A restaurant picks a preset (classic, modern, vibrant) and two colours; these become CSS variables (`--brand`, `--sf-bg`, ...) that every component uses, so one codebase looks different per restaurant.   |
| Map and place search                   | `components/delivery-map.tsx`, `checkout/location-search.tsx`          | Leaflet with OpenStreetMap tiles; Photon for "search as you type" and for turning a pin into an address.                                                                                                    |
| Photos                                 | `next/image`                                                           | Resizes and caches photos from Unsplash (demo) and Supabase Storage (uploads).                                                                                                                              |
| UI kit                                 | `packages/ui`                                                          | shadcn components (dialog, switch, button) styled with Tailwind CSS.                                                                                                                                        |

**Rule of thumb:** a component is a Server Component unless it needs the browser. That keeps data fetching and secrets on the server and sends less JavaScript.

---

## 4. Backend pieces

| Piece              | Where                                | What it does                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server Actions** | `actions.ts` next to each page       | The entry points for every change. Thin: find the signed-in user, then call a `core` function.                                                                                                                                                     |
| Webhook route      | `app/api/webhooks/razorpay/route.ts` | The one classic HTTP endpoint: Razorpay calls it when a payment succeeds or fails.                                                                                                                                                                 |
| `proxy.ts`         | `apps/web`                           | Runs before every request and refreshes the login cookie.                                                                                                                                                                                          |
| Business rules     | `packages/core`                      | One folder per topic: `orders` (placing, statuses, kitchen list), `pricing`, `payments`, `locations` (hours, distance), `auth` (permissions), `dashboard` (menu, outlets, staff, settings), `notifications` (SMS). Never imports Next.js or React. |
| Input checking     | `core/src/validation.ts` + zod       | Every input from the browser is checked against a schema before use.                                                                                                                                                                               |
| Errors             | `DomainError`                        | Expected failures (closed outlet, out of range, no access) carry a message safe to show; anything else is logged and shown as a generic error.                                                                                                     |
| Database access    | `packages/db` (**Prisma**)           | Table definitions, **migrations**, a typed client, and the seed script for demo data.                                                                                                                                                              |
| Postgres           | Supabase                             | Stores everything and enforces its own rules (**constraints**, **RLS**, triggers).                                                                                                                                                                 |
| Auth               | Supabase Auth                        | Phone number + one-time code. The session is a signed cookie; the server reads the user id from it, the browser never sends it.                                                                                                                    |
| Realtime           | Supabase Realtime                    | Streams changes to the `orders` table to subscribed browsers, filtered by RLS.                                                                                                                                                                     |
| Storage            | Supabase Storage                     | The `menu-images` bucket; uploads go through a Server Action, never straight from the browser.                                                                                                                                                     |
| Payments           | Razorpay                             | Payment window in the browser; confirmation by signed callback and **webhook**.                                                                                                                                                                    |
| SMS                | `core/notifications`                 | Sent after an order status changes; prints to the console in development.                                                                                                                                                                          |

---

## 5. Three journeys, step by step

**A. Opening the menu** (`/casa-spezia`)

1. The browser asks for the page. The Next.js server finds the restaurant by its slug (`casa-spezia`).
2. The page's server code reads the menu from Postgres (through `core` and Prisma) and renders the HTML.
3. The browser shows it. "Add" only updates the cart in `localStorage`; nothing is sent yet.

**B. Placing and paying for an order**

1. At checkout the customer signs in (phone + code); Supabase sets a session cookie.
2. As they pick delivery or pickup, move the map pin or change dishes, the page calls `quoteAction`. The server loads real prices, fees and tax and returns the total. The browser never sends a price.
3. "Pay" calls `placeOrderAction`. Core checks the outlet is open, the pin is inside the delivery area and every dish is available, prices the order again, and saves it as `PENDING_PAYMENT`. The request carries an **idempotency key**, so a double click cannot create two orders.
4. The server creates a payment with Razorpay and the browser opens Razorpay's payment window.
5. The customer pays. Two confirmations may arrive, in any order: the browser's signed callback and Razorpay's **webhook**. Each is checked (signature, amount), and the first one moves the order to `PLACED` with a **guarded update**; the second finds nothing left to do.
6. The customer lands on the order page, which listens for changes through Realtime.

(Cash orders skip steps 4-5: they are saved as `PLACED` straight away.)

**C. The kitchen moves the order**

1. The kitchen screen is listening through Realtime. The new order appears (with a chime) within about a second.
2. Staff press Accept, then Start cooking, Mark ready, Out for delivery. Each press calls `moveOrderAction`; core checks the person's role and that the move is allowed from the current status.
3. Each change is pushed to the customer's order page, and an SMS goes out for the important ones (accepted, on the way).

---

## 6. The data

```
auth.users (Supabase's own table: phone, sign-in)
   │ same id
   ▼
profiles ──< memberships >── restaurants ──< locations
   │         (a role at one      │
   │          restaurant)        ├──< categories ──< menu_items
   │                             │
   └────────< orders >───────────┘
                │
                ├──< order_items
                └──< payments
```

(`A ──< B` means one A has many B.)

**Users, profiles and memberships.** Supabase keeps the real users table (`auth.users`: phone, sign-in details) in its own area of the database; the app never writes to it. The app's own record of a person is `profiles`, with the **same id**. A trigger creates it at first sign-in and removes it if the login is deleted (unless the person has orders). Nobody has a "type": everyone is a customer by default, and a `memberships` row gives a person a role at one restaurant. So one person can own one restaurant and order from another.

| Table         | What it stores                                                                                                      | Example                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `restaurants` | One brand: name, URL slug, look (colours, photos, tagline), legal pages, GSTIN/FSSAI                                | Casa Spezia, `casa-spezia`, classic look    |
| `locations`   | One outlet: address, map position, delivery radius, opening hours, fees, tax, cash/pickup yes or no, a pause switch | Chandigarh, 5 km, 09:00-03:00, delivery ₹30 |
| `categories`  | A menu section, in order                                                                                            | Appetizers (1st), Soups (2nd)               |
| `menu_items`  | A dish: name, description, price, veg or not, photo, sold out today, signature dish                                 | Achari Paneer Tikka, ₹249, veg              |
| `profiles`    | A person (customer or staff)                                                                                        | +91 99999 00001, "Test Customer"            |
| `memberships` | A person's role at a restaurant                                                                                     | +91 99999 00003 is **staff** at Casa Spezia |
| `orders`      | An order: number, status, delivery or pickup, cash or online, copies of name/phone/address, all totals              | #2, `DELIVERED`, delivery, cash, ₹732.90    |
| `order_items` | The dishes on an order, with the name and price **as they were** when ordered                                       | 1 × Achari Paneer Tikka at ₹249             |
| `payments`    | One online payment attempt with Razorpay's ids and its outcome                                                      | `captured`, ₹313.95                         |

Rules that hold everywhere:

- **Money is whole paise** (₹249 is stored as `24900`): no rounding errors. Tax is stored in basis points (5% = `500`).
- **Orders keep copies** of dish names, prices and the address, so editing the menu later never changes a past order.
- **Dishes and categories are archived, never deleted**, because old orders point at them.
- **Order statuses** follow one map: `PENDING_PAYMENT → PLACED → ACCEPTED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED` (pickup ends with `PICKED_UP`), with `REJECTED` and `CANCELLED` as exits.
- The database itself refuses bad data (**constraints**): negative prices, totals that don't add up, a delivery order without an address.

---

## 7. One database, many restaurants

All restaurants share the same tables. Casa Spezia's dishes and Osteria Sole's dishes sit in the same `menu_items` table; every row carries a `restaurant_id` saying whose it is. This is **shared-schema multi-tenancy** (each restaurant is a "tenant"), the usual choice for SaaS with many small customers.

| Approach                     | How                                             | Good for                                                  | Cost                                                                        |
| ---------------------------- | ----------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Shared tables** (Biscotti) | One set of tables, a `restaurant_id` column     | Many small tenants; one migration updates everyone; cheap | Every query must remember to filter by restaurant                           |
| Schema per tenant            | Each restaurant gets its own copy of the tables | Stronger separation                                       | Every migration runs once per restaurant; cross-restaurant reports get hard |
| Database per tenant          | Each restaurant gets its own database           | Very large or regulated customers                         | Expensive to run and operate                                                |

The indexes start with `restaurant_id`, so one restaurant's queries only read its own rows. A huge chain could later be moved to its own database without changing the rest.

---

## 8. Who can do what

**Every change is checked twice before it touches the database**, inside `core`:

1. **Your role at this restaurant** (`requirePermission`, from `memberships`):

   | Can                                         | Staff | Manager | Owner |
   | ------------------------------------------- | ----- | ------- | ----- |
   | Use the kitchen screen                      | ✓     | ✓       | ✓     |
   | See orders, edit the menu and outlets       |       | ✓       | ✓     |
   | Mark refunds, manage staff, change settings |       |         | ✓     |

2. **That the thing belongs to that restaurant, or to you** (the dish's `restaurant_id`, the order's `customer_id`). Osteria Sole's owner cannot edit a Casa Spezia dish: acting as Casa fails the role check, acting as Osteria fails the ownership check.

Customers have no role; they can only see, pay for and cancel their **own** orders. A restaurant always keeps an owner, and nobody can remove or demote themselves.

**Two doors into the database.** The same Postgres database can be reached two ways, each with its own guard:

```
 Door 1: our server   Browser → Next.js → core checks → Prisma ──┐  connects as "postgres":
                                                                  │  RLS does not apply
                                                                  ▼
                                                             Postgres
                                                                  ▲
 Door 2: Supabase API Browser → REST / Realtime (public key) ─────┘  connects as "anon" or
                                                                     "authenticated": RLS applies
```

|                   | Door 1: our server                   | Door 2: Supabase's API                                                 |
| ----------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Used for          | Everything: pages, orders, dashboard | Only live order updates (Realtime)                                     |
| Guard             | Core's role and ownership checks     | **RLS**: every table locked, no policies; browser grants revoked       |
| What gets through | Changes that pass the checks         | Read-only: a customer's own orders, and staff's current kitchen orders |

Door 2 exists because Supabase serves every table through an API and the public key is visible in the browser. It is exactly the door that exposed the original app's data. Locking it by default means a mistake in code cannot open the database to browsers. Door 1 relies on the code checks; making the database judge server queries too is on the backlog.

---

## 9. How money and orders stay correct

| Risk                                       | What prevents it                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Customer changes a price in the browser    | The browser only sends dish ids and quantities; the server prices everything          |
| Double click creates two orders            | **Idempotency key** + a unique index: the second request gets the same order          |
| Kitchen accepts while the customer cancels | **Guarded updates**: `…WHERE status = 'PLACED'` succeeds for only one of them         |
| Payment recorded twice, or a fake "paid"   | Signatures checked, amounts compared, unique Razorpay ids, guarded update to `PLACED` |
| Browser closes right after paying          | Razorpay's **webhook** records the payment anyway                                     |
| Money arrives for a rejected order         | Marked `needs_refund`; the owner refunds it and marks it in the dashboard             |

---

## Glossary

- **App Router:** Next.js's routing, where folders in `app/` become URLs and each folder can have a page, a layout or a route handler.
- **Server Component:** a React component that runs only on the server; it can read the database and sends plain HTML to the browser.
- **Client Component:** a component marked `"use client"` that also runs in the browser, for interactivity.
- **Server Action:** a server function the browser calls directly (for example on a button click); Next.js turns the call into a request for you.
- **Prisma:** the library that defines the tables in TypeScript and runs typed queries.
- **Migration:** a versioned SQL file that changes the database structure; applied in order, kept in git.
- **Transaction:** several database changes that either all happen or none do.
- **Constraint:** a rule inside the database (unique, not null, a check like `price >= 0`) that rejects bad data even if the code has a bug.
- **RLS (row level security):** Postgres rules that decide which rows a signed-in browser may read; here, almost none.
- **Multi-tenancy:** one system serving many customers (tenants), here restaurants, while keeping their data apart.
- **Webhook:** a request another service (Razorpay) sends to our server when something happens, like a payment.
- **Idempotency key:** a random id sent with a request so that repeating the request has no extra effect.
- **Guarded update:** an update that only applies if the row is still in the expected state (`WHERE status = 'PLACED'`), so two people cannot both "win".
