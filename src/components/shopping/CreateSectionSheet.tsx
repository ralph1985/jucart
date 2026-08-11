import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  Ref,
  RefObject,
} from "react";

import styles from "../../App.module.scss";
import {
  shoppingSectionColors,
  type ShoppingSectionColor,
} from "../../shoppingItems";

type CreateSectionSheetProps = {
  backdropRef: Ref<HTMLDivElement>;
  isLoaded: boolean;
  keyboardInset: number;
  name: string;
  nameInputRef: RefObject<HTMLInputElement | null>;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onClose: () => void;
  onColorChange: (color: ShoppingSectionColor) => void;
  onDragEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onDragMove: (event: PointerEvent<HTMLDivElement>) => void;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  onNameChange: (name: string) => void;
  onSheetKeyDown: (event: KeyboardEvent<HTMLFormElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selectedColor: ShoppingSectionColor;
  sheetDragOffset: number;
  sheetRef: Ref<HTMLFormElement>;
  nameLabel?: string;
  submitLabel?: string;
  title?: string;
};

export function CreateSectionSheet({
  backdropRef,
  isLoaded,
  keyboardInset,
  name,
  nameInputRef,
  onButtonPointerDown,
  onClose,
  onColorChange,
  onDragEnd,
  onDragMove,
  onDragStart,
  onNameChange,
  onSheetKeyDown,
  onSubmit,
  selectedColor,
  sheetDragOffset,
  sheetRef,
  nameLabel = "Nueva lista",
  submitLabel = "Crear",
  title = "Crear lista",
}: CreateSectionSheetProps) {
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
        aria-labelledby="section-add-sheet-title"
        style={
          { "--sheet-drag-offset": `${sheetDragOffset}px` } as CSSProperties
        }
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onSheetKeyDown}
        onSubmit={onSubmit}
      >
        <div
          className={styles.addSheetHandle}
          aria-label="Cerrar panel de lista"
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
        <h2 id="section-add-sheet-title" className={styles.visuallyHidden}>
          {title}
        </h2>
        <div className={styles.addSheetFields}>
          <div className={styles.formField}>
            <label className={styles.label} htmlFor="section-name">
              {nameLabel}
            </label>
            <input
              id="section-name"
              ref={nameInputRef}
              className={styles.addSheetInput}
              autoComplete="off"
              autoCapitalize="sentences"
              autoCorrect="on"
              enterKeyHint="done"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Carrefour, frutería..."
              type="text"
              disabled={!isLoaded}
            />
          </div>
          <div className={styles.formField}>
            <span className={styles.label}>Color de la lista</span>
            <div
              className={styles.sectionColorPicker}
              aria-label="Colores de la lista"
              role="group"
            >
              {shoppingSectionColors.map((color) => (
                <button
                  className={`${styles.sectionColorButton} ${styles[`sectionColorSwatch${color}`]}${selectedColor === color ? ` ${styles.sectionColorButtonSelected}` : ""}`}
                  type="button"
                  aria-label={`Seleccionar color ${color} para la lista`}
                  aria-pressed={selectedColor === color}
                  key={color}
                  onPointerDown={onButtonPointerDown}
                  onClick={() => onColorChange(color)}
                  disabled={!isLoaded}
                />
              ))}
            </div>
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
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
