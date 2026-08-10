import type { DeveloperBackupRun } from "../../shoppingItemsSupabase";

import styles from "../../App.module.scss";

type DeveloperBackupCardProps = {
  error: string | null;
  formatDate: (timestamp: number) => string;
  formatDuration: (duration: number) => string;
  formatFileSize: (size: number) => string;
  formatHash: (hash: string | null) => string;
  hasBackupProblem: boolean;
  run: DeveloperBackupRun | null;
  status: "empty" | "success" | "failed" | "stale";
  statusText: string;
};

export function DeveloperBackupCard({
  error,
  formatDate,
  formatDuration,
  formatFileSize,
  formatHash,
  hasBackupProblem,
  run,
  status,
  statusText,
}: DeveloperBackupCardProps) {
  return (
    <section className={styles.developerPanel} aria-label="Estado del backup">
      <div className={styles.developerPanelHeader}>
        <h3>Backup Supabase</h3>
        <span
          className={
            hasBackupProblem
              ? styles.developerStatusFailed
              : styles.developerStatusSuccess
          }
        >
          {statusText}
        </span>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <dl className={styles.developerMetrics}>
        <div>
          <dt>Última copia</dt>
          <dd>{run ? formatDate(run.finishedAt) : "Sin registro"}</dd>
        </div>
        <div>
          <dt>Duración</dt>
          <dd>{run ? formatDuration(run.durationMs) : "Sin dato"}</dd>
        </div>
        <div>
          <dt>Tamaño</dt>
          <dd>
            {run && run.fileSizeBytes !== null
              ? formatFileSize(run.fileSizeBytes)
              : "Sin dato"}
          </dd>
        </div>
        <div>
          <dt>Copias</dt>
          <dd>{run?.retainedCount ?? 0}</dd>
        </div>
        <div>
          <dt>Archivo</dt>
          <dd>{run?.fileName ?? "Sin archivo"}</dd>
        </div>
        <div>
          <dt>SHA-256</dt>
          <dd>{formatHash(run?.sha256 ?? null)}</dd>
        </div>
      </dl>
      {run?.errorMessage ? (
        <p className={styles.developerNote}>{run.errorMessage}</p>
      ) : null}
      {status === "stale" ? (
        <p className={styles.developerNote} role="alert">
          Hace más de 6 horas que no se completa una copia de seguridad.
        </p>
      ) : null}
    </section>
  );
}
