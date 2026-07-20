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
  { id: "prepared", name: "Preparados" },
  { id: "cleaning", name: "Limpieza" },
  { id: "household", name: "Hogar" },
  { id: "baby", name: "Bebé" },
  { id: "hygiene", name: "Higiene" },
  { id: "pharmacy", name: "Farmacia" },
  { id: "pets", name: "Mascotas" },
  { id: "other", name: "Otros" },
] as const;

export type ShoppingCategoryId = (typeof shoppingCategories)[number]["id"];

const shoppingProductCatalog: Record<ShoppingCategoryId, string[]> = {
  fruit: [
    "aguacate",
    "aguacates",
    "fresa",
    "fruta",
    "kiwi",
    "kiwis",
    "limón",
    "mandarina",
    "manzana",
    "manzanas",
    "melocotón",
    "naranja",
    "pera",
    "plátano",
    "plátanos",
    "sandía",
    "uvas",
  ],
  vegetables: [
    "ajo",
    "berenjena",
    "calabacín",
    "cebolla",
    "cebollas",
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
    "salsa de soja",
    "soja",
    "especias",
    "tomate frito",
  ],
  drinks: ["agua", "cerveza", "refresco", "vino", "zumo"],
  frozen: ["congelado", "croquetas", "helado", "helados", "pizza"],
  prepared: [
    "ensaladilla",
    "gazpacho",
    "guacamole",
    "hummus",
    "salmorejo",
    "tortilla preparada",
  ],
  cleaning: [
    "detergente",
    "fregasuelos",
    "lavavajillas",
    "lejía",
    "limpiador biberones",
    "limpieza",
  ],
  household: [
    "bolsas de basura",
    "cristal",
    "papel cocina",
    "servilletas",
    "vaso",
    "vasos",
  ],
  baby: [
    "biberón",
    "bragas de incontinencia",
    "chupete",
    "compresas maternidad",
    "maternidad",
    "pañales",
    "toallitas",
  ],
  hygiene: [
    "cabezales oral b",
    "champú",
    "compresas",
    "gel",
    "higiene",
    "papel higiénico",
    "parodontax",
    "pasta de dientes",
    "peine",
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

const quickShoppingProductDefaults = [
  "leche",
  "pan",
  "huevos",
  "agua",
  "pañales",
  "toallitas",
  "papel higiénico",
  "detergente",
] as const;

export type ShoppingItem = {
  id: string;
  name: string;
  quantity?: string;
  sectionId: ShoppingSectionId;
  categoryId?: ShoppingCategoryId;
  addedBy: ShoppingUserId;
  purchased: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ShoppingHistoryEventType =
  "initial" | "added" | "purchased" | "unpurchased" | "moved" | "deleted";

export type ShoppingHistoryItemSnapshot = Pick<
  ShoppingItem,
  | "id"
  | "name"
  | "quantity"
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
  previousItem?: ShoppingHistoryItemSnapshot;
  createdAt: number;
};

export type QuickShoppingItemSuggestion = {
  name: string;
  categoryId: ShoppingCategoryId;
};

export function normalizeItemName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeItemQuantity(value: string | undefined) {
  const quantity = normalizeItemName(value ?? "");

  return quantity || undefined;
}

export function parseShoppingItemNameAndQuantity(rawName: string) {
  const normalizedName = normalizeItemName(rawName);
  const quantityMatch = normalizedName.match(
    /\s+(?:x\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*x|(\d+(?:[.,]\d+)?)\s*(ud|uds|unidad|unidades|kg|g|gr|l|ml|pack|packs|paquete|paquetes|bote|botes|caja|cajas|bolsa|bolsas))$/i,
  );

  if (!quantityMatch) {
    return { name: normalizedName, quantity: undefined };
  }

  const quantityStart = quantityMatch.index ?? normalizedName.length;
  const name = normalizeItemName(normalizedName.slice(0, quantityStart));
  const numericQuantity =
    quantityMatch[1] ?? quantityMatch[2] ?? quantityMatch[3] ?? "";
  const unit = quantityMatch[4]?.toLocaleLowerCase("es-ES");
  const quantity = normalizeItemQuantity(
    unit ? `${numericQuantity} ${unit}` : numericQuantity,
  );

  return name
    ? { name, quantity }
    : { name: normalizedName, quantity: undefined };
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
    value === "added" ||
    value === "purchased" ||
    value === "unpurchased" ||
    value === "moved" ||
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

export function getQuickShoppingItemSuggestions(
  items: Pick<
    ShoppingItem,
    "name" | "sectionId" | "categoryId" | "createdAt" | "updatedAt"
  >[],
  historyEvents: (Pick<ShoppingHistoryEvent, "item" | "createdAt"> &
    Partial<Pick<ShoppingHistoryEvent, "type">>)[],
  _sectionId: ShoppingSectionId,
  rawQuery: string = "",
  limit: number = 8,
): QuickShoppingItemSuggestion[] {
  const normalizedQuery = normalizeCatalogText(rawQuery);
  const existingNames = new Set(
    items.map((item) => normalizeDuplicateName(item.name)),
  );
  const latestDeletedNames = new Set<string>();
  const latestSeenNames = new Set<string>();

  [...historyEvents]
    .sort(
      (firstEvent, secondEvent) => secondEvent.createdAt - firstEvent.createdAt,
    )
    .forEach((event) => {
      const duplicateName = normalizeDuplicateName(event.item.name);

      if (latestSeenNames.has(duplicateName)) {
        return;
      }

      latestSeenNames.add(duplicateName);

      if (event.type === "deleted") {
        latestDeletedNames.add(duplicateName);
      }
    });

  const sortedHistoryEvents = [...historyEvents].sort(
    (firstEvent, secondEvent) => secondEvent.createdAt - firstEvent.createdAt,
  );
  const candidates = new Map<
    string,
    QuickShoppingItemSuggestion & { score: number }
  >();

  function addCandidate(
    rawName: string,
    categoryId: ShoppingCategoryId | undefined,
    score: number,
  ) {
    const name = normalizeItemName(rawName);
    const duplicateName = normalizeDuplicateName(name);
    const normalizedName = normalizeCatalogText(name);

    if (
      !name ||
      existingNames.has(duplicateName) ||
      latestDeletedNames.has(duplicateName) ||
      (normalizedQuery && !normalizedName.includes(normalizedQuery))
    ) {
      return;
    }

    const currentCandidate = candidates.get(duplicateName);

    if (currentCandidate && currentCandidate.score >= score) {
      return;
    }

    candidates.set(duplicateName, {
      name: formatSuggestionName(name),
      categoryId:
        categoryId && isShoppingCategoryId(categoryId)
          ? categoryId
          : inferShoppingCategoryId(name),
      score,
    });
  }

  sortedHistoryEvents.forEach((event, index) => {
    addCandidate(event.item.name, event.item.categoryId, 30_000 - index);
  });

  quickShoppingProductDefaults.forEach((productName, index) => {
    addCandidate(productName, undefined, 10_000 - index);
  });

  shoppingCategories.forEach((category, categoryIndex) => {
    shoppingProductCatalog[category.id].forEach((productName, productIndex) => {
      addCandidate(
        productName,
        category.id,
        1_000 - categoryIndex * 50 - productIndex,
      );
    });
  });

  return [...candidates.values()]
    .sort((firstCandidate, secondCandidate) => {
      if (firstCandidate.score !== secondCandidate.score) {
        return secondCandidate.score - firstCandidate.score;
      }

      return firstCandidate.name.localeCompare(secondCandidate.name, "es-ES");
    })
    .slice(0, limit)
    .map(({ name, categoryId }) => ({ name, categoryId }));
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

export function findPendingShoppingItemByName(
  items: ShoppingItem[],
  name: string,
  sectionId: ShoppingSectionId,
) {
  const normalizedName = normalizeDuplicateName(name);

  return items.find(
    (item) =>
      !item.purchased &&
      item.sectionId === sectionId &&
      normalizeDuplicateName(item.name) === normalizedName,
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
  rawQuantity?: string,
) {
  const parsedItem = parseShoppingItemNameAndQuantity(rawName);
  const name = parsedItem.name;
  const quantity =
    rawQuantity === undefined
      ? parsedItem.quantity
      : normalizeItemQuantity(rawQuantity);

  if (!name || findPendingShoppingItemByName(items, name, sectionId)) {
    return items;
  }

  const createdAt = now();

  return [
    ...items,
    {
      id: createId(),
      name,
      quantity,
      sectionId,
      categoryId: inferShoppingCategoryId(name),
      addedBy,
      purchased: false,
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export function reactivatePurchasedShoppingItem(
  items: ShoppingItem[],
  rawName: string,
  sectionId: ShoppingSectionId,
  rawQuantity?: string,
  now: () => number = () => Date.now(),
) {
  const parsedItem = parseShoppingItemNameAndQuantity(rawName);
  const name = parsedItem.name;
  const quantity =
    rawQuantity === undefined
      ? parsedItem.quantity
      : normalizeItemQuantity(rawQuantity);

  if (!name) {
    return items;
  }

  const normalizedName = normalizeDuplicateName(name);
  const purchasedItem = items.find(
    (item) =>
      item.purchased &&
      item.sectionId === sectionId &&
      normalizeDuplicateName(item.name) === normalizedName,
  );

  if (!purchasedItem) {
    return items;
  }

  return items.map((item) =>
    item.id === purchasedItem.id
      ? { ...item, quantity, purchased: false, updatedAt: now() }
      : item,
  );
}

export function createShoppingHistoryEvent(
  item: ShoppingItem,
  type: ShoppingHistoryEventType,
  actor: ShoppingUserId,
  clientId: string,
  sectionName: string = item.sectionId,
  previousItem?: ShoppingItem,
  previousSectionName: string = previousItem?.sectionId ?? "",
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
    previousItem: previousItem
      ? createShoppingHistoryItemSnapshot(previousItem, previousSectionName)
      : undefined,
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
      ? updateShoppingItemPurchasedState(item, !item.purchased, now)
      : item,
  );
}

export function updateShoppingItemPurchasedState(
  item: ShoppingItem,
  purchased: boolean,
  now: () => number = () => Date.now(),
) {
  return { ...item, purchased, updatedAt: now() };
}

function createShoppingHistoryItemSnapshot(
  item: ShoppingItem,
  sectionName: string,
): ShoppingHistoryItemSnapshot {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
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
  rawQuantityOrNow: string | undefined | (() => number) = undefined,
  now: () => number = () => Date.now(),
) {
  const name = normalizeItemName(rawName);
  const quantity =
    typeof rawQuantityOrNow === "function"
      ? undefined
      : normalizeItemQuantity(rawQuantityOrNow);
  const getNow =
    typeof rawQuantityOrNow === "function" ? rawQuantityOrNow : now;

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

  if (
    itemToUpdate.name === name &&
    itemToUpdate.sectionId === sectionId &&
    itemToUpdate.quantity === quantity
  ) {
    return items;
  }

  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          name,
          quantity,
          sectionId,
          categoryId: inferShoppingCategoryId(name),
          updatedAt: getNow(),
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

function normalizeDuplicateName(value: string) {
  return normalizeItemName(value).toLocaleLowerCase("es-ES");
}

function formatSuggestionName(value: string) {
  const name = normalizeItemName(value);

  return name ? `${name[0].toLocaleUpperCase("es-ES")}${name.slice(1)}` : name;
}

function catalogNameMatches(
  normalizedName: string,
  normalizedCatalogName: string,
) {
  return ` ${normalizedName} `.includes(` ${normalizedCatalogName} `);
}
