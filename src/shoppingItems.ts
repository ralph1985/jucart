export type ShoppingItem = {
  id: string;
  name: string;
  purchased: boolean;
  createdAt: number;
  updatedAt: number;
};

export function normalizeItemName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function hasItemWithName(items: ShoppingItem[], name: string) {
  const normalizedName = normalizeItemName(name).toLocaleLowerCase("es-ES");

  return items.some(
    (item) => item.name.toLocaleLowerCase("es-ES") === normalizedName,
  );
}

export function addShoppingItem(
  items: ShoppingItem[],
  rawName: string,
  createId: () => string = () => crypto.randomUUID(),
  now: () => number = () => Date.now(),
) {
  const name = normalizeItemName(rawName);

  if (!name || hasItemWithName(items, name)) {
    return items;
  }

  const createdAt = now();

  return [
    ...items,
    {
      id: createId(),
      name,
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

export function removeShoppingItem(items: ShoppingItem[], itemId: string) {
  return items.filter((item) => item.id !== itemId);
}
