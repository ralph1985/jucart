import type { PointerEventHandler, RefObject } from "react";

import styles from "../../App.module.scss";
import type { ShoppingItem } from "../../shoppingItems";
import { BottomSheetFrame } from "../ui/BottomSheetFrame";

type ClearPurchasedDialogProps = {
  isOpen: boolean;
  backdropRef: RefObject<HTMLDivElement | null>;
  description: string;
  items: ShoppingItem[];
  confirmLabel: string;
  getUserName: (item: ShoppingItem) => string;
  onCancel: () => void;
  onConfirm: () => void;
  onDragEnd: PointerEventHandler<HTMLDivElement>;
  onDragMove: PointerEventHandler<HTMLDivElement>;
  onDragStart: PointerEventHandler<HTMLDivElement>;
  sheetRef: RefObject<HTMLElement | null>;
  dragOffset: number;
};

export function ClearPurchasedDialog({
  isOpen,
  backdropRef,
  description,
  items,
  confirmLabel,
  getUserName,
  onCancel,
  onConfirm,
  onDragEnd,
  onDragMove,
  onDragStart,
  sheetRef,
  dragOffset,
}: ClearPurchasedDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <BottomSheetFrame
      ariaDescribedBy="clear-purchased-description"
      ariaLabelledBy="clear-purchased-title"
      backdropRef={backdropRef}
      dragOffset={dragOffset}
      onClose={onCancel}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      onDragStart={onDragStart}
      sheetRef={sheetRef}
      title="Borrar comprados"
      subtitle={description}
      className={styles.clearPurchasedSheet}
    >
      <ul
        className={styles.clearPurchasedList}
        aria-label="Productos comprados que se borrarán"
      >
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <span>{getUserName(item)}</span>
          </li>
        ))}
      </ul>
      <div className={styles.modalActions}>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className={styles.dangerButton}
          type="button"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </BottomSheetFrame>
  );
}
