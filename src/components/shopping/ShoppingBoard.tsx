import type {
  KeyboardEvent,
  MutableRefObject,
  PointerEvent,
  ReactNode,
} from "react";

import styles from "../../App.module.scss";
import type {
  ShoppingItem,
  ShoppingSection,
  ShoppingSectionColor,
  ShoppingSectionId,
} from "../../shoppingItems";

type ShoppingBoardProps = {
  activeSectionIndicatorRef: MutableRefObject<HTMLSpanElement | null>;
  boardRef: (element: HTMLElement | null) => void;
  isLoaded: boolean;
  items: ShoppingItem[];
  lastHiddenPurchasedItem: ShoppingItem | null;
  lastRemovedItems: ShoppingItem[];
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onColumnKeyDown: (
    event: KeyboardEvent<HTMLElement>,
    sectionId: ShoppingSectionId,
  ) => void;
  onSelectSection: (sectionId: ShoppingSectionId) => void;
  renderItems: (
    sectionItems: ShoppingItem[],
    removedSectionItems: ShoppingItem[],
    hiddenPurchasedItem: ShoppingItem | null,
    sectionColor: ShoppingSectionColor,
  ) => ReactNode;
  renderLoadingBoard: () => ReactNode;
  sectionColumnRefs: MutableRefObject<Partial<Record<string, HTMLElement>>>;
  sectionIndicatorRefs: MutableRefObject<
    Partial<Record<string, HTMLButtonElement>>
  >;
  sections: ShoppingSection[];
  selectedSectionId: ShoppingSectionId | null;
  shoppingBoardElementRef: MutableRefObject<HTMLElement | null>;
};

export function ShoppingBoard({
  activeSectionIndicatorRef,
  boardRef,
  isLoaded,
  items,
  lastHiddenPurchasedItem,
  lastRemovedItems,
  onButtonPointerDown,
  onColumnKeyDown,
  onSelectSection,
  renderItems,
  renderLoadingBoard,
  sectionColumnRefs,
  sectionIndicatorRefs,
  sections,
  selectedSectionId,
  shoppingBoardElementRef,
}: ShoppingBoardProps) {
  return (
    <>
      <section
        id="shopping-board"
        ref={(boardElement) => {
          shoppingBoardElementRef.current = boardElement;
          boardRef(boardElement);
        }}
        className={styles.board}
        aria-label="Lista por secciones"
        tabIndex={0}
      >
        <div className={styles.boardTrack}>
          {!isLoaded
            ? renderLoadingBoard()
            : sections.map((section) => {
                const sectionItems = items.filter(
                  (item) => item.sectionId === section.id,
                );
                const removedSectionItems = lastRemovedItems.filter(
                  (item) => item.sectionId === section.id,
                );
                const hiddenPurchasedSectionItem =
                  lastHiddenPurchasedItem?.sectionId === section.id
                    ? lastHiddenPurchasedItem
                    : null;
                const pendingCount = sectionItems.filter(
                  (item) => !item.purchased,
                ).length;

                return (
                  <article
                    ref={(column) => {
                      if (column) {
                        sectionColumnRefs.current[section.id] = column;
                      } else {
                        delete sectionColumnRefs.current[section.id];
                      }
                    }}
                    className={
                      selectedSectionId === section.id
                        ? `${styles.column} ${styles[`sectionColor${section.color}`]} ${styles.columnSelected}`
                        : `${styles.column} ${styles[`sectionColor${section.color}`]}`
                    }
                    aria-current={
                      selectedSectionId === section.id ? "true" : undefined
                    }
                    aria-labelledby={`section-${section.id}-title`}
                    key={section.id}
                    onClick={() => onSelectSection(section.id)}
                    onKeyDown={(event) => onColumnKeyDown(event, section.id)}
                    tabIndex={0}
                  >
                    <div className={styles.sectionHeader}>
                      <h2 id={`section-${section.id}-title`}>
                        <span>{section.name}</span>
                        <span className={styles.count} aria-hidden="true">
                          · {pendingCount}
                        </span>
                      </h2>
                      <span className={styles.visuallyHidden}>
                        {pendingCount} productos pendientes
                      </span>
                    </div>
                    {renderItems(
                      sectionItems,
                      removedSectionItems,
                      hiddenPurchasedSectionItem,
                      section.color,
                    )}
                  </article>
                );
              })}
        </div>
      </section>
      {isLoaded ? (
        <nav
          className={styles.sectionIndicators}
          aria-label="Listas disponibles"
        >
          {sections.map((section) => (
            <button
              ref={(indicator) => {
                if (indicator) {
                  sectionIndicatorRefs.current[section.id] = indicator;
                } else {
                  delete sectionIndicatorRefs.current[section.id];
                }
              }}
              className={
                selectedSectionId === section.id
                  ? styles.sectionIndicatorActive
                  : styles.sectionIndicator
              }
              type="button"
              aria-current={
                selectedSectionId === section.id ? "true" : undefined
              }
              aria-label={`Ver lista ${section.name}`}
              key={section.id}
              onPointerDown={onButtonPointerDown}
              onClick={() => onSelectSection(section.id)}
            />
          ))}
          <span
            ref={activeSectionIndicatorRef}
            className={styles.sectionIndicatorThumb}
            aria-hidden="true"
          />
        </nav>
      ) : (
        <div className={styles.sectionIndicators} aria-hidden="true">
          {[0, 1, 2].map((indicatorIndex) => (
            <span className={styles.loadingIndicator} key={indicatorIndex} />
          ))}
        </div>
      )}
    </>
  );
}
