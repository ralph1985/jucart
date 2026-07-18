import {
  createShoppingItemId,
  normalizeItemName,
  normalizeItemQuantity,
} from "./shoppingItems";

export const freezerDrawers = [
  { id: "top", name: "Arriba" },
  { id: "middle", name: "Medio" },
  { id: "bottom", name: "Abajo" },
] as const;

export type FreezerDrawerId = (typeof freezerDrawers)[number]["id"];

export type FreezerItem = {
  id: string;
  name: string;
  quantity?: string;
  drawerId: FreezerDrawerId;
  frozenAt: number;
  createdAt: number;
  updatedAt: number;
};

export function isFreezerDrawerId(value: string): value is FreezerDrawerId {
  return freezerDrawers.some((drawer) => drawer.id === value);
}

export function getFreezerDrawerName(drawerId: FreezerDrawerId) {
  return (
    freezerDrawers.find((drawer) => drawer.id === drawerId)?.name ?? "Arriba"
  );
}

export function addFreezerItem(
  items: FreezerItem[],
  rawName: string,
  drawerId: FreezerDrawerId,
  frozenAt: number,
  rawQuantity?: string,
  createId: () => string = createShoppingItemId,
  now: () => number = () => Date.now(),
) {
  const name = normalizeItemName(rawName);
  const quantity = normalizeItemQuantity(rawQuantity);

  if (!name) {
    return items;
  }

  const createdAt = now();

  return [
    ...items,
    {
      id: createId(),
      name,
      quantity,
      drawerId,
      frozenAt,
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export function updateFreezerItem(
  items: FreezerItem[],
  itemId: string,
  rawName: string,
  drawerId: FreezerDrawerId,
  frozenAt: number,
  rawQuantity?: string,
  now: () => number = () => Date.now(),
) {
  const name = normalizeItemName(rawName);
  const quantity = normalizeItemQuantity(rawQuantity);
  const itemToUpdate = items.find((item) => item.id === itemId);

  if (!name || !itemToUpdate) {
    return items;
  }

  if (
    itemToUpdate.name === name &&
    itemToUpdate.quantity === quantity &&
    itemToUpdate.drawerId === drawerId &&
    itemToUpdate.frozenAt === frozenAt
  ) {
    return items;
  }

  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          name,
          quantity,
          drawerId,
          frozenAt,
          updatedAt: now(),
        }
      : item,
  );
}

export function removeFreezerItem(items: FreezerItem[], itemId: string) {
  return items.filter((item) => item.id !== itemId);
}

export function sortFreezerItemsByUseFirst(items: FreezerItem[]) {
  return [...items].sort(compareFreezerItemsByUseFirst);
}

export function getFreezerItemsByDrawer(
  items: FreezerItem[],
  drawerId: FreezerDrawerId,
) {
  return sortFreezerItemsByUseFirst(
    items.filter((item) => item.drawerId === drawerId),
  );
}

function compareFreezerItemsByUseFirst(
  firstItem: FreezerItem,
  secondItem: FreezerItem,
) {
  if (firstItem.frozenAt !== secondItem.frozenAt) {
    return firstItem.frozenAt - secondItem.frozenAt;
  }

  return firstItem.createdAt - secondItem.createdAt;
}
