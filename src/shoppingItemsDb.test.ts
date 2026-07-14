import { afterEach, describe, expect, it } from "vitest";

import {
  getShoppingItemsStorageMode,
  getStoredShoppingData,
  getStoredShoppingItems,
  replaceStoredShoppingData,
  replaceStoredShoppingItems,
  resetShoppingItemsDatabase,
} from "./shoppingItemsDb";

afterEach(async () => {
  await resetShoppingItemsDatabase();
});

describe("shopping items database", () => {
  it("stores and reads products ordered by creation date", async () => {
    await replaceStoredShoppingItems([
      {
        id: "item-2",
        name: "Pan",
        sectionId: "alcampo",
        addedBy: "begona",
        purchased: true,
        createdAt: 200,
        updatedAt: 210,
      },
      {
        id: "item-1",
        name: "Leche",
        sectionId: "mercadona",
        categoryId: "dairy",
        addedBy: "rafa",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);

    await expect(getStoredShoppingItems()).resolves.toEqual([
      {
        id: "item-1",
        name: "Leche",
        sectionId: "mercadona",
        categoryId: "dairy",
        addedBy: "rafa",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: "item-2",
        name: "Pan",
        sectionId: "alcampo",
        categoryId: "bakery",
        addedBy: "begona",
        purchased: true,
        createdAt: 200,
        updatedAt: 210,
      },
    ]);
  });

  it("replaces the stored list", async () => {
    await replaceStoredShoppingItems([
      {
        id: "item-1",
        name: "Leche",
        sectionId: "mercadona",
        addedBy: "rafa",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);

    await replaceStoredShoppingItems([]);

    await expect(getStoredShoppingItems()).resolves.toEqual([]);
  });

  it("reports local storage mode when Supabase is disabled in tests", async () => {
    await replaceStoredShoppingItems([]);

    expect(getShoppingItemsStorageMode()).toBe("local");
  });

  it("stores and reads custom shopping sections", async () => {
    await replaceStoredShoppingData({
      items: [],
      sections: [
        { id: "mercadona", name: "Mercadona", color: "mint" },
        { id: "fruteria", name: "Frutería", color: "amber" },
      ],
    });

    await expect(getStoredShoppingData()).resolves.toEqual({
      items: [],
      sections: [
        { id: "mercadona", name: "Mercadona", color: "mint" },
        { id: "fruteria", name: "Frutería", color: "amber" },
      ],
    });
  });
});
