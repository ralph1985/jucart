import type { ReactNode, Ref } from "react";

import styles from "../../App.module.scss";

type SectionsViewShellProps = {
  children: ReactNode;
  count: number;
  screenRef: Ref<HTMLElement>;
};

export function SectionsViewShell({
  children,
  count,
  screenRef,
}: SectionsViewShellProps) {
  return (
    <section
      ref={screenRef}
      className={styles.sectionsScreen}
      aria-labelledby="sections-title"
    >
      <div className={styles.sectionsHeader}>
        <h2 id="sections-title">Listas</h2>
        <span className={styles.count}>{count}</span>
      </div>
      {children}
    </section>
  );
}
