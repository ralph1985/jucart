create or replace function public.register_push_subscription(
  p_list_id uuid,
  p_client_id text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_subscriptions (
    list_id,
    client_id,
    endpoint,
    p256dh,
    auth,
    user_agent,
    last_seen_at,
    disabled_at
  )
  values (
    p_list_id,
    p_client_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    coalesce(p_user_agent, ''),
    now(),
    null
  )
  on conflict (endpoint) do update
  set
    list_id = excluded.list_id,
    client_id = excluded.client_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    last_seen_at = excluded.last_seen_at,
    disabled_at = null;

  return true;
end;
$$;

create or replace function public.disable_push_subscription(p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_subscriptions
  set disabled_at = now()
  where endpoint = p_endpoint;

  return true;
end;
$$;

revoke all on function public.register_push_subscription(
  uuid,
  text,
  text,
  text,
  text,
  text
) from public;
revoke all on function public.disable_push_subscription(text) from public;

grant execute on function public.register_push_subscription(
  uuid,
  text,
  text,
  text,
  text,
  text
) to anon;
grant execute on function public.disable_push_subscription(text) to anon;
