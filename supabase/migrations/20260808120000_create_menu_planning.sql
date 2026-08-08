create table public.menu_plans (
  id uuid primary key default gen_random_uuid(),
  scope_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  starts_on date not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope_list_id, starts_on)
);

create table public.menu_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.menu_plans (id) on delete cascade,
  planned_on date not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (plan_id, planned_on),
  constraint menu_plan_days_content_limit check (char_length(content) <= 4000)
);

create table public.menu_dish_types (
  id uuid primary key default gen_random_uuid(),
  scope_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint menu_dish_types_name check (length(btrim(name)) > 0)
);

create table public.menu_plan_dishes (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.menu_plan_days (id) on delete cascade,
  name text not null,
  dish_type_id uuid references public.menu_dish_types (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint menu_plan_dishes_name check (length(btrim(name)) > 0)
);

create table public.menu_plan_proposals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.menu_plans (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'requested', 'ready', 'failed', 'confirmed')),
  requested_by uuid references auth.users (id) on delete set null,
  request_id text unique,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_plan_proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.menu_plan_proposals (id) on delete cascade,
  name text not null,
  quantity text,
  destination_list_id uuid not null references public.shopping_lists (id) on delete restrict,
  source_day_id uuid references public.menu_plan_days (id) on delete set null,
  selected boolean not null default true,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint menu_plan_proposal_items_name check (length(btrim(name)) > 0)
);

create index menu_plans_scope_starts_on_idx on public.menu_plans (scope_list_id, starts_on desc);
create index menu_plan_days_plan_idx on public.menu_plan_days (plan_id, planned_on);
create index menu_plan_proposals_plan_idx on public.menu_plan_proposals (plan_id, created_at desc);
create unique index menu_dish_types_scope_name_idx on public.menu_dish_types (scope_list_id, lower(name));

create or replace function public.is_menu_plan_member(p_plan_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.menu_plans plan
    where plan.id = p_plan_id and public.is_shopping_list_member(plan.scope_list_id)
  );
$$;

create or replace function public.menu_plan_destination_allowed(p_plan_id uuid, p_destination_list_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_menu_plan_member(p_plan_id)
    and not exists (
      (select user_id from public.shopping_list_members where list_id = (select scope_list_id from public.menu_plans where id = p_plan_id)
       except select user_id from public.shopping_list_members where list_id = p_destination_list_id)
      union all
      (select user_id from public.shopping_list_members where list_id = p_destination_list_id
       except select user_id from public.shopping_list_members where list_id = (select scope_list_id from public.menu_plans where id = p_plan_id))
    );
$$;

alter table public.menu_plans enable row level security;
alter table public.menu_plan_days enable row level security;
alter table public.menu_dish_types enable row level security;
alter table public.menu_plan_dishes enable row level security;
alter table public.menu_plan_proposals enable row level security;
alter table public.menu_plan_proposal_items enable row level security;
grant select, insert, update, delete on public.menu_plans, public.menu_plan_days, public.menu_dish_types, public.menu_plan_dishes, public.menu_plan_proposals, public.menu_plan_proposal_items to authenticated;

create policy "Menu plan members" on public.menu_plans for all to authenticated using (public.is_shopping_list_member(scope_list_id)) with check (public.is_shopping_list_member(scope_list_id));
create policy "Menu days members" on public.menu_plan_days for all to authenticated using (public.is_menu_plan_member(plan_id)) with check (public.is_menu_plan_member(plan_id));
create policy "Menu types members" on public.menu_dish_types for all to authenticated using (public.is_shopping_list_member(scope_list_id)) with check (public.is_shopping_list_member(scope_list_id));
create policy "Menu dishes members" on public.menu_plan_dishes for all to authenticated using (public.is_menu_plan_member((select plan_id from public.menu_plan_days where id = plan_day_id))) with check (public.is_menu_plan_member((select plan_id from public.menu_plan_days where id = plan_day_id)));
create policy "Menu proposals members" on public.menu_plan_proposals for all to authenticated using (public.is_menu_plan_member(plan_id)) with check (public.is_menu_plan_member(plan_id));
create policy "Menu proposal items members" on public.menu_plan_proposal_items for all to authenticated using (public.is_menu_plan_member((select plan_id from public.menu_plan_proposals where id = proposal_id))) with check (public.menu_plan_destination_allowed((select plan_id from public.menu_plan_proposals where id = proposal_id), destination_list_id));

create trigger menu_plans_set_updated_at before update on public.menu_plans for each row execute function public.set_updated_at();
create trigger menu_plan_proposals_set_updated_at before update on public.menu_plan_proposals for each row execute function public.set_updated_at();
