# Biscotti: System Design (bare-bones MVP)

> Interview walkthrough in five steps: **requirements → architecture → data model → interfaces → optimizations**.
> Deferred work is tracked in `docs/backlog.md`. Timing in a 45-minute interview: 5 · 10 · 10 · 5 · 10 (+5 questions).

---

## 0. Pitch

**Biscotti is a small multi-tenant online ordering platform** (Lunchbox.io-style). Each restaurant gets a branded storefront, a kitchen screen and a dashboard, so it can take direct orders instead of paying aggregator commissions. It's a rebuild of a Firebase ordering app I wrote as a student in 2020. This version is a deliberately lean MVP: correct where it matters (money, permissions, data exposure), simple everywhere else.

---

## 1. Requirements

**Functional**

| Actor         | Needs                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer      | Browse a restaurant's menu, keep a cart, log in with phone OTP, check out (delivery or pickup, cash or Razorpay), watch the order status live, see past orders |
| Kitchen staff | See new orders instantly, accept/reject, move them through statuses                                                                                            |
| Owner/manager | Manage menu, outlets (hours, radius, fees, tax), staff, branding, legal pages                                                                                  |

**Non-functional (what I optimize for)**

1. **Nothing exposed by default:** no table readable through the public API unless explicitly allowed.
2. **Money is correct:** prices computed on the server, payments verified, no double orders or double payments.
3. **Tenant separation:** one restaurant never sees another's data.
4. **Kitchen sees orders within seconds.**
5. **Simple enough to explain end to end.**

**Scale estimate:** a handful of restaurants, tens to hundreds of orders a day → a few writes per second at most. **One Postgres instance, one Next.js app.** The hard parts are correctness and security, not scale.

**Out of scope for v1** (backlog): synced cart, promos, customizations, tests, observability, automatic refunds, delivery partners, native apps.

---

## 2. Architecture

```
 Customer phone                 Kitchen tablet / Owner laptop
 /casa-spezia                   /casa-spezia/kitchen, /casa-spezia/dashboard
        │                               │
        └──────────── HTTPS ────────────┘
                        ▼
      ┌──────────── Vercel: Next.js 16 (App Router) ────────────┐
      │ app/[restaurant]: slug → restaurant → storefront/kitchen │
      │ Server Components (pages) · Server Actions (mutations)   │
      │ /api/webhooks/razorpay                                   │
      │        │                                                 │
      │  packages/core: pricing · orders · payments · auth · sms │
      │        │ Prisma (server only)                            │
      └────────┼─────────────────────────────────────────────────┘
               ▼
      ┌──────────────────── Supabase ───────────────────────────┐
      │ Postgres (RLS on, deny by default)  Auth (phone OTP)     │
      │ Storage (menu images)   Realtime (orders → kitchen/customer)
      └──────────────────────────────────────────────────────────┘
         ▲ webhook                                   │
     Razorpay                                  SMS provider
```

**Monorepo:** pnpm workspaces + Turborepo. `apps/web` (the only deployable) → `packages/core` (business logic, no Next.js) → `packages/db` (Prisma). Plus `packages/ui` (shadcn).

**Key decisions and trade-offs**

| Decision                                                       | Why                                                                             | Trade-off                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Path-based tenancy (`/<restaurant>/...`)                       | Works on a free `*.vercel.app` URL, one login cookie, simple routing            | Subdomains later via a `proxy.ts` rewrite, no page changes     |
| One Next.js app (modular monolith)                             | One deploy, shared auth, fastest to build                                       | Storefront and dashboard scale together; split later if needed |
| Supabase instead of Firebase                                   | Relational data, SQL, transactions, RLS; managed Auth/Storage/Realtime          | Some vendor features; data is plain Postgres                   |
| Logic in TypeScript (`core`) + Prisma                          | Common industry pattern, easy to read and change                                | Database constraints still needed for integrity                |
| RLS on every table, deny by default; Prisma only on the server | The public API exposes nothing (the old database was `if true`)                 | Tenant filtering in app code must be consistent → one helper   |
| Cart in the browser, priced on the server                      | Simplest thing that fixes the old "client sets the price" flaw                  | No cross-device cart (backlog #1)                              |
| Webhook + client callback both confirm payment                 | Either can arrive first or be lost; the guarded update makes the second a no-op | Manual refunds for edge cases in v1                            |
| Best-effort SMS after commit                                   | Simple; SMS failure never blocks an order                                       | Lost SMS possible (outbox in backlog)                          |
| No microservices, queues, Kubernetes                           | A few writes per second                                                         | Documented as a conscious choice                               |

**Checkout flow (the part to draw)**

```
Customer              Next.js + core                    Postgres            Razorpay
  │ Place order ──▶ check user, validate input
  │                 TX: check items, hours, distance; price from DB;
  │                     insert order PENDING_PAYMENT + items (idempotency key) ──▶ commit
  │                 create Razorpay order (after commit) ──────────────────────────▶
  │                 insert payments row ─────────────────────────▶
  │◀── Razorpay checkout
  │ pays ─────────────────────────────────────────────────────────────────────────▶
  │ callback: verify signature ─┐        webhook: verify HMAC (raw body) ─┐
  │                             ▼                                         ▼
  │                 markPaid: amounts match → payments captured →
  │                 UPDATE orders SET PLACED WHERE status = PENDING_PAYMENT (first wins)
  │                 Realtime → kitchen rings; SMS best-effort
```

**Talking points:**

- No network call inside a database transaction.
- Retries and duplicates are safe because of unique IDs (idempotency key, Razorpay payment ID) plus guarded status updates.

---

## 3. Data model (9 tables)

```
restaurants ─< locations
     │
     ├─< categories ─< menu_items
     ├─< memberships >─ profiles (Supabase auth user)
     └─< orders ─< order_items   (title + price snapshot)
            │
            └─< payments         (razorpay_order_id, razorpay_payment_id unique)
profiles ─< orders (as customer)
```

- **Money in integer paise**; tax in basis points. No floats, no strings (the old app stored prices as strings).
- **Snapshots:** `order_items` copies title and price; `orders` copies the address and the customer's name/phone. Menu edits never change past orders.
- **Archive, don't delete** menu items and categories (orders point to them).
- **Order number:** an auto-increment column shown as "#1042".
- **Statuses:** one map in code (`PENDING_PAYMENT → PLACED → ACCEPTED → PREPARING → READY → OUT_FOR_DELIVERY/PICKED_UP → DELIVERED`, plus `REJECTED`/`CANCELLED`). Enforced with guarded updates (`WHERE status = <expected>`). The old app had three spellings of "cancelled"; now there's one definition.
- **Constraints:** `price_paise >= 0`, unique slug, unique `(customer, idempotency_key)`, unique Razorpay IDs, unique `(user, restaurant)` membership.
- **Why Postgres:** relational data + transactions + constraints + RLS. Contrast with the old Firestore: copied data, drifting fields, open rules.

**Security model:**

- RLS enabled everywhere, no policies → the public API returns nothing.
- Two read policies exist only for Realtime (staff: their restaurant's orders; customer: their own orders).
- All other access goes through server code, filtered by `restaurant_id` and checked with `can()`.

---

## 4. Interfaces

**Server Actions** (each: check user → validate with zod → `can()` if staff → call `core`)

| Action                                                                                                      | Input → Output                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `placeOrder`                                                                                                | `{ locationId, fulfillment, address?, items: {menuItemId, qty}[], paymentMethod, idempotencyKey }` → `{ orderId, number, razorpayOrderId? }` |
| `confirmPayment`                                                                                            | `{ razorpayOrderId, paymentId, signature }` → order status                                                                                   |
| `retryPayment`                                                                                              | `{ orderId }` → `{ razorpayOrderId }`                                                                                                        |
| `updateOrderStatus`                                                                                         | `{ orderId, to, reason? }` → order (staff; the status map decides what's allowed)                                                            |
| `cancelOrder`                                                                                               | `{ orderId }` → order (customer, before accept)                                                                                              |
| `saveMenuItem`, `archiveMenuItem`, `setItemAvailable`, `saveLocation`, `addStaff`, `saveRestaurantSettings` | owner/manager                                                                                                                                |

**Route handler:** `POST /api/webhooks/razorpay`: HMAC over the raw body → `markPaid`.

**Realtime:** kitchen subscribes to its restaurant's orders; the customer status page subscribes to their order.

**Errors:** a few clear domain errors (`ItemUnavailable`, `LocationClosed`, `OutOfRange`, `InvalidStatusChange`, `PaymentMismatch`) shown as friendly messages.

**Why Server Actions and not REST:** typed end to end, no separate API layer. When native apps come, add REST routes that call the same `core` functions.

---

## 5. Optimizations: what exists now, and what I'd add next

**Now:**

- Menu pages cached and revalidated when the menu changes (reads far outnumber writes).
- `next/image` for menu photos.
- Supabase connection pooler for serverless.
- One Realtime subscription per kitchen screen.
- Idempotency keys + guarded updates.

**Next, in order** (the backlog, and a good "how would you evolve this" answer):

1. Synced cart
2. Promo codes (atomic usage counter)
3. Customizations
4. Tests (pricing, status map, permissions, tenant separation, checkout end to end)
5. Logs + error tracking
6. Automatic refunds + reconciliation job
7. Outbox for reliable SMS
8. Per-outlet availability
9. RLS as a second guard on server queries
10. Rate limiting

**At much larger scale:**

- Read replica or more caching for storefronts.
- Queue + workers for notifications.
- Realtime via broadcast instead of per-row change feeds.
- Dedicated databases for big chains.
- Split the storefront and dashboard apps.
- Analytics outside the production database.

---

## 6. The migration story (use it in interviews)

| Original app (2020)                                      | Biscotti                                                 |
| -------------------------------------------------------- | -------------------------------------------------------- |
| Database open to the internet (`if true`) for ~5.5 years | RLS on every table, deny by default                      |
| Admin API checked login, not role                        | `can()` on every staff action                            |
| Client sent prices; browser wrote "paid" orders          | Server pricing; payments verified by signature + webhook |
| Three spellings of "cancelled"; SMS never fired          | One status map, guarded updates                          |
| String prices, drifting fields                           | Typed schema, integer paise, migrations                  |
| Service-account key in git                               | Secrets only in environment variables                    |
