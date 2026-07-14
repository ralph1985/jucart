alter table public.shopping_items
  add column category_id text not null default 'other';

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
      'cleaning',
      'hygiene',
      'pharmacy',
      'pets',
      'other'
    )
  );

update public.shopping_items
set category_id = case
  when lower(name) in ('leche', 'yogur', 'queso', 'huevos', 'mantequilla') then 'dairy'
  when lower(name) in ('pan', 'pan integral', 'barra') then 'bakery'
  when lower(name) in ('manzana', 'naranja', 'pera', 'plátano', 'platano', 'uvas') then 'fruit'
  when lower(name) in ('tomate', 'lechuga', 'cebolla', 'patata', 'zanahoria') then 'vegetables'
  when lower(name) in ('pollo', 'carne', 'ternera', 'cerdo') then 'meat'
  when lower(name) in ('pescado', 'salmón', 'salmon', 'merluza', 'atún', 'atun') then 'fish'
  when lower(name) in ('agua', 'zumo', 'cerveza', 'vino', 'refresco') then 'drinks'
  when lower(name) in ('detergente', 'lejía', 'lejia', 'lavavajillas') then 'cleaning'
  when lower(name) in ('gel', 'champú', 'champu', 'papel higiénico', 'papel higienico') then 'hygiene'
  else 'other'
end;
