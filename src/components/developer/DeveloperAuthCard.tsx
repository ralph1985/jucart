import type { PointerEvent } from "react";

import styles from "../../App.module.scss";

type DeveloperAuthCardProps = {
  email: string;
  isPending: boolean;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onSignOut: () => void;
};

export function DeveloperAuthCard({
  email,
  isPending,
  onButtonPointerDown,
  onSignOut,
}: DeveloperAuthCardProps) {
  return (
    <section className={styles.developerPanel} aria-label="Autenticación">
      <div className={styles.developerPanelHeader}>
        <h3>Autenticación</h3>
        <span className={styles.developerStatusSuccess}>Sesión activa</span>
      </div>
      <div className={styles.developerAuthRow}>
        <span className={styles.authStatus}>{email}</span>
        <button
          className={styles.authButton}
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onSignOut}
          disabled={isPending}
        >
          Cerrar sesión
        </button>
      </div>
    </section>
  );
}
