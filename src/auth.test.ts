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
    signInWithOtp: vi.fn(),
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
      auth.signInWithOtp.mockReset();
      auth.signOut.mockReset();
    },
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: authMocks.createClient,
}));

vi.mock("./supabaseConfig", () => ({
  getSupabaseConfig: () => ({
    url: "https://example.supabase.co",
    anonKey: "anon-key",
    listId: "list-1",
  }),
}));

import {
  getAuthSnapshot,
  sendMagicLink,
  signOut,
  subscribeToAuthState,
} from "./auth";

describe("auth", () => {
  beforeEach(() => {
    authMocks.reset();
    authMocks.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    authMocks.auth.signInWithOtp.mockResolvedValue({ error: null });
    authMocks.auth.signOut.mockResolvedValue({ error: null });
  });

  it("envía el enlace mágico con el email normalizado", async () => {
    const result = await sendMagicLink("  RAFA@EXAMPLE.COM ");

    expect(result).toEqual({
      ok: true,
      message: "Te hemos enviado un enlace para entrar.",
    });
    expect(authMocks.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "rafa@example.com",
      options: { emailRedirectTo: window.location.origin },
    });
  });

  it("rechaza un email vacío antes de llamar a Supabase", async () => {
    const result = await sendMagicLink("   ");

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Escribe tu email.");
    expect(authMocks.auth.signInWithOtp).not.toHaveBeenCalled();
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

  it("notifica cambios de sesión y permite cancelar la suscripción", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAuthState(listener);
    const user = { id: "user-1", email: "rafa@example.com" };

    await Promise.resolve();
    authMocks.emit("SIGNED_IN", { user });

    expect(listener).toHaveBeenCalledWith({
      status: "signed_in",
      user,
      error: null,
    });

    unsubscribe();
    expect(authMocks.auth.onAuthStateChange).toHaveBeenCalledOnce();
  });

  it("cierra la sesión", async () => {
    await expect(signOut()).resolves.toEqual({
      ok: true,
      message: "Sesión cerrada.",
    });
    expect(authMocks.auth.signOut).toHaveBeenCalledOnce();
  });
});
