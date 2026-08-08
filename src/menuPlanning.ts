import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./supabaseConfig";
import { createRemoteAction } from "./remoteActions";

export type MenuPlan = { id: string; scopeListId: string; startsOn: string };
export type MenuPlanDay = { id: string; plannedOn: string; content: string };
export type MenuProposalItem = {
  id: string;
  name: string;
  quantity: string | null;
  destinationListId: string;
  selected: boolean;
  confirmedAt: string | null;
};
export type MenuProposal = {
  id: string;
  status: "draft" | "requested" | "ready" | "failed" | "confirmed";
  errorMessage: string | null;
  items: MenuProposalItem[];
};

let client: ReturnType<typeof createClient> | null = null;
type TableResult = { data: unknown; error: unknown };
type TableQuery = {
  select: (columns: string) => TableQuery;
  insert: (values: unknown) => TableQuery;
  upsert: (values: unknown, options?: { onConflict: string }) => TableQuery;
  eq: (column: string, value: string) => TableQuery;
  order: (column: string, options?: { ascending: boolean }) => TableQuery;
  limit: (value: number) => TableQuery;
  maybeSingle: () => Promise<TableResult>;
  single: () => Promise<TableResult>;
};
type MenuPlanRow = { id: string; scope_list_id: string; starts_on: string };
type MenuDayRow = { id: string; planned_on: string; content: string };
type MenuProposalItemRow = {
  id: string;
  name: string;
  quantity: string | null;
  destination_list_id: string;
  selected: boolean;
  confirmed_at: string | null;
};
type MenuProposalRow = {
  id: string;
  status: MenuProposal["status"];
  error_message: string | null;
  menu_plan_proposal_items: MenuProposalItemRow[] | null;
};
function getClient() {
  const config = getSupabaseConfig();
  if (!config)
    throw new Error("La planificación requiere conexión con Supabase.");
  client ??= createClient(config.url, config.anonKey);
  return client;
}
function table(name: string): TableQuery {
  return getClient().from(name as never) as unknown as TableQuery;
}

export async function getOrCreateMenuPlan(
  scopeListId: string,
  startsOn: string,
) {
  const supabase = getClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Necesitas iniciar sesión.");
  const existing = await table("menu_plans")
    .select("id, scope_list_id, starts_on")
    .eq("scope_list_id", scopeListId)
    .eq("starts_on", startsOn)
    .maybeSingle();
  if (existing.error) throw existing.error;
  const plan =
    (existing.data as MenuPlanRow | null) ??
    ((
      await table("menu_plans")
        .insert({
          scope_list_id: scopeListId,
          starts_on: startsOn,
          created_by: userData.user.id,
        })
        .select("id, scope_list_id, starts_on")
        .single()
    ).data as MenuPlanRow | null);
  if (!plan) throw new Error("No se pudo crear el menú.");
  const { data: days, error } = await (table("menu_plan_days")
    .select("id, planned_on, content")
    .eq("plan_id", plan.id)
    .order("planned_on") as unknown as Promise<TableResult>);
  if (error) throw error;
  const storedDays = (days ?? []) as MenuDayRow[];
  return {
    plan: {
      id: plan.id,
      scopeListId: plan.scope_list_id,
      startsOn: plan.starts_on,
    } as MenuPlan,
    days: storedDays.map(
      (day) =>
        ({
          id: day.id,
          plannedOn: day.planned_on,
          content: day.content,
        }) as MenuPlanDay,
    ),
  };
}

export async function saveMenuPlanDay(
  planId: string,
  plannedOn: string,
  content: string,
) {
  const { error } = await (table("menu_plan_days").upsert(
    { plan_id: planId, planned_on: plannedOn, content: content.trim() },
    { onConflict: "plan_id,planned_on" },
  ) as unknown as Promise<TableResult>);
  if (error) throw error;
}

export async function getLatestMenuProposal(
  planId: string,
): Promise<MenuProposal | null> {
  const { data, error } = await table("menu_plan_proposals")
    .select(
      "id, status, error_message, menu_plan_proposal_items(id, name, quantity, destination_list_id, selected, confirmed_at)",
    )
    .eq("plan_id", planId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const proposal = data as MenuProposalRow;
  return {
    id: proposal.id,
    status: proposal.status,
    errorMessage: proposal.error_message,
    items: (proposal.menu_plan_proposal_items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      destinationListId: item.destination_list_id,
      selected: item.selected,
      confirmedAt: item.confirmed_at,
    })),
  };
}

export async function requestMenuPlanReview(planId: string) {
  return createRemoteAction(
    "review_menu_plan",
    `review_menu_plan-${planId}-${crypto.randomUUID()}`,
    { planId },
  );
}
