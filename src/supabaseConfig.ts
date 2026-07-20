export type SupabaseConfig = {
  url: string;
  anonKey: string;
  listId: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  if (import.meta.env.MODE === "test") {
    return null;
  }

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  const listId = import.meta.env.VITE_SUPABASE_LIST_ID?.trim();

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

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
