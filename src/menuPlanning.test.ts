import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getConfig: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("./supabaseConfig", () => ({ getSupabaseConfig: mocks.getConfig }));

import {
  createMenuDish,
  createMenuDishType,
  deleteMenuDish,
  getMenuDishes,
  getMenuDishTypes,
  updateMenuDish,
} from "./menuPlanning";

function query(data: unknown, error: unknown = null) {
  const value: Record<string, unknown> = { data, error };
  for (const key of ["select", "insert", "update", "delete", "eq", "order"])
    value[key] = vi.fn(() => value);
  value.single = vi.fn(async () => ({ data, error }));
  value.maybeSingle = vi.fn(async () => ({ data, error }));
  return value;
}

const row = {
  id: "dish-1",
  scope_list_id: "list-1",
  name: "Lentejas",
  dish_type_id: "type-1",
  status: "pending",
  cooked_at: null,
  created_at: "2026-08-10T10:00:00Z",
  updated_at: "2026-08-10T10:00:00Z",
  menu_dish_types: { id: "type-1", name: "Legumbres" },
};

describe("menuPlanning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: "key",
    });
    mocks.createClient.mockReturnValue({ from: mocks.from });
  });

  it("mapea la colección y sus tipos", async () => {
    mocks.from.mockImplementation((name: string) =>
      name === "menu_dish_types"
        ? query([{ id: "type-1", name: "Legumbres" }])
        : query([row]),
    );
    await expect(getMenuDishes("list-1")).resolves.toEqual([
      expect.objectContaining({ name: "Lentejas", typeName: "Legumbres" }),
    ]);
    await expect(getMenuDishTypes("list-1")).resolves.toEqual([
      { id: "type-1", name: "Legumbres" },
    ]);
  });

  it("crea, actualiza y elimina un plato", async () => {
    mocks.from.mockReturnValue(query(row));
    await expect(
      createMenuDish("list-1", " Lentejas ", "type-1"),
    ).resolves.toMatchObject({
      name: "Lentejas",
    });
    await expect(
      updateMenuDish("dish-1", {
        status: "cooked",
        cookedAt: "2026-08-10T12:00:00Z",
      }),
    ).resolves.toMatchObject({
      id: "dish-1",
    });
    await expect(deleteMenuDish("dish-1")).resolves.toBeUndefined();
    await expect(
      createMenuDishType("list-1", " Pasta "),
    ).resolves.toBeUndefined();
  });
});
