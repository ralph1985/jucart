import { createClient, SupabaseClient } from "@supabase/supabase-js";

import {
  defaultShoppingSections,
  inferShoppingCategoryId,
  isShoppingCategoryId,
  isShoppingHistoryEventType,
  isShoppingSectionColor,
  isShoppingUserId,
  ShoppingHistoryEvent,
  ShoppingHistoryItemSnapshot,
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
  quantity?: string | null;
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

type ShoppingHistoryEventRow = {
  id: string;
  list_id: string;
  item_id: string;
  event_type: string;
  actor: string;
  client_id: string;
  item_snapshot: ShoppingHistoryItemSnapshot;
  previous_item_snapshot?: ShoppingHistoryItemSnapshot;
  created_at: string;
};

type DeveloperBackupRunRow = {
  id: string;
  started_at: string;
  finished_at: string;
  status: string;
  file_name: string | null;
  file_size_bytes: number | null;
  sha256: string | null;
  duration_ms: number;
  retained_count: number;
  error_message: string | null;
  created_at: string;
};

export type DeveloperBackupRun = {
  id: string;
  startedAt: number;
  finishedAt: number;
  status: "success" | "failed";
  fileName: string | null;
  fileSizeBytes: number | null;
  sha256: string | null;
  durationMs: number;
  retainedCount: number;
  errorMessage: string | null;
  createdAt: number;
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

export async function getLatestDeveloperBackupRun(): Promise<DeveloperBackupRun | null> {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const { data, error } = await getSupabaseClient(config)
    .from("developer_backup_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapRowToDeveloperBackupRun(data) : null;
}

export async function getSupabaseShoppingData(): Promise<ShoppingData | null> {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const client = getSupabaseClient(config);
  const [itemsResult, sectionsResult, historyResult] = await Promise.all([
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
    client
      .from("shopping_history_events")
      .select("*")
      .eq("list_id", config.listId)
      .order("created_at", { ascending: true }),
  ]);

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  if (sectionsResult.error) {
    throw sectionsResult.error;
  }

  if (historyResult.error) {
    throw historyResult.error;
  }

  return {
    items: (itemsResult.data ?? []).map(mapRowToShoppingItem),
    sections:
      sectionsResult.data && sectionsResult.data.length > 0
        ? sectionsResult.data.map(mapRowToShoppingSection)
        : defaultShoppingSections,
    historyEvents: (historyResult.data ?? []).map(mapRowToShoppingHistoryEvent),
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
  const historyRows = data.historyEvents.map((event) =>
    mapShoppingHistoryEventToRow(event, config.listId),
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

  if (historyRows.length > 0) {
    const { error } = await client
      .from("shopping_history_events")
      .upsert(historyRows);

    if (error) {
      throw error;
    }
  }

  let deleteHistoryQuery = client
    .from("shopping_history_events")
    .delete()
    .eq("list_id", config.listId);

  if (data.historyEvents.length > 0) {
    deleteHistoryQuery = deleteHistoryQuery.not(
      "id",
      "in",
      encodePostgrestTextList(data.historyEvents.map((event) => event.id)),
    );
  }

  const { error: deleteHistoryError } = await deleteHistoryQuery;

  if (deleteHistoryError) {
    throw deleteHistoryError;
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
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_history_events",
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
    quantity: row.quantity?.trim() ? row.quantity : undefined,
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
    quantity: item.quantity ?? null,
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

export function mapRowToShoppingHistoryEvent(
  row: ShoppingHistoryEventRow,
): ShoppingHistoryEvent {
  const itemSnapshot = row.item_snapshot;

  return {
    id: row.id,
    itemId: row.item_id,
    type: isShoppingHistoryEventType(row.event_type)
      ? row.event_type
      : "initial",
    actor: normalizeUserId(row.actor),
    clientId: row.client_id.trim() ? row.client_id : "unknown",
    item: {
      id: itemSnapshot.id,
      name: itemSnapshot.name,
      quantity: itemSnapshot.quantity?.trim()
        ? itemSnapshot.quantity
        : undefined,
      sectionId: normalizeSectionId(itemSnapshot.sectionId),
      sectionName: itemSnapshot.sectionName ?? itemSnapshot.sectionId,
      categoryId: normalizeCategoryId(
        itemSnapshot.categoryId,
        itemSnapshot.name,
      ),
      addedBy: normalizeUserId(itemSnapshot.addedBy),
      purchased: itemSnapshot.purchased,
      createdAt: itemSnapshot.createdAt,
      updatedAt: itemSnapshot.updatedAt,
    },
    previousItem: row.previous_item_snapshot
      ? mapSnapshotToShoppingHistoryItemSnapshot(row.previous_item_snapshot)
      : undefined,
    createdAt: Date.parse(row.created_at),
  };
}

export function mapShoppingHistoryEventToRow(
  event: ShoppingHistoryEvent,
  listId: string,
): ShoppingHistoryEventRow {
  return {
    id: event.id,
    list_id: listId,
    item_id: event.itemId,
    event_type: event.type,
    actor: event.actor,
    client_id: event.clientId,
    item_snapshot: event.item,
    previous_item_snapshot: event.previousItem,
    created_at: new Date(event.createdAt).toISOString(),
  };
}

export function mapRowToDeveloperBackupRun(
  row: DeveloperBackupRunRow,
): DeveloperBackupRun {
  return {
    id: row.id,
    startedAt: Date.parse(row.started_at),
    finishedAt: Date.parse(row.finished_at),
    status: row.status === "failed" ? "failed" : "success",
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    sha256: row.sha256,
    durationMs: row.duration_ms,
    retainedCount: row.retained_count,
    errorMessage: row.error_message,
    createdAt: Date.parse(row.created_at),
  };
}

function mapSnapshotToShoppingHistoryItemSnapshot(
  itemSnapshot: ShoppingHistoryItemSnapshot,
): ShoppingHistoryItemSnapshot {
  return {
    id: itemSnapshot.id,
    name: itemSnapshot.name,
    quantity: itemSnapshot.quantity?.trim() ? itemSnapshot.quantity : undefined,
    sectionId: normalizeSectionId(itemSnapshot.sectionId),
    sectionName: itemSnapshot.sectionName ?? itemSnapshot.sectionId,
    categoryId: normalizeCategoryId(itemSnapshot.categoryId, itemSnapshot.name),
    addedBy: normalizeUserId(itemSnapshot.addedBy),
    purchased: itemSnapshot.purchased,
    createdAt: itemSnapshot.createdAt,
    updatedAt: itemSnapshot.updatedAt,
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
