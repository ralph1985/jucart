revoke all on table public.push_subscriptions from anon;
revoke all on table public.push_subscriptions from authenticated;

grant insert, update on public.push_subscriptions to anon;
grant select, update on public.push_subscriptions to service_role;
