create table public.shopping_item_mutation_receipts (
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_id text not null,
  payload_hash text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id),
  constraint shopping_item_mutation_receipts_operation_id_not_empty
    check (length(btrim(operation_id)) > 0)
);

alter table public.shopping_items
  add column version bigint not null default 1;

create or replace function public.set_shopping_item_version()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

drop trigger if exists shopping_items_set_updated_at on public.shopping_items;
create trigger shopping_items_set_version
before update on public.shopping_items
for each row
execute function public.set_shopping_item_version();

alter table public.shopping_item_mutation_receipts enable row level security;
revoke all on public.shopping_item_mutation_receipts from public, anon, authenticated;

create or replace function public.apply_shopping_item_mutations(p_mutations jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mutation jsonb;
  item_data jsonb;
  event_data jsonb;
  mutation_action text;
  mutation_operation_id text;
  source_list_id uuid;
  target_list_id uuid;
  expected_version bigint;
  affected_rows integer;
  operation_hash text;
  stored_operation_hash text;
  expected_event_type text;
  previous_item public.shopping_items%rowtype;
  current_item public.shopping_items%rowtype;
  current_section_name text;
  previous_section_name text;
  current_snapshot jsonb;
  previous_snapshot jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if jsonb_typeof(p_mutations) <> 'array' or jsonb_array_length(p_mutations) = 0 then
    raise exception 'shopping_item_mutations_required';
  end if;

  for mutation in select value from jsonb_array_elements(p_mutations)
  loop
    if jsonb_typeof(mutation) <> 'object' then
      raise exception 'invalid_shopping_item_mutation';
    end if;

    mutation_action := mutation ->> 'action';
    mutation_operation_id := btrim(mutation ->> 'operation_id');
    item_data := mutation -> 'item';
    event_data := mutation -> 'history_event';
    source_list_id := (mutation ->> 'source_list_id')::uuid;
    target_list_id := (item_data ->> 'list_id')::uuid;
    expected_version := nullif(mutation ->> 'expected_version', '')::bigint;
    operation_hash := md5(mutation::text);

    if mutation_action is null
      or mutation_action not in ('insert', 'update', 'delete')
      or mutation_operation_id is null
      or mutation_operation_id = ''
      or jsonb_typeof(item_data) <> 'object'
      or source_list_id is null
      or target_list_id is null
      or (
        event_data is not null
        and event_data <> 'null'::jsonb
        and jsonb_typeof(event_data) <> 'object'
      )
      or (
        mutation_action in ('insert', 'delete')
        and coalesce(jsonb_typeof(event_data), 'null') <> 'object'
      )
    then
      raise exception 'invalid_shopping_item_mutation';
    end if;

    if not public.is_shopping_list_member(source_list_id) then
      raise exception 'source_list_membership_required';
    end if;

    if not public.is_shopping_list_member(target_list_id) then
      raise exception 'target_list_membership_required';
    end if;

    if mutation_action = 'delete' and target_list_id <> source_list_id then
      raise exception 'shopping_item_delete_scope_mismatch';
    end if;

    insert into public.shopping_item_mutation_receipts (
      user_id,
      operation_id,
      payload_hash
    )
    values (auth.uid(), mutation_operation_id, operation_hash)
    on conflict do nothing;

    get diagnostics affected_rows = row_count;
    if affected_rows = 0 then
      select payload_hash
      into stored_operation_hash
      from public.shopping_item_mutation_receipts
      where user_id = auth.uid()
        and operation_id = mutation_operation_id;

      if stored_operation_hash is distinct from operation_hash then
        raise exception 'shopping_item_operation_id_mismatch';
      end if;

      continue;
    end if;

    if mutation_action <> 'delete' and not exists (
      select 1
      from public.shopping_sections
      where list_id = target_list_id
        and id = item_data ->> 'section_id'
    ) then
      raise exception 'shopping_section_not_found';
    end if;

    if nullif(item_data ->> 'canonical_product_id', '') is not null
      and not exists (
        select 1
        from public.shopping_canonical_products
        where id = (item_data ->> 'canonical_product_id')::uuid
          and list_id = target_list_id
      )
    then
      raise exception 'shopping_canonical_product_scope_mismatch';
    end if;

    if mutation_action = 'insert' then
      insert into public.shopping_items (
        id,
        list_id,
        name,
        notes,
        quantity,
        section_id,
        category_id,
        canonical_product_id,
        added_by,
        purchased,
        version,
        created_at,
        updated_at
      ) values (
        item_data ->> 'id',
        target_list_id,
        item_data ->> 'name',
        nullif(item_data ->> 'notes', ''),
        nullif(item_data ->> 'quantity', ''),
        item_data ->> 'section_id',
        item_data ->> 'category_id',
        nullif(item_data ->> 'canonical_product_id', '')::uuid,
        item_data ->> 'added_by',
        (item_data ->> 'purchased')::boolean,
        1,
        (item_data ->> 'created_at')::timestamptz,
        (item_data ->> 'updated_at')::timestamptz
      )
      returning * into current_item;
    elsif mutation_action = 'update' then
      if expected_version is null then
        raise exception 'shopping_item_expected_version_required';
      end if;

      select *
      into previous_item
      from public.shopping_items
      where id = item_data ->> 'id'
        and list_id = source_list_id
      for update;

      if not found or previous_item.version <> expected_version then
        raise exception 'shopping_item_conflict';
      end if;

      update public.shopping_items
      set
        list_id = target_list_id,
        name = item_data ->> 'name',
        notes = nullif(item_data ->> 'notes', ''),
        quantity = nullif(item_data ->> 'quantity', ''),
        section_id = item_data ->> 'section_id',
        category_id = item_data ->> 'category_id',
        canonical_product_id = nullif(item_data ->> 'canonical_product_id', '')::uuid,
        added_by = item_data ->> 'added_by',
        purchased = (item_data ->> 'purchased')::boolean
      where id = item_data ->> 'id'
        and list_id = source_list_id
      returning * into current_item;

      get diagnostics affected_rows = row_count;
      if affected_rows <> 1 then
        raise exception 'shopping_item_conflict';
      end if;
    else
      if expected_version is null then
        raise exception 'shopping_item_expected_version_required';
      end if;

      select *
      into previous_item
      from public.shopping_items
      where id = item_data ->> 'id'
        and list_id = source_list_id
      for update;

      if not found or previous_item.version <> expected_version then
        raise exception 'shopping_item_conflict';
      end if;

      delete from public.shopping_items
      where id = item_data ->> 'id'
        and list_id = source_list_id
      returning * into current_item;

      get diagnostics affected_rows = row_count;
      if affected_rows <> 1 then
        raise exception 'shopping_item_conflict';
      end if;
    end if;

    if mutation_action = 'insert' then
      expected_event_type := 'added';
    elsif mutation_action = 'delete' then
      expected_event_type := 'deleted';
    elsif source_list_id <> target_list_id
      or previous_item.section_id <> item_data ->> 'section_id'
    then
      expected_event_type := 'moved';
    elsif previous_item.purchased = false
      and (item_data ->> 'purchased')::boolean = true
    then
      expected_event_type := 'purchased';
    elsif previous_item.purchased = true
      and (item_data ->> 'purchased')::boolean = false
    then
      expected_event_type := 'unpurchased';
    else
      expected_event_type := null;
    end if;

    if expected_event_type is null
      and coalesce(jsonb_typeof(event_data), 'null') = 'object'
    then
      raise exception 'shopping_history_event_not_allowed';
    end if;

    if expected_event_type is not null
      and coalesce(jsonb_typeof(event_data), 'null') <> 'object'
    then
      raise exception 'shopping_history_event_required';
    end if;

    if expected_event_type is not null
      and event_data ->> 'event_type' is distinct from expected_event_type
    then
      raise exception 'shopping_history_event_type_mismatch';
    end if;

    select name
    into current_section_name
    from public.shopping_sections
    where list_id = current_item.list_id
      and id = current_item.section_id;

    current_snapshot := jsonb_strip_nulls(jsonb_build_object(
      'id', current_item.id,
      'name', current_item.name,
      'notes', current_item.notes,
      'quantity', current_item.quantity,
      'sectionId', current_item.section_id,
      'sectionName', coalesce(current_section_name, current_item.section_id),
      'categoryId', current_item.category_id,
      'canonicalProductId', current_item.canonical_product_id,
      'addedBy', current_item.added_by,
      'purchased', current_item.purchased,
      'createdAt', (extract(epoch from current_item.created_at) * 1000)::bigint,
      'updatedAt', (extract(epoch from current_item.updated_at) * 1000)::bigint
    ));

    previous_snapshot := null;
    if expected_event_type = 'moved' then
      select name
      into previous_section_name
      from public.shopping_sections
      where list_id = previous_item.list_id
        and id = previous_item.section_id;

      previous_snapshot := jsonb_strip_nulls(jsonb_build_object(
        'id', previous_item.id,
        'name', previous_item.name,
        'notes', previous_item.notes,
        'quantity', previous_item.quantity,
        'sectionId', previous_item.section_id,
        'sectionName', coalesce(previous_section_name, previous_item.section_id),
        'categoryId', previous_item.category_id,
        'canonicalProductId', previous_item.canonical_product_id,
        'addedBy', previous_item.added_by,
        'purchased', previous_item.purchased,
        'createdAt', (extract(epoch from previous_item.created_at) * 1000)::bigint,
        'updatedAt', (extract(epoch from previous_item.updated_at) * 1000)::bigint,
        'listId', source_list_id
      ));
    end if;

    if event_data is not null and jsonb_typeof(event_data) = 'object' then
      if (event_data ->> 'list_id')::uuid <> target_list_id then
        raise exception 'shopping_history_scope_mismatch';
      end if;

      if event_data ->> 'item_id' <> item_data ->> 'id' then
        raise exception 'shopping_history_item_mismatch';
      end if;

      if mutation_action <> 'delete' and (
        coalesce(jsonb_typeof(event_data -> 'item_snapshot'), 'null') <> 'object'
        or event_data -> 'item_snapshot' ->> 'id'
          is distinct from item_data ->> 'id'
        or event_data -> 'item_snapshot' ->> 'name'
          is distinct from item_data ->> 'name'
        or event_data -> 'item_snapshot' ->> 'sectionId'
          is distinct from item_data ->> 'section_id'
        or event_data -> 'item_snapshot' ->> 'addedBy'
          is distinct from item_data ->> 'added_by'
        or event_data -> 'item_snapshot' ->> 'notes'
          is distinct from nullif(item_data ->> 'notes', '')
        or event_data -> 'item_snapshot' ->> 'quantity'
          is distinct from nullif(item_data ->> 'quantity', '')
        or event_data -> 'item_snapshot' ->> 'categoryId'
          is distinct from item_data ->> 'category_id'
        or event_data -> 'item_snapshot' ->> 'canonicalProductId'
          is distinct from item_data ->> 'canonical_product_id'
        or (event_data -> 'item_snapshot' ->> 'purchased')::boolean
          is distinct from (item_data ->> 'purchased')::boolean
      )
      then
        raise exception 'shopping_history_snapshot_mismatch';
      end if;

      if mutation_action = 'delete' and (
        coalesce(jsonb_typeof(event_data -> 'item_snapshot'), 'null') <> 'object'
        or event_data -> 'item_snapshot' ->> 'id'
          is distinct from previous_item.id
        or event_data -> 'item_snapshot' ->> 'name'
          is distinct from previous_item.name
        or event_data -> 'item_snapshot' ->> 'sectionId'
          is distinct from previous_item.section_id
        or event_data -> 'item_snapshot' ->> 'addedBy'
          is distinct from previous_item.added_by
        or event_data -> 'item_snapshot' ->> 'notes'
          is distinct from previous_item.notes
        or event_data -> 'item_snapshot' ->> 'quantity'
          is distinct from previous_item.quantity
        or event_data -> 'item_snapshot' ->> 'categoryId'
          is distinct from previous_item.category_id
        or event_data -> 'item_snapshot' ->> 'canonicalProductId'
          is distinct from previous_item.canonical_product_id::text
        or (event_data -> 'item_snapshot' ->> 'purchased')::boolean
          is distinct from previous_item.purchased
      )
      then
        raise exception 'shopping_history_snapshot_mismatch';
      end if;

      if expected_event_type = 'moved'
        and coalesce(
          jsonb_typeof(event_data -> 'previous_item_snapshot'),
          'null'
        ) <> 'object'
      then
        raise exception 'shopping_history_previous_snapshot_required';
      end if;

      if expected_event_type = 'moved'
        and coalesce(
          jsonb_typeof(event_data -> 'previous_item_snapshot'),
          'null'
        ) = 'object'
        and (
          event_data -> 'previous_item_snapshot' ->> 'id'
            is distinct from previous_item.id
          or event_data -> 'previous_item_snapshot' ->> 'name'
            is distinct from previous_item.name
          or event_data -> 'previous_item_snapshot' ->> 'sectionId'
            is distinct from previous_item.section_id
          or event_data -> 'previous_item_snapshot' ->> 'addedBy'
            is distinct from previous_item.added_by
          or event_data -> 'previous_item_snapshot' ->> 'notes'
            is distinct from previous_item.notes
          or event_data -> 'previous_item_snapshot' ->> 'quantity'
            is distinct from previous_item.quantity
          or event_data -> 'previous_item_snapshot' ->> 'categoryId'
            is distinct from previous_item.category_id
          or event_data -> 'previous_item_snapshot' ->> 'canonicalProductId'
            is distinct from previous_item.canonical_product_id::text
          or (event_data -> 'previous_item_snapshot' ->> 'purchased')::boolean
            is distinct from previous_item.purchased
        )
      then
        raise exception 'shopping_history_previous_snapshot_mismatch';
      end if;

      insert into public.shopping_history_events (
        id,
        list_id,
        item_id,
        event_type,
        actor,
        client_id,
        item_snapshot,
        previous_item_snapshot,
        created_at
      ) values (
        event_data ->> 'id',
        target_list_id,
        event_data ->> 'item_id',
        event_data ->> 'event_type',
        event_data ->> 'actor',
        event_data ->> 'client_id',
        current_snapshot,
        previous_snapshot,
        (event_data ->> 'created_at')::timestamptz
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.apply_shopping_item_mutations(jsonb) from public, anon;
grant execute on function public.apply_shopping_item_mutations(jsonb) to authenticated;

revoke insert, update, delete on public.shopping_history_events from authenticated;
drop policy if exists "Authenticated list access" on public.shopping_history_events;
create policy "Authenticated history reads"
on public.shopping_history_events
for select
to authenticated
using (public.is_shopping_list_member(list_id));

revoke insert, update, delete on public.shopping_items from authenticated;
drop policy if exists "Authenticated list access" on public.shopping_items;
drop policy if exists "Allow shared list inserts" on public.shopping_items;
drop policy if exists "Allow shared list updates" on public.shopping_items;
drop policy if exists "Allow shared list deletes" on public.shopping_items;
drop policy if exists "Authenticated item reads" on public.shopping_items;
create policy "Authenticated item reads"
on public.shopping_items
for select
to authenticated
using (public.is_shopping_list_member(list_id));
