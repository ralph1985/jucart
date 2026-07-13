import { FormEvent, useMemo, useState } from "react";

import styles from "./App.module.scss";
import {
  addShoppingItem,
  removeShoppingItem,
  ShoppingItem,
  toggleShoppingItem,
} from "./shoppingItems";

export function App() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [itemName, setItemName] = useState("");

  const pendingItems = useMemo(
    () => items.filter((item) => !item.purchased),
    [items],
  );
  const purchasedItems = useMemo(
    () => items.filter((item) => item.purchased),
    [items],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setItems((currentItems) => addShoppingItem(currentItems, itemName));
    setItemName("");
  }

  function renderItems(sectionItems: ShoppingItem[], emptyMessage: string) {
    if (sectionItems.length === 0) {
      return <p className={styles.empty}>{emptyMessage}</p>;
    }

    return (
      <ul className={styles.list}>
        {sectionItems.map((item) => (
          <li className={styles.item} key={item.id}>
            <span className={styles.itemName}>{item.name}</span>
            <div className={styles.itemActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() =>
                  setItems((currentItems) =>
                    toggleShoppingItem(currentItems, item.id),
                  )
                }
              >
                {item.purchased ? "Pendiente" : "Comprado"}
              </button>
              <button
                className={styles.dangerButton}
                type="button"
                onClick={() =>
                  setItems((currentItems) =>
                    removeShoppingItem(currentItems, item.id),
                  )
                }
              >
                Eliminar
              </button>
            </div>
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
          />
          <button className={styles.primaryButton} type="submit">
            Añadir
          </button>
        </div>
      </form>

      <section className={styles.section} aria-labelledby="pending-title">
        <div className={styles.sectionHeader}>
          <h2 id="pending-title">Pendientes</h2>
          <span className={styles.count}>{pendingItems.length}</span>
        </div>
        {renderItems(pendingItems, "No hay productos pendientes.")}
      </section>

      <section className={styles.section} aria-labelledby="purchased-title">
        <div className={styles.sectionHeader}>
          <h2 id="purchased-title">Comprados</h2>
          <span className={styles.count}>{purchasedItems.length}</span>
        </div>
        {renderItems(purchasedItems, "No hay productos comprados.")}
      </section>
    </main>
  );
}
