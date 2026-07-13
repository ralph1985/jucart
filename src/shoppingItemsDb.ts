import Dexie, { Table } from "dexie";

import { ShoppingItem } from "./shoppingItems";

class JucartDatabase extends Dexie {
  shoppingItems!: Table<ShoppingItem, string>;

  constructor() {
    super("jucart");

    this.version(1).stores({
      shoppingItems: "id, createdAt, updatedAt, purchased",
    });
  }
}

export const db = new JucartDatabase();

export async function getStoredShoppingItems() {
  return db.shoppingItems.orderBy("createdAt").toArray();
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
