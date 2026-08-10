import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./supabaseConfig";

export type MenuDishStatus = "pending" | "cooked";
export type MenuDish = {
  id: string;
  libraryId: string;
  name: string;
  dishTypeId: string | null;
  typeName: string | null;
  status: MenuDishStatus;
  cookedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type MenuDishType = { id: string; name: string };

let client: ReturnType<typeof createClient> | null = null;
type TableResult = { data: unknown; error: unknown };
type TableQuery = {
  select: (columns: string) => TableQuery;
  insert: (values: unknown) => TableQuery;
  update: (values: unknown) => TableQuery;
  delete: () => TableQuery;
  eq: (column: string, value: string) => TableQuery;
  order: (column: string, options?: { ascending: boolean }) => TableQuery;
  limit: (value: number) => TableQuery;
  maybeSingle: () => Promise<TableResult>;
  single: () => Promise<TableResult>;
};
type MenuDishRow = {
  id: string;
  library_id: string;
  name: string;
  dish_type_id: string | null;
  status: MenuDishStatus;
  cooked_at: string | null;
  created_at: string;
  updated_at: string;
  menu_dish_types: { id: string; name: string } | null;
};
type MenuDishTypeRow = { id: string; name: string };

function getClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Los platos requieren conexión con Supabase.");
  client ??= createClient(config.url, config.anonKey);
  return client;
}

function table(name: string): TableQuery {
  return getClient().from(name as never) as unknown as TableQuery;
}

function mapDish(row: MenuDishRow): MenuDish {
  return {
    id: row.id,
    libraryId: row.library_id,
    name: row.name,
    dishTypeId: row.dish_type_id,
    typeName: row.menu_dish_types?.name ?? null,
    status: row.status,
    cookedAt: row.cooked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const dishColumns =
  "id, library_id, name, dish_type_id, status, cooked_at, created_at, updated_at, menu_dish_types(id, name)";

export async function getMenuDishLibrary(): Promise<string> {
  const { data, error } = await (table("menu_dish_libraries")
    .select("id")
    .limit(1)
    .maybeSingle() as unknown as Promise<TableResult>);
  if (error) throw error;
  const library = data as { id?: string } | null;
  if (!library?.id)
    throw new Error("No tienes una biblioteca de platos compartida.");
  return library.id;
}

export async function getMenuDishes(libraryId: string): Promise<MenuDish[]> {
  const { data, error } = await (table("menu_dishes")
    .select(dishColumns)
    .eq("library_id", libraryId)
    .order("status", { ascending: true })
    .order("cooked_at", {
      ascending: false,
    }) as unknown as Promise<TableResult>);
  if (error) throw error;
  return ((data ?? []) as MenuDishRow[]).map(mapDish);
}

export async function createMenuDish(
  libraryId: string,
  name: string,
  dishTypeId: string | null,
): Promise<MenuDish> {
  const { data, error } = await (table("menu_dishes")
    .insert({
      library_id: libraryId,
      name: name.trim(),
      dish_type_id: dishTypeId,
      status: "pending",
      cooked_at: null,
    })
    .select(dishColumns)
    .single() as unknown as Promise<TableResult>);
  if (error) throw error;
  if (!data) throw new Error("No se pudo guardar el plato.");
  return mapDish(data as MenuDishRow);
}

export async function updateMenuDish(
  dishId: string,
  values: {
    name?: string;
    dishTypeId?: string | null;
    status?: MenuDishStatus;
    cookedAt?: string | null;
  },
): Promise<MenuDish> {
  const update: Record<string, unknown> = {};
  if (values.name !== undefined) update.name = values.name.trim();
  if (values.dishTypeId !== undefined) update.dish_type_id = values.dishTypeId;
  if (values.status !== undefined) update.status = values.status;
  if (values.cookedAt !== undefined) update.cooked_at = values.cookedAt;
  const { data, error } = await (table("menu_dishes")
    .update(update)
    .eq("id", dishId)
    .select(dishColumns)
    .single() as unknown as Promise<TableResult>);
  if (error) throw error;
  if (!data) throw new Error("No se pudo actualizar el plato.");
  return mapDish(data as MenuDishRow);
}

export async function deleteMenuDish(dishId: string) {
  const { error } = await (table("menu_dishes")
    .delete()
    .eq("id", dishId) as unknown as Promise<TableResult>);
  if (error) throw error;
}

export async function getMenuDishTypes(libraryId: string) {
  const { data, error } = await (table("menu_dish_types")
    .select("id, name")
    .eq("library_id", libraryId)
    .order("position", { ascending: true }) as unknown as Promise<TableResult>);
  if (error) throw error;
  return ((data ?? []) as MenuDishTypeRow[]).map((type) => ({
    id: type.id,
    name: type.name,
  }));
}

export async function createMenuDishType(libraryId: string, name: string) {
  const { error } = await (table("menu_dish_types").insert({
    library_id: libraryId,
    name: name.trim(),
    position: Date.now(),
  }) as unknown as Promise<TableResult>);
  if (error) throw error;
}
