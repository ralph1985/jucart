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
    fireEvent.change(screen.getByLabelText("Sección"), {
      target: { value: "alcampo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir" }));

    const alcampoColumn = screen
      .getByRole("heading", { name: "Alcampo" })
      .closest("article");

    expect(alcampoColumn).not.toBeNull();
    expect(
      within(alcampoColumn as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Comprado" }));
    expect(
      within(alcampoColumn as HTMLElement).getByRole("button", {
        name: "Pendiente",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pendiente" }));
    expect(
      within(alcampoColumn as HTMLElement).getByRole("button", {
        name: "Comprado",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.queryByText("Leche")).not.toBeInTheDocument();
  });

  it("loads stored products when it starts", async () => {
    await replaceStoredShoppingItems([
      {
        id: "item-1",
        name: "Leche",
        sectionId: "farmacia",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);

    render(<App />);

    const farmaciaColumn = await screen.findByRole("heading", {
      name: "Farmacia",
    });

    await waitFor(() =>
      expect(
        within(farmaciaColumn.closest("article") as HTMLElement).getByText(
          "Leche",
        ),
      ).toBeInTheDocument(),
    );
  });
});
