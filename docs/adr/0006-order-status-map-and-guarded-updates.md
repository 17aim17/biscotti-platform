# ADR 0006: One order status map, enforced with guarded updates

Status: accepted

## Context

The original app spelled "cancelled" two ways, so a notification never fired, and nothing stopped an order from jumping between any two states. The kitchen, the customer and payments can all change an order, sometimes at the same moment.

## Decision

- Statuses are a Postgres enum. The allowed moves, and who may make each one (customer, staff, system), are one map in `packages/core/src/orders/status.ts`. The kitchen's buttons come from the same map (`nextStatuses`), so the UI cannot offer a move the server refuses.
- Every change is a guarded update inside a transaction: `UPDATE orders SET status = $to WHERE id = $id AND status = $from`. If no row changes, someone else changed the order first and the caller gets a clear conflict error.
- Side effects (payment flags, SMS) happen only if the guarded update won.

## Consequences

- Races such as "customer cancels while the kitchen accepts" have exactly one winner, and the loser's side effects never run.
- The map is in code, not in a table: simple to read and change, checked by the scripts in `packages/core/scripts`. A database trigger enforcing it as well would be a stronger guarantee, left for later.
