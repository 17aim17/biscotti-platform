# ADR 0007: Path-based tenancy

Status: accepted

## Context

Each restaurant needs its own storefront, kitchen screen and dashboard. Subdomains (`casa-spezia.example.com`) look nicer but need a custom domain with wildcard DNS and complicate login cookies.

## Decision

Every restaurant URL starts with its slug: `/casa-spezia`, `/casa-spezia/kitchen`, `/casa-spezia/dashboard`. Pages load the restaurant by slug once and pass its id down; every restaurant-owned table has `restaurant_id`, and every core function filters by it. Slugs that collide with app routes (`login`, `account`, `api`, ...) are reserved.

## Consequences

- Works on a free `*.vercel.app` URL with one login cookie across all restaurants.
- A person can be staff at one restaurant and a customer at another with the same account.
- Subdomains can be added later with a rewrite in `proxy.ts` (`casa-spezia.<domain>/*` to `/casa-spezia/*`), without changing pages.
