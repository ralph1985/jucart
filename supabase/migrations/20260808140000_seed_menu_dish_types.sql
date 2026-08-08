insert into public.menu_dish_types (scope_list_id, name, position)
select shopping_lists.id, dish_types.name, dish_types.position
from public.shopping_lists
cross join (
  values
    ('Desayuno', 0), ('Comida', 1), ('Cena', 2), ('Entrante', 3),
    ('Principal', 4), ('Guarnición', 5), ('Postre', 6), ('Bebida', 7),
    ('Snack', 8), ('Otro', 9)
) as dish_types(name, position)
on conflict (scope_list_id, lower(name)) do nothing;
