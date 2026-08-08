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
  "review_menu_plan",
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
  if (userError || !user) {
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

  if (action === "review_menu_plan") {
    const planId = typeof payload.planId === "string" ? payload.planId : "";
    if (!planId) return jsonResponse(request, { error: "Menú inválido." }, 400);
    const { data: plan, error: planError } = await supabase
      .from("menu_plans")
      .select("scope_list_id")
      .eq("id", planId)
      .maybeSingle();
    if (planError || !plan)
      return jsonResponse(request, { error: "Menú no encontrado." }, 404);
    const { data: member } = await supabase
      .from("shopping_list_members")
      .select("list_id")
      .eq("list_id", plan.scope_list_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) return jsonResponse(request, { error: "No autorizado." }, 403);
  } else if (user.email?.toLowerCase() !== "rafaelgarcia1985@hotmail.com") {
    return jsonResponse(request, { error: "No autorizado." }, 403);
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

  if (operation === "menu_context") {
    const actionId = typeof body.actionId === "string" ? body.actionId : "";
    const context = await getMenuContext(supabase, actionId, agentId);
    return jsonResponse(undefined, context);
  }

  if (operation === "menu_apply") {
    const actionId = typeof body.actionId === "string" ? body.actionId : "";
    const items = Array.isArray(body.items) ? body.items : null;
    const dishes = Array.isArray(body.dishes) ? body.dishes : [];
    if (!items)
      return jsonResponse(undefined, { error: "Propuesta inválida." }, 400);
    const result = await applyMenuProposal(
      supabase,
      actionId,
      agentId,
      items,
      dishes,
    );
    return jsonResponse(undefined, result);
  }

  return jsonResponse(undefined, { error: "Operación no permitida." }, 400);
}

async function getMenuContext(
  supabase: ReturnType<typeof createClient>,
  actionId: string,
  agentId: string,
) {
  const { data: action, error } = await supabase
    .from("remote_actions")
    .select("id, payload")
    .eq("id", actionId)
    .eq("action", "review_menu_plan")
    .eq("status", "running")
    .eq("agent_id", agentId)
    .maybeSingle();
  const planId =
    typeof action?.payload?.planId === "string" ? action.payload.planId : "";
  if (error || !planId) throw new Error("Acción de menú no disponible.");
  const { data: plan } = await supabase
    .from("menu_plans")
    .select("id, scope_list_id, starts_on")
    .eq("id", planId)
    .single();
  if (!plan) throw new Error("Menú no encontrado.");
  const [
    { data: days },
    { data: lists },
    { data: memberships },
    { data: dishTypes },
  ] = await Promise.all([
    supabase
      .from("menu_plan_days")
      .select("id, planned_on, content")
      .eq("plan_id", plan.id)
      .order("planned_on"),
    supabase.from("shopping_lists").select("id, name"),
    supabase.from("shopping_list_members").select("list_id, user_id"),
    supabase
      .from("menu_dish_types")
      .select("id, name")
      .eq("scope_list_id", plan.scope_list_id)
      .order("position"),
  ]);
  const scopeMembers = new Set(
    (memberships ?? [])
      .filter((row) => row.list_id === plan.scope_list_id)
      .map((row) => row.user_id),
  );
  const destinations = (lists ?? []).filter((list) => {
    const members = new Set(
      (memberships ?? [])
        .filter((row) => row.list_id === list.id)
        .map((row) => row.user_id),
    );
    return (
      members.size === scopeMembers.size &&
      [...members].every((member) => scopeMembers.has(member))
    );
  });
  return {
    planId: plan.id,
    startsOn: plan.starts_on,
    days: days ?? [],
    destinationLists: destinations,
    dishTypes: dishTypes ?? [],
  };
}

async function applyMenuProposal(
  supabase: ReturnType<typeof createClient>,
  actionId: string,
  agentId: string,
  items: unknown[],
  dishes: unknown[],
) {
  const context = await getMenuContext(supabase, actionId, agentId);
  if (items.length > 100) throw new Error("La propuesta supera el límite.");
  const allowedLists = new Set(context.destinationLists.map((list) => list.id));
  const validItems = items.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Línea inválida.");
    const value = item as Record<string, unknown>;
    const name = typeof value.name === "string" ? value.name.trim() : "";
    const quantity =
      typeof value.quantity === "string"
        ? value.quantity.trim().slice(0, 80) || null
        : null;
    const destinationListId =
      typeof value.destinationListId === "string"
        ? value.destinationListId
        : "";
    const sourceDayId =
      typeof value.sourceDayId === "string" ? value.sourceDayId : null;
    if (!name || name.length > 200 || !allowedLists.has(destinationListId))
      throw new Error("Producto o destino inválido.");
    return {
      name,
      quantity,
      destination_list_id: destinationListId,
      source_day_id: sourceDayId,
    };
  });
  const { data: existing } = await supabase
    .from("menu_plan_proposals")
    .select("id")
    .eq("request_id", actionId)
    .maybeSingle();
  if (existing) return { proposalId: existing.id, reused: true };
  const { data: proposal, error } = await supabase
    .from("menu_plan_proposals")
    .insert({ plan_id: context.planId, status: "ready", request_id: actionId })
    .select("id")
    .single();
  if (error || !proposal) throw new Error("No se pudo guardar la propuesta.");
  const { error: itemsError } = await supabase
    .from("menu_plan_proposal_items")
    .insert(validItems.map((item) => ({ ...item, proposal_id: proposal.id })));
  if (itemsError) {
    await supabase.from("menu_plan_proposals").delete().eq("id", proposal.id);
    throw new Error("No se pudo guardar la propuesta.");
  }
  if (dishes.length > 70)
    throw new Error("La propuesta incluye demasiados platos.");
  const validDayIds = new Set(context.days.map((day) => day.id));
  const validTypeIds = new Set(context.dishTypes.map((type) => type.id));
  const validDishes = dishes.map((dish) => {
    if (!dish || typeof dish !== "object") throw new Error("Plato inválido.");
    const value = dish as Record<string, unknown>;
    const name = typeof value.name === "string" ? value.name.trim() : "";
    const sourceDayId =
      typeof value.sourceDayId === "string" ? value.sourceDayId : "";
    const dishTypeId =
      typeof value.dishTypeId === "string" ? value.dishTypeId : null;
    if (
      !name ||
      name.length > 200 ||
      !validDayIds.has(sourceDayId) ||
      (dishTypeId && !validTypeIds.has(dishTypeId))
    )
      throw new Error("Plato inválido.");
    return { plan_day_id: sourceDayId, name, dish_type_id: dishTypeId };
  });
  if (validDishes.length > 0) {
    const { error: dishesError } = await supabase
      .from("menu_plan_dishes")
      .insert(validDishes);
    if (dishesError) throw new Error("No se pudieron guardar los platos.");
  }
  return { proposalId: proposal.id, reused: false };
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
