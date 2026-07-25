create table public.shopping_price_observations (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  source text not null default 'ticket',
  ticket_id uuid references public.shopping_tickets(id) on update cascade on delete cascade,
  ticket_line_id uuid references public.shopping_ticket_lines(id) on update cascade on delete cascade,
  canonical_product_id uuid not null references public.shopping_canonical_products(id) on update cascade on delete cascade,
  section_id text not null,
  observed_at timestamptz not null,
  product_name text,
  quantity text,
  comparison_unit text not null,
  price_kind text not null,
  observed_price numeric(12, 4) not null,
  unit_price numeric(12, 4),
  total_price numeric(12, 2),
  original_total_price numeric(12, 2),
  discount_total numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_price_observations_source_check check (source in ('ticket', 'external')),
  constraint shopping_price_observations_ticket_source_check check (
    source <> 'ticket' or (ticket_id is not null and ticket_line_id is not null)
  ),
  constraint shopping_price_observations_section_id_not_empty check (length(btrim(section_id)) > 0),
  constraint shopping_price_observations_comparison_unit_check check (comparison_unit in ('kg', 'l', 'unit')),
  constraint shopping_price_observations_price_kind_check check (price_kind in ('unit', 'total')),
  constraint shopping_price_observations_observed_price_check check (observed_price >= 0),
  constraint shopping_price_observations_unit_price_check check (unit_price is null or unit_price >= 0),
  constraint shopping_price_observations_total_price_check check (total_price is null or total_price >= 0),
  constraint shopping_price_observations_original_total_price_check check (original_total_price is null or original_total_price >= 0),
  constraint shopping_price_observations_discount_total_check check (discount_total is null or discount_total >= 0)
);

create unique index shopping_price_observations_ticket_line_key
  on public.shopping_price_observations (ticket_line_id);

create index shopping_price_observations_list_product_observed_at_idx
  on public.shopping_price_observations (list_id, canonical_product_id, observed_at desc);

create index shopping_price_observations_list_section_product_observed_at_idx
  on public.shopping_price_observations (list_id, section_id, canonical_product_id, observed_at desc);

create index shopping_price_observations_list_source_observed_at_idx
  on public.shopping_price_observations (list_id, source, observed_at desc);

create trigger shopping_price_observations_set_updated_at
before update on public.shopping_price_observations
for each row
execute function public.set_updated_at();

insert into public.shopping_price_observations (
  list_id,
  source,
  ticket_id,
  ticket_line_id,
  canonical_product_id,
  section_id,
  observed_at,
  product_name,
  quantity,
  comparison_unit,
  price_kind,
  observed_price,
  unit_price,
  total_price,
  original_total_price,
  discount_total
)
select
  ticket_lines.list_id,
  'ticket',
  ticket_lines.ticket_id,
  ticket_lines.id,
  ticket_lines.canonical_product_id,
  tickets.section_id,
  coalesce(tickets.processed_at, tickets.uploaded_at),
  ticket_lines.product_name,
  ticket_lines.quantity,
  canonical_products.comparison_unit,
  case when ticket_lines.unit_price is not null then 'unit' else 'total' end,
  case
    when ticket_lines.unit_price is not null
      and ticket_lines.original_total_price is not null
      and ticket_lines.total_price is not null
      and ticket_lines.total_price > 0
      then round((ticket_lines.unit_price * ticket_lines.original_total_price / ticket_lines.total_price)::numeric, 4)
    when ticket_lines.unit_price is not null
      then ticket_lines.unit_price
    else coalesce(ticket_lines.original_total_price, ticket_lines.total_price)
  end,
  ticket_lines.unit_price,
  ticket_lines.total_price,
  ticket_lines.original_total_price,
  ticket_lines.discount_total
from public.shopping_ticket_lines ticket_lines
join public.shopping_tickets tickets on tickets.id = ticket_lines.ticket_id
join public.shopping_canonical_products canonical_products on canonical_products.id = ticket_lines.canonical_product_id
where ticket_lines.status = 'processed'
  and ticket_lines.needs_review = false
  and ticket_lines.canonical_product_id is not null
  and coalesce(ticket_lines.unit_price, ticket_lines.original_total_price, ticket_lines.total_price) is not null
on conflict (ticket_line_id) do nothing;

alter table public.shopping_price_observations enable row level security;

grant select, insert, update on public.shopping_price_observations to anon;

create policy "Allow shared price observation reads"
on public.shopping_price_observations
for select
to anon
using (true);

create policy "Allow shared price observation writes"
on public.shopping_price_observations
for insert
to anon
with check (true);

create policy "Allow shared price observation updates"
on public.shopping_price_observations
for update
to anon
using (true)
with check (true);

alter table public.shopping_price_observations replica identity full;

alter publication supabase_realtime add table public.shopping_price_observations;
