create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_email_not_empty check (length(btrim(email)) > 0)
);

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

grant select, insert, update on public.user_profiles to authenticated;

create policy "Users can read their own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, display_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.email), ''), 'unknown@invalid.local'),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do update
  set email = coalesce(nullif(btrim(new.email), ''), user_profiles.email),
      updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_auth_user_profile() from public;

create trigger on_auth_user_created_or_email_changed
after insert or update of email on auth.users
for each row
execute function public.handle_auth_user_profile();
