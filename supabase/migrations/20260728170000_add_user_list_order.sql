create table public.shopping_list_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  position integer not null,
  primary key (user_id, list_id),
  constraint shopping_list_preferences_position_check check (position >= 0)
);

alter table public.shopping_list_preferences enable row level security;

grant select, insert, update, delete
on public.shopping_list_preferences
to authenticated;

create policy "Users manage their list order"
on public.shopping_list_preferences
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into public.shopping_list_preferences (user_id, list_id, position)
select
  members.user_id,
  members.list_id,
  row_number() over (
    partition by members.user_id
    order by lists.created_at, lists.id
  ) - 1
from public.shopping_list_members members
join public.shopping_lists lists
  on lists.id = members.list_id
on conflict (user_id, list_id) do nothing;

drop function if exists public.get_shopping_lists_for_user();

create function public.get_shopping_lists_for_user()
returns table (
  id uuid,
  name text,
  owner_id uuid,
  join_code text,
  created_at timestamptz,
  updated_at timestamptz,
  owner_email text,
  member_count bigint,
  product_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    lists.id,
    lists.name,
    lists.owner_id,
    lists.join_code,
    lists.created_at,
    lists.updated_at,
    coalesce(profiles.email, users.email) as owner_email,
    (
      select count(*)
      from public.shopping_list_members subscribers
      where subscribers.list_id = lists.id
        and subscribers.role = 'member'
    ) as member_count,
    (
      select count(*)
      from public.shopping_items items
      where items.list_id = lists.id
    ) + (
      select count(*)
      from public.freezer_items freezer
      where freezer.list_id = lists.id
    ) as product_count
  from public.shopping_lists lists
  join public.shopping_list_members members
    on members.list_id = lists.id
   and members.user_id = auth.uid()
  join auth.users users
    on users.id = lists.owner_id
  left join public.user_profiles profiles
    on profiles.id = lists.owner_id
  left join public.shopping_list_preferences preferences
    on preferences.list_id = lists.id
   and preferences.user_id = auth.uid()
  order by coalesce(preferences.position, 2147483647), lists.created_at, lists.id;
$$;

revoke all on function public.get_shopping_lists_for_user() from public;
grant execute on function public.get_shopping_lists_for_user() to authenticated;

create or replace function public.create_shopping_list(p_name text)
returns public.shopping_lists
language plpgsql
security definer
set search_path = public
as $$
declare
  created_list public.shopping_lists;
  next_position integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  insert into public.shopping_lists (id, name, owner_id, join_code)
  values (
    gen_random_uuid(),
    btrim(p_name),
    auth.uid(),
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
  )
  returning * into created_list;

  insert into public.shopping_list_members (list_id, user_id, role)
  values (created_list.id, auth.uid(), 'owner');

  select coalesce(max(position), -1) + 1 into next_position
  from public.shopping_list_preferences
  where user_id = auth.uid();

  insert into public.shopping_list_preferences (user_id, list_id, position)
  values (auth.uid(), created_list.id, next_position);

  return created_list;
end;
$$;

create or replace function public.join_shopping_list_by_code(p_join_code text)
returns public.shopping_lists
language plpgsql
security definer
set search_path = public
as $$
declare
  target_list public.shopping_lists;
  next_position integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select * into target_list
  from public.shopping_lists
  where join_code = upper(btrim(p_join_code));

  if target_list.id is null then
    raise exception 'invalid_join_code';
  end if;

  insert into public.shopping_list_members (list_id, user_id, role)
  values (target_list.id, auth.uid(), 'member')
  on conflict (list_id, user_id) do nothing;

  select coalesce(max(position), -1) + 1 into next_position
  from public.shopping_list_preferences
  where user_id = auth.uid();

  insert into public.shopping_list_preferences (user_id, list_id, position)
  values (auth.uid(), target_list.id, next_position)
  on conflict (user_id, list_id) do nothing;

  return target_list;
end;
$$;

create or replace function public.rename_shopping_list(
  p_list_id uuid,
  p_name text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.shopping_lists
  set name = btrim(p_name)
  where id = p_list_id
    and owner_id = auth.uid()
    and length(btrim(p_name)) > 0;

  if not found then
    raise exception 'list_owner_required_or_invalid_name';
  end if;

  update public.shopping_sections
  set name = btrim(p_name)
  where list_id = p_list_id;
end;
$$;

create or replace function public.move_shopping_list(
  p_list_id uuid,
  p_direction integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_position integer;
  target_position integer;
  other_list_id uuid;
begin
  if p_direction not in (-1, 1) then
    raise exception 'invalid_list_direction';
  end if;

  if not public.is_shopping_list_member(p_list_id) then
    raise exception 'list_membership_required';
  end if;

  select position into current_position
  from public.shopping_list_preferences
  where user_id = auth.uid()
    and list_id = p_list_id;

  if current_position is null then
    raise exception 'list_order_not_found';
  end if;

  target_position := current_position + p_direction;

  select list_id into other_list_id
  from public.shopping_list_preferences
  where user_id = auth.uid()
    and position = target_position;

  if other_list_id is null then
    return;
  end if;

  update public.shopping_list_preferences
  set position = current_position
  where user_id = auth.uid()
    and list_id = other_list_id;

  update public.shopping_list_preferences
  set position = target_position
  where user_id = auth.uid()
    and list_id = p_list_id;
end;
$$;

revoke all on function public.move_shopping_list(uuid, integer) from public;
grant execute on function public.move_shopping_list(uuid, integer) to authenticated;
