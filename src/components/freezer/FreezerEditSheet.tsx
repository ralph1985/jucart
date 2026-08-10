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
import {
  freezerDrawers,
  type FreezerDrawerId,
  type FreezerItem,
} from "../../freezerItems";

type FreezerEditSheetProps = {
  backdropRef: Ref<HTMLDivElement>;
  drawerId: FreezerDrawerId;
  frozenAt: string;
  item: FreezerItem;
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

export function FreezerEditSheet({
  backdropRef,
  drawerId,
  frozenAt,
  item,
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
}: FreezerEditSheetProps) {
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
        aria-labelledby="edit-freezer-title"
        style={
          { "--sheet-drag-offset": `${sheetDragOffset}px` } as CSSProperties
        }
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onSheetKeyDown}
        onSubmit={onSubmit}
      >
        <div
          className={styles.addSheetHandle}
          aria-label="Cerrar panel de edición"
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
        <h2 id="edit-freezer-title" className={styles.visuallyHidden}>
          Editar {item.name}
        </h2>
        <div className={styles.addSheetFields}>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="edit-freezer-name">
              Producto
            </label>
            <input
              id="edit-freezer-name"
              ref={nameInputRef}
              className={styles.addSheetInput}
              autoCapitalize="sentences"
              autoCorrect="on"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              type="text"
            />
          </div>
          <div className={styles.addSheetSelectors}>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="edit-freezer-quantity">
                Cantidad
              </label>
              <input
                id="edit-freezer-quantity"
                className={styles.select}
                autoComplete="off"
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
                onFocus={onQuantityFocus}
                placeholder="2 raciones"
                type="text"
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label} htmlFor="edit-freezer-drawer">
                Cajón
              </label>
              <select
                id="edit-freezer-drawer"
                className={styles.select}
                value={drawerId}
                onChange={(event) => onDrawerChange(event.target.value)}
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
            <label className={styles.label} htmlFor="edit-freezer-date">
              Congelado
            </label>
            <input
              id="edit-freezer-date"
              className={styles.select}
              value={frozenAt}
              onChange={(event) => onFrozenAtChange(event.target.value)}
              type="date"
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
