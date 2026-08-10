import styles from "../../App.module.scss";
import type { ShoppingHistoryEvent } from "../../shoppingItems";

type HistoryEventsListProps = {
  events: ShoppingHistoryEvent[];
  formatDate: (createdAt: number) => string;
  getEventMeta: (event: ShoppingHistoryEvent) => string;
  getEventText: (event: ShoppingHistoryEvent) => string;
  showUnseenOnly: boolean;
};

export function HistoryEventsList({
  events,
  formatDate,
  getEventMeta,
  getEventText,
  showUnseenOnly,
}: HistoryEventsListProps) {
  if (events.length === 0) {
    return (
      <div className={styles.historyEmpty}>
        <p className={styles.emptyTitle}>
          {showUnseenOnly
            ? "No hay cambios pendientes"
            : "No hay historial reciente"}
        </p>
        <p className={styles.emptyDescription}>
          {showUnseenOnly
            ? "Los cambios de otros dispositivos ya están revisados."
            : "Las compras y borrados aparecerán aquí durante 30 días."}
        </p>
      </div>
    );
  }

  return (
    <ol className={styles.historyList}>
      {events.map((event) => (
        <li className={styles.historyItem} key={event.id}>
          <div className={styles.historyItemHeader}>
            <span className={styles.historyAction}>{getEventText(event)}</span>
            <time dateTime={new Date(event.createdAt).toISOString()}>
              {formatDate(event.createdAt)}
            </time>
          </div>
          <p className={styles.historyProduct}>{event.item.name}</p>
          <p className={styles.historyMeta}>{getEventMeta(event)}</p>
        </li>
      ))}
    </ol>
  );
}
