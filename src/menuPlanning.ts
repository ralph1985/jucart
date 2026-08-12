import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./supabaseConfig";
import { createRemoteAction } from "./remoteActions";

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
  rating: number | null;
  categories: MenuDishCategory[];
};
export type MenuDishType = { id: string; name: string };
export type MenuDishCategory = { id: string; name: string; position: number };
export type MenuDishRecategorizationRun = {
  id: string;
  libraryId: string;
  summary: string;
  dishesRecategorized: number;
  createdAt: string;
  revertedAt: string | null;
};
export type MenuDishRecategorizationChange = {
  id: string;
  runId: string;
  dishId: string | null;
  dishName: string;
  previousTypeId: string | null;
  nextTypeId: string | null;
  reason: string;
  createdAt: string;
};

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
  rating: number | null;
  menu_dish_types: { id: string; name: string } | null;
  menu_dish_category_links: Array<{
    position: number;
    menu_dish_categories: MenuDishCategoryRow | null;
  }>;
};
type MenuDishTypeRow = { id: string; name: string };
type MenuDishCategoryRow = { id: string; name: string; position: number };
type MenuDishRecategorizationRunRow = {
  id: string;
  library_id: string;
  summary: string;
  dishes_recategorized: number;
  created_at: string;
  reverted_at: string | null;
};
type MenuDishRecategorizationChangeRow = {
  id: string;
  run_id: string;
  dish_id: string | null;
  dish_name: string;
  previous_type_id: string | null;
  next_type_id: string | null;
  reason: string;
  created_at: string;
};

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
    rating: row.rating ?? null,
    categories: (row.menu_dish_category_links ?? [])
      .filter((link) => link.menu_dish_categories)
      .sort((left, right) => left.position - right.position)
      .map((link) => ({
        id: link.menu_dish_categories!.id,
        name: link.menu_dish_categories!.name,
        position: link.menu_dish_categories!.position,
      })),
  };
}

const dishColumns =
  "id, library_id, name, dish_type_id, status, cooked_at, rating, created_at, updated_at, menu_dish_types(id, name), menu_dish_category_links(position, menu_dish_categories(id, name, position))";

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
  categoryIds: string[] = [],
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
  const dish = mapDish(data as MenuDishRow);
  await replaceMenuDishCategories(dish.id, categoryIds);
  return getMenuDish(dish.id);
}

async function getMenuDish(dishId: string): Promise<MenuDish> {
  const { data, error } = await (table("menu_dishes")
    .select(dishColumns)
    .eq("id", dishId)
    .single() as unknown as Promise<TableResult>);
  if (error) throw error;
  if (!data) throw new Error("No se pudo cargar el plato.");
  return mapDish(data as MenuDishRow);
}

async function replaceMenuDishCategories(
  dishId: string,
  categoryIds: string[],
) {
  const { error: deleteError } = await (table("menu_dish_category_links")
    .delete()
    .eq("dish_id", dishId) as unknown as Promise<TableResult>);
  if (deleteError) throw deleteError;
  const uniqueCategoryIds = [...new Set(categoryIds)];
  if (uniqueCategoryIds.length === 0) return;
  const { error } = await (table("menu_dish_category_links").insert(
    uniqueCategoryIds.map((categoryId, position) => ({
      dish_id: dishId,
      category_id: categoryId,
      position,
    })),
  ) as unknown as Promise<TableResult>);
  if (error) throw error;
}

export async function updateMenuDish(
  dishId: string,
  values: {
    name?: string;
    dishTypeId?: string | null;
    status?: MenuDishStatus;
    cookedAt?: string | null;
    rating?: number | null;
    categoryIds?: string[];
  },
): Promise<MenuDish> {
  const update: Record<string, unknown> = {};
  if (values.name !== undefined) update.name = values.name.trim();
  if (values.dishTypeId !== undefined) update.dish_type_id = values.dishTypeId;
  if (values.status !== undefined) update.status = values.status;
  if (values.cookedAt !== undefined) update.cooked_at = values.cookedAt;
  if (values.rating !== undefined) update.rating = values.rating;
  const { data, error } = await (table("menu_dishes")
    .update(update)
    .eq("id", dishId)
    .select(dishColumns)
    .single() as unknown as Promise<TableResult>);
  if (error) throw error;
  if (!data) throw new Error("No se pudo actualizar el plato.");
  if (values.categoryIds !== undefined)
    await replaceMenuDishCategories(dishId, values.categoryIds);
  return getMenuDish(dishId);
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

export async function updateMenuDishType(typeId: string, name: string) {
  const { error } = await (table("menu_dish_types")
    .update({ name: name.trim() })
    .eq("id", typeId) as unknown as Promise<TableResult>);
  if (error) throw error;
}

export async function deleteMenuDishType(typeId: string) {
  const { error } = await (table("menu_dish_types")
    .delete()
    .eq("id", typeId) as unknown as Promise<TableResult>);
  if (error) throw error;
}

export async function getMenuDishCategories(libraryId: string) {
  const { data, error } = await (table("menu_dish_categories")
    .select("id, name, position")
    .eq("library_id", libraryId)
    .order("position", { ascending: true }) as unknown as Promise<TableResult>);
  if (error) throw error;
  return ((data ?? []) as MenuDishCategoryRow[]).map((category) => ({
    id: category.id,
    name: category.name,
    position: category.position,
  }));
}

export async function createMenuDishCategory(libraryId: string, name: string) {
  const { error } = await (table("menu_dish_categories").insert({
    library_id: libraryId,
    name: name.trim(),
    position: Date.now(),
  }) as unknown as Promise<TableResult>);
  if (error) throw error;
}

export async function updateMenuDishCategory(categoryId: string, name: string) {
  const { error } = await (table("menu_dish_categories")
    .update({ name: name.trim() })
    .eq("id", categoryId) as unknown as Promise<TableResult>);
  if (error) throw error;
}

export async function deleteMenuDishCategory(categoryId: string) {
  const { error } = await (table("menu_dish_categories")
    .delete()
    .eq("id", categoryId) as unknown as Promise<TableResult>);
  if (error) throw error;
}

export async function requestMenuDishRecategorization(libraryId: string) {
  return createRemoteAction(
    "recategorize_menu_dishes",
    `recategorize_menu_dishes-${libraryId}-${crypto.randomUUID()}`,
    { libraryId },
  );
}

export async function getLatestMenuDishRecategorization(
  libraryId: string,
): Promise<MenuDishRecategorizationRun | null> {
  const { data, error } = await (table("menu_dish_recategorization_runs")
    .select(
      "id, library_id, summary, dishes_recategorized, created_at, reverted_at",
    )
    .eq("library_id", libraryId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as Promise<TableResult>);
  if (error) throw error;
  if (!data) return null;
  const run = data as MenuDishRecategorizationRunRow;
  return {
    id: run.id,
    libraryId: run.library_id,
    summary: run.summary,
    dishesRecategorized: run.dishes_recategorized,
    createdAt: run.created_at,
    revertedAt: run.reverted_at,
  };
}

export async function getMenuDishRecategorizationHistory(libraryId: string) {
  const [runsResult, changesResult] = await Promise.all([
    table("menu_dish_recategorization_runs")
      .select(
        "id, library_id, summary, dishes_recategorized, created_at, reverted_at",
      )
      .eq("library_id", libraryId)
      .order("created_at", { ascending: false })
      .limit(100) as unknown as Promise<TableResult>,
    table("menu_dish_recategorization_changes")
      .select(
        "id, run_id, dish_id, dish_name, previous_type_id, next_type_id, reason, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500) as unknown as Promise<TableResult>,
  ]);
  if (runsResult.error) throw runsResult.error;
  if (changesResult.error) throw changesResult.error;

  return {
    runs: ((runsResult.data ?? []) as MenuDishRecategorizationRunRow[]).map(
      (run) => ({
        id: run.id,
        libraryId: run.library_id,
        summary: run.summary,
        dishesRecategorized: run.dishes_recategorized,
        createdAt: run.created_at,
        revertedAt: run.reverted_at,
      }),
    ),
    changes: (
      (changesResult.data ?? []) as MenuDishRecategorizationChangeRow[]
    ).map((change) => ({
      id: change.id,
      runId: change.run_id,
      dishId: change.dish_id,
      dishName: change.dish_name,
      previousTypeId: change.previous_type_id,
      nextTypeId: change.next_type_id,
      reason: change.reason,
      createdAt: change.created_at,
    })),
  };
}

export async function undoMenuDishRecategorization(runId: string) {
  const supabase = getClient() as unknown as {
    rpc: (
      functionName: string,
      args: Record<string, string>,
    ) => Promise<TableResult>;
  };
  const { data, error } = await supabase.rpc(
    "undo_menu_dish_recategorization",
    { p_run_id: runId },
  );
  if (error) throw error;
  return Number(data ?? 0);
}
