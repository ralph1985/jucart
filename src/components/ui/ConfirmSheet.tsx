import type { PointerEvent, RefObject } from "react";

import styles from "../../App.module.scss";
import { BottomSheetFrame } from "./BottomSheetFrame";

type ConfirmSheetProps = {
  backdropRef: RefObject<HTMLDivElement | null>;
  description: string;
  dragOffset: number;
  onCancel: () => void;
  onConfirm: () => void;
  onDragEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onDragMove: (event: PointerEvent<HTMLDivElement>) => void;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  sheetRef: RefObject<HTMLElement | null>;
  title: string;
  confirmLabel: string;
};

export function ConfirmSheet({
  backdropRef,
  confirmLabel,
  description,
  dragOffset,
  onCancel,
  onConfirm,
  onDragEnd,
  onDragMove,
  onDragStart,
  sheetRef,
  title,
}: ConfirmSheetProps) {
  return (
    <BottomSheetFrame
      ariaDescribedBy="confirm-sheet-description"
      ariaLabelledBy="confirm-sheet-title"
      backdropRef={backdropRef}
      className={styles.confirmSheet}
      dragOffset={dragOffset}
      onClose={onCancel}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      onDragStart={onDragStart}
      sheetRef={sheetRef}
      title={title}
      subtitle="Esta acción no se puede deshacer."
    >
      <p
        id="confirm-sheet-description"
        className={styles.confirmSheetDescription}
      >
        {description}
      </p>
      <div className={styles.bottomSheetFooter}>
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
