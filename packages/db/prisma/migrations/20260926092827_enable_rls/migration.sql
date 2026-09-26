-- Deny by default. Supabase exposes the public schema through its REST and
-- Realtime APIs using the browser (publishable) key. With RLS on and no
-- policies, those APIs can read or write nothing. The app talks to Postgres
-- through Prisma on the server as the table owner, which RLS does not restrict.
--
-- Any policy added later is an explicit, reviewed exception.
-- Every new table must also get `enable row level security`.

alter table restaurants        enable row level security;
alter table locations          enable row level security;
alter table categories         enable row level security;
alter table menu_items         enable row level security;
alter table profiles           enable row level security;
alter table memberships        enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table payments           enable row level security;
-- Prisma's own bookkeeping table (absent in the shadow database, hence if exists).
alter table if exists _prisma_migrations enable row level security;
