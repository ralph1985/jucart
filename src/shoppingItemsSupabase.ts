import { createClient, SupabaseClient } from "@supabase/supabase-js";

import {
  defaultShoppingSections,
  inferShoppingCategoryId,
  isShoppingCategoryId,
  isShoppingSectionColor,
  isShoppingUserId,
  ShoppingItem,
  ShoppingSection,
  ShoppingSectionId,
  ShoppingUserId,
} from "./shoppingItems";
import type { ShoppingData } from "./shoppingItemsDb";

type ShoppingItemRow = {
  id: string;
  list_id: string;
  name: string;
  section_id: string;
  category_id?: string;
  added_by: string;
  purchased: boolean;
  created_at: string;
  updated_at: string;
};

type ShoppingSectionRow = {
  id: string;
  list_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
};

type SupabaseConfig = {
  url: string;
  anonKey: string;
  listId: string;
};

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseConfig(): SupabaseConfig | null {
  if (import.meta.env.MODE === "test") {
    return null;
  }

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  const listId = import.meta.env.VITE_SUPABASE_LIST_ID?.trim();

  if (
    !url ||
    !anonKey ||
    !listId ||
    url.includes("your-project-ref") ||
    anonKey.includes("replace-with")
  ) {
    return null;
  }

  return { url, anonKey, listId };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

export async function getSupabaseShoppingData(): Promise<ShoppingData | null> {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const client = getSupabaseClient(config);
  const [itemsResult, sectionsResult] = await Promise.all([
    client
      .from("shopping_items")
      .select("*")
      .eq("list_id", config.listId)
      .order("created_at", { ascending: true }),
    client
      .from("shopping_sections")
      .select("*")
      .eq("list_id", config.listId)
      .order("position", { ascending: true }),
  ]);

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  if (sectionsResult.error) {
    throw sectionsResult.error;
  }

  return {
    items: (itemsResult.data ?? []).map(mapRowToShoppingItem),
    sections:
      sectionsResult.data && sectionsResult.data.length > 0
        ? sectionsResult.data.map(mapRowToShoppingSection)
        : defaultShoppingSections,
  };
}

export async function replaceSupabaseShoppingData(data: ShoppingData) {
  const config = getSupabaseConfig();

  if (!config) {
    return false;
  }

  const client = getSupabaseClient(config);
  const itemRows = data.items.map((item) =>
    mapShoppingItemToRow(item, config.listId),
  );
  const sectionRows = data.sections.map((section, index) =>
    mapShoppingSectionToRow(section, index, config.listId),
  );

  if (sectionRows.length > 0) {
    const { error } = await client
      .from("shopping_sections")
      .upsert(sectionRows);

    if (error) {
      throw error;
    }
  }

  let deleteSectionsQuery = client
    .from("shopping_sections")
    .delete()
    .eq("list_id", config.listId);

  if (data.sections.length > 0) {
    deleteSectionsQuery = deleteSectionsQuery.not(
      "id",
      "in",
      encodePostgrestTextList(data.sections.map((section) => section.id)),
    );
  }

  const { error: deleteSectionsError } = await deleteSectionsQuery;

  if (deleteSectionsError) {
    throw deleteSectionsError;
  }

  if (itemRows.length > 0) {
    const { error } = await client.from("shopping_items").upsert(itemRows);

    if (error) {
      throw error;
    }
  }

  let deleteQuery = client
    .from("shopping_items")
    .delete()
    .eq("list_id", config.listId);

  if (data.items.length > 0) {
    deleteQuery = deleteQuery.not(
      "id",
      "in",
      encodePostgrestTextList(data.items.map((item) => item.id)),
    );
  }

  const { error } = await deleteQuery;

  if (error) {
    throw error;
  }

  return true;
}

export function subscribeToSupabaseShoppingItems(onChange: () => void) {
  const config = getSupabaseConfig();

  if (!config) {
    return () => undefined;
  }

  const channel = getSupabaseClient(config)
    .channel(`shopping_items:${config.listId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_items",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_sections",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .subscribe();

  return () => {
    void getSupabaseClient(config).removeChannel(channel);
  };
}

export function mapRowToShoppingItem(row: ShoppingItemRow): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    sectionId: normalizeSectionId(row.section_id),
    categoryId: normalizeCategoryId(row.category_id, row.name),
    addedBy: normalizeUserId(row.added_by),
    purchased: row.purchased,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

export function mapRowToShoppingSection(
  row: Pick<ShoppingSectionRow, "id" | "name"> &
    Partial<Pick<ShoppingSectionRow, "color">>,
): ShoppingSection {
  return {
    id: normalizeSectionId(row.id),
    name: row.name,
    color: row.color && isShoppingSectionColor(row.color) ? row.color : "mint",
  };
}

export function mapShoppingItemToRow(
  item: ShoppingItem,
  listId: string,
): ShoppingItemRow {
  return {
    id: item.id,
    list_id: listId,
    name: item.name,
    section_id: item.sectionId,
    category_id: item.categoryId ?? inferShoppingCategoryId(item.name),
    added_by: item.addedBy,
    purchased: item.purchased,
    created_at: new Date(item.createdAt).toISOString(),
    updated_at: new Date(item.updatedAt).toISOString(),
  };
}

export function mapShoppingSectionToRow(
  section: ShoppingSection,
  position: number,
  listId: string,
): ShoppingSectionRow {
  const now = new Date().toISOString();

  return {
    id: section.id,
    list_id: listId,
    name: section.name,
    color: section.color,
    position,
    created_at: now,
    updated_at: now,
  };
}

function getSupabaseClient(config: SupabaseConfig) {
  supabaseClient ??= createClient(config.url, config.anonKey);

  return supabaseClient;
}

function normalizeSectionId(value: string): ShoppingSectionId {
  return value.trim() ? value : "general";
}

function normalizeUserId(value: string): ShoppingUserId {
  return isShoppingUserId(value) ? value : "rafa";
}

function normalizeCategoryId(value: string | undefined, itemName: string) {
  return value && isShoppingCategoryId(value)
    ? value
    : inferShoppingCategoryId(itemName);
}

function encodePostgrestTextList(values: string[]) {
  return `(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",")})`;
}
