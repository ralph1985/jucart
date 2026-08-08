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
export type MenuDishType = { id: string; name: string };

let client: ReturnType<typeof createClient> | null = null;
type TableResult = { data: unknown; error: unknown };
type TableQuery = {
  select: (columns: string) => TableQuery;
  insert: (values: unknown) => TableQuery;
  update: (values: unknown) => TableQuery;
  upsert: (values: unknown, options?: { onConflict: string }) => TableQuery;
  eq: (column: string, value: string) => TableQuery;
  in: (column: string, values: string[]) => TableQuery;
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
type MenuDishTypeRow = { id: string; name: string };
type MenuDishRow = {
  id: string;
  name: string;
  plan_day_id: string;
  menu_dish_types: { name: string } | null;
};
type MenuHistoryRow = {
  id: string;
  starts_on: string;
  menu_plan_days: Array<{
    planned_on: string;
    content: string;
    menu_plan_dishes: Array<{
      name: string;
      menu_dish_types: { name: string } | null;
    }>;
  }>;
};
export type MenuDish = {
  id: string;
  name: string;
  planDayId: string;
  typeName: string | null;
};
export type MenuHistoryPlan = {
  id: string;
  startsOn: string;
  days: Array<{
    plannedOn: string;
    content: string;
    dishes: Array<{ name: string; typeName: string | null }>;
  }>;
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

export async function updateMenuProposalItem(
  itemId: string,
  values: Pick<
    MenuProposalItem,
    "name" | "quantity" | "destinationListId" | "selected"
  >,
) {
  const { error } = await (table("menu_plan_proposal_items")
    .update({
      name: values.name.trim(),
      quantity: values.quantity?.trim() || null,
      destination_list_id: values.destinationListId,
      selected: values.selected,
    })
    .eq("id", itemId) as unknown as Promise<TableResult>);
  if (error) throw error;
}

export async function confirmMenuProposal(proposalId: string) {
  const { data, error } = await getClient().rpc(
    "confirm_menu_plan_proposal" as never,
    { p_proposal_id: proposalId } as never,
  );
  if (error) throw error;
  return data;
}

export async function getMenuDishTypes(scopeListId: string) {
  const { data, error } = await (table("menu_dish_types")
    .select("id, name")
    .eq("scope_list_id", scopeListId)
    .order("position") as unknown as Promise<TableResult>);
  if (error) throw error;
  return ((data ?? []) as MenuDishTypeRow[]).map((type) => ({
    id: type.id,
    name: type.name,
  }));
}

export async function createMenuDishType(scopeListId: string, name: string) {
  const { error } = await (table("menu_dish_types").insert({
    scope_list_id: scopeListId,
    name: name.trim(),
    position: Date.now(),
  }) as unknown as Promise<TableResult>);
  if (error) throw error;
}

export async function getMenuDishes(planId: string): Promise<MenuDish[]> {
  const { data: days, error: daysError } = await (table("menu_plan_days")
    .select("id")
    .eq("plan_id", planId) as unknown as Promise<TableResult>);
  if (daysError) throw daysError;
  const dayIds = ((days ?? []) as Array<{ id: string }>).map((day) => day.id);
  if (dayIds.length === 0) return [];
  const { data, error } = await (table("menu_plan_dishes")
    .select("id, name, plan_day_id, menu_dish_types(name)")
    .in("plan_day_id", dayIds) as unknown as Promise<TableResult>);
  if (error) throw error;
  return ((data ?? []) as MenuDishRow[]).map((dish) => ({
    id: dish.id,
    name: dish.name,
    planDayId: dish.plan_day_id,
    typeName: dish.menu_dish_types?.name ?? null,
  }));
}

export async function getMenuHistory(
  scopeListId: string,
): Promise<MenuHistoryPlan[]> {
  const { data, error } = await (table("menu_plans")
    .select(
      "id, starts_on, menu_plan_days(planned_on, content, menu_plan_dishes(name, menu_dish_types(name)))",
    )
    .eq("scope_list_id", scopeListId)
    .order("starts_on", { ascending: false })
    .limit(24) as unknown as Promise<TableResult>);
  if (error) throw error;
  return ((data ?? []) as MenuHistoryRow[]).map((plan) => ({
    id: plan.id,
    startsOn: plan.starts_on,
    days: (plan.menu_plan_days ?? []).map((day) => ({
      plannedOn: day.planned_on,
      content: day.content,
      dishes: (day.menu_plan_dishes ?? []).map((dish) => ({
        name: dish.name,
        typeName: dish.menu_dish_types?.name ?? null,
      })),
    })),
  }));
}
