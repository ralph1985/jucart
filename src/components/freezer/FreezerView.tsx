import type { MutableRefObject, PointerEvent, RefObject } from "react";

import styles from "../../App.module.scss";
import {
  freezerDrawers,
  getFreezerItemsByDrawer,
  type FreezerDrawerId,
  type FreezerItem,
} from "../../freezerItems";
import { Icon } from "../ui/Icon";

type FreezerViewProps = {
  formatAge: (frozenAt: number) => string;
  formatDate: (frozenAt: number) => string;
  getDrawerName: (drawerId: FreezerDrawerId) => string;
  itemRefs: MutableRefObject<Partial<Record<string, HTMLElement>>>;
  items: FreezerItem[];
  lastUsedItem: FreezerItem | null;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onEdit: (item: FreezerItem) => void;
  onMove: (itemId: string, drawerId: FreezerDrawerId) => void;
  onUndoUse: () => void;
  onUse: (itemId: string) => void;
  screenRef: RefObject<HTMLElement | null>;
  undoRef: RefObject<HTMLDivElement | null>;
  useFirstItems: FreezerItem[];
};

export function FreezerView({
  formatAge,
  formatDate,
  getDrawerName,
  itemRefs,
  items,
  lastUsedItem,
  onButtonPointerDown,
  onEdit,
  onMove,
  onUndoUse,
  onUse,
  screenRef,
  undoRef,
  useFirstItems,
}: FreezerViewProps) {
  function renderItems(itemsToRender: FreezerItem[]) {
    if (itemsToRender.length === 0) {
      return (
        <div className={styles.freezerEmpty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Icon name="freezer" />
          </span>
          <p className={styles.emptyTitle}>Sin productos</p>
          <p className={styles.emptyDescription}>
            Añade algo cuando guardes comida en el congelador.
          </p>
        </div>
      );
    }

    return (
      <ol className={styles.freezerList}>
        {itemsToRender.map((item) => {
          const availableDrawers = freezerDrawers.filter(
            (drawer) => drawer.id !== item.drawerId,
          );

          return (
            <li
              ref={(itemElement) => {
                if (itemElement) {
                  itemRefs.current[item.id] = itemElement;
                } else {
                  delete itemRefs.current[item.id];
                }
              }}
              className={styles.freezerItem}
              key={item.id}
            >
              <div className={styles.freezerItemBody}>
                <p className={styles.freezerItemName}>{item.name}</p>
                <p className={styles.freezerItemMeta}>
                  <span>{getDrawerName(item.drawerId)}</span>
                  <span>{formatDate(item.frozenAt)}</span>
                  <span>{formatAge(item.frozenAt)}</span>
                  {item.quantity ? <span>{item.quantity}</span> : null}
                </p>
              </div>
              <div className={styles.freezerItemActions}>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label={`Editar ${item.name}`}
                  title="Editar"
                  onPointerDown={onButtonPointerDown}
                  onClick={() => onEdit(item)}
                >
                  <Icon name="edit" />
                </button>
                {availableDrawers.map((drawer) => (
                  <button
                    className={styles.freezerMoveButton}
                    type="button"
                    key={drawer.id}
                    onPointerDown={onButtonPointerDown}
                    onClick={() => onMove(item.id, drawer.id)}
                  >
                    {drawer.name}
                  </button>
                ))}
                <button
                  className={styles.dangerButton}
                  type="button"
                  onPointerDown={onButtonPointerDown}
                  onClick={() => onUse(item.id)}
                >
                  Usado
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <section
      ref={screenRef}
      className={styles.freezerScreen}
      aria-labelledby="freezer-title"
    >
      <div className={styles.sectionsHeader}>
        <h2 id="freezer-title">Congelador</h2>
        <span className={styles.count}>{items.length}</span>
      </div>
      {lastUsedItem ? (
        <div ref={undoRef} className={styles.freezerUndo} role="status">
          <span>{lastUsedItem.name} usado.</span>
          <button
            className={styles.undoButton}
            type="button"
            onPointerDown={onButtonPointerDown}
            onClick={onUndoUse}
          >
            Deshacer
          </button>
        </div>
      ) : null}
      <section
        className={styles.freezerPanel}
        aria-labelledby="freezer-use-first-title"
      >
        <div className={styles.freezerPanelHeader}>
          <h3 id="freezer-use-first-title">Usar primero</h3>
          <span>{useFirstItems.length}</span>
        </div>
        {renderItems(useFirstItems)}
      </section>
      <div className={styles.freezerDrawers}>
        {freezerDrawers.map((drawer) => {
          const drawerItems = getFreezerItemsByDrawer(items, drawer.id);
          return (
            <section
              className={styles.freezerPanel}
              aria-labelledby={`freezer-drawer-${drawer.id}-title`}
              key={drawer.id}
            >
              <div className={styles.freezerPanelHeader}>
                <h3 id={`freezer-drawer-${drawer.id}-title`}>{drawer.name}</h3>
                <span>{drawerItems.length}</span>
              </div>
              {renderItems(drawerItems)}
            </section>
          );
        })}
      </div>
    </section>
  );
}
