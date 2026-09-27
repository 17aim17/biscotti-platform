# ADR 0002: Business logic in TypeScript with Prisma

Status: accepted

## Context

Options considered:

1. Logic in Postgres (SQL functions, triggers) called from the client.
2. SQL-first schema with a query builder (Kysely) in a server layer.
3. App-first: schema and logic in TypeScript with an ORM.

## Decision

App-first with Prisma. Business rules (pricing, order placement, status changes, permissions) live in `packages/core` as plain TypeScript. Postgres enforces integrity (foreign keys, unique and check constraints) and Row Level Security blocks the public API by default.

## Consequences

- This is the common pattern in product teams: workflows are readable, reviewable TypeScript.
- Prisma runs only on the server. Every core function that touches restaurant data filters by `restaurant_id` itself and checks the caller's role with `requirePermission()`.
- Row locks, when needed, use `$queryRaw` inside an interactive transaction.
- Using RLS as a second guard on server queries is possible later without changing `core`.
