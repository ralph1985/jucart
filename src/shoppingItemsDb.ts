import Dexie, { Table } from "dexie";

import {
  defaultShoppingSections,
  isShoppingSectionColor,
  isShoppingUserId,
  ShoppingItem,
  ShoppingSection,
  ShoppingSectionId,
  ShoppingUserId,
} from "./shoppingItems";
import {
  getSupabaseShoppingData,
  isSupabaseConfigured,
  replaceSupabaseShoppingData,
} from "./shoppingItemsSupabase";

type StoredShoppingItem = Omit<ShoppingItem, "sectionId" | "addedBy"> & {
  sectionId?: ShoppingSectionId;
  addedBy?: ShoppingUserId;
};
type StoredShoppingSection = Omit<ShoppingSection, "color"> & {
  color?: string;
  position: number;
};
export type ShoppingItemsStorageMode = "local" | "remote" | "fallback";
export type ShoppingData = {
  items: ShoppingItem[];
  sections: ShoppingSection[];
};

let lastStorageMode: ShoppingItemsStorageMode = "local";

class JucartDatabase extends Dexie {
  shoppingItems!: Table<StoredShoppingItem, string>;
  shoppingSections!: Table<StoredShoppingSection, string>;

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

    this.version(4).stores({
      shoppingItems: "id, sectionId, addedBy, createdAt, updatedAt, purchased",
      shoppingSections: "id, position",
    });

    this.version(5).stores({
      shoppingItems: "id, sectionId, addedBy, createdAt, updatedAt, purchased",
      shoppingSections: "id, position",
    });
  }
}

export const db = new JucartDatabase();

export function getShoppingItemsStorageMode() {
  return lastStorageMode;
}

export async function getStoredShoppingData(): Promise<ShoppingData> {
  if (isSupabaseConfigured()) {
    try {
      const remoteData = await getSupabaseShoppingData();

      if (remoteData) {
        await replaceLocalShoppingData(remoteData);
        lastStorageMode = "remote";

        return remoteData;
      }
    } catch {
      lastStorageMode = "fallback";
      return getLocalShoppingData();
    }
  }

  lastStorageMode = "local";
  return getLocalShoppingData();
}

export async function getStoredShoppingItems() {
  return (await getStoredShoppingData()).items;
}

export async function replaceStoredShoppingData(data: ShoppingData) {
  if (isSupabaseConfigured()) {
    try {
      await replaceSupabaseShoppingData(data);
      lastStorageMode = "remote";
    } catch {
      await replaceLocalShoppingData(data);
      lastStorageMode = "fallback";
      return;
    }
  }

  await replaceLocalShoppingData(data);

  if (!isSupabaseConfigured()) {
    lastStorageMode = "local";
  }
}

export async function replaceStoredShoppingItems(items: ShoppingItem[]) {
  await replaceStoredShoppingData({
    items,
    sections: defaultShoppingSections,
  });
}

export async function resetShoppingItemsDatabase() {
  await db.transaction(
    "rw",
    db.shoppingItems,
    db.shoppingSections,
    async () => {
      await db.shoppingItems.clear();
      await db.shoppingSections.clear();
    },
  );
}

async function getLocalShoppingItems() {
  const items = await db.shoppingItems.orderBy("createdAt").toArray();

  return items.map(normalizeStoredShoppingItem);
}

async function getLocalShoppingData() {
  const [items, sections] = await Promise.all([
    getLocalShoppingItems(),
    getLocalShoppingSections(),
  ]);

  return { items, sections };
}

async function getLocalShoppingSections() {
  const sections = await db.shoppingSections.orderBy("position").toArray();

  return sections.length > 0
    ? sections.map(normalizeStoredSection)
    : defaultShoppingSections;
}

async function replaceLocalShoppingData(data: ShoppingData) {
  await db.transaction(
    "rw",
    db.shoppingItems,
    db.shoppingSections,
    async () => {
      await db.shoppingItems.clear();
      await db.shoppingSections.clear();
      await db.shoppingItems.bulkAdd(data.items);
      await db.shoppingSections.bulkAdd(
        data.sections.map((section, position) => ({ ...section, position })),
      );
    },
  );
}

function normalizeStoredSection(
  section: StoredShoppingSection,
): ShoppingSection {
  return {
    id: section.id,
    name: section.name,
    color:
      section.color && isShoppingSectionColor(section.color)
        ? section.color
        : "mint",
  };
}

function normalizeStoredShoppingItem(item: StoredShoppingItem): ShoppingItem {
  return {
    ...item,
    sectionId: item.sectionId?.trim() ? item.sectionId : "general",
    addedBy:
      item.addedBy && isShoppingUserId(item.addedBy) ? item.addedBy : "rafa",
  };
}
