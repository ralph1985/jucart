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
  order by lists.created_at asc;
$$;

revoke all on function public.get_shopping_lists_for_user() from public;
grant execute on function public.get_shopping_lists_for_user() to authenticated;

create or replace function public.delete_shopping_list(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_list public.shopping_lists;
begin
  select * into target_list
  from public.shopping_lists
  where id = p_list_id;

  if target_list.id is null then
    raise exception 'list_not_found';
  end if;

  if target_list.owner_id <> auth.uid() then
    raise exception 'list_owner_required';
  end if;

  if exists (
    select 1
    from public.shopping_list_members
    where list_id = p_list_id
      and role = 'member'
  ) then
    raise exception 'list_has_subscribers';
  end if;

  if exists (
    select 1 from public.shopping_items where list_id = p_list_id
    union all
    select 1 from public.freezer_items where list_id = p_list_id
    union all
    select 1 from public.shopping_tickets where list_id = p_list_id
    union all
    select 1 from public.shopping_price_observations where list_id = p_list_id
  ) then
    raise exception 'list_has_products';
  end if;

  delete from public.shopping_lists
  where id = p_list_id;
end;
$$;

revoke all on function public.delete_shopping_list(uuid) from public;
grant execute on function public.delete_shopping_list(uuid) to authenticated;
