import type { CSSProperties, PointerEvent, ReactNode, RefObject } from "react";

import styles from "../../App.module.scss";

type BottomSheetFrameProps = {
  ariaDescribedBy?: string;
  ariaLabelledBy: string;
  backdropRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
  dragOffset?: number;
  onClose: () => void;
  onDragEnd?: (event: PointerEvent<HTMLDivElement>) => void;
  onDragMove?: (event: PointerEvent<HTMLDivElement>) => void;
  onDragStart?: (event: PointerEvent<HTMLDivElement>) => void;
  sheetRef: RefObject<HTMLElement | null>;
  title: string;
  subtitle?: string;
};

export function BottomSheetFrame({
  ariaDescribedBy,
  ariaLabelledBy,
  backdropRef,
  children,
  className,
  dragOffset = 0,
  onClose,
  onDragEnd,
  onDragMove,
  onDragStart,
  sheetRef,
  subtitle,
  title,
}: BottomSheetFrameProps) {
  return (
    <div
      ref={backdropRef}
      className={styles.bottomSheetBackdrop}
      onClick={onClose}
    >
      <section
        ref={sheetRef}
        className={`${styles.bottomSheet} ${className ?? ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        style={{ "--sheet-drag-offset": `${dragOffset}px` } as CSSProperties}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className={styles.bottomSheetHandle}
          type="button"
          aria-label="Cerrar panel"
          onPointerDown={(event) =>
            onDragStart?.(event as unknown as PointerEvent<HTMLDivElement>)
          }
          onPointerMove={(event) =>
            onDragMove?.(event as unknown as PointerEvent<HTMLDivElement>)
          }
          onPointerUp={(event) =>
            onDragEnd?.(event as unknown as PointerEvent<HTMLDivElement>)
          }
          onPointerCancel={(event) =>
            onDragEnd?.(event as unknown as PointerEvent<HTMLDivElement>)
          }
          onClick={onClose}
        >
          <span />
        </button>
        <header className={styles.bottomSheetHeader}>
          <div>
            <h2 id={ariaLabelledBy}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button
            className={styles.bottomSheetClose}
            type="button"
            aria-label="Cerrar panel"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className={styles.bottomSheetContent}>{children}</div>
      </section>
    </div>
  );
}
