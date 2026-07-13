import {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  UIEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { animate, stagger } from "animejs";

import styles from "./App.module.scss";
import {
  addShoppingItem,
  getShoppingUserName,
  isShoppingSectionId,
  isShoppingUserId,
  removePurchasedShoppingItems,
  removeShoppingItem,
  ShoppingItem,
  ShoppingSectionId,
  ShoppingUserId,
  shoppingSections,
  shoppingUsers,
  sortShoppingItemsForShopping,
  toggleShoppingItem,
  updateShoppingItem,
} from "./shoppingItems";
import {
  getStoredShoppingItems,
  replaceStoredShoppingItems,
} from "./shoppingItemsDb";

const selectedSectionStorageKey = "jucart:selected-section-id";
const selectedUserStorageKey = "jucart:selected-user-id";

type IconName = "check" | "edit" | "trash" | "undo" | "save" | "close";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string[]> = {
    check: ["M5 12l4 4L19 6"],
    edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"],
    trash: [
      "M3 6h18",
      "M8 6V4h8v2",
      "M6 6l1 14h10l1-14",
      "M10 11v5",
      "M14 11v5",
    ],
    undo: ["M9 14l-4-4 4-4", "M5 10h9a5 5 0 1 1 0 10h-2"],
    save: ["M5 3h12l2 2v16H5z", "M8 3v6h8V3", "M8 17h8"],
    close: ["M6 6l12 12", "M18 6L6 18"],
  };

  return (
    <svg
      className={styles.buttonIcon}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {paths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}

function getInitialSelectedSectionId(): ShoppingSectionId {
  try {
    const storedSectionId = window.localStorage.getItem(
      selectedSectionStorageKey,
    );

    return storedSectionId && isShoppingSectionId(storedSectionId)
      ? storedSectionId
      : "mercadona";
  } catch {
    return "mercadona";
  }
}

function getInitialSelectedUserId(): ShoppingUserId {
  try {
    const storedUserId = window.localStorage.getItem(selectedUserStorageKey);

    return storedUserId && isShoppingUserId(storedUserId)
      ? storedUserId
      : "rafa";
  } catch {
    return "rafa";
  }
}

function compareShoppingItemsForVisibleOrder(
  firstItem: ShoppingItem,
  secondItem: ShoppingItem,
) {
  if (firstItem.purchased !== secondItem.purchased) {
    return firstItem.purchased ? 1 : -1;
  }

  return firstItem.createdAt - secondItem.createdAt;
}

function shouldAnimate() {
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function runAnimation(
  targets: HTMLElement | HTMLElement[],
  parameters: Parameters<typeof animate>[1],
) {
  if (!shouldAnimate()) {
    return;
  }

  try {
    animate(targets, parameters);
  } catch {
    return;
  }
}

export function App() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<ShoppingSectionId>(
    getInitialSelectedSectionId,
  );
  const [selectedUserId, setSelectedUserId] = useState<ShoppingUserId>(
    getInitialSelectedUserId,
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingSectionId, setEditingSectionId] =
    useState<ShoppingSectionId>("mercadona");
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [lastRemovedItems, setLastRemovedItems] = useState<ShoppingItem[]>([]);
  const itemNameInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Partial<Record<string, HTMLElement>>>({});
  const boardRef = useRef<HTMLElement>(null);
  const sectionColumnRefs = useRef<
    Partial<Record<ShoppingSectionId, HTMLElement>>
  >({});
  const programmaticScrollTimeoutRef = useRef<number | null>(null);
  const hasAnimatedInitialColumnsRef = useRef(false);
  const previousItemIdsRef = useRef<Set<string>>(new Set());
  const previousUndoKeyRef = useRef<string | null>(null);
  const undoItemRef = useRef<HTMLLIElement>(null);
  const pendingCount = items.filter((item) => !item.purchased).length;
  const purchasedCount = items.filter((item) => item.purchased).length;

  useEffect(() => {
    let isActive = true;

    async function loadItems() {
      try {
        const storedItems = await getStoredShoppingItems();

        if (isActive) {
          setItems(storedItems);
          setStorageError(null);
        }
      } catch {
        if (isActive) {
          setStorageError("No se pudo cargar la lista guardada.");
        }
      } finally {
        if (isActive) {
          setIsLoaded(true);
        }
      }
    }

    void loadItems();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    async function storeItems() {
      try {
        await replaceStoredShoppingItems(items);
        setStorageError(null);
      } catch {
        setStorageError("No se pudieron guardar los últimos cambios.");
      }
    }

    void storeItems();
  }, [isLoaded, items]);

  useEffect(() => {
    try {
      window.localStorage.setItem(selectedSectionStorageKey, selectedSectionId);
    } catch {
      return;
    }
  }, [selectedSectionId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(selectedUserStorageKey, selectedUserId);
    } catch {
      return;
    }
  }, [selectedUserId]);

  useEffect(() => {
    const board = boardRef.current;
    const selectedColumn = sectionColumnRefs.current[selectedSectionId];

    if (!board || !selectedColumn || board.scrollWidth <= board.clientWidth) {
      return;
    }

    if (programmaticScrollTimeoutRef.current) {
      window.clearTimeout(programmaticScrollTimeoutRef.current);
    }

    programmaticScrollTimeoutRef.current = window.setTimeout(() => {
      programmaticScrollTimeoutRef.current = null;
    }, 500);

    runAnimation(board, {
      scrollLeft: selectedColumn.offsetLeft,
      duration: 420,
      ease: "outCubic",
    });
  }, [selectedSectionId]);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || hasAnimatedInitialColumnsRef.current) {
      return;
    }

    const columns = shoppingSections
      .map((section) => sectionColumnRefs.current[section.id])
      .filter((column): column is HTMLElement => Boolean(column));

    if (columns.length === 0) {
      return;
    }

    hasAnimatedInitialColumnsRef.current = true;
    runAnimation(columns, {
      opacity: [0, 1],
      y: [14, 0],
      duration: 420,
      delay: stagger(55),
      ease: "outCubic",
    });
  }, [isLoaded]);

  useEffect(() => {
    const selectedColumn = sectionColumnRefs.current[selectedSectionId];

    if (!selectedColumn) {
      return;
    }

    runAnimation(selectedColumn, {
      scale: [0.985, 1],
      duration: 280,
      ease: "outBack",
    });
  }, [selectedSectionId]);

  useEffect(() => {
    const previousItemIds = previousItemIdsRef.current;
    const newItems = items.filter((item) => !previousItemIds.has(item.id));

    previousItemIdsRef.current = new Set(items.map((item) => item.id));

    const newItemElements = newItems
      .map((item) => itemRefs.current[item.id])
      .filter((item): item is HTMLElement => Boolean(item));

    if (newItemElements.length === 0) {
      return;
    }

    runAnimation(newItemElements, {
      opacity: [0, 1],
      y: [-8, 0],
      scale: [0.97, 1],
      duration: 320,
      delay: stagger(35),
      ease: "outBack",
    });
  }, [items]);

  useEffect(() => {
    if (lastRemovedItems.length === 0) {
      previousUndoKeyRef.current = null;
      return;
    }

    const undoKey = lastRemovedItems.map((item) => item.id).join("-");

    if (undoKey === previousUndoKeyRef.current || !undoItemRef.current) {
      return;
    }

    previousUndoKeyRef.current = undoKey;
    runAnimation(undoItemRef.current, {
      opacity: [0, 1],
      y: [-6, 0],
      scale: [0.98, 1],
      duration: 260,
      ease: "outBack",
    });
  }, [lastRemovedItems]);

  function animateButtonPress(element: HTMLElement) {
    runAnimation(element, {
      scale: [0.92, 1],
      duration: 220,
      ease: "outBack",
    });
  }

  function handleButtonPointerDown(event: MouseEvent<HTMLButtonElement>) {
    animateButtonPress(event.currentTarget);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setItems((currentItems) =>
      addShoppingItem(
        currentItems,
        itemName,
        selectedSectionId,
        selectedUserId,
      ),
    );
    setItemName("");
    itemNameInputRef.current?.focus();
  }

  function startEditing(item: ShoppingItem) {
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditingSectionId(item.sectionId);
  }

  function cancelEditing() {
    setEditingItemId(null);
    setEditingItemName("");
    setEditingSectionId("mercadona");
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>, itemId: string) {
    event.preventDefault();
    setItems((currentItems) =>
      updateShoppingItem(
        currentItems,
        itemId,
        editingItemName,
        editingSectionId,
      ),
    );
    cancelEditing();
  }

  function handleRemovePurchasedItems() {
    if (purchasedCount === 0) {
      return;
    }

    const shouldRemove = window.confirm(
      `¿Borrar ${purchasedCount} productos comprados?`,
    );

    if (!shouldRemove) {
      return;
    }

    setItems((currentItems) => {
      const removedItems = currentItems.filter((item) => item.purchased);

      setLastRemovedItems(removedItems);

      return removePurchasedShoppingItems(currentItems);
    });
  }

  function handleRemoveItem(itemId: string) {
    setItems((currentItems) => {
      const removedItem = currentItems.find((item) => item.id === itemId);

      if (!removedItem) {
        return currentItems;
      }

      setLastRemovedItems([removedItem]);

      return removeShoppingItem(currentItems, itemId);
    });
  }

  function handleUndoRemoveItems() {
    if (lastRemovedItems.length === 0) {
      return;
    }

    setItems((currentItems) => {
      const currentItemIds = new Set(currentItems.map((item) => item.id));
      const restorableItems = lastRemovedItems.filter(
        (item) => !currentItemIds.has(item.id),
      );

      if (restorableItems.length === 0) {
        return currentItems;
      }

      return [...currentItems, ...restorableItems].sort(
        (firstItem, secondItem) => firstItem.createdAt - secondItem.createdAt,
      );
    });
    setLastRemovedItems([]);
  }

  function handleBoardScroll(event: UIEvent<HTMLElement>) {
    const board = event.currentTarget;

    if (
      programmaticScrollTimeoutRef.current ||
      board.scrollWidth <= board.clientWidth
    ) {
      return;
    }

    const nextSection = shoppingSections.reduce<{
      distance: number;
      id: ShoppingSectionId;
    } | null>((closestSection, section) => {
      const column = sectionColumnRefs.current[section.id];

      if (!column) {
        return closestSection;
      }

      const distance = Math.abs(column.offsetLeft - board.scrollLeft);

      if (!closestSection || distance < closestSection.distance) {
        return { distance, id: section.id };
      }

      return closestSection;
    }, null);

    if (nextSection && nextSection.id !== selectedSectionId) {
      setSelectedSectionId(nextSection.id);
    }
  }

  function handleColumnKeyDown(
    event: KeyboardEvent<HTMLElement>,
    sectionId: ShoppingSectionId,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    setSelectedSectionId(sectionId);
  }

  function handleItemKeyDown(
    event: KeyboardEvent<HTMLElement>,
    itemId: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    setItems((currentItems) => toggleShoppingItem(currentItems, itemId));
  }

  function renderUndoItem(removedItems: ShoppingItem[]) {
    return (
      <li
        ref={undoItemRef}
        className={styles.undoItem}
        key={`undo-${removedItems[0].id}`}
      >
        <span>
          {removedItems.length === 1
            ? "Producto borrado."
            : `${removedItems.length} productos borrados.`}
        </span>
        <button
          className={styles.undoButton}
          type="button"
          onPointerDown={handleButtonPointerDown}
          onClick={handleUndoRemoveItems}
        >
          Deshacer
        </button>
      </li>
    );
  }

  function renderItems(
    sectionItems: ShoppingItem[],
    removedSectionItems: ShoppingItem[],
  ) {
    if (sectionItems.length === 0 && removedSectionItems.length === 0) {
      return <p className={styles.empty}>Sin productos.</p>;
    }

    const visibleItems = sortShoppingItemsForShopping(sectionItems);
    const sortedRemovedItems = [...removedSectionItems].sort(
      compareShoppingItemsForVisibleOrder,
    );
    const hasPendingItems = sectionItems.some((item) => !item.purchased);
    const hasPurchasedItems = sectionItems.some((item) => item.purchased);
    const shouldShowPurchasedDivider = hasPendingItems && hasPurchasedItems;
    let hasRenderedUndoItem = false;
    const listItems = visibleItems.flatMap((item, index) => {
      const isEditingItem = editingItemId === item.id;
      const itemContent = (
        <li
          ref={(itemElement) => {
            if (itemElement) {
              itemRefs.current[item.id] = itemElement;
            } else {
              delete itemRefs.current[item.id];
            }
          }}
          className={
            item.purchased
              ? `${styles.item} ${styles.itemPurchased}`
              : styles.item
          }
          aria-label={
            isEditingItem
              ? undefined
              : item.purchased
                ? `Devolver ${item.name} a pendientes`
                : `Marcar ${item.name} como comprado`
          }
          role={isEditingItem ? undefined : "button"}
          tabIndex={isEditingItem ? undefined : 0}
          key={item.id}
          onClick={
            isEditingItem
              ? undefined
              : () =>
                  setItems((currentItems) =>
                    toggleShoppingItem(currentItems, item.id),
                  )
          }
          onKeyDown={
            isEditingItem
              ? undefined
              : (event) => handleItemKeyDown(event, item.id)
          }
        >
          {shouldShowPurchasedDivider &&
          item.purchased &&
          !visibleItems[index - 1]?.purchased ? (
            <span className={styles.purchasedDivider}>Comprados</span>
          ) : null}
          {isEditingItem ? (
            <form
              className={styles.editForm}
              aria-label={`Editar ${item.name}`}
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => handleEditSubmit(event, item.id)}
            >
              <input
                className={styles.editInput}
                aria-label="Nombre del producto"
                autoComplete="off"
                autoFocus
                value={editingItemName}
                onChange={(event) => setEditingItemName(event.target.value)}
                type="text"
              />
              <select
                className={styles.editSelect}
                aria-label="Sección del producto"
                value={editingSectionId}
                onChange={(event) =>
                  setEditingSectionId(event.target.value as ShoppingSectionId)
                }
              >
                {shoppingSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
              <div className={styles.editActions}>
                <button
                  className={styles.iconButton}
                  type="submit"
                  aria-label="Guardar"
                  title="Guardar"
                  onPointerDown={handleButtonPointerDown}
                >
                  <Icon name="save" />
                </button>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label="Cancelar"
                  title="Cancelar"
                  onPointerDown={handleButtonPointerDown}
                  onClick={cancelEditing}
                >
                  <Icon name="close" />
                </button>
              </div>
            </form>
          ) : (
            <>
              <span
                className={
                  item.purchased
                    ? `${styles.itemCheck} ${styles.itemCheckPurchased}`
                    : styles.itemCheck
                }
                aria-hidden="true"
              >
                <Icon name="check" />
              </span>
              <span
                className={
                  item.purchased
                    ? `${styles.itemName} ${styles.itemNamePurchased}`
                    : styles.itemName
                }
              >
                {item.name}
              </span>
              <span className={styles.itemMeta}>
                Añadido por {getShoppingUserName(item.addedBy)}
              </span>
              <div className={styles.itemActions}>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label={`Editar ${item.name}`}
                  title="Editar"
                  onPointerDown={handleButtonPointerDown}
                  onClick={(event) => {
                    event.stopPropagation();
                    startEditing(item);
                  }}
                >
                  <Icon name="edit" />
                </button>
                <button
                  className={styles.iconButtonDanger}
                  type="button"
                  aria-label={`Eliminar ${item.name}`}
                  title="Eliminar"
                  onPointerDown={handleButtonPointerDown}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemoveItem(item.id);
                  }}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </>
          )}
        </li>
      );

      if (
        !hasRenderedUndoItem &&
        sortedRemovedItems.length > 0 &&
        compareShoppingItemsForVisibleOrder(sortedRemovedItems[0], item) < 0
      ) {
        hasRenderedUndoItem = true;

        return [renderUndoItem(sortedRemovedItems), itemContent];
      }

      return [itemContent];
    });

    if (!hasRenderedUndoItem && sortedRemovedItems.length > 0) {
      listItems.push(renderUndoItem(sortedRemovedItems));
    }

    return <ul className={styles.list}>{listItems}</ul>;
  }

  return (
    <main className={styles.app}>
      <section className={styles.header} aria-labelledby="app-title">
        <div>
          <p className={styles.kicker}>Lista de la compra</p>
          <h1 id="app-title">Jucart</h1>
        </div>
        <dl className={styles.summary} aria-label="Resumen de la lista">
          <div className={styles.summaryItem}>
            <dt>Pendientes</dt>
            <dd>{pendingCount}</dd>
          </div>
          <div className={styles.summaryItem}>
            <dt>Comprados</dt>
            <dd>{purchasedCount}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.commandPanel} aria-label="Añadir producto">
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formOptions}>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="section-id">
                Sección
              </label>
              <select
                id="section-id"
                className={styles.select}
                value={selectedSectionId}
                onChange={(event) =>
                  setSelectedSectionId(event.target.value as ShoppingSectionId)
                }
                disabled={!isLoaded}
              >
                {shoppingSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="user-id">
                Añadido por
              </label>
              <select
                id="user-id"
                className={styles.select}
                value={selectedUserId}
                onChange={(event) =>
                  setSelectedUserId(event.target.value as ShoppingUserId)
                }
                disabled={!isLoaded}
              >
                {shoppingUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="item-name">
              Producto
            </label>
            <div className={styles.addRow}>
              <input
                id="item-name"
                ref={itemNameInputRef}
                className={styles.input}
                autoComplete="off"
                autoFocus
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="Leche, pan, fruta..."
                type="text"
                disabled={!isLoaded}
              />
              <button
                className={styles.primaryButton}
                type="submit"
                onPointerDown={handleButtonPointerDown}
                disabled={!isLoaded}
              >
                Añadir
              </button>
            </div>
          </div>
        </form>

        <div className={styles.listActions}>
          <button
            className={styles.clearButton}
            type="button"
            aria-label="Borrar comprados"
            title="Borrar comprados"
            onPointerDown={handleButtonPointerDown}
            onClick={handleRemovePurchasedItems}
            disabled={!isLoaded || purchasedCount === 0}
          >
            <Icon name="trash" />
            <span>Comprados</span>
          </button>
        </div>
      </section>

      {!isLoaded ? (
        <p className={styles.status} role="status" aria-live="polite">
          Cargando lista...
        </p>
      ) : storageError ? (
        <p className={styles.error} role="alert">
          {storageError}
        </p>
      ) : null}

      <section
        ref={boardRef}
        className={styles.board}
        aria-label="Lista por secciones"
        onScroll={handleBoardScroll}
        tabIndex={0}
      >
        {shoppingSections.map((section) => {
          const sectionItems = items.filter(
            (item) => item.sectionId === section.id,
          );
          const removedSectionItems = lastRemovedItems.filter(
            (item) => item.sectionId === section.id,
          );
          const pendingCount = sectionItems.filter(
            (item) => !item.purchased,
          ).length;

          return (
            <article
              ref={(column) => {
                if (column) {
                  sectionColumnRefs.current[section.id] = column;
                }
              }}
              className={
                selectedSectionId === section.id
                  ? `${styles.column} ${styles.columnSelected}`
                  : styles.column
              }
              aria-current={
                selectedSectionId === section.id ? "true" : undefined
              }
              aria-labelledby={`section-${section.id}-title`}
              key={section.id}
              onClick={() => setSelectedSectionId(section.id)}
              onKeyDown={(event) => handleColumnKeyDown(event, section.id)}
              tabIndex={0}
            >
              <div className={styles.sectionHeader}>
                <h2 id={`section-${section.id}-title`}>{section.name}</h2>
                <span
                  className={styles.count}
                  aria-label={`${pendingCount} productos pendientes`}
                >
                  {pendingCount}
                </span>
              </div>
              {renderItems(sectionItems, removedSectionItems)}
            </article>
          );
        })}
      </section>
    </main>
  );
}
