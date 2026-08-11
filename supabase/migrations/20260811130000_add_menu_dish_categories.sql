create table public.menu_dish_categories (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references public.menu_dish_libraries (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint menu_dish_categories_name check (length(btrim(name)) > 0)
);

create table public.menu_dish_category_links (
  dish_id uuid not null references public.menu_dishes (id) on delete cascade,
  category_id uuid not null references public.menu_dish_categories (id) on delete cascade,
  position integer not null default 0,
  primary key (dish_id, category_id)
);

create unique index menu_dish_categories_library_name_idx
  on public.menu_dish_categories (library_id, lower(name));
create index menu_dish_category_links_category_idx
  on public.menu_dish_category_links (category_id, dish_id);

alter table public.menu_dish_categories enable row level security;
alter table public.menu_dish_category_links enable row level security;

grant select, insert, update, delete on public.menu_dish_categories to authenticated;
grant select, insert, update, delete on public.menu_dish_category_links to authenticated;

create policy "Menu dish categories library members"
  on public.menu_dish_categories
  for all
  to authenticated
  using (public.is_menu_dish_library_member(library_id))
  with check (public.is_menu_dish_library_member(library_id));

create policy "Menu dish category links library members"
  on public.menu_dish_category_links
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.menu_dishes dishes
      where dishes.id = dish_id
        and public.is_menu_dish_library_member(dishes.library_id)
    )
    and exists (
      select 1
      from public.menu_dish_categories categories
      where categories.id = category_id
        and public.is_menu_dish_library_member(categories.library_id)
    )
  )
  with check (
    exists (
      select 1
      from public.menu_dishes dishes
      where dishes.id = dish_id
        and public.is_menu_dish_library_member(dishes.library_id)
    )
    and exists (
      select 1
      from public.menu_dish_categories categories
      join public.menu_dishes dishes on dishes.library_id = categories.library_id
      where categories.id = category_id
        and dishes.id = dish_id
        and public.is_menu_dish_library_member(categories.library_id)
    )
  );
