import { afterEach, describe, expect, it } from "vitest";

import {
  getStoredShoppingItems,
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
        purchased: true,
        createdAt: 200,
        updatedAt: 210,
      },
      {
        id: "item-1",
        name: "Leche",
        sectionId: "mercadona",
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
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: "item-2",
        name: "Pan",
        sectionId: "alcampo",
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
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);

    await replaceStoredShoppingItems([]);

    await expect(getStoredShoppingItems()).resolves.toEqual([]);
  });
});
