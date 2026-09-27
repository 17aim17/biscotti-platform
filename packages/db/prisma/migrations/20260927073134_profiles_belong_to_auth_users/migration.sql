-- A profile is the app's side of a Supabase Auth user (same id), but nothing
-- tied them together: deleting a login left an orphan profile. A foreign key
-- to auth.users would be the usual fix, but Prisma cannot introspect keys
-- into Supabase's auth schema, so a trigger does the same job: deleting a
-- login deletes its profile (and its memberships, which cascade). If the
-- person has orders, orders.customer_id restricts the delete, the trigger
-- fails, and the login stays: an account with order history cannot be
-- deleted by accident.
create or replace function private.handle_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end;
$$;

create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function private.handle_deleted_user();
