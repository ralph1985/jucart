import { describe, expect, it } from "vitest";

import { isSupabaseConfigured, resolveSupabaseConfig } from "./supabaseConfig";

describe("Supabase config", () => {
  const validEnv = {
    VITE_SUPABASE_ANON_KEY: "anon-key",
    VITE_SUPABASE_LIST_ID: "list-id",
    VITE_SUPABASE_URL: "https://example.supabase.co",
  };

  it("returns null in test mode", () => {
    expect(resolveSupabaseConfig(validEnv, "test")).toBeNull();
  });

  it("returns null when required values are missing or placeholders", () => {
    expect(resolveSupabaseConfig({}, "production")).toBeNull();
    expect(
      resolveSupabaseConfig(
        {
          ...validEnv,
          VITE_SUPABASE_URL: "https://your-project-ref.supabase.co",
        },
        "production",
      ),
    ).toBeNull();
    expect(
      resolveSupabaseConfig(
        {
          ...validEnv,
          VITE_SUPABASE_ANON_KEY: "replace-with-anon-key",
        },
        "production",
      ),
    ).toBeNull();
  });

  it("trims and returns a valid config outside test mode", () => {
    expect(
      resolveSupabaseConfig(
        {
          VITE_SUPABASE_ANON_KEY: " anon-key ",
          VITE_SUPABASE_LIST_ID: " list-id ",
          VITE_SUPABASE_URL: " https://example.supabase.co ",
        },
        "production",
      ),
    ).toEqual({
      anonKey: "anon-key",
      listId: "list-id",
      url: "https://example.supabase.co",
    });
  });

  it("reports whether Supabase is configured", () => {
    expect(isSupabaseConfigured()).toBe(false);
  });
});
