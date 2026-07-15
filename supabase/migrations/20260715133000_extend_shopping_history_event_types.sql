alter table public.shopping_history_events
  add column if not exists previous_item_snapshot jsonb;

alter table public.shopping_history_events
  drop constraint if exists shopping_history_events_type_check;

alter table public.shopping_history_events
  add constraint shopping_history_events_type_check check (
    event_type in ('initial', 'added', 'purchased', 'unpurchased', 'moved', 'deleted')
  );

alter table public.shopping_history_events
  drop constraint if exists shopping_history_events_previous_item_snapshot_object;

alter table public.shopping_history_events
  add constraint shopping_history_events_previous_item_snapshot_object check (
    previous_item_snapshot is null or jsonb_typeof(previous_item_snapshot) = 'object'
  );
