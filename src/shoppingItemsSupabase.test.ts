import { describe, expect, it } from "vitest";

import {
  mapRowToShoppingItem,
  mapRowToShoppingSection,
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
        added_by: "begona",
        purchased: true,
        created_at: "2026-07-14T10:00:00.000Z",
        updated_at: "2026-07-14T10:05:00.000Z",
      }),
    ).toEqual({
      id: "item-1",
      name: "Leche",
      sectionId: "mercadona",
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
      }),
    ).toEqual({
      id: "fruteria",
      name: "Frutería",
    });
  });

  it("maps shopping sections to Supabase rows", () => {
    expect(
      mapShoppingSectionToRow(
        {
          id: "fruteria",
          name: "Frutería",
        },
        2,
        "00000000-0000-4000-8000-000000000001",
      ),
    ).toMatchObject({
      id: "fruteria",
      list_id: "00000000-0000-4000-8000-000000000001",
      name: "Frutería",
      position: 2,
    });
  });

  it("does not subscribe to Supabase while running tests", () => {
    expect(subscribeToSupabaseShoppingItems(() => undefined)()).toBeUndefined();
  });
});
