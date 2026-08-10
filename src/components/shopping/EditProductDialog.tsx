import type {
  ChangeEvent,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
} from "react";

import styles from "../../App.module.scss";
import type {
  ShoppingItem,
  ShoppingSection,
  ShoppingSectionId,
} from "../../shoppingItems";

type EditProductDialogProps = {
  item: ShoppingItem;
  name: string;
  notes: string;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onCancel: () => void;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNotesChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onQuantityChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onQuantityFocus: (event: FocusEvent<HTMLInputElement>) => void;
  onSectionChange: (sectionId: ShoppingSectionId) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  quantity: string;
  sectionId: ShoppingSectionId;
  sections: ShoppingSection[];
};

export function EditProductDialog({
  item,
  name,
  notes,
  onButtonPointerDown,
  onCancel,
  onNameChange,
  onNotesChange,
  onQuantityChange,
  onQuantityFocus,
  onSectionChange,
  onSubmit,
  quantity,
  sectionId,
  sections,
}: EditProductDialogProps) {
  return (
    <div className={styles.modalBackdrop} onClick={onCancel}>
      <form
        className={`${styles.modal} ${styles.editModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-product-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event: KeyboardEvent<HTMLFormElement>) => {
          if (event.key === "Escape") onCancel();
        }}
        onSubmit={onSubmit}
      >
        <h2 id="edit-product-title">Editar {item.name}</h2>
        <div className={styles.modalForm}>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="edit-item-name">
              Producto
            </label>
            <input
              id="edit-item-name"
              className={styles.input}
              autoCapitalize="sentences"
              autoCorrect="on"
              autoFocus
              enterKeyHint="done"
              inputMode="text"
              spellCheck
              value={name}
              onChange={onNameChange}
              type="text"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="edit-item-notes">
              Notas (opcional)
            </label>
            <textarea
              id="edit-item-notes"
              className={styles.input}
              rows={2}
              value={notes}
              onChange={onNotesChange}
              placeholder="Aclaraciones, marca o formato..."
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="edit-item-quantity">
              Cantidad
            </label>
            <input
              id="edit-item-quantity"
              className={styles.input}
              autoCapitalize="none"
              autoCorrect="off"
              enterKeyHint="done"
              inputMode="text"
              spellCheck={false}
              value={quantity}
              onChange={onQuantityChange}
              onFocus={onQuantityFocus}
              placeholder="x2, 1 kg, 2 packs..."
              type="text"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="edit-section-id">
              Sección
            </label>
            <select
              id="edit-section-id"
              className={styles.select}
              value={sectionId}
              onChange={(event) =>
                onSectionChange(event.target.value as ShoppingSectionId)
              }
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>
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
            className={styles.primaryButton}
            type="submit"
            onPointerDown={onButtonPointerDown}
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
