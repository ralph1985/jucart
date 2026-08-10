create table public.menu_dishes (
  id uuid primary key default gen_random_uuid(),
  scope_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  name text not null,
  dish_type_id uuid references public.menu_dish_types (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'cooked')),
  cooked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_dishes_name check (length(btrim(name)) > 0),
  constraint menu_dishes_cooked_state check (
    (status = 'pending' and cooked_at is null)
    or (status = 'cooked' and cooked_at is not null)
  )
);

create unique index menu_dishes_scope_name_idx
  on public.menu_dishes (scope_list_id, lower(name));
create index menu_dishes_scope_status_idx
  on public.menu_dishes (scope_list_id, status, cooked_at desc nulls last);

alter table public.menu_dishes enable row level security;
grant select, insert, update, delete on public.menu_dishes to authenticated;

create policy "Menu dishes collection members"
  on public.menu_dishes
  for all
  to authenticated
  using (public.is_shopping_list_member(scope_list_id))
  with check (
    public.is_shopping_list_member(scope_list_id)
    and (
      (status = 'pending' and cooked_at is null)
      or (status = 'cooked' and cooked_at is not null)
    )
  );

create trigger menu_dishes_set_updated_at
  before update on public.menu_dishes
  for each row execute function public.set_updated_at();
