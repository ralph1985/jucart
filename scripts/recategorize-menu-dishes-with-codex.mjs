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
        : reject(
            new Error(
              stderr.trim() || "Codex no pudo recategorizar los platos.",
            ),
          ),
    );
    child.stdin.end(prompt);
  });
}

const directory = await mkdtemp(join(tmpdir(), "jucart-dishes-"));
const resultPath = join(directory, "recategorization.json");
try {
  const context = await agentRequest({
    operation: "menu_dish_context",
    actionId,
  });
  const prompt = `Trabaja en español. Eres el asistente de clasificación de platos de Jucart.

Contexto autorizado:
${JSON.stringify(context)}

Asigna tipos solo cuando el nombre del plato lo permita con claridad. Usa únicamente los dishTypes.id existentes. Si un plato no se puede clasificar con seguridad, no lo incluyas. No crees tipos nuevos y no cambies nombres de platos.

No edites archivos del repositorio, no uses git ni credenciales. Escribe SOLO JSON válido en ${resultPath} con este formato:
{
  "summary": "Resumen breve",
  "changes": [
    { "dishId": "uuid", "dishTypeId": "uuid o null", "reason": "Motivo breve" }
  ]
}
`;
  await runCodex(prompt);
  const proposal = JSON.parse(await readFile(resultPath, "utf8"));
  if (!proposal || !Array.isArray(proposal.changes))
    throw new Error("Codex no devolvió una recategorización válida.");
  const result = await agentRequest({
    operation: "menu_dish_apply",
    actionId,
    summary: typeof proposal.summary === "string" ? proposal.summary : "",
    changes: proposal.changes,
  });
  const count = result.run?.dishes_recategorized ?? 0;
  console.log(`Platos recategorizados automáticamente: ${count}.`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
