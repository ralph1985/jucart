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
  if (action.action !== "supabase_backup") {
    throw new Error(`Acción no permitida: ${action.action}`);
  }
  const { stdout, stderr } = await execFileAsync(
    "bash",
    ["scripts/backup-supabase.sh"],
    {
      cwd: repoRoot,
      env: process.env,
      maxBuffer: 1024 * 1024,
    },
  );
  return (stdout || stderr).trim().slice(-500) || "Backup completado.";
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
