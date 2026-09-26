-- Staff read access through Supabase's API (used by Realtime for the kitchen
-- screen) was every order of their restaurant, every column, forever. A
-- kitchen staff member could download the whole order history with customer
-- phone numbers and addresses. Narrow it to what the kitchen screen shows:
-- orders in progress, plus orders finished in the last hour. Unpaid online
-- checkouts (PENDING_PAYMENT) are never included. The dashboard reads order
-- history through the server (Prisma), which checks the orders:view role.
drop policy "staff read their restaurant's orders" on orders;

create policy "staff read their restaurant's current orders"
  on orders for select
  to authenticated
  using (
    (select private.is_restaurant_member(restaurant_id))
    and status <> 'PENDING_PAYMENT'
    and (
      status in ('PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY')
      or updated_at > now() - interval '1 hour'
    )
  );
