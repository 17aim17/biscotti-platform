# ADR 0011: What is deliberately not built

Status: accepted

## Context

Biscotti is a personal MVP: small, correct, and easy to explain. Many things a production platform needs were left out on purpose, so the core loop (browse, order, pay, cook, deliver) could be finished and understood end to end.

## Decision

Not built, and why:

- **Automated tests.** Check scripts cover ordering, status races and payments against the local database; a test suite (pricing, status map, role checks, tenant separation) is the first thing to add.
- **Observability** (structured logs, Sentry). Errors are logged to the console; fine for a demo, not for real traffic.
- **Automatic refunds and payment reconciliation.** Refunds are recorded by the owner after refunding in Razorpay.
- **Reliable notifications.** SMS is best effort after commit; an outbox with retries would guarantee delivery.
- **Rate limiting** on ordering and payment attempts.
- **Microservices, queues, Kubernetes.** The expected load is a few writes per second; one app and one database are the right size.
- **Promo codes, item customizations, loyalty, POS, native apps.** Features for later, listed in the backlog.

## Consequences

The backlog (`docs/backlog.md`) is the ordered list of what comes next, and each item there is a conscious gap rather than an oversight.
