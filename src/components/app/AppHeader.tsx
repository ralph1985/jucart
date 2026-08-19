import type { PointerEventHandler, RefObject } from "react";

import styles from "../../App.module.scss";
import { HeaderLogo, Icon } from "../ui/Icon";
import { formatAppDate, type AppReleaseInfo } from "../../appVersion";

export type ThemePreference = "auto" | "light" | "dark";
export type SyncStatus = "local" | "syncing" | "synced" | "offline";

const themePreferenceLabels: Record<ThemePreference, string> = {
  auto: "Auto",
  light: "Claro",
  dark: "Oscuro",
};

function getNextThemePreference(preference: ThemePreference): ThemePreference {
  if (preference === "auto") {
    return "light";
  }

  return preference === "light" ? "dark" : "auto";
}

type AppHeaderProps = {
  appRelease: AppReleaseInfo;
  isLoaded: boolean;
  pendingCount: number;
  purchasedCount: number;
  syncStatus: SyncStatus;
  syncStatusRef: RefObject<HTMLParagraphElement | null>;
  themePreference: ThemePreference;
  onThemePreferenceChange: () => void;
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
  getSyncStatusText: (status: SyncStatus) => string;
  noticeCount: number;
  onOpenNotices: () => void;
};

export function AppHeader({
  appRelease,
  isLoaded,
  pendingCount,
  purchasedCount,
  syncStatus,
  syncStatusRef,
  themePreference,
  onThemePreferenceChange,
  onButtonPointerDown,
  getSyncStatusText,
  noticeCount,
  onOpenNotices,
}: AppHeaderProps) {
  return (
    <section className={styles.header} aria-labelledby="app-title">
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          <HeaderLogo />
        </span>
        <div>
          <p className={styles.kicker}>Lista de la compra</p>
          <h1 id="app-title">Jucart</h1>
        </div>
      </div>
      <div className={styles.headerMeta}>
        <dl className={styles.summary} aria-label="Resumen de la lista">
          <div className={styles.summaryItem}>
            <dt>Pendientes</dt>
            <dd>
              {isLoaded ? (
                pendingCount
              ) : (
                <span className={styles.loadingSummaryValue} />
              )}
            </dd>
          </div>
          <div className={styles.summaryItem}>
            <dt>Comprados</dt>
            <dd>
              {isLoaded ? (
                purchasedCount
              ) : (
                <span className={styles.loadingSummaryValue} />
              )}
            </dd>
          </div>
        </dl>
        <div className={styles.headerActions}>
          <p
            ref={syncStatusRef}
            className={`${styles.syncStatus} ${styles[`syncStatus${syncStatus}`]}`}
            aria-live="polite"
          >
            {syncStatus === "syncing" ? (
              <span className={styles.syncStatusIndicator} aria-hidden="true" />
            ) : null}
            {getSyncStatusText(syncStatus)}
          </p>
          <button
            className={styles.noticeBellButton}
            type="button"
            aria-label={
              noticeCount === 0
                ? "Abrir avisos"
                : `Abrir avisos. ${noticeCount} pendientes.`
            }
            onPointerDown={onButtonPointerDown}
            onClick={onOpenNotices}
          >
            <Icon name="bell" />
            {noticeCount > 0 ? (
              <span className={styles.noticeBellCount} aria-hidden="true">
                {noticeCount > 99 ? "99+" : noticeCount}
              </span>
            ) : null}
          </button>
          <button
            className={styles.themeToggle}
            type="button"
            aria-label={`Tema ${themePreferenceLabels[themePreference]}. Cambiar a ${themePreferenceLabels[getNextThemePreference(themePreference)]}.`}
            title={`Tema: ${themePreferenceLabels[themePreference]}`}
            onPointerDown={onButtonPointerDown}
            onClick={onThemePreferenceChange}
          >
            <span aria-hidden="true">
              {themePreference === "auto"
                ? "◐"
                : themePreference === "light"
                  ? "☀"
                  : "☾"}
            </span>
            <span>{themePreferenceLabels[themePreference]}</span>
          </button>
        </div>
        <p className={styles.appVersion} aria-label="Versión instalada">
          v{appRelease.version} · build {formatAppDate(appRelease.buildDate)} ·
          activa {formatAppDate(appRelease.activatedAt)}
        </p>
      </div>
    </section>
  );
}
