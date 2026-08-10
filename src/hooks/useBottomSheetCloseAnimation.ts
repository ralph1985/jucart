import { animate } from "animejs";
import { useCallback } from "react";

type UseBottomSheetCloseAnimationOptions<TOverlay extends string> = {
  closingOverlay: TOverlay | null;
  dragOffset: number;
  onStartClosing: (overlay: TOverlay) => void;
};

type CloseBottomSheetOptions<TOverlay extends string> = {
  backdrop: HTMLElement | null;
  onClose: () => void;
  overlay: TOverlay;
  sheet: HTMLElement | null;
};

function shouldAnimate() {
  if (import.meta.env.MODE === "test") {
    return false;
  }

  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function useBottomSheetCloseAnimation<TOverlay extends string>({
  closingOverlay,
  dragOffset,
  onStartClosing,
}: UseBottomSheetCloseAnimationOptions<TOverlay>) {
  return useCallback(
    ({
      backdrop,
      onClose,
      overlay,
      sheet,
    }: CloseBottomSheetOptions<TOverlay>) => {
      if (closingOverlay === overlay) {
        return;
      }

      if (!sheet || !backdrop || !shouldAnimate()) {
        onClose();
        return;
      }

      onStartClosing(overlay);
      let hasClosed = false;
      const closeOnce = () => {
        if (hasClosed) {
          return;
        }

        hasClosed = true;
        onClose();
      };

      try {
        animate(backdrop, {
          opacity: [1, 0],
          duration: 180,
          ease: "outCubic",
        });
        animate(sheet, {
          opacity: [1, 0.88],
          y: [Math.max(dragOffset, 0), "100%"],
          duration: 220,
          ease: "inCubic",
          onComplete: closeOnce,
        });
      } catch {
        closeOnce();
      }
    },
    [closingOverlay, dragOffset, onStartClosing],
  );
}
