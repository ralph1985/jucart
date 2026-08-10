create table public.menu_dish_libraries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_dish_libraries_name check (length(btrim(name)) > 0)
);

create table public.menu_dish_library_members (
  library_id uuid not null references public.menu_dish_libraries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (library_id, user_id)
);

create index menu_dish_library_members_user_idx
  on public.menu_dish_library_members (user_id, library_id);

create or replace function public.is_menu_dish_library_member(p_library_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.menu_dish_library_members
    where library_id = p_library_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_menu_dish_library_member(uuid) from public;
grant execute on function public.is_menu_dish_library_member(uuid) to authenticated;

alter table public.menu_dish_libraries enable row level security;
alter table public.menu_dish_library_members enable row level security;
grant select on public.menu_dish_libraries to authenticated;
grant select on public.menu_dish_library_members to authenticated;

create policy "Menu dish libraries members"
  on public.menu_dish_libraries
  for select
  to authenticated
  using (public.is_menu_dish_library_member(id));

create policy "Menu dish library members"
  on public.menu_dish_library_members
  for select
  to authenticated
  using (public.is_menu_dish_library_member(library_id));

insert into public.menu_dish_libraries (name, created_by)
select 'Hogar', users.id
from auth.users as users
where lower(users.email) = 'rafaelgarcia1985@hotmail.com'
  and not exists (
    select 1 from public.menu_dish_libraries where name = 'Hogar'
  );

insert into public.menu_dish_library_members (library_id, user_id, role)
select libraries.id, users.id,
  case when lower(users.email) = 'rafaelgarcia1985@hotmail.com' then 'owner' else 'member' end
from public.menu_dish_libraries libraries
cross join auth.users users
where libraries.name = 'Hogar'
  and lower(users.email) in (
    'rafaelgarcia1985@hotmail.com',
    'bego15val@gmail.com'
  )
on conflict (library_id, user_id) do nothing;

alter table public.menu_dishes add column library_id uuid;
alter table public.menu_dish_types add column library_id uuid;

update public.menu_dishes
set library_id = libraries.id
from public.menu_dish_libraries libraries
where libraries.name = 'Hogar';

update public.menu_dish_types
set library_id = libraries.id
from public.menu_dish_libraries libraries
where libraries.name = 'Hogar';

update public.menu_dishes dishes
set dish_type_id = canonical.id
from public.menu_dish_types current_type
join public.menu_dish_types canonical
  on canonical.library_id = current_type.library_id
 and lower(canonical.name) = lower(current_type.name)
 and canonical.id = (
   select candidate.id
   from public.menu_dish_types candidate
   where candidate.library_id = current_type.library_id
     and lower(candidate.name) = lower(current_type.name)
   order by candidate.id
   limit 1
 )
where dishes.dish_type_id = current_type.id
  and current_type.id <> canonical.id;

delete from public.menu_dish_types duplicate
where duplicate.id in (
  select current_type.id
  from public.menu_dish_types current_type
  where current_type.id <> (
    select canonical.id
    from public.menu_dish_types canonical
    where canonical.library_id = current_type.library_id
      and lower(canonical.name) = lower(current_type.name)
    order by canonical.id
    limit 1
  )
);

drop policy "Menu dishes collection members" on public.menu_dishes;
drop policy "Menu types members" on public.menu_dish_types;
drop index if exists public.menu_dishes_scope_name_idx;
drop index if exists public.menu_dishes_scope_status_idx;
drop index if exists public.menu_dish_types_scope_name_idx;

alter table public.menu_dishes drop constraint menu_dishes_scope_list_id_fkey;
alter table public.menu_dish_types drop constraint menu_dish_types_scope_list_id_fkey;
alter table public.menu_dishes drop column scope_list_id;
alter table public.menu_dish_types drop column scope_list_id;
alter table public.menu_dishes alter column library_id set not null;
alter table public.menu_dish_types alter column library_id set not null;
alter table public.menu_dishes
  add constraint menu_dishes_library_id_fkey
  foreign key (library_id) references public.menu_dish_libraries (id) on delete cascade;
alter table public.menu_dish_types
  add constraint menu_dish_types_library_id_fkey
  foreign key (library_id) references public.menu_dish_libraries (id) on delete cascade;

create unique index menu_dishes_library_name_idx
  on public.menu_dishes (library_id, lower(name));
create index menu_dishes_library_status_idx
  on public.menu_dishes (library_id, status, cooked_at desc nulls last);
create unique index menu_dish_types_library_name_idx
  on public.menu_dish_types (library_id, lower(name));

drop policy if exists "Menu dishes collection members" on public.menu_dishes;
drop policy if exists "Menu types members" on public.menu_dish_types;

create policy "Menu dishes library members"
  on public.menu_dishes
  for all
  to authenticated
  using (public.is_menu_dish_library_member(library_id))
  with check (
    public.is_menu_dish_library_member(library_id)
    and (
      (status = 'pending' and cooked_at is null)
      or (status = 'cooked' and cooked_at is not null)
    )
  );

create policy "Menu types library members"
  on public.menu_dish_types
  for all
  to authenticated
  using (public.is_menu_dish_library_member(library_id))
  with check (public.is_menu_dish_library_member(library_id));

create trigger menu_dish_libraries_set_updated_at
  before update on public.menu_dish_libraries
  for each row execute function public.set_updated_at();
