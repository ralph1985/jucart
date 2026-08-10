import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  Ref,
} from "react";

import styles from "../../App.module.scss";
import type { CanonicalProductComparisonUnit } from "../../shoppingItems";
import { Icon } from "../ui/Icon";

type PriceSummary = {
  latestPrice: number;
  averagePrice: number;
  comparisonUnit: CanonicalProductComparisonUnit;
  observationCount: number;
};

type PriceDetailSheetProps = {
  backdropRef: Ref<HTMLDivElement>;
  children: ReactNode;
  formatValue: (value: number, unit: CanonicalProductComparisonUnit) => string;
  keyboardInset: number;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onClose: () => void;
  onDragEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onDragMove: (event: PointerEvent<HTMLDivElement>) => void;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  productName: string;
  sheetDragOffset: number;
  sheetRef: Ref<HTMLElement>;
  summary: PriceSummary | null;
};

export function PriceDetailSheet({
  backdropRef,
  children,
  formatValue,
  keyboardInset,
  onButtonPointerDown,
  onClose,
  onDragEnd,
  onDragMove,
  onDragStart,
  productName,
  sheetDragOffset,
  sheetRef,
  summary,
}: PriceDetailSheetProps) {
  return (
    <div
      ref={backdropRef}
      className={styles.addSheetBackdrop}
      style={
        { "--sheet-keyboard-inset": `${keyboardInset}px` } as CSSProperties
      }
      onClick={onClose}
    >
      <section
        ref={sheetRef}
        className={`${styles.addSheet} ${styles.priceDetailSheet}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="price-detail-title"
        tabIndex={-1}
        style={
          { "--sheet-drag-offset": `${sheetDragOffset}px` } as CSSProperties
        }
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div
          className={styles.addSheetHandle}
          aria-label="Cerrar detalle de precios"
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
        <header className={styles.priceDetailHeader}>
          <div>
            <h2 id="price-detail-title">{productName}</h2>
            <p>Histórico de precios</p>
          </div>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="Cerrar precios"
            title="Cerrar"
            onPointerDown={onButtonPointerDown}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        {summary ? (
          <dl className={styles.priceDetailMetrics}>
            <div>
              <dt>Último</dt>
              <dd>
                {formatValue(summary.latestPrice, summary.comparisonUnit)}
              </dd>
            </div>
            <div>
              <dt>Media</dt>
              <dd>
                {formatValue(summary.averagePrice, summary.comparisonUnit)}
              </dd>
            </div>
            <div>
              <dt>Observaciones</dt>
              <dd>{summary.observationCount}</dd>
            </div>
          </dl>
        ) : null}
        {children}
      </section>
    </div>
  );
}
