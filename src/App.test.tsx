import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach } from "vitest";

import { App } from "./App";
import {
  replaceStoredShoppingItems,
  resetShoppingItemsDatabase,
} from "./shoppingItemsDb";

afterEach(async () => {
  await resetShoppingItemsDatabase();
});

describe("App", () => {
  it("renders the app name", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir" })).toBeEnabled(),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Jucart" }),
    ).toBeInTheDocument();
  });

  it("adds, toggles and removes products", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir" })).toBeEnabled(),
    );

    fireEvent.change(screen.getByLabelText("Producto"), {
      target: { value: "  Leche  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir" }));

    const pendingSection = screen
      .getByRole("heading", { name: "Pendientes" })
      .closest("section");

    expect(pendingSection).not.toBeNull();
    expect(
      within(pendingSection as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Comprado" }));

    const purchasedSection = screen
      .getByRole("heading", { name: "Comprados" })
      .closest("section");

    expect(purchasedSection).not.toBeNull();
    expect(
      within(purchasedSection as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pendiente" }));
    expect(
      within(pendingSection as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.queryByText("Leche")).not.toBeInTheDocument();
  });

  it("loads stored products when it starts", async () => {
    await replaceStoredShoppingItems([
      {
        id: "item-1",
        name: "Leche",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);

    render(<App />);

    await waitFor(() => expect(screen.getByText("Leche")).toBeInTheDocument());
  });
});
