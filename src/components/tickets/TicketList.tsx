import type { PointerEvent } from "react";

import styles from "../../App.module.scss";
import type {
  ShoppingCanonicalProduct,
  ShoppingSection,
  ShoppingTicket,
  ShoppingTicketFile,
  ShoppingTicketLine,
  ShoppingTicketStatus,
} from "../../shoppingItems";
import { Icon } from "../ui/Icon";

type TicketListProps = {
  canonicalProducts: ShoppingCanonicalProduct[];
  formatDate: (value: number) => string;
  formatFileSize: (sizeBytes: number) => string;
  getLineName: (line: ShoppingTicketLine) => string;
  getLinePriceText: (line: ShoppingTicketLine) => string | null;
  getStatusText: (status: ShoppingTicketStatus) => string;
  getUserName: (userId: ShoppingTicket["uploadedBy"]) => string;
  hiddenCount: number;
  isLoading: boolean;
  onButtonPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onCorrectLine: (
    ticket: ShoppingTicket,
    line: ShoppingTicketLine,
    createAlias: boolean,
  ) => void;
  onCorrectionProductChange: (
    line: ShoppingTicketLine,
    productId: string,
  ) => void;
  onOpenFile: (file: ShoppingTicketFile) => void;
  onSelectedTicketChange: (ticketId: string | null) => void;
  onShowMore: () => void;
  pageSize: number;
  pendingLineId: string | null;
  productIds: Record<string, string>;
  sections: ShoppingSection[];
  selectedTicketId: string | null;
  tickets: ShoppingTicket[];
};

export function TicketList({
  canonicalProducts,
  formatDate,
  formatFileSize,
  getLineName,
  getLinePriceText,
  getStatusText,
  getUserName,
  hiddenCount,
  isLoading,
  onButtonPointerDown,
  onCorrectLine,
  onCorrectionProductChange,
  onOpenFile,
  onSelectedTicketChange,
  onShowMore,
  pageSize,
  pendingLineId,
  productIds,
  sections,
  selectedTicketId,
  tickets,
}: TicketListProps) {
  if (isLoading && tickets.length === 0) {
    return (
      <p className={styles.loadingStatus} role="status">
        Cargando tickets...
      </p>
    );
  }

  if (tickets.length === 0) return null;

  return (
    <>
      <ol className={styles.ticketList}>
        {tickets.map((ticket) => {
          const sectionName =
            sections.find((section) => section.id === ticket.sectionId)?.name ??
            ticket.sectionId;
          const isSelected = selectedTicketId === ticket.id;

          return (
            <li className={styles.ticketItem} key={ticket.id}>
              <button
                className={styles.ticketItemButton}
                type="button"
                onPointerDown={onButtonPointerDown}
                onClick={() =>
                  onSelectedTicketChange(isSelected ? null : ticket.id)
                }
                aria-expanded={isSelected}
              >
                <span className={styles.ticketStatus}>
                  {getStatusText(ticket.status)}
                </span>
                <strong>{sectionName}</strong>
                <span>
                  {formatDate(ticket.uploadedAt)} ·{" "}
                  {getUserName(ticket.uploadedBy)} · {ticket.fileCount}{" "}
                  {ticket.fileCount === 1 ? "archivo" : "archivos"}
                </span>
              </button>
              {isSelected ? (
                <TicketDetail
                  canonicalProducts={canonicalProducts}
                  formatFileSize={formatFileSize}
                  getLineName={getLineName}
                  getLinePriceText={getLinePriceText}
                  onButtonPointerDown={onButtonPointerDown}
                  onCorrectLine={onCorrectLine}
                  onCorrectionProductChange={onCorrectionProductChange}
                  onOpenFile={onOpenFile}
                  pendingLineId={pendingLineId}
                  productIds={productIds}
                  ticket={ticket}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {hiddenCount > 0 ? (
        <button
          className={styles.paginationButton}
          type="button"
          onPointerDown={onButtonPointerDown}
          onClick={onShowMore}
        >
          Ver {Math.min(hiddenCount, pageSize)} tickets más
        </button>
      ) : null}
    </>
  );
}

type TicketDetailProps = Pick<
  TicketListProps,
  | "canonicalProducts"
  | "formatFileSize"
  | "getLineName"
  | "getLinePriceText"
  | "onButtonPointerDown"
  | "onCorrectLine"
  | "onCorrectionProductChange"
  | "onOpenFile"
  | "pendingLineId"
  | "productIds"
> & { ticket: ShoppingTicket };

function TicketDetail({
  canonicalProducts,
  formatFileSize,
  getLineName,
  getLinePriceText,
  onButtonPointerDown,
  onCorrectLine,
  onCorrectionProductChange,
  onOpenFile,
  pendingLineId,
  productIds,
  ticket,
}: TicketDetailProps) {
  return (
    <div className={styles.ticketDetail}>
      {ticket.files.length > 0 ? (
        <ol
          className={styles.ticketFileActions}
          aria-label="Archivos del ticket"
        >
          {ticket.files.map((file) => (
            <li key={file.id}>
              <button
                className={styles.ticketFileButton}
                type="button"
                onPointerDown={onButtonPointerDown}
                onClick={() => onOpenFile(file)}
              >
                <Icon name="file" />
                <span>{file.fileName}</span>
                <small>{formatFileSize(file.sizeBytes)}</small>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      {ticket.errorMessage ? (
        <p className={styles.historyMeta}>{ticket.errorMessage}</p>
      ) : null}
      {ticket.lines.length > 0 ? (
        <ol className={styles.ticketLines}>
          {ticket.lines.map((line) => {
            const selectedProductId =
              productIds[line.id] ?? line.canonicalProductId ?? "";
            const canCorrectLine = !line.needsReview;
            const canCreateAlias =
              canCorrectLine &&
              Boolean(selectedProductId) &&
              Boolean((line.productName ?? line.rawText)?.trim());
            const isPending = pendingLineId === line.id;

            return (
              <li
                key={line.id}
                className={
                  line.needsReview
                    ? styles.ticketLineNeedsReview
                    : line.status === "excluded"
                      ? styles.ticketLineExcluded
                      : styles.ticketLine
                }
              >
                <strong>{getLineName(line)}</strong>
                <span>{getLinePriceText(line)}</span>
                {line.needsReview ? (
                  <small>{line.reviewReason ?? "Necesita revisión"}</small>
                ) : null}
                {line.status === "excluded" ? <small>Excluida</small> : null}
                {canCorrectLine ? (
                  <div className={styles.ticketLineCorrection}>
                    <label
                      className={styles.visuallyHidden}
                      htmlFor={`ticket-line-correction-${line.id}`}
                    >
                      Corregir producto canónico
                    </label>
                    <select
                      id={`ticket-line-correction-${line.id}`}
                      className={styles.select}
                      value={selectedProductId}
                      onChange={(event) =>
                        onCorrectionProductChange(line, event.target.value)
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
                    <div className={styles.ticketLineCorrectionButtons}>
                      <button
                        className={styles.iconButton}
                        type="button"
                        aria-label="Corregir asociación"
                        title="Corregir asociación"
                        onPointerDown={onButtonPointerDown}
                        onClick={() => onCorrectLine(ticket, line, false)}
                        disabled={isPending || !selectedProductId}
                      >
                        <Icon name="check" />
                      </button>
                      <button
                        className={styles.iconButton}
                        type="button"
                        aria-label="Corregir alias"
                        title="Corregir y crear alias"
                        onPointerDown={onButtonPointerDown}
                        onClick={() => onCorrectLine(ticket, line, true)}
                        disabled={isPending || !canCreateAlias}
                      >
                        <Icon name="plus" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={styles.historyMeta}>
          Las líneas aparecerán tras el procesamiento nocturno.
        </p>
      )}
    </div>
  );
}
