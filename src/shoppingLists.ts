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
  currentRole: ShoppingListRole;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingListRole = "owner" | "member";

export type ShoppingListMember = {
  userId: string;
  email: string;
  displayName: string | null;
  role: ShoppingListRole;
  joinedAt: string;
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
  membership_role: ShoppingListRole;
};

type ShoppingListMemberRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: ShoppingListRole;
  joined_at: string;
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
    currentRole: row.membership_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapShoppingListMember(row: ShoppingListMemberRow): ShoppingListMember {
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    joinedAt: row.joined_at,
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

export async function createShoppingList(
  name: string,
  color: "mint" | "blue" | "violet" | "amber" | "rose" | "slate" = "mint",
) {
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

  const createdList = mapShoppingList(data as ShoppingListRow);
  const { error: sectionError } = await supabase
    .from("shopping_sections")
    .insert({
      id: "general",
      list_id: createdList.id,
      name: createdList.name,
      position: 0,
      color,
    });

  if (sectionError) {
    throw sectionError;
  }

  return createdList;
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

  const { error } = await supabase.rpc("regenerate_shopping_list_code", {
    p_list_id: listId,
  });

  if (error) {
    throw error;
  }

  const lists = await getShoppingLists();
  const refreshedList = lists.find((list) => list.id === listId);

  if (!refreshedList) {
    throw new Error("No se pudo recargar la lista tras regenerar el código.");
  }

  return refreshedList;
}

export async function getShoppingListMembers(listId: string) {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { data, error } = await supabase.rpc("get_shopping_list_members", {
    p_list_id: listId,
  });

  if (error) {
    throw error;
  }

  return (data as ShoppingListMemberRow[]).map(mapShoppingListMember);
}

export async function removeShoppingListMember(listId: string, userId: string) {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { error } = await supabase.rpc("remove_shopping_list_member", {
    p_list_id: listId,
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }
}

export async function transferShoppingListOwnership(
  listId: string,
  userId: string,
) {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { error } = await supabase.rpc("transfer_shopping_list_ownership", {
    p_list_id: listId,
    p_new_owner_id: userId,
  });

  if (error) {
    throw error;
  }
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

export async function moveShoppingList(listId: string, direction: -1 | 1) {
  const supabase = getClient();

  if (!supabase) {
    throw getUnavailableMessage();
  }

  const { error } = await supabase.rpc("move_shopping_list", {
    p_list_id: listId,
    p_direction: direction,
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
