import { createClient, SupabaseClient } from "@supabase/supabase-js";

import {
  isShoppingSectionId,
  isShoppingUserId,
  ShoppingItem,
  ShoppingSectionId,
  ShoppingUserId,
} from "./shoppingItems";

type ShoppingItemRow = {
  id: string;
  list_id: string;
  name: string;
  section_id: string;
  added_by: string;
  purchased: boolean;
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

export async function getSupabaseShoppingItems() {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const { data, error } = await getSupabaseClient(config)
    .from("shopping_items")
    .select("*")
    .eq("list_id", config.listId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRowToShoppingItem);
}

export async function replaceSupabaseShoppingItems(items: ShoppingItem[]) {
  const config = getSupabaseConfig();

  if (!config) {
    return false;
  }

  const client = getSupabaseClient(config);
  const rows = items.map((item) => mapShoppingItemToRow(item, config.listId));

  if (rows.length > 0) {
    const { error } = await client.from("shopping_items").upsert(rows);

    if (error) {
      throw error;
    }
  }

  let deleteQuery = client
    .from("shopping_items")
    .delete()
    .eq("list_id", config.listId);

  if (items.length > 0) {
    deleteQuery = deleteQuery.not(
      "id",
      "in",
      encodePostgrestTextList(items.map((item) => item.id)),
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
    addedBy: normalizeUserId(row.added_by),
    purchased: row.purchased,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
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
    added_by: item.addedBy,
    purchased: item.purchased,
    created_at: new Date(item.createdAt).toISOString(),
    updated_at: new Date(item.updatedAt).toISOString(),
  };
}

function getSupabaseClient(config: SupabaseConfig) {
  supabaseClient ??= createClient(config.url, config.anonKey);

  return supabaseClient;
}

function normalizeSectionId(value: string): ShoppingSectionId {
  return isShoppingSectionId(value) ? value : "general";
}

function normalizeUserId(value: string): ShoppingUserId {
  return isShoppingUserId(value) ? value : "rafa";
}

function encodePostgrestTextList(values: string[]) {
  return `(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",")})`;
}
