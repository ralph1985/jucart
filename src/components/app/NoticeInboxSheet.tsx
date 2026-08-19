import type { PointerEvent, PointerEventHandler, RefObject } from "react";

import styles from "../../App.module.scss";
import { BottomSheetFrame } from "../ui/BottomSheetFrame";
import { Icon } from "../ui/Icon";

export type NoticeInboxItem = {
  id: string;
  count: number;
  label: string;
  actionLabel: string;
  onOpen: () => void;
};

type NoticeInboxSheetProps = {
  backdropRef: RefObject<HTMLDivElement | null>;
  dragOffset: number;
  items: NoticeInboxItem[];
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
  onClose: () => void;
  onDragEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onDragMove: (event: PointerEvent<HTMLDivElement>) => void;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  sheetRef: RefObject<HTMLElement | null>;
};

export function NoticeInboxSheet({
  backdropRef,
  dragOffset,
  items,
  onButtonPointerDown,
  onClose,
  onDragEnd,
  onDragMove,
  onDragStart,
  sheetRef,
}: NoticeInboxSheetProps) {
  const totalCount = items.reduce((total, item) => total + item.count, 0);

  return (
    <BottomSheetFrame
      ariaLabelledBy="notice-inbox-title"
      backdropRef={backdropRef}
      className={styles.noticeInboxSheet}
      dragOffset={dragOffset}
      handleLabel="Cerrar avisos"
      onClose={onClose}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
      onDragStart={onDragStart}
      sheetRef={sheetRef}
      subtitle={`${totalCount} ${totalCount === 1 ? "aviso pendiente" : "avisos pendientes"}`}
      title="Avisos"
    >
      <div className={styles.noticeInboxList}>
        {items.map((item) => (
          <article className={styles.noticeInboxItem} key={item.id}>
            <div className={styles.noticeInboxItemIcon} aria-hidden="true">
              <Icon name="bell" />
            </div>
            <div className={styles.noticeInboxItemBody}>
              <p>{item.label}</p>
              <button
                className={styles.noticeInboxAction}
                type="button"
                onPointerDown={onButtonPointerDown}
                onClick={item.onOpen}
              >
                {item.actionLabel}
              </button>
            </div>
            <span
              className={styles.noticeInboxCount}
              aria-label={`${item.count}`}
            >
              {item.count}
            </span>
          </article>
        ))}
      </div>
    </BottomSheetFrame>
  );
}
