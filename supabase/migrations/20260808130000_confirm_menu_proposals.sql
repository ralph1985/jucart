create or replace function public.confirm_menu_plan_proposal(p_proposal_id uuid)
returns table (proposal_item_id uuid, shopping_item_id text, result text)
language plpgsql
security definer
set search_path = public
as $$
declare
  proposal public.menu_plan_proposals;
  proposal_item public.menu_plan_proposal_items;
  target_section text;
  inserted_item_id text;
begin
  select * into proposal from public.menu_plan_proposals where id = p_proposal_id for update;
  if proposal.id is null or not public.is_menu_plan_member(proposal.plan_id) then
    raise exception 'menu_proposal_not_available';
  end if;
  if proposal.status not in ('ready', 'confirmed') then
    raise exception 'menu_proposal_not_ready';
  end if;

  for proposal_item in
    select * from public.menu_plan_proposal_items
    where proposal_id = p_proposal_id and selected and confirmed_at is null
    order by created_at
    for update
  loop
    select id into target_section
    from public.shopping_sections
    where list_id = proposal_item.destination_list_id
    order by position, id
    limit 1;
    if target_section is null then
      raise exception 'menu_destination_has_no_section';
    end if;

    inserted_item_id := concat('menu-', gen_random_uuid()::text);
    insert into public.shopping_items (id, list_id, name, quantity, section_id, added_by, purchased)
    values (
      inserted_item_id,
      proposal_item.destination_list_id,
      proposal_item.name,
      proposal_item.quantity,
      target_section,
      case when coalesce(auth.jwt() ->> 'email', '') ilike 'rafaelgarcia1985@hotmail.com' then 'rafa' else 'begona' end,
      false
    )
    on conflict (list_id, section_id, lower(name)) do nothing;

    update public.menu_plan_proposal_items set confirmed_at = now() where id = proposal_item.id;
    proposal_item_id := proposal_item.id;
    shopping_item_id := inserted_item_id;
    result := 'added';
    return next;
  end loop;

  update public.menu_plan_proposals
  set status = 'confirmed'
  where id = p_proposal_id
    and not exists (
      select 1 from public.menu_plan_proposal_items
      where proposal_id = p_proposal_id and selected and confirmed_at is null
    );
end;
$$;

revoke all on function public.confirm_menu_plan_proposal(uuid) from public, anon;
grant execute on function public.confirm_menu_plan_proposal(uuid) to authenticated;
