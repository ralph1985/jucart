import type { PointerEventHandler, RefObject } from "react";

import styles from "../../App.module.scss";
import { Icon, type IconName } from "../ui/Icon";

type FloatingActionButtonProps = {
  buttonRef: RefObject<HTMLButtonElement | null>;
  label: string;
  icon: IconName;
  disabled: boolean;
  onButtonPointerDown: PointerEventHandler<HTMLButtonElement>;
  onClick: () => void;
};

export function FloatingActionButton({
  buttonRef,
  label,
  icon,
  disabled,
  onButtonPointerDown,
  onClick,
}: FloatingActionButtonProps) {
  return (
    <button
      ref={buttonRef}
      className={styles.floatingAddButton}
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={onButtonPointerDown}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={icon} />
    </button>
  );
}
