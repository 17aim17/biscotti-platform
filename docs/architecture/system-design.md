# Biscotti: how the system works

Biscotti lets a restaurant take orders on its own branded website instead of through a delivery app. Each restaurant gets three screens: a **storefront** for customers, a **kitchen screen** for live orders, and a **dashboard** for the menu, outlets, staff and settings. It is a small, deliberately simple MVP: strict where it matters (money, permissions, who can see data), plain everywhere else.

Terms in **bold** are explained in the [glossary](#glossary) at the end. What the original 2020 app got wrong is in [rebuild notes](rebuild-notes.md); each decision has a one-page [ADR](../adr).

---

## 1. Who uses it

| Person         | What they do                                                                                        | Where                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Customer       | Browse the menu, fill a cart, sign in with their phone, pay online or in cash, watch the order live | `/casa-spezia`, `/casa-spezia/checkout`, `/casa-spezia/orders/…` |
| Kitchen staff  | See new orders appear, accept or reject, move them along until delivered                            | `/casa-spezia/kitchen`                                           |
| Manager, owner | Edit the menu and photos, outlets and hours, staff, branding, legal pages; handle refunds           | `/casa-spezia/dashboard/…`                                       |

Every restaurant lives under its own URL prefix (`/casa-spezia`, `/osteria-sole`). That prefix is how the app knows which restaurant a page belongs to.

**Size:** a few restaurants, a few orders a minute at the busiest. One app and one database are plenty; the hard parts are correctness and security, not load.

---

## 2. The pieces

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

| Piece                                 | What it does                                                                                          | Why it is here                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Browser                               | Shows pages; keeps the cart in `localStorage`                                                         | The cart needs no server until checkout                                                    |
| Next.js pages (**Server Components**) | Run on the server, read the database, send finished HTML                                              | Data never has to be fetched and stored in the browser (the old app needed Redux for that) |
| **Server Actions**                    | Functions like `placeOrderAction` that the browser calls on a click; they run on the server           | No hand-written API layer; typed from button to database                                   |
| `packages/core`                       | All business rules: pricing, checking hours and delivery range, order statuses, payments, permissions | One place for the rules, separate from the UI, easy to reuse (for a mobile API later)      |
| `packages/db` (**Prisma**)            | Defines the tables and runs the queries                                                               | Typed queries and versioned **migrations**                                                 |
| Postgres                              | Stores everything; also enforces rules of its own (**constraints**, **RLS**)                          | Relational data with **transactions**, unlike the old Firestore                            |
| Supabase Auth                         | Phone number + one-time code sign-in; the session is a cookie                                         | Managed login, no passwords to store                                                       |
| Supabase Realtime                     | Tells the kitchen and the customer's page when an order changes                                       | Orders appear within a second without refreshing                                           |
| Supabase Storage                      | Holds photos uploaded in the dashboard                                                                | Files next to the data                                                                     |
| Razorpay                              | Takes online payments; tells our server when money arrives (**webhook**)                              | Cards, UPI and netbanking in India                                                         |

**Repo layout:** `apps/web` is the only app that is deployed. It uses `packages/core` (rules), which uses `packages/db` (database). `packages/ui` holds shared buttons and dialogs.

---

## 3. Three journeys, step by step

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

## 4. The data

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

## 5. Who can do what

Three layers, from the outside in:

1. **Sign-in.** A phone number and a one-time code. The session lives in a cookie that `proxy.ts` refreshes on each request.
2. **Roles (RBAC)**, checked on the server for every action, per restaurant:

   | Can                                         | Staff | Manager | Owner |
   | ------------------------------------------- | ----- | ------- | ----- |
   | Use the kitchen screen                      | ✓     | ✓       | ✓     |
   | See orders, edit the menu and outlets       |       | ✓       | ✓     |
   | Mark refunds, manage staff, change settings |       |         | ✓     |

   Customers have no role. They can only see, pay for and cancel their **own** orders. Two extra rules: a restaurant always keeps an owner, and nobody can remove or demote themselves.

3. **The database lock (RLS).** Browsers can reach Supabase directly, so every table is locked by default. The only thing a browser may read directly is order updates for Realtime: a customer's own orders, and staff's current kitchen orders. Everything else goes through the server.

---

## 6. How money and orders stay correct

| Risk                                       | What prevents it                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Customer changes a price in the browser    | The browser only sends dish ids and quantities; the server prices everything          |
| Double click creates two orders            | **Idempotency key** + a unique index: the second request gets the same order          |
| Kitchen accepts while the customer cancels | **Guarded updates**: `…WHERE status = 'PLACED'` succeeds for only one of them         |
| Payment recorded twice, or a fake "paid"   | Signatures checked, amounts compared, unique Razorpay ids, guarded update to `PLACED` |
| Browser closes right after paying          | Razorpay's **webhook** records the payment anyway                                     |
| Money arrives for a rejected order         | Marked `needs_refund`; the owner refunds it and marks it in the dashboard             |

---

## 7. Main decisions

| Decision                                                                                                    | Why                                                          | Trade-off                                                |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| One Next.js app, rules in `core` ([ADR 0003](../adr/0003-modular-monolith.md))                              | One deploy, simplest to build and explain                    | Storefront and dashboard scale together                  |
| Supabase: Postgres, Auth, Storage, Realtime ([0001](../adr/0001-supabase-over-firebase.md))                 | Real relational database plus managed login and live updates | Tied to Supabase's services (the data is plain Postgres) |
| Restaurant in the URL path ([0007](../adr/0007-path-based-tenancy.md))                                      | Works on a free domain with one login                        | Subdomains later, via a rewrite                          |
| Cart in the browser, priced on the server ([0009](../adr/0009-cart-in-the-browser-priced-on-the-server.md)) | Simple and safe                                              | No cart across devices yet                               |
| Payments confirmed twice ([0005](../adr/0005-payments-webhook-and-callback.md))                             | Either confirmation can be lost                              | Refunds are manual for now                               |
| Database locked by default ([0008](../adr/0008-rls-as-a-second-lock.md))                                    | A missed check in code cannot expose data to browsers        | Server code must still filter by restaurant              |
| No tests, logs or queues yet ([0011](../adr/0011-what-is-not-built.md))                                     | Finish the core loop first                                   | Listed first in the backlog                              |

---

## 8. What comes next

From the [backlog](../backlog.md), in rough order: a cart that follows you across devices, promo codes, dish options, automated tests, logs and error tracking, automatic refunds, reliable SMS (retries), rate limits.

At much larger scale: cache the menu pages, a read replica for storefront traffic, a queue for notifications, split the storefront and dashboard into separate apps.

---

## Glossary

- **Server Component:** a React component that runs only on the server; it can read the database and sends plain HTML to the browser.
- **Server Action:** a server function the browser calls directly (for example on a button click); Next.js turns the call into a request for you.
- **Prisma:** the library that defines the tables in TypeScript and runs typed queries.
- **Migration:** a versioned SQL file that changes the database structure; applied in order, kept in git.
- **Transaction:** several database changes that either all happen or none do.
- **Constraint:** a rule inside the database (unique, not null, a check like `price >= 0`) that rejects bad data even if the code has a bug.
- **RLS (row level security):** Postgres rules that decide which rows a signed-in browser may read; here, almost none.
- **Webhook:** a request another service (Razorpay) sends to our server when something happens, like a payment.
- **Idempotency key:** a random id sent with a request so that repeating the request has no extra effect.
- **Guarded update:** an update that only applies if the row is still in the expected state (`WHERE status = 'PLACED'`), so two people cannot both "win".
