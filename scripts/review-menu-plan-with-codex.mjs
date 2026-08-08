#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const actionId = process.argv[2];
const supabaseUrl = process.env.JUCART_SUPABASE_URL;
const agentSecret = process.env.JUCART_REMOTE_ACTION_AGENT_SECRET;
const agentId =
  process.env.JUCART_REMOTE_ACTION_AGENT_ID || `jucart-${process.pid}`;
const codex = process.env.CODEX_BIN || "codex";
const repoRoot = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

if (!actionId || !supabaseUrl || !agentSecret) {
  throw new Error("Faltan la acción o las credenciales del agente.");
}

async function agentRequest(body) {
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

function runCodex(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      codex,
      ["exec", "-C", repoRoot, "-s", "workspace-write", "-"],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(undefined)
        : reject(new Error(stderr.trim() || "Codex no pudo revisar el menú.")),
    );
    child.stdin.end(prompt);
  });
}

const directory = await mkdtemp(join(tmpdir(), "jucart-menu-"));
const resultPath = join(directory, "proposal.json");
try {
  const context = await agentRequest({ operation: "menu_context", actionId });
  const prompt = `Trabaja en español. Eres el asistente de planificación de Jucart.\n\nContexto autorizado:\n${JSON.stringify(context)}\n\nGenera SOLO productos necesarios para el menú. No inventes cantidades ni incluyas básicos que no se deduzcan. El destino debe ser exactamente uno de destinationLists.id y sourceDayId debe ser uno de days.id.\n\nNo edites archivos del repositorio, no uses git ni credenciales. Escribe un JSON válido exclusivamente en ${resultPath} con este formato:\n{ "items": [{ "name": "Tomates", "quantity": "500 g", "destinationListId": "uuid", "sourceDayId": "uuid" }] }\n`;
  await runCodex(prompt);
  const proposal = JSON.parse(await readFile(resultPath, "utf8"));
  if (!proposal || !Array.isArray(proposal.items))
    throw new Error("Codex no devolvió una propuesta válida.");
  const result = await agentRequest({
    operation: "menu_apply",
    actionId,
    items: proposal.items,
  });
  console.log(`Propuesta de menú guardada: ${result.proposalId}.`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
