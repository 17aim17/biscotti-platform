-- Create a profile row for every new Supabase Auth user.
--
-- The function lives in a `private` schema: Supabase's API only serves the
-- public schema, so nothing outside the database can call it. It runs as its
-- owner (security definer) because the auth service inserting into auth.users
-- has no rights on public.profiles. An empty search_path makes every name in
-- the body fully qualified, which is the safe pattern for security definer.

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone, name)
  values (new.id, new.phone, new.raw_user_meta_data ->> 'name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Users who signed up before this migration.
insert into public.profiles (id, phone)
select id, phone from auth.users
on conflict (id) do nothing;
