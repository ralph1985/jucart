import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getConfig: vi.fn(),
  createAction: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("./supabaseConfig", () => ({ getSupabaseConfig: mocks.getConfig }));
vi.mock("./remoteActions", () => ({ createRemoteAction: mocks.createAction }));

import {
  confirmMenuProposal,
  createMenuDishType,
  getLatestMenuProposal,
  getMenuDishes,
  getMenuDishTypes,
  getMenuHistory,
  getOrCreateMenuPlan,
  requestMenuPlanReview,
  saveMenuPlanDay,
  updateMenuProposalItem,
} from "./menuPlanning";

function query(data: unknown, error: unknown = null) {
  const value: Record<string, unknown> = { data, error };
  for (const key of [
    "select",
    "insert",
    "update",
    "upsert",
    "eq",
    "in",
    "order",
    "limit",
  ])
    value[key] = vi.fn(() => value);
  value.maybeSingle = vi.fn(async () => ({ data, error }));
  value.single = vi.fn(async () => ({ data, error }));
  return value;
}

describe("menuPlanning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: "key",
    });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.createClient.mockReturnValue({
      auth: { getUser: mocks.getUser },
      from: mocks.from,
      rpc: mocks.rpc,
    });
    mocks.createAction.mockResolvedValue("action-1");
    mocks.rpc.mockResolvedValue({ data: [], error: null });
  });

  it("crea/carga el plan, guarda días y solicita la revisión", async () => {
    mocks.from.mockImplementation((name: string) =>
      name === "menu_plans"
        ? query({
            id: "plan-1",
            scope_list_id: "list-1",
            starts_on: "2026-08-08",
          })
        : query([]),
    );
    await expect(
      getOrCreateMenuPlan("list-1", "2026-08-08"),
    ).resolves.toMatchObject({ plan: { id: "plan-1" } });
    await expect(
      saveMenuPlanDay("plan-1", "2026-08-08", "  Pasta "),
    ).resolves.toBeUndefined();
    await expect(requestMenuPlanReview("plan-1")).resolves.toBe("action-1");
    expect(mocks.createAction).toHaveBeenCalledWith(
      "review_menu_plan",
      expect.stringMatching(/^review_menu_plan-plan-1-/),
      { planId: "plan-1" },
    );
  });

  it("mapea propuestas, platos, tipos e histórico", async () => {
    mocks.from.mockImplementation((name: string) => {
      if (name === "menu_plan_proposals")
        return query({
          id: "proposal-1",
          status: "ready",
          error_message: null,
          menu_plan_proposal_items: [
            {
              id: "item-1",
              name: "Tomates",
              quantity: null,
              destination_list_id: "list-1",
              selected: true,
              confirmed_at: null,
            },
          ],
        });
      if (name === "menu_plan_days") return query([{ id: "day-1" }]);
      if (name === "menu_plan_dishes")
        return query([
          {
            id: "dish-1",
            name: "Ensalada",
            plan_day_id: "day-1",
            menu_dish_types: { name: "Cena" },
          },
        ]);
      if (name === "menu_dish_types")
        return query([{ id: "type-1", name: "Cena" }]);
      return query([
        {
          id: "plan-1",
          starts_on: "2026-08-01",
          menu_plan_days: [
            {
              planned_on: "2026-08-01",
              content: "Pasta",
              menu_plan_dishes: [],
            },
          ],
        },
      ]);
    });
    await expect(getLatestMenuProposal("plan-1")).resolves.toMatchObject({
      id: "proposal-1",
      items: [{ name: "Tomates" }],
    });
    await expect(getMenuDishes("plan-1")).resolves.toEqual([
      { id: "dish-1", name: "Ensalada", planDayId: "day-1", typeName: "Cena" },
    ]);
    await expect(getMenuDishTypes("list-1")).resolves.toEqual([
      { id: "type-1", name: "Cena" },
    ]);
    await expect(getMenuHistory("list-1")).resolves.toMatchObject([
      { startsOn: "2026-08-01" },
    ]);
  });

  it("actualiza propuesta, crea tipos, confirma y propaga errores", async () => {
    mocks.from.mockReturnValue(query([], null));
    await expect(
      updateMenuProposalItem("item-1", {
        name: " Tomate ",
        quantity: "1 kg",
        destinationListId: "list-1",
        selected: false,
      }),
    ).resolves.toBeUndefined();
    await expect(
      createMenuDishType("list-1", " Brunch "),
    ).resolves.toBeUndefined();
    await expect(confirmMenuProposal("proposal-1")).resolves.toEqual([]);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("fallo") });
    await expect(confirmMenuProposal("proposal-1")).rejects.toThrow("fallo");
  });
});
