alter table public.user_profiles
  add column is_admin boolean not null default false;

update public.user_profiles
set is_admin = lower(email) = 'rafaelgarcia1985@hotmail.com';

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and is_admin
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists "Allow developer backup metadata reads"
on public.developer_backup_runs;

create policy "Administrators can read developer backup metadata"
on public.developer_backup_runs
for select
to authenticated
using (public.is_current_user_admin());
