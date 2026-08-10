import styles from "../../App.module.scss";

type DeveloperStatusOverviewProps = {
  backupStatusText: string;
  hasBackupProblem: boolean;
  hasOperationalProblem: boolean;
  hasPushProblem: boolean;
  pushStatus: string;
  syncStatusText: string;
};

export function DeveloperStatusOverview({
  backupStatusText,
  hasBackupProblem,
  hasOperationalProblem,
  hasPushProblem,
  pushStatus,
  syncStatusText,
}: DeveloperStatusOverviewProps) {
  return (
    <section
      className={styles.developerOverview}
      aria-label="Resumen operativo"
    >
      <div className={styles.developerOverviewHeader}>
        <div>
          <p className={styles.developerEyebrow}>Estado general</p>
          <h3>{hasOperationalProblem ? "Revisar la app" : "Todo en orden"}</h3>
        </div>
        <span
          className={
            hasOperationalProblem
              ? styles.developerStatusFailed
              : styles.developerStatusSuccess
          }
        >
          {hasOperationalProblem ? "Atención" : "Operativa"}
        </span>
      </div>
      <div className={styles.developerOverviewMetrics}>
        <div>
          <span>Backup</span>
          <strong
            className={hasBackupProblem ? styles.developerMetricWarning : ""}
          >
            {backupStatusText}
          </strong>
        </div>
        <div>
          <span>Sincronización</span>
          <strong>{syncStatusText}</strong>
        </div>
        <div>
          <span>Push</span>
          <strong
            className={hasPushProblem ? styles.developerMetricWarning : ""}
          >
            {pushStatus}
          </strong>
        </div>
      </div>
    </section>
  );
}
