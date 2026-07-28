export type SupabaseConfig = {
  url: string;
  anonKey: string;
  listId: string;
};

export const defaultSupabaseListId = "10000000-0000-4000-8000-000000000001";
const legacySupabaseListId = "00000000-0000-4000-8000-000000000001";

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
  const config = resolveSupabaseConfig(import.meta.env, import.meta.env.MODE);

  if (!config || typeof window === "undefined") {
    return config;
  }

  return config.listId === legacySupabaseListId
    ? { ...config, listId: defaultSupabaseListId }
    : config;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
