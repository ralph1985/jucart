import { FormEvent, useEffect, useState } from "react";

import styles from "./App.module.scss";
import {
  addShoppingItem,
  removeShoppingItem,
  ShoppingItem,
  ShoppingSectionId,
  shoppingSections,
  toggleShoppingItem,
  updateShoppingItem,
} from "./shoppingItems";
import {
  getStoredShoppingItems,
  replaceStoredShoppingItems,
} from "./shoppingItemsDb";

export function App() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [itemName, setItemName] = useState("");
  const [selectedSectionId, setSelectedSectionId] =
    useState<ShoppingSectionId>("mercadona");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingSectionId, setEditingSectionId] =
    useState<ShoppingSectionId>("mercadona");
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setItems((currentItems) =>
      addShoppingItem(currentItems, itemName, selectedSectionId),
    );
    setItemName("");
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

  function renderItems(sectionItems: ShoppingItem[]) {
    if (sectionItems.length === 0) {
      return <p className={styles.empty}>Sin productos.</p>;
    }

    return (
      <ul className={styles.list}>
        {sectionItems.map((item) => (
          <li className={styles.item} key={item.id}>
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
                  <button className={styles.secondaryButton} type="submit">
                    Guardar
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={cancelEditing}
                  >
                    Cancelar
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
                <div className={styles.itemActions}>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    aria-label={
                      item.purchased
                        ? `Devolver ${item.name} a pendientes`
                        : `Marcar ${item.name} como comprado`
                    }
                    onClick={() =>
                      setItems((currentItems) =>
                        toggleShoppingItem(currentItems, item.id),
                      )
                    }
                  >
                    {item.purchased ? "Pendiente" : "Comprado"}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    aria-label={`Editar ${item.name}`}
                    onClick={() => startEditing(item)}
                  >
                    Editar
                  </button>
                  <button
                    className={styles.dangerButton}
                    type="button"
                    aria-label={`Eliminar ${item.name}`}
                    onClick={() =>
                      setItems((currentItems) =>
                        removeShoppingItem(currentItems, item.id),
                      )
                    }
                  >
                    Eliminar
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
      </form>

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
        className={styles.board}
        aria-label="Lista por secciones"
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
            <article className={styles.column} key={section.id}>
              <div className={styles.sectionHeader}>
                <h2>{section.name}</h2>
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
