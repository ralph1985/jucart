import type {
  CSSProperties,
  KeyboardEventHandler,
  PointerEvent,
  ReactNode,
  Ref,
} from "react";

import styles from "../../App.module.scss";

type BottomSheetFrameProps = {
  ariaDescribedBy?: string;
  ariaLabelledBy: string;
  backdropRef: Ref<HTMLDivElement>;
  children: ReactNode;
  closeLabel?: string;
  handleLabel?: string;
  className?: string;
  dragOffset?: number;
  onClose: () => void;
  onDragEnd?: (event: PointerEvent<HTMLDivElement>) => void;
  onDragMove?: (event: PointerEvent<HTMLDivElement>) => void;
  onDragStart?: (event: PointerEvent<HTMLDivElement>) => void;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  sheetRef: Ref<HTMLElement>;
  style?: CSSProperties;
  tabIndex?: number;
  title: string;
  subtitle?: string;
};

export function BottomSheetFrame({
  ariaDescribedBy,
  ariaLabelledBy,
  backdropRef,
  children,
  closeLabel = "Cerrar panel",
  handleLabel = "Arrastrar para cerrar panel",
  className,
  dragOffset = 0,
  onClose,
  onDragEnd,
  onDragMove,
  onDragStart,
  onKeyDown,
  sheetRef,
  style,
  tabIndex,
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
        style={
          {
            ...style,
            "--sheet-drag-offset": `${dragOffset}px`,
          } as CSSProperties
        }
        tabIndex={tabIndex}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          onKeyDown?.(event);
        }}
      >
        <button
          className={styles.bottomSheetHandle}
          type="button"
          aria-label={handleLabel}
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
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onClose();
            }
          }}
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
            aria-label={closeLabel}
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
