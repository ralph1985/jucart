import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLibrary: vi.fn(),
  getDishes: vi.fn(),
  createDish: vi.fn(),
  updateDish: vi.fn(),
  deleteDish: vi.fn(),
  getTypes: vi.fn(),
  getCategories: vi.fn(),
  createType: vi.fn(),
  createCategory: vi.fn(),
  updateType: vi.fn(),
  updateCategory: vi.fn(),
  deleteType: vi.fn(),
  deleteCategory: vi.fn(),
}));

vi.mock("./menuPlanning", () => ({
  getMenuDishLibrary: mocks.getLibrary,
  getMenuDishes: mocks.getDishes,
  createMenuDish: mocks.createDish,
  updateMenuDish: mocks.updateDish,
  deleteMenuDish: mocks.deleteDish,
  getMenuDishTypes: mocks.getTypes,
  getMenuDishCategories: mocks.getCategories,
  createMenuDishType: mocks.createType,
  createMenuDishCategory: mocks.createCategory,
  updateMenuDishType: mocks.updateType,
  updateMenuDishCategory: mocks.updateCategory,
  deleteMenuDishType: mocks.deleteType,
  deleteMenuDishCategory: mocks.deleteCategory,
}));

import { MenuPlanningView } from "./MenuPlanningView";

const pendingDish = {
  id: "dish-1",
  libraryId: "library-1",
  name: "Lentejas",
  dishTypeId: "type-1",
  typeName: "Legumbres",
  status: "pending",
  cookedAt: null,
  createdAt: "2026-08-10T10:00:00Z",
  updatedAt: "2026-08-10T10:00:00Z",
  rating: null,
  description: null,
  comment: null,
  categories: [],
} as const;
const cookedDish = {
  ...pendingDish,
  id: "dish-2",
  name: "Tortilla",
  status: "cooked",
  cookedAt: "2026-08-09T18:00:00Z",
  rating: 4,
  description: "Tortilla clásica de patata",
  comment: "Añadir cebolla",
} as const;

describe("MenuPlanningView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLibrary.mockResolvedValue("library-1");
    mocks.getDishes.mockResolvedValue([pendingDish, cookedDish]);
    mocks.getTypes.mockResolvedValue([{ id: "type-1", name: "Legumbres" }]);
    mocks.getCategories.mockResolvedValue([
      { id: "category-1", name: "Legumbres", position: 0 },
    ]);
    mocks.createDish.mockResolvedValue({
      ...pendingDish,
      id: "dish-3",
      name: "Macarrones",
    });
    mocks.updateDish.mockImplementation(
      async (id: string, values: Record<string, unknown>) => ({
        ...(id === "dish-1" ? pendingDish : cookedDish),
        ...values,
        status: values.status ?? (id === "dish-1" ? "pending" : "cooked"),
        cookedAt:
          values.cookedAt ?? (id === "dish-1" ? null : cookedDish.cookedAt),
      }),
    );
    mocks.createType.mockResolvedValue(undefined);
    mocks.createCategory.mockResolvedValue(undefined);
    mocks.updateType.mockResolvedValue(undefined);
    mocks.updateCategory.mockResolvedValue(undefined);
    mocks.deleteType.mockResolvedValue(undefined);
    mocks.deleteCategory.mockResolvedValue(undefined);
    mocks.deleteDish.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("muestra pendientes, permite añadir y pasa un plato al histórico", async () => {
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );
    expect(screen.getByText("por cocinar")).toBeInTheDocument();
    expect(screen.queryByText("Tortilla")).not.toBeInTheDocument();

    const addDishButton = screen.getByRole("button", {
      name: "Añadir plato",
    });
    expect(addDishButton.className).toContain("floatingAddButton");
    fireEvent.click(addDishButton);
    fireEvent.change(screen.getByLabelText("Nombre del plato"), {
      target: { value: "Macarrones" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir plato" }));
    await waitFor(() =>
      expect(mocks.createDish).toHaveBeenCalledWith(
        "library-1",
        "Macarrones",
        null,
        [],
        "",
        "",
      ),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Añadir plato" }),
      ),
    );

    const cookButtons = screen.getAllByRole("button", {
      name: /Marcar cocinado: Lentejas/,
    });
    fireEvent.click(cookButtons[cookButtons.length - 1]);
    await waitFor(() =>
      expect(mocks.updateDish).toHaveBeenCalledWith(
        "dish-1",
        expect.objectContaining({ status: "cooked" }),
      ),
    );
  });

  it("consulta cocinados, filtra por tipo y permite editar y eliminar", async () => {
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("tab", { name: /Cocinados/ }));
    expect(screen.getByText("Tortilla")).toBeInTheDocument();
    expect(screen.getByText(/9 ago 2026/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar: Tortilla" }));
    fireEvent.change(screen.getByLabelText("Nombre del plato"), {
      target: { value: "Tortilla de patata" },
    });
    fireEvent.change(screen.getByLabelText("Descripción (opcional)"), {
      target: { value: "Una tortilla jugosa" },
    });
    fireEvent.change(screen.getByLabelText("Comentario (opcional)"), {
      target: { value: "Hacerla con cebolla" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() =>
      expect(mocks.updateDish).toHaveBeenCalledWith(
        "dish-2",
        expect.objectContaining({
          name: "Tortilla de patata",
          description: "Una tortilla jugosa",
          comment: "Hacerla con cebolla",
        }),
      ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Eliminar: Tortilla de patata" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Eliminar plato" })).getByRole(
        "button",
        { name: "Eliminar plato" },
      ),
    );
    await waitFor(() =>
      expect(mocks.deleteDish).toHaveBeenCalledWith("dish-2"),
    );
  });

  it("busca platos por nombre y mantiene el filtro de estado", async () => {
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("Buscar platos"), {
      target: { value: "tortilla" },
    });
    expect(screen.queryByText("Lentejas")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Cocinados/ }));
    expect(screen.getByText("Tortilla")).toBeInTheDocument();
  });

  it("busca platos por descripción y comentario", async () => {
    mocks.getDishes.mockResolvedValue([
      { ...pendingDish, description: "Receta de cuchara", comment: null },
      { ...cookedDish, description: null, comment: "Para días fríos" },
    ]);
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("Buscar platos"), {
      target: { value: "cuchara" },
    });
    expect(screen.getByText("Lentejas")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar platos"), {
      target: { value: "fríos" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /Cocinados/ }));
    expect(screen.getByText("Tortilla")).toBeInTheDocument();
  });

  it("limpia los filtros y explica cuando no hay coincidencias", async () => {
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("Buscar platos"), {
      target: { value: "pizza" },
    });
    expect(
      screen.getByText("No hay platos con estos filtros."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(screen.getByText("Lentejas")).toBeInTheDocument();
    expect(
      screen.queryByText("No hay platos con estos filtros."),
    ).not.toBeInTheDocument();
  });

  it("permite puntuar, quitar la nota y ordenar por valoración", async () => {
    mocks.getDishes.mockResolvedValue([
      pendingDish,
      cookedDish,
      { ...cookedDish, id: "dish-3", name: "Arroz", rating: 2 },
    ]);
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );

    const ratingGroup = screen.getByRole("group", {
      name: "Valorar Lentejas",
    });
    fireEvent.click(
      within(ratingGroup).getByRole("button", {
        name: "Valorar Lentejas con 5 estrellas",
      }),
    );
    await waitFor(() =>
      expect(mocks.updateDish).toHaveBeenCalledWith("dish-1", { rating: 5 }),
    );

    fireEvent.click(
      within(ratingGroup).getByRole("button", {
        name: "Quitar valoración de Lentejas",
      }),
    );
    await waitFor(() =>
      expect(mocks.updateDish).toHaveBeenCalledWith("dish-1", { rating: null }),
    );

    fireEvent.click(screen.getByRole("tab", { name: /Cocinados/ }));
    fireEvent.change(screen.getByLabelText("Ordenar platos"), {
      target: { value: "rating-desc" },
    });
    const cookedRows = [...document.querySelectorAll(".menuDishRow")];
    expect(cookedRows[0]).toHaveTextContent("Tortilla");
    expect(cookedRows[1]).toHaveTextContent("Arroz");
  });

  it("muestra el contexto de resultados al filtrar por tipo y categoría", async () => {
    mocks.getDishes.mockResolvedValue([
      pendingDish,
      { ...pendingDish, id: "dish-3", name: "Garbanzos" },
      cookedDish,
    ]);
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Garbanzos")).toBeInTheDocument(),
    );

    expect(screen.getByText("2 platos visibles")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tipo funcional"), {
      target: { value: "type-1" },
    });
    fireEvent.change(screen.getByLabelText("Categoría culinaria"), {
      target: { value: "category-1" },
    });
    expect(
      screen.getByText("No hay platos con estos filtros."),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver todos los platos" }),
    );
    expect(screen.getByText("2 platos visibles")).toBeInTheDocument();
  });

  it("explica la biblioteca vacía sin filtros", async () => {
    mocks.getDishes.mockResolvedValue([]);
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(
        screen.getByText("Todavía no hay platos por cocinar."),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        "Añade una idea arriba para empezar a llenar la semana.",
      ),
    ).toBeInTheDocument();
  });

  it("gestiona tipos y errores de carga", async () => {
    mocks.getDishes.mockRejectedValueOnce(new Error("offline"));
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(
        screen.getByText("No se pudo cargar la biblioteca de platos."),
      ).toBeInTheDocument(),
    );
  });

  it("muestra un error si no existe una biblioteca compartida", async () => {
    mocks.getLibrary.mockRejectedValueOnce(new Error("missing"));
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(
        screen.getByText("No se pudo cargar la biblioteca de platos."),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Añadir plato" })).toBeDisabled();
  });

  it("gestiona tipos desde una modal y solicita la recategorización", async () => {
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Gestionar tipos de plato" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Tipos de plato" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nuevo tipo"), {
      target: { value: "Pasta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir" }));
    await waitFor(() =>
      expect(mocks.createType).toHaveBeenCalledWith("library-1", "Pasta"),
    );
    expect(
      screen.getByRole("button", { name: /Marcar cocinado: Lentejas/ }),
    ).toBeInTheDocument();
  });

  it("permite renombrar y eliminar tipos de plato", async () => {
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Gestionar tipos de plato" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Tipos de plato" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Editar" }));
    fireEvent.change(
      within(dialog).getByRole("textbox", { name: "Renombrar Legumbres" }),
      {
        target: { value: "Legumbres y verduras" },
      },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(mocks.updateType).toHaveBeenCalledWith(
        "type-1",
        "Legumbres y verduras",
      ),
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: "Eliminar tipo de plato" }),
      ).getByRole("button", { name: "Eliminar tipo" }),
    );
    await waitFor(() =>
      expect(mocks.deleteType).toHaveBeenCalledWith("type-1"),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("muestra errores al guardar o eliminar tipos", async () => {
    mocks.createType.mockRejectedValueOnce(new Error("offline"));
    mocks.deleteType.mockRejectedValueOnce(new Error("offline"));
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Gestionar tipos de plato" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Tipos de plato" });
    fireEvent.change(within(dialog).getByLabelText("Nuevo tipo"), {
      target: { value: "Pasta" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));
    await waitFor(() =>
      expect(
        within(dialog).getByText("No se pudo guardar el tipo de plato."),
      ).toBeInTheDocument(),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: "Eliminar tipo de plato" }),
      ).getByRole("button", { name: "Eliminar tipo" }),
    );
    await waitFor(() =>
      expect(
        within(dialog).getByText("No se pudo eliminar el tipo de plato."),
      ).toBeInTheDocument(),
    );
  });

  it("gestiona categorías culinarias desde la biblioteca", async () => {
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Gestionar tipos de plato" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Tipos de plato" });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Categorías" }));

    fireEvent.change(within(dialog).getByLabelText("Nueva categoría"), {
      target: { value: "Verduras" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Añadir categoría" }),
    );
    await waitFor(() =>
      expect(mocks.createCategory).toHaveBeenCalledWith(
        "library-1",
        "Verduras",
      ),
    );

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Editar categoría Legumbres",
      }),
    );
    fireEvent.change(
      within(dialog).getByRole("textbox", {
        name: "Renombrar categoría Legumbres",
      }),
      { target: { value: "Hortalizas" } },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(mocks.updateCategory).toHaveBeenCalledWith(
        "category-1",
        "Hortalizas",
      ),
    );

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Eliminar categoría Legumbres",
      }),
    );
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: "Eliminar categoría" }),
      ).getByRole("button", { name: "Eliminar categoría" }),
    );
    await waitFor(() =>
      expect(mocks.deleteCategory).toHaveBeenCalledWith("category-1"),
    );
  });

  it("informa errores al guardar o eliminar categorías", async () => {
    mocks.createCategory.mockRejectedValueOnce(new Error("offline"));
    mocks.deleteCategory.mockRejectedValueOnce(new Error("offline"));
    render(<MenuPlanningView />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Gestionar tipos de plato" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Tipos de plato" });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Categorías" }));
    fireEvent.change(within(dialog).getByLabelText("Nueva categoría"), {
      target: { value: "Verduras" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Añadir categoría" }),
    );
    await waitFor(() =>
      expect(
        within(dialog).getByText("No se pudo guardar la categoría culinaria."),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Eliminar categoría Legumbres",
      }),
    );
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: "Eliminar categoría" }),
      ).getByRole("button", { name: "Eliminar categoría" }),
    );
    await waitFor(() =>
      expect(
        within(dialog).getByText("No se pudo eliminar la categoría culinaria."),
      ).toBeInTheDocument(),
    );
  });
});
