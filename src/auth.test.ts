import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => {
  const listeners = new Set<
    (
      event: string,
      session: { user: { id: string; email: string } } | null,
    ) => void
  >();
  const auth = {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn((listener) => {
      listeners.add(listener);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  };
  const client = { auth };

  return {
    auth,
    client,
    createClient: vi.fn(() => client),
    emit(
      event: string,
      session: { user: { id: string; email: string } } | null,
    ) {
      listeners.forEach((listener) => listener(event, session));
    },
    reset() {
      listeners.clear();
      auth.getSession.mockReset();
      auth.onAuthStateChange.mockClear();
      auth.signInWithPassword.mockReset();
      auth.signOut.mockReset();
    },
  };
});

const supabaseConfigMock = vi.hoisted(() => ({
  getSupabaseConfig: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: authMocks.createClient,
}));

vi.mock("./supabaseConfig", () => ({
  getSupabaseConfig: supabaseConfigMock.getSupabaseConfig,
}));

import {
  getAuthSnapshot,
  signInWithPassword,
  signOut,
  subscribeToAuthState,
} from "./auth";

describe("auth", () => {
  beforeEach(() => {
    authMocks.reset();
    supabaseConfigMock.getSupabaseConfig.mockReturnValue({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      listId: "list-1",
    });
    authMocks.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    authMocks.auth.signInWithPassword.mockResolvedValue({ error: null });
    authMocks.auth.signOut.mockResolvedValue({ error: null });
  });

  it("inicia sesión con email y contraseña normalizados", async () => {
    const result = await signInWithPassword("  RAFA@EXAMPLE.COM ", "123456");

    expect(result).toEqual({
      ok: true,
      message: "Sesión iniciada.",
    });
    expect(authMocks.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "rafa@example.com",
      password: "123456",
    });
  });

  it("rechaza email y contraseña vacíos antes de llamar a Supabase", async () => {
    const result = await signInWithPassword("   ", "");

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Escribe tu email.");
    expect(authMocks.auth.signInWithPassword).not.toHaveBeenCalled();

    await expect(signInWithPassword("rafa@example.com", "")).resolves.toEqual({
      ok: false,
      message: "Escribe tu contraseña.",
    });
  });

  it("lee una sesión iniciada", async () => {
    const user = { id: "user-1", email: "rafa@example.com" };
    authMocks.auth.getSession.mockResolvedValueOnce({
      data: { session: { user } },
      error: null,
    });

    await expect(getAuthSnapshot()).resolves.toEqual({
      status: "signed_in",
      user,
      error: null,
    });
  });

  it("devuelve un error al no poder leer la sesión", async () => {
    authMocks.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("Sesión inaccesible"),
    });

    await expect(getAuthSnapshot()).resolves.toEqual({
      status: "error",
      user: null,
      error: "Sesión inaccesible",
    });
  });

  it("notifica cambios de sesión y permite cancelar la suscripción", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAuthState(listener);
    const user = { id: "user-1", email: "rafa@example.com" };

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    authMocks.emit("SIGNED_IN", { user });

    expect(listener).toHaveBeenCalledWith({
      status: "signed_in",
      user,
      error: null,
    });

    authMocks.emit("SIGNED_OUT", null);
    expect(listener).toHaveBeenCalledWith({
      status: "signed_out",
      user: null,
      error: null,
    });

    unsubscribe();
    expect(authMocks.auth.onAuthStateChange).toHaveBeenCalledOnce();
  });

  it("ignora la sesión inicial si se cancela antes de recibirla", async () => {
    let resolveSession: ((value: unknown) => void) | undefined;
    authMocks.auth.getSession.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    const listener = vi.fn();
    const unsubscribe = subscribeToAuthState(listener);

    unsubscribe();
    resolveSession?.({ data: { session: null }, error: null });
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(listener).not.toHaveBeenCalled();
  });

  it("cierra la sesión", async () => {
    await expect(signOut()).resolves.toEqual({
      ok: true,
      message: "Sesión cerrada.",
    });
    expect(authMocks.auth.signOut).toHaveBeenCalledOnce();
  });

  it("muestra los errores de envío y cierre de sesión", async () => {
    authMocks.auth.signInWithPassword.mockResolvedValueOnce({
      error: new Error("Email rechazado"),
    });
    await expect(
      signInWithPassword("rafa@example.com", "123456"),
    ).resolves.toEqual({
      ok: false,
      message: "Email rechazado",
    });

    authMocks.auth.signOut.mockResolvedValueOnce({ error: {} });
    await expect(signOut()).resolves.toEqual({
      ok: false,
      message: "No se pudo completar la operación de acceso.",
    });
  });

  it("mantiene un fallback claro cuando Supabase no está configurado", async () => {
    supabaseConfigMock.getSupabaseConfig.mockReturnValue(null);

    await expect(
      signInWithPassword("rafa@example.com", "123456"),
    ).resolves.toEqual({
      ok: false,
      message: "El acceso no está configurado.",
    });
    await expect(signOut()).resolves.toEqual({
      ok: false,
      message: "El acceso no está configurado.",
    });

    const listener = vi.fn();
    const unsubscribe = subscribeToAuthState(listener);
    expect(listener).toHaveBeenCalledWith({
      status: "unconfigured",
      user: null,
      error: null,
    });
    unsubscribe();
  });
});
