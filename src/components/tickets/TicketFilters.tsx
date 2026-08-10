import type { PointerEvent } from "react";

import styles from "../../App.module.scss";
import type { IconName } from "../ui/Icon";
import { Icon } from "../ui/Icon";

export type TicketFilterValue =
  "all" | "pending" | "processing" | "processed" | "failed" | "needs_review";

type TicketFiltersProps = {
  getIcon: (filter: TicketFilterValue) => IconName;
  getLabel: (filter: TicketFilterValue) => string;
  getShortLabel: (filter: TicketFilterValue) => string;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onChange: (filter: TicketFilterValue) => void;
  value: TicketFilterValue;
};

const filters: TicketFilterValue[] = [
  "all",
  "pending",
  "processed",
  "failed",
  "needs_review",
];

export function TicketFilters({
  getIcon,
  getLabel,
  getShortLabel,
  onButtonPointerDown,
  onChange,
  value,
}: TicketFiltersProps) {
  return (
    <div className={styles.ticketFilters} role="tablist">
      {filters.map((filter) => (
        <button
          key={filter}
          className={
            value === filter
              ? styles.ticketFilterButtonActive
              : styles.ticketFilterButton
          }
          type="button"
          role="tab"
          aria-selected={value === filter}
          aria-label={getLabel(filter)}
          title={getLabel(filter)}
          onPointerDown={onButtonPointerDown}
          onClick={() => onChange(filter)}
        >
          <Icon name={getIcon(filter)} />
          <span>{getShortLabel(filter)}</span>
        </button>
      ))}
    </div>
  );
}
