create unique index if not exists shopping_list_members_one_owner_idx
on public.shopping_list_members (list_id)
where role = 'owner';

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
  where id = p_list_id
  for update;

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

revoke execute on function public.transfer_shopping_list_ownership(uuid, uuid) from anon, public;
grant execute on function public.transfer_shopping_list_ownership(uuid, uuid) to authenticated;
