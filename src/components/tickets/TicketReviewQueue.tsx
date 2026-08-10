import type { PointerEvent } from "react";

import styles from "../../App.module.scss";
import type {
  ShoppingCanonicalProduct,
  ShoppingSection,
  ShoppingTicket,
  ShoppingTicketLine,
} from "../../shoppingItems";
import { Icon } from "../ui/Icon";

type TicketReviewEntry = { ticket: ShoppingTicket; line: ShoppingTicketLine };

type TicketReviewQueueProps = {
  canonicalProducts: ShoppingCanonicalProduct[];
  entries: TicketReviewEntry[];
  getLineName: (line: ShoppingTicketLine) => string;
  getLinePriceText: (line: ShoppingTicketLine) => string | null;
  formatDate: (value: number) => string;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onExclude: (ticket: ShoppingTicket, line: ShoppingTicketLine) => void;
  onProductChange: (lineId: string, productId: string) => void;
  onResolve: (
    ticket: ShoppingTicket,
    line: ShoppingTicketLine,
    createAlias: boolean,
  ) => void;
  onView: (ticketId: string) => void;
  pendingLineId: string | null;
  productIds: Record<string, string>;
  sections: ShoppingSection[];
};

export function TicketReviewQueue({
  canonicalProducts,
  entries,
  formatDate,
  getLineName,
  getLinePriceText,
  onButtonPointerDown,
  onExclude,
  onProductChange,
  onResolve,
  onView,
  pendingLineId,
  productIds,
  sections,
}: TicketReviewQueueProps) {
  if (entries.length === 0) return null;

  return (
    <section
      className={styles.ticketReviewQueue}
      aria-labelledby="ticket-review-queue-title"
    >
      <div className={styles.ticketReviewQueueHeader}>
        <h3 id="ticket-review-queue-title">Cola de revisión</h3>
        <span>{entries.length}</span>
      </div>
      <ol className={styles.ticketReviewList}>
        {entries.map(({ ticket, line }) => {
          const sectionName =
            sections.find((section) => section.id === ticket.sectionId)?.name ??
            ticket.sectionId;
          const linePriceText = getLinePriceText(line);
          const selectedProductId = productIds[line.id] ?? "";
          const isPending = pendingLineId === line.id;
          const canAlias =
            Boolean(selectedProductId) &&
            Boolean((line.productName ?? line.rawText)?.trim());
          return (
            <li key={line.id}>
              <div>
                <strong>{getLineName(line)}</strong>
                <span>
                  {sectionName} · {formatDate(ticket.uploadedAt)}
                </span>
                {linePriceText ? <small>{linePriceText}</small> : null}
                <small>{line.reviewReason ?? "Necesita revisión"}</small>
              </div>
              <div className={styles.ticketReviewActions}>
                <label
                  className={styles.visuallyHidden}
                  htmlFor={`ticket-line-product-${line.id}`}
                >
                  Producto canónico
                </label>
                <select
                  id={`ticket-line-product-${line.id}`}
                  className={styles.select}
                  value={selectedProductId}
                  onChange={(event) =>
                    onProductChange(line.id, event.target.value)
                  }
                  disabled={isPending || canonicalProducts.length === 0}
                >
                  <option value="">Producto</option>
                  {canonicalProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <div className={styles.ticketReviewActionButtons}>
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Ver"
                    title="Ver ticket"
                    onPointerDown={onButtonPointerDown}
                    onClick={() => onView(ticket.id)}
                  >
                    <Icon name="file" />
                  </button>
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Asociar"
                    title="Asociar producto"
                    onPointerDown={onButtonPointerDown}
                    onClick={() => onResolve(ticket, line, false)}
                    disabled={isPending || !selectedProductId}
                  >
                    <Icon name="check" />
                  </button>
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Alias"
                    title="Crear alias"
                    onPointerDown={onButtonPointerDown}
                    onClick={() => onResolve(ticket, line, true)}
                    disabled={isPending || !canAlias}
                  >
                    <Icon name="plus" />
                  </button>
                  <button
                    className={styles.iconButtonDanger}
                    type="button"
                    aria-label="Excluir"
                    title="Excluir línea"
                    onPointerDown={onButtonPointerDown}
                    onClick={() => onExclude(ticket, line)}
                    disabled={isPending}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
