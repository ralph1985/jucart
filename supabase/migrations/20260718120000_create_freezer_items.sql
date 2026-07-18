create table public.freezer_items (
  id text primary key,
  list_id uuid not null,
  name text not null,
  quantity text,
  drawer_id text not null,
  frozen_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint freezer_items_name_not_empty check (length(btrim(name)) > 0),
  constraint freezer_items_drawer_id_check check (
    drawer_id in ('top', 'middle', 'bottom')
  )
);

create index freezer_items_list_frozen_at_idx
  on public.freezer_items (list_id, frozen_at);

create index freezer_items_list_drawer_frozen_at_idx
  on public.freezer_items (list_id, drawer_id, frozen_at);

create trigger freezer_items_set_updated_at
before update on public.freezer_items
for each row
execute function public.set_updated_at();

alter table public.freezer_items enable row level security;

grant select, insert, update, delete on public.freezer_items to anon;

create policy "Allow shared freezer reads"
on public.freezer_items
for select
to anon
using (true);

create policy "Allow shared freezer inserts"
on public.freezer_items
for insert
to anon
with check (true);

create policy "Allow shared freezer updates"
on public.freezer_items
for update
to anon
using (true)
with check (true);

create policy "Allow shared freezer deletes"
on public.freezer_items
for delete
to anon
using (true);

alter table public.freezer_items replica identity full;

alter publication supabase_realtime add table public.freezer_items;
