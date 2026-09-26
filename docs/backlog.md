# Backlog

Deferred on purpose to keep the MVP small. Roughly in priority order.

1. Synced cart (server-side cart shared across devices). The MVP keeps the cart in the browser and prices it on the server at checkout.
2. Promo codes (with an atomic usage counter).
3. Item customizations and add-ons.
4. Tests: pricing, order status map, permissions, tenant separation, end-to-end checkout.
5. Observability: structured logs and error tracking.
6. Automatic refunds and a payment reconciliation job, including expiring abandoned `PENDING_PAYMENT` orders.
7. Reliable notifications (outbox with retries).
8. Per-outlet item availability.
9. Saved customer addresses.
10. Order history table (`order_events`) for a full audit trail.
11. Organizations above restaurants (groups that run several brands).
12. Row Level Security as a second guard on server queries.
13. Rate limiting on checkout, security headers.
14. Subdomain per restaurant once a domain exists (rewrite to the path routes).
15. Upgrade to ESLint 10 once eslint-plugin-react supports it.
16. Dark mode.
17. Server-side geocoding of delivery addresses. The radius check currently trusts the map pin coordinates sent by the browser. Also: the checkout place search uses the free public Photon server (fair use only); move to a paid or self-hosted geocoder before real traffic.
18. Per-restaurant order numbers (for example a daily counter per outlet). The current order number is one global sequence, so numbers skip and reveal overall volume.
19. Cache the menu pages (Next.js "use cache" with tag revalidation when the menu is edited in the dashboard).
20. Menu photos uploaded by restaurants (Supabase Storage) instead of the demo photos hosted on Unsplash.
21. Platform onboarding UI, custom domains, delivery partners, native apps, loyalty, POS integration, analytics.
