import type { ChangeEventHandler, PointerEventHandler, RefObject } from "react";

import styles from "../../App.module.scss";
import { Icon } from "../ui/Icon";

type ShoppingControlsProps = {
  controlsRef: RefObject<HTMLElement | null>;
  isLoaded: boolean;
  query: string;
  showPurchasedItems: boolean;
  canClearPurchasedItems: boolean;
  onQueryChange: ChangeEventHandler<HTMLInputElement>;
  onClearQuery: () => void;
  onShowPurchasedItemsChange: ChangeEventHandler<HTMLInputElement>;
  onClearPurchasedItems: () => void;
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
};

export function ShoppingControls({
  controlsRef,
  isLoaded,
  query,
  showPurchasedItems,
  canClearPurchasedItems,
  onQueryChange,
  onClearQuery,
  onShowPurchasedItemsChange,
  onClearPurchasedItems,
  onButtonPointerDown,
}: ShoppingControlsProps) {
  return (
    <section
      id="shopping-controls"
      ref={controlsRef}
      className={styles.commandPanel}
      aria-label="Controles de lista"
    >
      <div className={styles.form}>
        <label className={styles.searchField}>
          <span className={styles.visuallyHidden}>Buscar productos</span>
          <span className={styles.searchIcon} aria-hidden="true">
            <Icon name="search" />
          </span>
          <input
            value={query}
            onChange={onQueryChange}
            type="search"
            placeholder="Buscar productos"
            disabled={!isLoaded}
          />
          {query ? (
            <button
              className={styles.searchClearButton}
              type="button"
              aria-label="Limpiar búsqueda"
              title="Limpiar búsqueda"
              onPointerDown={onButtonPointerDown}
              onClick={onClearQuery}
            >
              <Icon name="close" />
            </button>
          ) : null}
        </label>
        <div className={styles.addRow}>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="Borrar comprados"
            title="Borrar comprados"
            onPointerDown={onButtonPointerDown}
            onClick={onClearPurchasedItems}
            disabled={!isLoaded || !canClearPurchasedItems}
          >
            <Icon name="trash" />
          </button>
          <label className={styles.visibilityToggle}>
            <input
              checked={showPurchasedItems}
              onChange={onShowPurchasedItemsChange}
              type="checkbox"
              disabled={!isLoaded}
            />
            <span>Comprados</span>
          </label>
        </div>
      </div>
    </section>
  );
}
