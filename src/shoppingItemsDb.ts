import Dexie, { Table } from "dexie";

import {
  isShoppingUserId,
  isShoppingSectionId,
  ShoppingItem,
  ShoppingSectionId,
  ShoppingUserId,
} from "./shoppingItems";
import {
  getSupabaseShoppingItems,
  isSupabaseConfigured,
  replaceSupabaseShoppingItems,
} from "./shoppingItemsSupabase";

type StoredShoppingItem = Omit<ShoppingItem, "sectionId" | "addedBy"> & {
  sectionId?: ShoppingSectionId;
  addedBy?: ShoppingUserId;
};
export type ShoppingItemsStorageMode = "local" | "remote" | "fallback";

let lastStorageMode: ShoppingItemsStorageMode = "local";

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

export function getShoppingItemsStorageMode() {
  return lastStorageMode;
}

export async function getStoredShoppingItems() {
  if (isSupabaseConfigured()) {
    try {
      const remoteItems = await getSupabaseShoppingItems();

      if (remoteItems) {
        await replaceLocalShoppingItems(remoteItems);
        lastStorageMode = "remote";

        return remoteItems;
      }
    } catch {
      lastStorageMode = "fallback";
      return getLocalShoppingItems();
    }
  }

  lastStorageMode = "local";
  return getLocalShoppingItems();
}

export async function replaceStoredShoppingItems(items: ShoppingItem[]) {
  if (isSupabaseConfigured()) {
    try {
      await replaceSupabaseShoppingItems(items);
      lastStorageMode = "remote";
    } catch {
      await replaceLocalShoppingItems(items);
      lastStorageMode = "fallback";
      return;
    }
  }

  await replaceLocalShoppingItems(items);

  if (!isSupabaseConfigured()) {
    lastStorageMode = "local";
  }
}

export async function resetShoppingItemsDatabase() {
  await db.shoppingItems.clear();
}

async function getLocalShoppingItems() {
  const items = await db.shoppingItems.orderBy("createdAt").toArray();

  return items.map(normalizeStoredShoppingItem);
}

async function replaceLocalShoppingItems(items: ShoppingItem[]) {
  await db.transaction("rw", db.shoppingItems, async () => {
    await db.shoppingItems.clear();
    await db.shoppingItems.bulkAdd(items);
  });
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
