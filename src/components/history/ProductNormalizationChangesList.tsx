import styles from "../../App.module.scss";
import type {
  ShoppingProductNormalizationChange,
  ShoppingProductNormalizationRun,
} from "../../shoppingItems";

type ProductNormalizationChangesListProps = {
  changes: ShoppingProductNormalizationChange[];
  formatDate: (createdAt: number) => string;
  getActionText: (change: ShoppingProductNormalizationChange) => string;
  getChangeMeta: (change: ShoppingProductNormalizationChange) => string | null;
  getProductText: (change: ShoppingProductNormalizationChange) => string;
  getRunSummary: (
    run: ShoppingProductNormalizationRun | undefined,
  ) => string | null;
  runsById: ReadonlyMap<string, ShoppingProductNormalizationRun>;
  showUnseenOnly: boolean;
};

export function ProductNormalizationChangesList({
  changes,
  formatDate,
  getActionText,
  getChangeMeta,
  getProductText,
  getRunSummary,
  runsById,
  showUnseenOnly,
}: ProductNormalizationChangesListProps) {
  if (changes.length === 0) {
    return (
      <div className={styles.historyEmpty}>
        <p className={styles.emptyTitle}>
          {showUnseenOnly
            ? "No hay normalizaciones pendientes"
            : "No hay normalizaciones"}
        </p>
        <p className={styles.emptyDescription}>
          {showUnseenOnly
            ? "Las normalizaciones ya están revisadas."
            : "Las fusiones, renombres y aliases de Codex aparecerán aquí."}
        </p>
      </div>
    );
  }

  return (
    <ol className={styles.historyList}>
      {changes.map((change) => {
        const runSummary = getRunSummary(runsById.get(change.runId));
        const changeMeta = getChangeMeta(change);

        return (
          <li className={styles.historyItem} key={change.id}>
            <div className={styles.historyItemHeader}>
              <span className={styles.historyAction}>
                {getActionText(change)}
              </span>
              <time dateTime={new Date(change.createdAt).toISOString()}>
                {formatDate(change.createdAt)}
              </time>
            </div>
            <p className={styles.historyProduct}>{getProductText(change)}</p>
            {changeMeta ? (
              <p className={styles.historyMeta}>{changeMeta}</p>
            ) : null}
            {change.reason ? (
              <p className={styles.historyMeta}>{change.reason}</p>
            ) : null}
            {runSummary ? (
              <p className={styles.historyMeta}>{runSummary}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
