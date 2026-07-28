import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./supabaseConfig";

export type ShoppingList = {
  id: string;
  name: string;
  ownerId: string;
  joinCode: string;
  ownerEmail: string;
  memberCount: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

type ShoppingListRow = {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  created_at: string;
  updated_at: string;
  owner_email: string;
  member_count: number;
  product_count: number;
};

let client: SupabaseClient | null = null;

function getClient() {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  client ??= createClient(config.url, config.anonKey);
  return client;
}

function mapShoppingList(row: ShoppingListRow): ShoppingList {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    joinCode: row.join_code,
    ownerEmail: row.owner_email,
    memberCount: Number(row.member_count ?? 0),
    productCount: Number(row.product_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getUnavailableMessage() {
  return new Error("La gestión de listas no está configurada.");
}

export async function getShoppingLists() {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { data, error } = await supabase.rpc("get_shopping_lists_for_user");

  if (error) {
    throw error;
  }

  return (data as ShoppingListRow[]).map(mapShoppingList);
}

export async function createShoppingList(name: string) {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { data, error } = await supabase
    .rpc("create_shopping_list", { p_name: name.trim() })
    .single();

  if (error) {
    throw error;
  }

  return mapShoppingList(data as ShoppingListRow);
}

export async function joinShoppingList(joinCode: string) {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { data, error } = await supabase
    .rpc("join_shopping_list_by_code", { p_join_code: joinCode.trim() })
    .single();

  if (error) {
    throw error;
  }

  return mapShoppingList(data as ShoppingListRow);
}

export async function regenerateShoppingListCode(listId: string) {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { data, error } = await supabase
    .rpc("regenerate_shopping_list_code", { p_list_id: listId })
    .single();

  if (error) {
    throw error;
  }

  return mapShoppingList(data as ShoppingListRow);
}

export async function renameShoppingList(listId: string, name: string) {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { error } = await supabase.rpc("rename_shopping_list", {
    p_list_id: listId,
    p_name: name.trim(),
  });

  if (error) {
    throw error;
  }
}

export async function leaveShoppingList(listId: string) {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { error } = await supabase.rpc("leave_shopping_list", {
    p_list_id: listId,
  });

  if (error) {
    throw error;
  }
}

export async function deleteShoppingList(listId: string) {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { error } = await supabase.rpc("delete_shopping_list", {
    p_list_id: listId,
  });

  if (error) {
    throw error;
  }
}
