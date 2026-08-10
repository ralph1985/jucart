import styles from "../../App.module.scss";

export function ShoppingBoardLoading() {
  return [0, 1, 2].map((columnIndex) => (
    <article
      className={`${styles.column} ${styles.loadingColumn}`}
      aria-hidden="true"
      key={columnIndex}
    >
      <div className={styles.sectionHeader}>
        <span className={styles.loadingTitle} />
        <span className={styles.loadingCount} />
      </div>
      <ul className={`${styles.list} ${styles.loadingList}`}>
        {[0, 1, 2].map((itemIndex) => (
          <li className={styles.loadingItem} key={itemIndex}>
            <span className={styles.loadingCheck} />
            <span className={styles.loadingText} />
            <span className={styles.loadingMeta} />
            <span className={styles.loadingAction} />
          </li>
        ))}
      </ul>
    </article>
  ));
}
