import type { ReactNode, Ref } from "react";

import styles from "../../App.module.scss";

type DeveloperViewShellProps = {
  children: ReactNode;
  screenRef: Ref<HTMLElement>;
};

export function DeveloperViewShell({
  children,
  screenRef,
}: DeveloperViewShellProps) {
  return (
    <section
      ref={screenRef}
      className={styles.developerScreen}
      aria-labelledby="developer-title"
    >
      <div className={styles.sectionsHeader}>
        <h2 id="developer-title">Dev</h2>
        <span className={styles.count}>Panel operativo</span>
      </div>
      {children}
    </section>
  );
}
