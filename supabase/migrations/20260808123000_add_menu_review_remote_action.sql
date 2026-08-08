alter table public.remote_actions
  drop constraint remote_actions_action_check;

alter table public.remote_actions
  add constraint remote_actions_action_check check (
    action in (
      'supabase_backup',
      'recategorize_products',
      'normalize_products',
      'process_tickets',
      'update_external_prices',
      'review_menu_plan'
    )
  );

create unique index menu_plan_proposals_request_id_idx
  on public.menu_plan_proposals (request_id)
  where request_id is not null;
