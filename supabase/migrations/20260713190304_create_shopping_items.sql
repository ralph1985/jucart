create table public.shopping_items (
  id text primary key,
  list_id uuid not null,
  name text not null,
  section_id text not null,
  added_by text not null,
  purchased boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_items_name_not_empty check (length(btrim(name)) > 0),
  constraint shopping_items_section_id_check check (
    section_id in ('alcampo', 'dia', 'mercadona', 'farmacia', 'general')
  ),
  constraint shopping_items_added_by_check check (added_by in ('rafa', 'begona'))
);

create unique index shopping_items_list_section_name_key
  on public.shopping_items (list_id, section_id, lower(name));

create index shopping_items_list_created_at_idx
  on public.shopping_items (list_id, created_at);

create index shopping_items_list_purchased_created_at_idx
  on public.shopping_items (list_id, purchased, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shopping_items_set_updated_at
before update on public.shopping_items
for each row
execute function public.set_updated_at();

alter table public.shopping_items enable row level security;

grant select, insert, update, delete on public.shopping_items to anon;

create policy "Allow shared list reads"
on public.shopping_items
for select
to anon
using (true);

create policy "Allow shared list inserts"
on public.shopping_items
for insert
to anon
with check (true);

create policy "Allow shared list updates"
on public.shopping_items
for update
to anon
using (true)
with check (true);

create policy "Allow shared list deletes"
on public.shopping_items
for delete
to anon
using (true);

alter table public.shopping_items replica identity full;

alter publication supabase_realtime add table public.shopping_items;
