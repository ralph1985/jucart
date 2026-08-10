import type { PointerEventHandler } from "react";

import styles from "../../App.module.scss";

type PwaUpdateBannerProps = {
  isAvailable: boolean;
  isApplying: boolean;
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
  onUpdate: () => void;
};

export function PwaUpdateBanner({
  isAvailable,
  isApplying,
  onButtonPointerDown,
  onUpdate,
}: PwaUpdateBannerProps) {
  if (!isAvailable) {
    return null;
  }

  return (
    <aside className={styles.pwaUpdateBanner} aria-label="Actualización">
      <div className={styles.pwaUpdateText}>
        <strong>Hay una versión nueva</strong>
        <span>
          Actualiza Jucart para seguir usando la versión más reciente.
        </span>
      </div>
      <button
        className={styles.primaryButton}
        type="button"
        onPointerDown={onButtonPointerDown}
        onClick={onUpdate}
        disabled={isApplying}
      >
        {isApplying ? "Actualizando…" : "Actualizar"}
      </button>
    </aside>
  );
}
