import styles from "./App.module.scss";

export function App() {
  return (
    <main className={styles.app}>
      <section className={styles.header} aria-labelledby="app-title">
        <p className={styles.kicker}>Lista de la compra</p>
        <h1 id="app-title">Jucart</h1>
      </section>
    </main>
  );
}
