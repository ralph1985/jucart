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
  delete (Element.prototype as Partial<Element>).scrollIntoView;
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

  it("undoes a removed product", async () => {
    await replaceStoredShoppingItems([
      {
        id: "item-1",
        name: "Pan",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: "item-2",
        name: "Leche",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: false,
        createdAt: 200,
        updatedAt: 200,
      },
      {
        id: "item-3",
        name: "Yogur",
        sectionId: "mercadona",
        addedBy: "begona",
        purchased: false,
        createdAt: 300,
        updatedAt: 300,
      },
    ]);

    render(<App />);

    await screen.findByText("Leche");

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Leche" }));

    const mercadonaColumn = screen
      .getByRole("heading", { name: "Mercadona" })
      .closest("article");

    expect(mercadonaColumn).not.toBeNull();
    expect(
      within(mercadonaColumn as HTMLElement).queryByText("Leche"),
    ).not.toBeInTheDocument();
    expect(
      within(mercadonaColumn as HTMLElement)
        .getAllByText(/^(Pan|Producto borrado\.|Yogur)$/)
        .map((element) => element.textContent),
    ).toEqual(["Pan", "Producto borrado.", "Yogur"]);

    fireEvent.click(
      within(mercadonaColumn as HTMLElement).getByRole("button", {
        name: "Deshacer",
      }),
    );

    expect(
      within(mercadonaColumn as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Producto borrado.")).not.toBeInTheDocument();
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

  it("shows product name as the last add form field", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir" })).toBeEnabled(),
    );

    const sectionSelect = screen.getByLabelText("Sección");
    const userSelect = screen.getByLabelText("Añadido por");
    const productInput = screen.getByLabelText("Producto");

    expect(
      sectionSelect.compareDocumentPosition(productInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      userSelect.compareDocumentPosition(productInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("marks the selected section and updates the selector when a column is clicked", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir" })).toBeEnabled(),
    );

    const mercadonaColumn = screen
      .getByRole("heading", { name: "Mercadona" })
      .closest("article");
    const farmaciaColumn = screen
      .getByRole("heading", { name: "Farmacia" })
      .closest("article");

    expect(mercadonaColumn).toHaveAttribute("aria-current", "true");
    expect(farmaciaColumn).not.toHaveAttribute("aria-current");

    fireEvent.click(farmaciaColumn as HTMLElement);

    expect(screen.getByLabelText("Sección")).toHaveValue("farmacia");
    expect(farmaciaColumn).toHaveAttribute("aria-current", "true");
  });

  it("scrolls the board to the selected section when it is horizontally scrollable", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir" })).toBeEnabled(),
    );

    const board = screen.getByLabelText("Lista por secciones");

    Object.defineProperty(board, "scrollWidth", {
      configurable: true,
      value: 1200,
    });
    Object.defineProperty(board, "clientWidth", {
      configurable: true,
      value: 320,
    });

    fireEvent.change(screen.getByLabelText("Sección"), {
      target: { value: "farmacia" },
    });

    await waitFor(() =>
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      }),
    );
  });

  it("updates the selected section when the board is scrolled on mobile", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Añadir" })).toBeEnabled(),
    );

    const board = screen.getByLabelText("Lista por secciones");
    const alcampoColumn = screen
      .getByRole("heading", { name: "Alcampo" })
      .closest("article");
    const farmaciaColumn = screen
      .getByRole("heading", { name: "Farmacia" })
      .closest("article");

    Object.defineProperty(board, "scrollWidth", {
      configurable: true,
      value: 1200,
    });
    Object.defineProperty(board, "clientWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(board, "scrollLeft", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(alcampoColumn as HTMLElement, "offsetLeft", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(farmaciaColumn as HTMLElement, "offsetLeft", {
      configurable: true,
      value: 900,
    });

    fireEvent.scroll(board);

    expect(screen.getByLabelText("Sección")).toHaveValue("farmacia");
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

  it("undoes removing purchased products", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

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

    expect(screen.queryByText("Pan")).not.toBeInTheDocument();
    expect(screen.getByText("Producto borrado.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.getByText("Pan")).toBeInTheDocument();
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

    await screen.findByText("Leche");

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
