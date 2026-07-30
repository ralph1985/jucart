import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: {
    url: "https://example.supabase.co",
    anonKey: "anon-key",
    listId: "list-id",
  } as {
    url: string;
    anonKey: string;
    listId: string;
  } | null,
  createClient: vi.fn(),
  functionsInvoke: vi.fn(),
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

vi.mock("./supabaseConfig", () => ({
  getSupabaseConfig: () => mocks.config,
}));

import {
  createRemoteBackupAction,
  createRemoteAction,
  getLatestRemoteAction,
  subscribeToRemoteActions,
} from "./remoteActions";

describe("remote actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config = {
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      listId: "list-id",
    };
    mocks.createClient.mockReturnValue({
      functions: { invoke: mocks.functionsInvoke },
      from: mocks.from,
      channel: mocks.channel,
      removeChannel: mocks.removeChannel,
    });
  });

  it("creates a backup action through the Edge Function", async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: { id: "action-1" },
      error: null,
    });

    await expect(createRemoteBackupAction("request-1")).resolves.toBe(
      "action-1",
    );
    expect(mocks.functionsInvoke).toHaveBeenCalledWith("remote-actions", {
      body: {
        action: "supabase_backup",
        clientRequestId: "request-1",
        payload: {},
      },
    });
  });

  it("creates a maintenance action through the Edge Function", async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: { id: "action-2" },
      error: null,
    });

    await expect(
      createRemoteAction("normalize_products", "request-2"),
    ).resolves.toBe("action-2");
    expect(mocks.functionsInvoke).toHaveBeenCalledWith("remote-actions", {
      body: {
        action: "normalize_products",
        clientRequestId: "request-2",
        payload: {},
      },
    });
  });

  it("reports Edge Function errors and malformed responses", async () => {
    mocks.functionsInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error("function failed"),
    });
    await expect(createRemoteBackupAction("request-2")).rejects.toThrow(
      "function failed",
    );

    mocks.functionsInvoke.mockResolvedValueOnce({
      data: { error: "No se pudo crear la orden." },
      error: null,
    });
    await expect(createRemoteBackupAction("request-3")).rejects.toThrow(
      "No se pudo crear la orden.",
    );

    mocks.functionsInvoke.mockResolvedValueOnce({ data: {}, error: null });
    await expect(createRemoteBackupAction("request-4")).rejects.toThrow(
      "No se pudo crear la orden.",
    );

    mocks.functionsInvoke.mockResolvedValueOnce({ data: null, error: null });
    await expect(createRemoteBackupAction("request-6")).rejects.toThrow(
      "No se pudo crear la orden.",
    );

    mocks.functionsInvoke.mockResolvedValueOnce({ error: null });
    await expect(createRemoteBackupAction("request-7")).rejects.toThrow(
      "No se pudo crear la orden.",
    );
  });

  it("maps the latest action and timestamps", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "action-1",
          action: "supabase_backup",
          status: "completed",
          result_summary: "Backup creado.",
          error_message: null,
          created_at: "2026-07-30T10:00:00.000Z",
          started_at: "2026-07-30T10:00:01.000Z",
          finished_at: "2026-07-30T10:00:04.000Z",
        },
        error: null,
      }),
    };
    mocks.from.mockReturnValue(query);

    await expect(getLatestRemoteAction()).resolves.toMatchObject({
      id: "action-1",
      status: "completed",
      resultSummary: "Backup creado.",
      startedAt: Date.parse("2026-07-30T10:00:01.000Z"),
    });
  });

  it("returns null for an empty latest-action query and propagates query errors", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: new Error("query failed"),
        }),
    };
    mocks.from.mockReturnValue(query);

    await expect(getLatestRemoteAction()).resolves.toBeNull();
    await expect(getLatestRemoteAction()).rejects.toThrow("query failed");
  });

  it("accepts an action without execution timestamps", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "action-2",
          action: "supabase_backup",
          status: "pending",
          result_summary: null,
          error_message: null,
          created_at: "2026-07-30T10:00:00.000Z",
          started_at: null,
          finished_at: null,
        },
        error: null,
      }),
    };
    mocks.from.mockReturnValue(query);

    await expect(getLatestRemoteAction()).resolves.toMatchObject({
      id: "action-2",
      startedAt: null,
      finishedAt: null,
    });
  });

  it("does nothing when Supabase is not configured", async () => {
    mocks.config = null;

    await expect(createRemoteBackupAction("request-5")).rejects.toThrow(
      "Supabase no está configurado.",
    );
    await expect(getLatestRemoteAction()).resolves.toBeNull();
    const unsubscribe = subscribeToRemoteActions(vi.fn());
    unsubscribe();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("removes the Realtime channel when unsubscribed", () => {
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };
    mocks.channel.mockReturnValue(channel);

    const unsubscribe = subscribeToRemoteActions(vi.fn());
    unsubscribe();

    expect(mocks.removeChannel).toHaveBeenCalledWith(channel);
  });
});
