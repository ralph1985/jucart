import type {
  ChangeEvent,
  CSSProperties,
  FormEvent,
  PointerEvent,
  Ref,
  RefObject,
} from "react";

import styles from "../../App.module.scss";
import type { ShoppingSection } from "../../shoppingItems";
import { Icon } from "../ui/Icon";

type TicketUploadSheetProps = {
  error: string | null;
  files: File[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  formatFileSize: (size: number) => string;
  isPending: boolean;
  keyboardInset: number;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onClose: () => void;
  onDragEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onDragMove: (event: PointerEvent<HTMLDivElement>) => void;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  onFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSectionChange: (sectionId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sectionId: string;
  sections: ShoppingSection[];
  sheetDragOffset: number;
  sheetRef: Ref<HTMLFormElement>;
  backdropRef: Ref<HTMLDivElement>;
};

export function TicketUploadSheet({
  backdropRef,
  error,
  fileInputRef,
  files,
  formatFileSize,
  isPending,
  keyboardInset,
  onButtonPointerDown,
  onClose,
  onDragEnd,
  onDragMove,
  onDragStart,
  onFilesChange,
  onSectionChange,
  onSubmit,
  sectionId,
  sections,
  sheetDragOffset,
  sheetRef,
}: TicketUploadSheetProps) {
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
        className={`${styles.addSheet} ${styles.ticketUploadSheet}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="ticket-upload-title"
        style={
          { "--sheet-drag-offset": `${sheetDragOffset}px` } as CSSProperties
        }
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div
          className={styles.addSheetHandle}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <span aria-hidden="true" />
        </div>
        <div className={styles.addSheetHeader}>
          <div>
            <p className={styles.sheetKicker}>Ticket de compra</p>
            <h2 id="ticket-upload-title">Subir ticket</h2>
          </div>
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Cerrar subida de ticket"
            onPointerDown={onButtonPointerDown}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className={styles.ticketUploadFields}>
          <label className={styles.label} htmlFor="ticket-section-id">
            Supermercado
          </label>
          <select
            id="ticket-section-id"
            value={sectionId}
            onChange={(event) => onSectionChange(event.target.value)}
            disabled={isPending}
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
          <label className={styles.label} htmlFor="ticket-files">
            Archivos
          </label>
          <input
            id="ticket-files"
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={onFilesChange}
            disabled={isPending}
          />
          {files.length > 0 ? (
            <ul className={styles.ticketFileList}>
              {files.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`}>
                  <Icon name="file" />
                  <span>{file.name}</span>
                  <small>{formatFileSize(file.size)}</small>
                </li>
              ))}
            </ul>
          ) : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className={styles.addSheetActions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onPointerDown={onButtonPointerDown}
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            className={styles.primaryButton}
            type="submit"
            onPointerDown={onButtonPointerDown}
            disabled={isPending || files.length === 0}
          >
            <Icon name="upload" />
            {isPending ? "Subiendo" : "Subir"}
          </button>
        </div>
      </form>
    </div>
  );
}
