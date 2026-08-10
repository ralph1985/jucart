import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDishes: vi.fn(),
  createDish: vi.fn(),
  updateDish: vi.fn(),
  deleteDish: vi.fn(),
  getTypes: vi.fn(),
  createType: vi.fn(),
}));

vi.mock("./menuPlanning", () => ({
  getMenuDishes: mocks.getDishes,
  createMenuDish: mocks.createDish,
  updateMenuDish: mocks.updateDish,
  deleteMenuDish: mocks.deleteDish,
  getMenuDishTypes: mocks.getTypes,
  createMenuDishType: mocks.createType,
}));

import { MenuPlanningView } from "./MenuPlanningView";

const lists = [{ id: "list-1", name: "Casa" }] as never;
const pendingDish = {
  id: "dish-1",
  scopeListId: "list-1",
  name: "Lentejas",
  dishTypeId: "type-1",
  typeName: "Legumbres",
  status: "pending",
  cookedAt: null,
  createdAt: "2026-08-10T10:00:00Z",
  updatedAt: "2026-08-10T10:00:00Z",
} as const;
const cookedDish = {
  ...pendingDish,
  id: "dish-2",
  name: "Tortilla",
  status: "cooked",
  cookedAt: "2026-08-09T18:00:00Z",
} as const;

describe("MenuPlanningView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDishes.mockResolvedValue([pendingDish, cookedDish]);
    mocks.getTypes.mockResolvedValue([{ id: "type-1", name: "Legumbres" }]);
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
    mocks.deleteDish.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("muestra pendientes, permite añadir y pasa un plato al histórico", async () => {
    render(<MenuPlanningView lists={lists} />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );
    expect(screen.getByText("por cocinar")).toBeInTheDocument();
    expect(screen.queryByText("Tortilla")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Añadir un plato"), {
      target: { value: "Macarrones" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir" }));
    await waitFor(() =>
      expect(mocks.createDish).toHaveBeenCalledWith(
        "list-1",
        "Macarrones",
        null,
      ),
    );

    const cookButtons = screen.getAllByRole("button", {
      name: "Marcar cocinado",
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
    render(<MenuPlanningView lists={lists} />);
    await waitFor(() =>
      expect(screen.getByText("Lentejas")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("tab", { name: /Cocinados/ }));
    expect(screen.getByText("Tortilla")).toBeInTheDocument();
    expect(screen.getByText(/9 ago 2026/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Editar Tortilla"), {
      target: { value: "Tortilla de patata" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(mocks.updateDish).toHaveBeenCalledWith(
        "dish-2",
        expect.objectContaining({ name: "Tortilla de patata" }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await waitFor(() =>
      expect(mocks.deleteDish).toHaveBeenCalledWith("dish-2"),
    );
  });

  it("gestiona tipos y errores de carga", async () => {
    mocks.getDishes.mockRejectedValueOnce(new Error("offline"));
    render(<MenuPlanningView lists={lists} />);
    await waitFor(() =>
      expect(
        screen.getByText("No se pudo cargar la biblioteca de platos."),
      ).toBeInTheDocument(),
    );
  });

  it("no carga ni permite guardar sin listas", () => {
    render(<MenuPlanningView lists={[]} />);
    expect(screen.getByRole("button", { name: "Añadir" })).toBeDisabled();
    expect(mocks.getDishes).not.toHaveBeenCalled();
  });
});
