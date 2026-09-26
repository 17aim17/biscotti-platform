# ADR 0003: One Next.js app, logic in shared packages

Status: accepted

## Context

Biscotti has three surfaces: the customer storefront, the kitchen screen and the owner dashboard. Expected load is small (a handful of restaurants, a few writes per second at peak).

## Decision

A single Next.js app (`apps/web`) serves all three surfaces with path-based routing (`/<restaurant>`, `/<restaurant>/kitchen`, `/<restaurant>/dashboard`). Business logic lives in `packages/core`, which does not import Next.js or React. The repo is a pnpm workspace with Turborepo running tasks.

## Consequences

- One deploy and one auth setup.
- `core` can be reused behind a REST API if native apps come later.
- Storefront and dashboard scale together. Split into separate apps if traffic or team size calls for it.
- Path-based routing works on a free `*.vercel.app` URL. Per-restaurant subdomains can be added later with a rewrite, without changing pages.
