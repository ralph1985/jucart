import type { MutableRefObject, PointerEvent, RefObject } from "react";

import styles from "../../App.module.scss";
import {
  compareShoppingItemsForShopping,
  getShoppingCategoryName,
  getShoppingItemCategoryId,
  sortShoppingItemsForShopping,
  type CanonicalProductComparisonUnit,
  type ShoppingCategory,
  type ShoppingItem,
  type ShoppingPriceObservation,
  type ShoppingProductCatalogEntry,
  type ShoppingSectionColor,
  type ShoppingUserId,
} from "../../shoppingItems";
import { Icon } from "../ui/Icon";

type ProductPriceSummary = {
  averagePrice: number;
  comparisonUnit: CanonicalProductComparisonUnit;
  latestPrice: number;
  observationCount: number;
};

type ProductPriceCardSummary = {
  bestExternalObservation: ShoppingPriceObservation | null;
  ticketSummary: ProductPriceSummary | null;
};

type ShoppingItemsListProps = {
  categories: ShoppingCategory[];
  formatPrice: (value: number, unit: CanonicalProductComparisonUnit) => string;
  formatQuantity: (quantity: string) => string;
  getUserName: (userId: ShoppingUserId) => string;
  hiddenPurchasedItem: ShoppingItem | null;
  hiddenUndoRef: RefObject<HTMLLIElement | null>;
  highlightedItemId: string | null;
  isSearchActive: boolean;
  itemRefs: MutableRefObject<Partial<Record<string, HTMLElement>>>;
  normalizedSearchQuery: string;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onEdit: (item: ShoppingItem) => void;
  onOpenPrice: (item: ShoppingItem) => void;
  onRemove: (itemId: string) => void;
  onToggle: (itemId: string) => void;
  onUndoHiddenPurchased: () => void;
  onUndoRemoved: () => void;
  priceSummaries: Map<string, ProductPriceCardSummary>;
  productCatalogEntries: ShoppingProductCatalogEntry[];
  removedItems: ShoppingItem[];
  sectionColor: ShoppingSectionColor;
  sectionItems: ShoppingItem[];
  showPurchasedItems: boolean;
  undoRef: RefObject<HTMLLIElement | null>;
};

function normalizeSearchQuery(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-ES")
    .trim();
}

export function ShoppingItemsList({
  categories,
  formatPrice,
  formatQuantity,
  getUserName,
  hiddenPurchasedItem,
  hiddenUndoRef,
  highlightedItemId,
  isSearchActive,
  itemRefs,
  normalizedSearchQuery,
  onButtonPointerDown,
  onEdit,
  onOpenPrice,
  onRemove,
  onToggle,
  onUndoHiddenPurchased,
  onUndoRemoved,
  priceSummaries,
  productCatalogEntries,
  removedItems,
  sectionColor,
  sectionItems,
  showPurchasedItems,
  undoRef,
}: ShoppingItemsListProps) {
  const renderedSectionItems = (
    showPurchasedItems
      ? sectionItems
      : sectionItems.filter((item) => !item.purchased)
  ).filter((item) =>
    isSearchActive
      ? normalizeSearchQuery(item.name).includes(normalizedSearchQuery)
      : true,
  );

  function renderRemovedUndo(items: ShoppingItem[]) {
    return (
      <li ref={undoRef} className={styles.undoItem} key={`undo-${items[0].id}`}>
        <span>
          {items.length === 1
            ? "Producto borrado."
            : `${items.length} productos borrados.`}
        </span>
        <button
          className={styles.undoButton}
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onUndoRemoved}
        >
          Deshacer
        </button>
      </li>
    );
  }

  function renderHiddenPurchasedUndo(item: ShoppingItem) {
    return (
      <li
        ref={hiddenUndoRef}
        className={styles.undoItem}
        key={`hidden-purchased-${item.id}`}
      >
        <span>Producto marcado como comprado.</span>
        <button
          className={styles.undoButton}
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onUndoHiddenPurchased}
        >
          Deshacer
        </button>
      </li>
    );
  }

  if (
    renderedSectionItems.length === 0 &&
    removedItems.length === 0 &&
    !hiddenPurchasedItem
  ) {
    return (
      <div
        className={`${styles.empty} ${styles[`shoppingListColor${sectionColor}`]}`}
      >
        <span className={styles.emptyIcon} aria-hidden="true">
          <Icon name="list" />
        </span>
        <p className={styles.emptyTitle}>
          {isSearchActive ? "No hay coincidencias" : "No hay productos"}
        </p>
        <p className={styles.emptyDescription}>
          {isSearchActive
            ? "No hay coincidencias con la búsqueda."
            : sectionItems.length === 0
              ? "Añade el primero usando el formulario superior."
              : "Los productos comprados están ocultos."}
        </p>
      </div>
    );
  }

  const visibleItems = sortShoppingItemsForShopping(
    renderedSectionItems,
    categories,
    productCatalogEntries,
  );
  const sortedRemovedItems = [...removedItems].sort((firstItem, secondItem) =>
    compareShoppingItemsForShopping(
      firstItem,
      secondItem,
      categories,
      productCatalogEntries,
    ),
  );
  const hasPendingItems = sectionItems.some((item) => !item.purchased);
  const hasPurchasedItems = sectionItems.some((item) => item.purchased);
  const shouldShowPurchasedDivider = hasPendingItems && hasPurchasedItems;
  const undoInsertionIndex = sortedRemovedItems.length
    ? visibleItems.findIndex(
        (item) =>
          compareShoppingItemsForShopping(
            sortedRemovedItems[0],
            item,
            categories,
            productCatalogEntries,
          ) < 0,
      )
    : -1;
  const hiddenPurchasedUndoInsertionIndex = hiddenPurchasedItem
    ? visibleItems.findIndex(
        (item) =>
          compareShoppingItemsForShopping(
            hiddenPurchasedItem,
            item,
            categories,
            productCatalogEntries,
          ) < 0,
      )
    : -1;
  const listItems = visibleItems.flatMap((item, index) => {
    const itemCategoryId = getShoppingItemCategoryId(
      item,
      productCatalogEntries,
    );
    const previousItem = visibleItems[index - 1];
    const shouldRenderCategoryDivider =
      !previousItem ||
      previousItem.purchased !== item.purchased ||
      getShoppingItemCategoryId(previousItem, productCatalogEntries) !==
        itemCategoryId;
    const shouldRenderPurchasedDivider =
      shouldShowPurchasedDivider &&
      item.purchased &&
      !visibleItems[index - 1]?.purchased;
    const itemPriceSummary = item.canonicalProductId
      ? priceSummaries.get(item.canonicalProductId)
      : null;
    const itemTicketPriceSummary = itemPriceSummary?.ticketSummary ?? null;
    const itemBestExternalPrice =
      itemPriceSummary?.bestExternalObservation ?? null;
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
            ? `${styles.item} ${styles.itemPurchased} ${
                highlightedItemId === item.id ? styles.itemHighlighted : ""
              }`
            : `${styles.item} ${
                highlightedItemId === item.id ? styles.itemHighlighted : ""
              }`
        }
        key={item.id}
        tabIndex={highlightedItemId === item.id ? -1 : undefined}
      >
        <button
          className={
            item.purchased
              ? `${styles.itemCheck} ${styles.itemCheckPurchased}`
              : styles.itemCheck
          }
          type="button"
          aria-label={
            item.purchased
              ? `Devolver ${item.name} a pendientes`
              : `Marcar ${item.name} como comprado`
          }
          title={item.purchased ? "Devolver a pendientes" : "Marcar comprado"}
          onClick={() => onToggle(item.id)}
        >
          <Icon name="check" />
        </button>
        <span
          className={
            item.purchased
              ? `${styles.itemName} ${styles.itemNamePurchased}`
              : styles.itemName
          }
        >
          {item.name}
          {item.quantity ? (
            <span className={styles.itemQuantity}>
              {formatQuantity(item.quantity)}
            </span>
          ) : null}
          {item.notes ? (
            <span className={styles.itemNotes}>{item.notes}</span>
          ) : null}
        </span>
        {itemTicketPriceSummary || itemBestExternalPrice ? (
          <span
            className={styles.itemPriceSummary}
            aria-label={[
              itemTicketPriceSummary
                ? `Último precio real ${formatPrice(
                    itemTicketPriceSummary.latestPrice,
                    itemTicketPriceSummary.comparisonUnit,
                  )}, media real ${formatPrice(
                    itemTicketPriceSummary.averagePrice,
                    itemTicketPriceSummary.comparisonUnit,
                  )}`
                : null,
              itemBestExternalPrice
                ? `Mejor precio externo ${formatPrice(
                    itemBestExternalPrice.observedPrice,
                    itemBestExternalPrice.comparisonUnit,
                  )}`
                : null,
            ]
              .filter(Boolean)
              .join(", ")}
            title={
              itemTicketPriceSummary
                ? `${itemTicketPriceSummary.observationCount} ${
                    itemTicketPriceSummary.observationCount === 1
                      ? "observación real"
                      : "observaciones reales"
                  }`
                : "Solo precio externo"
            }
          >
            {itemTicketPriceSummary ? (
              <>
                <span>
                  Últ.{" "}
                  {formatPrice(
                    itemTicketPriceSummary.latestPrice,
                    itemTicketPriceSummary.comparisonUnit,
                  )}
                </span>
                <span>
                  Media{" "}
                  {formatPrice(
                    itemTicketPriceSummary.averagePrice,
                    itemTicketPriceSummary.comparisonUnit,
                  )}
                </span>
              </>
            ) : null}
            {itemBestExternalPrice ? (
              <span className={styles.itemExternalPrice}>
                Ext.{" "}
                {formatPrice(
                  itemBestExternalPrice.observedPrice,
                  itemBestExternalPrice.comparisonUnit,
                )}
              </span>
            ) : null}
            <button
              className={styles.itemPriceDetailButton}
              type="button"
              aria-label={`Ver precios de ${item.name}`}
              title="Ver precios"
              onPointerDown={onButtonPointerDown}
              onClick={(event) => {
                event.stopPropagation();
                onOpenPrice(item);
              }}
            >
              <Icon name="history" />
            </button>
          </span>
        ) : null}
        <span className={styles.itemMeta}>{getUserName(item.addedBy)}</span>
        <div className={styles.itemActions}>
          <button
            className={styles.iconButton}
            type="button"
            aria-label={`Editar ${item.name}`}
            title="Editar"
            onPointerDown={onButtonPointerDown}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(item);
            }}
          >
            <Icon name="edit" />
          </button>
          <button
            className={styles.iconButtonDanger}
            type="button"
            aria-label={`Eliminar ${item.name}`}
            title="Eliminar"
            onPointerDown={onButtonPointerDown}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(item.id);
            }}
          >
            <Icon name="trash" />
          </button>
        </div>
      </li>
    );
    const purchasedDivider = shouldRenderPurchasedDivider ? (
      <li className={styles.purchasedDivider} key="purchased-divider">
        Comprados
      </li>
    ) : null;
    const categoryDivider = shouldRenderCategoryDivider ? (
      <li
        className={styles.categoryDivider}
        key={`${item.purchased ? "purchased" : "pending"}-${itemCategoryId}`}
      >
        {getShoppingCategoryName(itemCategoryId, categories)}
      </li>
    ) : null;
    const shouldRenderUndoItem = index === undoInsertionIndex;
    const shouldRenderHiddenPurchasedUndoItem =
      index === hiddenPurchasedUndoInsertionIndex;

    if (shouldRenderUndoItem) {
      return sortedRemovedItems[0].purchased
        ? [
            purchasedDivider,
            categoryDivider,
            renderRemovedUndo(sortedRemovedItems),
            itemContent,
          ]
        : [
            renderRemovedUndo(sortedRemovedItems),
            purchasedDivider,
            categoryDivider,
            itemContent,
          ];
    }

    if (shouldRenderHiddenPurchasedUndoItem) {
      return [
        renderHiddenPurchasedUndo(hiddenPurchasedItem!),
        purchasedDivider,
        categoryDivider,
        itemContent,
      ];
    }

    return [purchasedDivider, categoryDivider, itemContent];
  });

  if (undoInsertionIndex === -1 && sortedRemovedItems.length > 0) {
    listItems.push(renderRemovedUndo(sortedRemovedItems));
  }

  if (hiddenPurchasedItem && hiddenPurchasedUndoInsertionIndex === -1) {
    listItems.push(renderHiddenPurchasedUndo(hiddenPurchasedItem));
  }

  return (
    <ul
      className={`${styles.list} ${styles[`shoppingListColor${sectionColor}`]}`}
    >
      {listItems}
    </ul>
  );
}
