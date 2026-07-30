#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const supabaseUrl = process.env.JUCART_SUPABASE_URL;
const agentSecret = process.env.JUCART_REMOTE_ACTION_AGENT_SECRET;
const agentId =
  process.env.JUCART_REMOTE_ACTION_AGENT_ID || `jucart-${process.pid}`;
const pollMs = Number(process.env.JUCART_REMOTE_ACTION_POLL_MS || 3000);
const repoRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const userBinDir = process.env.HOME
  ? `${process.env.HOME}/.local/bin`
  : "/home/rafa/.local/bin";
const actionEnv = {
  ...process.env,
  PATH: [userBinDir, process.env.PATH].filter(Boolean).join(":"),
  CODEX_BIN: process.env.CODEX_BIN || `${userBinDir}/codex`,
};

if (!supabaseUrl || !agentSecret) {
  console.error(
    "Faltan JUCART_SUPABASE_URL o JUCART_REMOTE_ACTION_AGENT_SECRET.",
  );
  process.exit(1);
}

async function callAgent(body) {
  const response = await fetch(`${supabaseUrl}/functions/v1/remote-actions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-jucart-agent-secret": agentSecret,
    },
    body: JSON.stringify({ ...body, agentId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function executeAction(action) {
  const commands = {
    supabase_backup: ["bash", ["scripts/backup-supabase.sh"]],
    recategorize_products: ["bash", ["scripts/recategorize-with-codex.sh"]],
    normalize_products: ["bash", ["scripts/normalize-products-with-codex.sh"]],
    process_tickets: ["bash", ["scripts/process-tickets-with-codex.sh"]],
    update_external_prices: ["node", ["scripts/update-external-prices.mjs"]],
  };
  const command = commands[action.action];
  if (!command) {
    throw new Error(`Acción no permitida: ${action.action}`);
  }
  const { stdout, stderr } = await execFileAsync(command[0], command[1], {
    cwd: repoRoot,
    env: actionEnv,
    maxBuffer: 1024 * 1024,
  });
  return (stdout || stderr).trim().slice(-500) || "Acción completada.";
}

async function poll() {
  try {
    const { action } = await callAgent({ operation: "claim" });
    if (!action) return;

    try {
      const resultSummary = await executeAction(action);
      await callAgent({
        operation: "complete",
        actionId: action.id,
        status: "completed",
        resultSummary,
      });
    } catch (error) {
      await callAgent({
        operation: "complete",
        actionId: action.id,
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "La acción falló.",
      });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
}

console.log(`Jucart remote actions agent activo: ${agentId}`);
await poll();
setInterval(() => void poll(), Math.max(1000, pollMs));
