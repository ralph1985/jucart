import type {
  KeyboardEventHandler,
  PointerEventHandler,
  RefObject,
} from "react";

import styles from "../../App.module.scss";
import type { ShoppingItem } from "../../shoppingItems";

type ClearPurchasedDialogProps = {
  isOpen: boolean;
  dialogRef: RefObject<HTMLDivElement | null>;
  description: string;
  items: ShoppingItem[];
  confirmLabel: string;
  getUserName: (item: ShoppingItem) => string;
  onCancel: () => void;
  onConfirm: () => void;
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
};

export function ClearPurchasedDialog({
  isOpen,
  dialogRef,
  description,
  items,
  confirmLabel,
  getUserName,
  onCancel,
  onConfirm,
  onButtonPointerDown,
}: ClearPurchasedDialogProps) {
  if (!isOpen) {
    return null;
  }

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onCancel}>
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-purchased-title"
        aria-describedby="clear-purchased-description"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 id="clear-purchased-title">Borrar comprados</h2>
        <p id="clear-purchased-description">{description}</p>
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
            onPointerDown={onButtonPointerDown}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className={styles.dangerButton}
            type="button"
            onPointerDown={onButtonPointerDown}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
