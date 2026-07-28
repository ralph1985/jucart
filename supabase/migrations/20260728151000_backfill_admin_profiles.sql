insert into public.user_profiles (id, email, display_name, is_admin)
select
  users.id,
  users.email,
  case
    when lower(users.email) = 'rafaelgarcia1985@hotmail.com' then 'Rafa'
    when lower(users.email) = 'bego15val@gmail.com' then 'Begoña'
    else null
  end,
  lower(users.email) = 'rafaelgarcia1985@hotmail.com'
from auth.users as users
where lower(users.email) in (
  'rafaelgarcia1985@hotmail.com',
  'bego15val@gmail.com'
)
on conflict (id) do update
set email = excluded.email,
    display_name = coalesce(excluded.display_name, user_profiles.display_name),
    is_admin = excluded.is_admin,
    updated_at = now();
