import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { App } from "./App";
import { defaultShoppingSections } from "./shoppingItems";
import * as shoppingItemsDb from "./shoppingItemsDb";
import {
  replaceStoredShoppingData,
  replaceStoredShoppingItems,
  resetShoppingItemsDatabase,
} from "./shoppingItemsDb";
import * as shoppingItemsSupabase from "./shoppingItemsSupabase";
import * as supabaseConfig from "./supabaseConfig";
import type { ShoppingData } from "./shoppingItemsDb";

const emblaCarouselMock = vi.hoisted(() => {
  const listeners = new Map<string, Set<() => void>>();
  const viewportRef = vi.fn();
  let selectedIndex = 0;

  function emit(eventName: string) {
    listeners.get(eventName)?.forEach((listener) => listener());
  }

  const api = {
    on: vi.fn((eventName: string, listener: () => void) => {
      const eventListeners = listeners.get(eventName) ?? new Set<() => void>();
      eventListeners.add(listener);
      listeners.set(eventName, eventListeners);
    }),
    off: vi.fn((eventName: string, listener: () => void) => {
      listeners.get(eventName)?.delete(listener);
    }),
    reInit: vi.fn(() => emit("reInit")),
    scrollTo: vi.fn((index: number) => {
      selectedIndex = index;
    }),
    selectedScrollSnap: vi.fn(() => selectedIndex),
  };
  const useEmblaCarousel = vi.fn(() => [viewportRef, api]);

  return {
    api,
    reset() {
      selectedIndex = 0;
      listeners.clear();
      viewportRef.mockClear();
      api.on.mockClear();
      api.off.mockClear();
      api.reInit.mockClear();
      api.scrollTo.mockClear();
      api.selectedScrollSnap.mockClear();
      useEmblaCarousel.mockClear();
    },
    selectTo(index: number) {
      selectedIndex = index;
      emit("select");
    },
    useEmblaCarousel,
  };
});

vi.mock("embla-carousel-react", () => ({
  default: emblaCarouselMock.useEmblaCarousel,
}));

afterEach(async () => {
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
  emblaCarouselMock.reset();
  Reflect.deleteProperty(navigator, "setAppBadge");
  Reflect.deleteProperty(navigator, "clearAppBadge");
  delete (Element.prototype as Partial<Element>).scrollIntoView;
  await resetShoppingItemsDatabase();
  window.localStorage.clear();
});

describe("App", () => {
  async function waitForAddFab() {
    const addFab = screen.getByRole("button", { name: "Añadir producto" });

    await waitFor(() => expect(addFab).toBeEnabled());

    return addFab;
  }

  async function openAddSheet() {
    const addFab = await waitForAddFab();
    fireEvent.click(addFab);

    return screen.getByRole("dialog", { name: "Añadir producto" });
  }

  it("renders the app name", async () => {
    render(<App />);

    await waitForAddFab();

    expect(
      screen.getByRole("heading", { level: 1, name: "Jucart" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Local")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Navegación principal" }),
    ).toBeInTheDocument();
  });

  it("adds, uses and restores freezer items", async () => {
    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Congelador" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Añadir producto congelado" }),
    );

    const addFreezerDialog = screen.getByRole("dialog", {
      name: "Añadir producto congelado",
    });

    fireEvent.change(within(addFreezerDialog).getByLabelText("Producto"), {
      target: { value: "Lentejas" },
    });
    const freezerQuantityInput = within(addFreezerDialog).getByLabelText(
      "Cantidad",
    ) as HTMLInputElement;
    fireEvent.change(freezerQuantityInput, {
      target: { value: "2 raciones" },
    });
    fireEvent.focus(freezerQuantityInput);
    expect(freezerQuantityInput.selectionStart).toBe(0);
    expect(freezerQuantityInput.selectionEnd).toBe("2 raciones".length);
    fireEvent.change(within(addFreezerDialog).getByLabelText("Cajón"), {
      target: { value: "middle" },
    });
    fireEvent.change(within(addFreezerDialog).getByLabelText("Congelado"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.click(
      within(addFreezerDialog).getByRole("button", { name: "Añadir" }),
    );

    expect(screen.getByRole("heading", { name: "Usar primero" }));
    expect(screen.getAllByText("Lentejas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 raciones").length).toBeGreaterThan(0);

    fireEvent.click(
      within(addFreezerDialog).getByRole("button", { name: "Cerrar" }),
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Editar Lentejas" })[0],
    );

    const editFreezerDialog = screen.getByRole("dialog", {
      name: "Editar Lentejas",
    });

    const editFreezerQuantityInput = within(editFreezerDialog).getByLabelText(
      "Cantidad",
    ) as HTMLInputElement;
    fireEvent.focus(editFreezerQuantityInput);
    expect(editFreezerQuantityInput.selectionStart).toBe(0);
    expect(editFreezerQuantityInput.selectionEnd).toBe("2 raciones".length);
    fireEvent.change(editFreezerQuantityInput, {
      target: { value: "3 raciones" },
    });
    fireEvent.click(
      within(editFreezerDialog).getByRole("button", { name: "Guardar" }),
    );

    expect(screen.getAllByText("3 raciones").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Usado" })[0]);

    expect(screen.getByText("Lentejas usado.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    expect(screen.queryByText("Lentejas usado.")).not.toBeInTheDocument();
    expect(screen.getAllByText("Lentejas").length).toBeGreaterThan(0);
  });

  it("shows the splash and integrated skeleton while stored products are loading", async () => {
    let resolveStoredData: (data: ShoppingData) => void = () => {};
    const storedDataPromise = new Promise<ShoppingData>((resolve) => {
      resolveStoredData = resolve;
    });

    vi.spyOn(shoppingItemsDb, "getCachedShoppingData").mockReturnValue(
      storedDataPromise,
    );

    render(<App />);

    expect(screen.getAllByText("Jucart").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando lista...");
    expect(
      screen.getByRole("button", { name: "Añadir producto" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Añadido por")).toBeDisabled();
    expect(screen.queryByText("Leche")).not.toBeInTheDocument();

    await act(async () => {
      resolveStoredData({
        items: [
          {
            id: "item-1",
            name: "Leche",
            sectionId: "farmacia",
            addedBy: "rafa",
            purchased: false,
            createdAt: 100,
            updatedAt: 100,
          },
        ],
        sections: defaultShoppingSections,
        historyEvents: [],
        freezerItems: [],
      });

      await storedDataPromise;
    });

    expect(await screen.findByText("Leche")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("Cargando lista...")).not.toBeInTheDocument(),
    );
    await waitForAddFab();
  });

  it("shows Supabase in the loading message when remote storage is configured", async () => {
    let resolveStoredData: (data: ShoppingData) => void = () => {};
    const storedDataPromise = new Promise<ShoppingData>((resolve) => {
      resolveStoredData = resolve;
    });

    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(shoppingItemsDb, "getCachedShoppingData").mockReturnValue(
      storedDataPromise,
    );

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Cargando lista de Supabase...",
    );

    await act(async () => {
      resolveStoredData({
        items: [],
        sections: defaultShoppingSections,
        historyEvents: [],
        freezerItems: [],
      });

      await storedDataPromise;
    });
  });

  it("shows the developer view only when Rafa is selected", async () => {
    render(<App />);

    await waitForAddFab();

    fireEvent.click(
      screen.getByRole("button", { name: "Vista de desarrollador" }),
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Dev" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Backup Supabase")).toBeInTheDocument();
    expect(screen.getByText("Sin copias registradas")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Añadido por"), {
      target: { value: "begona" },
    });

    expect(
      screen.queryByRole("button", { name: "Vista de desarrollador" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Dev" }),
    ).not.toBeInTheDocument();
  });

  it("warns when the latest successful backup is older than six hours", async () => {
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("2026-07-16T09:00:00.000Z"),
    );
    vi.spyOn(
      shoppingItemsSupabase,
      "getLatestDeveloperBackupRun",
    ).mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      startedAt: Date.parse("2026-07-16T02:30:00.000Z"),
      finishedAt: Date.parse("2026-07-16T02:30:08.000Z"),
      status: "success",
      fileName: "jucart-supabase-20260716T023000Z.sql.tar.gz",
      fileSizeBytes: 2048,
      sha256:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      durationMs: 8000,
      retainedCount: 12,
      errorMessage: null,
      createdAt: Date.parse("2026-07-16T02:30:09.000Z"),
    });

    render(<App />);

    await waitForAddFab();

    fireEvent.click(
      screen.getByRole("button", { name: "Vista de desarrollador" }),
    );

    expect(await screen.findByText("Sin copia reciente")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hace más de 6 horas que no se completa una copia de seguridad.",
      ),
    ).toHaveTextContent(
      "Hace más de 6 horas que no se completa una copia de seguridad.",
    );
  });

  it("keeps the developer view hidden when Begoña is restored", async () => {
    window.localStorage.setItem("jucart:selected-user-id", "begona");

    render(<App />);

    await waitForAddFab();

    expect(
      screen.queryByRole("button", { name: "Vista de desarrollador" }),
    ).not.toBeInTheDocument();
  });

  it("updates the app badge with the visible pending product count", async () => {
    const setAppBadge = vi.fn(() => Promise.resolve());
    const clearAppBadge = vi.fn(() => Promise.resolve());

    Object.defineProperty(navigator, "setAppBadge", {
      configurable: true,
      value: setAppBadge,
    });
    Object.defineProperty(navigator, "clearAppBadge", {
      configurable: true,
      value: clearAppBadge,
    });

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
        addedBy: "begona",
        purchased: true,
        createdAt: 200,
        updatedAt: 200,
      },
      {
        id: "item-3",
        name: "Yogur",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: false,
        createdAt: 300,
        updatedAt: 300,
      },
    ]);

    render(<App />);

    const summary = await screen.findByLabelText("Resumen de la lista");

    expect(within(summary).getByText("Pendientes")).toBeInTheDocument();
    await waitFor(() =>
      expect(within(summary).getByText("2")).toBeInTheDocument(),
    );

    await waitFor(() => expect(setAppBadge).toHaveBeenCalledWith(2));
  });

  it("adds, toggles and removes products", async () => {
    render(<App />);

    const dialog = await openAddSheet();

    const productInput = within(dialog).getByLabelText("Producto");

    fireEvent.change(productInput, {
      target: { value: "  Leche  " },
    });
    fireEvent.change(within(dialog).getByLabelText("Supermercado"), {
      target: { value: "alcampo" },
    });
    const quantityInput = within(dialog).getByLabelText(
      "Cantidad",
    ) as HTMLInputElement;
    fireEvent.change(quantityInput, {
      target: { value: "12" },
    });
    fireEvent.focus(quantityInput);
    expect(quantityInput.selectionStart).toBe(0);
    expect(quantityInput.selectionEnd).toBe(2);
    fireEvent.change(screen.getByLabelText("Añadido por"), {
      target: { value: "begona" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));

    await waitFor(() => expect(productInput).toHaveFocus());
    expect(productInput).toHaveValue("");

    const alcampoColumn = screen
      .getByRole("heading", { name: "Alcampo" })
      .closest("article");

    expect(alcampoColumn).not.toBeNull();
    expect(
      within(alcampoColumn as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();
    expect(
      within(alcampoColumn as HTMLElement).getByText("x12"),
    ).toBeInTheDocument();
    expect(
      within(alcampoColumn as HTMLElement).getByText("Begoña"),
    ).toBeInTheDocument();

    const itemCard = within(alcampoColumn as HTMLElement)
      .getByText("Leche")
      .closest("li");

    expect(itemCard).not.toBeNull();

    fireEvent.click(itemCard as HTMLElement);
    expect(
      within(alcampoColumn as HTMLElement).getByRole("button", {
        name: "Marcar Leche como comprado",
      }),
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

  it("fills products from quick suggestions and filters duplicate suggestions", async () => {
    render(<App />);

    const dialog = await openAddSheet();

    expect(
      within(dialog).getByRole("option", { name: "Leche" }),
    ).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "le" },
    });

    expect(
      within(dialog).getByRole("option", { name: "Leche" }),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("option", { name: "Leche" }));

    const mercadonaColumn = screen
      .getByRole("heading", { name: "Mercadona" })
      .closest("article");

    expect(mercadonaColumn).not.toBeNull();
    expect(
      within(mercadonaColumn as HTMLElement).queryByText("Leche"),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Producto")).toHaveValue("Leche");

    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));

    expect(
      within(mercadonaColumn as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("option", { name: "Leche" }),
    ).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "pa" },
    });

    expect(
      within(dialog).getByRole("option", { name: "Pan" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("option", { name: "Pañales" }),
    ).toBeInTheDocument();
  });

  it("opens and closes the add sheet without losing the draft", async () => {
    render(<App />);

    const dialog = await openAddSheet();
    const productInput = within(dialog).getByLabelText("Producto");

    await waitFor(() => expect(productInput).toHaveFocus());

    fireEvent.change(productInput, { target: { value: "Manzanas" } });
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Añadir producto" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Añadir producto" }),
    ).toBeInTheDocument();

    const reopenedDialog = await openAddSheet();

    expect(within(reopenedDialog).getByLabelText("Producto")).toHaveValue(
      "Manzanas",
    );
  });

  it("closes the add sheet from browser back without losing the draft", async () => {
    render(<App />);

    const dialog = await openAddSheet();
    const productInput = within(dialog).getByLabelText("Producto");

    fireEvent.change(productInput, { target: { value: "Manzanas" } });

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(
      screen.queryByRole("dialog", { name: "Añadir producto" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Añadir producto" }),
    ).toBeInTheDocument();

    const reopenedDialog = await openAddSheet();

    expect(within(reopenedDialog).getByLabelText("Producto")).toHaveValue(
      "Manzanas",
    );
  });

  it("consumes the add sheet history entry when the sheet is closed from the UI", async () => {
    const historyBackSpy = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => undefined);

    render(<App />);

    const dialog = await openAddSheet();

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(historyBackSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("dialog", { name: "Añadir producto" }),
    ).not.toBeInTheDocument();
  });

  it("adds several products with Enter while keeping section and resetting quantity", async () => {
    render(<App />);

    const dialog = await openAddSheet();
    const productInput = within(dialog).getByLabelText("Producto");

    fireEvent.change(within(dialog).getByLabelText("Supermercado"), {
      target: { value: "alcampo" },
    });
    fireEvent.change(within(dialog).getByLabelText("Cantidad"), {
      target: { value: "3 uds" },
    });

    fireEvent.change(productInput, { target: { value: "Leche" } });
    fireEvent.keyDown(productInput, { key: "Enter" });
    expect(within(dialog).getByLabelText("Cantidad")).toHaveValue("1");

    fireEvent.change(within(dialog).getByLabelText("Cantidad"), {
      target: { value: "3 uds" },
    });
    fireEvent.change(productInput, { target: { value: "Pan" } });
    fireEvent.keyDown(productInput, { key: "Enter" });

    expect(productInput).toHaveValue("");
    expect(within(dialog).getByLabelText("Supermercado")).toHaveValue(
      "alcampo",
    );
    expect(within(dialog).getByLabelText("Cantidad")).toHaveValue("1");
    expect(screen.getAllByText("Producto añadido")).toHaveLength(1);

    const alcampoColumn = screen
      .getByRole("heading", { name: "Alcampo" })
      .closest("article");

    expect(alcampoColumn).not.toBeNull();
    expect(
      within(alcampoColumn as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();
    expect(
      within(alcampoColumn as HTMLElement).getByText("Pan"),
    ).toBeInTheDocument();
    expect(
      within(alcampoColumn as HTMLElement).getAllByText("x3"),
    ).toHaveLength(2);
  });

  it("keeps duplicate pending products out and can jump to the existing item", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    render(<App />);

    const dialog = await openAddSheet();
    const productInput = within(dialog).getByLabelText("Producto");

    fireEvent.change(productInput, { target: { value: "Leche" } });
    fireEvent.keyDown(productInput, { key: "Enter" });
    fireEvent.change(productInput, { target: { value: " leche  " } });
    fireEvent.keyDown(productInput, { key: "Enter" });

    expect(productInput).toHaveValue(" leche  ");
    expect(screen.getByText('"Leche" ya está en la lista')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver producto" }));

    expect(
      screen.queryByRole("dialog", { name: "Añadir producto" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled(),
    );
    expect(screen.getAllByText("Leche")).toHaveLength(1);
  });

  it("reactivates a hidden purchased product with the selected quantity", async () => {
    window.localStorage.setItem("jucart:show-purchased-items", "false");

    await replaceStoredShoppingItems([
      {
        id: "item-1",
        name: "Leche",
        quantity: "1",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: true,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);

    render(<App />);

    expect(screen.queryByText("Leche")).not.toBeInTheDocument();

    const dialog = await openAddSheet();

    fireEvent.change(within(dialog).getByLabelText("Cantidad"), {
      target: { value: "3" },
    });
    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "leche" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));

    expect(
      screen.getByText("Producto devuelto a pendientes"),
    ).toBeInTheDocument();

    const mercadonaColumn = screen
      .getByRole("heading", { name: "Mercadona" })
      .closest("article");

    expect(mercadonaColumn).not.toBeNull();
    expect(
      within(mercadonaColumn as HTMLElement).getByText("Leche"),
    ).toBeInTheDocument();
    expect(
      within(mercadonaColumn as HTMLElement).getByText("x3"),
    ).toBeInTheDocument();
    expect(
      within(mercadonaColumn as HTMLElement).getByRole("button", {
        name: "Marcar Leche como comprado",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Leche")).toHaveLength(1);
  });

  it("shows remote sync feedback while Supabase saves changes", async () => {
    let resolveStoredData: (data: ShoppingData) => void = () => {};
    let resolveStoreData: () => void = () => {};
    const storedDataPromise = new Promise<ShoppingData>((resolve) => {
      resolveStoredData = resolve;
    });
    const storeDataPromise = new Promise<void>((resolve) => {
      resolveStoreData = resolve;
    });

    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(shoppingItemsDb, "getShoppingItemsStorageMode").mockReturnValue(
      "remote",
    );
    vi.spyOn(shoppingItemsDb, "getStoredShoppingData").mockReturnValue(
      storedDataPromise,
    );

    render(<App />);

    await act(async () => {
      resolveStoredData({
        items: [],
        sections: defaultShoppingSections,
        historyEvents: [],
        freezerItems: [],
      });

      await storedDataPromise;
    });

    vi.spyOn(shoppingItemsDb, "replaceStoredShoppingData").mockReturnValue(
      storeDataPromise,
    );

    const dialog = await openAddSheet();

    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "Leche" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));

    expect(await screen.findByText("Sincronizando")).toBeInTheDocument();
    expect(
      screen.queryByText("Sincronizando con Supabase..."),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveStoreData();
      await storeDataPromise;
    });

    await waitFor(() =>
      expect(screen.queryByText("Sincronizando")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Sincronizado")).toBeInTheDocument();
  });

  it("keeps a purchased item stable while its Supabase echo arrives during save", async () => {
    let onSupabaseChange: (() => void) | undefined;
    let resolveStoreData: () => void = () => {};
    const storeDataPromise = new Promise<void>((resolve) => {
      resolveStoreData = resolve;
    });
    const initialData: ShoppingData = {
      items: [
        {
          id: "item-1",
          name: "Leche",
          sectionId: "mercadona",
          addedBy: "rafa",
          purchased: false,
          createdAt: 100,
          updatedAt: 100,
        },
      ],
      sections: defaultShoppingSections,
      historyEvents: [],
      freezerItems: [],
    };
    const syncedData: ShoppingData = {
      ...initialData,
      items: [
        {
          ...initialData.items[0],
          purchased: true,
          updatedAt: 200,
        },
      ],
    };

    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockImplementation((callback) => {
      onSupabaseChange = callback;

      return () => undefined;
    });
    vi.spyOn(shoppingItemsDb, "getShoppingItemsStorageMode").mockReturnValue(
      "remote",
    );
    vi.spyOn(shoppingItemsDb, "getCachedShoppingData").mockResolvedValue(
      initialData,
    );
    const getStoredShoppingData = vi
      .spyOn(shoppingItemsDb, "getStoredShoppingData")
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(syncedData);
    vi.spyOn(shoppingItemsDb, "replaceStoredShoppingData").mockReturnValue(
      storeDataPromise,
    );

    render(<App />);

    expect(await screen.findByText("Leche")).toBeInTheDocument();
    await waitFor(() => expect(onSupabaseChange).toBeDefined());

    fireEvent.click(
      screen.getByRole("button", { name: "Marcar Leche como comprado" }),
    );

    await waitFor(() =>
      expect(shoppingItemsDb.replaceStoredShoppingData).toHaveBeenCalled(),
    );
    expect(
      screen.getByRole("button", { name: "Devolver Leche a pendientes" }),
    ).toBeInTheDocument();

    act(() => {
      onSupabaseChange?.();
    });

    expect(getStoredShoppingData).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Devolver Leche a pendientes" }),
    ).toBeInTheDocument();

    await act(async () => {
      resolveStoreData();
      await storeDataPromise;
    });

    await waitFor(() => expect(getStoredShoppingData).toHaveBeenCalledTimes(2));
    expect(
      screen.getByRole("button", { name: "Devolver Leche a pendientes" }),
    ).toBeInTheDocument();
  });

  it("does not apply a stale Supabase refresh over a freezer move", async () => {
    let resolveStaleRefresh: (data: ShoppingData) => void = () => {};
    const staleRefreshPromise = new Promise<ShoppingData>((resolve) => {
      resolveStaleRefresh = resolve;
    });
    const initialData: ShoppingData = {
      items: [],
      sections: defaultShoppingSections,
      historyEvents: [],
      freezerItems: [
        {
          id: "freezer-1",
          name: "Caldo",
          drawerId: "top",
          frozenAt: Date.parse("2026-07-01T00:00:00.000Z"),
          createdAt: 100,
          updatedAt: 100,
        },
      ],
    };

    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockReturnValue(() => undefined);
    vi.spyOn(shoppingItemsDb, "getShoppingItemsStorageMode").mockReturnValue(
      "remote",
    );
    vi.spyOn(shoppingItemsDb, "getCachedShoppingData").mockResolvedValue(
      initialData,
    );
    vi.spyOn(shoppingItemsDb, "getStoredShoppingData")
      .mockResolvedValueOnce(initialData)
      .mockReturnValueOnce(staleRefreshPromise);
    vi.spyOn(shoppingItemsDb, "replaceStoredShoppingData").mockResolvedValue();

    render(<App />);

    await waitForAddFab();
    fireEvent.click(await screen.findByRole("button", { name: "Congelador" }));
    const caldoItem = (await screen.findAllByText("Caldo"))[0].closest("li");

    expect(caldoItem).not.toBeNull();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    fireEvent.click(
      within(caldoItem as HTMLElement).getByRole("button", { name: "Medio" }),
    );
    expect(
      within(caldoItem as HTMLElement).getByText("Medio", { selector: "span" }),
    ).toBeInTheDocument();

    await act(async () => {
      resolveStaleRefresh(initialData);
      await staleRefreshPromise;
    });

    expect(
      within(caldoItem as HTMLElement).getByText("Medio", { selector: "span" }),
    ).toBeInTheDocument();
    expect(
      within(caldoItem as HTMLElement).queryByText("Arriba", {
        selector: "span",
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps a moved freezer item stable when the post-save Supabase echo is stale", async () => {
    let onSupabaseChange: (() => void) | undefined;
    let resolveStoreData: () => void = () => {};
    const storeDataPromise = new Promise<void>((resolve) => {
      resolveStoreData = resolve;
    });
    const initialData: ShoppingData = {
      items: [],
      sections: defaultShoppingSections,
      historyEvents: [],
      freezerItems: [
        {
          id: "freezer-1",
          name: "Caldo",
          drawerId: "top",
          frozenAt: Date.parse("2026-07-01T00:00:00.000Z"),
          createdAt: 100,
          updatedAt: 100,
        },
      ],
    };

    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockImplementation((callback) => {
      onSupabaseChange = callback;

      return () => undefined;
    });
    vi.spyOn(shoppingItemsDb, "getShoppingItemsStorageMode").mockReturnValue(
      "remote",
    );
    vi.spyOn(shoppingItemsDb, "getCachedShoppingData").mockResolvedValue(
      initialData,
    );
    const getStoredShoppingData = vi
      .spyOn(shoppingItemsDb, "getStoredShoppingData")
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(initialData);
    vi.spyOn(shoppingItemsDb, "replaceStoredShoppingData").mockReturnValue(
      storeDataPromise,
    );

    render(<App />);

    await waitForAddFab();
    fireEvent.click(await screen.findByRole("button", { name: "Congelador" }));
    const caldoItem = (await screen.findAllByText("Caldo"))[0].closest("li");

    expect(caldoItem).not.toBeNull();
    await waitFor(() => expect(onSupabaseChange).toBeDefined());

    fireEvent.click(
      within(caldoItem as HTMLElement).getByRole("button", { name: "Abajo" }),
    );

    await waitFor(() =>
      expect(shoppingItemsDb.replaceStoredShoppingData).toHaveBeenCalled(),
    );
    expect(
      within(caldoItem as HTMLElement).getByText("Abajo", { selector: "span" }),
    ).toBeInTheDocument();

    act(() => {
      onSupabaseChange?.();
    });

    expect(getStoredShoppingData).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveStoreData();
      await storeDataPromise;
    });

    await waitFor(() => expect(getStoredShoppingData).toHaveBeenCalledTimes(2));
    expect(
      within(caldoItem as HTMLElement).getByText("Abajo", { selector: "span" }),
    ).toBeInTheDocument();
    expect(
      within(caldoItem as HTMLElement).queryByText("Arriba", {
        selector: "span",
      }),
    ).not.toBeInTheDocument();
  });

  it("does not toggle a product when editing it", async () => {
    render(<App />);

    const dialog = await openAddSheet();

    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "Leche" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Leche" }));

    expect(
      screen.getByRole("dialog", { name: "Editar Leche" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(
      screen.getByRole("button", { name: "Marcar Leche como comprado" }),
    ).toBeInTheDocument();
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
    ).toEqual(["Producto borrado.", "Yogur", "Pan"]);

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

  it("hides the removed product message after five seconds", async () => {
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
    ]);

    render(<App />);

    await screen.findByText("Leche");

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Leche" }));

    expect(screen.getByText("Producto borrado.")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    vi.useRealTimers();

    expect(screen.queryByText("Producto borrado.")).not.toBeInTheDocument();
  });

  it("restores the last selected section and user", async () => {
    window.localStorage.setItem("jucart:selected-section-id", "farmacia");
    window.localStorage.setItem("jucart:selected-user-id", "begona");
    window.localStorage.setItem("jucart:show-purchased-items", "false");

    render(<App />);

    const dialog = await openAddSheet();

    expect(within(dialog).getByLabelText("Supermercado")).toHaveValue(
      "farmacia",
    );
    expect(screen.getByLabelText("Añadido por")).toHaveValue("begona");
    expect(screen.getByLabelText("Comprados")).not.toBeChecked();
  });

  it("shows sheet fields without user selector", async () => {
    render(<App />);

    const dialog = await openAddSheet();

    const sectionSelect = within(dialog).getByLabelText("Supermercado");
    const quantitySelect = within(dialog).getByLabelText("Cantidad");
    const userSelect = screen.getByLabelText("Añadido por");
    const productInput = within(dialog).getByLabelText("Producto");

    expect(
      sectionSelect.compareDocumentPosition(productInput) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
    expect(
      productInput.compareDocumentPosition(quantitySelect) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(dialog).not.toContainElement(userSelect);
  });

  it("shows the view selector in the main shopping view", async () => {
    render(<App />);

    await waitForAddFab();

    const navigation = screen.getByRole("navigation", {
      name: "Navegación principal",
    });

    expect(
      within(navigation)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Lista", "Congelador", "Listas", "Historial", "Dev"]);
    expect(navigation.className).not.toContain("bottomNavHidden");
    expect(
      within(navigation).getByRole("button", { name: "Lista" }),
    ).not.toHaveAttribute("tabindex", "-1");
    expect(
      screen.getByRole("button", { name: "Borrar comprados" }),
    ).toBeInTheDocument();
  });

  it("shows recent shopping actions in the history view", async () => {
    render(<App />);

    const dialog = await openAddSheet();

    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "Leche" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Marcar Leche como comprado" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Historial" }));

    expect(
      screen.getByRole("heading", { name: "Historial" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Marcado como comprado")).toBeInTheDocument();
    expect(screen.getByText("Producto añadido")).toBeInTheDocument();
    expect(screen.getAllByText("Leche")).toHaveLength(2);
    expect(screen.getAllByText("Mercadona · Rafa")).toHaveLength(2);
  });

  it("shows recategorization changes in the history categories tab", async () => {
    await replaceStoredShoppingData({
      items: [],
      sections: [{ id: "mercadona", name: "Mercadona", color: "mint" }],
      historyEvents: [],
      freezerItems: [],
      recategorizationRuns: [
        {
          id: "run-1",
          source: "codex",
          status: "success",
          summary: "Recategorizado 1 producto.",
          catalogEntriesAdded: 1,
          itemsRecategorized: 1,
          startedAt: Date.parse("2026-07-21T01:00:00.000Z"),
          finishedAt: Date.parse("2026-07-21T01:00:05.000Z"),
          createdAt: Date.parse("2026-07-21T01:00:05.000Z"),
        },
      ],
      recategorizationChanges: [
        {
          id: "change-1",
          runId: "run-1",
          itemId: "item-1",
          itemName: "Cebollas",
          previousCategoryId: "other",
          nextCategoryId: "vegetables",
          reason: "Cebollas pertenece a verdura.",
          catalogEntryId: "vegetables-cebollas",
          createdAt: Date.parse("2026-07-21T01:00:05.000Z"),
        },
      ],
    });

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Historial" }));
    fireEvent.click(screen.getByRole("tab", { name: "Categorías" }));

    expect(screen.getByText("Categoría actualizada")).toBeInTheDocument();
    expect(screen.getByText("Cebollas")).toBeInTheDocument();
    expect(screen.getByText("Otros → Verdura")).toBeInTheDocument();
    expect(
      screen.getByText("Cebollas pertenece a verdura."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Catálogo: vegetables-cebollas"),
    ).toBeInTheDocument();
  });

  it("notifies unseen recategorization changes like remote shopping changes", async () => {
    await replaceStoredShoppingData({
      items: [],
      sections: [{ id: "mercadona", name: "Mercadona", color: "mint" }],
      historyEvents: [],
      freezerItems: [],
      recategorizationRuns: [
        {
          id: "run-1",
          source: "codex",
          status: "success",
          summary: "Recategorizado 1 producto.",
          catalogEntriesAdded: 1,
          itemsRecategorized: 1,
          startedAt: Date.now() - 2000,
          finishedAt: Date.now() - 1000,
          createdAt: Date.now() - 1000,
        },
      ],
      recategorizationChanges: [
        {
          id: "change-1",
          runId: "run-1",
          itemId: "item-1",
          itemName: "Cebollas",
          previousCategoryId: "other",
          nextCategoryId: "vegetables",
          reason: "Cebollas pertenece a verdura.",
          catalogEntryId: "vegetables-cebollas",
          createdAt: Date.now(),
        },
      ],
    });

    render(<App />);

    await waitForAddFab();

    expect(
      screen.getByText("Hay 1 cambio de otro dispositivo."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver cambios" }));

    expect(
      screen.getByRole("heading", { name: "Cambios nuevos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Categoría actualizada")).toBeInTheDocument();
    expect(screen.getByText("Cebollas")).toBeInTheDocument();
    expect(
      screen.queryByText("Hay 1 cambio de otro dispositivo."),
    ).not.toBeInTheDocument();
  });

  it("notifies unseen history events from another device", async () => {
    window.localStorage.setItem("jucart:history-client-id", "client-local");

    await replaceStoredShoppingData({
      items: [],
      sections: [{ id: "mercadona", name: "Mercadona", color: "mint" }],
      historyEvents: [
        {
          id: "history-remote",
          itemId: "item-1",
          type: "deleted",
          actor: "begona",
          clientId: "client-remote",
          item: {
            id: "item-1",
            name: "Pan",
            sectionId: "mercadona",
            sectionName: "Mercadona",
            categoryId: "bakery",
            addedBy: "rafa",
            purchased: true,
            createdAt: Date.now() - 2000,
            updatedAt: Date.now() - 1000,
          },
          createdAt: Date.now(),
        },
      ],
      freezerItems: [],
    });

    render(<App />);

    await waitForAddFab();

    expect(
      screen.getByText("Hay 1 cambio de otro dispositivo."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver cambios" }));

    expect(
      screen.getByRole("heading", { name: "Cambios nuevos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Producto borrado")).toBeInTheDocument();
    expect(screen.getByText("Pan")).toBeInTheDocument();
    expect(
      screen.queryByText("Hay 1 cambio de otro dispositivo."),
    ).not.toBeInTheDocument();
  });

  it("manages shopping lists from the bottom navigation", async () => {
    render(<App />);

    await waitForAddFab();

    fireEvent.click(screen.getByRole("button", { name: "Gestionar listas" }));

    expect(screen.getByRole("heading", { name: "Listas" })).toBeInTheDocument();

    expect(screen.queryByLabelText("Nueva lista")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Crear lista" }));

    const createListDialog = screen.getByRole("dialog", {
      name: "Crear lista",
    });
    const newListInput = within(createListDialog).getByLabelText("Nueva lista");

    await waitFor(() => expect(newListInput).toHaveFocus());

    fireEvent.change(newListInput, {
      target: { value: "Frutería" },
    });
    fireEvent.click(
      within(createListDialog).getByRole("button", { name: "Crear" }),
    );

    expect(screen.getByLabelText("Nombre de Frutería")).toHaveValue("Frutería");
    expect(
      screen.queryByRole("dialog", { name: "Crear lista" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Poner Frutería en color amber" }),
    );

    expect(
      screen.getByRole("button", { name: "Poner Frutería en color amber" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByLabelText("Nombre de Frutería").closest("li")?.className,
    ).toContain("sectionColoramber");

    fireEvent.click(screen.getByRole("button", { name: "Lista" }));

    const fruteriaColumn = screen
      .getByRole("heading", { name: "Frutería" })
      .closest("article");

    expect(
      within(fruteriaColumn as HTMLElement)
        .getByText("No hay productos")
        .closest("div")?.className,
    ).toContain("shoppingListColoramber");

    fireEvent.click(screen.getByRole("button", { name: "Gestionar listas" }));

    fireEvent.change(screen.getByLabelText("Nombre de General"), {
      target: { value: "Varios" },
    });

    expect(screen.getByLabelText("Nombre de Varios")).toHaveValue("Varios");

    fireEvent.click(screen.getByRole("button", { name: "Subir Frutería" }));

    const listNameInputs = screen
      .getAllByLabelText(/^Nombre de /)
      .map((input) => (input as HTMLInputElement).value);

    expect(listNameInputs.at(-2)).toBe("Frutería");
    expect(listNameInputs.at(-1)).toBe("Varios");

    fireEvent.click(screen.getByRole("button", { name: "Borrar Frutería" }));

    expect(
      screen.queryByLabelText("Nombre de Frutería"),
    ).not.toBeInTheDocument();
  });

  it("does not allow removing shopping lists with products", async () => {
    render(<App />);

    const dialog = await openAddSheet();

    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "Leche" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));
    fireEvent.click(screen.getByRole("button", { name: "Gestionar listas" }));

    fireEvent.click(screen.getByRole("button", { name: "Borrar Mercadona" }));

    expect(
      screen.getByText("No se puede borrar Mercadona porque tiene productos."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de Mercadona")).toBeInTheDocument();
  });

  it("uses haptic feedback for high-intent actions", async () => {
    const vibrate = vi.fn();

    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: vibrate,
    });

    render(<App />);

    const dialog = await openAddSheet();

    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "Leche" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));

    expect(vibrate).toHaveBeenLastCalledWith([14, 32, 18]);

    fireEvent.click(
      screen.getByRole("button", { name: "Marcar Leche como comprado" }),
    );

    expect(vibrate).toHaveBeenLastCalledWith(18);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Leche" }));

    expect(vibrate).toHaveBeenLastCalledWith([28, 42, 36]);

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    expect(vibrate).toHaveBeenLastCalledWith([14, 32, 18]);
  });

  it("marks the selected section and updates the add sheet selector when a column is clicked", async () => {
    render(<App />);

    await waitForAddFab();

    const mercadonaColumn = screen
      .getByRole("heading", { name: "Mercadona" })
      .closest("article");
    const farmaciaColumn = screen
      .getByRole("heading", { name: "Farmacia" })
      .closest("article");

    expect(mercadonaColumn).toHaveAttribute("aria-current", "true");
    expect(farmaciaColumn).not.toHaveAttribute("aria-current");

    fireEvent.click(farmaciaColumn as HTMLElement);

    expect(farmaciaColumn).toHaveAttribute("aria-current", "true");

    const dialog = await openAddSheet();

    expect(within(dialog).getByLabelText("Supermercado")).toHaveValue(
      "farmacia",
    );
  });

  it("groups products by inferred category inside each list", async () => {
    render(<App />);

    const dialog = await openAddSheet();

    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "Leche" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));
    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "Pan" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Añadir" }));

    const mercadonaColumn = screen
      .getByRole("heading", { name: "Mercadona" })
      .closest("article");

    expect(mercadonaColumn).not.toBeNull();
    expect(
      within(mercadonaColumn as HTMLElement)
        .getAllByText(/^(Lácteos|Leche|Panadería|Pan)$/)
        .map((element) => element.textContent),
    ).toEqual(["Lácteos", "Lechex1", "Panadería", "Panx1"]);
  });

  it("marks the selected column when the add sheet supermarket selector changes", async () => {
    render(<App />);

    const dialog = await openAddSheet();

    fireEvent.change(within(dialog).getByLabelText("Supermercado"), {
      target: { value: "farmacia" },
    });

    const farmaciaColumn = screen
      .getByRole("heading", { name: "Farmacia" })
      .closest("article");

    expect(farmaciaColumn).toHaveAttribute("aria-current", "true");
  });

  it("updates the selected section when the carousel changes on mobile", async () => {
    render(<App />);

    await waitForAddFab();

    const sectionIndicators = screen.getAllByRole("button", {
      name: /Ver lista/,
    });

    expect(sectionIndicators).toHaveLength(5);
    expect(
      screen.getByRole("button", { name: "Ver lista Mercadona" }),
    ).toHaveAttribute("aria-current", "true");

    act(() => emblaCarouselMock.selectTo(3));

    expect(
      screen.getByRole("button", { name: "Ver lista Farmacia" }),
    ).toHaveAttribute("aria-current", "true");

    fireEvent.click(screen.getByRole("button", { name: "Ver lista Día" }));

    expect(
      screen.getByRole("button", { name: "Ver lista Día" }),
    ).toHaveAttribute("aria-current", "true");

    const dialog = await openAddSheet();

    expect(within(dialog).getByLabelText("Supermercado")).toHaveValue("dia");
  });

  it("removes purchased products after confirmation", async () => {
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
      {
        id: "item-3",
        name: "Tiritas",
        sectionId: "farmacia",
        addedBy: "rafa",
        purchased: true,
        createdAt: 300,
        updatedAt: 300,
      },
    ]);

    render(<App />);

    await screen.findByText("Leche");
    await screen.findByText("Pan");
    await screen.findByText("Tiritas");

    fireEvent.click(screen.getByRole("button", { name: "Borrar comprados" }));

    const dialog = screen.getByRole("dialog", { name: "Borrar comprados" });

    expect(
      within(dialog).getByText(
        "Se borrará 1 producto comprado de Mercadona. Podrás deshacerlo después.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("list", {
        name: "Productos comprados que se borrarán",
      }),
    ).toHaveTextContent("Pan");
    expect(dialog).not.toHaveTextContent("Tiritas");

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Borrar 1 producto" }),
    );

    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.queryByText("Pan")).not.toBeInTheDocument();
    expect(screen.getByText("Tiritas")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Borrar comprados" }),
    ).not.toBeInTheDocument();
  });

  it("keeps purchased products when clearing is cancelled", async () => {
    await replaceStoredShoppingItems([
      {
        id: "item-1",
        name: "Pan",
        sectionId: "mercadona",
        addedBy: "begona",
        purchased: true,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);

    render(<App />);

    await screen.findByText("Pan");

    fireEvent.click(screen.getByRole("button", { name: "Borrar comprados" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByText("Pan")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Borrar comprados" }),
    ).not.toBeInTheDocument();
  });

  it("closes the clear purchased dialog from browser back without deleting products", async () => {
    await replaceStoredShoppingItems([
      {
        id: "item-1",
        name: "Pan",
        sectionId: "mercadona",
        addedBy: "begona",
        purchased: true,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);

    render(<App />);

    await screen.findByText("Pan");

    fireEvent.click(screen.getByRole("button", { name: "Borrar comprados" }));

    expect(
      screen.getByRole("dialog", { name: "Borrar comprados" }),
    ).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(screen.getByText("Pan")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Borrar comprados" }),
    ).not.toBeInTheDocument();
  });

  it("undoes removing purchased products", async () => {
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
    fireEvent.click(
      within(
        screen.getByRole("dialog", { name: "Borrar comprados" }),
      ).getByRole("button", { name: "Borrar 1 producto" }),
    );

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

    const shoppingOrder = within(mercadonaColumn as HTMLElement)
      .getAllByText(/^(Leche|Pan|Comprados|Yogur)$/)
      .map((productName) => productName.textContent);

    expect(shoppingOrder).toEqual(["Leche", "Pan", "Comprados", "Yogur"]);
  });

  it("toggles purchased products visibility in the shopping list", async () => {
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
    ]);

    render(<App />);

    await screen.findByText("Leche");

    const visibilityToggle = screen.getByLabelText("Comprados");

    expect(visibilityToggle).toBeChecked();
    expect(screen.getByText("Yogur")).toBeInTheDocument();

    fireEvent.click(visibilityToggle);

    expect(screen.queryByText("Yogur")).not.toBeInTheDocument();
    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(window.localStorage.getItem("jucart:show-purchased-items")).toBe(
      "false",
    );

    fireEvent.click(visibilityToggle);

    expect(screen.getByText("Yogur")).toBeInTheDocument();
  });

  it("filters shopping products by search text and clears the search", async () => {
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
        purchased: false,
        createdAt: 200,
        updatedAt: 200,
      },
    ]);

    render(<App />);

    await screen.findByText("Leche");

    const searchInput = screen.getByLabelText("Buscar productos");

    fireEvent.change(searchInput, { target: { value: "  LE  " } });

    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.queryByText("Pan")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));

    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.getByText("Pan")).toBeInTheDocument();
  });

  it("keeps purchased products hidden while searching when purchased visibility is off", async () => {
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
    ]);

    render(<App />);

    await screen.findByText("Leche");

    fireEvent.change(screen.getByLabelText("Buscar productos"), {
      target: { value: "yog" },
    });

    expect(screen.getByText("Yogur")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Comprados"));

    expect(screen.queryByText("Yogur")).not.toBeInTheDocument();
    expect(screen.getAllByText("No hay coincidencias").length).toBeGreaterThan(
      0,
    );

    fireEvent.click(screen.getByLabelText("Comprados"));

    expect(screen.getByText("Yogur")).toBeInTheDocument();
  });

  it("shows undo when a product is marked as purchased while purchased products are hidden", async () => {
    window.localStorage.setItem("jucart:show-purchased-items", "false");

    await replaceStoredShoppingItems([
      {
        id: "item-1",
        name: "Anterior",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: "item-2",
        name: "Central",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: false,
        createdAt: 200,
        updatedAt: 200,
      },
      {
        id: "item-3",
        name: "Posterior",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: false,
        createdAt: 300,
        updatedAt: 300,
      },
    ]);

    render(<App />);

    await screen.findByText("Central");

    fireEvent.click(
      screen.getByRole("button", { name: "Marcar Central como comprado" }),
    );

    expect(screen.queryByText("Central")).not.toBeInTheDocument();
    expect(
      screen.getByText("Producto marcado como comprado."),
    ).toBeInTheDocument();

    const mercadonaColumn = screen
      .getByRole("heading", { name: "Mercadona" })
      .closest("article");

    expect(mercadonaColumn).not.toBeNull();
    expect(
      within(mercadonaColumn as HTMLElement)
        .getAllByText(/^(Anterior|Producto marcado como comprado\.|Posterior)$/)
        .map((element) => element.textContent),
    ).toEqual(["Anterior", "Producto marcado como comprado.", "Posterior"]);

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    expect(screen.getByText("Central")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Marcar Central como comprado" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Producto marcado como comprado."),
    ).not.toBeInTheDocument();
  });

  it("does not show undo when a product is marked as purchased while purchased products are visible", async () => {
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
    ]);

    render(<App />);

    await screen.findByText("Leche");

    fireEvent.click(
      screen.getByRole("button", { name: "Marcar Leche como comprado" }),
    );

    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(
      screen.queryByText("Producto marcado como comprado."),
    ).not.toBeInTheDocument();
  });

  it("hides the marked as purchased undo message after five seconds", async () => {
    window.localStorage.setItem("jucart:show-purchased-items", "false");

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
    ]);

    render(<App />);

    await screen.findByText("Leche");

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fireEvent.click(
      screen.getByRole("button", { name: "Marcar Leche como comprado" }),
    );

    expect(
      screen.getByText("Producto marcado como comprado."),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    vi.useRealTimers();

    expect(
      screen.queryByText("Producto marcado como comprado."),
    ).not.toBeInTheDocument();
  });

  it("clears the marked as purchased undo when purchased products become visible again", async () => {
    window.localStorage.setItem("jucart:show-purchased-items", "false");

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
    ]);

    render(<App />);

    await screen.findByText("Leche");

    fireEvent.click(
      screen.getByRole("button", { name: "Marcar Leche como comprado" }),
    );

    expect(
      screen.getByText("Producto marcado como comprado."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Comprados"));

    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(
      screen.queryByText("Producto marcado como comprado."),
    ).not.toBeInTheDocument();
  });

  it("closes the edit dialog from browser back without saving changes", async () => {
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
    ]);

    render(<App />);

    await screen.findByText("Leche");

    fireEvent.click(screen.getByRole("button", { name: "Editar Leche" }));

    const dialog = screen.getByRole("dialog", { name: "Editar Leche" });

    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "Pan integral" },
    });

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(
      screen.queryByRole("dialog", { name: "Editar Leche" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.queryByText("Pan integral")).not.toBeInTheDocument();
  });

  it("edits a product name, quantity and section", async () => {
    render(<App />);

    const addDialog = await openAddSheet();

    fireEvent.change(within(addDialog).getByLabelText("Producto"), {
      target: { value: "Leche" },
    });
    fireEvent.change(within(addDialog).getByLabelText("Cantidad"), {
      target: { value: "2" },
    });
    fireEvent.click(within(addDialog).getByRole("button", { name: "Añadir" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Leche" }));

    const dialog = screen.getByRole("dialog", { name: "Editar Leche" });

    fireEvent.change(within(dialog).getByLabelText("Producto"), {
      target: { value: "Pan integral" },
    });
    const editQuantityInput = within(dialog).getByLabelText(
      "Cantidad",
    ) as HTMLInputElement;
    fireEvent.focus(editQuantityInput);
    expect(editQuantityInput.selectionStart).toBe(0);
    expect(editQuantityInput.selectionEnd).toBe(1);
    fireEvent.change(editQuantityInput, {
      target: { value: "1 kg" },
    });
    fireEvent.change(within(dialog).getByLabelText("Sección"), {
      target: { value: "farmacia" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

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
      within(farmaciaColumn as HTMLElement).getByText("1 kg"),
    ).toBeInTheDocument();
    expect(
      within(mercadonaColumn as HTMLElement).queryByText("Leche"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Historial" }));

    expect(screen.getByText("Cambiado de lista")).toBeInTheDocument();
    expect(screen.getByText("Mercadona → Farmacia · Rafa")).toBeInTheDocument();
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

  it("refreshes stored products when the app returns to the foreground", async () => {
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

    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(shoppingItemsDb, "getStoredShoppingData")
      .mockResolvedValueOnce({
        items: [
          {
            id: "item-1",
            name: "Leche",
            sectionId: "farmacia",
            addedBy: "rafa",
            purchased: false,
            createdAt: 100,
            updatedAt: 100,
          },
        ],
        sections: defaultShoppingSections,
        historyEvents: [],
        freezerItems: [],
      })
      .mockResolvedValue({
        items: [
          {
            id: "item-2",
            name: "Pan",
            sectionId: "mercadona",
            addedBy: "begona",
            purchased: false,
            createdAt: 200,
            updatedAt: 200,
          },
        ],
        sections: defaultShoppingSections,
        historyEvents: [],
        freezerItems: [],
      });

    render(<App />);

    expect(await screen.findByText("Leche")).toBeInTheDocument();
    await waitFor(() =>
      expect(shoppingItemsDb.getStoredShoppingData).toHaveBeenCalledTimes(1),
    );

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => {
      const mercadonaColumn = screen
        .getByRole("heading", { name: "Mercadona" })
        .closest("article");

      expect(mercadonaColumn).not.toBeNull();
      expect(
        within(mercadonaColumn as HTMLElement).getByText("Pan"),
      ).toBeInTheDocument();
    });
    const mercadonaColumn = screen
      .getByRole("heading", { name: "Mercadona" })
      .closest("article");

    expect(
      within(mercadonaColumn as HTMLElement).queryByText("Leche"),
    ).not.toBeInTheDocument();
  });
});
