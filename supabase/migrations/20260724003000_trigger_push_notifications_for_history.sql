create extension if not exists pg_net;

create or replace function public.notify_push_subscribers_for_history_event()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  function_url text := 'https://punfgsjnguvqyyetjiar.supabase.co/functions/v1/send-push-notification';
  trigger_secret text;
begin
  if new.event_type not in ('added', 'purchased', 'unpurchased', 'moved', 'deleted') then
    return new;
  end if;

  select decrypted_secret
  into trigger_secret
  from vault.decrypted_secrets
  where name = 'jucart_push_trigger_secret'
  limit 1;

  if trigger_secret is null or length(btrim(trigger_secret)) = 0 then
    raise warning 'Missing Vault secret jucart_push_trigger_secret; push notification skipped.';
    return new;
  end if;

  perform net.http_post(
    url := function_url,
    body := jsonb_build_object(
      'list_id', new.list_id,
      'origin_client_id', new.client_id,
      'title', 'Cambios en Jucart',
      'body', 'Hay cambios nuevos en la lista',
      'url', '/'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-jucart-push-secret', trigger_secret
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke all on function public.notify_push_subscribers_for_history_event() from public;
revoke all on function public.notify_push_subscribers_for_history_event() from anon;
revoke all on function public.notify_push_subscribers_for_history_event() from authenticated;

drop trigger if exists shopping_history_events_notify_push_subscribers
on public.shopping_history_events;

create trigger shopping_history_events_notify_push_subscribers
after insert on public.shopping_history_events
for each row
execute function public.notify_push_subscribers_for_history_event();
