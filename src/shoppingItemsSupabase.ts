import { createClient, SupabaseClient } from "@supabase/supabase-js";

import {
  FreezerItem,
  FreezerDrawerId,
  isFreezerDrawerId,
} from "./freezerItems";
import {
  CanonicalProductComparisonUnit,
  defaultShoppingCategories,
  defaultShoppingProductCatalogEntries,
  defaultShoppingSections,
  inferShoppingCategoryId,
  isShoppingProductNormalizationChangeAction,
  isShoppingCategoryId,
  isShoppingHistoryEventType,
  isShoppingSectionColor,
  isShoppingUserId,
  normalizeCatalogText,
  ShoppingCategory,
  ShoppingCanonicalProduct,
  ShoppingCanonicalProductAlias,
  ShoppingProductCatalogEntry,
  ShoppingHistoryEvent,
  ShoppingHistoryItemSnapshot,
  ShoppingItem,
  ShoppingProductNormalizationChange,
  ShoppingProductNormalizationRun,
  ShoppingPriceObservation,
  ShoppingPriceObservationPriceKind,
  ShoppingPriceObservationSource,
  ShoppingTicket,
  ShoppingTicketFile,
  ShoppingTicketLine,
  ShoppingTicketLineStatus,
  ShoppingTicketStatus,
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
  canonical_product_id?: string | null;
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

type ShoppingCanonicalProductRow = {
  id: string;
  list_id: string;
  name: string;
  normalized_name: string;
  comparison_unit: string;
  created_at: string;
  updated_at: string;
};

type ShoppingCanonicalProductAliasRow = {
  id: string;
  list_id: string;
  canonical_product_id: string;
  alias: string;
  normalized_alias: string;
  created_at: string;
};

type ShoppingProductNormalizationRunRow = {
  id: string;
  list_id: string;
  source: string;
  status: string;
  summary: string | null;
  aliases_created: number;
  items_touched: number;
  quantities_merged: number;
  canonical_products_merged: number;
  started_at: string;
  finished_at: string;
  created_at: string;
};

type ShoppingProductNormalizationChangeRow = {
  id: string;
  run_id: string;
  list_id: string;
  action: string;
  item_id: string | null;
  previous_item_name: string | null;
  next_item_name: string | null;
  previous_canonical_product_id: string | null;
  next_canonical_product_id: string | null;
  quantity_before: string | null;
  quantity_after: string | null;
  reason: string | null;
  created_at: string;
};

type ShoppingTicketRow = {
  id: string;
  list_id: string;
  section_id: string;
  uploaded_by: string;
  status: string;
  file_count: number;
  uploaded_at: string;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type ShoppingTicketFileRow = {
  id: string;
  ticket_id: string;
  list_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  position: number;
  uploaded_at: string;
  created_at: string;
};

type ShoppingTicketLineRow = {
  id: string;
  ticket_id: string;
  list_id: string;
  line_index: number;
  raw_text: string | null;
  product_name: string | null;
  canonical_product_id: string | null;
  quantity: string | null;
  unit_price: number | null;
  total_price: number | null;
  original_total_price: number | null;
  discount_total: number | null;
  status: string;
  needs_review: boolean;
  review_reason: string | null;
  created_at: string;
  updated_at: string;
};

type ShoppingPriceObservationRow = {
  id: string;
  list_id: string;
  source: string;
  ticket_id: string | null;
  ticket_line_id: string | null;
  canonical_product_id: string;
  section_id: string;
  observed_at: string;
  product_name: string | null;
  quantity: string | null;
  comparison_unit: string;
  price_kind: string;
  observed_price: number;
  unit_price: number | null;
  total_price: number | null;
  original_total_price: number | null;
  discount_total: number | null;
  created_at: string;
  updated_at: string;
};

type ShoppingTicketLineResolutionInput = {
  ticket: ShoppingTicket;
  line: ShoppingTicketLine;
  canonicalProduct: ShoppingCanonicalProduct;
  createAlias: boolean;
  alias: string;
  removeExistingAlias?: boolean;
  replaceProductName?: boolean;
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

export type ShoppingTicketUploadInput = {
  sectionId: ShoppingSectionId;
  uploadedBy: ShoppingUserId;
  files: File[];
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

export async function getSupabaseShoppingTickets(): Promise<
  ShoppingTicket[] | null
> {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const client = getSupabaseClient(config);
  const [ticketsResult, filesResult, linesResult] = await Promise.all([
    client
      .from("shopping_tickets")
      .select("*")
      .eq("list_id", config.listId)
      .order("uploaded_at", { ascending: false }),
    client
      .from("shopping_ticket_files")
      .select("*")
      .eq("list_id", config.listId)
      .order("position", { ascending: true }),
    client
      .from("shopping_ticket_lines")
      .select("*")
      .eq("list_id", config.listId)
      .order("line_index", { ascending: true }),
  ]);

  if (ticketsResult.error && !isMissingRelationError(ticketsResult.error)) {
    throw ticketsResult.error;
  }

  if (filesResult.error && !isMissingRelationError(filesResult.error)) {
    throw filesResult.error;
  }

  if (linesResult.error && !isMissingRelationError(linesResult.error)) {
    throw linesResult.error;
  }

  if (ticketsResult.error) {
    return [];
  }

  const filesByTicketId = groupRowsByTicketId(
    (filesResult.data ?? []).map(mapRowToShoppingTicketFile),
  );
  const linesByTicketId = groupRowsByTicketId(
    (linesResult.data ?? []).map(mapRowToShoppingTicketLine),
  );

  return (ticketsResult.data ?? []).map((row) =>
    mapRowToShoppingTicket(
      row,
      filesByTicketId.get(row.id) ?? [],
      linesByTicketId.get(row.id) ?? [],
    ),
  );
}

export async function uploadSupabaseShoppingTicket({
  files,
  sectionId,
  uploadedBy,
}: ShoppingTicketUploadInput): Promise<ShoppingTicket | null> {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  if (files.length === 0) {
    throw new Error("Ticket files are required.");
  }

  const client = getSupabaseClient(config);
  const ticketId = crypto.randomUUID();
  const uploadedAt = new Date().toISOString();
  const fileRows: Omit<ShoppingTicketFileRow, "id" | "created_at">[] = [];

  for (const [index, file] of files.entries()) {
    const sha256 = await calculateFileSha256(file);
    const storagePath = buildTicketStoragePath(
      config.listId,
      ticketId,
      index,
      file.name,
    );
    const { error } = await client.storage
      .from("shopping-tickets")
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    fileRows.push({
      ticket_id: ticketId,
      list_id: config.listId,
      storage_bucket: "shopping-tickets",
      storage_path: storagePath,
      file_name: file.name,
      content_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      sha256,
      position: index,
      uploaded_at: uploadedAt,
    });
  }

  const { data: ticketRows, error: ticketError } = await client
    .from("shopping_tickets")
    .insert([
      {
        id: ticketId,
        list_id: config.listId,
        section_id: sectionId,
        uploaded_by: uploadedBy,
        status: "pending",
        file_count: fileRows.length,
        uploaded_at: uploadedAt,
      },
    ])
    .select("*");

  if (ticketError) {
    throw ticketError;
  }

  const { data: insertedFileRows, error: fileError } = await client
    .from("shopping_ticket_files")
    .insert(fileRows)
    .select("*");

  if (fileError) {
    throw fileError;
  }

  const [ticketRow] = ticketRows ?? [];

  if (!ticketRow) {
    throw new Error("Ticket was not created.");
  }

  return mapRowToShoppingTicket(
    ticketRow,
    (insertedFileRows ?? []).map(mapRowToShoppingTicketFile),
    [],
  );
}

export async function createSupabaseTicketFileUrl(file: ShoppingTicketFile) {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const { data, error } = await getSupabaseClient(config)
    .storage.from(file.storageBucket)
    .createSignedUrl(file.storagePath, 60 * 5);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function resolveSupabaseTicketLine({
  ticket,
  line,
  canonicalProduct,
  createAlias,
  alias,
  removeExistingAlias = false,
  replaceProductName = false,
}: ShoppingTicketLineResolutionInput) {
  const config = getSupabaseConfig();

  if (!config) {
    return;
  }

  const client = getSupabaseClient(config);
  const nextProductName = replaceProductName ? canonicalProduct.name : null;
  const lineUpdate = await client
    .from("shopping_ticket_lines")
    .update({
      canonical_product_id: canonicalProduct.id,
      needs_review: false,
      ...(nextProductName ? { product_name: nextProductName } : {}),
      review_reason: null,
      status: "processed",
    })
    .eq("id", line.id)
    .eq("ticket_id", ticket.id)
    .eq("list_id", config.listId);

  if (lineUpdate.error) {
    throw lineUpdate.error;
  }

  const normalizedAlias = normalizeCatalogText(alias);

  if (removeExistingAlias && line.canonicalProductId && normalizedAlias) {
    const aliasDeleteResult = await client
      .from("shopping_canonical_product_aliases")
      .delete()
      .eq("list_id", config.listId)
      .eq("canonical_product_id", line.canonicalProductId)
      .eq("normalized_alias", normalizedAlias);

    if (aliasDeleteResult.error) {
      throw aliasDeleteResult.error;
    }
  }

  if (createAlias && normalizedAlias) {
    const aliasResult = await client
      .from("shopping_canonical_product_aliases")
      .upsert(
        {
          id: crypto.randomUUID(),
          list_id: config.listId,
          canonical_product_id: canonicalProduct.id,
          alias: alias.trim(),
          normalized_alias: normalizedAlias,
        },
        { onConflict: "list_id,normalized_alias" },
      );

    if (aliasResult.error) {
      throw aliasResult.error;
    }
  }

  const priceObservationRow = mapResolvedLineToPriceObservationRow(
    config.listId,
    ticket,
    {
      ...line,
      productName: nextProductName ?? line.productName,
    },
    canonicalProduct,
  );

  if (priceObservationRow) {
    const observationResult = await client
      .from("shopping_price_observations")
      .upsert(priceObservationRow, { onConflict: "ticket_line_id" });

    if (observationResult.error) {
      throw observationResult.error;
    }
  }

  await updateSupabaseTicketStatusFromLines(client, config.listId, ticket.id);
}

export async function excludeSupabaseTicketLine(
  ticket: ShoppingTicket,
  line: ShoppingTicketLine,
) {
  const config = getSupabaseConfig();

  if (!config) {
    return;
  }

  const client = getSupabaseClient(config);
  const lineUpdate = await client
    .from("shopping_ticket_lines")
    .update({
      canonical_product_id: null,
      needs_review: false,
      review_reason: null,
      status: "excluded",
    })
    .eq("id", line.id)
    .eq("ticket_id", ticket.id)
    .eq("list_id", config.listId);

  if (lineUpdate.error) {
    throw lineUpdate.error;
  }

  await updateSupabaseTicketStatusFromLines(client, config.listId, ticket.id);
}

export async function getSupabasePriceObservations(): Promise<
  ShoppingPriceObservation[] | null
> {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const client = getSupabaseClient(config);
  const result = await client
    .from("shopping_price_observations")
    .select("*")
    .eq("list_id", config.listId)
    .order("observed_at", { ascending: false });

  if (result.error && !isMissingRelationError(result.error)) {
    throw result.error;
  }

  if (result.error) {
    return [];
  }

  return (result.data ?? []).map(mapRowToShoppingPriceObservation);
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
    canonicalProductsResult,
    canonicalProductAliasesResult,
    normalizationRunsResult,
    normalizationChangesResult,
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
    client
      .from("shopping_canonical_products")
      .select("*")
      .eq("list_id", config.listId)
      .order("normalized_name", { ascending: true }),
    client
      .from("shopping_canonical_product_aliases")
      .select("*")
      .eq("list_id", config.listId)
      .order("normalized_alias", { ascending: true }),
    client
      .from("shopping_product_normalization_runs")
      .select("*")
      .eq("list_id", config.listId)
      .order("created_at", { ascending: false })
      .limit(30),
    client
      .from("shopping_product_normalization_changes")
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

  if (
    canonicalProductsResult.error &&
    !isMissingRelationError(canonicalProductsResult.error)
  ) {
    throw canonicalProductsResult.error;
  }

  if (
    canonicalProductAliasesResult.error &&
    !isMissingRelationError(canonicalProductAliasesResult.error)
  ) {
    throw canonicalProductAliasesResult.error;
  }

  if (
    normalizationRunsResult.error &&
    !isMissingRelationError(normalizationRunsResult.error)
  ) {
    throw normalizationRunsResult.error;
  }

  if (
    normalizationChangesResult.error &&
    !isMissingRelationError(normalizationChangesResult.error)
  ) {
    throw normalizationChangesResult.error;
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
    canonicalProducts:
      !canonicalProductsResult.error && canonicalProductsResult.data
        ? canonicalProductsResult.data.map(mapRowToShoppingCanonicalProduct)
        : [],
    canonicalProductAliases:
      !canonicalProductAliasesResult.error && canonicalProductAliasesResult.data
        ? canonicalProductAliasesResult.data.map(
            mapRowToShoppingCanonicalProductAlias,
          )
        : [],
    productNormalizationRuns:
      !normalizationRunsResult.error && normalizationRunsResult.data
        ? normalizationRunsResult.data.map(
            mapRowToShoppingProductNormalizationRun,
          )
        : [],
    productNormalizationChanges:
      !normalizationChangesResult.error && normalizationChangesResult.data
        ? normalizationChangesResult.data.map(
            mapRowToShoppingProductNormalizationChange,
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
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_canonical_products",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_canonical_product_aliases",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_product_normalization_runs",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_product_normalization_changes",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_tickets",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_ticket_files",
        filter: `list_id=eq.${config.listId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_ticket_lines",
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

  const { error } = await getSupabaseClient(config).rpc(
    "register_push_subscription",
    {
      p_auth: subscription.auth,
      p_client_id: subscription.clientId,
      p_endpoint: subscription.endpoint,
      p_list_id: config.listId,
      p_p256dh: subscription.p256dh,
      p_user_agent: subscription.userAgent,
    },
  );

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

  const { error } = await getSupabaseClient(config).rpc(
    "disable_push_subscription",
    {
      p_endpoint: endpoint,
    },
  );

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
    canonicalProductId: row.canonical_product_id?.trim() || undefined,
    addedBy: normalizeUserId(row.added_by),
    purchased: row.purchased,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

export function mapRowToShoppingCanonicalProduct(
  row: ShoppingCanonicalProductRow,
): ShoppingCanonicalProduct {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    comparisonUnit: normalizeComparisonUnit(row.comparison_unit),
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

export function mapRowToShoppingCanonicalProductAlias(
  row: ShoppingCanonicalProductAliasRow,
): ShoppingCanonicalProductAlias {
  return {
    id: row.id,
    canonicalProductId: row.canonical_product_id,
    alias: row.alias,
    normalizedAlias: row.normalized_alias,
    createdAt: Date.parse(row.created_at),
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

export function mapRowToShoppingProductNormalizationRun(
  row: ShoppingProductNormalizationRunRow,
): ShoppingProductNormalizationRun {
  return {
    id: row.id,
    source: "codex",
    status: row.status === "failed" ? "failed" : "success",
    summary: row.summary,
    aliasesCreated: row.aliases_created,
    itemsTouched: row.items_touched,
    quantitiesMerged: row.quantities_merged,
    canonicalProductsMerged: row.canonical_products_merged,
    startedAt: Date.parse(row.started_at),
    finishedAt: Date.parse(row.finished_at),
    createdAt: Date.parse(row.created_at),
  };
}

export function mapRowToShoppingProductNormalizationChange(
  row: ShoppingProductNormalizationChangeRow,
): ShoppingProductNormalizationChange {
  return {
    id: row.id,
    runId: row.run_id,
    action: isShoppingProductNormalizationChangeAction(row.action)
      ? row.action
      : "renamed",
    itemId: row.item_id,
    previousItemName: row.previous_item_name,
    nextItemName: row.next_item_name,
    previousCanonicalProductId: row.previous_canonical_product_id,
    nextCanonicalProductId: row.next_canonical_product_id,
    quantityBefore: row.quantity_before,
    quantityAfter: row.quantity_after,
    reason: row.reason,
    createdAt: Date.parse(row.created_at),
  };
}

export function mapRowToShoppingTicket(
  row: ShoppingTicketRow,
  files: ShoppingTicketFile[] = [],
  lines: ShoppingTicketLine[] = [],
): ShoppingTicket {
  return {
    id: row.id,
    sectionId: normalizeSectionId(row.section_id),
    uploadedBy: normalizeUserId(row.uploaded_by),
    status: normalizeTicketStatus(row.status),
    fileCount: row.file_count,
    uploadedAt: Date.parse(row.uploaded_at),
    processedAt: row.processed_at ? Date.parse(row.processed_at) : null,
    errorMessage: row.error_message,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
    files,
    lines,
  };
}

export function mapRowToShoppingTicketFile(
  row: ShoppingTicketFileRow,
): ShoppingTicketFile {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    position: row.position,
    uploadedAt: Date.parse(row.uploaded_at),
  };
}

export function mapRowToShoppingTicketLine(
  row: ShoppingTicketLineRow,
): ShoppingTicketLine {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    lineIndex: row.line_index,
    rawText: row.raw_text,
    productName: row.product_name,
    canonicalProductId: row.canonical_product_id,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
    originalTotalPrice: row.original_total_price,
    discountTotal: row.discount_total,
    status: normalizeTicketLineStatus(row.status),
    needsReview: row.needs_review,
    reviewReason: row.review_reason,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

export function mapRowToShoppingPriceObservation(
  row: ShoppingPriceObservationRow,
): ShoppingPriceObservation {
  return {
    id: row.id,
    source: normalizePriceObservationSource(row.source),
    ticketId: row.ticket_id,
    ticketLineId: row.ticket_line_id,
    canonicalProductId: row.canonical_product_id,
    sectionId: row.section_id,
    observedAt: Date.parse(row.observed_at),
    productName: row.product_name,
    quantity: row.quantity,
    comparisonUnit: normalizeComparisonUnit(row.comparison_unit),
    priceKind: normalizePriceObservationKind(row.price_kind),
    observedPrice: row.observed_price,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
    originalTotalPrice: row.original_total_price,
    discountTotal: row.discount_total,
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
    canonical_product_id: item.canonicalProductId ?? null,
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
      canonicalProductId: itemSnapshot.canonicalProductId,
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
    canonicalProductId: itemSnapshot.canonicalProductId,
    addedBy: normalizeUserId(itemSnapshot.addedBy),
    purchased: itemSnapshot.purchased,
    createdAt: itemSnapshot.createdAt,
    updatedAt: itemSnapshot.updatedAt,
  };
}

function mapResolvedLineToPriceObservationRow(
  listId: string,
  ticket: ShoppingTicket,
  line: ShoppingTicketLine,
  canonicalProduct: ShoppingCanonicalProduct,
) {
  const observedPrice = getResolvedLineObservedPrice(line);

  if (observedPrice === null) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    list_id: listId,
    source: "ticket",
    ticket_id: ticket.id,
    ticket_line_id: line.id,
    canonical_product_id: canonicalProduct.id,
    section_id: ticket.sectionId,
    observed_at: new Date(
      ticket.processedAt ?? ticket.uploadedAt,
    ).toISOString(),
    product_name: line.productName ?? line.rawText,
    quantity: line.quantity,
    comparison_unit: canonicalProduct.comparisonUnit,
    price_kind: line.unitPrice !== null ? "unit" : "total",
    observed_price: observedPrice,
    unit_price: line.unitPrice,
    total_price: line.totalPrice,
    original_total_price: line.originalTotalPrice,
    discount_total: line.discountTotal,
  };
}

function getResolvedLineObservedPrice(line: ShoppingTicketLine) {
  if (
    line.unitPrice !== null &&
    line.originalTotalPrice !== null &&
    line.totalPrice !== null &&
    line.totalPrice > 0
  ) {
    return (
      Math.round(
        ((line.unitPrice * line.originalTotalPrice) / line.totalPrice) * 10_000,
      ) / 10_000
    );
  }

  return line.unitPrice ?? line.originalTotalPrice ?? line.totalPrice;
}

async function updateSupabaseTicketStatusFromLines(
  client: SupabaseClient,
  listId: string,
  ticketId: string,
) {
  const linesResult = await client
    .from("shopping_ticket_lines")
    .select("needs_review")
    .eq("ticket_id", ticketId)
    .eq("list_id", listId);

  if (linesResult.error) {
    throw linesResult.error;
  }

  const hasReviewLines = (linesResult.data ?? []).some(
    (line) => line.needs_review,
  );
  const ticketUpdate = await client
    .from("shopping_tickets")
    .update({
      error_message: null,
      status: hasReviewLines ? "needs_review" : "processed",
    })
    .eq("id", ticketId)
    .eq("list_id", listId);

  if (ticketUpdate.error) {
    throw ticketUpdate.error;
  }
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

function normalizeTicketStatus(value: string): ShoppingTicketStatus {
  return value === "processing" ||
    value === "processed" ||
    value === "needs_review" ||
    value === "failed"
    ? value
    : "pending";
}

function normalizeTicketLineStatus(value: string): ShoppingTicketLineStatus {
  return value === "needs_review" || value === "excluded" ? value : "processed";
}

function normalizeComparisonUnit(
  value: string,
): CanonicalProductComparisonUnit {
  return value === "kg" || value === "l" || value === "unit" ? value : "unit";
}

function normalizePriceObservationSource(
  value: string,
): ShoppingPriceObservationSource {
  return value === "external" ? "external" : "ticket";
}

function normalizePriceObservationKind(
  value: string,
): ShoppingPriceObservationPriceKind {
  return value === "total" ? "total" : "unit";
}

function groupRowsByTicketId<T extends { ticketId: string }>(rows: T[]) {
  return rows.reduce((groups, row) => {
    const currentRows = groups.get(row.ticketId) ?? [];
    currentRows.push(row);
    groups.set(row.ticketId, currentRows);

    return groups;
  }, new Map<string, T[]>());
}

async function calculateFileSha256(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildTicketStoragePath(
  listId: string,
  ticketId: string,
  position: number,
  fileName: string,
) {
  return `${listId}/${ticketId}/${String(position).padStart(2, "0")}-${sanitizeStorageFileName(fileName)}`;
}

function sanitizeStorageFileName(fileName: string) {
  const trimmedName = fileName.trim() || "ticket";
  const normalizedName = trimmedName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLocaleLowerCase("es-ES");

  return normalizedName || "ticket";
}

function isMissingRelationError(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.message?.includes("does not exist");
}

function encodePostgrestTextList(values: string[]) {
  return `(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",")})`;
}
