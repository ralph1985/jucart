import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getConfig: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  createRemoteAction: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("./supabaseConfig", () => ({ getSupabaseConfig: mocks.getConfig }));

import {
  createMenuDish,
  createMenuDishType,
  deleteMenuDish,
  getMenuDishCategories,
  createMenuDishCategory,
  updateMenuDishCategory,
  deleteMenuDishCategory,
  getMenuDishLibrary,
  getMenuDishes,
  getMenuDishTypes,
  getLatestMenuDishRecategorization,
  getMenuDishRecategorizationHistory,
  requestMenuDishRecategorization,
  undoMenuDishRecategorization,
  updateMenuDishType,
  deleteMenuDishType,
  updateMenuDish,
} from "./menuPlanning";

vi.mock("./remoteActions", () => ({
  createRemoteAction: mocks.createRemoteAction,
}));

function query(data: unknown, error: unknown = null) {
  const value: Record<string, unknown> = { data, error };
  for (const key of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "order",
    "limit",
  ])
    value[key] = vi.fn(() => value);
  value.single = vi.fn(async () => ({ data, error }));
  value.maybeSingle = vi.fn(async () => ({ data, error }));
  return value;
}

const row = {
  id: "dish-1",
  library_id: "library-1",
  name: "Lentejas",
  dish_type_id: "type-1",
  status: "pending",
  cooked_at: null,
  created_at: "2026-08-10T10:00:00Z",
  updated_at: "2026-08-10T10:00:00Z",
  rating: null,
  description: null,
  comment: null,
  menu_dish_types: { id: "type-1", name: "Legumbres" },
  menu_dish_category_links: [
    {
      position: 0,
      menu_dish_categories: {
        id: "category-1",
        name: "Legumbres",
        position: 0,
      },
    },
  ],
};

describe("menuPlanning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: "key",
    });
    mocks.createClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
    mocks.createRemoteAction.mockResolvedValue("action-1");
    mocks.rpc.mockResolvedValue({ data: 1, error: null });
  });

  it("mapea la colección y sus tipos", async () => {
    mocks.from.mockImplementation((name: string) =>
      name === "menu_dish_libraries"
        ? query({ id: "library-1" })
        : name === "menu_dish_types"
          ? query([{ id: "type-1", name: "Legumbres" }])
          : name === "menu_dish_categories"
            ? query([{ id: "category-1", name: "Legumbres", position: 0 }])
            : query([row]),
    );
    await expect(getMenuDishLibrary()).resolves.toBe("library-1");
    await expect(getMenuDishes("library-1")).resolves.toEqual([
      expect.objectContaining({ name: "Lentejas", typeName: "Legumbres" }),
    ]);
    await expect(getMenuDishTypes("library-1")).resolves.toEqual([
      { id: "type-1", name: "Legumbres" },
    ]);
    await expect(getMenuDishCategories("library-1")).resolves.toEqual([
      { id: "category-1", name: "Legumbres", position: 0 },
    ]);
  });

  it("rechaza una biblioteca sin identificador", async () => {
    mocks.from.mockReturnValue(query(null));
    await expect(getMenuDishLibrary()).rejects.toThrow(
      "No tienes una biblioteca de platos compartida.",
    );
  });

  it("tolera platos antiguos sin tipo ni categorías", async () => {
    mocks.from.mockReturnValue(
      query([
        {
          ...row,
          menu_dish_types: null,
          menu_dish_category_links: [
            { position: 0, menu_dish_categories: null },
          ],
        },
      ]),
    );
    await expect(getMenuDishes("library-1")).resolves.toEqual([
      expect.objectContaining({ typeName: null, categories: [] }),
    ]);
  });

  it("tolera respuestas remotas sin la relación de categorías", async () => {
    mocks.from.mockReturnValue(
      query([{ ...row, menu_dish_category_links: undefined }]),
    );
    await expect(getMenuDishes("library-1")).resolves.toEqual([
      expect.objectContaining({ categories: [] }),
    ]);
  });

  it("crea, actualiza y elimina un plato", async () => {
    mocks.from.mockReturnValue(query(row));
    await expect(
      createMenuDish("library-1", " Lentejas ", "type-1"),
    ).resolves.toMatchObject({
      name: "Lentejas",
    });
    await expect(
      updateMenuDish("dish-1", {
        status: "cooked",
        cookedAt: "2026-08-10T12:00:00Z",
        rating: 4,
        description: "Un plato de cuchara",
        comment: "Mejor con pimentón",
        categoryIds: ["category-1"],
      }),
    ).resolves.toMatchObject({
      id: "dish-1",
    });
    await expect(deleteMenuDish("dish-1")).resolves.toBeUndefined();
    await expect(
      createMenuDishType("library-1", " Pasta "),
    ).resolves.toBeUndefined();
    await expect(
      createMenuDishCategory("library-1", " Verduras "),
    ).resolves.toBeUndefined();
    await expect(
      updateMenuDishCategory("category-1", " Hortalizas "),
    ).resolves.toBeUndefined();
    await expect(deleteMenuDishCategory("category-1")).resolves.toBeUndefined();
  });

  it("normaliza descripciones y comentarios vacíos", async () => {
    const dishQuery = query(row);
    mocks.from.mockReturnValue(dishQuery);

    await updateMenuDish("dish-1", {
      description: "  ",
      comment: "  Nota útil  ",
    });

    expect(dishQuery.update).toHaveBeenCalledWith({
      description: null,
      comment: "Nota útil",
    });
  });

  it("gestiona tipos y recategorización remota con deshacer", async () => {
    mocks.from.mockImplementation((name: string) => {
      if (name === "menu_dish_recategorization_runs") {
        return query({
          id: "run-1",
          library_id: "library-1",
          summary: "1 plato",
          dishes_recategorized: 1,
          created_at: "2026-08-10T12:00:00Z",
          reverted_at: null,
        });
      }
      return query(row);
    });

    await expect(
      updateMenuDishType("type-1", " Verduras "),
    ).resolves.toBeUndefined();
    await expect(deleteMenuDishType("type-1")).resolves.toBeUndefined();
    await expect(requestMenuDishRecategorization("library-1")).resolves.toBe(
      "action-1",
    );
    await expect(
      getLatestMenuDishRecategorization("library-1"),
    ).resolves.toMatchObject({
      id: "run-1",
      dishesRecategorized: 1,
    });
    await expect(undoMenuDishRecategorization("run-1")).resolves.toBe(1);
    expect(mocks.rpc).toHaveBeenCalledWith("undo_menu_dish_recategorization", {
      p_run_id: "run-1",
    });
  });

  it("carga el histórico de recategorización de platos", async () => {
    mocks.from.mockImplementation((name: string) =>
      name === "menu_dish_recategorization_runs"
        ? query([
            {
              id: "run-1",
              library_id: "library-1",
              summary: "1 plato",
              dishes_recategorized: 1,
              created_at: "2026-08-10T12:00:00Z",
              reverted_at: null,
            },
          ])
        : query([
            {
              id: "change-1",
              run_id: "run-1",
              dish_id: "dish-1",
              dish_name: "Lentejas",
              previous_type_id: null,
              next_type_id: "type-1",
              reason: "El nombre lo indica con claridad.",
              created_at: "2026-08-10T12:00:00Z",
            },
          ]),
    );

    await expect(
      getMenuDishRecategorizationHistory("library-1"),
    ).resolves.toEqual({
      runs: [expect.objectContaining({ id: "run-1" })],
      changes: [
        expect.objectContaining({
          id: "change-1",
          dishName: "Lentejas",
          nextTypeId: "type-1",
        }),
      ],
    });
  });

  it("propaga errores al cargar el histórico de platos", async () => {
    mocks.from.mockImplementation((name: string) =>
      query(null, new Error(`${name} failed`)),
    );

    await expect(
      getMenuDishRecategorizationHistory("library-1"),
    ).rejects.toThrow("menu_dish_recategorization_runs failed");
  });

  it("propaga errores de cambios al cargar el histórico", async () => {
    mocks.from.mockImplementation((name: string) =>
      name === "menu_dish_recategorization_runs"
        ? query([])
        : query(null, new Error("changes failed")),
    );

    await expect(
      getMenuDishRecategorizationHistory("library-1"),
    ).rejects.toThrow("changes failed");
  });
});
