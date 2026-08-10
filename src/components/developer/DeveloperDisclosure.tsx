import type { ReactNode } from "react";

import styles from "../../App.module.scss";

type DeveloperDisclosureProps<Id extends string> = {
  id: Id;
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: (id: Id) => void;
  children: ReactNode;
};

export function DeveloperDisclosure<Id extends string>({
  id,
  title,
  summary,
  expanded,
  onToggle,
  children,
}: DeveloperDisclosureProps<Id>) {
  const contentId = `developer-section-${id}`;

  return (
    <section className={styles.developerDisclosure}>
      <button
        className={styles.developerDisclosureButton}
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => onToggle(id)}
      >
        <span className={styles.developerDisclosureCopy}>
          <span className={styles.developerDisclosureTitle}>{title}</span>
          <span className={styles.developerDisclosureSummary}>{summary}</span>
        </span>
        <span className={styles.developerDisclosureAction} aria-hidden="true">
          {expanded ? "Ocultar" : "Ver"}
        </span>
      </button>
      <div
        id={contentId}
        className={styles.developerDisclosureContent}
        hidden={!expanded}
      >
        {children}
      </div>
    </section>
  );
}
