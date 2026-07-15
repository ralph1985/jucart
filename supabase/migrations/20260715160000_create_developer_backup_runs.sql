create table public.developer_backup_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  status text not null,
  file_name text,
  file_size_bytes bigint,
  sha256 text,
  duration_ms integer not null,
  retained_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  constraint developer_backup_runs_status_check check (status in ('success', 'failed')),
  constraint developer_backup_runs_file_size_check check (
    file_size_bytes is null or file_size_bytes >= 0
  ),
  constraint developer_backup_runs_duration_check check (duration_ms >= 0),
  constraint developer_backup_runs_retained_count_check check (retained_count >= 0),
  constraint developer_backup_runs_sha256_check check (
    sha256 is null or sha256 ~ '^[a-f0-9]{64}$'
  )
);

create index developer_backup_runs_created_at_idx
  on public.developer_backup_runs (created_at desc);

alter table public.developer_backup_runs enable row level security;

grant select on public.developer_backup_runs to anon;

create policy "Allow developer backup metadata reads"
on public.developer_backup_runs
for select
to anon
using (true);
