import type { PointerEvent, ReactNode, Ref } from "react";

import styles from "../../App.module.scss";
import { HistoryTabs, type HistoryTab } from "./HistoryTabs";

type HistoryViewProps = {
  children: ReactNode;
  count: number;
  historyTab: HistoryTab;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onHistoryTabChange: (historyTab: HistoryTab) => void;
  onShowFullHistory: () => void;
  screenRef: Ref<HTMLElement>;
  showUnseenOnly: boolean;
};

export function HistoryView({
  children,
  count,
  historyTab,
  onButtonPointerDown,
  onHistoryTabChange,
  onShowFullHistory,
  screenRef,
  showUnseenOnly,
}: HistoryViewProps) {
  return (
    <section
      ref={screenRef}
      className={styles.historyScreen}
      aria-labelledby="history-title"
    >
      <div className={styles.sectionsHeader}>
        <h2 id="history-title">
          {showUnseenOnly ? "Cambios nuevos" : "Historial"}
        </h2>
        <span className={styles.count}>{count}</span>
      </div>
      {showUnseenOnly ? (
        <button
          className={styles.secondaryButton}
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onShowFullHistory}
        >
          Ver historial completo
        </button>
      ) : (
        <HistoryTabs
          value={historyTab}
          onChange={onHistoryTabChange}
          onButtonPointerDown={onButtonPointerDown}
        />
      )}
      {children}
    </section>
  );
}
