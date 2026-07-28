-- The application now requires a password session before loading private data.
-- Keep the database boundary aligned with that rule instead of relying only on
-- the login screen in the client.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'shopping_items',
    'shopping_sections',
    'shopping_history_events',
    'freezer_items',
    'shopping_recategorization_runs',
    'shopping_recategorization_changes',
    'shopping_canonical_products',
    'shopping_canonical_product_aliases',
    'shopping_product_normalization_runs',
    'shopping_product_normalization_changes',
    'shopping_tickets',
    'shopping_ticket_files',
    'shopping_ticket_lines',
    'shopping_ticket_processing_runs',
    'shopping_price_observations'
  ]
  loop
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('drop policy if exists "Authenticated list access" on public.%I', table_name);
    execute format(
      'create policy "Authenticated list access" on public.%I for all to authenticated using (public.is_shopping_list_member(list_id)) with check (public.is_shopping_list_member(list_id))',
      table_name
    );
  end loop;
end;
$$;

revoke all on table public.developer_backup_runs from anon;
grant select on table public.developer_backup_runs to authenticated;

revoke all on table public.shopping_categories from anon;
revoke all on table public.shopping_product_catalog_entries from anon;
grant select, insert, update, delete on table public.shopping_categories to authenticated;
grant select, insert, update, delete on table public.shopping_product_catalog_entries to authenticated;

revoke all on table public.push_subscriptions from anon;
revoke execute on function public.register_push_subscription(
  uuid,
  text,
  text,
  text,
  text,
  text
) from anon;
revoke execute on function public.disable_push_subscription(text) from anon;
grant execute on function public.register_push_subscription(
  uuid,
  text,
  text,
  text,
  text,
  text
) to authenticated;
grant execute on function public.disable_push_subscription(text) to authenticated;

revoke all on storage.objects from anon;
grant select, insert, update on storage.objects to authenticated;

drop policy if exists "Authenticated ticket object reads" on storage.objects;
create policy "Authenticated ticket object reads"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'shopping-tickets'
  and public.is_shopping_list_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Authenticated ticket object uploads" on storage.objects;
create policy "Authenticated ticket object uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'shopping-tickets'
  and public.is_shopping_list_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Authenticated ticket object updates" on storage.objects;
create policy "Authenticated ticket object updates"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'shopping-tickets'
  and public.is_shopping_list_member((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'shopping-tickets'
  and public.is_shopping_list_member((storage.foldername(name))[1]::uuid)
);
