-- The only reads allowed through Supabase's APIs, both for Realtime:
--   customers see their own orders (live order status page)
--   staff see their restaurant's orders (kitchen screen)
-- Everything else stays denied (see enable_rls).

-- Membership check for policies. memberships itself has RLS with no policies,
-- so the check runs as the function owner (security definer). The private
-- schema is not exposed by the Supabase API, so this is not callable from
-- outside; authenticated users only need usage so policies can call it.
create or replace function private.is_restaurant_member(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.restaurant_id = rid
      and m.user_id = auth.uid()
  );
$$;

grant usage on schema private to authenticated;
revoke execute on function private.is_restaurant_member(uuid) from public;
grant execute on function private.is_restaurant_member(uuid) to authenticated;

-- (select auth.uid()) is evaluated once per query instead of once per row.
create policy "customers read their own orders"
  on orders for select
  to authenticated
  using (customer_id = (select auth.uid()));

create policy "staff read their restaurant's orders"
  on orders for select
  to authenticated
  using ((select private.is_restaurant_member(restaurant_id)));

-- Stream inserts and updates on orders to Realtime subscribers (RLS applies).
alter publication supabase_realtime add table orders;
