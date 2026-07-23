import { createClient, SupabaseClient } from "@supabase/supabase-js";

import {
  FreezerItem,
  FreezerDrawerId,
  isFreezerDrawerId,
} from "./freezerItems";
import {
  defaultShoppingCategories,
  defaultShoppingProductCatalogEntries,
  defaultShoppingSections,
  inferShoppingCategoryId,
  isShoppingCategoryId,
  isShoppingHistoryEventType,
  isShoppingSectionColor,
  isShoppingUserId,
  ShoppingCategory,
  ShoppingProductCatalogEntry,
  ShoppingHistoryEvent,
  ShoppingHistoryItemSnapshot,
  ShoppingItem,
  ShoppingSection,
  ShoppingSectionId,
  ShoppingRecategorizationChange,
  ShoppingRecategorizationRun,
  ShoppingUserId,
} from "./shoppingItems";
import type { ShoppingData } from "./shoppingItemsDb";
import { getSupabaseConfig } from "./supabaseConfig";
import type { SupabaseConfig } from "./supabaseConfig";

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

type ShoppingCategoryRow = {
  id: string;
  name: string;
  position: number;
  created_at?: string;
  updated_at?: string;
};

type ShoppingProductCatalogEntryRow = {
  id: string;
  category_id: string;
  name: string;
  normalized_name: string;
  created_at?: string;
  updated_at?: string;
};

type ShoppingRecategorizationRunRow = {
  id: string;
  list_id: string;
  source: string;
  status: string;
  summary: string | null;
  catalog_entries_added: number;
  items_recategorized: number;
  started_at: string;
  finished_at: string;
  created_at: string;
};

type ShoppingRecategorizationChangeRow = {
  id: string;
  run_id: string;
  list_id: string;
  item_id: string;
  item_name: string;
  previous_category_id: string;
  next_category_id: string;
  reason: string | null;
  catalog_entry_id: string | null;
  created_at: string;
};

type PushSubscriptionRow = {
  list_id: string;
  client_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
  last_seen_at: string;
  disabled_at: string | null;
};

type FreezerItemRow = {
  id: string;
  list_id: string;
  name: string;
  quantity?: string | null;
  drawer_id: string;
  frozen_at: string;
  created_at: string;
  updated_at: string;
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

let supabaseClient: SupabaseClient | null = null;

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
  const [
    itemsResult,
    sectionsResult,
    historyResult,
    freezerResult,
    categoriesResult,
    catalogResult,
    recategorizationRunsResult,
    recategorizationChangesResult,
  ] = await Promise.all([
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
    client
      .from("freezer_items")
      .select("*")
      .eq("list_id", config.listId)
      .order("frozen_at", { ascending: true }),
    client
      .from("shopping_categories")
      .select("*")
      .order("position", { ascending: true }),
    client
      .from("shopping_product_catalog_entries")
      .select("*")
      .order("normalized_name", { ascending: true }),
    client
      .from("shopping_recategorization_runs")
      .select("*")
      .eq("list_id", config.listId)
      .order("created_at", { ascending: false })
      .limit(30),
    client
      .from("shopping_recategorization_changes")
      .select("*")
      .eq("list_id", config.listId)
      .order("created_at", { ascending: false })
      .limit(100),
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

  if (freezerResult.error) {
    throw freezerResult.error;
  }

  if (
    categoriesResult.error &&
    !isMissingRelationError(categoriesResult.error)
  ) {
    throw categoriesResult.error;
  }

  if (catalogResult.error && !isMissingRelationError(catalogResult.error)) {
    throw catalogResult.error;
  }

  if (
    recategorizationRunsResult.error &&
    !isMissingRelationError(recategorizationRunsResult.error)
  ) {
    throw recategorizationRunsResult.error;
  }

  if (
    recategorizationChangesResult.error &&
    !isMissingRelationError(recategorizationChangesResult.error)
  ) {
    throw recategorizationChangesResult.error;
  }

  const productCatalogEntries =
    !catalogResult.error && catalogResult.data && catalogResult.data.length > 0
      ? catalogResult.data.map(mapRowToShoppingProductCatalogEntry)
      : defaultShoppingProductCatalogEntries;

  return {
    items: (itemsResult.data ?? []).map((row) =>
      mapRowToShoppingItem(row, productCatalogEntries),
    ),
    sections:
      sectionsResult.data && sectionsResult.data.length > 0
        ? sectionsResult.data.map(mapRowToShoppingSection)
        : defaultShoppingSections,
    historyEvents: (historyResult.data ?? []).map(mapRowToShoppingHistoryEvent),
    freezerItems: (freezerResult.data ?? []).map(mapRowToFreezerItem),
    categories:
      !categoriesResult.error &&
      categoriesResult.data &&
      categoriesResult.data.length > 0
        ? categoriesResult.data.map(mapRowToShoppingCategory)
        : defaultShoppingCategories,
    productCatalogEntries,
    recategorizationRuns:
      !recategorizationRunsResult.error && recategorizationRunsResult.data
        ? recategorizationRunsResult.data.map(
            mapRowToShoppingRecategorizationRun,
          )
        : [],
    recategorizationChanges:
      !recategorizationChangesResult.error && recategorizationChangesResult.data
        ? recategorizationChangesResult.data.map(
            mapRowToShoppingRecategorizationChange,
          )
        : [],
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
  const freezerRows = data.freezerItems.map((item) =>
    mapFreezerItemToRow(item, config.listId),
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

  if (freezerRows.length > 0) {
    const { error } = await client.from("freezer_items").upsert(freezerRows);

    if (error) {
      throw error;
    }
  }

  let deleteFreezerQuery = client
    .from("freezer_items")
    .delete()
    .eq("list_id", config.listId);

  if (data.freezerItems.length > 0) {
    deleteFreezerQuery = deleteFreezerQuery.not(
      "id",
      "in",
      encodePostgrestTextList(data.freezerItems.map((item) => item.id)),
    );
  }

  const { error: deleteFreezerError } = await deleteFreezerQuery;

  if (deleteFreezerError) {
    throw deleteFreezerError;
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
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "freezer_items",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_categories",
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_product_catalog_entries",
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_recategorization_runs",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_recategorization_changes",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .subscribe();

  return () => {
    void getSupabaseClient(config).removeChannel(channel);
  };
}

export type SupabasePushSubscriptionInput = {
  clientId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
};

export async function registerSupabasePushSubscription(
  subscription: SupabasePushSubscriptionInput,
) {
  const config = getSupabaseConfig();

  if (!config) {
    return false;
  }

  const now = new Date().toISOString();
  const row: PushSubscriptionRow = {
    list_id: config.listId,
    client_id: subscription.clientId,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    user_agent: subscription.userAgent,
    last_seen_at: now,
    disabled_at: null,
  };

  const { error } = await getSupabaseClient(config)
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" });

  if (error) {
    throw error;
  }

  return true;
}

export async function disableSupabasePushSubscription(endpoint: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return false;
  }

  const { error } = await getSupabaseClient(config)
    .from("push_subscriptions")
    .update({ disabled_at: new Date().toISOString() })
    .eq("endpoint", endpoint);

  if (error) {
    throw error;
  }

  return true;
}

export function mapRowToShoppingItem(
  row: ShoppingItemRow,
  productCatalogEntries: ShoppingProductCatalogEntry[] = defaultShoppingProductCatalogEntries,
): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity?.trim() ? row.quantity : undefined,
    sectionId: normalizeSectionId(row.section_id),
    categoryId: normalizeCategoryId(
      row.category_id,
      row.name,
      productCatalogEntries,
    ),
    addedBy: normalizeUserId(row.added_by),
    purchased: row.purchased,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

export function mapRowToShoppingCategory(
  row: ShoppingCategoryRow,
): ShoppingCategory {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
  };
}

export function mapRowToShoppingProductCatalogEntry(
  row: ShoppingProductCatalogEntryRow,
): ShoppingProductCatalogEntry {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    normalizedName: row.normalized_name,
  };
}

export function mapRowToShoppingRecategorizationRun(
  row: ShoppingRecategorizationRunRow,
): ShoppingRecategorizationRun {
  return {
    id: row.id,
    source: "codex",
    status: row.status === "failed" ? "failed" : "success",
    summary: row.summary,
    catalogEntriesAdded: row.catalog_entries_added,
    itemsRecategorized: row.items_recategorized,
    startedAt: Date.parse(row.started_at),
    finishedAt: Date.parse(row.finished_at),
    createdAt: Date.parse(row.created_at),
  };
}

export function mapRowToShoppingRecategorizationChange(
  row: ShoppingRecategorizationChangeRow,
): ShoppingRecategorizationChange {
  return {
    id: row.id,
    runId: row.run_id,
    itemId: row.item_id,
    itemName: row.item_name,
    previousCategoryId: row.previous_category_id,
    nextCategoryId: row.next_category_id,
    reason: row.reason,
    catalogEntryId: row.catalog_entry_id,
    createdAt: Date.parse(row.created_at),
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

export function mapRowToFreezerItem(row: FreezerItemRow): FreezerItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity?.trim() ? row.quantity : undefined,
    drawerId: normalizeFreezerDrawerId(row.drawer_id),
    frozenAt: Date.parse(row.frozen_at),
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

export function mapFreezerItemToRow(
  item: FreezerItem,
  listId: string,
): FreezerItemRow {
  return {
    id: item.id,
    list_id: listId,
    name: item.name,
    quantity: item.quantity ?? null,
    drawer_id: item.drawerId,
    frozen_at: new Date(item.frozenAt).toISOString(),
    created_at: new Date(item.createdAt).toISOString(),
    updated_at: new Date(item.updatedAt).toISOString(),
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

function normalizeCategoryId(
  value: string | undefined,
  itemName: string,
  productCatalogEntries: ShoppingProductCatalogEntry[] = defaultShoppingProductCatalogEntries,
) {
  return value && isShoppingCategoryId(value)
    ? value
    : inferShoppingCategoryId(itemName, productCatalogEntries);
}

function normalizeFreezerDrawerId(value: string): FreezerDrawerId {
  return isFreezerDrawerId(value) ? value : "top";
}

function isMissingRelationError(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.message?.includes("does not exist");
}

function encodePostgrestTextList(values: string[]) {
  return `(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",")})`;
}
