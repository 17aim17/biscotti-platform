# Biscotti

Online ordering for restaurants. Each restaurant gets a branded storefront, a kitchen screen for live orders, and a dashboard for its menu, outlets and staff.

Biscotti is a rebuild of the original app (a Firebase project I built as a student in 2020). The goal is a small, correct MVP: prices computed on the server, payments verified, permissions checked on every staff action, and nothing in the database exposed by default.

## How it fits together

```
 Browser (customer, kitchen tablet, owner)
   │  pages and Server Actions               live order updates
   ▼                                          ▲
 apps/web  (Next.js on Vercel)                │
   │  thin actions: who is signed in           │
   ▼                                          │
 packages/core  (business logic)              │
   │  validate input, check the role,         │
   │  price orders, move statuses, payments   │
   ▼                                          │
 packages/db  (Prisma) ──▶ Supabase Postgres ─┘ Realtime (row level security decides who hears what)
                           Supabase Auth (phone OTP), Storage (photos)

 Razorpay ──▶ webhook /api/webhooks/razorpay ──▶ core (verify, record payment)
```

- The browser never sends prices or statuses: it sends ids and quantities, and the server does the rest.
- Every change to restaurant data goes through core, which checks the person's role at that restaurant (owner, manager or staff).
- The database is locked to browsers by default; the only reads it serves directly are live order updates.

The design, the decisions and what was wrong with the original app are written up in [docs](#docs).

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

### Pages

| URL                               | Who                   | What                                                      |
| --------------------------------- | --------------------- | --------------------------------------------------------- |
| `/`                               | anyone                | Demo restaurants                                          |
| `/casa-spezia`                    | anyone                | Storefront: menu, dish details, cart                      |
| `/casa-spezia/checkout`           | signed in             | Delivery or pickup, map pin, cash or Razorpay (test mode) |
| `/casa-spezia/orders`             | signed in             | Your orders; each order page updates live                 |
| `/casa-spezia/kitchen`            | staff, manager, owner | Live order board                                          |
| `/casa-spezia/dashboard/orders`   | manager, owner        | Orders, refunds to handle                                 |
| `/casa-spezia/dashboard/menu`     | manager, owner        | Categories, dishes, photos, sold out                      |
| `/casa-spezia/dashboard/outlets`  | manager, owner        | Address, map, delivery area, hours, fees                  |
| `/casa-spezia/dashboard/staff`    | owner                 | Add people by phone, roles                                |
| `/casa-spezia/dashboard/settings` | owner                 | Name, look, photos, legal pages, GSTIN/FSSAI              |
| `/login`, `/account`              | anyone / signed in    | Phone sign-in; your account and restaurants               |

Every staff page and action checks the role at that restaurant. Visitors are sent to `/login` and back; users without the role see a "no access" message.

Online payments use Razorpay test mode: pay with the Indian test card `4100 2800 0000 1007` (any future expiry, any CVV, any 4-10 digit OTP).

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

- [How it works](docs/architecture/how-it-works.md): the pieces in plain words: frontend and backend parts, three journeys step by step, every table, multi-tenancy, who can do what, and a glossary
- [System design](docs/architecture/system-design.md): the interview version (RADIO): requirements and estimates, architecture, data model with keys and indexes, interfaces, deep dives and a scaling path
- [Rebuild notes](docs/architecture/rebuild-notes.md): what the original app got wrong, how Biscotti handles each problem, and the bugs the rebuild itself ran into
- [Decisions (ADRs)](docs/adr): one page per important decision, with its trade-offs
- [Backlog](docs/backlog.md): what is deliberately not built yet, in rough priority order
