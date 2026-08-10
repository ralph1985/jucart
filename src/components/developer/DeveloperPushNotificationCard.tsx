import type { PointerEvent } from "react";

import styles from "../../App.module.scss";
import type {
  PushNotificationDiagnostic,
  PushNotificationSnapshot,
} from "../../pushNotifications";

type DeveloperPushNotificationCardProps = {
  actionText: string;
  diagnostic: PushNotificationDiagnostic | null;
  isActionDisabled: boolean;
  isDiagnosticPending: boolean;
  isSupabaseAvailable: boolean;
  onAction: () => void;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onDiagnostic: () => void;
  snapshot: PushNotificationSnapshot;
};

export function DeveloperPushNotificationCard({
  actionText,
  diagnostic,
  isActionDisabled,
  isDiagnosticPending,
  isSupabaseAvailable,
  onAction,
  onButtonPointerDown,
  onDiagnostic,
  snapshot,
}: DeveloperPushNotificationCardProps) {
  const isSubscribed = snapshot.status === "subscribed";

  return (
    <section className={styles.developerPanel} aria-label="Notificaciones push">
      <div className={styles.developerPanelHeader}>
        <h3>Notificaciones push</h3>
        <span
          className={
            isSubscribed
              ? styles.developerStatusSuccess
              : styles.developerStatusFailed
          }
        >
          {snapshot.message}
        </span>
      </div>
      <dl className={styles.developerMetrics}>
        <div>
          <dt>Permiso</dt>
          <dd>{snapshot.message}</dd>
        </div>
        <div>
          <dt>Supabase</dt>
          <dd>{isSupabaseAvailable ? "Configurado" : "No configurado"}</dd>
        </div>
      </dl>
      {diagnostic ? (
        <div
          className={
            diagnostic.ok
              ? styles.developerDiagnosticSuccess
              : styles.developerDiagnosticFailed
          }
          role="status"
        >
          <p>{diagnostic.message}</p>
          <ul>
            {diagnostic.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className={styles.developerActions}>
        <button
          className={styles.secondaryButton}
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onDiagnostic}
          disabled={!isSupabaseAvailable || isDiagnosticPending}
        >
          Probar registro
        </button>
        <button
          className={
            isSubscribed ? styles.secondaryButton : styles.primaryButton
          }
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onAction}
          disabled={isActionDisabled}
        >
          {actionText}
        </button>
      </div>
    </section>
  );
}
