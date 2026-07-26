create table public.shopping_ticket_processing_runs (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  source text not null default 'codex',
  status text not null,
  summary text,
  tickets_processed integer not null default 0,
  lines_accepted integer not null default 0,
  lines_needing_review integer not null default 0,
  tickets_failed integer not null default 0,
  error_message text,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint shopping_ticket_processing_runs_source_check check (source in ('codex')),
  constraint shopping_ticket_processing_runs_status_check check (status in ('success', 'failed')),
  constraint shopping_ticket_processing_runs_tickets_processed_check check (tickets_processed >= 0),
  constraint shopping_ticket_processing_runs_lines_accepted_check check (lines_accepted >= 0),
  constraint shopping_ticket_processing_runs_lines_needing_review_check check (lines_needing_review >= 0),
  constraint shopping_ticket_processing_runs_tickets_failed_check check (tickets_failed >= 0),
  constraint shopping_ticket_processing_runs_error_message_length_check check (error_message is null or length(error_message) <= 500)
);

create index shopping_ticket_processing_runs_list_created_at_idx
  on public.shopping_ticket_processing_runs (list_id, created_at desc);

alter table public.shopping_ticket_processing_runs enable row level security;

grant select, insert, update, delete on public.shopping_ticket_processing_runs to anon;

create policy "Allow shared ticket processing run reads"
on public.shopping_ticket_processing_runs
for select
to anon
using (true);

create policy "Allow shared ticket processing run writes"
on public.shopping_ticket_processing_runs
for all
to anon
using (true)
with check (true);

alter table public.shopping_ticket_processing_runs replica identity full;

alter publication supabase_realtime add table public.shopping_ticket_processing_runs;
