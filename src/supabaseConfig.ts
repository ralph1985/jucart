export type SupabaseConfig = {
  url: string;
  anonKey: string;
  listId: string;
};

export const activeSupabaseListStorageKey = "jucart:active-list-id";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

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

  const activeListId = window.localStorage
    .getItem(activeSupabaseListStorageKey)
    ?.trim();

  return activeListId && isUuid(activeListId)
    ? { ...config, listId: activeListId }
    : config;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
