export type SupabaseConfig = {
  url: string;
  anonKey: string;
  listId: string;
};

type SupabaseEnv = Record<string, string | undefined>;

export function resolveSupabaseConfig(
  env: SupabaseEnv,
  mode: string,
): SupabaseConfig | null {
  if (mode === "test") {
    return null;
  }

  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  const listId = env.VITE_SUPABASE_LIST_ID?.trim();

  if (
    !url ||
    !anonKey ||
    !listId ||
    url.includes("your-project-ref") ||
    anonKey.includes("replace-with")
  ) {
    return null;
  }

  return { url, anonKey, listId };
}

export function getSupabaseConfig(): SupabaseConfig | null {
  return resolveSupabaseConfig(import.meta.env, import.meta.env.MODE);
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
