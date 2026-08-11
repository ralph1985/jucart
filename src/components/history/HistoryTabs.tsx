import type { PointerEventHandler } from "react";

import styles from "../../App.module.scss";

export type HistoryTab =
  "changes" | "categories" | "menu-categories" | "normalizations";

type HistoryTabsProps = {
  value: HistoryTab;
  onChange: (value: HistoryTab) => void;
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
};

const tabs: ReadonlyArray<{ value: HistoryTab; label: string }> = [
  { value: "changes", label: "Cambios" },
  { value: "categories", label: "Categorías" },
  { value: "menu-categories", label: "Tipos de plato" },
  { value: "normalizations", label: "Normalización" },
];

export function HistoryTabs({
  value,
  onChange,
  onButtonPointerDown,
}: HistoryTabsProps) {
  return (
    <div className={styles.historyTabs} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className={
            value === tab.value ? styles.historyTabActive : styles.historyTab
          }
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onPointerDown={onButtonPointerDown}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
