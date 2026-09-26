-- Minimal stand-ins for Supabase objects, created only in Prisma's shadow
-- database. The real database already has these from Supabase.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  phone text,
  raw_user_meta_data jsonb
);

create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

do $$
begin
  create publication supabase_realtime;
exception when duplicate_object then null;
end $$;
