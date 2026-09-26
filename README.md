# Biscotti

Online ordering for restaurants. Each restaurant gets a branded storefront, a kitchen screen for live orders, and a dashboard for its menu, outlets and staff.

Biscotti is a rebuild of the original app (a Firebase project I built as a student in 2020). The goal is a small, correct MVP: prices computed on the server, payments verified, permissions checked on every staff action, and nothing in the database exposed by default.

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui
- Supabase (Postgres, Auth, Storage, Realtime), Prisma
- Razorpay for payments
- pnpm workspaces + Turborepo, tool versions pinned with mise

## Repo layout

```
apps/web                 Next.js app (storefront, kitchen, dashboard)
packages/core            business logic (no Next.js or React imports)
packages/db              Prisma schema and client
packages/ui              shared UI components (shadcn/ui)
packages/eslint-config   shared lint config
packages/typescript-config  shared tsconfig presets
docs/                    ADRs, architecture notes, backlog
```

## Running locally

Requires [mise](https://mise.jdx.dev) (for Node and pnpm).

```bash
mise install
pnpm install
pnpm dev          # http://localhost:3000
```

Other commands:

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm format
```

Add a shadcn component to the shared UI package:

```bash
pnpm dlx shadcn@latest add <component> -c apps/web
```

## Docs

- [System design](docs/architecture/system-design.md)
- [Decisions (ADRs)](docs/adr)
- [Backlog](docs/backlog.md)
