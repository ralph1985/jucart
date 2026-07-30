create table public.remote_actions (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('supabase_backup')),
  status text not null default 'pending' check (
    status in ('pending', 'running', 'completed', 'failed')
  ),
  requested_by uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  result_summary text,
  error_message text,
  agent_id text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  lease_expires_at timestamptz,
  client_request_id text not null,
  constraint remote_actions_client_request_id_key unique (client_request_id),
  constraint remote_actions_payload_object check (jsonb_typeof(payload) = 'object')
);

create index remote_actions_requested_by_created_at_idx
  on public.remote_actions (requested_by, created_at desc);

create index remote_actions_pending_idx
  on public.remote_actions (status, created_at)
  where status = 'pending';

alter table public.remote_actions enable row level security;

grant select on public.remote_actions to authenticated;

create policy "Users can read their remote actions"
on public.remote_actions
for select
to authenticated
using (requested_by = auth.uid());

alter publication supabase_realtime add table public.remote_actions;

create or replace function public.claim_remote_action(
  p_agent_id text,
  p_lease_seconds integer default 120
)
returns setof public.remote_actions
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.remote_actions;
begin
  if nullif(trim(p_agent_id), '') is null then
    raise exception 'agent_id_required';
  end if;

  if p_lease_seconds < 30 or p_lease_seconds > 900 then
    raise exception 'invalid_lease_seconds';
  end if;

  update public.remote_actions
  set status = 'pending',
      agent_id = null,
      started_at = null,
      lease_expires_at = null
  where status = 'running'
    and lease_expires_at < now();

  update public.remote_actions
  set status = 'running',
      agent_id = trim(p_agent_id),
      started_at = coalesce(started_at, now()),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds)
  where id = (
    select id
    from public.remote_actions
    where status = 'pending'
    order by created_at
    for update skip locked
    limit 1
  )
  returning * into claimed;

  if claimed.id is not null then
    return next claimed;
  end if;

  return;
end;
$$;

create or replace function public.complete_remote_action(
  p_action_id uuid,
  p_agent_id text,
  p_status text,
  p_result_summary text default null,
  p_error_message text default null
)
returns public.remote_actions
language plpgsql
security definer
set search_path = public
as $$
declare
  completed public.remote_actions;
begin
  if p_status not in ('completed', 'failed') then
    raise exception 'invalid_completion_status';
  end if;

  update public.remote_actions
  set status = p_status,
      result_summary = nullif(trim(p_result_summary), ''),
      error_message = nullif(trim(p_error_message), ''),
      finished_at = now(),
      lease_expires_at = null
  where id = p_action_id
    and status = 'running'
    and agent_id = trim(p_agent_id)
  returning * into completed;

  if completed.id is null then
    raise exception 'remote_action_not_owned';
  end if;

  return completed;
end;
$$;

revoke all on function public.claim_remote_action(text, integer) from public, anon, authenticated;
revoke all on function public.complete_remote_action(uuid, text, text, text, text) from public, anon, authenticated;
