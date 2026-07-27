import {
  createClient,
  type AuthChangeEvent,
  type Session,
  type User,
} from "@supabase/supabase-js";

import { getSupabaseConfig } from "./supabaseConfig";

export type AuthStatus =
  "unconfigured" | "loading" | "signed_out" | "signed_in" | "error";

export type AuthSnapshot = {
  status: AuthStatus;
  user: User | null;
  error: string | null;
};

type AuthStateListener = (snapshot: AuthSnapshot) => void;

let authClient: ReturnType<typeof createClient> | null = null;

function getAuthClient() {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  authClient ??= createClient(config.url, config.anonKey);
  return authClient;
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "No se pudo completar la operación de acceso.";
}

export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  const client = getAuthClient();

  if (!client) {
    return { status: "unconfigured", user: null, error: null };
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    return { status: "error", user: null, error: getAuthErrorMessage(error) };
  }

  return {
    status: data.session ? "signed_in" : "signed_out",
    user: data.session?.user ?? null,
    error: null,
  };
}

export function subscribeToAuthState(listener: AuthStateListener) {
  const client = getAuthClient();

  if (!client) {
    listener({ status: "unconfigured", user: null, error: null });
    return () => undefined;
  }

  let active = true;
  let subscription: { unsubscribe: () => void } | null = null;

  void getAuthSnapshot().then((snapshot) => {
    if (active) {
      listener(snapshot);
    }
  });

  const authSubscription = client.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session: Session | null) => {
      if (active) {
        listener({
          status: session ? "signed_in" : "signed_out",
          user: session?.user ?? null,
          error: null,
        });
      }
    },
  );
  subscription = authSubscription.data.subscription;

  return () => {
    active = false;
    subscription?.unsubscribe();
  };
}

export async function sendMagicLink(email: string) {
  const client = getAuthClient();

  if (!client) {
    return {
      ok: false,
      message: "El acceso por email no está configurado.",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return { ok: false, message: "Escribe tu email." };
  }

  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: window.location.origin },
  });

  if (error) {
    return { ok: false, message: getAuthErrorMessage(error) };
  }

  return {
    ok: true,
    message: "Te hemos enviado un enlace para entrar.",
  };
}

export async function signOut() {
  const client = getAuthClient();

  if (!client) {
    return { ok: false, message: "El acceso por email no está configurado." };
  }

  const { error } = await client.auth.signOut();

  if (error) {
    return { ok: false, message: getAuthErrorMessage(error) };
  }

  return { ok: true, message: "Sesión cerrada." };
}
