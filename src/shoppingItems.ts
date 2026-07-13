export const shoppingSections = [
  { id: "alcampo", name: "Alcampo" },
  { id: "dia", name: "Día" },
  { id: "mercadona", name: "Mercadona" },
  { id: "farmacia", name: "Farmacia" },
  { id: "general", name: "General" },
] as const;

export type ShoppingSectionId = (typeof shoppingSections)[number]["id"];

export type ShoppingItem = {
  id: string;
  name: string;
  sectionId: ShoppingSectionId;
  purchased: boolean;
  createdAt: number;
  updatedAt: number;
};

export function normalizeItemName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isShoppingSectionId(value: string): value is ShoppingSectionId {
  return shoppingSections.some((section) => section.id === value);
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

export function addShoppingItem(
  items: ShoppingItem[],
  rawName: string,
  sectionId: ShoppingSectionId,
  createId: () => string = () => crypto.randomUUID(),
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
