alter table public.shopping_price_observations
  add column external_provider text,
  add column external_product_id text,
  add column external_product_url text;

alter table public.shopping_price_observations
  add constraint shopping_price_observations_external_source_check check (
    source <> 'external' or external_provider is not null
  ),
  add constraint shopping_price_observations_external_provider_not_empty check (
    external_provider is null or length(btrim(external_provider)) > 0
  ),
  add constraint shopping_price_observations_external_product_id_not_empty check (
    external_product_id is null or length(btrim(external_product_id)) > 0
  ),
  add constraint shopping_price_observations_external_product_url_not_empty check (
    external_product_url is null or length(btrim(external_product_url)) > 0
  );

create index shopping_price_observations_external_latest_idx
  on public.shopping_price_observations (
    list_id,
    external_provider,
    canonical_product_id,
    comparison_unit,
    observed_at desc
  )
  where source = 'external';
