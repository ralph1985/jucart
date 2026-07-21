#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [, , command, filePath] = process.argv;

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(scriptDir, "..");
const config = await readSupabaseConfig();

if (command === "export") {
  if (!filePath) {
    fail("Usage: recategorize-supabase-catalog.mjs export <output-json>");
  }

  await writeFile(filePath, JSON.stringify(await exportContext(), null, 2));
  process.exit(0);
}

if (command === "apply") {
  if (!filePath) {
    fail("Usage: recategorize-supabase-catalog.mjs apply <changes-json>");
  }

  await applyChanges(JSON.parse(await readFile(filePath, "utf8")));
  process.exit(0);
}

fail("Usage: recategorize-supabase-catalog.mjs <export|apply> <file>");

async function exportContext() {
  const [categories, catalogEntries, items] = await Promise.all([
    fetchRows("shopping_categories", null, null, "position.asc"),
    fetchRows(
      "shopping_product_catalog_entries",
      null,
      null,
      "normalized_name.asc",
    ),
    fetchRows("shopping_items", "list_id", config.listId, "created_at.asc"),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    listId: config.listId,
    categories,
    catalogEntries,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      category_id: item.category_id,
      purchased: item.purchased,
      updated_at: item.updated_at,
    })),
  };
}

async function applyChanges(rawChanges) {
  const changes = normalizeChanges(rawChanges);
  const [categories, items] = await Promise.all([
    fetchRows("shopping_categories", null, null, "position.asc"),
    fetchRows("shopping_items", "list_id", config.listId, "created_at.asc"),
  ]);
  const categoryIds = new Set(categories.map((category) => category.id));
  const itemIds = new Set(items.map((item) => item.id));

  for (const entry of changes.catalogEntries) {
    if (!categoryIds.has(entry.category_id)) {
      fail(`Unknown catalog category_id: ${entry.category_id}`);
    }
  }

  for (const update of changes.itemUpdates) {
    if (!itemIds.has(update.id)) {
      fail(`Unknown shopping item id for this list: ${update.id}`);
    }

    if (!categoryIds.has(update.category_id)) {
      fail(`Unknown item category_id: ${update.category_id}`);
    }
  }

  if (changes.catalogEntries.length > 0) {
    await upsertRows(
      "shopping_product_catalog_entries",
      changes.catalogEntries.map((entry) => ({
        id: entry.id || buildCatalogEntryId(entry.category_id, entry.name),
        category_id: entry.category_id,
        name: entry.name,
        normalized_name: normalizeCatalogText(
          entry.normalized_name || entry.name,
        ),
      })),
      "category_id,normalized_name",
    );
  }

  for (const update of changes.itemUpdates) {
    await patchRows(
      "shopping_items",
      `id=eq.${encodeURIComponent(update.id)}&list_id=eq.${config.listId}`,
      { category_id: update.category_id },
    );
  }

  console.log(
    `Applied ${changes.catalogEntries.length} catalog entries and ${changes.itemUpdates.length} item updates.`,
  );
}

function normalizeChanges(rawChanges) {
  return {
    catalogEntries: Array.isArray(rawChanges?.catalogEntries)
      ? rawChanges.catalogEntries
          .map((entry) => ({
            id: typeof entry.id === "string" ? entry.id.trim() : "",
            category_id:
              typeof entry.category_id === "string"
                ? entry.category_id.trim()
                : "",
            name: typeof entry.name === "string" ? entry.name.trim() : "",
            normalized_name:
              typeof entry.normalized_name === "string"
                ? entry.normalized_name.trim()
                : "",
          }))
          .filter((entry) => entry.category_id && entry.name)
      : [],
    itemUpdates: Array.isArray(rawChanges?.itemUpdates)
      ? rawChanges.itemUpdates
          .map((update) => ({
            id: typeof update.id === "string" ? update.id.trim() : "",
            category_id:
              typeof update.category_id === "string"
                ? update.category_id.trim()
                : "",
          }))
          .filter((update) => update.id && update.category_id)
      : [],
  };
}

async function readSupabaseConfig() {
  const [baseEnv, localEnv] = await Promise.all([
    readEnvFile(path.join(repoRoot, ".env")),
    readEnvFile(path.join(repoRoot, ".env.local")),
  ]);
  const combinedEnv = { ...baseEnv, ...localEnv };
  const url = combinedEnv.VITE_SUPABASE_URL?.trim();
  const anonKey = combinedEnv.VITE_SUPABASE_ANON_KEY?.trim();
  const listId = combinedEnv.VITE_SUPABASE_LIST_ID?.trim();

  if (!url || !anonKey || !listId) {
    fail(
      "Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_LIST_ID.",
    );
  }

  return { anonKey, listId, url: url.replace(/\/$/, "") };
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

async function upsertRows(tableName, rows, onConflict) {
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

function supabaseHeaders() {
  return {
    apikey: config.anonKey,
    authorization: `Bearer ${config.anonKey}`,
  };
}

function buildCatalogEntryId(categoryId, name) {
  return `${categoryId}-${normalizeCatalogText(name).replaceAll(" ", "-")}`;
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

function fail(message) {
  console.error(message);
  process.exit(1);
}
