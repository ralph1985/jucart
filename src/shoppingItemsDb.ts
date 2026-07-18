import Dexie, { Table } from "dexie";

import {
  FreezerItem,
  FreezerDrawerId,
  isFreezerDrawerId,
} from "./freezerItems";
import {
  defaultShoppingSections,
  inferShoppingCategoryId,
  isShoppingCategoryId,
  isShoppingSectionColor,
  isShoppingUserId,
  ShoppingHistoryEvent,
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
  categoryId?: string;
};
type StoredShoppingSection = Omit<ShoppingSection, "color"> & {
  color?: string;
  position: number;
};
type StoredShoppingHistoryEvent = ShoppingHistoryEvent;
type StoredFreezerItem = Omit<FreezerItem, "drawerId"> & {
  drawerId?: FreezerDrawerId;
};
export type ShoppingItemsStorageMode = "local" | "remote" | "fallback";
export type ShoppingData = {
  items: ShoppingItem[];
  sections: ShoppingSection[];
  historyEvents: ShoppingHistoryEvent[];
  freezerItems: FreezerItem[];
};

let lastStorageMode: ShoppingItemsStorageMode = "local";

class JucartDatabase extends Dexie {
  shoppingItems!: Table<StoredShoppingItem, string>;
  shoppingSections!: Table<StoredShoppingSection, string>;
  shoppingHistoryEvents!: Table<StoredShoppingHistoryEvent, string>;
  freezerItems!: Table<StoredFreezerItem, string>;

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

    this.version(6).stores({
      shoppingItems:
        "id, sectionId, categoryId, addedBy, createdAt, updatedAt, purchased",
      shoppingSections: "id, position",
    });

    this.version(7).stores({
      shoppingItems:
        "id, sectionId, categoryId, addedBy, createdAt, updatedAt, purchased",
      shoppingSections: "id, position",
      shoppingHistoryEvents: "id, itemId, type, actor, clientId, createdAt",
    });

    this.version(8).stores({
      shoppingItems:
        "id, sectionId, categoryId, addedBy, createdAt, updatedAt, purchased",
      shoppingSections: "id, position",
      shoppingHistoryEvents: "id, itemId, type, actor, clientId, createdAt",
    });

    this.version(9).stores({
      shoppingItems:
        "id, sectionId, categoryId, addedBy, createdAt, updatedAt, purchased",
      shoppingSections: "id, position",
      shoppingHistoryEvents: "id, itemId, type, actor, clientId, createdAt",
      freezerItems: "id, drawerId, frozenAt, createdAt, updatedAt",
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
    historyEvents: [],
    freezerItems: [],
  });
}

export async function resetShoppingItemsDatabase() {
  await db.transaction(
    "rw",
    db.shoppingItems,
    db.shoppingSections,
    db.shoppingHistoryEvents,
    db.freezerItems,
    async () => {
      await db.shoppingItems.clear();
      await db.shoppingSections.clear();
      await db.shoppingHistoryEvents.clear();
      await db.freezerItems.clear();
    },
  );
}

async function getLocalShoppingItems() {
  const items = await db.shoppingItems.orderBy("createdAt").toArray();

  return items.map(normalizeStoredShoppingItem);
}

async function getLocalShoppingData() {
  const [items, sections, historyEvents, freezerItems] = await Promise.all([
    getLocalShoppingItems(),
    getLocalShoppingSections(),
    getLocalShoppingHistoryEvents(),
    getLocalFreezerItems(),
  ]);

  return { items, sections, historyEvents, freezerItems };
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
    db.shoppingHistoryEvents,
    db.freezerItems,
    async () => {
      await db.shoppingItems.clear();
      await db.shoppingSections.clear();
      await db.shoppingHistoryEvents.clear();
      await db.freezerItems.clear();
      await db.shoppingItems.bulkAdd(data.items);
      await db.shoppingSections.bulkAdd(
        data.sections.map((section, position) => ({ ...section, position })),
      );
      await db.shoppingHistoryEvents.bulkAdd(data.historyEvents);
      await db.freezerItems.bulkAdd(data.freezerItems);
    },
  );
}

async function getLocalShoppingHistoryEvents() {
  return db.shoppingHistoryEvents.orderBy("createdAt").toArray();
}

async function getLocalFreezerItems() {
  const items = await db.freezerItems.orderBy("frozenAt").toArray();

  return items.map(normalizeStoredFreezerItem);
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
    quantity: item.quantity?.trim() ? item.quantity : undefined,
    sectionId: item.sectionId?.trim() ? item.sectionId : "general",
    categoryId:
      item.categoryId && isShoppingCategoryId(item.categoryId)
        ? item.categoryId
        : inferShoppingCategoryId(item.name),
    addedBy:
      item.addedBy && isShoppingUserId(item.addedBy) ? item.addedBy : "rafa",
  };
}

function normalizeStoredFreezerItem(item: StoredFreezerItem): FreezerItem {
  const createdAt = item.createdAt || item.frozenAt || Date.now();
  const updatedAt = item.updatedAt || createdAt;

  return {
    ...item,
    quantity: item.quantity?.trim() ? item.quantity : undefined,
    drawerId:
      item.drawerId && isFreezerDrawerId(item.drawerId) ? item.drawerId : "top",
    frozenAt: item.frozenAt || createdAt,
    createdAt,
    updatedAt,
  };
}
