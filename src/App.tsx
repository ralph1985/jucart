import {
  FormEvent,
  KeyboardEvent,
  UIEvent,
  useEffect,
  useRef,
  useState,
} from "react";

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
  const itemNameInputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLElement>(null);
  const sectionColumnRefs = useRef<
    Partial<Record<ShoppingSectionId, HTMLElement>>
  >({});
  const programmaticScrollTimeoutRef = useRef<number | null>(null);
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

    if (
      !board ||
      !selectedColumn ||
      typeof selectedColumn.scrollIntoView !== "function" ||
      board.scrollWidth <= board.clientWidth
    ) {
      return;
    }

    if (programmaticScrollTimeoutRef.current) {
      window.clearTimeout(programmaticScrollTimeoutRef.current);
    }

    programmaticScrollTimeoutRef.current = window.setTimeout(() => {
      programmaticScrollTimeoutRef.current = null;
    }, 500);

    selectedColumn.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [selectedSectionId]);

  useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current) {
        window.clearTimeout(programmaticScrollTimeoutRef.current);
      }
    };
  }, []);

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

    setItems((currentItems) => removePurchasedShoppingItems(currentItems));
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

  function renderItems(sectionItems: ShoppingItem[]) {
    if (sectionItems.length === 0) {
      return <p className={styles.empty}>Sin productos.</p>;
    }

    const visibleItems = sortShoppingItemsForShopping(sectionItems);
    const hasPendingItems = sectionItems.some((item) => !item.purchased);
    const hasPurchasedItems = sectionItems.some((item) => item.purchased);
    const shouldShowPurchasedDivider = hasPendingItems && hasPurchasedItems;

    return (
      <ul className={styles.list}>
        {visibleItems.map((item, index) => (
          <li
            className={
              item.purchased
                ? `${styles.item} ${styles.itemPurchased}`
                : styles.item
            }
            key={item.id}
          >
            {shouldShowPurchasedDivider &&
            item.purchased &&
            !visibleItems[index - 1]?.purchased ? (
              <span className={styles.purchasedDivider}>Comprados</span>
            ) : null}
            {editingItemId === item.id ? (
              <form
                className={styles.editForm}
                aria-label={`Editar ${item.name}`}
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
                  >
                    <Icon name="save" />
                  </button>
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Cancelar"
                    title="Cancelar"
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
                    aria-label={
                      item.purchased
                        ? `Devolver ${item.name} a pendientes`
                        : `Marcar ${item.name} como comprado`
                    }
                    title={item.purchased ? "Pendiente" : "Comprado"}
                    onClick={() =>
                      setItems((currentItems) =>
                        toggleShoppingItem(currentItems, item.id),
                      )
                    }
                  >
                    <Icon name={item.purchased ? "undo" : "check"} />
                  </button>
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label={`Editar ${item.name}`}
                    title="Editar"
                    onClick={() => startEditing(item)}
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    className={styles.iconButtonDanger}
                    type="button"
                    aria-label={`Eliminar ${item.name}`}
                    title="Eliminar"
                    onClick={() =>
                      setItems((currentItems) =>
                        removeShoppingItem(currentItems, item.id),
                      )
                    }
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className={styles.app}>
      <section className={styles.header} aria-labelledby="app-title">
        <p className={styles.kicker}>Lista de la compra</p>
        <h1 id="app-title">Jucart</h1>
      </section>

      <form className={styles.form} onSubmit={handleSubmit}>
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
            disabled={!isLoaded}
          >
            Añadir
          </button>
        </div>
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
      </form>

      <section className={styles.listActions} aria-label="Acciones de lista">
        <button
          className={styles.iconButtonDanger}
          type="button"
          aria-label="Borrar comprados"
          title="Borrar comprados"
          onClick={handleRemovePurchasedItems}
          disabled={!isLoaded || purchasedCount === 0}
        >
          <Icon name="trash" />
        </button>
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
              {renderItems(sectionItems)}
            </article>
          );
        })}
      </section>
    </main>
  );
}
