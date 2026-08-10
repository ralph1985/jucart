import type { PointerEventHandler } from "react";

import styles from "../../App.module.scss";
import type { PushNotificationSnapshot } from "../../pushNotifications";
import { Icon } from "../ui/Icon";

type PushNotificationInviteProps = {
  isVisible: boolean;
  snapshot: PushNotificationSnapshot;
  isPending: boolean;
  onDismiss: () => void;
  onActivate: () => void;
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
};

export function PushNotificationInvite({
  isVisible,
  snapshot,
  isPending,
  onDismiss,
  onActivate,
  onButtonPointerDown,
}: PushNotificationInviteProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <section className={styles.pushInvite} aria-label="Avisos de cambios">
      <span className={styles.pushInviteIcon} aria-hidden="true">
        <Icon name="bell" />
      </span>
      <div className={styles.pushInviteText}>
        <h2>Avisos de cambios</h2>
        <p>Recibe una notificación cuando otro dispositivo cambie la lista.</p>
      </div>
      <div className={styles.pushInviteActions}>
        <button
          className={styles.secondaryButton}
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onDismiss}
          disabled={isPending}
        >
          Ahora no
        </button>
        <button
          className={styles.primaryButton}
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onActivate}
          disabled={isPending}
        >
          {snapshot.status === "error" ? "Reintentar" : "Activar"}
        </button>
      </div>
    </section>
  );
}
