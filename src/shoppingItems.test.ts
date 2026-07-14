import {
  addShoppingItem,
  addShoppingSection,
  createShoppingItemId,
  hasItemWithName,
  moveShoppingSection,
  normalizeItemName,
  renameShoppingSection,
  removePurchasedShoppingItems,
  removeShoppingItem,
  ShoppingItem,
  sortShoppingItemsForShopping,
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

  it("creates ids without crypto randomUUID support", () => {
    const originalRandomUUID = crypto.randomUUID;

    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });

    try {
      expect(createShoppingItemId()).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    } finally {
      Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        value: originalRandomUUID,
      });
    }
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

  it("sorts pending products before purchased products", () => {
    const pendingItem: ShoppingItem = {
      ...baseItem,
      id: "item-2",
      name: "Pan",
    };
    const purchasedItem: ShoppingItem = {
      ...baseItem,
      id: "item-3",
      name: "Yogur",
      purchased: true,
    };

    expect(
      sortShoppingItemsForShopping([purchasedItem, baseItem, pendingItem]),
    ).toEqual([baseItem, pendingItem, purchasedItem]);
  });

  it("adds normalized shopping sections", () => {
    expect(
      addShoppingSection(
        [{ id: "mercadona", name: "Mercadona" }],
        "  Frutería  ",
        () => "fruteria",
      ),
    ).toEqual([
      { id: "mercadona", name: "Mercadona" },
      { id: "fruteria", name: "Frutería" },
    ]);
  });

  it("renames shopping sections without duplicating names", () => {
    const sections = [
      { id: "mercadona", name: "Mercadona" },
      { id: "general", name: "General" },
    ];

    expect(renameShoppingSection(sections, "general", "Varios")).toEqual([
      { id: "mercadona", name: "Mercadona" },
      { id: "general", name: "Varios" },
    ]);
    expect(renameShoppingSection(sections, "general", "mercadona")).toBe(
      sections,
    );
  });

  it("reorders shopping sections", () => {
    const sections = [
      { id: "alcampo", name: "Alcampo" },
      { id: "mercadona", name: "Mercadona" },
      { id: "general", name: "General" },
    ];

    expect(moveShoppingSection(sections, "general", -1)).toEqual([
      { id: "alcampo", name: "Alcampo" },
      { id: "general", name: "General" },
      { id: "mercadona", name: "Mercadona" },
    ]);
    expect(moveShoppingSection(sections, "alcampo", -1)).toBe(sections);
  });
});
