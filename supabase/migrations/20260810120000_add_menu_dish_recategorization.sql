alter table public.remote_actions
  drop constraint remote_actions_action_check;

alter table public.remote_actions
  add constraint remote_actions_action_check check (
    action in (
      'supabase_backup',
      'recategorize_products',
      'normalize_products',
      'process_tickets',
      'update_external_prices',
      'review_menu_plan',
      'recategorize_menu_dishes'
    )
  );

create table public.menu_dish_recategorization_runs (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.remote_actions (id) on delete restrict,
  library_id uuid not null references public.menu_dish_libraries (id) on delete cascade,
  requested_by uuid references auth.users (id) on delete set null,
  summary text not null default '',
  dishes_recategorized integer not null default 0,
  created_at timestamptz not null default now(),
  reverted_at timestamptz
);

create table public.menu_dish_recategorization_changes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.menu_dish_recategorization_runs (id) on delete cascade,
  dish_id uuid references public.menu_dishes (id) on delete set null,
  dish_name text not null,
  previous_type_id uuid references public.menu_dish_types (id) on delete set null,
  next_type_id uuid references public.menu_dish_types (id) on delete set null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index menu_dish_recategorization_runs_library_idx
  on public.menu_dish_recategorization_runs (library_id, created_at desc);
create index menu_dish_recategorization_changes_run_idx
  on public.menu_dish_recategorization_changes (run_id);

alter table public.menu_dish_recategorization_runs enable row level security;
alter table public.menu_dish_recategorization_changes enable row level security;
grant select on public.menu_dish_recategorization_runs to authenticated;
grant select on public.menu_dish_recategorization_changes to authenticated;

create policy "Menu dish recategorization runs members"
  on public.menu_dish_recategorization_runs
  for select
  to authenticated
  using (public.is_menu_dish_library_member(library_id));

create policy "Menu dish recategorization changes members"
  on public.menu_dish_recategorization_changes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.menu_dish_recategorization_runs runs
      where runs.id = run_id
        and public.is_menu_dish_library_member(runs.library_id)
    )
  );

create or replace function public.apply_menu_dish_recategorization(
  p_action_id uuid,
  p_library_id uuid,
  p_changes jsonb,
  p_summary text default ''
)
returns public.menu_dish_recategorization_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  action_row public.remote_actions;
  run_row public.menu_dish_recategorization_runs;
  change_row jsonb;
  dish_row public.menu_dishes;
  next_type_id uuid;
  change_count integer := 0;
begin
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 500 then
    raise exception 'invalid_menu_dish_recategorization_changes';
  end if;

  select * into action_row
  from public.remote_actions
  where id = p_action_id
    and action = 'recategorize_menu_dishes';
  if action_row.id is null then raise exception 'menu_recategorization_action_not_found'; end if;
  if not exists (
    select 1 from public.menu_dish_library_members
    where library_id = p_library_id and user_id = action_row.requested_by
  ) then raise exception 'menu_recategorization_library_not_allowed'; end if;

  insert into public.menu_dish_recategorization_runs (
    action_id, library_id, requested_by, summary
  ) values (
    p_action_id, p_library_id, action_row.requested_by, left(btrim(p_summary), 500)
  ) returning * into run_row;

  for change_row in select value from jsonb_array_elements(p_changes)
  loop
    if jsonb_typeof(change_row) <> 'object' then raise exception 'invalid_menu_dish_change'; end if;
    next_type_id := nullif(change_row ->> 'dishTypeId', '')::uuid;
    select * into dish_row
    from public.menu_dishes
    where id = nullif(change_row ->> 'dishId', '')::uuid
      and library_id = p_library_id
    for update;
    if dish_row.id is null then raise exception 'menu_dish_not_found'; end if;
    if next_type_id is not null and not exists (
      select 1 from public.menu_dish_types
      where id = next_type_id and library_id = p_library_id
    ) then raise exception 'menu_dish_type_not_found'; end if;

    insert into public.menu_dish_recategorization_changes (
      run_id, dish_id, dish_name, previous_type_id, next_type_id, reason
    ) values (
      run_row.id, dish_row.id, dish_row.name, dish_row.dish_type_id,
      next_type_id, left(coalesce(change_row ->> 'reason', ''), 500)
    );
    update public.menu_dishes
    set dish_type_id = next_type_id
    where id = dish_row.id;
    change_count := change_count + 1;
  end loop;

  update public.menu_dish_recategorization_runs
  set dishes_recategorized = change_count
  where id = run_row.id
  returning * into run_row;
  return run_row;
end;
$$;

create or replace function public.undo_menu_dish_recategorization(p_run_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  run_row public.menu_dish_recategorization_runs;
  restored integer := 0;
begin
  select * into run_row
  from public.menu_dish_recategorization_runs
  where id = p_run_id
  for update;
  if run_row.id is null or not public.is_menu_dish_library_member(run_row.library_id) then
    raise exception 'menu_recategorization_run_not_allowed';
  end if;
  if run_row.reverted_at is not null then return 0; end if;

  update public.menu_dishes dishes
  set dish_type_id = changes.previous_type_id
  from public.menu_dish_recategorization_changes changes
  where changes.run_id = run_row.id
    and changes.dish_id = dishes.id
    and dishes.library_id = run_row.library_id
    and dishes.dish_type_id is not distinct from changes.next_type_id;
  get diagnostics restored = row_count;

  update public.menu_dish_recategorization_runs
  set reverted_at = now()
  where id = run_row.id;
  return restored;
end;
$$;

revoke all on function public.apply_menu_dish_recategorization(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.undo_menu_dish_recategorization(uuid) from public, anon, authenticated;
grant execute on function public.apply_menu_dish_recategorization(uuid, uuid, jsonb, text) to service_role;
grant execute on function public.undo_menu_dish_recategorization(uuid) to authenticated;
