import type {
  ChangeEvent,
  CSSProperties,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  Ref,
  RefObject,
} from "react";

import styles from "../../App.module.scss";
import { BottomSheetFrame } from "../ui/BottomSheetFrame";
import type {
  QuickShoppingItemSuggestion,
  ShoppingCategory,
  ShoppingSection,
  ShoppingSectionId,
} from "../../shoppingItems";

type AddProductNotice =
  | { type: "success" | "error"; message: string }
  | { type: "duplicate"; itemId: string; message: string };

type AddProductSheetProps = {
  categories: ShoppingCategory[];
  itemName: string;
  itemNameInputRef: RefObject<HTMLTextAreaElement | null>;
  keyboardInset: number;
  notice: AddProductNotice | null;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onClose: () => void;
  onDragEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onDragMove: (event: PointerEvent<HTMLDivElement>) => void;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  onItemNameChange: (value: string) => void;
  onItemNameKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onNotesChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onQuantityFocus: (event: FocusEvent<HTMLInputElement>) => void;
  onQuickSuggestion: (name: string) => void;
  onSectionChange: (sectionId: ShoppingSectionId) => void;
  onSheetKeyDown: (event: KeyboardEvent<HTMLFormElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onViewDuplicate: (itemId: string) => void;
  quantity: string;
  quickSuggestions: QuickShoppingItemSuggestion[];
  notes: string;
  sections: ShoppingSection[];
  selectedSectionId: ShoppingSectionId;
  sheetDragOffset: number;
  sheetRef: Ref<HTMLElement>;
  backdropRef: Ref<HTMLDivElement>;
  isLoaded: boolean;
  getCategoryName: (
    categoryId: string,
    categories: ShoppingCategory[],
  ) => string;
};

export function AddProductSheet({
  backdropRef,
  categories,
  getCategoryName,
  isLoaded,
  itemName,
  itemNameInputRef,
  keyboardInset,
  notice,
  notes,
  onButtonPointerDown,
  onClose,
  onDragEnd,
  onDragMove,
  onDragStart,
  onItemNameChange,
  onItemNameKeyDown,
  onNotesChange,
  onQuantityChange,
  onQuantityFocus,
  onQuickSuggestion,
  onSectionChange,
  onSheetKeyDown,
  onSubmit,
  onViewDuplicate,
  quantity,
  quickSuggestions,
  sections,
  selectedSectionId,
  sheetDragOffset,
  sheetRef,
}: AddProductSheetProps) {
  return (
    <BottomSheetFrame
      ariaLabelledBy="add-sheet-title"
      backdropRef={backdropRef}
      className={styles.addProductSheetFrame}
      dragOffset={sheetDragOffset}
      handleLabel="Cerrar panel de alta"
      onClose={onClose}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      onDragStart={onDragStart}
      sheetRef={sheetRef}
      style={
        { "--sheet-keyboard-inset": `${keyboardInset}px` } as CSSProperties
      }
      title="Añadir producto"
      subtitle="Añade rápido y déjalo listo para tu próxima compra."
    >
      <form onKeyDown={onSheetKeyDown} onSubmit={onSubmit}>
        <div className={styles.addSheetFields}>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="item-name">
              Producto
            </label>
            <textarea
              id="item-name"
              ref={itemNameInputRef}
              className={styles.addSheetInput}
              autoCapitalize="sentences"
              autoCorrect="on"
              enterKeyHint="done"
              inputMode="text"
              rows={1}
              spellCheck
              value={itemName}
              onChange={(event) => onItemNameChange(event.target.value)}
              onInput={(event) => onItemNameChange(event.currentTarget.value)}
              onKeyDown={onItemNameKeyDown}
              onKeyUp={(event) => onItemNameChange(event.currentTarget.value)}
              placeholder="¿Qué necesitas comprar?"
              disabled={!isLoaded}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="item-notes">
              Notas (opcional)
            </label>
            <textarea
              id="item-notes"
              className={styles.input}
              rows={2}
              value={notes}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                onNotesChange(event.target.value)
              }
              placeholder="Aclaraciones, marca o formato..."
              disabled={!isLoaded}
            />
          </div>
          <div className={styles.addSheetSelectors}>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="sheet-section-id">
                Supermercado
              </label>
              <select
                id="sheet-section-id"
                className={styles.select}
                value={selectedSectionId}
                onChange={(event) =>
                  onSectionChange(event.target.value as ShoppingSectionId)
                }
                disabled={!isLoaded}
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="item-quantity">
                Cantidad
              </label>
              <input
                id="item-quantity"
                className={styles.select}
                autoCapitalize="none"
                autoCorrect="off"
                enterKeyHint="done"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
                onFocus={onQuantityFocus}
                disabled={!isLoaded}
                type="text"
              />
            </div>
          </div>
        </div>
        <div
          className={styles.addSheetSuggestions}
          role="listbox"
          aria-label="Sugerencias de productos"
        >
          {quickSuggestions.map((suggestion) => (
            <button
              className={styles.addSheetSuggestion}
              key={`${suggestion.categoryId}-${suggestion.name}`}
              type="button"
              role="option"
              aria-selected="false"
              title={getCategoryName(suggestion.categoryId, categories)}
              onPointerDown={(event) => {
                event.preventDefault();
                onButtonPointerDown(event);
              }}
              onClick={() => onQuickSuggestion(suggestion.name)}
              disabled={!isLoaded}
            >
              {suggestion.name}
            </button>
          ))}
        </div>
        <div className={styles.addSheetFooter}>
          <p className={styles.addSheetNotice} aria-live="polite">
            {notice?.message ?? ""}
          </p>
          {notice?.type === "duplicate" ? (
            <button
              className={styles.secondaryButton}
              type="button"
              onPointerDown={onButtonPointerDown}
              onClick={() => onViewDuplicate(notice.itemId)}
            >
              Ver producto
            </button>
          ) : null}
          <button
            className={styles.primaryButton}
            type="submit"
            onPointerDown={onButtonPointerDown}
            disabled={!isLoaded}
          >
            Añadir
          </button>
        </div>
      </form>
    </BottomSheetFrame>
  );
}
