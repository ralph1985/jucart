import type { PointerEvent } from "react";

import styles from "../../App.module.scss";
import type {
  CanonicalProductComparisonUnit,
  ShoppingPriceObservation,
  ShoppingSection,
} from "../../shoppingItems";

type PriceSummary = {
  averagePrice: number;
  comparisonUnit: CanonicalProductComparisonUnit;
  latestPrice: number;
  observationCount: number;
  sectionId: string;
};

type PriceDetailContentProps = {
  formatDate: (value: number) => string;
  formatDifference: (
    value: number,
    unit: CanonicalProductComparisonUnit,
  ) => string;
  formatValue: (value: number, unit: CanonicalProductComparisonUnit) => string;
  hiddenObservationCount: number;
  latestObservation: ShoppingPriceObservation | null;
  observationPageSize: number;
  observations: ShoppingPriceObservation[];
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onShowMore: () => void;
  priceDifference: number | null;
  priceDifferenceClassName: string;
  sectionSummaries: PriceSummary[];
  sections: ShoppingSection[];
};

export function PriceDetailContent({
  formatDate,
  formatDifference,
  formatValue,
  hiddenObservationCount,
  latestObservation,
  observationPageSize,
  observations,
  onButtonPointerDown,
  onShowMore,
  priceDifference,
  priceDifferenceClassName,
  sectionSummaries,
  sections,
}: PriceDetailContentProps) {
  const getSectionName = (sectionId: string) =>
    sections.find((section) => section.id === sectionId)?.name ?? sectionId;

  return (
    <div className={styles.priceDetailContent}>
      {latestObservation ? (
        <section
          className={styles.priceDetailPanel}
          aria-labelledby="price-latest-title"
        >
          <h3 id="price-latest-title">Último precio</h3>
          <div className={styles.priceLatestGrid}>
            <strong>
              {formatValue(
                latestObservation.observedPrice,
                latestObservation.comparisonUnit,
              )}
            </strong>
            <span>{getSectionName(latestObservation.sectionId)}</span>
            <span>{formatDate(latestObservation.observedAt)}</span>
            <span className={priceDifferenceClassName}>
              {priceDifference === null
                ? "Sin anterior"
                : formatDifference(
                    priceDifference,
                    latestObservation.comparisonUnit,
                  )}
            </span>
          </div>
        </section>
      ) : null}
      {sectionSummaries.length > 0 ? (
        <section
          className={styles.priceDetailPanel}
          aria-labelledby="price-sections-title"
        >
          <h3 id="price-sections-title">Por lista</h3>
          <ol className={styles.priceSectionList}>
            {sectionSummaries.map((summary) => (
              <li key={summary.sectionId}>
                <span>{getSectionName(summary.sectionId)}</span>
                <strong>
                  {formatValue(summary.latestPrice, summary.comparisonUnit)}
                </strong>
                <small>
                  Media{" "}
                  {formatValue(summary.averagePrice, summary.comparisonUnit)} ·{" "}
                  {summary.observationCount}
                </small>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {observations.length > 0 ? (
        <section
          className={styles.priceDetailPanel}
          aria-labelledby="price-observations-title"
        >
          <h3 id="price-observations-title">Observaciones</h3>
          <ol className={styles.priceObservationList}>
            {observations.map((observation) => (
              <li key={observation.id}>
                <span>
                  {formatDate(observation.observedAt)} ·{" "}
                  {getSectionName(observation.sectionId)}
                  {observation.source === "external"
                    ? ` · Externo${
                        observation.externalProvider
                          ? `: ${observation.externalProvider}`
                          : ""
                      }`
                    : ""}
                </span>
                <strong>
                  {formatValue(
                    observation.observedPrice,
                    observation.comparisonUnit,
                  )}
                </strong>
                {observation.quantity ? (
                  <small>{observation.quantity}</small>
                ) : null}
              </li>
            ))}
          </ol>
          {hiddenObservationCount > 0 ? (
            <button
              className={styles.paginationButton}
              type="button"
              onPointerDown={onButtonPointerDown}
              onClick={onShowMore}
            >
              Ver {Math.min(hiddenObservationCount, observationPageSize)}{" "}
              observaciones más
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
