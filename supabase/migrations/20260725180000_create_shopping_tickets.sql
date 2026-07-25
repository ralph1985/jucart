insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shopping-tickets',
  'shopping-tickets',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.shopping_tickets (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  section_id text not null,
  uploaded_by text not null,
  status text not null default 'pending',
  file_count integer not null default 0,
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_tickets_section_id_not_empty check (length(btrim(section_id)) > 0),
  constraint shopping_tickets_uploaded_by_check check (uploaded_by in ('rafa', 'begona')),
  constraint shopping_tickets_status_check check (status in ('pending', 'processing', 'processed', 'needs_review', 'failed')),
  constraint shopping_tickets_file_count_check check (file_count >= 0),
  constraint shopping_tickets_error_message_length_check check (error_message is null or length(error_message) <= 500)
);

create index shopping_tickets_list_uploaded_at_idx
  on public.shopping_tickets (list_id, uploaded_at desc);

create index shopping_tickets_list_status_uploaded_at_idx
  on public.shopping_tickets (list_id, status, uploaded_at desc);

create trigger shopping_tickets_set_updated_at
before update on public.shopping_tickets
for each row
execute function public.set_updated_at();

create table public.shopping_ticket_files (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.shopping_tickets(id) on delete cascade,
  list_id uuid not null,
  storage_bucket text not null default 'shopping-tickets',
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null,
  sha256 text not null,
  position integer not null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint shopping_ticket_files_bucket_check check (storage_bucket = 'shopping-tickets'),
  constraint shopping_ticket_files_storage_path_not_empty check (length(btrim(storage_path)) > 0),
  constraint shopping_ticket_files_file_name_not_empty check (length(btrim(file_name)) > 0),
  constraint shopping_ticket_files_content_type_not_empty check (length(btrim(content_type)) > 0),
  constraint shopping_ticket_files_size_bytes_check check (size_bytes > 0),
  constraint shopping_ticket_files_sha256_check check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint shopping_ticket_files_position_check check (position >= 0)
);

create unique index shopping_ticket_files_storage_bucket_path_key
  on public.shopping_ticket_files (storage_bucket, storage_path);

create unique index shopping_ticket_files_ticket_position_key
  on public.shopping_ticket_files (ticket_id, position);

create index shopping_ticket_files_list_ticket_id_idx
  on public.shopping_ticket_files (list_id, ticket_id);

create table public.shopping_ticket_lines (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.shopping_tickets(id) on delete cascade,
  list_id uuid not null,
  line_index integer not null,
  raw_text text,
  product_name text,
  canonical_product_id uuid references public.shopping_canonical_products(id) on update cascade on delete set null,
  quantity text,
  unit_price numeric(12, 4),
  total_price numeric(12, 2),
  original_total_price numeric(12, 2),
  discount_total numeric(12, 2),
  status text not null default 'processed',
  needs_review boolean not null default false,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_ticket_lines_line_index_check check (line_index >= 0),
  constraint shopping_ticket_lines_status_check check (status in ('processed', 'needs_review', 'excluded')),
  constraint shopping_ticket_lines_unit_price_check check (unit_price is null or unit_price >= 0),
  constraint shopping_ticket_lines_total_price_check check (total_price is null or total_price >= 0),
  constraint shopping_ticket_lines_original_total_price_check check (original_total_price is null or original_total_price >= 0),
  constraint shopping_ticket_lines_discount_total_check check (discount_total is null or discount_total >= 0)
);

create unique index shopping_ticket_lines_ticket_line_index_key
  on public.shopping_ticket_lines (ticket_id, line_index);

create index shopping_ticket_lines_list_ticket_id_idx
  on public.shopping_ticket_lines (list_id, ticket_id);

create index shopping_ticket_lines_list_canonical_product_id_idx
  on public.shopping_ticket_lines (list_id, canonical_product_id);

create trigger shopping_ticket_lines_set_updated_at
before update on public.shopping_ticket_lines
for each row
execute function public.set_updated_at();

alter table public.shopping_tickets enable row level security;
alter table public.shopping_ticket_files enable row level security;
alter table public.shopping_ticket_lines enable row level security;

grant select, insert, update on public.shopping_tickets to anon;
grant select, insert, update on public.shopping_ticket_files to anon;
grant select, insert, update on public.shopping_ticket_lines to anon;

create policy "Allow shared ticket reads"
on public.shopping_tickets
for select
to anon
using (true);

create policy "Allow shared ticket writes"
on public.shopping_tickets
for insert
to anon
with check (true);

create policy "Allow shared ticket updates"
on public.shopping_tickets
for update
to anon
using (true)
with check (true);

create policy "Allow shared ticket file reads"
on public.shopping_ticket_files
for select
to anon
using (true);

create policy "Allow shared ticket file writes"
on public.shopping_ticket_files
for insert
to anon
with check (true);

create policy "Allow shared ticket file updates"
on public.shopping_ticket_files
for update
to anon
using (true)
with check (true);

create policy "Allow shared ticket line reads"
on public.shopping_ticket_lines
for select
to anon
using (true);

create policy "Allow shared ticket line writes"
on public.shopping_ticket_lines
for insert
to anon
with check (true);

create policy "Allow shared ticket line updates"
on public.shopping_ticket_lines
for update
to anon
using (true)
with check (true);

create policy "Allow shared ticket object reads"
on storage.objects
for select
to anon
using (bucket_id = 'shopping-tickets');

create policy "Allow shared ticket object uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'shopping-tickets');

create policy "Allow shared ticket object updates"
on storage.objects
for update
to anon
using (bucket_id = 'shopping-tickets')
with check (bucket_id = 'shopping-tickets');

alter table public.shopping_tickets replica identity full;
alter table public.shopping_ticket_files replica identity full;
alter table public.shopping_ticket_lines replica identity full;

alter publication supabase_realtime add table public.shopping_tickets;
alter publication supabase_realtime add table public.shopping_ticket_files;
alter publication supabase_realtime add table public.shopping_ticket_lines;
