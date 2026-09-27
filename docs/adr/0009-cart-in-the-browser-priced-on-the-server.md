# ADR 0009: Cart in the browser, priced on the server

Status: accepted

## Context

The original app kept the cart on the server but trusted prices sent by the browser, and every tap was a Cloud Function call with read-modify-write races.

## Decision

- The cart is `localStorage` per restaurant, holding only dish ids, quantities, the chosen outlet and delivery or pickup. It is read through `useSyncExternalStore`, which also keeps tabs in sync.
- The checkout page asks the server for a quote (`quoteOrder`) whenever the order changes; placing the order (`placeOrder`) runs the same checks and pricing code. Each quote is tagged with the inputs it was priced for, so a stale total is never shown or paid.
- Dishes that disappear from the menu are pruned from the cart; sold-out ones stay visible but are not counted.

## Consequences

- No login needed to browse and fill a cart; sign-in happens at checkout.
- The price a customer pays always comes from the database.
- No cart across devices; a synced cart is backlog item 1.
