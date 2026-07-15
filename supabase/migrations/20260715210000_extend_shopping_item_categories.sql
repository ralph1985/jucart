alter table public.shopping_items
  drop constraint if exists shopping_items_category_id_check;

alter table public.shopping_items
  add constraint shopping_items_category_id_check check (
    category_id in (
      'fruit',
      'vegetables',
      'meat',
      'fish',
      'dairy',
      'bakery',
      'pantry',
      'drinks',
      'frozen',
      'prepared',
      'cleaning',
      'household',
      'baby',
      'hygiene',
      'pharmacy',
      'pets',
      'other'
    )
  );

update public.shopping_items
set category_id = case
  when lower(name) in ('vasos de cristal') then 'household'
  when lower(name) in ('compresas maternidad o bragas de incontinencia') then 'baby'
  when lower(name) in ('guacamole') then 'prepared'
  when lower(name) in ('kiwis') then 'fruit'
  when lower(name) in ('salsa de soja') then 'pantry'
  when lower(name) in ('peine irati') then 'hygiene'
  else category_id
end
where lower(name) in (
  'vasos de cristal',
  'compresas maternidad o bragas de incontinencia',
  'guacamole',
  'kiwis',
  'salsa de soja',
  'peine irati'
);
