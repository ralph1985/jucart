import styles from "../../App.module.scss";
import type {
  MenuDishRecategorizationChange,
  MenuDishRecategorizationRun,
} from "../../menuPlanning";

type MenuDishRecategorizationChangesListProps = {
  changes: MenuDishRecategorizationChange[];
  formatDate: (createdAt: number) => string;
  getChangeMeta: (change: MenuDishRecategorizationChange) => string;
  getRunSummary: (
    run: MenuDishRecategorizationRun | undefined,
  ) => string | null;
  runsById: ReadonlyMap<string, MenuDishRecategorizationRun>;
  showUnseenOnly: boolean;
};

export function MenuDishRecategorizationChangesList({
  changes,
  formatDate,
  getChangeMeta,
  getRunSummary,
  runsById,
  showUnseenOnly,
}: MenuDishRecategorizationChangesListProps) {
  if (changes.length === 0) {
    return (
      <div className={styles.historyEmpty}>
        <p className={styles.emptyTitle}>
          {showUnseenOnly
            ? "No hay recategorizaciones de platos pendientes"
            : "No hay recategorizaciones de platos"}
        </p>
        <p className={styles.emptyDescription}>
          {showUnseenOnly
            ? "Las recategorizaciones de platos ya están revisadas."
            : "Los cambios automáticos de tipo de plato aparecerán aquí."}
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
              <span className={styles.historyAction}>Plato recategorizado</span>
              <time dateTime={new Date(change.createdAt).toISOString()}>
                {formatDate(new Date(change.createdAt).getTime())}
              </time>
            </div>
            <p className={styles.historyProduct}>{change.dishName}</p>
            <p className={styles.historyMeta}>{getChangeMeta(change)}</p>
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
