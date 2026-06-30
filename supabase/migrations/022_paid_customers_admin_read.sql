-- Allow admins to read paid_customers in the admin panel without the service role key.
-- Writes still go through service role (Stripe webhook, register API, crypto approval).

drop policy if exists paid_customers_admin_select on public.paid_customers;
create policy paid_customers_admin_select
  on public.paid_customers
  for select
  to authenticated
  using (public.is_admin());
