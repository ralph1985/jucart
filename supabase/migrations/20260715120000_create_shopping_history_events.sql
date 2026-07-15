create table public.shopping_history_events (
  id text primary key,
  list_id uuid not null,
  item_id text not null,
  event_type text not null,
  actor text not null,
  client_id text not null,
  item_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint shopping_history_events_type_check check (
    event_type in ('initial', 'purchased', 'unpurchased', 'deleted')
  ),
  constraint shopping_history_events_actor_check check (actor in ('rafa', 'begona')),
  constraint shopping_history_events_client_id_not_empty check (length(btrim(client_id)) > 0),
  constraint shopping_history_events_item_snapshot_object check (jsonb_typeof(item_snapshot) = 'object')
);

create index shopping_history_events_list_created_at_idx
  on public.shopping_history_events (list_id, created_at desc);

create index shopping_history_events_list_client_created_at_idx
  on public.shopping_history_events (list_id, client_id, created_at desc);

create index shopping_history_events_list_item_created_at_idx
  on public.shopping_history_events (list_id, item_id, created_at desc);

alter table public.shopping_history_events enable row level security;

grant select, insert, update, delete on public.shopping_history_events to anon;

create policy "Allow shared history reads"
on public.shopping_history_events
for select
to anon
using (true);

create policy "Allow shared history inserts"
on public.shopping_history_events
for insert
to anon
with check (true);

create policy "Allow shared history updates"
on public.shopping_history_events
for update
to anon
using (true)
with check (true);

create policy "Allow shared history deletes"
on public.shopping_history_events
for delete
to anon
using (true);

alter table public.shopping_history_events replica identity full;

alter publication supabase_realtime add table public.shopping_history_events;
