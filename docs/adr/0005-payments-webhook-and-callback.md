# ADR 0005: Payments are confirmed by the webhook and the browser callback

Status: accepted

## Context

The original app wrote "paid" orders from the browser and never verified a payment. Razorpay offers two confirmations: the browser's success callback (signed with the key secret) and a server-to-server webhook (signed with the webhook secret). The callback is fast but can be lost (tab closed, network drop); the webhook is reliable but can arrive late, twice, or before the callback.

## Decision

- An order is created first (`PENDING_PAYMENT`, or `PLACED` for cash). The Razorpay order is created after the database write, never inside a transaction.
- Both paths verify their signature (HMAC over the raw body for the webhook) and call the same `markPaid`, which checks the amount against the order and moves the order with a guarded update: `UPDATE ... WHERE status = 'PENDING_PAYMENT'`. Whichever arrives first wins; the second finds nothing to change.
- Each attempt is a `payments` row with unique Razorpay ids, so "Pay now" after a failed or abandoned attempt is a new row, and the same payment can never be recorded twice.
- A payment that lands on an order already rejected or cancelled is marked `needs_refund`; the owner refunds it in Razorpay and records it in the dashboard.
- The webhook answers 400 for a bad signature or wrong amount (retrying cannot fix those) and ignores events for payments that are not ours.

## Consequences

- Paying twice, replaying the webhook or losing the callback all end with one recorded payment and one placed order (checked with signed test payloads).
- Refunds are manual for now; automatic refunds through the API are in the backlog.
- The webhook needs a public URL, so it is registered after deploying.
