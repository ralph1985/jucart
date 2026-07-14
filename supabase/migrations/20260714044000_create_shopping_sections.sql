alter table public.shopping_items
  drop constraint if exists shopping_items_section_id_check;

create table public.shopping_sections (
  id text not null,
  list_id uuid not null,
  name text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (list_id, id),
  constraint shopping_sections_name_not_empty check (length(btrim(name)) > 0)
);

insert into public.shopping_sections (id, list_id, name, position)
select section_id, list_id, initcap(section_id), min(position)
from (
  select
    section_id,
    list_id,
    case section_id
      when 'alcampo' then 0
      when 'dia' then 1
      when 'mercadona' then 2
      when 'farmacia' then 3
      when 'general' then 4
      else 99
    end as position
  from public.shopping_items
) existing_sections
group by section_id, list_id
on conflict do nothing;

update public.shopping_sections
set name = case id
  when 'alcampo' then 'Alcampo'
  when 'dia' then 'Día'
  when 'mercadona' then 'Mercadona'
  when 'farmacia' then 'Farmacia'
  when 'general' then 'General'
  else name
end;

create index shopping_sections_list_position_idx
  on public.shopping_sections (list_id, position);

create unique index shopping_sections_list_name_key
  on public.shopping_sections (list_id, lower(name));

create trigger shopping_sections_set_updated_at
before update on public.shopping_sections
for each row
execute function public.set_updated_at();

alter table public.shopping_sections enable row level security;

grant select, insert, update, delete on public.shopping_sections to anon;

create policy "Allow shared section reads"
on public.shopping_sections
for select
to anon
using (true);

create policy "Allow shared section inserts"
on public.shopping_sections
for insert
to anon
with check (true);

create policy "Allow shared section updates"
on public.shopping_sections
for update
to anon
using (true)
with check (true);

create policy "Allow shared section deletes"
on public.shopping_sections
for delete
to anon
using (true);

alter table public.shopping_sections replica identity full;

alter publication supabase_realtime add table public.shopping_sections;
