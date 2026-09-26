-- Second lock behind RLS. Supabase grants its API roles (anon = visitors,
-- authenticated = logged-in users) full privileges on public tables by default,
-- so RLS was the only thing stopping them, and a new table created without
-- `enable row level security` would have been fully writable through the API.
--
-- Remove every privilege, including for objects created later, then grant back
-- only what Realtime needs: logged-in users may SELECT orders, still filtered
-- by the two policies in realtime_order_policies.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

grant select on orders to authenticated;
