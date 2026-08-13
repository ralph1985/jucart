alter table public.menu_dishes
  add column description text,
  add column comment text;

alter table public.menu_dishes
  add constraint menu_dishes_description_length_check
  check (description is null or length(description) <= 1000),
  add constraint menu_dishes_comment_length_check
  check (comment is null or length(comment) <= 1000);
