create or replace function public.get_shopping_lists_for_user()
returns table (
  id uuid,
  name text,
  owner_id uuid,
  join_code text,
  created_at timestamptz,
  updated_at timestamptz,
  owner_email text
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
    coalesce(profiles.email, users.email) as owner_email
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
