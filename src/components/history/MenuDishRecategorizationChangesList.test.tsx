import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MenuDishRecategorizationChangesList } from "./MenuDishRecategorizationChangesList";

const baseProps = {
  formatDate: () => "10 ago 2026",
  getChangeMeta: () => "Sin tipo → Legumbres",
  getRunSummary: () => "1 plato recategorizado",
  runsById: new Map(),
};

describe("MenuDishRecategorizationChangesList", () => {
  it("muestra el estado vacío según el filtro", () => {
    const { rerender } = render(
      <MenuDishRecategorizationChangesList
        {...baseProps}
        changes={[]}
        showUnseenOnly
      />,
    );

    expect(
      screen.getByText("No hay recategorizaciones de platos pendientes"),
    ).toBeInTheDocument();

    rerender(
      <MenuDishRecategorizationChangesList
        {...baseProps}
        changes={[]}
        showUnseenOnly={false}
      />,
    );

    expect(
      screen.getByText("No hay recategorizaciones de platos"),
    ).toBeInTheDocument();
  });

  it("muestra cambios sin motivo y sin resumen de ejecución", () => {
    render(
      <MenuDishRecategorizationChangesList
        {...baseProps}
        changes={[
          {
            id: "change-1",
            runId: "run-1",
            dishId: null,
            dishName: "Lentejas",
            previousTypeId: null,
            nextTypeId: "type-1",
            reason: "",
            createdAt: "2026-08-10T12:00:00Z",
          },
          {
            id: "change-2",
            runId: "missing-run",
            dishId: "dish-2",
            dishName: "Pasta",
            previousTypeId: "type-1",
            nextTypeId: null,
            reason: "Motivo",
            createdAt: "2026-08-10T12:00:00Z",
          },
        ]}
        getRunSummary={() => null}
        showUnseenOnly={false}
      />,
    );

    expect(screen.getAllByText("Plato recategorizado")).toHaveLength(2);
    expect(screen.getByText("Lentejas")).toBeInTheDocument();
    expect(screen.getByText("Pasta")).toBeInTheDocument();
    expect(screen.getByText("Motivo")).toBeInTheDocument();
  });
});
