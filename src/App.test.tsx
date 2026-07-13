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

    fireEvent.click(
      screen.getByRole("button", { name: "Marcar Leche como comprado" }),
    );
    expect(
      within(alcampoColumn as HTMLElement).getByRole("button", {
        name: "Devolver Leche a pendientes",
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Devolver Leche a pendientes" }),
    );
    expect(
      within(alcampoColumn as HTMLElement).getByRole("button", {
        name: "Marcar Leche como comprado",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Leche" }));
    expect(screen.queryByText("Leche")).not.toBeInTheDocument();
  });

  it("edits a product name and section", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir" })).toBeEnabled(),
    );

    fireEvent.change(screen.getByLabelText("Producto"), {
      target: { value: "Leche" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Leche" }));

    fireEvent.change(screen.getByLabelText("Nombre del producto"), {
      target: { value: "Pan integral" },
    });
    fireEvent.change(screen.getByLabelText("Sección del producto"), {
      target: { value: "farmacia" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const farmaciaColumn = screen
      .getByRole("heading", { name: "Farmacia" })
      .closest("article");
    const mercadonaColumn = screen
      .getByRole("heading", { name: "Mercadona" })
      .closest("article");

    expect(farmaciaColumn).not.toBeNull();
    expect(mercadonaColumn).not.toBeNull();
    expect(
      within(farmaciaColumn as HTMLElement).getByText("Pan integral"),
    ).toBeInTheDocument();
    expect(
      within(mercadonaColumn as HTMLElement).queryByText("Leche"),
    ).not.toBeInTheDocument();
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
