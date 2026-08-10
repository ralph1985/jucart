import styles from "../../App.module.scss";

type DeveloperAppContextProps = {
  historyCount: number;
  pendingCount: number;
  purchasedCount: number;
  sectionCount: number;
  storageMode: string;
  supabaseConfigured: boolean;
  syncStatusText: string;
};

export function DeveloperAppContext({
  historyCount,
  pendingCount,
  purchasedCount,
  sectionCount,
  storageMode,
  supabaseConfigured,
  syncStatusText,
}: DeveloperAppContextProps) {
  return (
    <section
      className={styles.developerPanel}
      aria-label="Información operativa"
    >
      <div className={styles.developerPanelHeader}>
        <h3>App</h3>
        <span className={styles.developerStatusSuccess}>{syncStatusText}</span>
      </div>
      <dl className={styles.developerMetrics}>
        <div>
          <dt>Almacenamiento</dt>
          <dd>{storageMode}</dd>
        </div>
        <div>
          <dt>Supabase</dt>
          <dd>{supabaseConfigured ? "Configurado" : "No configurado"}</dd>
        </div>
        <div>
          <dt>Listas</dt>
          <dd>{sectionCount}</dd>
        </div>
        <div>
          <dt>Pendientes</dt>
          <dd>{pendingCount}</dd>
        </div>
        <div>
          <dt>Comprados</dt>
          <dd>{purchasedCount}</dd>
        </div>
        <div>
          <dt>Historial 30 días</dt>
          <dd>{historyCount}</dd>
        </div>
      </dl>
    </section>
  );
}
