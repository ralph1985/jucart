import { describe, expect, it } from "vitest";

import {
  mapRowToShoppingHistoryEvent,
  mapRowToShoppingItem,
  mapRowToShoppingSection,
  mapShoppingHistoryEventToRow,
  mapShoppingItemToRow,
  mapShoppingSectionToRow,
  subscribeToSupabaseShoppingItems,
} from "./shoppingItemsSupabase";

describe("shopping items Supabase adapter", () => {
  it("maps a Supabase row to a shopping item", () => {
    expect(
      mapRowToShoppingItem({
        id: "item-1",
        list_id: "00000000-0000-4000-8000-000000000001",
        name: "Leche",
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

  it("does not subscribe to Supabase while running tests", () => {
    expect(subscribeToSupabaseShoppingItems(() => undefined)()).toBeUndefined();
  });
});
