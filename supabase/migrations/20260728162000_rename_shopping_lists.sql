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
end;
$$;

revoke all on function public.rename_shopping_list(uuid, text) from public;
grant execute on function public.rename_shopping_list(uuid, text) to authenticated;
