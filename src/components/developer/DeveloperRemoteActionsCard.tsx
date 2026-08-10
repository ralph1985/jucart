import type { PointerEvent } from "react";

import styles from "../../App.module.scss";
import type { RemoteAction, RemoteActionName } from "../../remoteActions";

export type DeveloperRemoteActionDefinition = {
  label: string;
  name: RemoteActionName;
};

type DeveloperRemoteActionsCardProps = {
  action: RemoteAction | null;
  definitions: ReadonlyArray<DeveloperRemoteActionDefinition>;
  error: string | null;
  isPending: boolean;
  onAction: (action: RemoteActionName) => void;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
};

export function DeveloperRemoteActionsCard({
  action,
  definitions,
  error,
  isPending,
  onAction,
  onButtonPointerDown,
}: DeveloperRemoteActionsCardProps) {
  const status = action?.status;
  const statusText =
    status === "running"
      ? "Ejecutando"
      : status === "completed"
        ? "Completada"
        : status === "failed"
          ? "Fallida"
          : status === "pending"
            ? "Pendiente"
            : "Sin órdenes";
  const hasError = status === "failed" || Boolean(error);
  const isActionRunning = status === "pending" || status === "running";

  return (
    <section className={styles.developerPanel} aria-label="Acciones remotas">
      <div className={styles.developerPanelHeader}>
        <h3>Acciones del servidor</h3>
        <span
          className={
            hasError
              ? styles.developerStatusFailed
              : styles.developerStatusSuccess
          }
        >
          {statusText}
        </span>
      </div>
      <p className={styles.developerNote}>
        El servidor ejecuta tareas autorizadas sin exponer puertos públicos.
      </p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {action?.resultSummary ? (
        <p className={styles.developerNote}>{action.resultSummary}</p>
      ) : null}
      {action?.errorMessage ? (
        <p className={styles.developerNote} role="alert">
          {action.errorMessage}
        </p>
      ) : null}
      <div className={styles.developerActions}>
        {definitions.map((definition) => (
          <button
            key={definition.name}
            className={
              definition.name === "supabase_backup"
                ? styles.primaryButton
                : styles.secondaryButton
            }
            type="button"
            onPointerDown={onButtonPointerDown}
            onClick={() => onAction(definition.name)}
            disabled={isPending || isActionRunning}
          >
            {isPending && action?.action === definition.name
              ? "Solicitando…"
              : definition.label}
          </button>
        ))}
      </div>
    </section>
  );
}
