import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { App } from "./App";
import {
  replaceStoredShoppingItems,
  resetShoppingItemsDatabase,
} from "./shoppingItemsDb";

afterEach(async () => {
  vi.restoreAllMocks();
  await resetShoppingItemsDatabase();
  window.localStorage.clear();
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

    const productInput = screen.getByLabelText("Producto");

    fireEvent.change(productInput, {
      target: { value: "  Leche  " },
    });
    fireEvent.change(screen.getByLabelText("Sección"), {
      target: { value: "alcampo" },
    });
    fireEvent.change(screen.getByLabelText("Añadido por"), {
      target: { value: "begona" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir" }));

    expect(productInput).toHaveFocus();
    expect(productInput).toHaveValue("");

    const alcampoColumn = screen
      .getByRole("heading", { name: "Alcampo" })
      .closest("article");

    expect(alcampoColumn).not.toBeNull();
    expect(
      within(alcampoColumn as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();
    expect(
      within(alcampoColumn as HTMLElement).getByText("Añadido por Begoña"),
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

  it("restores the last selected section and user", async () => {
    window.localStorage.setItem("jucart:selected-section-id", "farmacia");
    window.localStorage.setItem("jucart:selected-user-id", "begona");

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir" })).toBeEnabled(),
    );

    expect(screen.getByLabelText("Sección")).toHaveValue("farmacia");
    expect(screen.getByLabelText("Añadido por")).toHaveValue("begona");
  });

  it("removes purchased products after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    await replaceStoredShoppingItems([
      {
        id: "item-1",
        name: "Leche",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: "item-2",
        name: "Pan",
        sectionId: "mercadona",
        addedBy: "begona",
        purchased: true,
        createdAt: 200,
        updatedAt: 200,
      },
    ]);

    render(<App />);

    await screen.findByText("Leche");
    await screen.findByText("Pan");

    fireEvent.click(screen.getByRole("button", { name: "Borrar comprados" }));

    expect(confirmSpy).toHaveBeenCalledWith("¿Borrar 1 productos comprados?");
    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.queryByText("Pan")).not.toBeInTheDocument();
  });

  it("shows pending products before purchased products in each section", async () => {
    await replaceStoredShoppingItems([
      {
        id: "item-1",
        name: "Yogur",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: true,
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: "item-2",
        name: "Leche",
        sectionId: "mercadona",
        addedBy: "begona",
        purchased: false,
        createdAt: 200,
        updatedAt: 200,
      },
      {
        id: "item-3",
        name: "Pan",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: false,
        createdAt: 300,
        updatedAt: 300,
      },
    ]);

    render(<App />);

    const mercadonaColumn = (
      await screen.findByRole("heading", { name: "Mercadona" })
    ).closest("article");

    expect(mercadonaColumn).not.toBeNull();

    const productNames = within(mercadonaColumn as HTMLElement)
      .getAllByText(/^(Leche|Pan|Yogur)$/)
      .map((productName) => productName.textContent);

    expect(productNames).toEqual(["Leche", "Pan", "Yogur"]);
    expect(
      within(mercadonaColumn as HTMLElement).getByText("Comprados"),
    ).toBeInTheDocument();
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
        addedBy: "rafa",
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
