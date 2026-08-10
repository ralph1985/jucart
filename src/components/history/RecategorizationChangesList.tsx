import styles from "../../App.module.scss";
import type {
  ShoppingCategory,
  ShoppingRecategorizationChange,
  ShoppingRecategorizationRun,
} from "../../shoppingItems";

type RecategorizationChangesListProps = {
  categories: ShoppingCategory[];
  changes: ShoppingRecategorizationChange[];
  formatDate: (createdAt: number) => string;
  getChangeMeta: (
    change: ShoppingRecategorizationChange,
    categories: ShoppingCategory[],
  ) => string;
  getRunSummary: (
    run: ShoppingRecategorizationRun | undefined,
  ) => string | null;
  runsById: ReadonlyMap<string, ShoppingRecategorizationRun>;
  showUnseenOnly: boolean;
};

export function RecategorizationChangesList({
  categories,
  changes,
  formatDate,
  getChangeMeta,
  getRunSummary,
  runsById,
  showUnseenOnly,
}: RecategorizationChangesListProps) {
  if (changes.length === 0) {
    return (
      <div className={styles.historyEmpty}>
        <p className={styles.emptyTitle}>
          {showUnseenOnly
            ? "No hay recategorizaciones pendientes"
            : "No hay recategorizaciones"}
        </p>
        <p className={styles.emptyDescription}>
          {showUnseenOnly
            ? "Las recategorizaciones ya están revisadas."
            : "Los cambios automáticos de categoría aparecerán aquí."}
        </p>
      </div>
    );
  }

  return (
    <ol className={styles.historyList}>
      {changes.map((change) => {
        const runSummary = getRunSummary(runsById.get(change.runId));

        return (
          <li className={styles.historyItem} key={change.id}>
            <div className={styles.historyItemHeader}>
              <span className={styles.historyAction}>
                Categoría actualizada
              </span>
              <time dateTime={new Date(change.createdAt).toISOString()}>
                {formatDate(change.createdAt)}
              </time>
            </div>
            <p className={styles.historyProduct}>{change.itemName}</p>
            <p className={styles.historyMeta}>
              {getChangeMeta(change, categories)}
            </p>
            {change.reason ? (
              <p className={styles.historyMeta}>{change.reason}</p>
            ) : null}
            {runSummary ? (
              <p className={styles.historyMeta}>{runSummary}</p>
            ) : null}
            {change.catalogEntryId ? (
              <p className={styles.historyMeta}>
                Catálogo: {change.catalogEntryId}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
