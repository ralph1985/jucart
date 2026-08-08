import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrCreate: vi.fn(),
  getProposal: vi.fn(),
  saveDay: vi.fn(),
  request: vi.fn(),
  updateItem: vi.fn(),
  confirm: vi.fn(),
  getTypes: vi.fn(),
  createType: vi.fn(),
  getDishes: vi.fn(),
  getHistory: vi.fn(),
}));

vi.mock("./menuPlanning", () => ({
  getOrCreateMenuPlan: mocks.getOrCreate,
  getLatestMenuProposal: mocks.getProposal,
  saveMenuPlanDay: mocks.saveDay,
  requestMenuPlanReview: mocks.request,
  updateMenuProposalItem: mocks.updateItem,
  confirmMenuProposal: mocks.confirm,
  getMenuDishTypes: mocks.getTypes,
  createMenuDishType: mocks.createType,
  getMenuDishes: mocks.getDishes,
  getMenuHistory: mocks.getHistory,
}));

import { MenuPlanningView } from "./MenuPlanningView";

const lists = [{ id: "list-1", name: "Casa" }] as never;

describe("MenuPlanningView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrCreate.mockResolvedValue({ plan: { id: "plan-1" }, days: [] });
    mocks.getProposal.mockResolvedValue({
      id: "proposal-1",
      status: "ready",
      errorMessage: null,
      items: [
        {
          id: "item-1",
          name: "Tomates",
          quantity: "500 g",
          destinationListId: "list-1",
          selected: true,
          confirmedAt: null,
        },
      ],
    });
    mocks.getTypes.mockResolvedValue([{ id: "type-1", name: "Cena" }]);
    mocks.getDishes.mockResolvedValue([
      { id: "dish-1", name: "Ensalada", planDayId: "day-1", typeName: "Cena" },
    ]);
    mocks.getHistory.mockResolvedValue([
      {
        id: "old",
        startsOn: "2026-08-01",
        days: [
          {
            plannedOn: "2026-08-01",
            content: "Pasta",
            dishes: [{ name: "Pasta", typeName: "Comida" }],
          },
        ],
      },
    ]);
  });

  it("guarda, revisa, edita, confirma y consulta el histórico", async () => {
    render(<MenuPlanningView lists={lists} />);
    await waitFor(() =>
      expect(screen.getByText("Propuesta de compra")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Producto"), {
      target: { value: "Tomate pera" },
    });
    await waitFor(() => expect(mocks.updateItem).toHaveBeenCalled());
    fireEvent.click(
      screen.getByRole("button", { name: "Añadir seleccionados" }),
    );
    await waitFor(() =>
      expect(mocks.confirm).toHaveBeenCalledWith("proposal-1"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Revisar con Codex" }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith("plan-1"));
    fireEvent.change(screen.getByLabelText("Nuevo tipo"), {
      target: { value: "Brunch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir tipo" }));
    await waitFor(() =>
      expect(mocks.createType).toHaveBeenCalledWith("list-1", "Brunch"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cargar histórico" }));
    await waitFor(() =>
      expect(screen.getByText("2026-08-01")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Buscar en el histórico"), {
      target: { value: "Pasta" },
    });
    expect(screen.getByText(/Pasta/)).toBeInTheDocument();
  });
});
