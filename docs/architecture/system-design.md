# Biscotti: system design

Interview version, in RADIO order: **Requirements → Architecture → Data model → Interface → Optimizations**. For a gentler tour of the pieces and concepts, read [how it works](how-it-works.md) first. Decisions have one-page [ADRs](../adr); what changed from the original 2020 app is in the [rebuild notes](rebuild-notes.md).

**One-line pitch:** a multi-tenant online ordering platform (Lunchbox.io-style) where each restaurant gets a branded storefront, a live kitchen screen and a dashboard, so it can take direct orders instead of paying aggregator commissions. Built as a lean MVP that is strict about money, permissions and data exposure.

---

## R: Requirements

### Users and functional requirements

| Actor         | Must be able to                                                                                                                                                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer      | Browse a restaurant's menu (search, veg filter, dish details); keep a cart without signing in; sign in with phone OTP at checkout; choose outlet, delivery (map pin, inside a radius) or pickup; pay online (Razorpay) or cash; follow the order live; see past orders; cancel before the kitchen accepts |
| Kitchen staff | See new orders within seconds (with sound); accept or reject with a reason; move orders through cooking, ready, out for delivery, delivered or picked up                                                                                                                                                  |
| Manager       | Everything staff can, plus: order history, menu (dishes, photos, sold out), outlets (hours, radius, fees, tax, cash/pickup, pause)                                                                                                                                                                        |
| Owner         | Everything a manager can, plus: staff and roles, branding and legal pages, recording refunds                                                                                                                                                                                                              |

**Out of scope for the MVP** (backlog): cart across devices, promo codes, dish options, delivery-partner app, automatic refunds, native apps, analytics.

### Non-functional requirements (in priority order)

1. **Tenant isolation:** a restaurant never sees or changes another's data; a customer only sees their own orders.
2. **Money correctness:** prices come from the server; no double orders, no double payments, no order marked paid without a verified payment.
3. **Nothing exposed by default:** no table readable from the browser unless explicitly allowed (the original app's database was public for years).
4. **Freshness:** a new order reaches the kitchen in under 2 seconds; status changes reach the customer as fast.
5. **Reliability of payment confirmation:** a paid order is recorded even if the customer closes the tab.
6. **Simplicity and cost:** one developer, free or cheap managed services, easy to explain end to end.

### Back-of-envelope estimates

Assume **50 restaurants × 150 orders a day = 7,500 orders/day**.

| Quantity         | Estimate                                                           | So what                                     |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| Peak orders      | 20% of the day in the dinner hour: 1,500/h ≈ **0.4 orders/s**      | Writes are tiny                             |
| Writes per order | order + items + payment + ~5 status changes ≈ 10                   | Peak ≈ **4 writes/s**                       |
| Menu page views  | ~20 per order: 150k/day, peak ≈ **10 req/s**                       | Reads dominate (~50:1); cache menus first   |
| Live connections | ~100 kitchen tablets + a few hundred customers watching orders     | Well inside one Realtime service            |
| Order storage    | ~3 KB per order with items and payment: ~22 MB/day ≈ **8 GB/year** | One Postgres instance for years             |
| Photos           | 50 restaurants × 100 dishes × ~300 KB ≈ **1.5 GB**                 | Object storage, served through an image CDN |

**Conclusion:** one app and one Postgres database are the right size. The hard problems are correctness, security and concurrency, not throughput. At 100× this is still one database with read replicas and caching (see scaling path).

### Constraints

India: prices in INR with GST, FSSAI licence in the footer, Razorpay for UPI/cards/netbanking, phone OTP (more common than email). Free tiers (Vercel, Supabase) and no paid map API.

---

## A: Architecture

```
  Customer phone            Kitchen tablet / owner laptop
  /casa-spezia              /casa-spezia/kitchen, /casa-spezia/dashboard
        │                           │
        └──────────── HTTPS ────────┘
                       ▼
  ┌──────────────── Next.js on Vercel (one app) ───────────────────────┐
  │  proxy.ts: refresh the session cookie on every request              │
  │  Pages (Server Components) ─── read ──┐                             │
  │  Server Actions ───────────── write ──┤                             │
  │  /api/webhooks/razorpay ──────────────┤                             │
  │                                       ▼                             │
  │  packages/core: pricing · orders · payments · permissions · SMS     │
  │                                       │ Prisma (server only)        │
  └───────────────────────────────────────┼─────────────────────────────┘
                                          ▼
  ┌──────────────────────── Supabase ───────────────────────────────────┐
  │  Postgres (constraints, RLS deny-by-default)    Auth (phone OTP)       │
  │  Realtime (order changes → kitchen, customer)   Storage (photos)       │
  └───────────────────────────────────────────────────────────────────────┘
        ▲ webhook (payment captured/failed)             SMS provider ◀── core
     Razorpay ◀── create payment (server) / payment window (browser)
```

### Components

| Component    | Responsibility                                               | Technology                                              |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------- |
| Web app      | All three surfaces; SSR pages, Server Actions, webhook route | Next.js 16 App Router, React 19, Tailwind, shadcn       |
| Domain layer | Business rules and every permission check; no framework code | `packages/core`, TypeScript, zod                        |
| Data layer   | Schema, migrations, typed queries                            | `packages/db`, Prisma 7, Postgres                       |
| Auth         | Phone OTP, signed session cookie                             | Supabase Auth, `@supabase/ssr`                          |
| Live updates | Push order row changes to browsers                           | Supabase Realtime (`postgres_changes`), filtered by RLS |
| Files        | Menu photos, hero image, logo                                | Supabase Storage, `next/image`                          |
| Payments     | Collect money; confirm by callback and webhook               | Razorpay (test mode)                                    |
| Maps         | Delivery pin, radius, address lookup                         | Leaflet + OpenStreetMap tiles, Photon geocoder          |

### Request paths

- **Read (pages):** browser → Server Component → `core` query (filtered by `restaurant_id`) → HTML. No client-side data store; the old app's Redux cache is gone.
- **Write:** browser → Server Action → `requireUserId()` → `core` function (validate with zod, `requirePermission`, check ownership, write in a transaction) → `{ ok, data }` or `{ ok: false, error }`.
- **Async in:** Razorpay → webhook (verify HMAC over the raw body) → `core.markPaid`.
- **Async out:** Postgres change → Realtime → subscribed browsers → `router.refresh()` re-renders from the server. SMS is sent after the status change commits.

### Key choices and alternatives

| Choice                                                   | Alternatives considered                           | Why this one                                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One Next.js app with a domain package (modular monolith) | Separate storefront/dashboard apps; microservices | One deploy, one auth setup; `core` is reusable behind a REST API later. Services add network hops and ops for no gain at 4 writes/s ([ADR 0003](../adr/0003-modular-monolith.md)) |
| Server Components + Server Actions                       | SPA + REST/GraphQL API                            | No API layer to hand-write, typed end to end, less JavaScript in the browser. REST can be added for native apps, calling the same `core`                                          |
| Supabase (Postgres + Auth + Realtime + Storage)          | Stay on Firebase; self-host Postgres + Auth       | Relational data with transactions and constraints, plus managed login and live updates ([ADR 0001](../adr/0001-supabase-over-firebase.md))                                        |
| Logic in TypeScript, Postgres for integrity              | Logic in SQL functions and RLS only               | Easier to read, test and change; the database still enforces constraints and locks the public API ([ADR 0002](../adr/0002-prisma-and-app-first-logic.md))                         |
| Restaurant in the path (`/casa-spezia`)                  | Subdomain per restaurant                          | Free `*.vercel.app` domain, one cookie; subdomains later via a rewrite ([ADR 0007](../adr/0007-path-based-tenancy.md))                                                            |
| Realtime + refresh, polling fallback                     | Polling only; SSE/WebSockets of our own           | Sub-second updates without running a socket server; polling covers dropped connections                                                                                            |
| Cart in `localStorage`, priced on the server             | Server cart from the first click                  | Browse without login; no race conditions; price integrity kept ([ADR 0009](../adr/0009-cart-in-the-browser-priced-on-the-server.md))                                              |

---

## D: Data model

```
auth.users ─(same id)─ profiles ──< memberships >── restaurants ──< locations
                          │                              ├──< categories ──< menu_items
                          │                              │
                          └──────────< orders >──────────┘   orders ──> locations
                                         ├──< order_items ──> menu_items
                                         └──< payments
```

| Table         | Primary key and relations                           | Unique keys                                | Indexes                                                                      | Notes                                                                                                                     |
| ------------- | --------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `restaurants` | `id`                                                | `slug`                                     |                                                                              | `theme`, `legal` as JSON (read whole, validated in core)                                                                  |
| `locations`   | `id`, `restaurant_id`                               |                                            | `(restaurant_id)`                                                            | Fees in paise, `tax_bps`, `hours` JSON (per weekday, spans may cross midnight), `lat/lng`, `delivery_radius_m`, `is_open` |
| `categories`  | `id`, `restaurant_id`                               |                                            | `(restaurant_id)`                                                            | `sort`, `archived_at` (soft delete)                                                                                       |
| `menu_items`  | `id`, `restaurant_id`, `category_id`                |                                            | `(restaurant_id, category_id)`                                               | `price_paise`, `is_available`, `is_featured`, `archived_at`                                                               |
| `profiles`    | `id` = `auth.users.id`                              |                                            |                                                                              | Created by a trigger at sign-up; removed with the login unless it has orders                                              |
| `memberships` | `id`, `user_id`, `restaurant_id`                    | `(user_id, restaurant_id)`                 | `(restaurant_id)`                                                            | `role`: owner, manager, staff                                                                                             |
| `orders`      | `id`, `restaurant_id`, `location_id`, `customer_id` | `number`; `(customer_id, idempotency_key)` | `(restaurant_id, status, created_at desc)`; `(customer_id, created_at desc)` | Snapshots of name, phone, address; totals in paise; status timestamps                                                     |
| `order_items` | `id`, `order_id`, `menu_item_id`                    |                                            | `(order_id)`                                                                 | Snapshot of title and unit price                                                                                          |
| `payments`    | `id`, `order_id`                                    | `razorpay_order_id`; `razorpay_payment_id` | `(order_id)`                                                                 | One row per attempt; `status`, `amount_paise`                                                                             |

### Access patterns → indexes

| Query                                                     | Served by                                         |
| --------------------------------------------------------- | ------------------------------------------------- |
| Menu of a restaurant (storefront)                         | `menu_items (restaurant_id, category_id)`         |
| Kitchen board: a restaurant's active orders, newest first | `orders (restaurant_id, status, created_at desc)` |
| A customer's order history                                | `orders (customer_id, created_at desc)`           |
| "Did this checkout attempt already create an order?"      | unique `(customer_id, idempotency_key)`           |
| Record a Razorpay payment exactly once                    | unique `razorpay_order_id`, `razorpay_payment_id` |
| A person's role at a restaurant (every staff action)      | unique `(user_id, restaurant_id)`                 |

### Modelling decisions

- **Money in integer paise**, tax in basis points; tax computed once per order and rounded to the paisa. A check constraint enforces `total = subtotal + fees + tax` ([ADR 0004](../adr/0004-money-in-paise.md)).
- **Snapshots:** orders copy the customer's name, phone and address; order items copy the dish title and price. Editing the menu never rewrites history.
- **Soft deletes** for dishes and categories (`archived_at`); orders restrict deleting their restaurant, outlet, customer and dishes.
- **Order status is an enum with a state machine in code:**
  ```
  PENDING_PAYMENT ──paid──▶ PLACED ──▶ ACCEPTED ──▶ PREPARING ──▶ READY ──▶ OUT_FOR_DELIVERY ──▶ DELIVERED
        │ (cash orders start at PLACED)  │  │                          └──(pickup)──▶ PICKED_UP
        └──▶ CANCELLED (customer)        │  └──▶ CANCELLED (staff, after accept)
                              REJECTED ◀─┘ (staff)   CANCELLED ◀─ PLACED (customer, before accept)
  ```
  Each move is allowed for one actor (customer, staff or system). Only the payment code can move `PENDING_PAYMENT → PLACED` ([ADR 0006](../adr/0006-order-status-map-and-guarded-updates.md)).
- **Payment status:** `created → captured` (or `failed`, which can still become `captured` on a retry inside Razorpay's window); `captured → needs_refund → refunded` when the order will not be fulfilled.
- **JSON columns** (`theme`, `legal`, `hours`, `delivery_address`) for data that is always read and written whole; shape validated with zod in core. Trade-off: no SQL queries into them, which none of the access patterns need.
- **Multi-tenancy: shared schema.** Every tenant-owned table has `restaurant_id`; indexes lead with it. Chosen over schema-per-tenant or database-per-tenant for many small tenants and one migration path; a very large tenant could move to its own database later.

---

## I: Interface

### Server Actions (called by the browser)

All return `ActionResult<T> = { ok: true, data: T } | { ok: false, error: string }`. Input is `unknown` on arrival and validated in core.

| Action                 | Input                                                                            | Returns                                                                | Who                                                  |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `quoteAction`          | `{ restaurantId, locationId, fulfillment, pin?, items: {menuItemId, qty}[] }`    | lines and totals                                                       | anyone                                               |
| `placeOrderAction`     | the quote fields + `paymentMethod`, `customerName`, `address?`, `idempotencyKey` | `{ orderId, payment }` (Razorpay details for online orders, else null) | signed-in customer                                   |
| `startPaymentAction`   | `orderId`                                                                        | new Razorpay order details ("Pay now")                                 | the order's customer                                 |
| `confirmPaymentAction` | `{ razorpayOrderId, razorpayPaymentId, signature }`                              | `placed`, `already_recorded` or `needs_refund`                         | signed in; signature is the real check               |
| `cancelOrderAction`    | `orderId`                                                                        | `null`                                                                 | the order's customer, before accept                  |
| `moveOrderAction`      | `{ orderId, to, reason? }`                                                       | `null`                                                                 | staff+ at the order's restaurant; status map decides |
| Dashboard actions      | `slug` + section input (dish, category, outlet, staff member, settings, photo)   | `null` or a URL                                                        | manager/owner per section                            |

### Webhook

`POST /api/webhooks/razorpay`, header `x-razorpay-signature` = HMAC-SHA256 of the raw body with the webhook secret.

| Case                              | Response                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `payment.captured` for our order  | 200, payment recorded (or already recorded)                                        |
| `payment.failed`                  | 200, attempt marked failed                                                         |
| Payment or event we do not handle | 200, ignored (a 4xx/5xx would make Razorpay retry and eventually disable the hook) |
| Bad signature, amount mismatch    | 400 (retrying cannot fix it)                                                       |
| Unexpected error (database down)  | 500, Razorpay retries later                                                        |

### Realtime

| Subscriber          | Channel filter                           | Allowed by RLS policy                                                               |
| ------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| Customer order page | `orders`, `id = <order>`                 | `customer_id = auth.uid()`                                                          |
| Kitchen board       | `orders`, `restaurant_id = <restaurant>` | member of the restaurant, and the order is in progress or finished in the last hour |

The payload is ignored; the page calls `router.refresh()` so data always comes through the server path. Polling every 15-20 s covers dropped sockets.

### Auth and authorization

- **Authentication:** Supabase phone OTP; session in a signed cookie refreshed by `proxy.ts`. The server derives the user id from the cookie; the browser never sends it.
- **Authorization (tenant-scoped RBAC):** `memberships` gives a role per restaurant; a static role → permission map in core (`kitchen:use`, `orders:view`, `menu:manage`, `locations:manage`, `payments:refund`, `staff:manage`, `restaurant:manage`). `requirePermission` throws on failure, so a forgotten `if` cannot let an action continue.
- **Ownership checks:** every id from the browser is looked up with the restaurant (`WHERE id = ? AND restaurant_id = ?`) or the customer; misses return "not found" rather than revealing that the row exists.
- **Invariants:** at least one owner per restaurant (serializable transaction); nobody removes or demotes themselves.

### Errors

`DomainError(code, message)` for expected failures (`LOCATION_CLOSED`, `OUT_OF_RANGE`, `ITEM_UNAVAILABLE`, `FORBIDDEN`, `STATUS_CONFLICT`, `PAYMENT_MISMATCH`, `INVALID_INPUT`, ...): the message is shown to the user. Anything else is logged and shown as "Something went wrong". A failed network request in the browser becomes an error result too (`callAction`).

---

## O: Optimizations and deep dives

### 1. Checkout and payment consistency

```
Customer          Server (core)                              Postgres        Razorpay
  │ quote ───────▶ price from DB ◀────────────────────────────────▶
  │ place order ─▶ checks (open, radius, available) + price
  │                insert order PENDING_PAYMENT (idempotency key) ──▶
  │                create Razorpay order (outside any transaction) ─────────────────▶
  │                insert payments row ──────────────────────────────▶
  │◀── payment window
  │ pays ───────────────────────────────────────────────────────────────────────────▶
  │ callback ───▶ verify signature ─┐          webhook ◀── verify HMAC ◀───────────┤
  │                                 ▼                     ▼
  │                markPaid: amount matches → payment captured (guarded)
  │                UPDATE orders SET status='PLACED' WHERE status='PENDING_PAYMENT'  (first one wins)
  │                → Realtime → kitchen chimes; SMS after commit
```

| Failure                                             | Handling                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Double click on Pay                                 | Same idempotency key → the same order is returned (unique index, with a race fallback) |
| Tab closed after paying                             | Webhook records it                                                                     |
| Callback and webhook both arrive                    | Guarded updates: the second is a no-op                                                 |
| Card declined, then UPI succeeds in the same window | A `failed` attempt may still become `captured`                                         |
| Razorpay down when placing                          | Order exists; the order page offers "Pay now" (a new attempt)                          |
| Paid, but the order was rejected meanwhile          | Payment marked `needs_refund`; owner refunds in Razorpay and records it                |
| Abandoned checkout                                  | Stays `PENDING_PAYMENT`, never shown to the kitchen; cleanup job is backlog            |

No network call happens inside a database transaction.

### 2. Concurrency

- **Guarded updates** (`UPDATE ... WHERE status = <expected>`): customer cancel vs kitchen accept has exactly one winner; the loser gets a "changed by someone else" error.
- **Interactive transactions** so side effects (payment flags) only run if the guarded update won. A batch transaction is atomic but not conditional; that exact bug was found and fixed.
- **Serializable isolation** for the "at least one owner" rule, so two owners demoting each other at once cannot both pass the check (verified with a race script).

### 3. Tenant isolation and data exposure

Two ways into the database, each guarded:

|             | Door 1: our server              | Door 2: Supabase's public API                                                                          |
| ----------- | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Used for    | Every page and action           | Realtime only                                                                                          |
| Connects as | `postgres` (bypasses RLS)       | `anon` / `authenticated` (RLS applies)                                                                 |
| Guard       | Role + ownership checks in core | RLS on every table, no policies by default; browser grants revoked; two read-only policies on `orders` |

A code review found the first staff policy let kitchen staff read the whole order history (with phone numbers) through the API; it was narrowed to current orders and re-tested with a real login. **Hardening next:** run server queries under RLS too (a restricted database role plus per-request claims), and automated cross-tenant tests.

### 4. Performance

- **Server rendering** sends HTML with data already in it; most components never ship JavaScript.
- **Indexes** match every hot query (table above).
- **`next/image`** resizes and caches photos; uploads are capped at 2 MB and checked by their bytes.
- **Debounced quotes** (300 ms) and **abortable place searches** keep checkout chatty but cheap.
- **Connection pooling (at deploy):** the app will connect through Supabase's pooler, so serverless functions do not exhaust Postgres connections.
- **Next step: cache menu pages** (`"use cache"` with a tag per restaurant, revalidated when the dashboard edits the menu). Reads outnumber writes ~50:1, so this removes most database reads.

### 5. Frontend

- **Server Components by default,** Client Components only for interactivity (menu filters, cart, checkout, map, kitchen board, dashboard forms).
- **Per-restaurant theming** with CSS variables from a preset and two colours: one codebase, distinct brands.
- **Resilient calls:** every action call turns network failures into messages; checkout keeps a placed order even if the payment confirmation fails, and a quote is only shown for the inputs it was priced for.
- **Kitchen screen:** chime on new orders (needs a tap to allow audio), screen wake lock re-acquired when the tab returns, outlet filter in the URL so a tablet can be bookmarked.

### 6. Scaling path

| Load                       | Change                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 10× (500 restaurants)      | Cache menu pages; move the geocoder to a paid or self-hosted one; rate limits                                                       |
| 100×                       | Read replica for storefront reads; Realtime Broadcast instead of per-row change feeds; queue + workers for SMS and refunds (outbox) |
| 1000× or very large chains | Split storefront and dashboard deployments; move the biggest tenants to their own databases; analytics in a separate store          |

### 7. Failure modes

| Dependency down  | Effect                                            | Mitigation                                                         |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| Razorpay         | Online payment unavailable                        | Cash still works; order saved, "Pay now" later                     |
| Webhook delivery | Payment unconfirmed if the callback was also lost | Razorpay retries webhooks; reconciliation job is backlog           |
| Realtime         | No live updates                                   | Polling every 15-20 s                                              |
| SMS provider     | Customer not notified                             | Best effort after commit; outbox with retries is backlog           |
| Geocoder         | No address search                                 | Customer can still tap the map and type the address                |
| Postgres         | App down                                          | Managed service; backups and point-in-time recovery on a paid plan |

### 8. Known gaps (and why)

No automated tests, no structured logging or error tracking, manual refunds, no rate limits, SMS without retries, abandoned checkouts not cleaned up. All deliberate for the MVP and listed in the [backlog](../backlog.md); tests for pricing, the status map and tenant isolation come first ([ADR 0011](../adr/0011-what-is-not-built.md)).

---

## Presenting it in a 45-minute interview

| Minutes | Section      | Say                                                                                            |
| ------- | ------------ | ---------------------------------------------------------------------------------------------- |
| 0-5     | Requirements | Actors, the must-haves, the numbers: "writes are tiny, correctness is the hard part"           |
| 5-15    | Architecture | Draw the box diagram; one app, a domain layer, Supabase, Razorpay; read, write and async paths |
| 15-25   | Data model   | Tables, keys, the status machine, paise and snapshots, shared-schema tenancy                   |
| 25-30   | Interface    | Server Actions with the result type, the webhook contract, Realtime + RLS                      |
| 30-45   | Deep dives   | Checkout consistency, concurrency, tenant isolation (two doors), then the scaling path         |

### Likely follow-up questions

- **"How do you prevent double charging?"** Unique Razorpay ids, guarded update from `PENDING_PAYMENT`, idempotency key on the order; callback and webhook are both safe to repeat.
- **"What if the webhook arrives before the callback?"** Either can arrive first; whichever runs `markPaid` first wins, the other finds nothing to change.
- **"How is one restaurant kept away from another's data?"** Role check at the restaurant plus an ownership check on every id, in core; RLS locks the public API; hardening is RLS on server queries and cross-tenant tests.
- **"Why not microservices?"** 4 writes/s at peak; services would add latency, deployments and distributed transactions for no benefit. `core` is already a clean seam to split along.
- **"How would the kitchen scale to thousands of restaurants?"** Realtime Broadcast from a database trigger per restaurant channel instead of row-level change feeds; the kitchen query is already indexed.
- **"Why keep the cart in the browser?"** Browsing needs no login, there are no cart races, and the price is still computed on the server; a synced cart is the first backlog item.
- **"What would you build next?"** Tests, then menu caching, then automatic refunds with a reconciliation job and an outbox for notifications.
