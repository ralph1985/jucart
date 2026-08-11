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
import { BottomSheetFrame } from "../ui/BottomSheetFrame";

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
  sheetRef: Ref<HTMLElement>;
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
    <BottomSheetFrame
      ariaLabelledBy="ticket-upload-title"
      backdropRef={backdropRef}
      className={styles.ticketUploadSheetFrame}
      closeLabel="Cerrar subida de ticket"
      dragOffset={sheetDragOffset}
      handleLabel="Cerrar subida de ticket"
      onClose={onClose}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      onDragStart={onDragStart}
      sheetRef={sheetRef}
      style={
        { "--sheet-keyboard-inset": `${keyboardInset}px` } as CSSProperties
      }
      subtitle="Ticket de compra"
      title="Subir ticket"
    >
      <form className={styles.ticketUploadSheet} onSubmit={onSubmit}>
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
    </BottomSheetFrame>
  );
}
