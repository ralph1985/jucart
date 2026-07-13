import {
  addShoppingItem,
  hasItemWithName,
  normalizeItemName,
  removePurchasedShoppingItems,
  removeShoppingItem,
  ShoppingItem,
  toggleShoppingItem,
  updateShoppingItem,
} from "./shoppingItems";

const baseItem: ShoppingItem = {
  id: "item-1",
  name: "Leche",
  sectionId: "mercadona",
  addedBy: "rafa",
  purchased: false,
  createdAt: 100,
  updatedAt: 100,
};

describe("shopping item logic", () => {
  it("normalizes surrounding and repeated spaces", () => {
    expect(normalizeItemName("  pan   integral  ")).toBe("pan integral");
  });

  it("does not add empty products", () => {
    expect(
      addShoppingItem([], "   ", "mercadona", "rafa", () => "item-1"),
    ).toEqual([]);
  });

  it("adds normalized products as pending items", () => {
    expect(
      addShoppingItem(
        [],
        "  Pan   integral  ",
        "mercadona",
        "begona",
        () => "item-1",
        () => 100,
      ),
    ).toEqual([
      {
        id: "item-1",
        name: "Pan integral",
        sectionId: "mercadona",
        addedBy: "begona",
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
      addShoppingItem([baseItem], "leche", "mercadona", "rafa", () => "item-2"),
    ).toEqual([baseItem]);
  });

  it("allows the same product name in different sections", () => {
    expect(
      addShoppingItem(
        [baseItem],
        "leche",
        "alcampo",
        "begona",
        () => "item-2",
        () => 200,
      ),
    ).toEqual([
      baseItem,
      {
        id: "item-2",
        name: "leche",
        sectionId: "alcampo",
        addedBy: "begona",
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

  it("updates product name and section", () => {
    expect(
      updateShoppingItem(
        [baseItem],
        "item-1",
        "  Pan   integral ",
        "alcampo",
        () => 200,
      ),
    ).toEqual([
      {
        ...baseItem,
        name: "Pan integral",
        sectionId: "alcampo",
        updatedAt: 200,
      },
    ]);
  });

  it("does not update a product to an empty name", () => {
    expect(updateShoppingItem([baseItem], "item-1", "   ", "alcampo")).toEqual([
      baseItem,
    ]);
  });

  it("does not update a product to a duplicate name in the same section", () => {
    const secondItem: ShoppingItem = {
      ...baseItem,
      id: "item-2",
      name: "Pan",
    };

    expect(
      updateShoppingItem([baseItem, secondItem], "item-1", "pan", "mercadona"),
    ).toEqual([baseItem, secondItem]);
  });

  it("removes products", () => {
    expect(removeShoppingItem([baseItem], "item-1")).toEqual([]);
  });

  it("removes only purchased products", () => {
    const purchasedItem: ShoppingItem = {
      ...baseItem,
      id: "item-2",
      name: "Pan",
      purchased: true,
    };

    expect(removePurchasedShoppingItems([baseItem, purchasedItem])).toEqual([
      baseItem,
    ]);
  });
});
