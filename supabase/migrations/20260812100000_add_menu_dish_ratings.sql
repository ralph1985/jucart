alter table public.menu_dishes
  add column rating smallint;

alter table public.menu_dishes
  add constraint menu_dishes_rating_check
  check (rating is null or rating between 1 and 5);
