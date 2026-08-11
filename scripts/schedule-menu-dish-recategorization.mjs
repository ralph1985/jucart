#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function stripEnvQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
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

const backupEnvPath =
  process.env.JUCART_SUPABASE_BACKUP_ENV_FILE ||
  path.join(
    process.env.HOME || repoRoot,
    ".config",
    "jucart",
    "supabase-backup.env",
  );
const config = {
  ...(await readEnvFile(path.join(repoRoot, ".env"))),
  ...(await readEnvFile(path.join(repoRoot, ".env.local"))),
  ...(await readEnvFile(backupEnvPath)),
  ...process.env,
};
const supabaseUrl = config.VITE_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY?.trim();
const libraryId = config.JUCART_MENU_DISH_LIBRARY_ID?.trim();
const requestedBy = config.JUCART_MENU_DISH_REQUESTED_BY?.trim();

if (!supabaseUrl || !serviceRoleKey || !libraryId) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o JUCART_MENU_DISH_LIBRARY_ID.",
  );
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

let userId = requestedBy;
if (!userId) {
  const membersResponse = await fetch(
    `${supabaseUrl}/rest/v1/menu_dish_library_members?library_id=eq.${encodeURIComponent(libraryId)}&select=user_id&order=user_id.asc&limit=1`,
    { headers },
  );
  if (!membersResponse.ok) {
    throw new Error(
      `No se pudieron consultar los miembros de la biblioteca (HTTP ${membersResponse.status}).`,
    );
  }
  const members = await membersResponse.json();
  userId = members[0]?.user_id;
}

if (!userId) {
  throw new Error("La biblioteca no tiene ningún miembro autorizado.");
}

const response = await fetch(`${supabaseUrl}/rest/v1/remote_actions`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    action: "recategorize_menu_dishes",
    client_request_id: `cron-recategorize-menu-dishes-${new Date().toISOString()}`,
    requested_by: userId,
    payload: { libraryId },
  }),
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(
    `No se pudo programar la recategorización de platos (HTTP ${response.status}): ${body.slice(0, 300)}`,
  );
}

const [action] = await response.json();
console.log(`Recategorización de platos programada: ${action.id}.`);
