import type { CSSProperties, PointerEvent, ReactNode, Ref } from "react";

import styles from "../../App.module.scss";
import type { CanonicalProductComparisonUnit } from "../../shoppingItems";
import { BottomSheetFrame } from "../ui/BottomSheetFrame";

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
    <BottomSheetFrame
      ariaLabelledBy="price-detail-title"
      backdropRef={backdropRef}
      className={`${styles.addSheet} ${styles.priceDetailSheet}`}
      closeLabel="Cerrar precios"
      dragOffset={sheetDragOffset}
      onClose={onClose}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      onDragStart={onDragStart}
      sheetRef={sheetRef}
      style={
        { "--sheet-keyboard-inset": `${keyboardInset}px` } as CSSProperties
      }
      tabIndex={-1}
      handleLabel="Cerrar detalle de precios"
      title={productName}
      subtitle="Histórico de precios"
    >
      {summary ? (
        <dl className={styles.priceDetailMetrics}>
          <div>
            <dt>Último</dt>
            <dd>{formatValue(summary.latestPrice, summary.comparisonUnit)}</dd>
          </div>
          <div>
            <dt>Media</dt>
            <dd>{formatValue(summary.averagePrice, summary.comparisonUnit)}</dd>
          </div>
          <div>
            <dt>Observaciones</dt>
            <dd>{summary.observationCount}</dd>
          </div>
        </dl>
      ) : null}
      {children}
    </BottomSheetFrame>
  );
}
