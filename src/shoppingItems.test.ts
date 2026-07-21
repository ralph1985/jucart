import {
  addShoppingItem,
  addShoppingSection,
  createInitialShoppingHistoryEvents,
  createShoppingHistoryEvent,
  createShoppingItemId,
  getQuickShoppingItemSuggestions,
  getRecentShoppingHistoryEvents,
  getUnseenRemoteShoppingHistoryEvents,
  hasItemWithName,
  inferShoppingCategoryId,
  moveShoppingSection,
  normalizeItemName,
  renameShoppingSection,
  reactivatePurchasedShoppingItem,
  removePurchasedShoppingItems,
  removeShoppingSection,
  removeShoppingItem,
  ShoppingItem,
  ShoppingSection,
  sortShoppingItemsForShopping,
  toggleShoppingItem,
  updateShoppingSectionColor,
  updateShoppingItem,
} from "./shoppingItems";
import {
  addFreezerItem,
  getFreezerItemsByDrawer,
  removeFreezerItem,
  sortFreezerItemsByUseFirst,
  updateFreezerItem,
} from "./freezerItems";

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

  it("infers categories from the master product catalog", () => {
    expect(inferShoppingCategoryId("  Leche entera ")).toBe("dairy");
    expect(inferShoppingCategoryId("Pan integral")).toBe("bakery");
    expect(inferShoppingCategoryId("Atún natural latilla")).toBe("fish");
    expect(inferShoppingCategoryId("Guantes talla L")).toBe("pharmacy");
    expect(inferShoppingCategoryId("Aguacates")).toBe("fruit");
    expect(inferShoppingCategoryId("Cebollas")).toBe("vegetables");
    expect(inferShoppingCategoryId("Repollo")).toBe("vegetables");
    expect(inferShoppingCategoryId("Sandía")).toBe("fruit");
    expect(inferShoppingCategoryId("Limpiador biberones")).toBe("cleaning");
    expect(inferShoppingCategoryId("Pañales")).toBe("baby");
    expect(inferShoppingCategoryId("Compresas maternidad")).toBe("baby");
    expect(inferShoppingCategoryId("Peine Irati")).toBe("hygiene");
    expect(inferShoppingCategoryId("Producto raro")).toBe("other");
  });

  it("infers categories from a remote catalog", () => {
    expect(
      inferShoppingCategoryId("Nueces peladas", [
        {
          id: "pantry-nueces",
          categoryId: "pantry",
          name: "nueces",
          normalizedName: "nueces",
        },
      ]),
    ).toBe("pantry");
  });

  it("infers categories for current remote products added after the initial catalog", () => {
    expect(inferShoppingCategoryId("Kiwis")).toBe("fruit");
    expect(inferShoppingCategoryId("Guacamole")).toBe("prepared");
    expect(inferShoppingCategoryId("Salsa de soja")).toBe("pantry");
    expect(inferShoppingCategoryId("Vasos de cristal")).toBe("household");
    expect(
      inferShoppingCategoryId("Compresas maternidad o bragas de incontinencia"),
    ).toBe("baby");
    expect(inferShoppingCategoryId("Peine Irati")).toBe("hygiene");
  });

  it("does not infer categories from partial words", () => {
    expect(inferShoppingCategoryId("Lavado nasal")).toBe("pharmacy");
    expect(inferShoppingCategoryId("Repollo")).toBe("vegetables");
    expect(inferShoppingCategoryId("Producto nasal")).toBe("other");
    expect(inferShoppingCategoryId("Repollo grande")).toBe("vegetables");
  });

  it("suggests quick products from defaults and excludes existing products in the board", () => {
    expect(
      getQuickShoppingItemSuggestions([baseItem], [], "mercadona", "", 4).map(
        (suggestion) => suggestion.name,
      ),
    ).toEqual(["Pan", "Huevos", "Agua", "Pañales"]);
  });

  it("uses remote catalog entries in quick suggestions", () => {
    expect(
      getQuickShoppingItemSuggestions(
        [],
        [],
        "mercadona",
        "nu",
        4,
        [
          { id: "pantry", name: "Despensa", position: 0 },
          { id: "other", name: "Otros", position: 1 },
        ],
        [
          {
            id: "pantry-nueces",
            categoryId: "pantry",
            name: "nueces",
            normalizedName: "nueces",
          },
        ],
      ),
    ).toEqual([{ name: "Nueces", categoryId: "pantry" }]);
  });

  it("filters quick suggestions by the typed text", () => {
    expect(
      getQuickShoppingItemSuggestions([], [], "mercadona", "pa", 4).map(
        (suggestion) => suggestion.name,
      ),
    ).toEqual(["Pan", "Pañales", "Papel higiénico", "Patata"]);
  });

  it("returns no quick suggestions when the typed text has no matches", () => {
    expect(
      getQuickShoppingItemSuggestions([], [], "mercadona", "zzzzzz", 4),
    ).toEqual([]);
  });

  it("prioritizes recent shopping history in quick suggestions", () => {
    const historyEvents = [
      createShoppingHistoryEvent(
        {
          ...baseItem,
          id: "item-2",
          name: "Guacamole",
          categoryId: "prepared",
        },
        "added",
        "rafa",
        "client-1",
        "Mercadona",
        undefined,
        "",
        () => "history-1",
        () => 200,
      ),
    ];

    expect(
      getQuickShoppingItemSuggestions([], historyEvents, "mercadona", "", 2),
    ).toEqual([
      { name: "Guacamole", categoryId: "prepared" },
      { name: "Leche", categoryId: "dairy" },
    ]);
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
        categoryId: "bakery",
        addedBy: "begona",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);
  });

  it("adds products with explicit inline quantities", () => {
    expect(
      addShoppingItem(
        [],
        "  Leche   x2  ",
        "mercadona",
        "rafa",
        () => "item-1",
        () => 100,
      ),
    ).toEqual([
      {
        id: "item-1",
        name: "Leche",
        quantity: "2",
        sectionId: "mercadona",
        categoryId: "dairy",
        addedBy: "rafa",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);
  });

  it("adds products with explicit selected quantities", () => {
    expect(
      addShoppingItem(
        [],
        "  Leche x2  ",
        "mercadona",
        "rafa",
        () => "item-1",
        () => 100,
        "1",
      ),
    ).toEqual([
      {
        id: "item-1",
        name: "Leche",
        quantity: "1",
        sectionId: "mercadona",
        categoryId: "dairy",
        addedBy: "rafa",
        purchased: false,
        createdAt: 100,
        updatedAt: 100,
      },
    ]);
  });

  it("does not parse ambiguous trailing numbers as quantities", () => {
    expect(
      addShoppingItem(
        [],
        "pañales talla 4",
        "mercadona",
        "rafa",
        () => "item-1",
        () => 100,
      ),
    ).toEqual([
      {
        id: "item-1",
        name: "pañales talla 4",
        sectionId: "mercadona",
        categoryId: "baby",
        addedBy: "rafa",
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

  it("allows adding a product when the previous match is already purchased", () => {
    expect(
      addShoppingItem(
        [{ ...baseItem, purchased: true }],
        "leche",
        "mercadona",
        "rafa",
        () => "item-2",
        () => 200,
      ),
    ).toEqual([
      { ...baseItem, purchased: true },
      {
        id: "item-2",
        name: "leche",
        sectionId: "mercadona",
        categoryId: "dairy",
        addedBy: "rafa",
        purchased: false,
        createdAt: 200,
        updatedAt: 200,
      },
    ]);
  });

  it("reactivates a purchased product with the new quantity", () => {
    expect(
      reactivatePurchasedShoppingItem(
        [{ ...baseItem, quantity: "1", purchased: true }],
        "leche",
        "mercadona",
        "3",
        () => 200,
      ),
    ).toEqual([
      {
        ...baseItem,
        quantity: "3",
        purchased: false,
        updatedAt: 200,
      },
    ]);
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
        categoryId: "dairy",
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

  it("creates shopping history events with a full item snapshot", () => {
    expect(
      createShoppingHistoryEvent(
        { ...baseItem, purchased: true, updatedAt: 200 },
        "purchased",
        "begona",
        "client-1",
        "Mercadona",
        undefined,
        "",
        () => "history-1",
        () => 220,
      ),
    ).toEqual({
      id: "history-1",
      itemId: "item-1",
      type: "purchased",
      actor: "begona",
      clientId: "client-1",
      item: {
        id: "item-1",
        name: "Leche",
        sectionId: "mercadona",
        sectionName: "Mercadona",
        categoryId: "dairy",
        addedBy: "rafa",
        purchased: true,
        createdAt: 100,
        updatedAt: 200,
      },
      createdAt: 220,
    });
  });

  it("creates moved history events with the previous item snapshot", () => {
    expect(
      createShoppingHistoryEvent(
        { ...baseItem, sectionId: "alcampo", updatedAt: 220 },
        "moved",
        "rafa",
        "client-1",
        "Alcampo",
        baseItem,
        "Mercadona",
        () => "history-2",
        () => 230,
      ),
    ).toMatchObject({
      id: "history-2",
      itemId: "item-1",
      type: "moved",
      item: {
        sectionId: "alcampo",
        sectionName: "Alcampo",
      },
      previousItem: {
        sectionId: "mercadona",
        sectionName: "Mercadona",
      },
    });
  });

  it("creates initial history events from existing products", () => {
    expect(
      createInitialShoppingHistoryEvents(
        [baseItem],
        "client-1",
        [{ id: "mercadona", name: "Mercadona", color: "mint" }],
        () => "history-1",
        () => 300,
      ),
    ).toEqual([
      {
        id: "history-1",
        itemId: "item-1",
        type: "initial",
        actor: "rafa",
        clientId: "client-1",
        item: {
          id: "item-1",
          name: "Leche",
          sectionId: "mercadona",
          sectionName: "Mercadona",
          categoryId: "dairy",
          addedBy: "rafa",
          purchased: false,
          createdAt: 100,
          updatedAt: 100,
        },
        createdAt: 300,
      },
    ]);
  });

  it("keeps recent history events and detects unseen remote events", () => {
    const now = 31 * 24 * 60 * 60 * 1000;
    const oldEvent = createShoppingHistoryEvent(
      baseItem,
      "deleted",
      "rafa",
      "client-2",
      "Mercadona",
      undefined,
      "",
      () => "history-old",
      () => now - 31 * 24 * 60 * 60 * 1000,
    );
    const remoteEvent = createShoppingHistoryEvent(
      baseItem,
      "purchased",
      "begona",
      "client-2",
      "Mercadona",
      undefined,
      "",
      () => "history-remote",
      () => now - 1000,
    );
    const localEvent = createShoppingHistoryEvent(
      baseItem,
      "unpurchased",
      "rafa",
      "client-1",
      "Mercadona",
      undefined,
      "",
      () => "history-local",
      () => now - 500,
    );

    expect(
      getRecentShoppingHistoryEvents(
        [oldEvent, remoteEvent, localEvent],
        () => now,
      ),
    ).toEqual([localEvent, remoteEvent]);
    expect(
      getUnseenRemoteShoppingHistoryEvents(
        [oldEvent, remoteEvent, localEvent],
        "client-1",
        now - 2000,
        () => now,
      ),
    ).toEqual([remoteEvent]);
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
        categoryId: "bakery",
        updatedAt: 200,
      },
    ]);
  });

  it("updates product quantity", () => {
    expect(
      updateShoppingItem(
        [baseItem],
        "item-1",
        "Leche",
        "mercadona",
        "x2",
        () => 200,
      ),
    ).toEqual([
      {
        ...baseItem,
        quantity: "x2",
        categoryId: "dairy",
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
        [{ id: "mercadona", name: "Mercadona", color: "mint" }],
        "  Frutería  ",
        () => "fruteria",
      ),
    ).toEqual([
      { id: "mercadona", name: "Mercadona", color: "mint" },
      { id: "fruteria", name: "Frutería", color: "mint" },
    ]);
  });

  it("renames shopping sections without duplicating names", () => {
    const sections: ShoppingSection[] = [
      { id: "mercadona", name: "Mercadona", color: "mint" },
      { id: "general", name: "General", color: "slate" },
    ];

    expect(renameShoppingSection(sections, "general", "Varios")).toEqual([
      { id: "mercadona", name: "Mercadona", color: "mint" },
      { id: "general", name: "Varios", color: "slate" },
    ]);
    expect(renameShoppingSection(sections, "general", "mercadona")).toBe(
      sections,
    );
  });

  it("reorders shopping sections", () => {
    const sections: ShoppingSection[] = [
      { id: "alcampo", name: "Alcampo", color: "blue" },
      { id: "mercadona", name: "Mercadona", color: "mint" },
      { id: "general", name: "General", color: "slate" },
    ];

    expect(moveShoppingSection(sections, "general", -1)).toEqual([
      { id: "alcampo", name: "Alcampo", color: "blue" },
      { id: "general", name: "General", color: "slate" },
      { id: "mercadona", name: "Mercadona", color: "mint" },
    ]);
    expect(moveShoppingSection(sections, "alcampo", -1)).toBe(sections);
  });

  it("updates shopping section colors", () => {
    const sections: ShoppingSection[] = [
      { id: "mercadona", name: "Mercadona", color: "mint" },
    ];

    expect(updateShoppingSectionColor(sections, "mercadona", "amber")).toEqual([
      { id: "mercadona", name: "Mercadona", color: "amber" },
    ]);
    expect(updateShoppingSectionColor(sections, "mercadona", "mint")).toBe(
      sections,
    );
  });

  it("removes only empty shopping sections", () => {
    const sections: ShoppingSection[] = [
      { id: "mercadona", name: "Mercadona", color: "mint" },
      { id: "fruteria", name: "Frutería", color: "amber" },
    ];

    expect(removeShoppingSection(sections, [], "fruteria")).toEqual([
      { id: "mercadona", name: "Mercadona", color: "mint" },
    ]);
    expect(removeShoppingSection(sections, [baseItem], "mercadona")).toBe(
      sections,
    );
    expect(removeShoppingSection([sections[0]], [], "mercadona")).toEqual([
      sections[0],
    ]);
  });
});

describe("freezer item logic", () => {
  it("adds freezer items with normalized optional quantity", () => {
    expect(
      addFreezerItem(
        [],
        "  Lentejas   caseras  ",
        "middle",
        100,
        "  2 raciones ",
        () => "freezer-1",
        () => 200,
      ),
    ).toEqual([
      {
        id: "freezer-1",
        name: "Lentejas caseras",
        quantity: "2 raciones",
        drawerId: "middle",
        frozenAt: 100,
        createdAt: 200,
        updatedAt: 200,
      },
    ]);
  });

  it("does not add empty freezer items", () => {
    expect(addFreezerItem([], "   ", "top", 100)).toEqual([]);
  });

  it("sorts freezer items by oldest frozen date first", () => {
    expect(
      sortFreezerItemsByUseFirst([
        {
          id: "new",
          name: "Nuevo",
          drawerId: "top",
          frozenAt: 300,
          createdAt: 300,
          updatedAt: 300,
        },
        {
          id: "old",
          name: "Viejo",
          drawerId: "bottom",
          frozenAt: 100,
          createdAt: 200,
          updatedAt: 200,
        },
      ]).map((item) => item.id),
    ).toEqual(["old", "new"]);
  });

  it("groups drawer items ordered by use priority", () => {
    expect(
      getFreezerItemsByDrawer(
        [
          {
            id: "middle",
            name: "Medio",
            drawerId: "middle",
            frozenAt: 100,
            createdAt: 100,
            updatedAt: 100,
          },
          {
            id: "top-new",
            name: "Arriba nuevo",
            drawerId: "top",
            frozenAt: 300,
            createdAt: 300,
            updatedAt: 300,
          },
          {
            id: "top-old",
            name: "Arriba viejo",
            drawerId: "top",
            frozenAt: 200,
            createdAt: 200,
            updatedAt: 200,
          },
        ],
        "top",
      ).map((item) => item.id),
    ).toEqual(["top-old", "top-new"]);
  });

  it("updates and removes freezer items", () => {
    const freezerItems = addFreezerItem(
      [],
      "Caldo",
      "top",
      100,
      undefined,
      () => "freezer-1",
      () => 100,
    );

    const updatedItems = updateFreezerItem(
      freezerItems,
      "freezer-1",
      "Caldo de pollo",
      "bottom",
      50,
      "1 litro",
      () => 300,
    );

    expect(updatedItems).toEqual([
      {
        id: "freezer-1",
        name: "Caldo de pollo",
        quantity: "1 litro",
        drawerId: "bottom",
        frozenAt: 50,
        createdAt: 100,
        updatedAt: 300,
      },
    ]);
    expect(removeFreezerItem(updatedItems, "freezer-1")).toEqual([]);
  });
});
