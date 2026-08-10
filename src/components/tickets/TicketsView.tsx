import type { ReactNode, Ref } from "react";

import styles from "../../App.module.scss";

type TicketsViewProps = {
  children: ReactNode;
  count: number;
  error: string | null;
  notice: string | null;
  screenRef: Ref<HTMLElement>;
};

export function TicketsView({
  children,
  count,
  error,
  notice,
  screenRef,
}: TicketsViewProps) {
  return (
    <section
      ref={screenRef}
      className={styles.ticketsScreen}
      aria-labelledby="tickets-title"
    >
      <div className={styles.screenTitle}>
        <h2 id="tickets-title">Tickets</h2>
        <span className={styles.count}>{count}</span>
      </div>
      {notice ? (
        <p className={styles.ticketNotice} role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {children}
    </section>
  );
}
