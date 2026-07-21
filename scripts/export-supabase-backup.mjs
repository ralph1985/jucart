#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [schemaOutputPath, dataOutputPath] = process.argv.slice(2);

if (!schemaOutputPath || !dataOutputPath) {
  console.error("Usage: export-supabase-backup.mjs <schema.sql> <data.sql>");
  process.exit(1);
}

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(scriptDir, "..");
const migrationsDir = path.join(repoRoot, "supabase", "migrations");

const sectionColumns = [
  "id",
  "list_id",
  "name",
  "color",
  "position",
  "created_at",
  "updated_at",
];
const categoryColumns = ["id", "name", "position", "created_at", "updated_at"];
const catalogEntryColumns = [
  "id",
  "category_id",
  "name",
  "normalized_name",
  "created_at",
  "updated_at",
];
const itemColumns = [
  "id",
  "list_id",
  "name",
  "section_id",
  "category_id",
  "added_by",
  "purchased",
  "created_at",
  "updated_at",
];
const historyColumns = [
  "id",
  "list_id",
  "item_id",
  "event_type",
  "actor",
  "client_id",
  "item_snapshot",
  "previous_item_snapshot",
  "created_at",
];
const backupRunColumns = [
  "id",
  "started_at",
  "finished_at",
  "status",
  "file_name",
  "file_size_bytes",
  "sha256",
  "duration_ms",
  "retained_count",
  "error_message",
  "created_at",
];

const config = await readSupabaseConfig();
const [sections, categories, catalogEntries, items, historyEvents, backupRuns] =
  await Promise.all([
    fetchRows("shopping_sections", "list_id", config.listId, "position.asc"),
    fetchRows("shopping_categories", null, null, "position.asc"),
    fetchRows(
      "shopping_product_catalog_entries",
      null,
      null,
      "normalized_name.asc",
    ),
    fetchRows("shopping_items", "list_id", config.listId, "created_at.asc"),
    fetchRows(
      "shopping_history_events",
      "list_id",
      config.listId,
      "created_at.asc",
    ),
    fetchRows("developer_backup_runs", null, null, "created_at.asc"),
  ]);

await writeFile(schemaOutputPath, await buildSchemaSql(), "utf8");
await writeFile(
  dataOutputPath,
  buildDataSql({
    backupRuns,
    catalogEntries,
    categories,
    config,
    historyEvents,
    items,
    sections,
  }),
  "utf8",
);

async function readSupabaseConfig() {
  const [baseEnv, localEnv] = await Promise.all([
    readEnvFile(path.join(repoRoot, ".env")),
    readEnvFile(path.join(repoRoot, ".env.local")),
  ]);
  const combinedEnv = {
    ...baseEnv,
    ...localEnv,
  };
  const url = combinedEnv.VITE_SUPABASE_URL?.trim();
  const anonKey = combinedEnv.VITE_SUPABASE_ANON_KEY?.trim();
  const listId = combinedEnv.VITE_SUPABASE_LIST_ID?.trim();

  if (!url || !anonKey || !listId) {
    throw new Error(
      "Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_LIST_ID.",
    );
  }

  return { anonKey, listId, url: url.replace(/\/$/, "") };
}

async function readEnvFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");

    return Object.fromEntries(
      content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const separatorIndex = line.indexOf("=");
          const key = line.slice(0, separatorIndex);
          const value = line.slice(separatorIndex + 1);

          return [key, stripEnvQuotes(value)];
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
      headers: {
        apikey: config.anonKey,
        authorization: `Bearer ${config.anonKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Could not fetch ${tableName}: ${response.status}`);
  }

  return response.json();
}

async function buildSchemaSql() {
  const migrationFiles = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
  const migrations = await Promise.all(
    migrationFiles.map(async (fileName) => {
      const content = await readFile(
        path.join(migrationsDir, fileName),
        "utf8",
      );

      return `-- ${fileName}\n${content.trim()}\n`;
    }),
  );

  return [
    "-- Jucart Supabase schema backup",
    `-- Generated at ${new Date().toISOString()}`,
    "",
    ...migrations,
  ].join("\n");
}

function buildDataSql({
  backupRuns,
  catalogEntries,
  categories,
  config,
  historyEvents,
  items,
  sections,
}) {
  const statements = [
    "-- Jucart Supabase data backup",
    `-- Generated at ${new Date().toISOString()}`,
    "",
    "begin;",
    "",
    `delete from public.shopping_history_events where list_id = ${sqlString(config.listId)}::uuid;`,
    `delete from public.shopping_items where list_id = ${sqlString(config.listId)}::uuid;`,
    `delete from public.shopping_sections where list_id = ${sqlString(config.listId)}::uuid;`,
    "",
    buildInsertStatement("shopping_categories", categoryColumns, categories, [
      "id",
    ]),
    buildInsertStatement(
      "shopping_product_catalog_entries",
      catalogEntryColumns,
      catalogEntries,
      ["id"],
    ),
    buildInsertStatement("shopping_sections", sectionColumns, sections, [
      "list_id",
      "id",
    ]),
    buildInsertStatement("shopping_items", itemColumns, items, ["id"]),
    buildInsertStatement(
      "shopping_history_events",
      historyColumns,
      historyEvents,
      ["id"],
    ),
    buildInsertStatement(
      "developer_backup_runs",
      backupRunColumns,
      backupRuns,
      ["id"],
    ),
    "commit;",
    "",
  ];

  return statements.filter(Boolean).join("\n");
}

function buildInsertStatement(tableName, columns, rows, conflictColumns) {
  if (rows.length === 0) {
    return `-- public.${tableName}: no rows`;
  }

  const updateColumns = columns.filter(
    (column) => !conflictColumns.includes(column),
  );

  return [
    `insert into public.${tableName} (${columns.map(quoteIdentifier).join(", ")}) values`,
    rows
      .map(
        (row) =>
          `  (${columns.map((column) => sqlValue(row[column], column)).join(", ")})`,
      )
      .join(",\n"),
    `on conflict (${conflictColumns.map(quoteIdentifier).join(", ")}) do update set`,
    `  ${updateColumns
      .map(
        (column) =>
          `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`,
      )
      .join(",\n  ")};`,
    "",
  ].join("\n");
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function sqlValue(value, column) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (column.endsWith("_snapshot")) {
    return `${sqlString(JSON.stringify(value))}::jsonb`;
  }

  if (column === "list_id") {
    return `${sqlString(value)}::uuid`;
  }

  if (column === "id" && isUuid(value)) {
    return `${sqlString(value)}::uuid`;
  }

  if (column.endsWith("_at")) {
    return `${sqlString(value)}::timestamptz`;
  }

  return sqlString(value);
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
