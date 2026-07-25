create table public.shopping_canonical_products (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  name text not null,
  normalized_name text not null,
  comparison_unit text not null default 'unit',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_canonical_products_name_not_empty check (length(btrim(name)) > 0),
  constraint shopping_canonical_products_normalized_name_not_empty check (length(btrim(normalized_name)) > 0),
  constraint shopping_canonical_products_comparison_unit_check check (comparison_unit in ('kg', 'l', 'unit'))
);

create unique index shopping_canonical_products_list_normalized_name_key
  on public.shopping_canonical_products (list_id, normalized_name);

create trigger shopping_canonical_products_set_updated_at
before update on public.shopping_canonical_products
for each row
execute function public.set_updated_at();

create table public.shopping_canonical_product_aliases (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  canonical_product_id uuid not null references public.shopping_canonical_products(id) on update cascade on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  constraint shopping_canonical_product_aliases_alias_not_empty check (length(btrim(alias)) > 0),
  constraint shopping_canonical_product_aliases_normalized_alias_not_empty check (length(btrim(normalized_alias)) > 0)
);

create unique index shopping_canonical_product_aliases_list_normalized_alias_key
  on public.shopping_canonical_product_aliases (list_id, normalized_alias);

create index shopping_canonical_product_aliases_product_id_idx
  on public.shopping_canonical_product_aliases (canonical_product_id);

alter table public.shopping_items
  add column canonical_product_id uuid references public.shopping_canonical_products(id) on update cascade on delete set null;

create index shopping_items_list_canonical_product_id_idx
  on public.shopping_items (list_id, canonical_product_id);

create table public.shopping_product_normalization_runs (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  source text not null default 'codex',
  status text not null,
  summary text,
  aliases_created integer not null default 0,
  items_touched integer not null default 0,
  quantities_merged integer not null default 0,
  canonical_products_merged integer not null default 0,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint shopping_product_normalization_runs_source_check check (source in ('codex')),
  constraint shopping_product_normalization_runs_status_check check (status in ('success', 'failed')),
  constraint shopping_product_normalization_runs_aliases_created_check check (aliases_created >= 0),
  constraint shopping_product_normalization_runs_items_touched_check check (items_touched >= 0),
  constraint shopping_product_normalization_runs_quantities_merged_check check (quantities_merged >= 0),
  constraint shopping_product_normalization_runs_canonical_products_merged_check check (canonical_products_merged >= 0)
);

create table public.shopping_product_normalization_changes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.shopping_product_normalization_runs(id) on delete cascade,
  list_id uuid not null,
  action text not null,
  item_id text,
  previous_item_name text,
  next_item_name text,
  previous_canonical_product_id uuid references public.shopping_canonical_products(id) on update cascade on delete set null,
  next_canonical_product_id uuid references public.shopping_canonical_products(id) on update cascade on delete set null,
  quantity_before text,
  quantity_after text,
  reason text,
  created_at timestamptz not null default now(),
  constraint shopping_product_normalization_changes_action_check check (action in ('renamed', 'merged', 'alias_created', 'deleted'))
);

create index shopping_product_normalization_runs_list_created_at_idx
  on public.shopping_product_normalization_runs (list_id, created_at desc);

create index shopping_product_normalization_changes_list_created_at_idx
  on public.shopping_product_normalization_changes (list_id, created_at desc);

create index shopping_product_normalization_changes_run_id_idx
  on public.shopping_product_normalization_changes (run_id);

alter table public.shopping_canonical_products enable row level security;
alter table public.shopping_canonical_product_aliases enable row level security;
alter table public.shopping_product_normalization_runs enable row level security;
alter table public.shopping_product_normalization_changes enable row level security;

grant select, insert, update, delete on public.shopping_canonical_products to anon;
grant select, insert, update, delete on public.shopping_canonical_product_aliases to anon;
grant select, insert, update, delete on public.shopping_product_normalization_runs to anon;
grant select, insert, update, delete on public.shopping_product_normalization_changes to anon;

create policy "Allow shared canonical product reads"
on public.shopping_canonical_products
for select
to anon
using (true);

create policy "Allow shared canonical product writes"
on public.shopping_canonical_products
for all
to anon
using (true)
with check (true);

create policy "Allow shared canonical alias reads"
on public.shopping_canonical_product_aliases
for select
to anon
using (true);

create policy "Allow shared canonical alias writes"
on public.shopping_canonical_product_aliases
for all
to anon
using (true)
with check (true);

create policy "Allow shared normalization run reads"
on public.shopping_product_normalization_runs
for select
to anon
using (true);

create policy "Allow shared normalization run writes"
on public.shopping_product_normalization_runs
for all
to anon
using (true)
with check (true);

create policy "Allow shared normalization change reads"
on public.shopping_product_normalization_changes
for select
to anon
using (true);

create policy "Allow shared normalization change writes"
on public.shopping_product_normalization_changes
for all
to anon
using (true)
with check (true);

alter table public.shopping_canonical_products replica identity full;
alter table public.shopping_canonical_product_aliases replica identity full;
alter table public.shopping_product_normalization_runs replica identity full;
alter table public.shopping_product_normalization_changes replica identity full;

alter publication supabase_realtime add table public.shopping_canonical_products;
alter publication supabase_realtime add table public.shopping_canonical_product_aliases;
alter publication supabase_realtime add table public.shopping_product_normalization_runs;
alter publication supabase_realtime add table public.shopping_product_normalization_changes;
