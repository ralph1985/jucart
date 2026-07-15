update public.shopping_items
set category_id = 'baby'
where lower(name) in ('pañales', 'panales')
  and category_id <> 'baby';
