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
  sectionId: "mercadona",
  purchased: false,
  createdAt: 100,
  updatedAt: 100,
};

describe("shopping item logic", () => {
  it("normalizes surrounding and repeated spaces", () => {
    expect(normalizeItemName("  pan   integral  ")).toBe("pan integral");
  });

  it("does not add empty products", () => {
    expect(addShoppingItem([], "   ", "mercadona", () => "item-1")).toEqual([]);
  });

  it("adds normalized products as pending items", () => {
    expect(
      addShoppingItem(
        [],
        "  Pan   integral  ",
        "mercadona",
        () => "item-1",
        () => 100,
      ),
    ).toEqual([
      {
        id: "item-1",
        name: "Pan integral",
        sectionId: "mercadona",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);
  });

  it("detects duplicate names ignoring case", () => {
    expect(hasItemWithName([baseItem], " leche ", "mercadona")).toBe(true);
  });

  it("does not add duplicate products in the same section", () => {
    expect(
      addShoppingItem([baseItem], "leche", "mercadona", () => "item-2"),
    ).toEqual([baseItem]);
  });

  it("allows the same product name in different sections", () => {
    expect(
      addShoppingItem(
        [baseItem],
        "leche",
        "alcampo",
        () => "item-2",
        () => 200,
      ),
    ).toEqual([
      baseItem,
      {
        id: "item-2",
        name: "leche",
        sectionId: "alcampo",
        purchased: false,
        createdAt: 200,
        updatedAt: 200,
      },
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
