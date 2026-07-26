import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => {
  type QueryOperation =
    "delete" | "insert" | "maybeSingle" | "select" | "update" | "upsert";
  type QueryResult = { data?: unknown; error?: unknown };

  const queryResults = new Map<string, QueryResult>();
  const operations: Array<{
    args?: unknown[];
    operation: string;
    rpcName?: string;
    table: string;
  }> = [];

  class QueryBuilder {
    private operation: QueryOperation = "select";

    constructor(private readonly table: string) {}

    select(...args: unknown[]) {
      if (this.operation !== "insert") {
        this.operation = "select";
      }
      operations.push({ args, operation: "select", table: this.table });

      return this;
    }

    eq(...args: unknown[]) {
      operations.push({ args, operation: "eq", table: this.table });

      return this;
    }

    order(...args: unknown[]) {
      operations.push({ args, operation: "order", table: this.table });

      return this;
    }

    limit(...args: unknown[]) {
      operations.push({ args, operation: "limit", table: this.table });

      return this;
    }

    insert(...args: unknown[]) {
      this.operation = "insert";
      operations.push({ args, operation: "insert", table: this.table });

      return this;
    }

    maybeSingle() {
      this.operation = "maybeSingle";
      operations.push({ operation: "maybeSingle", table: this.table });

      return this;
    }

    delete() {
      this.operation = "delete";
      operations.push({ operation: "delete", table: this.table });

      return this;
    }

    not(...args: unknown[]) {
      operations.push({ args, operation: "not", table: this.table });

      return this;
    }

    upsert(...args: unknown[]) {
      operations.push({ args, operation: "upsert", table: this.table });

      return Promise.resolve(
        queryResults.get(`${this.table}:upsert`) ?? {
          data: null,
          error: null,
        },
      );
    }

    update(...args: unknown[]) {
      this.operation = "update";
      operations.push({ args, operation: "update", table: this.table });

      return this;
    }

    then<TResult1 = QueryResult, TResult2 = never>(
      onfulfilled?:
        ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?:
        ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(
        queryResults.get(`${this.table}:${this.operation}`) ?? {
          data: [],
          error: null,
        },
      ).then(onfulfilled, onrejected);
    }
  }

  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  const storageBucket = {
    createSignedUrl: vi.fn((path: string) =>
      Promise.resolve({
        data: { signedUrl: `https://signed.example/${path}` },
        error: null,
      }),
    ),
    upload: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  };

  const client = {
    channel: vi.fn(() => channel),
    from: vi.fn((table: string) => new QueryBuilder(table)),
    removeChannel: vi.fn(),
    rpc: vi.fn((rpcName: string, args: unknown) => {
      operations.push({
        args: [args],
        operation: "rpc",
        rpcName,
        table: "rpc",
      });

      return Promise.resolve(
        queryResults.get(`rpc:${rpcName}`) ?? {
          data: true,
          error: null,
        },
      );
    }),
    storage: {
      from: vi.fn(() => storageBucket),
    },
  };

  return {
    channel,
    client,
    createClient: vi.fn(() => client),
    operations,
    queryResults,
    reset() {
      queryResults.clear();
      operations.length = 0;
      client.channel.mockClear();
      client.from.mockClear();
      client.removeChannel.mockClear();
      client.rpc.mockClear();
      channel.on.mockClear();
      channel.on.mockReturnValue(channel);
      channel.subscribe.mockClear();
      channel.subscribe.mockReturnValue(channel);
      client.storage.from.mockClear();
      storageBucket.createSignedUrl.mockClear();
      storageBucket.createSignedUrl.mockImplementation((path: string) =>
        Promise.resolve({
          data: { signedUrl: `https://signed.example/${path}` },
          error: null,
        }),
      );
      storageBucket.upload.mockClear();
      storageBucket.upload.mockResolvedValue({ data: {}, error: null });
    },
    setResult(table: string, operation: QueryOperation, result: QueryResult) {
      queryResults.set(`${table}:${operation}`, result);
    },
    storageBucket,
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

import {
  getLatestDeveloperBackupRun,
  getSupabasePriceObservations,
  getSupabaseShoppingData,
  getSupabaseShoppingTickets,
  createSupabaseTicketFileUrl,
  disableSupabasePushSubscription,
  excludeSupabaseTicketLine,
  mapFreezerItemToRow,
  mapRowToFreezerItem,
  mapRowToDeveloperBackupRun,
  mapRowToShoppingCategory,
  mapRowToShoppingCanonicalProduct,
  mapRowToShoppingCanonicalProductAlias,
  mapRowToShoppingHistoryEvent,
  mapRowToShoppingItem,
  mapRowToShoppingProductNormalizationChange,
  mapRowToShoppingProductNormalizationRun,
  mapRowToShoppingPriceObservation,
  mapRowToShoppingProductCatalogEntry,
  mapRowToShoppingRecategorizationChange,
  mapRowToShoppingRecategorizationRun,
  mapRowToShoppingSection,
  mapShoppingHistoryEventToRow,
  mapShoppingItemToRow,
  mapShoppingSectionToRow,
  registerSupabasePushSubscription,
  replaceSupabaseShoppingData,
  resolveSupabaseTicketLine,
  subscribeToSupabaseShoppingItems,
  uploadSupabaseShoppingTicket,
} from "./shoppingItemsSupabase";
import * as supabaseConfig from "./supabaseConfig";

const configuredSupabase = {
  anonKey: "anon-key",
  listId: "00000000-0000-4000-8000-000000000001",
  url: "https://example.supabase.co",
};

function createReplaceShoppingData(
  overrides: Partial<Parameters<typeof replaceSupabaseShoppingData>[0]> = {},
): Parameters<typeof replaceSupabaseShoppingData>[0] {
  return {
    categories: [],
    freezerItems: [
      {
        id: "freezer-1",
        name: "Caldo",
        drawerId: "bottom",
        frozenAt: Date.parse("2026-07-01T00:00:00.000Z"),
        createdAt: Date.parse("2026-07-02T10:00:00.000Z"),
        updatedAt: Date.parse("2026-07-02T10:05:00.000Z"),
      },
    ],
    historyEvents: [
      {
        id: "history-1",
        itemId: "item-1",
        type: "initial",
        actor: "rafa",
        clientId: "client-1",
        item: {
          id: "item-1",
          name: "Pan",
          sectionId: "mercadona",
          sectionName: "Mercadona",
          addedBy: "rafa",
          purchased: false,
          createdAt: 100,
          updatedAt: 100,
        },
        createdAt: Date.parse("2026-07-14T10:05:00.000Z"),
      },
    ],
    items: [
      {
        id: "item-1",
        name: "Pan",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: false,
        createdAt: Date.parse("2026-07-14T10:00:00.000Z"),
        updatedAt: Date.parse("2026-07-14T10:05:00.000Z"),
      },
    ],
    productCatalogEntries: [],
    canonicalProducts: [],
    canonicalProductAliases: [],
    productNormalizationChanges: [],
    productNormalizationRuns: [],
    recategorizationChanges: [],
    recategorizationRuns: [],
    sections: [
      {
        id: "mercadona",
        name: "Mercadona",
        color: "mint",
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  supabaseMocks.reset();
});

describe("shopping items Supabase adapter", () => {
  it("reads and maps the full Supabase shopping snapshot", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.setResult("shopping_items", "select", {
      data: [
        {
          id: "item-1",
          list_id: configuredSupabase.listId,
          name: "Leche",
          quantity: "2",
          section_id: "mercadona",
          category_id: "dairy",
          canonical_product_id: "canonical-leche",
          added_by: "begona",
          purchased: false,
          created_at: "2026-07-14T10:00:00.000Z",
          updated_at: "2026-07-14T10:05:00.000Z",
        },
      ],
      error: null,
    });
    supabaseMocks.setResult("shopping_sections", "select", {
      data: [
        {
          id: "mercadona",
          list_id: configuredSupabase.listId,
          name: "Mercadona",
          color: "mint",
          position: 0,
          created_at: "2026-07-14T10:00:00.000Z",
          updated_at: "2026-07-14T10:05:00.000Z",
        },
      ],
      error: null,
    });
    supabaseMocks.setResult("shopping_history_events", "select", {
      data: [
        {
          id: "history-1",
          list_id: configuredSupabase.listId,
          item_id: "item-1",
          event_type: "initial",
          actor: "rafa",
          client_id: "client-1",
          item_snapshot: {
            id: "item-1",
            name: "Leche",
            sectionId: "mercadona",
            sectionName: "Mercadona",
            categoryId: "dairy",
            addedBy: "begona",
            purchased: false,
            createdAt: 100,
            updatedAt: 200,
          },
          previous_item_snapshot: null,
          created_at: "2026-07-14T10:05:00.000Z",
        },
      ],
      error: null,
    });
    supabaseMocks.setResult("freezer_items", "select", {
      data: [
        {
          id: "freezer-1",
          list_id: configuredSupabase.listId,
          name: "Caldo",
          quantity: "1 litro",
          drawer_id: "middle",
          frozen_at: "2026-07-01T00:00:00.000Z",
          created_at: "2026-07-02T10:00:00.000Z",
          updated_at: "2026-07-02T10:05:00.000Z",
        },
      ],
      error: null,
    });
    supabaseMocks.setResult("shopping_categories", "select", {
      data: [
        {
          id: "dairy",
          name: "Lácteos",
          position: 1,
        },
      ],
      error: null,
    });
    supabaseMocks.setResult("shopping_product_catalog_entries", "select", {
      data: [
        {
          id: "dairy-leche",
          category_id: "dairy",
          name: "leche",
          normalized_name: "leche",
        },
      ],
      error: null,
    });
    supabaseMocks.setResult("shopping_recategorization_runs", "select", {
      data: [
        {
          id: "run-1",
          list_id: configuredSupabase.listId,
          source: "codex",
          status: "failed",
          summary: "Error parcial.",
          catalog_entries_added: 0,
          items_recategorized: 0,
          started_at: "2026-07-21T01:00:00.000Z",
          finished_at: "2026-07-21T01:00:05.000Z",
          created_at: "2026-07-21T01:00:05.000Z",
        },
      ],
      error: null,
    });
    supabaseMocks.setResult("shopping_recategorization_changes", "select", {
      data: [
        {
          id: "change-1",
          run_id: "run-1",
          list_id: configuredSupabase.listId,
          item_id: "item-1",
          item_name: "Leche",
          previous_category_id: "other",
          next_category_id: "dairy",
          reason: null,
          catalog_entry_id: "dairy-leche",
          created_at: "2026-07-21T01:00:05.000Z",
        },
      ],
      error: null,
    });
    supabaseMocks.setResult("shopping_canonical_products", "select", {
      data: [
        {
          id: "canonical-leche",
          list_id: configuredSupabase.listId,
          name: "Leche",
          normalized_name: "leche",
          comparison_unit: "l",
          created_at: "2026-07-21T01:00:05.000Z",
          updated_at: "2026-07-21T01:00:05.000Z",
        },
      ],
      error: null,
    });
    supabaseMocks.setResult("shopping_canonical_product_aliases", "select", {
      data: [
        {
          id: "alias-leche",
          list_id: configuredSupabase.listId,
          canonical_product_id: "canonical-leche",
          alias: "leches",
          normalized_alias: "leches",
          created_at: "2026-07-21T01:00:05.000Z",
        },
      ],
      error: null,
    });
    supabaseMocks.setResult("shopping_product_normalization_runs", "select", {
      data: [
        {
          id: "normalization-run-1",
          list_id: configuredSupabase.listId,
          source: "codex",
          status: "success",
          summary: "Normalizada leche.",
          aliases_created: 1,
          items_touched: 1,
          quantities_merged: 0,
          canonical_products_merged: 0,
          started_at: "2026-07-22T01:00:00.000Z",
          finished_at: "2026-07-22T01:00:05.000Z",
          created_at: "2026-07-22T01:00:05.000Z",
        },
      ],
      error: null,
    });
    supabaseMocks.setResult(
      "shopping_product_normalization_changes",
      "select",
      {
        data: [
          {
            id: "normalization-change-1",
            run_id: "normalization-run-1",
            list_id: configuredSupabase.listId,
            action: "alias_created",
            item_id: "item-1",
            previous_item_name: "leches",
            next_item_name: "Leche",
            previous_canonical_product_id: null,
            next_canonical_product_id: "canonical-leche",
            quantity_before: null,
            quantity_after: null,
            reason: "Alias frecuente.",
            created_at: "2026-07-22T01:00:05.000Z",
          },
        ],
        error: null,
      },
    );

    const data = await getSupabaseShoppingData();

    expect(data).toMatchObject({
      categories: [{ id: "dairy", name: "Lácteos", position: 1 }],
      freezerItems: [{ drawerId: "middle", name: "Caldo" }],
      historyEvents: [{ id: "history-1", type: "initial" }],
      items: [
        {
          canonicalProductId: "canonical-leche",
          categoryId: "dairy",
          name: "Leche",
          quantity: "2",
        },
      ],
      canonicalProductAliases: [
        { id: "alias-leche", canonicalProductId: "canonical-leche" },
      ],
      canonicalProducts: [{ id: "canonical-leche", comparisonUnit: "l" }],
      productCatalogEntries: [{ id: "dairy-leche", categoryId: "dairy" }],
      productNormalizationChanges: [
        { id: "normalization-change-1", action: "alias_created" },
      ],
      productNormalizationRuns: [
        { id: "normalization-run-1", aliasesCreated: 1 },
      ],
      recategorizationChanges: [{ id: "change-1", nextCategoryId: "dairy" }],
      recategorizationRuns: [{ id: "run-1", status: "failed" }],
      sections: [{ color: "mint", id: "mercadona" }],
    });
    expect(supabaseMocks.client.from).toHaveBeenCalledWith("shopping_items");
    expect(supabaseMocks.operations).toContainEqual({
      args: ["list_id", configuredSupabase.listId],
      operation: "eq",
      table: "shopping_items",
    });
  });

  it("falls back to local defaults when optional Supabase tables are missing", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    const missingRelationError = {
      code: "42P01",
      message: 'relation "shopping_categories" does not exist',
    };

    supabaseMocks.setResult("shopping_items", "select", {
      data: [],
      error: null,
    });
    supabaseMocks.setResult("shopping_sections", "select", {
      data: [],
      error: null,
    });
    supabaseMocks.setResult("shopping_history_events", "select", {
      data: [],
      error: null,
    });
    supabaseMocks.setResult("freezer_items", "select", {
      data: [],
      error: null,
    });
    supabaseMocks.setResult("shopping_categories", "select", {
      error: missingRelationError,
    });
    supabaseMocks.setResult("shopping_product_catalog_entries", "select", {
      error: missingRelationError,
    });
    supabaseMocks.setResult("shopping_recategorization_runs", "select", {
      error: missingRelationError,
    });
    supabaseMocks.setResult("shopping_recategorization_changes", "select", {
      error: missingRelationError,
    });
    supabaseMocks.setResult("shopping_canonical_products", "select", {
      error: missingRelationError,
    });
    supabaseMocks.setResult("shopping_canonical_product_aliases", "select", {
      error: missingRelationError,
    });
    supabaseMocks.setResult("shopping_product_normalization_runs", "select", {
      error: missingRelationError,
    });
    supabaseMocks.setResult(
      "shopping_product_normalization_changes",
      "select",
      {
        error: missingRelationError,
      },
    );

    const data = await getSupabaseShoppingData();

    expect(data).not.toBeNull();
    expect(data?.categories ?? []).not.toHaveLength(0);
    expect(data?.productCatalogEntries ?? []).not.toHaveLength(0);
    expect(data?.recategorizationChanges).toEqual([]);
    expect(data?.recategorizationRuns).toEqual([]);
    expect(data?.canonicalProducts).toEqual([]);
    expect(data?.canonicalProductAliases).toEqual([]);
    expect(data?.productNormalizationChanges).toEqual([]);
    expect(data?.productNormalizationRuns).toEqual([]);
    expect(data?.sections.length).toBeGreaterThan(0);
  });

  it.each([
    ["shopping_items", "items failed"],
    ["shopping_sections", "sections failed"],
    ["shopping_history_events", "history failed"],
    ["freezer_items", "freezer failed"],
  ] as const)(
    "throws mandatory Supabase read errors from %s",
    async (table, message) => {
      vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
        configuredSupabase,
      );
      supabaseMocks.setResult(table, "select", {
        error: new Error(message),
      });

      await expect(getSupabaseShoppingData()).rejects.toThrow(message);
    },
  );

  it.each([
    ["shopping_categories", "categories failed"],
    ["shopping_product_catalog_entries", "catalog failed"],
    ["shopping_recategorization_runs", "runs failed"],
    ["shopping_recategorization_changes", "changes failed"],
    ["shopping_canonical_products", "canonical failed"],
    ["shopping_canonical_product_aliases", "aliases failed"],
    ["shopping_product_normalization_runs", "normalization runs failed"],
    ["shopping_product_normalization_changes", "normalization changes failed"],
  ] as const)(
    "throws non-missing optional Supabase read errors from %s",
    async (table, message) => {
      vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
        configuredSupabase,
      );
      supabaseMocks.setResult(table, "select", {
        error: new Error(message),
      });

      await expect(getSupabaseShoppingData()).rejects.toThrow(message);
    },
  );

  it("replaces Supabase shopping data with upserts and stale-row deletes", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );

    await expect(
      replaceSupabaseShoppingData(createReplaceShoppingData()),
    ).resolves.toBe(true);

    expect(supabaseMocks.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "upsert",
          table: "shopping_sections",
        }),
        expect.objectContaining({
          operation: "upsert",
          table: "shopping_items",
        }),
        expect.objectContaining({
          operation: "upsert",
          table: "shopping_history_events",
        }),
        expect.objectContaining({
          operation: "upsert",
          table: "freezer_items",
        }),
        expect.objectContaining({
          args: ["id", "in", '("mercadona")'],
          operation: "not",
          table: "shopping_sections",
        }),
        expect.objectContaining({
          args: ["id", "in", '("item-1")'],
          operation: "not",
          table: "shopping_items",
        }),
        expect.objectContaining({
          args: ["id", "in", '("history-1")'],
          operation: "not",
          table: "shopping_history_events",
        }),
        expect.objectContaining({
          args: ["id", "in", '("freezer-1")'],
          operation: "not",
          table: "freezer_items",
        }),
      ]),
    );
  });

  it("replaces empty Supabase shopping data without upserts", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );

    await expect(
      replaceSupabaseShoppingData(
        createReplaceShoppingData({
          freezerItems: [],
          historyEvents: [],
          items: [],
          sections: [],
        }),
      ),
    ).resolves.toBe(true);

    expect(
      supabaseMocks.operations.some(
        (operation) => operation.operation === "upsert",
      ),
    ).toBe(false);
    expect(supabaseMocks.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "delete",
          table: "shopping_sections",
        }),
        expect.objectContaining({
          operation: "delete",
          table: "shopping_items",
        }),
        expect.objectContaining({
          operation: "delete",
          table: "shopping_history_events",
        }),
        expect.objectContaining({
          operation: "delete",
          table: "freezer_items",
        }),
      ]),
    );
  });

  it.each([
    ["shopping_sections", "upsert"],
    ["shopping_sections", "delete"],
    ["shopping_items", "upsert"],
    ["shopping_items", "delete"],
    ["shopping_history_events", "upsert"],
    ["shopping_history_events", "delete"],
    ["freezer_items", "upsert"],
    ["freezer_items", "delete"],
  ] as const)("throws when Supabase %s %s fails", async (table, operation) => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.setResult(table, operation, {
      error: new Error(`${table} ${operation} failed`),
    });

    await expect(
      replaceSupabaseShoppingData(createReplaceShoppingData()),
    ).rejects.toThrow(`${table} ${operation} failed`);
  });

  it("reads the latest developer backup run", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.setResult("developer_backup_runs", "maybeSingle", {
      data: {
        id: "backup-1",
        started_at: "2026-07-15T10:00:00.000Z",
        finished_at: "2026-07-15T10:00:08.000Z",
        status: "success",
        file_name: "jucart.sql.tar.gz",
        file_size_bytes: 2048,
        sha256: "hash",
        duration_ms: 8000,
        retained_count: 12,
        error_message: null,
        created_at: "2026-07-15T10:00:09.000Z",
      },
      error: null,
    });

    await expect(getLatestDeveloperBackupRun()).resolves.toMatchObject({
      fileName: "jucart.sql.tar.gz",
      id: "backup-1",
      status: "success",
    });
    expect(supabaseMocks.operations).toContainEqual({
      args: ["created_at", { ascending: false }],
      operation: "order",
      table: "developer_backup_runs",
    });
  });

  it("returns null when there is no developer backup run", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.setResult("developer_backup_runs", "maybeSingle", {
      data: null,
      error: null,
    });

    await expect(getLatestDeveloperBackupRun()).resolves.toBeNull();
  });

  it("throws developer backup read errors", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.setResult("developer_backup_runs", "maybeSingle", {
      error: new Error("backup read failed"),
    });

    await expect(getLatestDeveloperBackupRun()).rejects.toThrow(
      "backup read failed",
    );
  });

  it("loads shopping tickets with files and lines", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.setResult("shopping_tickets", "select", {
      data: [
        {
          id: "ticket-1",
          list_id: configuredSupabase.listId,
          section_id: "mercadona",
          uploaded_by: "begona",
          status: "needs_review",
          file_count: 1,
          uploaded_at: "2026-07-25T18:00:00.000Z",
          processed_at: null,
          error_message: null,
          created_at: "2026-07-25T18:00:00.000Z",
          updated_at: "2026-07-25T18:00:00.000Z",
        },
      ],
    });
    supabaseMocks.setResult("shopping_ticket_files", "select", {
      data: [
        {
          id: "file-1",
          ticket_id: "ticket-1",
          list_id: configuredSupabase.listId,
          storage_bucket: "shopping-tickets",
          storage_path: `${configuredSupabase.listId}/ticket-1/00-ticket.pdf`,
          file_name: "ticket.pdf",
          content_type: "application/pdf",
          size_bytes: 1200,
          sha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          position: 0,
          uploaded_at: "2026-07-25T18:00:00.000Z",
          created_at: "2026-07-25T18:00:00.000Z",
        },
      ],
    });
    supabaseMocks.setResult("shopping_ticket_lines", "select", {
      data: [
        {
          id: "line-1",
          ticket_id: "ticket-1",
          list_id: configuredSupabase.listId,
          line_index: 0,
          raw_text: "PLATANOS 1.20",
          product_name: "Plátanos",
          canonical_product_id: "canonical-1",
          quantity: "1 kg",
          unit_price: 1.2,
          total_price: 1.2,
          original_total_price: null,
          discount_total: null,
          status: "needs_review",
          needs_review: true,
          review_reason: "Alias no confirmado",
          created_at: "2026-07-25T18:05:00.000Z",
          updated_at: "2026-07-25T18:05:00.000Z",
        },
      ],
    });

    const tickets = await getSupabaseShoppingTickets();

    expect(tickets).toHaveLength(1);
    expect(tickets?.[0]).toMatchObject({
      fileCount: 1,
      sectionId: "mercadona",
      status: "needs_review",
      uploadedBy: "begona",
    });
    expect(tickets?.[0]?.files[0]).toMatchObject({
      fileName: "ticket.pdf",
      storageBucket: "shopping-tickets",
    });
    expect(tickets?.[0]?.lines[0]).toMatchObject({
      needsReview: true,
      productName: "Plátanos",
      status: "needs_review",
    });
  });

  it("loads Supabase price observations for the configured list", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.setResult("shopping_price_observations", "select", {
      data: [
        {
          id: "price-observation-1",
          list_id: configuredSupabase.listId,
          source: "ticket",
          ticket_id: "ticket-1",
          ticket_line_id: "ticket-line-1",
          canonical_product_id: "canonical-platanos",
          section_id: "mercadona",
          observed_at: "2026-07-25T20:15:00.000Z",
          product_name: "Plátanos",
          quantity: "1 kg",
          comparison_unit: "kg",
          price_kind: "unit",
          observed_price: 1.95,
          unit_price: 1.95,
          total_price: 1.95,
          original_total_price: null,
          discount_total: null,
          created_at: "2026-07-25T20:20:00.000Z",
          updated_at: "2026-07-25T20:20:05.000Z",
        },
      ],
    });

    const observations = await getSupabasePriceObservations();

    expect(observations).toHaveLength(1);
    expect(observations?.[0]).toMatchObject({
      canonicalProductId: "canonical-platanos",
      comparisonUnit: "kg",
      observedPrice: 1.95,
      sectionId: "mercadona",
    });
    expect(supabaseMocks.operations).toContainEqual({
      args: ["list_id", configuredSupabase.listId],
      operation: "eq",
      table: "shopping_price_observations",
    });
    expect(supabaseMocks.operations).toContainEqual({
      args: ["observed_at", { ascending: false }],
      operation: "order",
      table: "shopping_price_observations",
    });
  });

  it("resolves a reviewed ticket line and creates alias and price observation", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "11111111-1111-4111-8111-111111111111",
    );
    supabaseMocks.setResult("shopping_ticket_lines", "select", {
      data: [{ needs_review: false }],
    });

    await resolveSupabaseTicketLine({
      ticket: {
        id: "ticket-1",
        sectionId: "mercadona",
        uploadedBy: "rafa",
        status: "needs_review",
        fileCount: 1,
        uploadedAt: Date.parse("2026-07-25T18:00:00.000Z"),
        processedAt: Date.parse("2026-07-25T18:05:00.000Z"),
        errorMessage: null,
        createdAt: Date.parse("2026-07-25T18:00:00.000Z"),
        updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
        files: [],
        lines: [],
      },
      line: {
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
      canonicalProduct: {
        id: "canonical-platanos",
        name: "Plátanos",
        normalizedName: "platanos",
        comparisonUnit: "kg",
        createdAt: 100,
        updatedAt: 100,
      },
      createAlias: true,
      alias: "Plátanos",
    });

    expect(supabaseMocks.operations).toContainEqual({
      args: [
        {
          canonical_product_id: "canonical-platanos",
          needs_review: false,
          review_reason: null,
          status: "processed",
        },
      ],
      operation: "update",
      table: "shopping_ticket_lines",
    });
    expect(supabaseMocks.operations).toContainEqual(
      expect.objectContaining({
        args: [
          expect.objectContaining({
            alias: "Plátanos",
            canonical_product_id: "canonical-platanos",
            normalized_alias: "platanos",
          }),
          { onConflict: "list_id,normalized_alias" },
        ],
        operation: "upsert",
        table: "shopping_canonical_product_aliases",
      }),
    );
    expect(supabaseMocks.operations).toContainEqual(
      expect.objectContaining({
        args: [
          expect.objectContaining({
            canonical_product_id: "canonical-platanos",
            observed_price: 1.2,
            ticket_line_id: "line-1",
          }),
          { onConflict: "ticket_line_id" },
        ],
        operation: "upsert",
        table: "shopping_price_observations",
      }),
    );
    expect(supabaseMocks.operations).toContainEqual({
      args: [
        {
          error_message: null,
          status: "processed",
        },
      ],
      operation: "update",
      table: "shopping_tickets",
    });
  });

  it("corrects a resolved ticket line and removes the previous alias", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.setResult("shopping_ticket_lines", "select", {
      data: [{ needs_review: false }],
    });

    await resolveSupabaseTicketLine({
      ticket: {
        id: "ticket-1",
        sectionId: "mercadona",
        uploadedBy: "rafa",
        status: "processed",
        fileCount: 1,
        uploadedAt: Date.parse("2026-07-25T18:00:00.000Z"),
        processedAt: Date.parse("2026-07-25T18:05:00.000Z"),
        errorMessage: null,
        createdAt: Date.parse("2026-07-25T18:00:00.000Z"),
        updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
        files: [],
        lines: [],
      },
      line: {
        id: "line-1",
        ticketId: "ticket-1",
        lineIndex: 0,
        rawText: "2 E. POLLO 1,60 3,20",
        productName: "E. pollo",
        canonicalProductId: "canonical-pavo",
        quantity: "2 unit",
        unitPrice: 1.6,
        totalPrice: 3.2,
        originalTotalPrice: null,
        discountTotal: null,
        status: "processed",
        needsReview: false,
        reviewReason: null,
        createdAt: Date.parse("2026-07-25T18:05:00.000Z"),
        updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
      },
      canonicalProduct: {
        id: "canonical-empanadillas",
        name: "Empanadillas de pollo",
        normalizedName: "empanadillas de pollo",
        comparisonUnit: "unit",
        createdAt: 100,
        updatedAt: 100,
      },
      createAlias: true,
      alias: "E. pollo",
      removeExistingAlias: true,
      replaceProductName: true,
    });

    expect(supabaseMocks.operations).toContainEqual({
      args: [
        {
          canonical_product_id: "canonical-empanadillas",
          needs_review: false,
          product_name: "Empanadillas de pollo",
          review_reason: null,
          status: "processed",
        },
      ],
      operation: "update",
      table: "shopping_ticket_lines",
    });
    expect(supabaseMocks.operations).toEqual(
      expect.arrayContaining([
        {
          args: ["canonical_product_id", "canonical-pavo"],
          operation: "eq",
          table: "shopping_canonical_product_aliases",
        },
        {
          args: ["normalized_alias", "e pollo"],
          operation: "eq",
          table: "shopping_canonical_product_aliases",
        },
      ]),
    );
    expect(supabaseMocks.operations).toContainEqual(
      expect.objectContaining({
        args: [
          expect.objectContaining({
            alias: "E. pollo",
            canonical_product_id: "canonical-empanadillas",
            normalized_alias: "e pollo",
          }),
          { onConflict: "list_id,normalized_alias" },
        ],
        operation: "upsert",
        table: "shopping_canonical_product_aliases",
      }),
    );
    expect(supabaseMocks.operations).toContainEqual(
      expect.objectContaining({
        args: [
          expect.objectContaining({
            canonical_product_id: "canonical-empanadillas",
            comparison_unit: "unit",
            observed_price: 1.6,
            product_name: "Empanadillas de pollo",
            ticket_line_id: "line-1",
          }),
          { onConflict: "ticket_line_id" },
        ],
        operation: "upsert",
        table: "shopping_price_observations",
      }),
    );
  });

  it("keeps the ticket in review when resolving one line leaves another pending", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.setResult("shopping_ticket_lines", "select", {
      data: [{ needs_review: true }],
    });

    await resolveSupabaseTicketLine({
      ticket: {
        id: "ticket-1",
        sectionId: "mercadona",
        uploadedBy: "rafa",
        status: "needs_review",
        fileCount: 1,
        uploadedAt: Date.parse("2026-07-25T18:00:00.000Z"),
        processedAt: null,
        errorMessage: null,
        createdAt: Date.parse("2026-07-25T18:00:00.000Z"),
        updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
        files: [],
        lines: [],
      },
      line: {
        id: "line-1",
        ticketId: "ticket-1",
        lineIndex: 0,
        rawText: "QUESO 10%",
        productName: "Queso",
        canonicalProductId: null,
        quantity: "1 ud",
        unitPrice: 2,
        totalPrice: 2,
        originalTotalPrice: 2.5,
        discountTotal: 0.5,
        status: "needs_review",
        needsReview: true,
        reviewReason: "Precio con descuento",
        createdAt: Date.parse("2026-07-25T18:05:00.000Z"),
        updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
      },
      canonicalProduct: {
        id: "canonical-queso",
        name: "Queso",
        normalizedName: "queso",
        comparisonUnit: "unit",
        createdAt: 100,
        updatedAt: 100,
      },
      createAlias: false,
      alias: "",
    });

    expect(supabaseMocks.operations).not.toContainEqual(
      expect.objectContaining({
        operation: "upsert",
        table: "shopping_canonical_product_aliases",
      }),
    );
    expect(supabaseMocks.operations).toContainEqual(
      expect.objectContaining({
        args: [
          expect.objectContaining({
            observed_at: "2026-07-25T18:00:00.000Z",
            observed_price: 2.5,
            ticket_line_id: "line-1",
          }),
          { onConflict: "ticket_line_id" },
        ],
        operation: "upsert",
        table: "shopping_price_observations",
      }),
    );
    expect(supabaseMocks.operations).toContainEqual({
      args: [
        {
          error_message: null,
          status: "needs_review",
        },
      ],
      operation: "update",
      table: "shopping_tickets",
    });
  });

  it("excludes a reviewed ticket line", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.setResult("shopping_ticket_lines", "select", {
      data: [{ needs_review: false }],
    });

    await excludeSupabaseTicketLine(
      {
        id: "ticket-1",
        sectionId: "mercadona",
        uploadedBy: "rafa",
        status: "needs_review",
        fileCount: 1,
        uploadedAt: Date.parse("2026-07-25T18:00:00.000Z"),
        processedAt: null,
        errorMessage: null,
        createdAt: Date.parse("2026-07-25T18:00:00.000Z"),
        updatedAt: Date.parse("2026-07-25T18:00:00.000Z"),
        files: [],
        lines: [],
      },
      {
        id: "line-1",
        ticketId: "ticket-1",
        lineIndex: 0,
        rawText: null,
        productName: "Cupón",
        canonicalProductId: null,
        quantity: null,
        unitPrice: null,
        totalPrice: null,
        originalTotalPrice: null,
        discountTotal: null,
        status: "needs_review",
        needsReview: true,
        reviewReason: null,
        createdAt: Date.parse("2026-07-25T18:05:00.000Z"),
        updatedAt: Date.parse("2026-07-25T18:05:00.000Z"),
      },
    );

    expect(supabaseMocks.operations).toContainEqual({
      args: [
        {
          canonical_product_id: null,
          needs_review: false,
          review_reason: null,
          status: "excluded",
        },
      ],
      operation: "update",
      table: "shopping_ticket_lines",
    });
  });

  it("uploads ticket files before creating ticket metadata", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "11111111-1111-4111-8111-111111111111",
    );
    supabaseMocks.setResult("shopping_tickets", "insert", {
      data: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          list_id: configuredSupabase.listId,
          section_id: "mercadona",
          uploaded_by: "rafa",
          status: "pending",
          file_count: 1,
          uploaded_at: "2026-07-25T18:00:00.000Z",
          processed_at: null,
          error_message: null,
          created_at: "2026-07-25T18:00:00.000Z",
          updated_at: "2026-07-25T18:00:00.000Z",
        },
      ],
    });
    supabaseMocks.setResult("shopping_ticket_files", "insert", {
      data: [
        {
          id: "file-1",
          ticket_id: "11111111-1111-4111-8111-111111111111",
          list_id: configuredSupabase.listId,
          storage_bucket: "shopping-tickets",
          storage_path: `${configuredSupabase.listId}/11111111-1111-4111-8111-111111111111/00-ticket-raro-1.pdf`,
          file_name: "Tícket raro 1.pdf",
          content_type: "application/octet-stream",
          size_bytes: 6,
          sha256:
            "bef57ec7f53a6d40beb640a780a639c83bc29ac8a9816f1fc6c5c6dcd93c4721",
          position: 0,
          uploaded_at: "2026-07-25T18:00:00.000Z",
          created_at: "2026-07-25T18:00:00.000Z",
        },
      ],
    });
    const file = new File(["ticket"], "Tícket raro 1.pdf");

    const ticket = await uploadSupabaseShoppingTicket({
      files: [file],
      sectionId: "mercadona",
      uploadedBy: "rafa",
    });

    expect(supabaseMocks.client.storage.from).toHaveBeenCalledWith(
      "shopping-tickets",
    );
    expect(supabaseMocks.storageBucket.upload).toHaveBeenCalledWith(
      `${configuredSupabase.listId}/11111111-1111-4111-8111-111111111111/00-ticket-raro-1.pdf`,
      file,
      expect.objectContaining({
        contentType: "application/octet-stream",
        upsert: false,
      }),
    );
    expect(ticket).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      fileCount: 1,
      sectionId: "mercadona",
    });
  });

  it("rejects ticket uploads without files", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );

    await expect(
      uploadSupabaseShoppingTicket({
        files: [],
        sectionId: "mercadona",
        uploadedBy: "rafa",
      }),
    ).rejects.toThrow("Ticket files are required.");
  });

  it("returns null when uploading tickets without Supabase config", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(null);

    await expect(
      uploadSupabaseShoppingTicket({
        files: [new File(["ticket"], "ticket.pdf")],
        sectionId: "mercadona",
        uploadedBy: "rafa",
      }),
    ).resolves.toBeNull();
  });

  it("throws when ticket metadata insert returns no row", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "11111111-1111-4111-8111-111111111111",
    );
    supabaseMocks.setResult("shopping_tickets", "insert", {
      data: [],
      error: null,
    });
    supabaseMocks.setResult("shopping_ticket_files", "insert", {
      data: [],
      error: null,
    });

    await expect(
      uploadSupabaseShoppingTicket({
        files: [new File(["ticket"], "ticket.pdf")],
        sectionId: "mercadona",
        uploadedBy: "rafa",
      }),
    ).rejects.toThrow("Ticket was not created.");
  });

  it("creates signed URLs for private ticket files", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );

    await expect(
      createSupabaseTicketFileUrl({
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
      }),
    ).resolves.toBe("https://signed.example/list/ticket-1/00-ticket.pdf");
  });

  it("returns null when creating signed ticket URLs without Supabase config", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(null);

    await expect(
      createSupabaseTicketFileUrl({
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
      }),
    ).resolves.toBeNull();
  });

  it("subscribes to Supabase tables and removes the channel on cleanup", () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    const onChange = vi.fn();

    const unsubscribe = subscribeToSupabaseShoppingItems(onChange);
    unsubscribe();

    expect(supabaseMocks.client.channel).toHaveBeenCalledWith(
      `shopping_items:${configuredSupabase.listId}`,
    );
    expect(supabaseMocks.channel.on).toHaveBeenCalledTimes(15);
    expect(supabaseMocks.channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        filter: `list_id=eq.${configuredSupabase.listId}`,
        table: "shopping_items",
      }),
      onChange,
    );
    expect(supabaseMocks.channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        filter: `list_id=eq.${configuredSupabase.listId}`,
        table: "shopping_tickets",
      }),
      onChange,
    );
    expect(supabaseMocks.channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        filter: `list_id=eq.${configuredSupabase.listId}`,
        table: "shopping_ticket_files",
      }),
      onChange,
    );
    expect(supabaseMocks.channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        filter: `list_id=eq.${configuredSupabase.listId}`,
        table: "shopping_ticket_lines",
      }),
      onChange,
    );
    expect(supabaseMocks.channel.subscribe).toHaveBeenCalledOnce();
    expect(supabaseMocks.client.removeChannel).toHaveBeenCalledWith(
      supabaseMocks.channel,
    );
  });

  it("registers a push subscription through RPC without reading push endpoints", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );

    await expect(
      registerSupabasePushSubscription({
        auth: "auth-key",
        clientId: "client-1",
        endpoint: "https://push.example/subscription-1",
        p256dh: "p256dh-key",
        userAgent: "Test browser",
      }),
    ).resolves.toBe(true);

    expect(supabaseMocks.operations).toContainEqual({
      args: [
        {
          p_auth: "auth-key",
          p_client_id: "client-1",
          p_endpoint: "https://push.example/subscription-1",
          p_list_id: configuredSupabase.listId,
          p_p256dh: "p256dh-key",
          p_user_agent: "Test browser",
        },
      ],
      operation: "rpc",
      rpcName: "register_push_subscription",
      table: "rpc",
    });
    expect(
      supabaseMocks.operations.some(
        (operation) =>
          operation.table === "push_subscriptions" &&
          operation.operation === "select",
      ),
    ).toBe(false);
  });

  it("returns false when registering push subscriptions without Supabase config", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(null);

    await expect(
      registerSupabasePushSubscription({
        auth: "auth-key",
        clientId: "client-1",
        endpoint: "https://push.example/subscription-1",
        p256dh: "p256dh-key",
        userAgent: "Test browser",
      }),
    ).resolves.toBe(false);

    expect(supabaseMocks.client.from).not.toHaveBeenCalled();
  });

  it("throws Supabase errors when registering a push subscription fails", async () => {
    const error = new Error("upsert failed");
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.queryResults.set("rpc:register_push_subscription", { error });

    await expect(
      registerSupabasePushSubscription({
        auth: "auth-key",
        clientId: "client-1",
        endpoint: "https://push.example/subscription-1",
        p256dh: "p256dh-key",
        userAgent: "Test browser",
      }),
    ).rejects.toThrow(error);
  });

  it("disables a push subscription by endpoint through RPC without reading push endpoints", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );

    await expect(
      disableSupabasePushSubscription("https://push.example/subscription-1"),
    ).resolves.toBe(true);

    expect(supabaseMocks.operations).toContainEqual({
      args: [{ p_endpoint: "https://push.example/subscription-1" }],
      operation: "rpc",
      rpcName: "disable_push_subscription",
      table: "rpc",
    });
    expect(
      supabaseMocks.operations.some(
        (operation) =>
          operation.table === "push_subscriptions" &&
          operation.operation === "select",
      ),
    ).toBe(false);
  });

  it("returns false when disabling push subscriptions without Supabase config", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(null);

    await expect(
      disableSupabasePushSubscription("https://push.example/subscription-1"),
    ).resolves.toBe(false);

    expect(supabaseMocks.client.from).not.toHaveBeenCalled();
  });

  it("throws Supabase errors when disabling a push subscription fails", async () => {
    const error = new Error("update failed");
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    supabaseMocks.queryResults.set("rpc:disable_push_subscription", { error });

    await expect(
      disableSupabasePushSubscription("https://push.example/subscription-1"),
    ).rejects.toThrow(error);
  });

  it("maps a Supabase row to a freezer item", () => {
    expect(
      mapRowToFreezerItem({
        id: "freezer-1",
        list_id: "00000000-0000-4000-8000-000000000001",
        name: "Lentejas",
        quantity: "2 raciones",
        drawer_id: "middle",
        frozen_at: "2026-07-01T00:00:00.000Z",
        created_at: "2026-07-02T10:00:00.000Z",
        updated_at: "2026-07-02T10:05:00.000Z",
      }),
    ).toEqual({
      id: "freezer-1",
      name: "Lentejas",
      quantity: "2 raciones",
      drawerId: "middle",
      frozenAt: Date.parse("2026-07-01T00:00:00.000Z"),
      createdAt: Date.parse("2026-07-02T10:00:00.000Z"),
      updatedAt: Date.parse("2026-07-02T10:05:00.000Z"),
    });
  });

  it("maps a freezer item to a Supabase row", () => {
    expect(
      mapFreezerItemToRow(
        {
          id: "freezer-1",
          name: "Caldo",
          quantity: "1 litro",
          drawerId: "bottom",
          frozenAt: Date.parse("2026-07-01T00:00:00.000Z"),
          createdAt: Date.parse("2026-07-02T10:00:00.000Z"),
          updatedAt: Date.parse("2026-07-02T10:05:00.000Z"),
        },
        "00000000-0000-4000-8000-000000000001",
      ),
    ).toEqual({
      id: "freezer-1",
      list_id: "00000000-0000-4000-8000-000000000001",
      name: "Caldo",
      quantity: "1 litro",
      drawer_id: "bottom",
      frozen_at: "2026-07-01T00:00:00.000Z",
      created_at: "2026-07-02T10:00:00.000Z",
      updated_at: "2026-07-02T10:05:00.000Z",
    });
  });

  it("maps a Supabase row to a shopping item", () => {
    expect(
      mapRowToShoppingItem({
        id: "item-1",
        list_id: "00000000-0000-4000-8000-000000000001",
        name: "Leche",
        quantity: "2",
        section_id: "mercadona",
        category_id: "dairy",
        added_by: "begona",
        purchased: true,
        created_at: "2026-07-14T10:00:00.000Z",
        updated_at: "2026-07-14T10:05:00.000Z",
      }),
    ).toEqual({
      id: "item-1",
      name: "Leche",
      quantity: "2",
      sectionId: "mercadona",
      categoryId: "dairy",
      addedBy: "begona",
      purchased: true,
      createdAt: Date.parse("2026-07-14T10:00:00.000Z"),
      updatedAt: Date.parse("2026-07-14T10:05:00.000Z"),
    });
  });

  it("maps a shopping item to a Supabase row", () => {
    expect(
      mapShoppingItemToRow(
        {
          id: "item-1",
          name: "Pan",
          quantity: "1 kg",
          sectionId: "alcampo",
          categoryId: "bakery",
          addedBy: "rafa",
          purchased: false,
          createdAt: Date.parse("2026-07-14T10:00:00.000Z"),
          updatedAt: Date.parse("2026-07-14T10:05:00.000Z"),
        },
        "00000000-0000-4000-8000-000000000001",
      ),
    ).toEqual({
      id: "item-1",
      list_id: "00000000-0000-4000-8000-000000000001",
      name: "Pan",
      quantity: "1 kg",
      section_id: "alcampo",
      category_id: "bakery",
      canonical_product_id: null,
      added_by: "rafa",
      purchased: false,
      created_at: "2026-07-14T10:00:00.000Z",
      updated_at: "2026-07-14T10:05:00.000Z",
    });
  });

  it("keeps custom section ids and normalizes unknown users from Supabase", () => {
    expect(
      mapRowToShoppingItem({
        id: "item-1",
        list_id: "00000000-0000-4000-8000-000000000001",
        name: "Leche",
        section_id: "unknown",
        added_by: "unknown",
        purchased: false,
        created_at: "2026-07-14T10:00:00.000Z",
        updated_at: "2026-07-14T10:00:00.000Z",
      }),
    ).toMatchObject({
      sectionId: "unknown",
      addedBy: "rafa",
    });
  });

  it("maps Supabase section rows", () => {
    expect(
      mapRowToShoppingSection({
        id: "fruteria",
        name: "Frutería",
        color: "amber",
      }),
    ).toEqual({
      id: "fruteria",
      name: "Frutería",
      color: "amber",
    });
  });

  it("maps Supabase category rows", () => {
    expect(
      mapRowToShoppingCategory({
        id: "pantry",
        name: "Despensa",
        position: 6,
      }),
    ).toEqual({
      id: "pantry",
      name: "Despensa",
      position: 6,
    });
  });

  it("maps Supabase product catalog rows", () => {
    expect(
      mapRowToShoppingProductCatalogEntry({
        id: "pantry-nueces",
        category_id: "pantry",
        name: "nueces",
        normalized_name: "nueces",
      }),
    ).toEqual({
      id: "pantry-nueces",
      categoryId: "pantry",
      name: "nueces",
      normalizedName: "nueces",
    });
  });

  it("maps Supabase recategorization run rows", () => {
    expect(
      mapRowToShoppingRecategorizationRun({
        id: "00000000-0000-4000-8000-000000000001",
        list_id: "00000000-0000-4000-8000-000000000002",
        source: "codex",
        status: "success",
        summary: "Recategorizados 2 productos.",
        catalog_entries_added: 1,
        items_recategorized: 2,
        started_at: "2026-07-21T01:00:00.000Z",
        finished_at: "2026-07-21T01:00:05.000Z",
        created_at: "2026-07-21T01:00:05.000Z",
      }),
    ).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      source: "codex",
      status: "success",
      summary: "Recategorizados 2 productos.",
      catalogEntriesAdded: 1,
      itemsRecategorized: 2,
      startedAt: Date.parse("2026-07-21T01:00:00.000Z"),
      finishedAt: Date.parse("2026-07-21T01:00:05.000Z"),
      createdAt: Date.parse("2026-07-21T01:00:05.000Z"),
    });
  });

  it("maps Supabase recategorization change rows", () => {
    expect(
      mapRowToShoppingRecategorizationChange({
        id: "00000000-0000-4000-8000-000000000001",
        run_id: "00000000-0000-4000-8000-000000000002",
        list_id: "00000000-0000-4000-8000-000000000003",
        item_id: "item-1",
        item_name: "Cebollas",
        previous_category_id: "other",
        next_category_id: "vegetables",
        reason: "Cebollas pertenece a verdura.",
        catalog_entry_id: "vegetables-cebollas",
        created_at: "2026-07-21T01:00:05.000Z",
      }),
    ).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      runId: "00000000-0000-4000-8000-000000000002",
      itemId: "item-1",
      itemName: "Cebollas",
      previousCategoryId: "other",
      nextCategoryId: "vegetables",
      reason: "Cebollas pertenece a verdura.",
      catalogEntryId: "vegetables-cebollas",
      createdAt: Date.parse("2026-07-21T01:00:05.000Z"),
    });
  });

  it("maps Supabase canonical product and normalization rows", () => {
    expect(
      mapRowToShoppingCanonicalProduct({
        id: "canonical-1",
        list_id: configuredSupabase.listId,
        name: "Plátanos",
        normalized_name: "platanos",
        comparison_unit: "kg",
        created_at: "2026-07-22T01:00:00.000Z",
        updated_at: "2026-07-22T01:00:05.000Z",
      }),
    ).toEqual({
      id: "canonical-1",
      name: "Plátanos",
      normalizedName: "platanos",
      comparisonUnit: "kg",
      createdAt: Date.parse("2026-07-22T01:00:00.000Z"),
      updatedAt: Date.parse("2026-07-22T01:00:05.000Z"),
    });
    expect(
      mapRowToShoppingCanonicalProductAlias({
        id: "alias-1",
        list_id: configuredSupabase.listId,
        canonical_product_id: "canonical-1",
        alias: "plátano",
        normalized_alias: "platano",
        created_at: "2026-07-22T01:00:05.000Z",
      }),
    ).toEqual({
      id: "alias-1",
      canonicalProductId: "canonical-1",
      alias: "plátano",
      normalizedAlias: "platano",
      createdAt: Date.parse("2026-07-22T01:00:05.000Z"),
    });
    expect(
      mapRowToShoppingProductNormalizationRun({
        id: "normalization-run-1",
        list_id: configuredSupabase.listId,
        source: "codex",
        status: "failed",
        summary: "Error.",
        aliases_created: 1,
        items_touched: 2,
        quantities_merged: 1,
        canonical_products_merged: 0,
        started_at: "2026-07-22T01:00:00.000Z",
        finished_at: "2026-07-22T01:00:05.000Z",
        created_at: "2026-07-22T01:00:05.000Z",
      }),
    ).toMatchObject({
      id: "normalization-run-1",
      status: "failed",
      aliasesCreated: 1,
      itemsTouched: 2,
      quantitiesMerged: 1,
    });
    expect(
      mapRowToShoppingProductNormalizationChange({
        id: "normalization-change-1",
        run_id: "normalization-run-1",
        list_id: configuredSupabase.listId,
        action: "alias_created",
        item_id: "item-1",
        previous_item_name: "plátano",
        next_item_name: "Plátanos",
        previous_canonical_product_id: null,
        next_canonical_product_id: "canonical-1",
        quantity_before: null,
        quantity_after: null,
        reason: "Alias frecuente.",
        created_at: "2026-07-22T01:00:05.000Z",
      }),
    ).toMatchObject({
      id: "normalization-change-1",
      action: "alias_created",
      nextCanonicalProductId: "canonical-1",
    });
  });

  it("maps Supabase price observation rows", () => {
    expect(
      mapRowToShoppingPriceObservation({
        id: "price-observation-1",
        list_id: configuredSupabase.listId,
        source: "ticket",
        ticket_id: "ticket-1",
        ticket_line_id: "ticket-line-1",
        canonical_product_id: "canonical-platanos",
        section_id: "mercadona",
        observed_at: "2026-07-25T20:15:00.000Z",
        product_name: "Plátanos",
        quantity: "1 kg",
        comparison_unit: "kg",
        price_kind: "unit",
        observed_price: 1.95,
        unit_price: 1.95,
        total_price: 1.95,
        original_total_price: 2.1,
        discount_total: 0.15,
        created_at: "2026-07-25T20:20:00.000Z",
        updated_at: "2026-07-25T20:20:05.000Z",
      }),
    ).toEqual({
      id: "price-observation-1",
      source: "ticket",
      ticketId: "ticket-1",
      ticketLineId: "ticket-line-1",
      canonicalProductId: "canonical-platanos",
      sectionId: "mercadona",
      observedAt: Date.parse("2026-07-25T20:15:00.000Z"),
      productName: "Plátanos",
      quantity: "1 kg",
      comparisonUnit: "kg",
      priceKind: "unit",
      observedPrice: 1.95,
      unitPrice: 1.95,
      totalPrice: 1.95,
      originalTotalPrice: 2.1,
      discountTotal: 0.15,
      createdAt: Date.parse("2026-07-25T20:20:00.000Z"),
      updatedAt: Date.parse("2026-07-25T20:20:05.000Z"),
    });
  });

  it("maps shopping sections to Supabase rows", () => {
    expect(
      mapShoppingSectionToRow(
        {
          id: "fruteria",
          name: "Frutería",
          color: "amber",
        },
        2,
        "00000000-0000-4000-8000-000000000001",
      ),
    ).toMatchObject({
      id: "fruteria",
      list_id: "00000000-0000-4000-8000-000000000001",
      name: "Frutería",
      color: "amber",
      position: 2,
    });
  });

  it("maps Supabase history event rows", () => {
    expect(
      mapRowToShoppingHistoryEvent({
        id: "history-1",
        list_id: "00000000-0000-4000-8000-000000000001",
        item_id: "item-1",
        event_type: "deleted",
        actor: "begona",
        client_id: "client-2",
        item_snapshot: {
          id: "item-1",
          name: "Leche",
          sectionId: "mercadona",
          sectionName: "Mercadona",
          categoryId: "dairy",
          addedBy: "rafa",
          purchased: true,
          createdAt: 100,
          updatedAt: 200,
        },
        previous_item_snapshot: {
          id: "item-1",
          name: "Leche",
          sectionId: "alcampo",
          sectionName: "Alcampo",
          categoryId: "dairy",
          addedBy: "rafa",
          purchased: true,
          createdAt: 100,
          updatedAt: 150,
        },
        created_at: "2026-07-15T10:00:00.000Z",
      }),
    ).toEqual({
      id: "history-1",
      itemId: "item-1",
      type: "deleted",
      actor: "begona",
      clientId: "client-2",
      item: {
        id: "item-1",
        name: "Leche",
        sectionId: "mercadona",
        sectionName: "Mercadona",
        categoryId: "dairy",
        addedBy: "rafa",
        purchased: true,
        createdAt: 100,
        updatedAt: 200,
      },
      previousItem: {
        id: "item-1",
        name: "Leche",
        sectionId: "alcampo",
        sectionName: "Alcampo",
        categoryId: "dairy",
        addedBy: "rafa",
        purchased: true,
        createdAt: 100,
        updatedAt: 150,
      },
      createdAt: Date.parse("2026-07-15T10:00:00.000Z"),
    });
  });

  it("maps shopping history events to Supabase rows", () => {
    expect(
      mapShoppingHistoryEventToRow(
        {
          id: "history-1",
          itemId: "item-1",
          type: "purchased",
          actor: "rafa",
          clientId: "client-1",
          item: {
            id: "item-1",
            name: "Pan",
            quantity: "2",
            sectionId: "alcampo",
            sectionName: "Alcampo",
            categoryId: "bakery",
            addedBy: "begona",
            purchased: true,
            createdAt: 100,
            updatedAt: 200,
          },
          previousItem: {
            id: "item-1",
            name: "Pan",
            sectionId: "mercadona",
            sectionName: "Mercadona",
            categoryId: "bakery",
            addedBy: "begona",
            purchased: true,
            createdAt: 100,
            updatedAt: 150,
          },
          createdAt: Date.parse("2026-07-15T10:00:00.000Z"),
        },
        "00000000-0000-4000-8000-000000000001",
      ),
    ).toEqual({
      id: "history-1",
      list_id: "00000000-0000-4000-8000-000000000001",
      item_id: "item-1",
      event_type: "purchased",
      actor: "rafa",
      client_id: "client-1",
      item_snapshot: {
        id: "item-1",
        name: "Pan",
        quantity: "2",
        sectionId: "alcampo",
        sectionName: "Alcampo",
        categoryId: "bakery",
        addedBy: "begona",
        purchased: true,
        createdAt: 100,
        updatedAt: 200,
      },
      previous_item_snapshot: {
        id: "item-1",
        name: "Pan",
        sectionId: "mercadona",
        sectionName: "Mercadona",
        categoryId: "bakery",
        addedBy: "begona",
        purchased: true,
        createdAt: 100,
        updatedAt: 150,
      },
      created_at: "2026-07-15T10:00:00.000Z",
    });
  });

  it("maps Supabase developer backup run rows", () => {
    expect(
      mapRowToDeveloperBackupRun({
        id: "00000000-0000-4000-8000-000000000001",
        started_at: "2026-07-15T10:00:00.000Z",
        finished_at: "2026-07-15T10:00:08.000Z",
        status: "success",
        file_name: "jucart-supabase-20260715T100000Z.sql.tar.gz",
        file_size_bytes: 2048,
        sha256:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        duration_ms: 8000,
        retained_count: 12,
        error_message: null,
        created_at: "2026-07-15T10:00:09.000Z",
      }),
    ).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      startedAt: Date.parse("2026-07-15T10:00:00.000Z"),
      finishedAt: Date.parse("2026-07-15T10:00:08.000Z"),
      status: "success",
      fileName: "jucart-supabase-20260715T100000Z.sql.tar.gz",
      fileSizeBytes: 2048,
      sha256:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      durationMs: 8000,
      retainedCount: 12,
      errorMessage: null,
      createdAt: Date.parse("2026-07-15T10:00:09.000Z"),
    });
  });

  it("does not subscribe to Supabase while running tests", () => {
    expect(subscribeToSupabaseShoppingItems(() => undefined)()).toBeUndefined();
  });
});
