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

Requires [mise](https://mise.jdx.dev) (for Node and pnpm) and Docker Desktop (for the local Supabase stack).

```bash
mise install
pnpm install
pnpm db:start     # Postgres, Auth, Storage, Realtime in Docker
cp .env.example .env
pnpm db:status    # copy the publishable and secret keys into .env
pnpm db:reset     # wipe the local database, apply migrations, seed demo data
pnpm check        # run the order and payment checks against the local database
pnpm dev          # http://localhost:3000
```

- Supabase Studio: http://127.0.0.1:54323
- `pnpm db:stop` stops the containers.

### Demo data

`pnpm db:reset` seeds two restaurants and four users. Phone login uses fixed test numbers (set in `supabase/config.toml`) and sends no SMS. The code is `123456` for all of them.

| Phone           | User                               |
| --------------- | ---------------------------------- |
| +91 99999 00001 | Customer                           |
| +91 99999 00002 | Casa Spezia owner                  |
| +91 99999 00003 | Casa Spezia staff                  |
| +91 99999 00004 | Osteria Sole owner (second tenant) |

### Database changes

The schema lives in `packages/db/prisma/schema.prisma`. To change it:

```bash
pnpm --filter @workspace/db db:migrate:dev --name <change>
```

Things Prisma's schema cannot express (row level security, policies, triggers, check constraints) go into a migration created with `--create-only` and edited by hand. Every new table needs `enable row level security`.

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
