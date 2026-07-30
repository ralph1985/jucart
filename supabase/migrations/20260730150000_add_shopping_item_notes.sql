alter table public.shopping_items
  add column notes text;

alter table public.shopping_items
  add constraint shopping_items_notes_length_check
  check (notes is null or length(notes) <= 1000);
