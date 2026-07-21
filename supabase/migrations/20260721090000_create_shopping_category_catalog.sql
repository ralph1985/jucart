create table public.shopping_categories (
  id text primary key,
  name text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_product_catalog_entries (
  id text primary key,
  category_id text not null references public.shopping_categories(id) on update cascade on delete restrict,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, normalized_name)
);

insert into public.shopping_categories (id, name, position) values
  ('fruit', 'Fruta', 0),
  ('vegetables', 'Verdura', 1),
  ('meat', 'Carne', 2),
  ('fish', 'Pescado', 3),
  ('dairy', 'Lácteos', 4),
  ('bakery', 'Panadería', 5),
  ('pantry', 'Despensa', 6),
  ('drinks', 'Bebidas', 7),
  ('frozen', 'Congelados', 8),
  ('prepared', 'Preparados', 9),
  ('cleaning', 'Limpieza', 10),
  ('household', 'Hogar', 11),
  ('baby', 'Bebé', 12),
  ('hygiene', 'Higiene', 13),
  ('pharmacy', 'Farmacia', 14),
  ('pets', 'Mascotas', 15),
  ('other', 'Otros', 16)
on conflict (id) do update set
  name = excluded.name,
  position = excluded.position,
  updated_at = now();

insert into public.shopping_product_catalog_entries (id, category_id, name, normalized_name) values
  ('fruit-aguacate', 'fruit', 'aguacate', 'aguacate'),
  ('fruit-aguacates', 'fruit', 'aguacates', 'aguacates'),
  ('fruit-fresa', 'fruit', 'fresa', 'fresa'),
  ('fruit-fruta', 'fruit', 'fruta', 'fruta'),
  ('fruit-kiwi', 'fruit', 'kiwi', 'kiwi'),
  ('fruit-kiwis', 'fruit', 'kiwis', 'kiwis'),
  ('fruit-limon', 'fruit', 'limón', 'limon'),
  ('fruit-mandarina', 'fruit', 'mandarina', 'mandarina'),
  ('fruit-manzana', 'fruit', 'manzana', 'manzana'),
  ('fruit-manzanas', 'fruit', 'manzanas', 'manzanas'),
  ('fruit-melocoton', 'fruit', 'melocotón', 'melocoton'),
  ('fruit-naranja', 'fruit', 'naranja', 'naranja'),
  ('fruit-pera', 'fruit', 'pera', 'pera'),
  ('fruit-platano', 'fruit', 'plátano', 'platano'),
  ('fruit-platanos', 'fruit', 'plátanos', 'platanos'),
  ('fruit-sandia', 'fruit', 'sandía', 'sandia'),
  ('fruit-uvas', 'fruit', 'uvas', 'uvas'),
  ('vegetables-ajo', 'vegetables', 'ajo', 'ajo'),
  ('vegetables-berenjena', 'vegetables', 'berenjena', 'berenjena'),
  ('vegetables-calabacin', 'vegetables', 'calabacín', 'calabacin'),
  ('vegetables-cebolla', 'vegetables', 'cebolla', 'cebolla'),
  ('vegetables-cebollas', 'vegetables', 'cebollas', 'cebollas'),
  ('vegetables-lechuga', 'vegetables', 'lechuga', 'lechuga'),
  ('vegetables-patata', 'vegetables', 'patata', 'patata'),
  ('vegetables-pepino', 'vegetables', 'pepino', 'pepino'),
  ('vegetables-pimiento', 'vegetables', 'pimiento', 'pimiento'),
  ('vegetables-repollo', 'vegetables', 'repollo', 'repollo'),
  ('vegetables-tomate', 'vegetables', 'tomate', 'tomate'),
  ('vegetables-verdura', 'vegetables', 'verdura', 'verdura'),
  ('vegetables-zanahoria', 'vegetables', 'zanahoria', 'zanahoria'),
  ('meat-carne', 'meat', 'carne', 'carne'),
  ('meat-cerdo', 'meat', 'cerdo', 'cerdo'),
  ('meat-chorizo', 'meat', 'chorizo', 'chorizo'),
  ('meat-jamon', 'meat', 'jamón', 'jamon'),
  ('meat-lomo', 'meat', 'lomo', 'lomo'),
  ('meat-pollo', 'meat', 'pollo', 'pollo'),
  ('meat-ternera', 'meat', 'ternera', 'ternera'),
  ('fish-atun', 'fish', 'atún', 'atun'),
  ('fish-bacalao', 'fish', 'bacalao', 'bacalao'),
  ('fish-gambas', 'fish', 'gambas', 'gambas'),
  ('fish-merluza', 'fish', 'merluza', 'merluza'),
  ('fish-pescado', 'fish', 'pescado', 'pescado'),
  ('fish-salmon', 'fish', 'salmón', 'salmon'),
  ('dairy-huevos', 'dairy', 'huevos', 'huevos'),
  ('dairy-leche', 'dairy', 'leche', 'leche'),
  ('dairy-mantequilla', 'dairy', 'mantequilla', 'mantequilla'),
  ('dairy-queso', 'dairy', 'queso', 'queso'),
  ('dairy-yogur', 'dairy', 'yogur', 'yogur'),
  ('bakery-barra', 'bakery', 'barra', 'barra'),
  ('bakery-bollos', 'bakery', 'bollos', 'bollos'),
  ('bakery-croissant', 'bakery', 'croissant', 'croissant'),
  ('bakery-pan', 'bakery', 'pan', 'pan'),
  ('bakery-pan-integral', 'bakery', 'pan integral', 'pan integral'),
  ('pantry-aceite', 'pantry', 'aceite', 'aceite'),
  ('pantry-arroz', 'pantry', 'arroz', 'arroz'),
  ('pantry-azucar', 'pantry', 'azúcar', 'azucar'),
  ('pantry-cafe', 'pantry', 'café', 'cafe'),
  ('pantry-cereales', 'pantry', 'cereales', 'cereales'),
  ('pantry-galletas', 'pantry', 'galletas', 'galletas'),
  ('pantry-garbanzos', 'pantry', 'garbanzos', 'garbanzos'),
  ('pantry-harina', 'pantry', 'harina', 'harina'),
  ('pantry-lentejas', 'pantry', 'lentejas', 'lentejas'),
  ('pantry-pasta', 'pantry', 'pasta', 'pasta'),
  ('pantry-sal', 'pantry', 'sal', 'sal'),
  ('pantry-salsa-de-soja', 'pantry', 'salsa de soja', 'salsa de soja'),
  ('pantry-soja', 'pantry', 'soja', 'soja'),
  ('pantry-especias', 'pantry', 'especias', 'especias'),
  ('pantry-tomate-frito', 'pantry', 'tomate frito', 'tomate frito'),
  ('drinks-agua', 'drinks', 'agua', 'agua'),
  ('drinks-cerveza', 'drinks', 'cerveza', 'cerveza'),
  ('drinks-refresco', 'drinks', 'refresco', 'refresco'),
  ('drinks-vino', 'drinks', 'vino', 'vino'),
  ('drinks-zumo', 'drinks', 'zumo', 'zumo'),
  ('frozen-congelado', 'frozen', 'congelado', 'congelado'),
  ('frozen-croquetas', 'frozen', 'croquetas', 'croquetas'),
  ('frozen-helado', 'frozen', 'helado', 'helado'),
  ('frozen-helados', 'frozen', 'helados', 'helados'),
  ('frozen-pizza', 'frozen', 'pizza', 'pizza'),
  ('prepared-ensaladilla', 'prepared', 'ensaladilla', 'ensaladilla'),
  ('prepared-gazpacho', 'prepared', 'gazpacho', 'gazpacho'),
  ('prepared-guacamole', 'prepared', 'guacamole', 'guacamole'),
  ('prepared-hummus', 'prepared', 'hummus', 'hummus'),
  ('prepared-salmorejo', 'prepared', 'salmorejo', 'salmorejo'),
  ('prepared-tortilla-preparada', 'prepared', 'tortilla preparada', 'tortilla preparada'),
  ('cleaning-detergente', 'cleaning', 'detergente', 'detergente'),
  ('cleaning-fregasuelos', 'cleaning', 'fregasuelos', 'fregasuelos'),
  ('cleaning-lavavajillas', 'cleaning', 'lavavajillas', 'lavavajillas'),
  ('cleaning-lejia', 'cleaning', 'lejía', 'lejia'),
  ('cleaning-limpiador-biberones', 'cleaning', 'limpiador biberones', 'limpiador biberones'),
  ('cleaning-limpieza', 'cleaning', 'limpieza', 'limpieza'),
  ('household-bolsas-de-basura', 'household', 'bolsas de basura', 'bolsas de basura'),
  ('household-cristal', 'household', 'cristal', 'cristal'),
  ('household-papel-cocina', 'household', 'papel cocina', 'papel cocina'),
  ('household-servilletas', 'household', 'servilletas', 'servilletas'),
  ('household-vaso', 'household', 'vaso', 'vaso'),
  ('household-vasos', 'household', 'vasos', 'vasos'),
  ('baby-biberon', 'baby', 'biberón', 'biberon'),
  ('baby-bragas-de-incontinencia', 'baby', 'bragas de incontinencia', 'bragas de incontinencia'),
  ('baby-chupete', 'baby', 'chupete', 'chupete'),
  ('baby-compresas-maternidad', 'baby', 'compresas maternidad', 'compresas maternidad'),
  ('baby-maternidad', 'baby', 'maternidad', 'maternidad'),
  ('baby-panales', 'baby', 'pañales', 'panales'),
  ('baby-toallitas', 'baby', 'toallitas', 'toallitas'),
  ('hygiene-cabezales-oral-b', 'hygiene', 'cabezales oral b', 'cabezales oral b'),
  ('hygiene-champu', 'hygiene', 'champú', 'champu'),
  ('hygiene-compresas', 'hygiene', 'compresas', 'compresas'),
  ('hygiene-gel', 'hygiene', 'gel', 'gel'),
  ('hygiene-higiene', 'hygiene', 'higiene', 'higiene'),
  ('hygiene-papel-higienico', 'hygiene', 'papel higiénico', 'papel higienico'),
  ('hygiene-parodontax', 'hygiene', 'parodontax', 'parodontax'),
  ('hygiene-pasta-de-dientes', 'hygiene', 'pasta de dientes', 'pasta de dientes'),
  ('hygiene-peine', 'hygiene', 'peine', 'peine'),
  ('pharmacy-guantes', 'pharmacy', 'guantes', 'guantes'),
  ('pharmacy-ibuprofeno', 'pharmacy', 'ibuprofeno', 'ibuprofeno'),
  ('pharmacy-lavado-nasal', 'pharmacy', 'lavado nasal', 'lavado nasal'),
  ('pharmacy-medicina', 'pharmacy', 'medicina', 'medicina'),
  ('pharmacy-paracetamol', 'pharmacy', 'paracetamol', 'paracetamol'),
  ('pharmacy-tiritas', 'pharmacy', 'tiritas', 'tiritas'),
  ('pets-arena', 'pets', 'arena', 'arena'),
  ('pets-comida-gato', 'pets', 'comida gato', 'comida gato'),
  ('pets-comida-perro', 'pets', 'comida perro', 'comida perro'),
  ('pets-mascota', 'pets', 'mascota', 'mascota'),
  ('pets-pienso', 'pets', 'pienso', 'pienso')
on conflict (id) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  normalized_name = excluded.normalized_name,
  updated_at = now();

alter table public.shopping_items
  drop constraint if exists shopping_items_category_id_check;

alter table public.shopping_items
  drop constraint if exists shopping_items_category_id_fkey;

alter table public.shopping_items
  add constraint shopping_items_category_id_fkey
  foreign key (category_id) references public.shopping_categories(id)
  on update cascade on delete restrict;

alter table public.shopping_categories enable row level security;
alter table public.shopping_product_catalog_entries enable row level security;

create policy "Allow read access to shopping categories"
  on public.shopping_categories
  for select
  using (true);

create policy "Allow write access to shopping categories"
  on public.shopping_categories
  for all
  using (true)
  with check (true);

create policy "Allow read access to shopping product catalog entries"
  on public.shopping_product_catalog_entries
  for select
  using (true);

create policy "Allow write access to shopping product catalog entries"
  on public.shopping_product_catalog_entries
  for all
  using (true)
  with check (true);

alter publication supabase_realtime add table public.shopping_categories;
alter publication supabase_realtime add table public.shopping_product_catalog_entries;
