alter table public.remote_actions
  drop constraint remote_actions_action_check;

alter table public.remote_actions
  add constraint remote_actions_action_check check (
    action in (
      'supabase_backup',
      'recategorize_products',
      'normalize_products',
      'process_tickets',
      'update_external_prices'
    )
  );
