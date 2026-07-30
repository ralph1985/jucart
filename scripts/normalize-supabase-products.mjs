#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [, , command, filePath] = process.argv;

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(scriptDir, "..");
const config = await readSupabaseConfig();

if (command === "export") {
  if (!filePath) {
    fail("Usage: normalize-supabase-products.mjs export <output-json>");
  }

  await writeFile(filePath, JSON.stringify(await exportContext(), null, 2));
  process.exit(0);
}

if (command === "apply") {
  if (!filePath) {
    fail("Usage: normalize-supabase-products.mjs apply <changes-json>");
  }

  await applyChanges(JSON.parse(await readFile(filePath, "utf8")));
  process.exit(0);
}

fail("Usage: normalize-supabase-products.mjs <export|apply> <file>");

async function exportContext() {
  const [
    sections,
    items,
    canonicalProducts,
    canonicalProductAliases,
    normalizationChanges,
  ] = await Promise.all([
    fetchRows("shopping_sections", "list_id", config.listId, "position.asc"),
    fetchRows("shopping_items", "list_id", config.listId, "created_at.asc"),
    fetchRows(
      "shopping_canonical_products",
      "list_id",
      config.listId,
      "normalized_name.asc",
    ),
    fetchRows(
      "shopping_canonical_product_aliases",
      "list_id",
      config.listId,
      "normalized_alias.asc",
    ),
    fetchRows(
      "shopping_product_normalization_changes",
      "list_id",
      config.listId,
      "created_at.desc",
      50,
    ),
  ]);
  const sectionsById = new Map(
    sections.map((section) => [section.id, section]),
  );

  return {
    generatedAt: new Date().toISOString(),
    listId: config.listId,
    rules: {
      canonicalNames:
        "Usa el nombre habitual de compra y prefiere canónicos generales.",
      comparisonUnit:
        "Elige kg, l o unit. Los cambios de unidad no recalculan histórico.",
      pendingItems:
        "Conserva pendientes por lista. Solo fusiona dentro de la misma lista.",
    },
    sections: sections.map((section) => ({
      id: section.id,
      name: section.name,
    })),
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      section_id: item.section_id,
      section_name: sectionsById.get(item.section_id)?.name ?? item.section_id,
      category_id: item.category_id,
      canonical_product_id: item.canonical_product_id,
      purchased: item.purchased,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    canonicalProducts: canonicalProducts.map((product) => ({
      id: product.id,
      name: product.name,
      normalized_name: product.normalized_name,
      comparison_unit: product.comparison_unit,
      created_at: product.created_at,
      updated_at: product.updated_at,
    })),
    canonicalProductAliases: canonicalProductAliases.map((alias) => ({
      id: alias.id,
      canonical_product_id: alias.canonical_product_id,
      alias: alias.alias,
      normalized_alias: alias.normalized_alias,
      created_at: alias.created_at,
    })),
    recentNormalizationChanges: normalizationChanges.map((change) => ({
      id: change.id,
      action: change.action,
      previous_item_name: change.previous_item_name,
      next_item_name: change.next_item_name,
      reason: change.reason,
      created_at: change.created_at,
    })),
  };
}

async function applyChanges(rawChanges) {
  const startedAt = new Date().toISOString();
  const changes = normalizeChanges(rawChanges);
  const [items, canonicalProducts, canonicalProductAliases] = await Promise.all(
    [
      fetchRows("shopping_items", "list_id", config.listId, "created_at.asc"),
      fetchRows(
        "shopping_canonical_products",
        "list_id",
        config.listId,
        "normalized_name.asc",
      ),
      fetchRows(
        "shopping_canonical_product_aliases",
        "list_id",
        config.listId,
        "normalized_alias.asc",
      ),
    ],
  );
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const productsById = new Map(
    canonicalProducts.map((product) => [product.id, product]),
  );
  const aliasesByNormalizedAlias = new Map(
    canonicalProductAliases.map((alias) => [alias.normalized_alias, alias]),
  );
  const plannedProductsByClientId = new Map();
  const plannedProductClientIds = new Set(
    changes.canonicalProducts
      .map((product) => product.client_id)
      .filter((clientId) => clientId),
  );

  for (const product of changes.canonicalProducts) {
    if (product.id && productsById.has(product.id)) {
      fail(
        `Canonical product already exists in canonicalProducts: ${product.id}`,
      );
    }

    if (
      product.comparison_unit !== "kg" &&
      product.comparison_unit !== "l" &&
      product.comparison_unit !== "unit"
    ) {
      fail(
        `Invalid comparison_unit for ${product.name}: ${product.comparison_unit}`,
      );
    }
  }

  for (const productUpdate of changes.canonicalProductUpdates) {
    if (!productsById.has(productUpdate.id)) {
      fail(`Unknown canonical product id for update: ${productUpdate.id}`);
    }

    if (
      productUpdate.comparison_unit &&
      productUpdate.comparison_unit !== "kg" &&
      productUpdate.comparison_unit !== "l" &&
      productUpdate.comparison_unit !== "unit"
    ) {
      fail(
        `Invalid comparison_unit for ${productUpdate.id}: ${productUpdate.comparison_unit}`,
      );
    }
  }

  for (const update of changes.itemUpdates) {
    if (!itemsById.has(update.id)) {
      fail(`Unknown shopping item id for this list: ${update.id}`);
    }

    if (
      !productsById.has(update.canonical_product_id) &&
      !plannedProductClientIds.has(update.canonical_product_id)
    ) {
      fail(
        `Unknown canonical_product_id for item update: ${update.canonical_product_id}`,
      );
    }
  }

  for (const merge of changes.itemMerges) {
    if (!itemsById.has(merge.keep_item_id)) {
      fail(`Unknown keep_item_id for this list: ${merge.keep_item_id}`);
    }

    if (!itemsById.has(merge.remove_item_id)) {
      fail(`Unknown remove_item_id for this list: ${merge.remove_item_id}`);
    }
  }

  const insertedProducts = [];

  for (const product of changes.canonicalProducts) {
    const normalizedName = normalizeCatalogText(
      product.normalized_name || product.name,
    );
    const existingProduct = canonicalProducts.find(
      (currentProduct) => currentProduct.normalized_name === normalizedName,
    );

    if (existingProduct) {
      plannedProductsByClientId.set(product.client_id, existingProduct);
      continue;
    }

    const [insertedProduct] = await insertRowsReturning(
      "shopping_canonical_products",
      [
        {
          list_id: config.listId,
          name: product.name,
          normalized_name: normalizedName,
          comparison_unit: product.comparison_unit,
        },
      ],
    );

    if (insertedProduct) {
      insertedProducts.push(insertedProduct);
      productsById.set(insertedProduct.id, insertedProduct);
      plannedProductsByClientId.set(product.client_id, insertedProduct);
    }
  }

  const effectiveCanonicalProductUpdates = [];

  for (const productUpdate of changes.canonicalProductUpdates) {
    const currentProduct = productsById.get(productUpdate.id);
    const nextName = productUpdate.name || currentProduct.name;
    const nextComparisonUnit =
      productUpdate.comparison_unit || currentProduct.comparison_unit;
    const normalizedName = normalizeCatalogText(
      productUpdate.normalized_name || nextName,
    );

    if (
      currentProduct.name === nextName &&
      currentProduct.normalized_name === normalizedName &&
      currentProduct.comparison_unit === nextComparisonUnit
    ) {
      continue;
    }

    await patchRows(
      "shopping_canonical_products",
      `id=eq.${encodeURIComponent(productUpdate.id)}&list_id=eq.${config.listId}`,
      {
        name: nextName,
        normalized_name: normalizedName,
        comparison_unit: nextComparisonUnit,
      },
    );
    effectiveCanonicalProductUpdates.push({
      ...productUpdate,
      previousProduct: currentProduct,
      nextName,
      nextComparisonUnit,
    });
    productsById.set(productUpdate.id, {
      ...currentProduct,
      name: nextName,
      normalized_name: normalizedName,
      comparison_unit: nextComparisonUnit,
    });
  }

  const aliasRows = [];

  for (const alias of changes.aliases) {
    const canonicalProductId = resolveCanonicalProductId(
      alias.canonical_product_id,
      productsById,
      plannedProductsByClientId,
    );

    if (!canonicalProductId) {
      fail(
        `Unknown canonical_product_id for alias: ${alias.canonical_product_id}`,
      );
    }

    const normalizedAlias = normalizeCatalogText(
      alias.normalized_alias || alias.alias,
    );
    const existingAlias = aliasesByNormalizedAlias.get(normalizedAlias);

    if (existingAlias?.canonical_product_id === canonicalProductId) {
      continue;
    }

    aliasRows.push({
      list_id: config.listId,
      canonical_product_id: canonicalProductId,
      alias: alias.alias,
      normalized_alias: normalizedAlias,
    });
  }

  if (aliasRows.length > 0) {
    await upsertRows(
      "shopping_canonical_product_aliases",
      aliasRows,
      "list_id,normalized_alias",
    );
  }

  const effectiveItemUpdates = [];

  for (const update of changes.itemUpdates) {
    const currentItem = itemsById.get(update.id);
    const canonicalProductId = resolveCanonicalProductId(
      update.canonical_product_id,
      productsById,
      plannedProductsByClientId,
    );
    const nextName = update.name || currentItem.name;
    const nextQuantity = update.quantity || currentItem.quantity || null;
    const patch = {
      canonical_product_id: canonicalProductId,
      name: nextName,
      quantity: nextQuantity,
    };

    if (
      currentItem.canonical_product_id === canonicalProductId &&
      currentItem.name === nextName &&
      (currentItem.quantity || null) === nextQuantity
    ) {
      continue;
    }

    await patchRows(
      "shopping_items",
      `id=eq.${encodeURIComponent(update.id)}&list_id=eq.${config.listId}`,
      patch,
    );
    effectiveItemUpdates.push({
      ...update,
      canonical_product_id: canonicalProductId,
      previousItem: currentItem,
      nextName,
      nextQuantity,
    });
  }

  const effectiveItemMerges = [];

  for (const merge of changes.itemMerges) {
    const keepItem = itemsById.get(merge.keep_item_id);
    const removeItem = itemsById.get(merge.remove_item_id);
    const canonicalProductId = resolveCanonicalProductId(
      merge.canonical_product_id,
      productsById,
      plannedProductsByClientId,
    );
    const nextName = merge.name || keepItem.name;
    const nextQuantity = merge.quantity || keepItem.quantity || null;
    const conflictingItem = items.find(
      (item) =>
        item.id !== keepItem.id &&
        item.id !== removeItem.id &&
        item.section_id === keepItem.section_id &&
        normalizeDuplicateName(item.name) === normalizeDuplicateName(nextName),
    );

    if (keepItem.section_id !== removeItem.section_id) {
      fail(
        "Item merges can only happen inside the same shopping list section.",
      );
    }

    if (!canonicalProductId) {
      fail(
        `Unknown canonical_product_id for merge: ${merge.canonical_product_id}`,
      );
    }

    if (conflictingItem) {
      fail(
        `Cannot merge ${keepItem.id}: "${nextName}" already exists in the same section as ${conflictingItem.id}.`,
      );
    }

    const mergePatch = {
      canonical_product_id: canonicalProductId,
      name: nextName,
      quantity: nextQuantity,
      purchased: Boolean(merge.purchased ?? keepItem.purchased),
    };
    const keepItemQuery = `id=eq.${encodeURIComponent(keepItem.id)}&list_id=eq.${config.listId}`;
    const removeItemQuery = `id=eq.${encodeURIComponent(removeItem.id)}&list_id=eq.${config.listId}`;
    const nameConflictsWithRemovedItem =
      normalizeDuplicateName(removeItem.name) ===
      normalizeDuplicateName(nextName);

    if (nameConflictsWithRemovedItem) {
      await deleteRows("shopping_items", removeItemQuery);
      await patchRows("shopping_items", keepItemQuery, mergePatch);
    } else {
      await patchRows("shopping_items", keepItemQuery, mergePatch);
      await deleteRows("shopping_items", removeItemQuery);
    }

    effectiveItemMerges.push({
      ...merge,
      canonical_product_id: canonicalProductId,
      keepItem,
      removeItem,
      nextName,
      nextQuantity,
    });
  }

  const finishedAt = new Date().toISOString();
  const status = "success";
  const [run] = await insertRowsReturning(
    "shopping_product_normalization_runs",
    [
      {
        list_id: config.listId,
        source: "codex",
        status,
        summary:
          rawChanges?.summary ||
          `Normalizados ${effectiveItemUpdates.length + effectiveItemMerges.length} productos, actualizados ${effectiveCanonicalProductUpdates.length} canónicos y creados ${aliasRows.length} aliases.`,
        aliases_created: aliasRows.length,
        items_touched: effectiveItemUpdates.length + effectiveItemMerges.length,
        quantities_merged: effectiveItemMerges.filter(
          (merge) => merge.keepItem.quantity && merge.removeItem.quantity,
        ).length,
        canonical_products_merged: 0,
        started_at: startedAt,
        finished_at: finishedAt,
      },
    ],
  );

  if (run) {
    const changeRows = [
      ...aliasRows.map((alias) => ({
        run_id: run.id,
        list_id: config.listId,
        action: "alias_created",
        item_id: null,
        previous_item_name: alias.alias,
        next_item_name: null,
        previous_canonical_product_id: null,
        next_canonical_product_id: alias.canonical_product_id,
        quantity_before: null,
        quantity_after: null,
        reason: "Alias creado por Codex.",
      })),
      ...effectiveCanonicalProductUpdates.map((productUpdate) => ({
        run_id: run.id,
        list_id: config.listId,
        action: "renamed",
        item_id: null,
        previous_item_name: productUpdate.previousProduct.name,
        next_item_name: productUpdate.nextName,
        previous_canonical_product_id: productUpdate.id,
        next_canonical_product_id: productUpdate.id,
        quantity_before: productUpdate.previousProduct.comparison_unit,
        quantity_after: productUpdate.nextComparisonUnit,
        reason: productUpdate.reason || null,
      })),
      ...effectiveItemUpdates.map((update) => ({
        run_id: run.id,
        list_id: config.listId,
        action: "renamed",
        item_id: update.id,
        previous_item_name: update.previousItem.name,
        next_item_name: update.nextName,
        previous_canonical_product_id:
          update.previousItem.canonical_product_id || null,
        next_canonical_product_id: update.canonical_product_id,
        quantity_before: update.previousItem.quantity || null,
        quantity_after: update.nextQuantity,
        reason: update.reason || null,
      })),
      ...effectiveItemMerges.flatMap((merge) => [
        {
          run_id: run.id,
          list_id: config.listId,
          action: "merged",
          item_id: merge.keepItem.id,
          previous_item_name: merge.keepItem.name,
          next_item_name: merge.nextName,
          previous_canonical_product_id:
            merge.keepItem.canonical_product_id || null,
          next_canonical_product_id: merge.canonical_product_id,
          quantity_before: merge.keepItem.quantity || null,
          quantity_after: merge.nextQuantity,
          reason: merge.reason || null,
        },
        {
          run_id: run.id,
          list_id: config.listId,
          action: "deleted",
          item_id: merge.removeItem.id,
          previous_item_name: merge.removeItem.name,
          next_item_name: merge.nextName,
          previous_canonical_product_id:
            merge.removeItem.canonical_product_id || null,
          next_canonical_product_id: merge.canonical_product_id,
          quantity_before: merge.removeItem.quantity || null,
          quantity_after: merge.nextQuantity,
          reason: merge.reason || null,
        },
      ]),
    ];

    await insertRowsReturning(
      "shopping_product_normalization_changes",
      changeRows,
    );
  }

  console.log(
    `Applied ${insertedProducts.length} canonical products, ${effectiveCanonicalProductUpdates.length} canonical product updates, ${aliasRows.length} aliases, ${effectiveItemUpdates.length} item updates and ${effectiveItemMerges.length} merges.`,
  );
}

function normalizeChanges(rawChanges) {
  return {
    canonicalProducts: Array.isArray(rawChanges?.canonicalProducts)
      ? rawChanges.canonicalProducts
          .map((product) => ({
            client_id:
              typeof product.client_id === "string"
                ? product.client_id.trim()
                : "",
            id: typeof product.id === "string" ? product.id.trim() : "",
            name: typeof product.name === "string" ? product.name.trim() : "",
            normalized_name:
              typeof product.normalized_name === "string"
                ? product.normalized_name.trim()
                : "",
            comparison_unit:
              typeof product.comparison_unit === "string"
                ? product.comparison_unit.trim()
                : "unit",
          }))
          .filter((product) => product.name)
      : [],
    canonicalProductUpdates: Array.isArray(rawChanges?.canonicalProductUpdates)
      ? rawChanges.canonicalProductUpdates
          .map((product) => ({
            id: typeof product.id === "string" ? product.id.trim() : "",
            name: typeof product.name === "string" ? product.name.trim() : "",
            normalized_name:
              typeof product.normalized_name === "string"
                ? product.normalized_name.trim()
                : "",
            comparison_unit:
              typeof product.comparison_unit === "string"
                ? product.comparison_unit.trim()
                : "",
            reason:
              typeof product.reason === "string" ? product.reason.trim() : "",
          }))
          .filter(
            (product) =>
              product.id &&
              (product.name ||
                product.normalized_name ||
                product.comparison_unit),
          )
      : [],
    aliases: Array.isArray(rawChanges?.aliases)
      ? rawChanges.aliases
          .map((alias) => ({
            canonical_product_id:
              typeof alias.canonical_product_id === "string"
                ? alias.canonical_product_id.trim()
                : "",
            alias: typeof alias.alias === "string" ? alias.alias.trim() : "",
            normalized_alias:
              typeof alias.normalized_alias === "string"
                ? alias.normalized_alias.trim()
                : "",
          }))
          .filter((alias) => alias.canonical_product_id && alias.alias)
      : [],
    itemUpdates: Array.isArray(rawChanges?.itemUpdates)
      ? rawChanges.itemUpdates
          .map((update) => ({
            id: typeof update.id === "string" ? update.id.trim() : "",
            canonical_product_id:
              typeof update.canonical_product_id === "string"
                ? update.canonical_product_id.trim()
                : "",
            name: typeof update.name === "string" ? update.name.trim() : "",
            quantity:
              typeof update.quantity === "string" ? update.quantity.trim() : "",
            reason:
              typeof update.reason === "string" ? update.reason.trim() : "",
          }))
          .filter((update) => update.id && update.canonical_product_id)
      : [],
    itemMerges: Array.isArray(rawChanges?.itemMerges)
      ? rawChanges.itemMerges
          .map((merge) => ({
            keep_item_id:
              typeof merge.keep_item_id === "string"
                ? merge.keep_item_id.trim()
                : "",
            remove_item_id:
              typeof merge.remove_item_id === "string"
                ? merge.remove_item_id.trim()
                : "",
            canonical_product_id:
              typeof merge.canonical_product_id === "string"
                ? merge.canonical_product_id.trim()
                : "",
            name: typeof merge.name === "string" ? merge.name.trim() : "",
            quantity:
              typeof merge.quantity === "string" ? merge.quantity.trim() : "",
            purchased:
              typeof merge.purchased === "boolean"
                ? merge.purchased
                : undefined,
            reason: typeof merge.reason === "string" ? merge.reason.trim() : "",
          }))
          .filter(
            (merge) =>
              merge.keep_item_id &&
              merge.remove_item_id &&
              merge.canonical_product_id,
          )
      : [],
  };
}

function resolveCanonicalProductId(
  canonicalProductId,
  productsById,
  plannedProductsByClientId = new Map(),
) {
  if (productsById.has(canonicalProductId)) {
    return canonicalProductId;
  }

  return plannedProductsByClientId.get(canonicalProductId)?.id ?? "";
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
  const listId = combinedEnv.VITE_SUPABASE_LIST_ID?.trim();

  if (!url || !serviceRoleKey || !listId) {
    fail(
      "Missing VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_LIST_ID.",
    );
  }

  return { listId, serviceRoleKey, url: url.replace(/\/$/, "") };
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

async function fetchRows(tableName, filterColumn, filterValue, order, limit) {
  const params = new URLSearchParams({ select: "*" });

  if (filterColumn && filterValue) {
    params.set(filterColumn, `eq.${filterValue}`);
  }

  if (order) {
    params.set("order", order);
  }

  if (limit) {
    params.set("limit", String(limit));
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
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    },
  );

  if (!response.ok) {
    throw new Error(`Could not upsert ${tableName}: ${response.status}`);
  }
}

async function insertRowsReturning(tableName, rows) {
  if (rows.length === 0) {
    return [];
  }

  const response = await fetch(`${config.url}/rest/v1/${tableName}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(`Could not insert ${tableName}: ${response.status}`);
  }

  return response.json();
}

async function patchRows(tableName, query, body) {
  const response = await fetch(`${config.url}/rest/v1/${tableName}?${query}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Could not patch ${tableName}: ${response.status}`);
  }
}

async function deleteRows(tableName, query) {
  const response = await fetch(`${config.url}/rest/v1/${tableName}?${query}`, {
    method: "DELETE",
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Could not delete ${tableName}: ${response.status}`);
  }
}

function supabaseHeaders() {
  return {
    apikey: config.serviceRoleKey,
    authorization: `Bearer ${config.serviceRoleKey}`,
  };
}

function normalizeCatalogText(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function normalizeDuplicateName(value) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-ES");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
