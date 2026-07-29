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
  product_count bigint,
  membership_role text
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
    ) as product_count,
    members.role as membership_role
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

create function public.get_shopping_list_members(p_list_id uuid)
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    members.user_id,
    coalesce(profiles.email, users.email) as email,
    profiles.display_name,
    members.role,
    members.joined_at
  from public.shopping_list_members members
  join auth.users users
    on users.id = members.user_id
  left join public.user_profiles profiles
    on profiles.id = members.user_id
  where members.list_id = p_list_id
    and public.is_shopping_list_member(p_list_id)
  order by case when members.role = 'owner' then 0 else 1 end,
    members.joined_at,
    members.user_id;
$$;

revoke all on function public.get_shopping_list_members(uuid) from public;
grant execute on function public.get_shopping_list_members(uuid) to authenticated;

create or replace function public.remove_shopping_list_member(
  p_list_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not exists (
    select 1
    from public.shopping_lists
    where id = p_list_id
      and owner_id = auth.uid()
  ) then
    raise exception 'list_owner_required';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'owner_cannot_be_removed';
  end if;

  delete from public.shopping_list_members
  where list_id = p_list_id
    and user_id = p_user_id
    and role = 'member';

  if not found then
    raise exception 'member_not_found';
  end if;
end;
$$;

revoke all on function public.remove_shopping_list_member(uuid, uuid) from public;
grant execute on function public.remove_shopping_list_member(uuid, uuid) to authenticated;

create or replace function public.transfer_shopping_list_ownership(
  p_list_id uuid,
  p_new_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select owner_id
  into current_owner_id
  from public.shopping_lists
  where id = p_list_id;

  if current_owner_id is null then
    raise exception 'list_not_found';
  end if;

  if current_owner_id <> auth.uid() then
    raise exception 'list_owner_required';
  end if;

  if p_new_owner_id = auth.uid() then
    raise exception 'owner_already_current';
  end if;

  if not exists (
    select 1
    from public.shopping_list_members
    where list_id = p_list_id
      and user_id = p_new_owner_id
      and role = 'member'
  ) then
    raise exception 'transfer_target_must_be_member';
  end if;

  update public.shopping_list_members
  set role = 'member'
  where list_id = p_list_id
    and user_id = auth.uid()
    and role = 'owner';

  update public.shopping_list_members
  set role = 'owner'
  where list_id = p_list_id
    and user_id = p_new_owner_id;

  update public.shopping_lists
  set owner_id = p_new_owner_id
  where id = p_list_id;
end;
$$;

revoke all on function public.transfer_shopping_list_ownership(uuid, uuid) from public;
grant execute on function public.transfer_shopping_list_ownership(uuid, uuid) to authenticated;
