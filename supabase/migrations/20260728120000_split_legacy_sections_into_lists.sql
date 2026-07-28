create temporary table legacy_list_map (
  section_id text primary key,
  list_id uuid not null unique,
  name text not null
) on commit drop;

insert into legacy_list_map (section_id, list_id, name)
values
  ('mercadona', '10000000-0000-4000-8000-000000000001', 'Mercadona'),
  ('alcampo', '10000000-0000-4000-8000-000000000002', 'Alcampo'),
  ('section-cd213526-3195-45ce-aed9-1a8d71cc7b70', '10000000-0000-4000-8000-000000000003', 'Día'),
  ('section-689d0d82-cc98-4609-93ca-13daecaf49cb', '10000000-0000-4000-8000-000000000004', 'Carrefour'),
  ('farmacia', '10000000-0000-4000-8000-000000000005', 'Farmacia'),
  ('section-mrk3esvk-9nda8pbm3to', '10000000-0000-4000-8000-000000000006', 'Amazon'),
  ('section-5b2645d3-56a6-45e4-87ec-5a3cdb782439', '10000000-0000-4000-8000-000000000007', 'Leroy Merlín');

do $$
declare
  rafa_id uuid;
  begona_id uuid;
  old_list_id uuid := '00000000-0000-4000-8000-000000000001';
begin
  select id into rafa_id
  from auth.users
  where lower(email) = 'rafaelgarcia1985@hotmail.com'
  limit 1;

  select id into begona_id
  from auth.users
  where lower(email) = 'bego15val@gmail.com'
  limit 1;

  if rafa_id is null or begona_id is null then
    raise exception 'required_auth_users_not_found';
  end if;

  insert into public.shopping_lists (id, name, owner_id, join_code)
  select
    map.list_id,
    map.name,
    rafa_id,
    upper(substr(md5(map.list_id::text || 'jucart-join-code'), 1, 8))
  from legacy_list_map map
  where exists (
    select 1
    from public.shopping_items items
    where items.list_id = old_list_id
      and items.section_id = map.section_id
  )
  on conflict (id) do update
  set name = excluded.name,
      owner_id = excluded.owner_id,
      updated_at = now();

  insert into public.shopping_list_members (list_id, user_id, role)
  select map.list_id, member.user_id, member.role
  from legacy_list_map map
  cross join (values (rafa_id, 'owner'::text), (begona_id, 'member'::text)) member(user_id, role)
  where exists (
    select 1
    from public.shopping_items items
    where items.list_id = old_list_id
      and items.section_id = map.section_id
  )
  on conflict (list_id, user_id) do update
  set role = excluded.role;
end;
$$;

create temporary table legacy_item_map (
  item_id text primary key,
  list_id uuid not null
) on commit drop;

insert into legacy_item_map (item_id, list_id)
select items.id, map.list_id
from public.shopping_items items
join legacy_list_map map on map.section_id = items.section_id
where items.list_id = '00000000-0000-4000-8000-000000000001'
  and exists (
    select 1
    from public.shopping_lists lists
    where lists.id = map.list_id
  );

update public.shopping_items items
set list_id = map.list_id
from legacy_item_map map
where items.id = map.item_id;

update public.shopping_sections sections
set list_id = map.list_id
from legacy_list_map map
where sections.list_id = '00000000-0000-4000-8000-000000000001'
  and sections.id = map.section_id
  and exists (
    select 1 from public.shopping_lists lists where lists.id = map.list_id
  );

delete from public.shopping_sections sections
where sections.list_id = '00000000-0000-4000-8000-000000000001';

update public.shopping_tickets tickets
set list_id = map.list_id
from legacy_list_map map
where tickets.list_id = '00000000-0000-4000-8000-000000000001'
  and tickets.section_id = map.section_id;

update public.shopping_ticket_files files
set list_id = tickets.list_id
from public.shopping_tickets tickets
where files.list_id = '00000000-0000-4000-8000-000000000001'
  and files.ticket_id = tickets.id;

update public.shopping_ticket_lines lines
set list_id = tickets.list_id
from public.shopping_tickets tickets
where lines.list_id = '00000000-0000-4000-8000-000000000001'
  and lines.ticket_id = tickets.id;

update public.shopping_price_observations observations
set list_id = map.list_id
from legacy_list_map map
where observations.list_id = '00000000-0000-4000-8000-000000000001'
  and observations.section_id = map.section_id;

update public.shopping_history_events events
set list_id = items.list_id
from legacy_item_map items
where events.list_id = '00000000-0000-4000-8000-000000000001'
  and events.item_id = items.item_id;

update public.shopping_recategorization_changes changes
set list_id = items.list_id
from legacy_item_map items
where changes.list_id = '00000000-0000-4000-8000-000000000001'
  and changes.item_id = items.item_id;

update public.shopping_product_normalization_changes changes
set list_id = items.list_id
from legacy_item_map items
where changes.list_id = '00000000-0000-4000-8000-000000000001'
  and changes.item_id = items.item_id;

update public.freezer_items
set list_id = '10000000-0000-4000-8000-000000000001'
where list_id = '00000000-0000-4000-8000-000000000001';

update public.shopping_canonical_products
set list_id = '10000000-0000-4000-8000-000000000001'
where list_id = '00000000-0000-4000-8000-000000000001';

update public.shopping_canonical_product_aliases
set list_id = '10000000-0000-4000-8000-000000000001'
where list_id = '00000000-0000-4000-8000-000000000001';

update public.shopping_recategorization_runs
set list_id = '10000000-0000-4000-8000-000000000001'
where list_id = '00000000-0000-4000-8000-000000000001';

update public.shopping_product_normalization_runs
set list_id = '10000000-0000-4000-8000-000000000001'
where list_id = '00000000-0000-4000-8000-000000000001';

update public.shopping_ticket_processing_runs
set list_id = '10000000-0000-4000-8000-000000000001'
where list_id = '00000000-0000-4000-8000-000000000001';

update public.push_subscriptions
set list_id = '10000000-0000-4000-8000-000000000001'
where list_id = '00000000-0000-4000-8000-000000000001';

delete from public.shopping_list_members
where list_id = '00000000-0000-4000-8000-000000000001';

delete from public.shopping_lists
where id = '00000000-0000-4000-8000-000000000001';

update auth.users
set encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
where lower(email) in ('rafaelgarcia1985@hotmail.com', 'bego15val@gmail.com');
