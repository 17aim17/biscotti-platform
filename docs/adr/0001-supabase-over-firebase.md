# ADR 0001: Supabase (Postgres) instead of Firebase

Status: accepted

## Context

The original app (a Firebase project I built as a student in 2020) used Firestore with no schema. Over time it collected three different field names for the user id on orders, prices stored as strings, and misspelled fields. Its security rules were `allow read, write: if true`, so the whole database was readable and writable by anyone. The browser also wrote orders directly, including their payment status.

Biscotti's data is relational (restaurants, outlets, menu items, orders, order items, payments) and needs transactions (placing an order) and constraints (money, statuses).

## Decision

Use Supabase: managed Postgres, Auth (phone OTP), Storage and Realtime.

## Consequences

- Schema, constraints and migrations live in git.
- Row Level Security is enabled on every table with no policies by default, so the public API exposes nothing unless a policy allows it.
- Realtime gives the kitchen screen live orders without extra infrastructure.
- Some coupling to Supabase features (Auth, Realtime). The data itself is plain Postgres and can move.
