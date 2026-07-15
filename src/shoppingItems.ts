export type ShoppingSectionId = string;

export const shoppingSectionColors = [
  "mint",
  "blue",
  "violet",
  "amber",
  "rose",
  "slate",
] as const;

export type ShoppingSectionColor = (typeof shoppingSectionColors)[number];

export type ShoppingSection = {
  id: ShoppingSectionId;
  name: string;
  color: ShoppingSectionColor;
};

export const defaultShoppingSections: ShoppingSection[] = [
  { id: "alcampo", name: "Alcampo", color: "blue" },
  { id: "dia", name: "Día", color: "rose" },
  { id: "mercadona", name: "Mercadona", color: "mint" },
  { id: "farmacia", name: "Farmacia", color: "violet" },
  { id: "general", name: "General", color: "slate" },
];

export const shoppingUsers = [
  { id: "rafa", name: "Rafa" },
  { id: "begona", name: "Begoña" },
] as const;

export type ShoppingUserId = (typeof shoppingUsers)[number]["id"];

export const shoppingCategories = [
  { id: "fruit", name: "Fruta" },
  { id: "vegetables", name: "Verdura" },
  { id: "meat", name: "Carne" },
  { id: "fish", name: "Pescado" },
  { id: "dairy", name: "Lácteos" },
  { id: "bakery", name: "Panadería" },
  { id: "pantry", name: "Despensa" },
  { id: "drinks", name: "Bebidas" },
  { id: "frozen", name: "Congelados" },
  { id: "cleaning", name: "Limpieza" },
  { id: "hygiene", name: "Higiene" },
  { id: "pharmacy", name: "Farmacia" },
  { id: "pets", name: "Mascotas" },
  { id: "other", name: "Otros" },
] as const;

export type ShoppingCategoryId = (typeof shoppingCategories)[number]["id"];

const shoppingProductCatalog: Record<ShoppingCategoryId, string[]> = {
  fruit: [
    "aguacate",
    "fresa",
    "fruta",
    "kiwi",
    "limón",
    "mandarina",
    "manzana",
    "melocotón",
    "naranja",
    "pera",
    "plátano",
    "sandía",
    "uvas",
  ],
  vegetables: [
    "ajo",
    "berenjena",
    "calabacín",
    "cebolla",
    "lechuga",
    "patata",
    "pepino",
    "pimiento",
    "repollo",
    "tomate",
    "verdura",
    "zanahoria",
  ],
  meat: ["carne", "cerdo", "chorizo", "jamón", "lomo", "pollo", "ternera"],
  fish: ["atún", "bacalao", "gambas", "merluza", "pescado", "salmón"],
  dairy: ["huevos", "leche", "mantequilla", "queso", "yogur"],
  bakery: ["barra", "bollos", "croissant", "pan", "pan integral"],
  pantry: [
    "aceite",
    "arroz",
    "azúcar",
    "café",
    "cereales",
    "galletas",
    "garbanzos",
    "harina",
    "lentejas",
    "pasta",
    "sal",
    "tomate frito",
  ],
  drinks: ["agua", "cerveza", "refresco", "vino", "zumo"],
  frozen: ["congelado", "croquetas", "helado", "pizza"],
  cleaning: [
    "detergente",
    "fregasuelos",
    "lavavajillas",
    "lejía",
    "limpiador biberones",
    "limpieza",
  ],
  hygiene: [
    "cabezales oral b",
    "champú",
    "gel",
    "higiene",
    "pañales",
    "papel higiénico",
    "parodontax",
    "pasta de dientes",
  ],
  pharmacy: [
    "guantes",
    "ibuprofeno",
    "lavado nasal",
    "medicina",
    "paracetamol",
    "tiritas",
  ],
  pets: ["arena", "comida gato", "comida perro", "mascota", "pienso"],
  other: [],
};

export type ShoppingItem = {
  id: string;
  name: string;
  sectionId: ShoppingSectionId;
  categoryId?: ShoppingCategoryId;
  addedBy: ShoppingUserId;
  purchased: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ShoppingHistoryEventType =
  "initial" | "purchased" | "unpurchased" | "deleted";

export type ShoppingHistoryItemSnapshot = Pick<
  ShoppingItem,
  | "id"
  | "name"
  | "sectionId"
  | "categoryId"
  | "addedBy"
  | "purchased"
  | "createdAt"
  | "updatedAt"
> & {
  sectionName: string;
};

export type ShoppingHistoryEvent = {
  id: string;
  itemId: string;
  type: ShoppingHistoryEventType;
  actor: ShoppingUserId;
  clientId: string;
  item: ShoppingHistoryItemSnapshot;
  createdAt: number;
};

export function normalizeItemName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isShoppingSectionId(
  value: string,
  sections: ShoppingSection[] = defaultShoppingSections,
): value is ShoppingSectionId {
  return sections.some((section) => section.id === value);
}

export function isShoppingUserId(value: string): value is ShoppingUserId {
  return shoppingUsers.some((user) => user.id === value);
}

export function isShoppingCategoryId(
  value: string,
): value is ShoppingCategoryId {
  return shoppingCategories.some((category) => category.id === value);
}

export function isShoppingHistoryEventType(
  value: string,
): value is ShoppingHistoryEventType {
  return (
    value === "initial" ||
    value === "purchased" ||
    value === "unpurchased" ||
    value === "deleted"
  );
}

export function isShoppingSectionColor(
  value: string,
): value is ShoppingSectionColor {
  return shoppingSectionColors.some((color) => color === value);
}

export function getShoppingUserName(userId: ShoppingUserId) {
  return shoppingUsers.find((user) => user.id === userId)?.name ?? "Rafa";
}

export function getShoppingCategoryName(categoryId: ShoppingCategoryId) {
  return (
    shoppingCategories.find((category) => category.id === categoryId)?.name ??
    "Otros"
  );
}

export function getShoppingItemCategoryId(
  item: Pick<ShoppingItem, "name" | "categoryId">,
) {
  return item.categoryId && isShoppingCategoryId(item.categoryId)
    ? item.categoryId
    : inferShoppingCategoryId(item.name);
}

export function inferShoppingCategoryId(rawName: string): ShoppingCategoryId {
  const normalizedName = normalizeCatalogText(rawName);

  for (const category of shoppingCategories) {
    if (
      shoppingProductCatalog[category.id].some((catalogName) => {
        const normalizedCatalogName = normalizeCatalogText(catalogName);

        return catalogNameMatches(normalizedName, normalizedCatalogName);
      })
    ) {
      return category.id;
    }
  }

  return "other";
}

export function hasItemWithName(
  items: ShoppingItem[],
  name: string,
  sectionId: ShoppingSectionId,
) {
  const normalizedName = normalizeItemName(name).toLocaleLowerCase("es-ES");

  return items.some(
    (item) =>
      item.sectionId === sectionId &&
      item.name.toLocaleLowerCase("es-ES") === normalizedName,
  );
}

export function createShoppingItemId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createShoppingSectionId() {
  return `section-${createShoppingItemId()}`;
}

export function createShoppingHistoryEventId() {
  return `history-${createShoppingItemId()}`;
}

export function addShoppingSection(
  sections: ShoppingSection[],
  rawName: string,
  createId: () => string = createShoppingSectionId,
) {
  const name = normalizeItemName(rawName);

  if (!name || hasSectionWithName(sections, name)) {
    return sections;
  }

  return [...sections, { id: createId(), name, color: "mint" as const }];
}

export function renameShoppingSection(
  sections: ShoppingSection[],
  sectionId: ShoppingSectionId,
  rawName: string,
) {
  const name = normalizeItemName(rawName);

  if (!name) {
    return sections;
  }

  const sectionToUpdate = sections.find((section) => section.id === sectionId);

  if (!sectionToUpdate || sectionToUpdate.name === name) {
    return sections;
  }

  if (
    sections.some(
      (section) =>
        section.id !== sectionId &&
        section.name.toLocaleLowerCase("es-ES") ===
          name.toLocaleLowerCase("es-ES"),
    )
  ) {
    return sections;
  }

  return sections.map((section) =>
    section.id === sectionId ? { ...section, name } : section,
  );
}

export function moveShoppingSection(
  sections: ShoppingSection[],
  sectionId: ShoppingSectionId,
  direction: -1 | 1,
) {
  const currentIndex = sections.findIndex(
    (section) => section.id === sectionId,
  );
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sections.length) {
    return sections;
  }

  const nextSections = [...sections];
  const [section] = nextSections.splice(currentIndex, 1);
  nextSections.splice(nextIndex, 0, section);

  return nextSections;
}

export function updateShoppingSectionColor(
  sections: ShoppingSection[],
  sectionId: ShoppingSectionId,
  color: ShoppingSectionColor,
) {
  const sectionToUpdate = sections.find((section) => section.id === sectionId);

  if (!sectionToUpdate || sectionToUpdate.color === color) {
    return sections;
  }

  return sections.map((section) =>
    section.id === sectionId ? { ...section, color } : section,
  );
}

export function removeShoppingSection(
  sections: ShoppingSection[],
  items: ShoppingItem[],
  sectionId: ShoppingSectionId,
) {
  if (
    sections.length <= 1 ||
    !sections.some((section) => section.id === sectionId) ||
    items.some((item) => item.sectionId === sectionId)
  ) {
    return sections;
  }

  return sections.filter((section) => section.id !== sectionId);
}

function hasSectionWithName(sections: ShoppingSection[], rawName: string) {
  const name = normalizeItemName(rawName).toLocaleLowerCase("es-ES");

  return sections.some(
    (section) => section.name.toLocaleLowerCase("es-ES") === name,
  );
}

export function addShoppingItem(
  items: ShoppingItem[],
  rawName: string,
  sectionId: ShoppingSectionId,
  addedBy: ShoppingUserId,
  createId: () => string = createShoppingItemId,
  now: () => number = () => Date.now(),
) {
  const name = normalizeItemName(rawName);

  if (!name || hasItemWithName(items, name, sectionId)) {
    return items;
  }

  const createdAt = now();

  return [
    ...items,
    {
      id: createId(),
      name,
      sectionId,
      categoryId: inferShoppingCategoryId(name),
      addedBy,
      purchased: false,
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export function createShoppingHistoryEvent(
  item: ShoppingItem,
  type: ShoppingHistoryEventType,
  actor: ShoppingUserId,
  clientId: string,
  sectionName: string = item.sectionId,
  createId: () => string = createShoppingHistoryEventId,
  now: () => number = () => Date.now(),
): ShoppingHistoryEvent {
  return {
    id: createId(),
    itemId: item.id,
    type,
    actor,
    clientId,
    item: createShoppingHistoryItemSnapshot(item, sectionName),
    createdAt: now(),
  };
}

export function createInitialShoppingHistoryEvents(
  items: ShoppingItem[],
  clientId: string,
  sections: ShoppingSection[] = defaultShoppingSections,
  createId: () => string = createShoppingHistoryEventId,
  now: () => number = () => Date.now(),
) {
  const createdAt = now();

  return items.map((item, index) => ({
    id: createId(),
    itemId: item.id,
    type: "initial" as const,
    actor: item.addedBy,
    clientId,
    item: createShoppingHistoryItemSnapshot(
      item,
      getShoppingSectionName(item.sectionId, sections),
    ),
    createdAt: createdAt + index,
  }));
}

export function getRecentShoppingHistoryEvents(
  events: ShoppingHistoryEvent[],
  now: () => number = () => Date.now(),
) {
  const cutoff = now() - 30 * 24 * 60 * 60 * 1000;

  return sortShoppingHistoryEvents(
    events.filter((event) => event.createdAt >= cutoff),
  );
}

export function getUnseenRemoteShoppingHistoryEvents(
  events: ShoppingHistoryEvent[],
  clientId: string,
  lastSeenHistoryEventAt: number,
  now: () => number = () => Date.now(),
) {
  return getRecentShoppingHistoryEvents(events, now).filter(
    (event) =>
      event.type !== "initial" &&
      event.clientId !== clientId &&
      event.createdAt > lastSeenHistoryEventAt,
  );
}

export function sortShoppingHistoryEvents(events: ShoppingHistoryEvent[]) {
  return [...events].sort(
    (firstEvent, secondEvent) => secondEvent.createdAt - firstEvent.createdAt,
  );
}

export function toggleShoppingItem(
  items: ShoppingItem[],
  itemId: string,
  now: () => number = () => Date.now(),
) {
  return items.map((item) =>
    item.id === itemId
      ? { ...item, purchased: !item.purchased, updatedAt: now() }
      : item,
  );
}

function createShoppingHistoryItemSnapshot(
  item: ShoppingItem,
  sectionName: string,
): ShoppingHistoryItemSnapshot {
  return {
    id: item.id,
    name: item.name,
    sectionId: item.sectionId,
    sectionName,
    categoryId: getShoppingItemCategoryId(item),
    addedBy: item.addedBy,
    purchased: item.purchased,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function getShoppingSectionName(
  sectionId: ShoppingSectionId,
  sections: ShoppingSection[],
) {
  return (
    sections.find((section) => section.id === sectionId)?.name ?? sectionId
  );
}

export function updateShoppingItem(
  items: ShoppingItem[],
  itemId: string,
  rawName: string,
  sectionId: ShoppingSectionId,
  now: () => number = () => Date.now(),
) {
  const name = normalizeItemName(rawName);

  if (!name) {
    return items;
  }

  const itemToUpdate = items.find((item) => item.id === itemId);

  if (!itemToUpdate) {
    return items;
  }

  const duplicateExists = items.some(
    (item) =>
      item.id !== itemId &&
      item.sectionId === sectionId &&
      item.name.toLocaleLowerCase("es-ES") === name.toLocaleLowerCase("es-ES"),
  );

  if (duplicateExists) {
    return items;
  }

  if (itemToUpdate.name === name && itemToUpdate.sectionId === sectionId) {
    return items;
  }

  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          name,
          sectionId,
          categoryId: inferShoppingCategoryId(name),
          updatedAt: now(),
        }
      : item,
  );
}

export function removeShoppingItem(items: ShoppingItem[], itemId: string) {
  return items.filter((item) => item.id !== itemId);
}

export function removePurchasedShoppingItems(items: ShoppingItem[]) {
  return items.filter((item) => !item.purchased);
}

export function sortShoppingItemsForShopping(items: ShoppingItem[]) {
  return [...items].sort(compareShoppingItemsForShopping);
}

export function compareShoppingItemsForShopping(
  firstItem: ShoppingItem,
  secondItem: ShoppingItem,
) {
  if (firstItem.purchased !== secondItem.purchased) {
    return firstItem.purchased ? 1 : -1;
  }

  const firstCategoryOrder = getShoppingCategoryOrder(
    getShoppingItemCategoryId(firstItem),
  );
  const secondCategoryOrder = getShoppingCategoryOrder(
    getShoppingItemCategoryId(secondItem),
  );

  if (firstCategoryOrder !== secondCategoryOrder) {
    return firstCategoryOrder - secondCategoryOrder;
  }

  return firstItem.createdAt - secondItem.createdAt;
}

function getShoppingCategoryOrder(categoryId: ShoppingCategoryId) {
  return shoppingCategories.findIndex((category) => category.id === categoryId);
}

function normalizeCatalogText(value: string) {
  return normalizeItemName(value)
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function catalogNameMatches(
  normalizedName: string,
  normalizedCatalogName: string,
) {
  return ` ${normalizedName} `.includes(` ${normalizedCatalogName} `);
}
