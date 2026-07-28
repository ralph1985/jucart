create table public.shopping_lists (
  id uuid primary key,
  name text not null,
  owner_id uuid not null references auth.users (id) on delete restrict,
  join_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_lists_name_not_empty check (length(btrim(name)) > 0),
  constraint shopping_lists_join_code_check check (join_code ~ '^[A-Z0-9]{8}$')
);

create table public.shopping_list_members (
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id),
  constraint shopping_list_members_role_check check (role in ('owner', 'member'))
);

create index shopping_list_members_user_idx
  on public.shopping_list_members (user_id, joined_at desc);

create trigger shopping_lists_set_updated_at
before update on public.shopping_lists
for each row
execute function public.set_updated_at();

create or replace function public.is_shopping_list_member(p_list_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.shopping_list_members
    where list_id = p_list_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_shopping_list_member(uuid) from public;
grant execute on function public.is_shopping_list_member(uuid) to authenticated;

alter table public.shopping_lists enable row level security;
alter table public.shopping_list_members enable row level security;

grant select on public.shopping_lists to authenticated;
grant insert, update on public.shopping_lists to authenticated;
grant select on public.shopping_list_members to authenticated;

create policy "Members can read their lists"
on public.shopping_lists
for select
to authenticated
using (public.is_shopping_list_member(id));

create policy "Users can create their own lists"
on public.shopping_lists
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "Owners can update their lists"
on public.shopping_lists
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Members can read list membership"
on public.shopping_list_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_shopping_list_member(list_id)
);

create or replace function public.create_shopping_list(p_name text)
returns public.shopping_lists
language plpgsql
security definer
set search_path = public
as $$
declare
  created_list public.shopping_lists;
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

  return created_list;
end;
$$;

revoke all on function public.create_shopping_list(text) from public;
grant execute on function public.create_shopping_list(text) to authenticated;

create or replace function public.join_shopping_list_by_code(p_join_code text)
returns public.shopping_lists
language plpgsql
security definer
set search_path = public
as $$
declare
  target_list public.shopping_lists;
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

  return target_list;
end;
$$;

revoke all on function public.join_shopping_list_by_code(text) from public;
grant execute on function public.join_shopping_list_by_code(text) to authenticated;

create or replace function public.regenerate_shopping_list_code(p_list_id uuid)
returns public.shopping_lists
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_list public.shopping_lists;
begin
  update public.shopping_lists
  set join_code = upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
  where id = p_list_id
    and owner_id = auth.uid()
  returning * into updated_list;

  if updated_list.id is null then
    raise exception 'list_owner_required';
  end if;

  return updated_list;
end;
$$;

revoke all on function public.regenerate_shopping_list_code(uuid) from public;
grant execute on function public.regenerate_shopping_list_code(uuid) to authenticated;

create or replace function public.leave_shopping_list(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.shopping_list_members
  where list_id = p_list_id
    and user_id = auth.uid()
    and role = 'member';

  if not found then
    raise exception 'owner_cannot_leave_or_membership_missing';
  end if;
end;
$$;

revoke all on function public.leave_shopping_list(uuid) from public;
grant execute on function public.leave_shopping_list(uuid) to authenticated;

do $$
declare
  rafa_id uuid;
begin
  select id into rafa_id
  from auth.users
  where lower(email) = 'rafaelgarcia1985@hotmail.com'
  limit 1;

  if rafa_id is null then
    raise exception 'rafa_auth_user_not_found';
  end if;

  insert into public.shopping_lists (id, name, owner_id, join_code)
  values (
    '00000000-0000-4000-8000-000000000001',
    'Lista actual',
    rafa_id,
    upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
  )
  on conflict (id) do update
  set owner_id = excluded.owner_id,
      updated_at = now();

  insert into public.shopping_list_members (list_id, user_id, role)
  values (
    '00000000-0000-4000-8000-000000000001',
    rafa_id,
    'owner'
  )
  on conflict (list_id, user_id) do update
  set role = 'owner';
end;
$$;
