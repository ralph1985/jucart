import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { App } from "./App";
import { defaultShoppingSections } from "./shoppingItems";
import { pwaUpdateAvailableEvent } from "./pwaUpdateEvents";
import * as shoppingItemsDb from "./shoppingItemsDb";
import {
  replaceStoredShoppingData,
  replaceStoredShoppingItems,
  resetShoppingItemsDatabase,
} from "./shoppingItemsDb";
import * as shoppingItemsSupabase from "./shoppingItemsSupabase";
import * as supabaseConfig from "./supabaseConfig";
import type { ShoppingData } from "./shoppingItemsDb";

const authMocks = vi.hoisted(() => ({
  status: "signed_out" as "signed_in" | "signed_out",
  email: "rafaelgarcia1985@hotmail.com",
  getAuthSnapshot: vi.fn(),
  subscribeToAuthState: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

const shoppingListMocks = vi.hoisted(() => ({
  lists: [] as Array<{
    id: string;
    name: string;
    ownerId: string;
    joinCode: string;
    ownerEmail: string;
    createdAt: string;
    updatedAt: string;
  }>,
  getShoppingLists: vi.fn(),
  createShoppingList: vi.fn(),
  joinShoppingList: vi.fn(),
  regenerateShoppingListCode: vi.fn(),
  leaveShoppingList: vi.fn(),
}));

vi.mock("./auth", () => ({
  getAuthSnapshot: authMocks.getAuthSnapshot,
  subscribeToAuthState: authMocks.subscribeToAuthState,
  signInWithPassword: authMocks.signInWithPassword,
  signOut: authMocks.signOut,
}));

vi.mock("./shoppingLists", () => ({
  getShoppingLists: shoppingListMocks.getShoppingLists,
  createShoppingList: shoppingListMocks.createShoppingList,
  joinShoppingList: shoppingListMocks.joinShoppingList,
  regenerateShoppingListCode: shoppingListMocks.regenerateShoppingListCode,
  leaveShoppingList: shoppingListMocks.leaveShoppingList,
}));

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

const pushNotificationMocks = vi.hoisted(() => ({
  diagnosePushNotifications: vi.fn(() =>
    Promise.resolve({
      details: [
        "Permiso: granted",
        "Service Worker: listo",
        "Suscripción: existe",
        "Supabase: registrada",
      ],
      message: "Registro push correcto",
      ok: true,
    }),
  ),
  disablePushNotifications: vi.fn(() =>
    Promise.resolve({ message: "Desactivadas", status: "unsubscribed" }),
  ),
  enablePushNotifications: vi.fn(() =>
    Promise.resolve({ message: "Activadas", status: "subscribed" }),
  ),
  getPushNotificationSnapshot: vi.fn(() =>
    Promise.resolve({ message: "Pendientes", status: "prompt" }),
  ),
  reset() {
    this.diagnosePushNotifications.mockClear();
    this.disablePushNotifications.mockClear();
    this.enablePushNotifications.mockClear();
    this.getPushNotificationSnapshot.mockClear();
    this.diagnosePushNotifications.mockResolvedValue({
      details: [
        "Permiso: granted",
        "Service Worker: listo",
        "Suscripción: existe",
        "Supabase: registrada",
      ],
      message: "Registro push correcto",
      ok: true,
    });
    this.disablePushNotifications.mockResolvedValue({
      message: "Desactivadas",
      status: "unsubscribed",
    });
    this.enablePushNotifications.mockResolvedValue({
      message: "Activadas",
      status: "subscribed",
    });
    this.getPushNotificationSnapshot.mockResolvedValue({
      message: "Pendientes",
      status: "prompt",
    });
  },
}));

vi.mock("embla-carousel-react", () => ({
  default: emblaCarouselMock.useEmblaCarousel,
}));

vi.mock("./pushNotifications", () => ({
  diagnosePushNotifications: pushNotificationMocks.diagnosePushNotifications,
  disablePushNotifications: pushNotificationMocks.disablePushNotifications,
  enablePushNotifications: pushNotificationMocks.enablePushNotifications,
  getPushNotificationSnapshot:
    pushNotificationMocks.getPushNotificationSnapshot,
}));

afterEach(async () => {
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
  emblaCarouselMock.reset();
  pushNotificationMocks.reset();
  Reflect.deleteProperty(navigator, "setAppBadge");
  Reflect.deleteProperty(navigator, "clearAppBadge");
  delete (Element.prototype as Partial<Element>).scrollIntoView;
  await resetShoppingItemsDatabase();
  window.localStorage.clear();
  authMocks.status = "signed_out";
  authMocks.email = "rafaelgarcia1985@hotmail.com";
  authMocks.getAuthSnapshot.mockReset();
  authMocks.subscribeToAuthState.mockReset();
  authMocks.signInWithPassword.mockReset();
  authMocks.signOut.mockReset();
  shoppingListMocks.lists = [];
  shoppingListMocks.getShoppingLists.mockReset();
  shoppingListMocks.createShoppingList.mockReset();
  shoppingListMocks.joinShoppingList.mockReset();
  shoppingListMocks.regenerateShoppingListCode.mockReset();
  shoppingListMocks.leaveShoppingList.mockReset();
});

function configureAuthMocks() {
  authMocks.getAuthSnapshot.mockImplementation(() =>
    Promise.resolve({
      status: authMocks.status,
      user:
        authMocks.status === "signed_in"
          ? {
              id: "user-1",
              email: authMocks.email,
            }
          : null,
      error: null,
    }),
  );
  authMocks.subscribeToAuthState.mockImplementation((listener) => {
    listener({
      status: authMocks.status,
      user:
        authMocks.status === "signed_in"
          ? { id: "user-1", email: authMocks.email }
          : null,
      error: null,
    });
    return () => undefined;
  });
}

describe("App", () => {
  beforeEach(() => {
    authMocks.status = "signed_in";
    configureAuthMocks();
    shoppingListMocks.getShoppingLists.mockResolvedValue([]);
  });

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

  it("muestra y aplica el aviso de actualización de la PWA", async () => {
    render(<App />);

    await waitForAddFab();
    act(() => {
      window.dispatchEvent(new Event(pwaUpdateAvailableEvent));
    });

    expect(
      await screen.findByRole("complementary", { name: "Actualización" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(
      screen.getByRole("button", { name: "Actualizando…" }),
    ).toBeDisabled();
  });

  it("recarga la caché local al completar el gesto pull-to-refresh", async () => {
    const initialData: ShoppingData = {
      items: [],
      sections: defaultShoppingSections,
      historyEvents: [],
      freezerItems: [],
    };
    const refreshedData: ShoppingData = {
      ...initialData,
      items: [
        {
          id: "item-pull-refresh",
          name: "Leche",
          sectionId: "mercadona",
          addedBy: "rafa",
          purchased: false,
          createdAt: 100,
          updatedAt: 100,
        },
      ],
    };

    vi.spyOn(shoppingItemsDb, "getCachedShoppingData")
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(refreshedData);

    render(<App />);

    await waitForAddFab();
    const main = screen.getByRole("main");
    Object.defineProperty(document, "scrollingElement", {
      configurable: true,
      value: main,
    });
    Object.defineProperty(main, "scrollHeight", {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(main, "clientHeight", {
      configurable: true,
      value: 100,
    });

    fireEvent.touchStart(main, {
      touches: [{ clientX: 0, clientY: 10, identifier: 2 }],
    });
    fireEvent.touchMove(main, {
      touches: [{ clientX: 0, clientY: 15, identifier: 2 }],
    });
    fireEvent.touchEnd(main, {
      changedTouches: [{ clientX: 0, clientY: 15, identifier: 2 }],
    });

    fireEvent.touchStart(main, {
      touches: [{ clientX: 10, clientY: 10, identifier: 3 }],
    });
    fireEvent.touchMove(main, {
      touches: [{ clientX: 80, clientY: 30, identifier: 3 }],
    });
    fireEvent.touchEnd(main, {
      changedTouches: [{ clientX: 80, clientY: 30, identifier: 3 }],
    });

    fireEvent.touchStart(main, {
      touches: [{ clientX: 0, clientY: 10, identifier: 1 }],
    });
    fireEvent.touchMove(main, {
      touches: [{ clientX: 0, clientY: 100, identifier: 1 }],
    });
    fireEvent.touchEnd(main, {
      changedTouches: [{ clientX: 0, clientY: 100, identifier: 1 }],
    });

    expect(await screen.findByText("Leche")).toBeInTheDocument();
    expect(shoppingItemsDb.getCachedShoppingData).toHaveBeenCalledTimes(2);
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
    fireEvent.change(within(editFreezerDialog).getByLabelText("Cajón"), {
      target: { value: "bottom" },
    });
    fireEvent.change(within(editFreezerDialog).getByLabelText("Congelado"), {
      target: { value: "2026-07-02" },
    });
    fireEvent.click(
      within(editFreezerDialog).getByRole("button", { name: "Guardar" }),
    );

    expect(screen.getAllByText("3 raciones").length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Editar Lentejas" })[0],
    );

    const reopenedEditFreezerDialog = screen.getByRole("dialog", {
      name: "Editar Lentejas",
    });
    fireEvent.click(
      within(reopenedEditFreezerDialog).getByRole("button", {
        name: "Cancelar",
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Editar Lentejas" }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Editar Lentejas" })[0],
    );
    const keyboardEditFreezerDialog = screen.getByRole("dialog", {
      name: "Editar Lentejas",
    });
    fireEvent.keyDown(
      within(keyboardEditFreezerDialog).getByRole("button", {
        name: "Cerrar panel de edición",
      }),
      { key: "Enter" },
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Editar Lentejas" }),
      ).not.toBeInTheDocument(),
    );

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
    expect(screen.queryByLabelText("Añadido por")).not.toBeInTheDocument();
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

  it("shows the login screen when Supabase has no active session", async () => {
    authMocks.status = "signed_out";
    configureAuthMocks();
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);

    render(<App />);

    expect(await screen.findByLabelText("Iniciar sesión")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
  });

  it("shows the developer view for an authenticated user", async () => {
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
  });

  it("hides the developer view from normal users", async () => {
    authMocks.email = "bego15val@gmail.com";
    configureAuthMocks();
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);

    render(<App />);

    await waitForAddFab();

    expect(
      screen.queryByRole("button", { name: "Vista de desarrollador" }),
    ).not.toBeInTheDocument();
  });

  it("gestiona listas autenticadas desde Listas", async () => {
    authMocks.status = "signed_in";
    configureAuthMocks();
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    shoppingListMocks.lists = [
      {
        id: "list-1",
        name: "Casa",
        ownerId: "user-1",
        joinCode: "AB12CD34",
        ownerEmail: "rafa@example.com",
        createdAt: "2026-07-27T12:00:00.000Z",
        updatedAt: "2026-07-27T12:00:00.000Z",
      },
      {
        id: "list-2",
        name: "Begoña",
        ownerId: "user-2",
        joinCode: "EF56GH78",
        ownerEmail: "bego@example.com",
        createdAt: "2026-07-27T13:00:00.000Z",
        updatedAt: "2026-07-27T13:00:00.000Z",
      },
    ];
    shoppingListMocks.getShoppingLists.mockResolvedValue(
      shoppingListMocks.lists,
    );
    shoppingListMocks.regenerateShoppingListCode.mockResolvedValue({
      ...shoppingListMocks.lists[0],
      joinCode: "ZX90YU12",
    });
    shoppingListMocks.leaveShoppingList.mockResolvedValue(undefined);

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Gestionar listas" }));

    expect(
      await screen.findByRole("region", { name: "Listas disponibles" }),
    ).toHaveTextContent("Casa");
    expect(screen.getByText("AB12CD34")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Regenerar" }));
    await waitFor(() =>
      expect(shoppingListMocks.regenerateShoppingListCode).toHaveBeenCalledWith(
        "list-1",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Abandonar" }));
    await waitFor(() =>
      expect(shoppingListMocks.leaveShoppingList).toHaveBeenCalledWith(
        "list-2",
      ),
    );
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

  it("shows push notification status in the developer view without requesting permission", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);

    render(<App />);

    await waitForAddFab();
    fireEvent.click(
      screen.getByRole("button", { name: "Vista de desarrollador" }),
    );

    expect(await screen.findByText("Notificaciones push")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activar" })).toBeEnabled();
    expect(
      pushNotificationMocks.getPushNotificationSnapshot,
    ).toHaveBeenCalledOnce();
    expect(
      pushNotificationMocks.enablePushNotifications,
    ).not.toHaveBeenCalled();
  });

  it("tests push registration from the developer view", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    window.localStorage.setItem("jucart:history-client-id", "client-local");

    render(<App />);

    await waitForAddFab();
    fireEvent.click(
      screen.getByRole("button", { name: "Vista de desarrollador" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Probar registro" }),
    );

    await waitFor(() =>
      expect(
        pushNotificationMocks.diagnosePushNotifications,
      ).toHaveBeenCalledWith("client-local"),
    );
    expect(
      await screen.findByText("Registro push correcto"),
    ).toBeInTheDocument();
    expect(screen.getByText("Permiso: granted")).toBeInTheDocument();
    expect(screen.getByText("Supabase: registrada")).toBeInTheDocument();
  });

  it("enables push notifications from the developer view", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    window.localStorage.setItem("jucart:history-client-id", "client-local");

    render(<App />);

    await waitForAddFab();
    fireEvent.click(
      screen.getByRole("button", { name: "Vista de desarrollador" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Activar" }));

    await waitFor(() =>
      expect(
        pushNotificationMocks.enablePushNotifications,
      ).toHaveBeenCalledWith("client-local"),
    );
    expect(
      await screen.findByRole("button", { name: "Desactivar" }),
    ).toBeEnabled();
  });

  it("invites enabling push notifications from the shopping view", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    window.localStorage.setItem("jucart:history-client-id", "client-local");

    render(<App />);

    await waitForAddFab();

    expect(screen.getByText("Avisos de cambios")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Recibe una notificación cuando otro dispositivo cambie la lista.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ahora no" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Activar" }));

    await waitFor(() =>
      expect(
        pushNotificationMocks.enablePushNotifications,
      ).toHaveBeenCalledWith("client-local"),
    );
    expect(screen.queryByText("Avisos de cambios")).not.toBeInTheDocument();
  });

  it("dismisses the shopping push invite on this device", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));

    expect(screen.queryByText("Avisos de cambios")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("jucart:push-invite-dismissed")).toBe(
      "true",
    );
    expect(
      pushNotificationMocks.enablePushNotifications,
    ).not.toHaveBeenCalled();
  });

  it("keeps the shopping push invite hidden after it has been dismissed", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    window.localStorage.setItem("jucart:push-invite-dismissed", "true");

    render(<App />);

    await waitForAddFab();

    expect(screen.queryByText("Avisos de cambios")).not.toBeInTheDocument();
  });

  it("does not show the shopping push invite when notifications are already active", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    pushNotificationMocks.getPushNotificationSnapshot.mockResolvedValue({
      message: "Activadas",
      status: "subscribed",
    });

    render(<App />);

    await waitForAddFab();

    expect(screen.queryByText("Avisos de cambios")).not.toBeInTheDocument();
  });

  it("does not show the shopping push invite when permission is blocked", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    pushNotificationMocks.getPushNotificationSnapshot.mockResolvedValue({
      message: "Bloqueadas",
      status: "denied",
    });

    render(<App />);

    await waitForAddFab();

    expect(screen.queryByText("Avisos de cambios")).not.toBeInTheDocument();
  });

  it("disables push notifications from the developer view", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    pushNotificationMocks.getPushNotificationSnapshot.mockResolvedValue({
      message: "Activadas",
      status: "subscribed",
    });

    render(<App />);

    await waitForAddFab();
    fireEvent.click(
      screen.getByRole("button", { name: "Vista de desarrollador" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Desactivar" }));

    await waitFor(() =>
      expect(pushNotificationMocks.disablePushNotifications).toHaveBeenCalled(),
    );
    expect(
      await screen.findByRole("button", { name: "Activar" }),
    ).toBeEnabled();
  });

  it("keeps blocked push notifications disabled in the developer view", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    pushNotificationMocks.getPushNotificationSnapshot.mockResolvedValue({
      message: "Bloqueadas",
      status: "denied",
    });

    render(<App />);

    await waitForAddFab();
    fireEvent.click(
      screen.getByRole("button", { name: "Vista de desarrollador" }),
    );

    const pushButton = await screen.findByRole("button", {
      name: "Bloqueadas",
    });

    expect(pushButton).toBeDisabled();
    expect(
      pushNotificationMocks.enablePushNotifications,
    ).not.toHaveBeenCalled();
  });

  it("allows retrying push notifications after a temporary error", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    pushNotificationMocks.getPushNotificationSnapshot.mockResolvedValue({
      message: "Error",
      status: "error",
    });

    render(<App />);

    await waitForAddFab();
    fireEvent.click(
      screen.getByRole("button", { name: "Vista de desarrollador" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

    await waitFor(() =>
      expect(pushNotificationMocks.enablePushNotifications).toHaveBeenCalled(),
    );
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
    vi.spyOn(window, "confirm").mockReturnValue(true);

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
      within(alcampoColumn as HTMLElement).getByText("Rafa"),
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

  it("shows latest and average prices for canonical products", async () => {
    const shoppingData: ShoppingData = {
      items: [
        {
          id: "item-platanos",
          name: "Plátanos",
          sectionId: "mercadona",
          canonicalProductId: "canonical-platanos",
          addedBy: "rafa",
          purchased: false,
          createdAt: 100,
          updatedAt: 100,
        },
        {
          id: "item-gasas",
          name: "Gasas",
          sectionId: "mercadona",
          canonicalProductId: "canonical-gasas",
          addedBy: "begona",
          purchased: false,
          createdAt: 110,
          updatedAt: 110,
        },
        {
          id: "item-leche",
          name: "Leche",
          sectionId: "mercadona",
          canonicalProductId: "canonical-leche",
          addedBy: "rafa",
          purchased: false,
          createdAt: 120,
          updatedAt: 120,
        },
        {
          id: "item-arroz",
          name: "Arroz",
          sectionId: "mercadona",
          canonicalProductId: "canonical-arroz",
          addedBy: "rafa",
          purchased: false,
          createdAt: 130,
          updatedAt: 130,
        },
      ],
      sections: defaultShoppingSections,
      historyEvents: [],
      freezerItems: [],
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
      shoppingData,
    );
    vi.spyOn(shoppingItemsDb, "getStoredShoppingData").mockResolvedValue(
      shoppingData,
    );
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabasePriceObservations",
    ).mockResolvedValue([
      {
        id: "price-observation-latest",
        source: "ticket",
        ticketId: "ticket-2",
        ticketLineId: "line-2",
        canonicalProductId: "canonical-platanos",
        sectionId: "mercadona",
        observedAt: Date.parse("2026-07-25T20:00:00.000Z"),
        productName: "Plátanos",
        quantity: "1 kg",
        comparisonUnit: "kg",
        priceKind: "unit",
        observedPrice: 1.8,
        unitPrice: 1.8,
        totalPrice: 1.8,
        originalTotalPrice: null,
        discountTotal: null,
        createdAt: Date.parse("2026-07-25T20:05:00.000Z"),
        updatedAt: Date.parse("2026-07-25T20:05:00.000Z"),
      },
      {
        id: "price-observation-previous",
        source: "ticket",
        ticketId: "ticket-1",
        ticketLineId: "line-1",
        canonicalProductId: "canonical-platanos",
        sectionId: "alcampo",
        observedAt: Date.parse("2026-07-24T20:00:00.000Z"),
        productName: "Plátanos",
        quantity: "1 kg",
        comparisonUnit: "kg",
        priceKind: "unit",
        observedPrice: 2.2,
        unitPrice: 2.2,
        totalPrice: 2.2,
        originalTotalPrice: null,
        discountTotal: null,
        createdAt: Date.parse("2026-07-24T20:05:00.000Z"),
        updatedAt: Date.parse("2026-07-24T20:05:00.000Z"),
      },
      {
        id: "price-observation-external",
        source: "external",
        ticketId: null,
        ticketLineId: null,
        externalProvider: "mercadona",
        externalProductId: "123",
        externalProductUrl: "https://tienda.mercadona.es/product/123",
        canonicalProductId: "canonical-platanos",
        sectionId: "mercadona",
        observedAt: Date.parse("2026-07-26T10:00:00.000Z"),
        productName: "Plátanos",
        quantity: "kg",
        comparisonUnit: "kg",
        priceKind: "unit",
        observedPrice: 1.7,
        unitPrice: 1.7,
        totalPrice: null,
        originalTotalPrice: null,
        discountTotal: null,
        createdAt: Date.parse("2026-07-26T10:05:00.000Z"),
        updatedAt: Date.parse("2026-07-26T10:05:00.000Z"),
      },
      {
        id: "price-observation-gasas",
        source: "ticket",
        ticketId: "ticket-3",
        ticketLineId: "line-3",
        canonicalProductId: "canonical-gasas",
        sectionId: "farmacia",
        observedAt: Date.parse("2026-07-25T19:00:00.000Z"),
        productName: "Gasas",
        quantity: "1 caja",
        comparisonUnit: "unit",
        priceKind: "total",
        observedPrice: 3.5,
        unitPrice: null,
        totalPrice: 3.5,
        originalTotalPrice: null,
        discountTotal: null,
        createdAt: Date.parse("2026-07-25T19:05:00.000Z"),
        updatedAt: Date.parse("2026-07-25T19:05:00.000Z"),
      },
      {
        id: "price-observation-leche-latest",
        source: "ticket",
        ticketId: "ticket-4",
        ticketLineId: "line-4",
        canonicalProductId: "canonical-leche",
        sectionId: "mercadona",
        observedAt: Date.parse("2026-07-25T18:00:00.000Z"),
        productName: "Leche",
        quantity: "1 l",
        comparisonUnit: "l",
        priceKind: "unit",
        observedPrice: 2,
        unitPrice: 2,
        totalPrice: 2,
        originalTotalPrice: null,
        discountTotal: null,
        createdAt: Date.parse("2026-07-25T18:05:00.000Z"),
        updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
      },
      {
        id: "price-observation-leche-previous",
        source: "ticket",
        ticketId: "ticket-5",
        ticketLineId: "line-5",
        canonicalProductId: "canonical-leche",
        sectionId: "alcampo",
        observedAt: Date.parse("2026-07-24T18:00:00.000Z"),
        productName: "Leche",
        quantity: "1 l",
        comparisonUnit: "l",
        priceKind: "unit",
        observedPrice: 1.5,
        unitPrice: 1.5,
        totalPrice: 1.5,
        originalTotalPrice: null,
        discountTotal: null,
        createdAt: Date.parse("2026-07-24T18:05:00.000Z"),
        updatedAt: Date.parse("2026-07-24T18:05:00.000Z"),
      },
      {
        id: "price-observation-arroz-latest",
        source: "ticket",
        ticketId: "ticket-6",
        ticketLineId: "line-6",
        canonicalProductId: "canonical-arroz",
        sectionId: "mercadona",
        observedAt: Date.parse("2026-07-25T17:00:00.000Z"),
        productName: "Arroz",
        quantity: "1 paquete",
        comparisonUnit: "unit",
        priceKind: "total",
        observedPrice: 1.25,
        unitPrice: null,
        totalPrice: 1.25,
        originalTotalPrice: null,
        discountTotal: null,
        createdAt: Date.parse("2026-07-25T17:05:00.000Z"),
        updatedAt: Date.parse("2026-07-25T17:05:00.000Z"),
      },
      {
        id: "price-observation-arroz-previous",
        source: "ticket",
        ticketId: "ticket-7",
        ticketLineId: "line-7",
        canonicalProductId: "canonical-arroz",
        sectionId: "alcampo",
        observedAt: Date.parse("2026-07-24T17:00:00.000Z"),
        productName: "Arroz",
        quantity: "1 paquete",
        comparisonUnit: "unit",
        priceKind: "total",
        observedPrice: 1.25,
        unitPrice: null,
        totalPrice: 1.25,
        originalTotalPrice: null,
        discountTotal: null,
        createdAt: Date.parse("2026-07-24T17:05:00.000Z"),
        updatedAt: Date.parse("2026-07-24T17:05:00.000Z"),
      },
    ]);

    render(<App />);

    expect(await screen.findByText("Plátanos")).toBeInTheDocument();
    expect(await screen.findByText("Últ. 1,80 €/kg")).toBeInTheDocument();
    expect(screen.getByText("Media 2,00 €/kg")).toBeInTheDocument();
    expect(screen.getByText("Ext. 1,70 €/kg")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Ver precios de Plátanos" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Plátanos",
    });

    expect(
      within(dialog).getByText("Histórico de precios"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("-0,40 €/kg")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Mercadona").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Alcampo")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "26/07/2026, 12:00 · Mercadona · Externo: mercadona",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cerrar precios" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Plátanos" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver precios de Gasas" }),
    );
    const unitDialog = await screen.findByRole("dialog", { name: "Gasas" });

    expect(
      within(unitDialog).getAllByText("3,50 €/ud.").length,
    ).toBeGreaterThan(0);
    expect(within(unitDialog).getByText("Sin anterior")).toBeInTheDocument();
    fireEvent.keyDown(unitDialog, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Gasas" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver precios de Leche" }),
    );
    const literDialog = await screen.findByRole("dialog", { name: "Leche" });

    expect(within(literDialog).getByText("+0,50 €/l")).toBeInTheDocument();
    fireEvent.click(
      within(literDialog).getByRole("button", { name: "Cerrar precios" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Leche" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Ver precios de Arroz" }),
    );
    const neutralDialog = await screen.findByRole("dialog", { name: "Arroz" });

    expect(within(neutralDialog).getByText("0,00 €/ud.")).toBeInTheDocument();
    fireEvent.keyDown(
      within(neutralDialog).getByRole("button", {
        name: "Cerrar detalle de precios",
      }),
      { key: "Enter" },
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Arroz" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("paginates price observations in the price detail sheet", async () => {
    const shoppingData: ShoppingData = {
      items: [
        {
          id: "item-platanos",
          name: "Plátanos",
          sectionId: "mercadona",
          canonicalProductId: "canonical-platanos",
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
    const observations = Array.from({ length: 11 }, (_, index) => ({
      id: `price-observation-${index + 1}`,
      source: "ticket" as const,
      ticketId: `ticket-${index + 1}`,
      ticketLineId: `line-${index + 1}`,
      canonicalProductId: "canonical-platanos",
      sectionId: "mercadona" as const,
      observedAt: Date.parse("2026-07-25T20:00:00.000Z") - index * 86_400_000,
      productName: "Plátanos",
      quantity: `observación ${index + 1}`,
      comparisonUnit: "kg" as const,
      priceKind: "unit" as const,
      observedPrice: 1 + index / 10,
      unitPrice: 1 + index / 10,
      totalPrice: 1 + index / 10,
      originalTotalPrice: null,
      discountTotal: null,
      createdAt: Date.parse("2026-07-25T20:05:00.000Z"),
      updatedAt: Date.parse("2026-07-25T20:05:00.000Z"),
    }));

    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockReturnValue(() => undefined);
    vi.spyOn(shoppingItemsDb, "getShoppingItemsStorageMode").mockReturnValue(
      "remote",
    );
    vi.spyOn(shoppingItemsDb, "getCachedShoppingData").mockResolvedValue(
      shoppingData,
    );
    vi.spyOn(shoppingItemsDb, "getStoredShoppingData").mockResolvedValue(
      shoppingData,
    );
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabasePriceObservations",
    ).mockResolvedValue(observations);

    render(<App />);

    expect(await screen.findByText("Plátanos")).toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", { name: "Ver precios de Plátanos" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "Plátanos" });
    expect(within(dialog).getByText("observación 10")).toBeInTheDocument();
    expect(
      within(dialog).queryByText("observación 11"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Ver 1 observaciones más",
      }),
    );

    expect(within(dialog).getByText("observación 11")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", {
        name: "Ver 1 observaciones más",
      }),
    ).not.toBeInTheDocument();
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
    vi.spyOn(window, "confirm").mockReturnValue(true);

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

  it("restores the last selected section", async () => {
    window.localStorage.setItem("jucart:selected-section-id", "farmacia");
    window.localStorage.setItem("jucart:show-purchased-items", "false");

    render(<App />);

    const dialog = await openAddSheet();

    expect(within(dialog).getByLabelText("Supermercado")).toHaveValue(
      "farmacia",
    );
    expect(screen.getByLabelText("Comprados")).not.toBeChecked();
  });

  it("shows sheet fields without manual user selector", async () => {
    render(<App />);

    const dialog = await openAddSheet();

    const sectionSelect = within(dialog).getByLabelText("Supermercado");
    const quantitySelect = within(dialog).getByLabelText("Cantidad");
    const productInput = within(dialog).getByLabelText("Producto");

    expect(
      sectionSelect.compareDocumentPosition(productInput) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
    expect(
      productInput.compareDocumentPosition(quantitySelect) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByLabelText("Añadido por")).not.toBeInTheDocument();
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
    ).toEqual(["Lista", "Tickets", "Congelador", "Listas", "Historial", "Dev"]);
    expect(navigation.className).not.toContain("bottomNavHidden");
    expect(
      within(navigation).getByRole("button", { name: "Lista" }),
    ).not.toHaveAttribute("tabindex", "-1");
    expect(
      screen.getByRole("button", { name: "Borrar comprados" }),
    ).toBeInTheDocument();
  });

  it("shows the tickets view from the main navigation", async () => {
    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));

    expect(
      screen.getByRole("heading", { level: 2, name: "Tickets" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No hay tickets subidos.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Todos" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("uploads a ticket from the shopping view", async () => {
    const uploadedTicket = {
      id: "ticket-uploaded",
      sectionId: "mercadona" as const,
      uploadedBy: "rafa" as const,
      status: "pending" as const,
      fileCount: 1,
      uploadedAt: Date.parse("2026-07-25T18:00:00.000Z"),
      processedAt: null,
      errorMessage: null,
      createdAt: Date.parse("2026-07-25T18:00:00.000Z"),
      updatedAt: Date.parse("2026-07-25T18:00:00.000Z"),
      files: [],
      lines: [],
    };
    const uploadTicket = vi
      .spyOn(shoppingItemsSupabase, "uploadSupabaseShoppingTicket")
      .mockResolvedValue(uploadedTicket);
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabaseShoppingTickets",
    ).mockResolvedValue([uploadedTicket]);
    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));
    fireEvent.click(screen.getByRole("button", { name: "Subir ticket" }));

    const dialog = screen.getByRole("dialog", { name: "Subir ticket" });
    const file = new File(["ticket"], "ticket.pdf", {
      type: "application/pdf",
    });

    expect(within(dialog).getByLabelText("Supermercado")).toHaveValue(
      "mercadona",
    );
    fireEvent.change(within(dialog).getByLabelText("Archivos"), {
      target: { files: [file] },
    });

    expect(await within(dialog).findByText("ticket.pdf")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Subir" }));

    await waitFor(() => expect(uploadTicket).toHaveBeenCalledOnce());
    expect(
      await screen.findByText("Ticket subido. Queda pendiente de procesar."),
    ).toBeInTheDocument();
  });

  it("keeps the upload sheet open when ticket upload fails", async () => {
    vi.spyOn(
      shoppingItemsSupabase,
      "uploadSupabaseShoppingTicket",
    ).mockRejectedValue(new Error("upload failed"));
    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));
    fireEvent.click(screen.getByRole("button", { name: "Subir ticket" }));

    const dialog = screen.getByRole("dialog", { name: "Subir ticket" });
    const file = new File(["ticket"], "ticket.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(within(dialog).getByLabelText("Archivos"), {
      target: { files: [file] },
    });
    fireEvent.click(
      await within(dialog).findByRole("button", { name: "Subir" }),
    );

    expect(
      await within(dialog).findByText(
        "No se pudo subir el ticket. Reintenta la subida completa.",
      ),
    ).toBeInTheDocument();
  });

  it("shows remote ticket details and review lines", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockReturnValue(() => undefined);
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabaseShoppingTickets",
    ).mockResolvedValue([
      {
        id: "ticket-1",
        sectionId: "mercadona",
        uploadedBy: "begona",
        status: "needs_review",
        fileCount: 1,
        uploadedAt: Date.parse("2026-07-25T18:00:00.000Z"),
        processedAt: null,
        errorMessage: null,
        createdAt: Date.parse("2026-07-25T18:00:00.000Z"),
        updatedAt: Date.parse("2026-07-25T18:00:00.000Z"),
        files: [
          {
            id: "file-1",
            ticketId: "ticket-1",
            storageBucket: "shopping-tickets",
            storagePath: "list/ticket-1/00-ticket.pdf",
            fileName: "ticket.pdf",
            contentType: "application/pdf",
            sizeBytes: 1200,
            sha256:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            position: 0,
            uploadedAt: Date.parse("2026-07-25T18:00:00.000Z"),
          },
        ],
        lines: [
          {
            id: "line-1",
            ticketId: "ticket-1",
            lineIndex: 0,
            rawText: "PLATANOS 1.20",
            productName: "Plátanos",
            canonicalProductId: null,
            quantity: "1 kg",
            unitPrice: 1.2,
            totalPrice: 1.2,
            originalTotalPrice: null,
            discountTotal: null,
            status: "needs_review",
            needsReview: true,
            reviewReason: "Alias no confirmado",
            createdAt: Date.parse("2026-07-25T18:05:00.000Z"),
            updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
          },
        ],
      },
    ]);

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));

    expect(await screen.findByText("Cola de revisión")).toBeInTheDocument();
    expect(await screen.findByText("Necesita revisión")).toBeInTheDocument();
    expect(screen.getAllByText("Alias no confirmado").length).toBeGreaterThan(
      0,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ver" }));
    expect(screen.getByRole("button", { name: /Mercadona/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: /Mercadona/i }));
    fireEvent.click(screen.getByRole("button", { name: /Mercadona/i }));

    expect(screen.getAllByText("Plátanos").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("1 kg · 1.20 €/ud. · 1.20 €").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Alias no confirmado").length).toBeGreaterThan(
      0,
    );
  });

  it("resolves reviewed ticket lines from the queue", async () => {
    const ticket = {
      id: "ticket-review",
      sectionId: "mercadona" as const,
      uploadedBy: "rafa" as const,
      status: "needs_review" as const,
      fileCount: 1,
      uploadedAt: Date.parse("2026-07-25T18:00:00.000Z"),
      processedAt: Date.parse("2026-07-25T18:05:00.000Z"),
      errorMessage: null,
      createdAt: Date.parse("2026-07-25T18:00:00.000Z"),
      updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
      files: [],
      lines: [
        {
          id: "line-review",
          ticketId: "ticket-review",
          lineIndex: 0,
          rawText: "PLATANOS 1.20",
          productName: "Plátanos",
          canonicalProductId: null,
          quantity: "1 kg",
          unitPrice: 1.2,
          totalPrice: 1.2,
          originalTotalPrice: null,
          discountTotal: null,
          status: "needs_review" as const,
          needsReview: true,
          reviewReason: "Alias no confirmado",
          createdAt: Date.parse("2026-07-25T18:05:00.000Z"),
          updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
        },
      ],
    };
    const resolveLine = vi
      .spyOn(shoppingItemsSupabase, "resolveSupabaseTicketLine")
      .mockResolvedValue();
    const excludeLine = vi
      .spyOn(shoppingItemsSupabase, "excludeSupabaseTicketLine")
      .mockResolvedValue();

    await replaceStoredShoppingData({
      items: [],
      sections: defaultShoppingSections,
      historyEvents: [],
      freezerItems: [],
      canonicalProducts: [
        {
          id: "canonical-platanos",
          name: "Plátanos",
          normalizedName: "platanos",
          comparisonUnit: "kg",
          createdAt: 100,
          updatedAt: 100,
        },
      ],
      canonicalProductAliases: [],
    });
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockReturnValue(() => undefined);
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabaseShoppingTickets",
    ).mockResolvedValue([ticket]);

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));

    const productSelect = (await screen.findByLabelText(
      "Producto canónico",
    )) as HTMLSelectElement;
    fireEvent.change(productSelect, {
      target: { value: "canonical-platanos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Asociar" }));

    await waitFor(() => expect(resolveLine).toHaveBeenCalledOnce());
    expect(resolveLine).toHaveBeenLastCalledWith(
      expect.objectContaining({
        alias: "Plátanos",
        canonicalProduct: expect.objectContaining({ id: "canonical-platanos" }),
        createAlias: false,
        line: expect.objectContaining({ id: "line-review" }),
        ticket: expect.objectContaining({ id: "ticket-review" }),
      }),
    );

    fireEvent.change(screen.getByLabelText("Producto canónico"), {
      target: { value: "canonical-platanos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Alias" }));

    await waitFor(() => expect(resolveLine).toHaveBeenCalledTimes(2));
    expect(resolveLine).toHaveBeenLastCalledWith(
      expect.objectContaining({ createAlias: true }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(excludeLine).toHaveBeenCalledOnce());
    expect(excludeLine).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "ticket-review" }),
      expect.objectContaining({ id: "line-review" }),
    );
  });

  it("corrects resolved ticket line associations from ticket details", async () => {
    const ticket = {
      id: "ticket-processed",
      sectionId: "mercadona" as const,
      uploadedBy: "rafa" as const,
      status: "processed" as const,
      fileCount: 1,
      uploadedAt: Date.parse("2026-07-25T18:00:00.000Z"),
      processedAt: Date.parse("2026-07-25T18:05:00.000Z"),
      errorMessage: null,
      createdAt: Date.parse("2026-07-25T18:00:00.000Z"),
      updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
      files: [],
      lines: [
        {
          id: "line-processed",
          ticketId: "ticket-processed",
          lineIndex: 0,
          rawText: "2 E. POLLO 1,60 3,20",
          productName: "E. pollo",
          canonicalProductId: "canonical-pavo",
          quantity: "2 unit",
          unitPrice: 1.6,
          totalPrice: 3.2,
          originalTotalPrice: null,
          discountTotal: null,
          status: "processed" as const,
          needsReview: false,
          reviewReason: null,
          createdAt: Date.parse("2026-07-25T18:05:00.000Z"),
          updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
        },
      ],
    };
    const resolveLine = vi
      .spyOn(shoppingItemsSupabase, "resolveSupabaseTicketLine")
      .mockResolvedValue();

    await replaceStoredShoppingData({
      items: [],
      sections: defaultShoppingSections,
      historyEvents: [],
      freezerItems: [],
      canonicalProducts: [
        {
          id: "canonical-pavo",
          name: "Solomillo de pavo",
          normalizedName: "solomillo de pavo",
          comparisonUnit: "kg",
          createdAt: 100,
          updatedAt: 100,
        },
        {
          id: "canonical-empanadillas",
          name: "Empanadillas de pollo",
          normalizedName: "empanadillas de pollo",
          comparisonUnit: "unit",
          createdAt: 100,
          updatedAt: 100,
        },
      ],
      canonicalProductAliases: [],
    });
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockReturnValue(() => undefined);
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabaseShoppingTickets",
    ).mockResolvedValue([ticket]);

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));
    fireEvent.click(await screen.findByRole("button", { name: /Mercadona/i }));

    const correctionSelect = screen.getByLabelText(
      "Corregir producto canónico",
    ) as HTMLSelectElement;
    expect(correctionSelect.value).toBe("canonical-pavo");

    fireEvent.change(correctionSelect, {
      target: { value: "canonical-empanadillas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Corregir alias" }));

    await waitFor(() => expect(resolveLine).toHaveBeenCalledOnce());
    expect(resolveLine).toHaveBeenLastCalledWith(
      expect.objectContaining({
        alias: "E. pollo",
        canonicalProduct: expect.objectContaining({
          id: "canonical-empanadillas",
        }),
        createAlias: true,
        line: expect.objectContaining({
          canonicalProductId: "canonical-pavo",
          id: "line-processed",
        }),
        removeExistingAlias: true,
        replaceProductName: true,
        ticket: expect.objectContaining({ id: "ticket-processed" }),
      }),
    );
  });

  it("shows processing and processed ticket states", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockReturnValue(() => undefined);
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabaseShoppingTickets",
    ).mockResolvedValue([
      {
        id: "ticket-processing",
        sectionId: "general",
        uploadedBy: "rafa",
        status: "processing",
        fileCount: 1,
        uploadedAt: Date.parse("2026-07-25T19:00:00.000Z"),
        processedAt: null,
        errorMessage: null,
        createdAt: Date.parse("2026-07-25T19:00:00.000Z"),
        updatedAt: Date.parse("2026-07-25T19:00:00.000Z"),
        files: [],
        lines: [],
      },
      {
        id: "ticket-processed",
        sectionId: "farmacia",
        uploadedBy: "begona",
        status: "processed",
        fileCount: 1,
        uploadedAt: Date.parse("2026-07-25T18:30:00.000Z"),
        processedAt: Date.parse("2026-07-25T18:35:00.000Z"),
        errorMessage: null,
        createdAt: Date.parse("2026-07-25T18:30:00.000Z"),
        updatedAt: Date.parse("2026-07-25T18:35:00.000Z"),
        files: [],
        lines: [
          {
            id: "line-processed",
            ticketId: "ticket-processed",
            lineIndex: 0,
            rawText: "GASAS",
            productName: null,
            canonicalProductId: "canonical-gasas",
            quantity: null,
            unitPrice: null,
            totalPrice: null,
            originalTotalPrice: null,
            discountTotal: null,
            status: "processed",
            needsReview: false,
            reviewReason: null,
            createdAt: Date.parse("2026-07-25T18:35:00.000Z"),
            updatedAt: Date.parse("2026-07-25T18:35:00.000Z"),
          },
          {
            id: "line-excluded",
            ticketId: "ticket-processed",
            lineIndex: 1,
            rawText: "CUPON",
            productName: "Cupón",
            canonicalProductId: null,
            quantity: null,
            unitPrice: null,
            totalPrice: null,
            originalTotalPrice: null,
            discountTotal: null,
            status: "excluded",
            needsReview: false,
            reviewReason: null,
            createdAt: Date.parse("2026-07-25T18:35:00.000Z"),
            updatedAt: Date.parse("2026-07-25T18:35:00.000Z"),
          },
        ],
      },
    ]);

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));

    expect(await screen.findByText("Procesando")).toBeInTheDocument();
    expect(screen.getByText("Procesado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Procesados" }));
    fireEvent.click(await screen.findByRole("button", { name: /Farmacia/i }));

    expect(screen.getByText("GASAS")).toBeInTheDocument();
    expect(screen.getByText("Cupón")).toBeInTheDocument();
    expect(screen.getByText("Excluida")).toBeInTheDocument();
  });

  it("paginates older tickets in the tickets view", async () => {
    const tickets = Array.from({ length: 11 }, (_, index) => ({
      id: `ticket-${index + 1}`,
      sectionId: "mercadona" as const,
      uploadedBy: "rafa" as const,
      status: "processed" as const,
      fileCount: index + 1,
      uploadedAt: Date.parse("2026-07-25T18:00:00.000Z") - index * 60_000,
      processedAt: Date.parse("2026-07-25T18:05:00.000Z") - index * 60_000,
      errorMessage: null,
      createdAt: Date.parse("2026-07-25T18:00:00.000Z") - index * 60_000,
      updatedAt: Date.parse("2026-07-25T18:05:00.000Z") - index * 60_000,
      files: [],
      lines: [],
    }));

    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockReturnValue(() => undefined);
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabaseShoppingTickets",
    ).mockResolvedValue(tickets);

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));

    expect(
      await screen.findByRole("button", { name: /10 archivos/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /11 archivos/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver 1 tickets más" }));

    expect(
      screen.getByRole("button", { name: /11 archivos/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ver 1 tickets más" }),
    ).not.toBeInTheDocument();
  });

  it("shows ticket fallback texts for unknown sections and review reasons", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockReturnValue(() => undefined);
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabaseShoppingTickets",
    ).mockResolvedValue([
      {
        id: "ticket-unknown",
        sectionId: "tienda-rara",
        uploadedBy: "rafa",
        status: "needs_review",
        fileCount: 1,
        uploadedAt: Date.parse("2026-07-25T19:30:00.000Z"),
        processedAt: null,
        errorMessage: null,
        createdAt: Date.parse("2026-07-25T19:30:00.000Z"),
        updatedAt: Date.parse("2026-07-25T19:30:00.000Z"),
        files: [],
        lines: [
          {
            id: "line-empty",
            ticketId: "ticket-unknown",
            lineIndex: 0,
            rawText: null,
            productName: null,
            canonicalProductId: null,
            quantity: null,
            unitPrice: null,
            totalPrice: null,
            originalTotalPrice: null,
            discountTotal: null,
            status: "needs_review",
            needsReview: true,
            reviewReason: null,
            createdAt: Date.parse("2026-07-25T19:35:00.000Z"),
            updatedAt: Date.parse("2026-07-25T19:35:00.000Z"),
          },
        ],
      },
    ]);

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /tienda-rara/i }),
    );

    expect(screen.getAllByText("Línea de ticket").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Necesita revisión").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /tienda-rara/i }));

    expect(
      screen.getByRole("button", { name: /tienda-rara/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("shows ticket load errors and empty filtered states", async () => {
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockReturnValue(() => undefined);
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabaseShoppingTickets",
    ).mockRejectedValue(new Error("tickets failed"));

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));

    expect(
      await screen.findByText("No se pudo cargar la bandeja de tickets."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Necesitan revisión" }));

    expect(
      screen.getByText("No hay tickets con este estado."),
    ).toBeInTheDocument();
  });

  it("filters tickets and opens the private ticket file", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.spyOn(supabaseConfig, "isSupabaseConfigured").mockReturnValue(true);
    vi.spyOn(
      shoppingItemsSupabase,
      "subscribeToSupabaseShoppingItems",
    ).mockReturnValue(() => undefined);
    vi.spyOn(
      shoppingItemsSupabase,
      "createSupabaseTicketFileUrl",
    ).mockImplementation((file) =>
      Promise.resolve(`https://signed.example/${file.fileName}`),
    );
    vi.spyOn(
      shoppingItemsSupabase,
      "getSupabaseShoppingTickets",
    ).mockResolvedValue([
      {
        id: "ticket-pending",
        sectionId: "alcampo",
        uploadedBy: "rafa",
        status: "pending",
        fileCount: 2,
        uploadedAt: Date.parse("2026-07-25T17:00:00.000Z"),
        processedAt: null,
        errorMessage: null,
        createdAt: Date.parse("2026-07-25T17:00:00.000Z"),
        updatedAt: Date.parse("2026-07-25T17:00:00.000Z"),
        files: [
          {
            id: "file-pending",
            ticketId: "ticket-pending",
            storageBucket: "shopping-tickets",
            storagePath: "list/ticket-pending/00-ticket.pdf",
            fileName: "ticket.pdf",
            contentType: "application/pdf",
            sizeBytes: 1200,
            sha256:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            position: 0,
            uploadedAt: Date.parse("2026-07-25T17:00:00.000Z"),
          },
          {
            id: "file-pending-2",
            ticketId: "ticket-pending",
            storageBucket: "shopping-tickets",
            storagePath: "list/ticket-pending/01-ticket-2.jpg",
            fileName: "ticket-2.jpg",
            contentType: "image/jpeg",
            sizeBytes: 2400,
            sha256:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            position: 1,
            uploadedAt: Date.parse("2026-07-25T17:00:00.000Z"),
          },
        ],
        lines: [],
      },
      {
        id: "ticket-failed",
        sectionId: "dia",
        uploadedBy: "begona",
        status: "failed",
        fileCount: 2,
        uploadedAt: Date.parse("2026-07-25T16:00:00.000Z"),
        processedAt: null,
        errorMessage: "No se pudo leer el ticket.",
        createdAt: Date.parse("2026-07-25T16:00:00.000Z"),
        updatedAt: Date.parse("2026-07-25T16:00:00.000Z"),
        files: [],
        lines: [],
      },
    ]);

    render(<App />);

    await waitForAddFab();
    fireEvent.click(screen.getByRole("button", { name: "Tickets" }));
    fireEvent.click(await screen.findByRole("tab", { name: "Fallidos" }));

    expect(screen.getByText("Fallido")).toBeInTheDocument();
    expect(screen.queryByText("Pendiente")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Día/i }));

    expect(screen.getByText("No se pudo leer el ticket.")).toBeInTheDocument();
    expect(
      screen.getByText("Las líneas aparecerán tras el procesamiento nocturno."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Pendientes" }));
    fireEvent.click(await screen.findByRole("button", { name: /Alcampo/i }));
    fireEvent.click(screen.getByRole("button", { name: /ticket.pdf/i }));

    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        "https://signed.example/ticket.pdf",
        "_blank",
        "noopener,noreferrer",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /ticket-2.jpg/i }));

    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        "https://signed.example/ticket-2.jpg",
        "_blank",
        "noopener,noreferrer",
      ),
    );
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

  it("notifies unseen recategorization changes separately", async () => {
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
      screen.getByText("Hay 1 recategorización nueva."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver categorías" }));

    expect(
      screen.getByRole("heading", { name: "Cambios nuevos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Categoría actualizada")).toBeInTheDocument();
    expect(screen.getByText("Cebollas")).toBeInTheDocument();
    expect(
      screen.queryByText("Hay 1 recategorización nueva."),
    ).not.toBeInTheDocument();
  });

  it("shows product normalization changes in their history tab", async () => {
    await replaceStoredShoppingData({
      items: [],
      sections: [{ id: "mercadona", name: "Mercadona", color: "mint" }],
      historyEvents: [],
      freezerItems: [],
      productNormalizationRuns: [
        {
          id: "normalization-run-1",
          source: "codex",
          status: "success",
          summary: "Unificado plátano.",
          aliasesCreated: 1,
          itemsTouched: 1,
          quantitiesMerged: 0,
          canonicalProductsMerged: 0,
          startedAt: Date.now() - 2000,
          finishedAt: Date.now() - 1000,
          createdAt: Date.now() - 1000,
        },
      ],
      productNormalizationChanges: [
        {
          id: "normalization-change-1",
          runId: "normalization-run-1",
          action: "alias_created",
          itemId: "item-1",
          previousItemName: "plátano",
          nextItemName: "Plátanos",
          previousCanonicalProductId: null,
          nextCanonicalProductId: "canonical-platano",
          quantityBefore: null,
          quantityAfter: null,
          reason: "Alias frecuente detectado por Codex.",
          createdAt: Date.now(),
        },
      ],
    });

    render(<App />);

    await waitForAddFab();

    expect(screen.getByText("Hay 1 normalización nueva.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver normalización" }));

    expect(screen.getByText("Alias creado")).toBeInTheDocument();
    expect(screen.getByText("plátano → Plátanos")).toBeInTheDocument();
    expect(
      screen.getByText("Alias frecuente detectado por Codex."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Hay 1 normalización nueva."),
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
    vi.spyOn(window, "confirm").mockReturnValue(true);

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
        "Se borrará 1 producto comprado de Mercadona. Podrás deshacerlo después. Si no queda asociado a un producto canónico, dejará de contar para el análisis de precios.",
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
