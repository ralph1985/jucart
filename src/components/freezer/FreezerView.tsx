import type { ReactNode, RefObject } from "react";

import styles from "../../App.module.scss";
import {
  freezerDrawers,
  getFreezerItemsByDrawer,
  type FreezerItem,
} from "../../freezerItems";

type FreezerViewProps = {
  screenRef: RefObject<HTMLElement | null>;
  items: FreezerItem[];
  useFirstItems: FreezerItem[];
  undo: ReactNode;
  renderItems: (items: FreezerItem[]) => ReactNode;
};

export function FreezerView({
  screenRef,
  items,
  useFirstItems,
  undo,
  renderItems,
}: FreezerViewProps) {
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
      {undo}
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
