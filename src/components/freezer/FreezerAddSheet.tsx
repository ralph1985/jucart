import type {
  CSSProperties,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  Ref,
  RefObject,
} from "react";

import styles from "../../App.module.scss";
import { freezerDrawers, type FreezerDrawerId } from "../../freezerItems";

type FreezerAddSheetProps = {
  backdropRef: Ref<HTMLDivElement>;
  drawerId: FreezerDrawerId;
  frozenAt: string;
  isLoaded: boolean;
  keyboardInset: number;
  name: string;
  nameInputRef: RefObject<HTMLInputElement | null>;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onClose: () => void;
  onDrawerChange: (value: string) => void;
  onDragEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onDragMove: (event: PointerEvent<HTMLDivElement>) => void;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  onFrozenAtChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onQuantityFocus: (event: FocusEvent<HTMLInputElement>) => void;
  onSheetKeyDown: (event: KeyboardEvent<HTMLFormElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  quantity: string;
  sheetDragOffset: number;
  sheetRef: Ref<HTMLFormElement>;
};

export function FreezerAddSheet({
  backdropRef,
  drawerId,
  frozenAt,
  isLoaded,
  keyboardInset,
  name,
  nameInputRef,
  onButtonPointerDown,
  onClose,
  onDrawerChange,
  onDragEnd,
  onDragMove,
  onDragStart,
  onFrozenAtChange,
  onNameChange,
  onQuantityChange,
  onQuantityFocus,
  onSheetKeyDown,
  onSubmit,
  quantity,
  sheetDragOffset,
  sheetRef,
}: FreezerAddSheetProps) {
  return (
    <div
      ref={backdropRef}
      className={styles.addSheetBackdrop}
      style={
        { "--sheet-keyboard-inset": `${keyboardInset}px` } as CSSProperties
      }
      onClick={onClose}
    >
      <form
        ref={sheetRef}
        className={`${styles.addSheet} ${styles.addSheetCompact}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="freezer-add-sheet-title"
        style={
          { "--sheet-drag-offset": `${sheetDragOffset}px` } as CSSProperties
        }
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onSheetKeyDown}
        onSubmit={onSubmit}
      >
        <div
          className={styles.addSheetHandle}
          aria-label="Cerrar panel de alta"
          role="button"
          tabIndex={0}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onClose();
            }
          }}
        >
          <span />
        </div>
        <h2 id="freezer-add-sheet-title" className={styles.visuallyHidden}>
          Añadir producto congelado
        </h2>
        <div className={styles.addSheetFields}>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="freezer-item-name">
              Producto
            </label>
            <input
              id="freezer-item-name"
              ref={nameInputRef}
              className={styles.addSheetInput}
              autoComplete="off"
              autoCapitalize="sentences"
              autoCorrect="on"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Lentejas, caldo, croquetas..."
              type="text"
              disabled={!isLoaded}
            />
          </div>
          <div className={styles.addSheetSelectors}>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="freezer-quantity">
                Cantidad
              </label>
              <input
                id="freezer-quantity"
                className={styles.select}
                autoComplete="off"
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
                onFocus={onQuantityFocus}
                placeholder="2 raciones"
                type="text"
                disabled={!isLoaded}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="freezer-drawer-id">
                Cajón
              </label>
              <select
                id="freezer-drawer-id"
                className={styles.select}
                value={drawerId}
                onChange={(event) => onDrawerChange(event.target.value)}
                disabled={!isLoaded}
              >
                {freezerDrawers.map((drawer) => (
                  <option key={drawer.id} value={drawer.id}>
                    {drawer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="freezer-frozen-at">
              Congelado
            </label>
            <input
              id="freezer-frozen-at"
              className={styles.select}
              value={frozenAt}
              onChange={(event) => onFrozenAtChange(event.target.value)}
              type="date"
              disabled={!isLoaded}
            />
          </div>
        </div>
        <div className={styles.addSheetFooter}>
          <p className={styles.addSheetNotice} aria-live="polite" />
          <button
            className={styles.secondaryButton}
            type="button"
            onPointerDown={onButtonPointerDown}
            onClick={onClose}
          >
            Cerrar
          </button>
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
    </div>
  );
}
