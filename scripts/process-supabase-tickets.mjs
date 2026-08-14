#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(scriptDir, "..");
let config;
let supabase;

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
  });
}

async function main() {
  const [, , command, ...args] = process.argv;

  config = await readSupabaseConfig();
  supabase = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false },
  });

  if (command === "export") {
    const [contextPath, filesDir] = args;

    if (!contextPath || !filesDir) {
      fail(
        "Usage: process-supabase-tickets.mjs export <context-json> <files-dir>",
      );
    }

    await writeFile(
      contextPath,
      JSON.stringify(await exportContext(filesDir), null, 2),
    );
    return;
  }

  if (command === "apply") {
    const [extractionPath] = args;

    if (!extractionPath) {
      fail("Usage: process-supabase-tickets.mjs apply <extraction-json>");
    }

    await applyExtraction(
      JSON.parse(await readFile(extractionPath, "utf8")),
      new Date().toISOString(),
    );
    return;
  }

  if (command === "fail") {
    const [contextPath, ...messageParts] = args;

    if (!contextPath) {
      fail("Usage: process-supabase-tickets.mjs fail <context-json> [message]");
    }

    await markContextTicketsFailed(
      JSON.parse(await readFile(contextPath, "utf8")),
      messageParts.join(" ") || "No se pudo procesar el ticket.",
      new Date().toISOString(),
    );
    return;
  }

  fail("Usage: process-supabase-tickets.mjs <export|apply|fail> <args...>");
}

async function exportContext(filesDir) {
  const [sections, tickets, files, canonicalProducts, canonicalProductAliases] =
    await Promise.all([
      fetchRows("shopping_sections", null, null, "list_id.asc,position.asc"),
      fetchRows("shopping_tickets", null, null, "list_id.asc,uploaded_at.asc"),
      fetchRows(
        "shopping_ticket_files",
        null,
        null,
        "list_id.asc,position.asc",
      ),
      fetchRows(
        "shopping_canonical_products",
        null,
        null,
        "list_id.asc,normalized_name.asc",
      ),
      fetchRows(
        "shopping_canonical_product_aliases",
        null,
        null,
        "list_id.asc,normalized_alias.asc",
      ),
    ]);
  const pendingTickets = tickets.filter(
    (ticket) => ticket.status === "pending",
  );
  const pendingTicketIds = new Set(pendingTickets.map((ticket) => ticket.id));
  const filesByTicketId = groupRowsByTicketId(
    files.filter((file) => pendingTicketIds.has(file.ticket_id)),
  );

  await mkdir(filesDir, { recursive: true });

  const exportedTickets = [];

  for (const ticket of pendingTickets) {
    const ticketFiles = filesByTicketId.get(ticket.id) ?? [];
    const ticketDir = path.join(filesDir, ticket.id);

    await mkdir(ticketDir, { recursive: true });

    const downloadedFiles = [];

    for (const file of ticketFiles) {
      const extension = path.extname(file.file_name) || ".bin";
      const localPath = path.join(
        ticketDir,
        `${String(file.position).padStart(2, "0")}${extension}`,
      );

      await downloadTicketFile(file, localPath);
      downloadedFiles.push({
        id: file.id,
        file_name: file.file_name,
        content_type: file.content_type,
        size_bytes: Number(file.size_bytes),
        position: file.position,
        local_path: localPath,
      });
    }

    exportedTickets.push({
      id: ticket.id,
      list_id: ticket.list_id,
      section_id: ticket.section_id,
      uploaded_by: ticket.uploaded_by,
      uploaded_at: ticket.uploaded_at,
      file_count: ticket.file_count,
      files: downloadedFiles,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    listIds: [...new Set(pendingTickets.map((ticket) => ticket.list_id))],
    rules: {
      processing:
        "Procesa todos los tickets pendientes del contexto. Si una línea es dudosa, marca solo esa línea como needs_review.",
      prices:
        "Usa total_price como precio final. Usa original_total_price y discount_total solo si el ticket muestra descuentos claros.",
      status:
        "Si alguna línea necesita revisión, el ticket final debe quedar needs_review; si todas son fiables, processed.",
      dates:
        "Usa la fecha del ticket si aparece en la imagen. Si no, usa uploaded_at.",
      canonicalProducts:
        "Prefiere canónicos generales y existentes. Crea nuevos solo cuando no haya uno adecuado.",
    },
    sections: sections.map((section) => ({
      id: section.id,
      list_id: section.list_id,
      name: section.name,
    })),
    canonicalProducts: canonicalProducts.map((product) => ({
      id: product.id,
      list_id: product.list_id,
      name: product.name,
      normalized_name: product.normalized_name,
      comparison_unit: product.comparison_unit,
    })),
    canonicalProductAliases: canonicalProductAliases.map((alias) => ({
      id: alias.id,
      list_id: alias.list_id,
      canonical_product_id: alias.canonical_product_id,
      alias: alias.alias,
      normalized_alias: alias.normalized_alias,
    })),
    tickets: exportedTickets,
  };
}

async function applyExtraction(rawExtraction, startedAt) {
  const extractionTickets = normalizeExtraction(rawExtraction);
  const [tickets, canonicalProducts, canonicalProductAliases] =
    await Promise.all([
      fetchRows("shopping_tickets"),
      fetchRows(
        "shopping_canonical_products",
        null,
        null,
        "list_id.asc,normalized_name.asc",
      ),
      fetchRows(
        "shopping_canonical_product_aliases",
        null,
        null,
        "list_id.asc,normalized_alias.asc",
      ),
    ]);
  const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const catalogsByListId = new Map();

  for (const product of canonicalProducts) {
    const catalog = getCatalog(catalogsByListId, product.list_id);
    catalog.productsById.set(product.id, product);
    catalog.productsByNormalizedName.set(product.normalized_name, product);
  }

  for (const alias of canonicalProductAliases) {
    const catalog = getCatalog(catalogsByListId, alias.list_id);
    catalog.aliasesByNormalizedAlias.set(alias.normalized_alias, alias);
  }

  for (const ticket of extractionTickets) {
    const currentTicket = ticketsById.get(ticket.id);

    if (!currentTicket) {
      fail(`Unknown ticket id: ${ticket.id}`);
    }

    if (
      currentTicket.status !== "pending" &&
      currentTicket.status !== "processing" &&
      currentTicket.status !== "needs_review"
    ) {
      fail(`Ticket ${ticket.id} is already ${currentTicket.status}.`);
    }
  }

  for (const ticket of extractionTickets) {
    const currentTicket = ticketsById.get(ticket.id);
    const listId = currentTicket.list_id;

    await patchRows(
      "shopping_tickets",
      `id=eq.${encodeURIComponent(ticket.id)}&list_id=eq.${encodeURIComponent(listId)}`,
      { status: "processing", error_message: null },
    );
  }

  let insertedLineCount = 0;
  let reviewLineCount = 0;
  const statsByListId = new Map();

  for (const ticket of extractionTickets) {
    const currentTicket = ticketsById.get(ticket.id);
    const listId = currentTicket.list_id;
    const catalog = getCatalog(catalogsByListId, listId);
    const plannedProductsByClientId = new Map();

    for (const product of ticket.canonicalProducts) {
      const normalizedName = normalizeCatalogText(
        product.normalized_name || product.name,
      );
      const existingProduct =
        catalog.productsByNormalizedName.get(normalizedName);

      if (existingProduct) {
        plannedProductsByClientId.set(product.client_id, existingProduct);
        continue;
      }

      const [insertedProduct] = await insertRowsReturning(
        "shopping_canonical_products",
        [
          {
            list_id: listId,
            name: product.name,
            normalized_name: normalizedName,
            comparison_unit: product.comparison_unit,
          },
        ],
      );

      if (insertedProduct) {
        catalog.productsById.set(insertedProduct.id, insertedProduct);
        catalog.productsByNormalizedName.set(
          insertedProduct.normalized_name,
          insertedProduct,
        );
        plannedProductsByClientId.set(product.client_id, insertedProduct);
      }
    }

    const aliasRows = [];
    const lineRows = ticket.lines.map((line) => {
      const canonicalProductId = resolveCanonicalProductId(
        line.canonical_product_id,
        catalog.productsById,
        plannedProductsByClientId,
      );

      if (!canonicalProductId && !line.needs_review) {
        fail(
          `Line ${line.line_index} in ticket ${ticket.id} must have canonical_product_id or needs_review=true.`,
        );
      }

      if (canonicalProductId && line.product_name) {
        const normalizedAlias = normalizeCatalogText(line.product_name);
        const existingAlias =
          catalog.aliasesByNormalizedAlias.get(normalizedAlias);

        if (!existingAlias) {
          aliasRows.push({
            list_id: listId,
            canonical_product_id: canonicalProductId,
            alias: line.product_name,
            normalized_alias: normalizedAlias,
          });
          catalog.aliasesByNormalizedAlias.set(normalizedAlias, {
            canonical_product_id: canonicalProductId,
          });
        }
      }

      return {
        ticket_id: ticket.id,
        list_id: listId,
        line_index: line.line_index,
        raw_text: line.raw_text || null,
        product_name: line.product_name || null,
        canonical_product_id: canonicalProductId || null,
        quantity: line.quantity || null,
        unit_price: line.unit_price,
        total_price: line.total_price,
        original_total_price: line.original_total_price,
        discount_total: line.discount_total,
        status: line.needs_review ? "needs_review" : "processed",
        needs_review: line.needs_review,
        review_reason: line.needs_review
          ? line.review_reason || "Línea marcada por Codex para revisión."
          : null,
      };
    });

    await upsertRows(
      "shopping_canonical_product_aliases",
      aliasRows,
      "list_id,normalized_alias",
    );
    await upsertRows("shopping_ticket_lines", lineRows, "ticket_id,line_index");
    await upsertRows(
      "shopping_price_observations",
      await buildPriceObservationRows({
        currentTicket,
        lineRows,
        productsById: catalog.productsById,
        ticket,
        listId,
      }),
      "ticket_line_id",
    );

    insertedLineCount += lineRows.length;
    reviewLineCount += lineRows.filter((line) => line.needs_review).length;

    const stats = statsByListId.get(listId) ?? {
      linesAccepted: 0,
      linesNeedingReview: 0,
      ticketsProcessed: 0,
    };
    stats.linesAccepted += lineRows.filter((line) => !line.needs_review).length;
    stats.linesNeedingReview += lineRows.filter(
      (line) => line.needs_review,
    ).length;
    stats.ticketsProcessed += 1;
    statsByListId.set(listId, stats);

    const hasReview = lineRows.some((line) => line.needs_review);
    const status = hasReview ? "needs_review" : "processed";

    await patchRows(
      "shopping_tickets",
      `id=eq.${encodeURIComponent(ticket.id)}&list_id=eq.${encodeURIComponent(listId)}`,
      {
        status,
        processed_at: new Date().toISOString(),
        error_message: null,
      },
    );
  }

  for (const [listId, stats] of statsByListId) {
    await recordTicketProcessingRun({
      errorMessage: null,
      finishedAt: new Date().toISOString(),
      linesAccepted: stats.linesAccepted,
      linesNeedingReview: stats.linesNeedingReview,
      listId,
      startedAt,
      status: "success",
      summary: `Processed ${stats.ticketsProcessed} ticket(s), ${stats.linesAccepted} accepted line(s), ${stats.linesNeedingReview} review line(s).`,
      ticketsFailed: 0,
      ticketsProcessed: stats.ticketsProcessed,
    });
  }

  console.log(
    `Processed ${extractionTickets.length} ticket(s), ${insertedLineCount} line(s), ${reviewLineCount} needing review.`,
  );
}

async function buildPriceObservationRows({
  currentTicket,
  lineRows,
  productsById,
  ticket,
  listId,
}) {
  const persistedLines = await fetchRows(
    "shopping_ticket_lines",
    "ticket_id",
    ticket.id,
    "line_index.asc",
  );
  const persistedLinesByLineIndex = new Map(
    persistedLines.map((line) => [line.line_index, line]),
  );
  const observedAt =
    ticket.purchased_at ||
    currentTicket.uploaded_at ||
    new Date().toISOString();
  const observationRows = [];

  for (const line of lineRows) {
    const ticketLine = persistedLinesByLineIndex.get(line.line_index);
    const canonicalProduct = line.canonical_product_id
      ? productsById.get(line.canonical_product_id)
      : null;
    const observedPrice = calculateObservedPrice(line);

    if (
      !ticketLine ||
      !canonicalProduct ||
      line.needs_review ||
      line.status !== "processed" ||
      observedPrice === null
    ) {
      continue;
    }

    observationRows.push({
      list_id: listId,
      source: "ticket",
      ticket_id: ticket.id,
      ticket_line_id: ticketLine.id,
      canonical_product_id: line.canonical_product_id,
      section_id: currentTicket.section_id,
      observed_at: observedAt,
      product_name: line.product_name,
      quantity: line.quantity,
      comparison_unit: canonicalProduct.comparison_unit,
      price_kind: line.unit_price === null ? "total" : "unit",
      observed_price: observedPrice,
      unit_price: line.unit_price,
      total_price: line.total_price,
      original_total_price: line.original_total_price,
      discount_total: line.discount_total,
    });
  }

  return observationRows;
}

export function calculateObservedPrice(line) {
  if (line.unit_price !== null) {
    if (
      line.original_total_price !== null &&
      line.total_price !== null &&
      line.total_price > 0
    ) {
      return roundPrice(
        (line.unit_price * line.original_total_price) / line.total_price,
        4,
      );
    }

    return line.unit_price;
  }

  return line.original_total_price ?? line.total_price;
}

function roundPrice(value, decimals) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

async function markContextTicketsFailed(context, message, startedAt) {
  const tickets = Array.isArray(context?.tickets) ? context.tickets : [];
  const trimmedMessage = message.trim().slice(0, 500);
  const failedByListId = new Map();

  for (const ticket of tickets) {
    if (typeof ticket?.id !== "string" || !ticket.id) {
      continue;
    }

    await patchRows(
      "shopping_tickets",
      `id=eq.${encodeURIComponent(ticket.id)}&list_id=eq.${encodeURIComponent(ticket.list_id)}`,
      {
        status: "failed",
        processed_at: new Date().toISOString(),
        error_message: trimmedMessage || "No se pudo procesar el ticket.",
      },
    );

    const listId = ticket.list_id;
    failedByListId.set(listId, (failedByListId.get(listId) ?? 0) + 1);
  }

  for (const [listId, ticketsFailed] of failedByListId) {
    await recordTicketProcessingRun({
      errorMessage: trimmedMessage || "No se pudo procesar el ticket.",
      finishedAt: new Date().toISOString(),
      linesAccepted: 0,
      linesNeedingReview: 0,
      listId,
      startedAt,
      status: "failed",
      summary: `Marked ${ticketsFailed} ticket(s) as failed.`,
      ticketsFailed,
      ticketsProcessed: 0,
    });
  }

  console.log(`Marked ${tickets.length} ticket(s) as failed.`);
}

async function recordTicketProcessingRun({
  errorMessage,
  finishedAt,
  linesAccepted,
  linesNeedingReview,
  listId,
  startedAt,
  status,
  summary,
  ticketsFailed,
  ticketsProcessed,
}) {
  await insertRowsReturning("shopping_ticket_processing_runs", [
    {
      list_id: listId,
      source: "codex",
      status,
      summary,
      tickets_processed: ticketsProcessed,
      lines_accepted: linesAccepted,
      lines_needing_review: linesNeedingReview,
      tickets_failed: ticketsFailed,
      error_message: errorMessage,
      started_at: startedAt,
      finished_at: finishedAt,
    },
  ]);
}

export function normalizeExtraction(rawExtraction) {
  return (Array.isArray(rawExtraction?.tickets) ? rawExtraction.tickets : [])
    .map((ticket) => ({
      id: typeof ticket.id === "string" ? ticket.id.trim() : "",
      purchased_at:
        typeof ticket.purchased_at === "string" ? ticket.purchased_at : null,
      canonicalProducts: Array.isArray(ticket.canonicalProducts)
        ? ticket.canonicalProducts
            .map((product) => ({
              client_id:
                typeof product.client_id === "string"
                  ? product.client_id.trim()
                  : "",
              name: typeof product.name === "string" ? product.name.trim() : "",
              normalized_name:
                typeof product.normalized_name === "string"
                  ? product.normalized_name.trim()
                  : "",
              comparison_unit:
                product.comparison_unit === "kg" ||
                product.comparison_unit === "l" ||
                product.comparison_unit === "unit"
                  ? product.comparison_unit
                  : "unit",
            }))
            .filter((product) => product.client_id && product.name)
        : [],
      lines: Array.isArray(ticket.lines)
        ? ticket.lines
            .map((line, index) => ({
              line_index: parseInteger(line.line_index, index),
              raw_text:
                typeof line.raw_text === "string" ? line.raw_text.trim() : "",
              product_name:
                typeof line.product_name === "string"
                  ? line.product_name.trim()
                  : "",
              canonical_product_id:
                typeof line.canonical_product_id === "string"
                  ? line.canonical_product_id.trim()
                  : "",
              quantity:
                typeof line.quantity === "string" ? line.quantity.trim() : "",
              unit_price: parseNullableNumber(line.unit_price),
              total_price: parseNullableNumber(line.total_price),
              original_total_price: parseNullableNumber(
                line.original_total_price,
              ),
              discount_total: parseNullableNumber(line.discount_total),
              needs_review: Boolean(line.needs_review),
              review_reason:
                typeof line.review_reason === "string"
                  ? line.review_reason.trim()
                  : "",
            }))
            .filter((line) => line.product_name || line.raw_text)
        : [],
    }))
    .filter((ticket) => ticket.id && ticket.lines.length > 0);
}

function parseInteger(value, fallback) {
  if (Number.isInteger(value) && value >= 0) {
    return value;
  }

  const parsedValue = Number.parseInt(String(value), 10);

  return Number.isInteger(parsedValue) && parsedValue >= 0
    ? parsedValue
    : fallback;
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(",", "."));

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function resolveCanonicalProductId(
  canonicalProductId,
  productsById,
  plannedProductsByClientId,
) {
  if (!canonicalProductId) {
    return "";
  }

  if (productsById.has(canonicalProductId)) {
    return canonicalProductId;
  }

  return plannedProductsByClientId.get(canonicalProductId)?.id ?? "";
}

function getCatalog(catalogsByListId, listId) {
  let catalog = catalogsByListId.get(listId);

  if (!catalog) {
    catalog = {
      aliasesByNormalizedAlias: new Map(),
      productsById: new Map(),
      productsByNormalizedName: new Map(),
    };
    catalogsByListId.set(listId, catalog);
  }

  return catalog;
}

async function downloadTicketFile(file, localPath) {
  const { data, error } = await supabase.storage
    .from(file.storage_bucket)
    .download(file.storage_path);

  if (error) {
    throw new Error(`Could not download ${file.file_name}: ${error.message}`);
  }

  await writeFile(localPath, Buffer.from(await data.arrayBuffer()));
}

async function readSupabaseConfig() {
  const [baseEnv, localEnv, backupEnv] = await Promise.all([
    readEnvFile(path.join(repoRoot, ".env")),
    readEnvFile(path.join(repoRoot, ".env.local")),
    readEnvFile(
      process.env.JUCART_SUPABASE_BACKUP_ENV_FILE ||
        path.join(
          process.env.HOME || repoRoot,
          ".config",
          "jucart",
          "supabase-backup.env",
        ),
    ),
  ]);
  const combinedEnv = { ...baseEnv, ...localEnv, ...backupEnv, ...process.env };
  const url = combinedEnv.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = combinedEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    fail("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { serviceRoleKey, url: url.replace(/\/$/, "") };
}

async function readEnvFile(envPath) {
  try {
    const content = await readFile(envPath, "utf8");

    return Object.fromEntries(
      content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const separatorIndex = line.indexOf("=");

          return [
            line.slice(0, separatorIndex),
            stripEnvQuotes(line.slice(separatorIndex + 1)),
          ];
        }),
    );
  } catch {
    return {};
  }
}

function stripEnvQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

async function fetchRows(tableName, filterColumn, filterValue, order) {
  const params = new URLSearchParams({ select: "*" });

  if (filterColumn && filterValue) {
    params.set(filterColumn, `eq.${filterValue}`);
  }

  if (order) {
    params.set("order", order);
  }

  const response = await fetch(
    `${config.url}/rest/v1/${tableName}?${params.toString()}`,
    {
      headers: supabaseHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(`Could not fetch ${tableName}: ${response.status}`);
  }

  return response.json();
}

async function insertRowsReturning(tableName, rows) {
  if (rows.length === 0) {
    return [];
  }

  const response = await fetch(`${config.url}/rest/v1/${tableName}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(`Could not insert ${tableName}: ${response.status}`);
  }

  return response.json();
}

async function upsertRows(tableName, rows, onConflict) {
  if (rows.length === 0) {
    return;
  }

  const response = await fetch(
    `${config.url}/rest/v1/${tableName}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    },
  );

  if (!response.ok) {
    throw new Error(`Could not upsert ${tableName}: ${response.status}`);
  }
}

async function patchRows(tableName, query, patch) {
  const response = await fetch(`${config.url}/rest/v1/${tableName}?${query}`, {
    method: "PATCH",
    headers: supabaseHeaders(),
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(`Could not update ${tableName}: ${response.status}`);
  }
}

function supabaseHeaders() {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function groupRowsByTicketId(rows) {
  const groups = new Map();

  for (const row of rows) {
    const currentRows = groups.get(row.ticket_id) ?? [];

    currentRows.push(row);
    groups.set(row.ticket_id, currentRows);
  }

  return groups;
}

function normalizeCatalogText(value) {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
