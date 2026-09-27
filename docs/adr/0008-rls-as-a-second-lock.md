# ADR 0008: Row level security as a second lock

Status: accepted

## Context

The original app's database was readable and writable by anyone for years. Supabase exposes the database through an API that browsers can call directly, so a table without protection is public.

## Decision

- The app reads and writes through Prisma on the server only; authorization happens in core.
- In the database, row level security is enabled on every table with no policies, and the browser roles' default grants are revoked (including for tables created later). The only grant back is `SELECT` on `orders`, for Supabase Realtime.
- Two policies make live updates work: customers read their own orders; staff read their restaurant's current orders (in progress, or finished in the last hour). The first version gave staff every order of their restaurant; a code review showed that exposed the whole history with customer phone numbers, and a migration narrowed it.
- Membership checks inside policies use a `security definer` function in a schema the API does not expose.

## Consequences

- A forgotten check in app code does not open the database to browsers; the API answers "permission denied" for everything except those order reads.
- The server path does not use RLS: tenant separation there depends on every core function filtering by `restaurant_id` and checking the role. Running Prisma queries under RLS too (per-request claims) is in the backlog.
