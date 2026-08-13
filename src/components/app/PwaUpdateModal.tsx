import { useEffect, useRef } from "react";
import type { PointerEventHandler } from "react";

import styles from "../../App.module.scss";

type PwaUpdateModalProps = {
  isAvailable: boolean;
  isApplying: boolean;
  errorMessage: string | null;
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
  onUpdate: () => void;
};

export function PwaUpdateModal({
  errorMessage,
  isApplying,
  isAvailable,
  onButtonPointerDown,
  onUpdate,
}: PwaUpdateModalProps) {
  const updateButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isAvailable && !isApplying) {
      updateButtonRef.current?.focus();
    }
  }, [isApplying, isAvailable]);

  if (!isAvailable) {
    return null;
  }

  return (
    <div className={styles.pwaUpdateModalBackdrop}>
      <section
        className={styles.pwaUpdateModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-update-title"
        aria-describedby="pwa-update-description"
        onKeyDown={(event) => {
          if (event.key === "Escape" || event.key === "Tab") {
            event.preventDefault();
            updateButtonRef.current?.focus();
          }
        }}
      >
        <span className={styles.pwaUpdateModalKicker}>Nueva versión</span>
        <h2 id="pwa-update-title">Actualiza Jucart</h2>
        <p id="pwa-update-description">
          Hay una versión nueva disponible. Actualiza para seguir usando la
          aplicación con normalidad.
        </p>
        {errorMessage ? (
          <p className={styles.pwaUpdateModalError} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <button
          ref={updateButtonRef}
          className={styles.primaryButton}
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onUpdate}
          disabled={isApplying}
        >
          {isApplying ? "Actualizando…" : "Actualizar"}
        </button>
      </section>
    </div>
  );
}
