create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  client_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz,
  constraint push_subscriptions_client_id_not_empty check (length(btrim(client_id)) > 0),
  constraint push_subscriptions_endpoint_not_empty check (length(btrim(endpoint)) > 0),
  constraint push_subscriptions_p256dh_not_empty check (length(btrim(p256dh)) > 0),
  constraint push_subscriptions_auth_not_empty check (length(btrim(auth)) > 0)
);

create unique index push_subscriptions_endpoint_key
  on public.push_subscriptions (endpoint);

create index push_subscriptions_list_disabled_at_idx
  on public.push_subscriptions (list_id, disabled_at);

create index push_subscriptions_client_id_idx
  on public.push_subscriptions (client_id);

create index push_subscriptions_active_list_idx
  on public.push_subscriptions (list_id, client_id, updated_at desc)
  where disabled_at is null;

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

grant insert, update on public.push_subscriptions to anon;
grant select, update on public.push_subscriptions to service_role;

create policy "Allow push subscription inserts"
on public.push_subscriptions
for insert
to anon
with check (true);

create policy "Allow push subscription updates"
on public.push_subscriptions
for update
to anon
using (true)
with check (true);
