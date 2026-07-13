import {
  addShoppingItem,
  hasItemWithName,
  normalizeItemName,
  removeShoppingItem,
  ShoppingItem,
  toggleShoppingItem,
} from "./shoppingItems";

const baseItem: ShoppingItem = {
  id: "item-1",
  name: "Leche",
  purchased: false,
  createdAt: 100,
  updatedAt: 100,
};

describe("shopping item logic", () => {
  it("normalizes surrounding and repeated spaces", () => {
    expect(normalizeItemName("  pan   integral  ")).toBe("pan integral");
  });

  it("does not add empty products", () => {
    expect(addShoppingItem([], "   ", () => "item-1")).toEqual([]);
  });

  it("adds normalized products as pending items", () => {
    expect(
      addShoppingItem(
        [],
        "  Pan   integral  ",
        () => "item-1",
        () => 100,
      ),
    ).toEqual([
      {
        id: "item-1",
        name: "Pan integral",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);
  });

  it("detects duplicate names ignoring case", () => {
    expect(hasItemWithName([baseItem], " leche ")).toBe(true);
  });

  it("does not add duplicate products", () => {
    expect(addShoppingItem([baseItem], "leche", () => "item-2")).toEqual([
      baseItem,
    ]);
  });

  it("toggles purchased state", () => {
    expect(toggleShoppingItem([baseItem], "item-1", () => 200)).toEqual([
      {
        ...baseItem,
        purchased: true,
        updatedAt: 200,
      },
    ]);
  });

  it("removes products", () => {
    expect(removeShoppingItem([baseItem], "item-1")).toEqual([]);
  });
});
