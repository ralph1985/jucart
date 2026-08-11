-- Complete the shared dish library with explicit, reviewable classifications.
-- The migration uses names only to keep the mapping readable; names are unique
-- within the shared library by the existing database constraint.
create temporary table menu_dish_classification (
  dish_name text primary key,
  type_name text not null,
  category_names text[] not null
) on commit drop;

insert into menu_dish_classification (dish_name, type_name, category_names)
values
  ('Arroz a la cubana', 'Principal', array['Arroz', 'Huevo', 'Tomate']),
  ('Arroz caldoso', 'Principal', array['Arroz']),
  ('Arroz con habitas tiernas y alcachofas', 'Principal', array['Arroz', 'Verduras']),
  ('Bacalao con tomate', 'Principal', array['Pescado', 'Tomate']),
  ('Berenjenas rellenas de atún', 'Principal', array['Pescado', 'Verduras']),
  ('Brochetas de gambas, cherrys, berenjenas y calabacín', 'Entrante', array['Pescado', 'Verduras']),
  ('Brócoli con tomate y huevo', 'Guarnición', array['Huevo', 'Tomate', 'Verduras']),
  ('Cerdo con verduras', 'Principal', array['Cerdo', 'Verduras']),
  ('Chuletas al horno', 'Principal', array['Carne']),
  ('Coliflor al horno', 'Guarnición', array['Verduras']),
  ('Coliflor patata bechamel y bacon', 'Guarnición', array['Cerdo', 'Verduras']),
  ('Empanada', 'Entrante', array['Entrante']),
  ('Empanadillas de espinacas y queso de cabra', 'Entrante', array['Entrante', 'Verduras']),
  ('Empanadillas de espinacas, queso y jamón', 'Entrante', array['Entrante', 'Verduras']),
  ('Ensalada de judías y patata', 'Entrante', array['Verduras']),
  ('Ensalada de lentejas', 'Entrante', array['Entrante', 'Legumbres', 'Verduras']),
  ('Ensaladilla rusa', 'Entrante', array['Entrante', 'Verduras']),
  ('Estofado de ternera con patatas', 'Principal', array['Carne', 'Guiso']),
  ('Fajitas', 'Principal', array['Carne', 'Verduras']),
  ('Filetes empanados', 'Principal', array['Carne']),
  ('Garbanzos con verduras', 'Principal', array['Legumbres', 'Verduras']),
  ('Hamburguesa de garbanzos', 'Principal', array['Legumbres']),
  ('Hervido con acelgas, etc.', 'Principal', array['Verduras']),
  ('Huevos cocidos', 'Entrante', array['Huevo']),
  ('Huevos pasados por agua', 'Desayuno', array['Huevo']),
  ('Huevos rellenos', 'Entrante', array['Huevo']),
  ('Hummus', 'Entrante', array['Entrante', 'Legumbres']),
  ('Judías', 'Guarnición', array['Verduras']),
  ('Judías verdes con patata y zanahoria', 'Guarnición', array['Verduras']),
  ('Lasaña de berenjena', 'Principal', array['Pasta', 'Tomate', 'Verduras']),
  ('Lasaña de verduras', 'Principal', array['Pasta', 'Verduras']),
  ('Macarrones con chorizo', 'Principal', array['Cerdo', 'Pasta']),
  ('Magro con tomate', 'Principal', array['Carne', 'Cerdo', 'Tomate']),
  ('Menestra de verduras', 'Guarnición', array['Verduras']),
  ('Merluza con tomate', 'Principal', array['Pescado', 'Tomate']),
  ('Moje de espárragos', 'Entrante', array['Entrante', 'Verduras']),
  ('Morcilla con queso de cabra', 'Entrante', array['Cerdo', 'Entrante']),
  ('Ñoquis', 'Principal', array['Pasta']),
  ('Pasta con crema de setas', 'Principal', array['Pasta']),
  ('Pasta con tomate, setas y pimientos', 'Principal', array['Pasta', 'Tomate', 'Verduras']),
  ('Pasta de cherry, espinacas y cebolla', 'Principal', array['Pasta', 'Tomate', 'Verduras']),
  ('Patatas con besamel de ketchup y queso y nata', 'Guarnición', array['Verduras']),
  ('Pescado al horno con patatas', 'Principal', array['Pescado']),
  ('Pimientos fritos', 'Guarnición', array['Verduras']),
  ('Pizza casera', 'Principal', array['Pasta', 'Tomate']),
  ('Poke', 'Principal', array['Arroz', 'Verduras']),
  ('Pollo al curry con leche de coco y arroz', 'Principal', array['Arroz', 'Indio', 'Pollo']),
  ('Pollo al horno con patatas', 'Principal', array['Pollo']),
  ('Pollo con salsa agridulce', 'Principal', array['Pollo', 'Verduras']),
  ('Puré de zanahoria', 'Guarnición', array['Puré', 'Verduras']),
  ('Ramen', 'Principal', array['Pasta']),
  ('Revuelto de champiñones', 'Principal', array['Huevo']),
  ('Revuelto de gulas y gambas', 'Principal', array['Huevo', 'Pescado']),
  ('Risotto', 'Principal', array['Arroz']),
  ('Romanesco', 'Guarnición', array['Verduras']),
  ('Salmón', 'Principal', array['Pescado']),
  ('Salteado de verduras', 'Guarnición', array['Verduras']),
  ('Ternera con patatas', 'Principal', array['Carne']),
  ('Tortellini a la carbonara', 'Principal', array['Pasta']),
  ('Tortilla de patata', 'Principal', array['Huevo']),
  ('Tortilla de patatas con espárragos', 'Principal', array['Huevo', 'Verduras']),
  ('Tosta de brie y bacon', 'Entrante', array['Cerdo', 'Entrante']),
  ('Tosta de jamón con tomate', 'Entrante', array['Cerdo', 'Entrante', 'Tomate']),
  ('Tosta de salmón philadelphia', 'Entrante', array['Entrante', 'Pescado']),
  ('Zarangollo murciano', 'Entrante', array['Huevo', 'Verduras']);

do $$
declare
  v_library_id uuid;
  v_dish_id uuid;
  v_type_id uuid;
  v_category_id uuid;
  classification record;
  category_name text;
  category_position integer;
begin
  select libraries.id
  into v_library_id
  from public.menu_dish_libraries libraries
  order by libraries.created_at
  limit 1;

  if v_library_id is null then
    raise exception 'No shared menu dish library found';
  end if;

  for classification in select * from menu_dish_classification loop
    select dishes.id
    into v_dish_id
    from public.menu_dishes dishes
    where dishes.library_id = v_library_id
      and lower(dishes.name) = lower(classification.dish_name);

    if v_dish_id is null then
      raise exception 'Dish not found in shared library: %', classification.dish_name;
    end if;

    select types.id
    into v_type_id
    from public.menu_dish_types types
    where types.library_id = v_library_id
      and lower(types.name) = lower(classification.type_name);

    if v_type_id is null then
      raise exception 'Dish type not found in shared library: %', classification.type_name;
    end if;

    update public.menu_dishes
    set dish_type_id = v_type_id
    where id = v_dish_id;

    delete from public.menu_dish_category_links
    where menu_dish_category_links.dish_id = v_dish_id;

    category_position := 0;
    foreach category_name in array classification.category_names loop
      select categories.id
      into v_category_id
      from public.menu_dish_categories categories
      where categories.library_id = v_library_id
        and lower(categories.name) = lower(category_name);

      if v_category_id is null then
        raise exception 'Dish category not found in shared library: %', category_name;
      end if;

      insert into public.menu_dish_category_links (dish_id, category_id, position)
      values (v_dish_id, v_category_id, category_position);

      category_position := category_position + 1;
    end loop;
  end loop;
end;
$$;
