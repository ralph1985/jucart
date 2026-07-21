create table public.shopping_recategorization_runs (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  source text not null default 'codex',
  status text not null default 'success',
  summary text,
  catalog_entries_added integer not null default 0,
  items_recategorized integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint shopping_recategorization_runs_source_check check (source in ('codex')),
  constraint shopping_recategorization_runs_status_check check (status in ('success', 'failed')),
  constraint shopping_recategorization_runs_catalog_entries_added_check check (catalog_entries_added >= 0),
  constraint shopping_recategorization_runs_items_recategorized_check check (items_recategorized >= 0)
);

create table public.shopping_recategorization_changes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.shopping_recategorization_runs(id) on delete cascade,
  list_id uuid not null,
  item_id text not null,
  item_name text not null,
  previous_category_id text not null references public.shopping_categories(id) on update cascade on delete restrict,
  next_category_id text not null references public.shopping_categories(id) on update cascade on delete restrict,
  reason text,
  catalog_entry_id text references public.shopping_product_catalog_entries(id) on update cascade on delete set null,
  created_at timestamptz not null default now()
);

create index shopping_recategorization_runs_list_created_at_idx
  on public.shopping_recategorization_runs (list_id, created_at desc);

create index shopping_recategorization_changes_list_created_at_idx
  on public.shopping_recategorization_changes (list_id, created_at desc);

create index shopping_recategorization_changes_run_id_idx
  on public.shopping_recategorization_changes (run_id);

alter table public.shopping_recategorization_runs enable row level security;
alter table public.shopping_recategorization_changes enable row level security;

grant select, insert, update, delete on public.shopping_recategorization_runs to anon;
grant select, insert, update, delete on public.shopping_recategorization_changes to anon;

create policy "Allow shared recategorization run reads"
on public.shopping_recategorization_runs
for select
to anon
using (true);

create policy "Allow shared recategorization run writes"
on public.shopping_recategorization_runs
for all
to anon
using (true)
with check (true);

create policy "Allow shared recategorization change reads"
on public.shopping_recategorization_changes
for select
to anon
using (true);

create policy "Allow shared recategorization change writes"
on public.shopping_recategorization_changes
for all
to anon
using (true)
with check (true);

alter table public.shopping_recategorization_runs replica identity full;
alter table public.shopping_recategorization_changes replica identity full;

alter publication supabase_realtime add table public.shopping_recategorization_runs;
alter publication supabase_realtime add table public.shopping_recategorization_changes;
