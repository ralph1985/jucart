import { createClient } from "@supabase/supabase-js";

const requiredEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JUCART_REMOTE_ACTION_AGENT_SECRET",
] as const;

const allowedActions = new Set([
  "supabase_backup",
  "recategorize_products",
  "normalize_products",
  "process_tickets",
  "update_external_prices",
]);
const defaultWebOrigin = "https://jucar-cart.vercel.app";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Método no permitido." }, 405);
  }

  const env = readEnv();
  if (!env.valid) {
    return jsonResponse(
      request,
      { error: `Faltan variables: ${env.missing.join(", ")}.` },
      500,
    );
  }

  const body = await readJson(request);
  if (!body.valid) {
    return jsonResponse(request, { error: body.error }, 400);
  }

  const supabase = createClient(
    env.values.SUPABASE_URL,
    env.values.SUPABASE_SERVICE_ROLE_KEY,
  );
  const agentSecret = request.headers.get("x-jucart-agent-secret");

  if (agentSecret === env.values.JUCART_REMOTE_ACTION_AGENT_SECRET) {
    return handleAgentRequest(supabase, body.value);
  }

  return handleUserRequest(supabase, request, body.value);
});

async function handleUserRequest(
  supabase: ReturnType<typeof createClient>,
  request: Request,
  body: Record<string, unknown>,
) {
  const token = request.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return jsonResponse(request, { error: "No autorizado." }, 401);
  }

  const { data: userData, error: userError } =
    await supabase.auth.getUser(token);
  const user = userData.user;
  if (
    userError ||
    !user ||
    user.email?.toLowerCase() !== "rafaelgarcia1985@hotmail.com"
  ) {
    return jsonResponse(request, { error: "No autorizado." }, 403);
  }

  const action = typeof body.action === "string" ? body.action : "";
  const clientRequestId =
    typeof body.clientRequestId === "string" ? body.clientRequestId.trim() : "";
  const payload =
    body.payload &&
    typeof body.payload === "object" &&
    !Array.isArray(body.payload)
      ? body.payload
      : {};

  if (
    !allowedActions.has(action) ||
    !clientRequestId ||
    clientRequestId.length > 120
  ) {
    return jsonResponse(
      request,
      { error: "Acción o identificador inválido." },
      400,
    );
  }

  const { data, error } = await supabase
    .from("remote_actions")
    .insert({
      action,
      client_request_id: clientRequestId,
      payload,
      requested_by: user.id,
    })
    .select("id, action, status, client_request_id, created_at")
    .single();

  if (error?.code === "23505") {
    const existing = await supabase
      .from("remote_actions")
      .select("id, action, status, client_request_id, created_at")
      .eq("client_request_id", clientRequestId)
      .eq("requested_by", user.id)
      .maybeSingle();
    return jsonResponse(
      request,
      existing.data ?? { error: "La orden ya existe." },
      200,
    );
  }

  if (error) {
    return jsonResponse(request, { error: "No se pudo crear la orden." }, 500);
  }

  return jsonResponse(request, data, 201);
}

async function handleAgentRequest(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const operation = body.operation;
  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
  if (!agentId || agentId.length > 120) {
    return jsonResponse(undefined, { error: "Agente inválido." }, 400);
  }

  if (operation === "claim") {
    const { data, error } = await supabase.rpc("claim_remote_action", {
      p_agent_id: agentId,
      p_lease_seconds: 120,
    });
    if (error)
      return jsonResponse(
        undefined,
        { error: "No se pudo reclamar la orden." },
        500,
      );
    return jsonResponse(undefined, { action: data?.[0] ?? null });
  }

  if (operation === "complete") {
    const actionId = typeof body.actionId === "string" ? body.actionId : "";
    const status =
      body.status === "completed" || body.status === "failed"
        ? body.status
        : "";
    const resultSummary =
      typeof body.resultSummary === "string"
        ? body.resultSummary.slice(0, 500)
        : null;
    const errorMessage =
      typeof body.errorMessage === "string"
        ? body.errorMessage.slice(0, 500)
        : null;
    const { data, error } = await supabase.rpc("complete_remote_action", {
      p_action_id: actionId,
      p_agent_id: agentId,
      p_status: status,
      p_result_summary: resultSummary,
      p_error_message: errorMessage,
    });
    if (error)
      return jsonResponse(
        undefined,
        { error: "No se pudo cerrar la orden." },
        409,
      );
    return jsonResponse(undefined, { action: data });
  }

  return jsonResponse(undefined, { error: "Operación no permitida." }, 400);
}

function jsonResponse(
  request: Request | undefined,
  body: unknown,
  status = 200,
) {
  return Response.json(body, { status, headers: getCorsHeaders(request) });
}

function getCorsHeaders(request: Request | undefined) {
  const origin = request?.headers.get("origin");
  const allowedOrigin =
    Deno.env.get("JUCART_WEB_ORIGIN")?.trim() || defaultWebOrigin;
  const headers = new Headers({
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-jucart-agent-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  });

  if (origin === allowedOrigin || origin === "http://localhost:5173") {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

async function readJson(request: Request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? { valid: true as const, value: value as Record<string, unknown> }
      : { valid: false as const, error: "Payload JSON inválido." };
  } catch {
    return { valid: false as const, error: "Payload JSON inválido." };
  }
}

function readEnv() {
  const values = Object.fromEntries(
    requiredEnvVars.map((name) => [name, Deno.env.get(name)?.trim() ?? ""]),
  ) as Record<(typeof requiredEnvVars)[number], string>;
  const missing = requiredEnvVars.filter((name) => !values[name]);
  return missing.length > 0
    ? { valid: false as const, missing }
    : { valid: true as const, values };
}
