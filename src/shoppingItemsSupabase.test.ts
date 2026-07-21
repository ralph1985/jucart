import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => {
  type QueryOperation = "delete" | "maybeSingle" | "select" | "upsert";
  type QueryResult = { data?: unknown; error?: unknown };

  const queryResults = new Map<string, QueryResult>();
  const operations: Array<{
    args?: unknown[];
    operation: string;
    table: string;
  }> = [];

  class QueryBuilder {
    private operation: QueryOperation = "select";

    constructor(private readonly table: string) {}

    select(...args: unknown[]) {
      this.operation = "select";
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

  const client = {
    channel: vi.fn(() => channel),
    from: vi.fn((table: string) => new QueryBuilder(table)),
    removeChannel: vi.fn(),
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
      channel.on.mockClear();
      channel.on.mockReturnValue(channel);
      channel.subscribe.mockClear();
      channel.subscribe.mockReturnValue(channel);
    },
    setResult(table: string, operation: QueryOperation, result: QueryResult) {
      queryResults.set(`${table}:${operation}`, result);
    },
  };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

import {
  getLatestDeveloperBackupRun,
  getSupabaseShoppingData,
  mapFreezerItemToRow,
  mapRowToFreezerItem,
  mapRowToDeveloperBackupRun,
  mapRowToShoppingCategory,
  mapRowToShoppingHistoryEvent,
  mapRowToShoppingItem,
  mapRowToShoppingProductCatalogEntry,
  mapRowToShoppingRecategorizationChange,
  mapRowToShoppingRecategorizationRun,
  mapRowToShoppingSection,
  mapShoppingHistoryEventToRow,
  mapShoppingItemToRow,
  mapShoppingSectionToRow,
  replaceSupabaseShoppingData,
  subscribeToSupabaseShoppingItems,
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

    const data = await getSupabaseShoppingData();

    expect(data).toMatchObject({
      categories: [{ id: "dairy", name: "Lácteos", position: 1 }],
      freezerItems: [{ drawerId: "middle", name: "Caldo" }],
      historyEvents: [{ id: "history-1", type: "initial" }],
      items: [{ categoryId: "dairy", name: "Leche", quantity: "2" }],
      productCatalogEntries: [{ id: "dairy-leche", categoryId: "dairy" }],
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

    const data = await getSupabaseShoppingData();

    expect(data).not.toBeNull();
    expect(data?.categories ?? []).not.toHaveLength(0);
    expect(data?.productCatalogEntries ?? []).not.toHaveLength(0);
    expect(data?.recategorizationChanges).toEqual([]);
    expect(data?.recategorizationRuns).toEqual([]);
    expect(data?.sections.length).toBeGreaterThan(0);
  });

  it("throws non-missing Supabase read errors", async () => {
    vi.spyOn(supabaseConfig, "getSupabaseConfig").mockReturnValue(
      configuredSupabase,
    );
    const error = new Error("permission denied");

    supabaseMocks.setResult("shopping_items", "select", {
      error,
    });

    await expect(getSupabaseShoppingData()).rejects.toThrow(
      "permission denied",
    );
  });

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
    expect(supabaseMocks.channel.on).toHaveBeenCalledTimes(8);
    expect(supabaseMocks.channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        filter: `list_id=eq.${configuredSupabase.listId}`,
        table: "shopping_items",
      }),
      onChange,
    );
    expect(supabaseMocks.channel.subscribe).toHaveBeenCalledOnce();
    expect(supabaseMocks.client.removeChannel).toHaveBeenCalledWith(
      supabaseMocks.channel,
    );
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
