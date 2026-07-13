import Dexie, { Table } from "dexie";

import {
  isShoppingUserId,
  isShoppingSectionId,
  ShoppingItem,
  ShoppingSectionId,
  ShoppingUserId,
} from "./shoppingItems";

type StoredShoppingItem = Omit<ShoppingItem, "sectionId" | "addedBy"> & {
  sectionId?: ShoppingSectionId;
  addedBy?: ShoppingUserId;
};

class JucartDatabase extends Dexie {
  shoppingItems!: Table<StoredShoppingItem, string>;

  constructor() {
    super("jucart");

    this.version(1).stores({
      shoppingItems: "id, createdAt, updatedAt, purchased",
    });

    this.version(2).stores({
      shoppingItems: "id, sectionId, createdAt, updatedAt, purchased",
    });

    this.version(3).stores({
      shoppingItems: "id, sectionId, addedBy, createdAt, updatedAt, purchased",
    });
  }
}

export const db = new JucartDatabase();

export async function getStoredShoppingItems() {
  const items = await db.shoppingItems.orderBy("createdAt").toArray();

  return items.map(normalizeStoredShoppingItem);
}

export async function replaceStoredShoppingItems(items: ShoppingItem[]) {
  await db.transaction("rw", db.shoppingItems, async () => {
    await db.shoppingItems.clear();
    await db.shoppingItems.bulkAdd(items);
  });
}

export async function resetShoppingItemsDatabase() {
  await db.shoppingItems.clear();
}

function normalizeStoredShoppingItem(item: StoredShoppingItem): ShoppingItem {
  return {
    ...item,
    sectionId:
      item.sectionId && isShoppingSectionId(item.sectionId)
        ? item.sectionId
        : "general",
    addedBy:
      item.addedBy && isShoppingUserId(item.addedBy) ? item.addedBy : "rafa",
  };
}
