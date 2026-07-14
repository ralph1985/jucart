export type ShoppingSectionId = string;

export type ShoppingSection = {
  id: ShoppingSectionId;
  name: string;
};

export const defaultShoppingSections: ShoppingSection[] = [
  { id: "alcampo", name: "Alcampo" },
  { id: "dia", name: "Día" },
  { id: "mercadona", name: "Mercadona" },
  { id: "farmacia", name: "Farmacia" },
  { id: "general", name: "General" },
];

export const shoppingUsers = [
  { id: "rafa", name: "Rafa" },
  { id: "begona", name: "Begoña" },
] as const;

export type ShoppingUserId = (typeof shoppingUsers)[number]["id"];

export type ShoppingItem = {
  id: string;
  name: string;
  sectionId: ShoppingSectionId;
  addedBy: ShoppingUserId;
  purchased: boolean;
  createdAt: number;
  updatedAt: number;
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

export function getShoppingUserName(userId: ShoppingUserId) {
  return shoppingUsers.find((user) => user.id === userId)?.name ?? "Rafa";
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

export function addShoppingSection(
  sections: ShoppingSection[],
  rawName: string,
  createId: () => string = createShoppingSectionId,
) {
  const name = normalizeItemName(rawName);

  if (!name || hasSectionWithName(sections, name)) {
    return sections;
  }

  return [...sections, { id: createId(), name }];
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
      addedBy,
      purchased: false,
      createdAt,
      updatedAt: createdAt,
    },
  ];
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
  return [
    ...items.filter((item) => !item.purchased),
    ...items.filter((item) => item.purchased),
  ];
}
