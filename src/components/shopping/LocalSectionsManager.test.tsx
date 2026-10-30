import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ShoppingItem, ShoppingSection } from "../../shoppingItems";
import { LocalSectionsManager } from "./LocalSectionsManager";

function getSectionCard(name: string) {
  const card = screen.getByText(name, { exact: true }).closest("li");

  if (!card) {
    throw new Error(`No se encontró la tarjeta de ${name}.`);
  }

  return card;
}

describe("LocalSectionsManager", () => {
  it("shows section states and enables actions only after loading", () => {
    const sections: ShoppingSection[] = [
      { id: "market-a", name: "Mercadona", color: "mint" },
      { id: "market-b", name: "Farmacia", color: "blue" },
    ];
    const items: ShoppingItem[] = [
      {
        id: "milk",
        name: "Leche",
        sectionId: "market-a",
        addedBy: "rafa",
        purchased: false,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: "bread",
        name: "Pan",
        sectionId: "market-a",
        addedBy: "rafa",
        purchased: true,
        createdAt: 2,
        updatedAt: 2,
      },
    ];
    const onButtonPointerDown = vi.fn();
    const onColorChange = vi.fn();
    const onEdit = vi.fn();
    const onMove = vi.fn();
    const onOpen = vi.fn();
    const onRemove = vi.fn();
    const onToggle = vi.fn();
    const props = {
      actionMessage: "Cambio guardado",
      expandedSectionIds: ["market-a"],
      isLoaded: false,
      items,
      onButtonPointerDown,
      onColorChange,
      onEdit,
      onMove,
      onOpen,
      onRemove,
      onToggle,
      sections,
    };
    const view = render(<LocalSectionsManager {...props} />);
    const marketACard = getSectionCard("Mercadona");
    const marketBCard = getSectionCard("Farmacia");

    expect(screen.getByRole("status")).toHaveTextContent("Cambio guardado");
    expect(within(marketACard).getByText("1 pendientes")).toBeInTheDocument();
    expect(within(marketACard).getByText("2 productos")).toBeInTheDocument();
    expect(
      within(marketACard).getByRole("button", { name: "Editar" }),
    ).toBeDisabled();
    expect(
      within(marketACard).getByRole("button", {
        name: "Poner Mercadona en color mint",
      }),
    ).toBeDisabled();
    expect(
      within(marketACard).getByRole("button", { name: "Borrar Mercadona" }),
    ).toHaveAttribute("title", "No se puede borrar una lista con productos");
    expect(
      within(marketBCard).getByRole("button", { name: "Ver detalles" }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(marketBCard).getByRole("button", { name: "Ver detalles" }),
    );
    expect(onToggle).toHaveBeenCalledWith("market-b");

    view.rerender(
      <LocalSectionsManager
        {...props}
        actionMessage={null}
        expandedSectionIds={["market-a", "market-b"]}
        isLoaded
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const refreshedMarketACard = getSectionCard("Mercadona");
    const refreshedMarketBCard = getSectionCard("Farmacia");
    const mintButton = within(refreshedMarketACard).getByRole("button", {
      name: "Poner Mercadona en color mint",
    });
    const blueButton = within(refreshedMarketACard).getByRole("button", {
      name: "Poner Mercadona en color blue",
    });

    expect(mintButton).toHaveAttribute("aria-pressed", "true");
    expect(blueButton).toHaveAttribute("aria-pressed", "false");
    expect(
      within(refreshedMarketACard).getByRole("button", {
        name: "Subir Mercadona",
      }),
    ).toBeDisabled();
    expect(
      within(refreshedMarketACard).getByRole("button", {
        name: "Bajar Mercadona",
      }),
    ).toBeEnabled();
    expect(
      within(refreshedMarketBCard).getByRole("button", {
        name: "Subir Farmacia",
      }),
    ).toBeEnabled();
    expect(
      within(refreshedMarketBCard).getByRole("button", {
        name: "Bajar Farmacia",
      }),
    ).toBeDisabled();
    expect(
      within(refreshedMarketBCard).getByRole("button", {
        name: "Borrar Farmacia",
      }),
    ).toHaveAttribute("title", "Borrar");

    fireEvent.click(
      within(refreshedMarketACard).getByRole("button", { name: "Editar" }),
    );
    fireEvent.pointerDown(blueButton);
    fireEvent.click(blueButton);
    fireEvent.click(
      within(refreshedMarketACard).getByRole("button", { name: "Abrir lista" }),
    );
    fireEvent.click(
      within(refreshedMarketACard).getByRole("button", {
        name: "Bajar Mercadona",
      }),
    );
    fireEvent.click(
      within(refreshedMarketBCard).getByRole("button", {
        name: "Borrar Farmacia",
      }),
    );

    expect(onEdit).toHaveBeenCalledWith(sections[0]);
    expect(onColorChange).toHaveBeenCalledWith("market-a", "blue");
    expect(onOpen).toHaveBeenCalledWith("market-a");
    expect(onMove).toHaveBeenCalledWith("market-a", 1);
    expect(onRemove).toHaveBeenCalledWith("market-b");
    expect(onButtonPointerDown).toHaveBeenCalledOnce();
  });
});
