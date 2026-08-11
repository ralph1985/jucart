#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

const reportPath = process.argv[process.argv.indexOf("--report") + 1];
const libraryId = process.argv[process.argv.indexOf("--library-id") + 1];
const outputPath =
  process.argv[process.argv.indexOf("--output") + 1] ??
  "/tmp/jucart-menu-dishes-import.sql";

if (!reportPath || !libraryId) {
  console.error(
    "Uso: node scripts/import-menu-dishes-excel.mjs --report REPORT.json --library-id UUID [--output FILE]",
  );
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const nameCorrections = new Map([
  ["Humus", "Hummus"],
  ["Brocoli con tomate y huevo", "Brócoli con tomate y huevo"],
  [
    "Judias verdes con patata y zanahoria",
    "Judías verdes con patata y zanahoria",
  ],
  ["Romanescu", "Romanesco"],
  ["Hervido con acelgas, etc..", "Hervido con acelgas, etc."],
]);
const functionalTypes = new Map([
  ["Empanada", "Entrante"],
  ["Empanadillas de espinacas, queso y jamón", "Entrante"],
  ["Patatas con besamel de ketchup y queso y nata", "Guarnición"],
  ["Pizza casera", "Principal"],
  ["Ternera con patatas", "Principal"],
  ["Tosta de brie y bacon", "Entrante"],
  ["Tosta de jamón con tomate", "Entrante"],
  ["Garbanzos con verduras", "Principal"],
  ["Ramen", "Principal"],
]);
const correctedName = (name) => nameCorrections.get(name) ?? name;
const rows = report.dishes.map((dish) => ({
  name: correctedName(dish.name),
  categories: dish.categories.filter((category) => !/^\d+$/.test(category)),
  functionalType: functionalTypes.get(dish.name) ?? null,
}));
const categories = [...new Set(rows.flatMap((row) => row.categories))].sort(
  (a, b) => a.localeCompare(b, "es"),
);

const sql = [
  "begin;",
  ...categories.map(
    (category, position) =>
      `insert into public.menu_dish_categories (library_id, name, position) values (${quote(libraryId)}, ${quote(category)}, ${position}) on conflict (library_id, lower(name)) do nothing;`,
  ),
  ...rows.map(
    (row) =>
      `insert into public.menu_dishes (library_id, name, dish_type_id, status, cooked_at) values (${quote(libraryId)}, ${quote(row.name)}, ${row.functionalType ? `(select id from public.menu_dish_types where library_id = ${quote(libraryId)} and lower(name) = lower(${quote(row.functionalType)}) limit 1)` : "null"}, 'pending', null) on conflict (library_id, lower(name)) do nothing;`,
  ),
  ...rows.flatMap((row) =>
    row.categories.map(
      (category, position) =>
        `insert into public.menu_dish_category_links (dish_id, category_id, position) select dishes.id, categories.id, ${position} from public.menu_dishes dishes join public.menu_dish_categories categories on categories.library_id = dishes.library_id and lower(categories.name) = lower(${quote(category)}) where dishes.library_id = ${quote(libraryId)} and lower(dishes.name) = lower(${quote(row.name)}) on conflict (dish_id, category_id) do nothing;`,
    ),
  ),
  "commit;",
  "",
].join("\n");

writeFileSync(outputPath, sql, { mode: 0o600 });
console.log(`SQL de importación escrito en ${outputPath}`);
console.log(
  `Platos: ${rows.length}; categorías: ${categories.length}; enlaces: ${rows.reduce((total, row) => total + row.categories.length, 0)}`,
);
