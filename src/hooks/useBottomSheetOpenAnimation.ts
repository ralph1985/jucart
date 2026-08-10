import { animate } from "animejs";
import { useLayoutEffect, type RefObject } from "react";

type UseBottomSheetOpenAnimationOptions = {
  backdropRef: RefObject<HTMLElement | null>;
  isClosing: boolean;
  isOpen: boolean;
  sheetRef: RefObject<HTMLElement | null>;
};

function shouldAnimate() {
  if (import.meta.env.MODE === "test") {
    return false;
  }

  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function useBottomSheetOpenAnimation({
  backdropRef,
  isClosing,
  isOpen,
  sheetRef,
}: UseBottomSheetOpenAnimationOptions) {
  useLayoutEffect(() => {
    if (!isOpen || isClosing || !shouldAnimate()) {
      return;
    }

    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;

    if (!sheet || !backdrop) {
      return;
    }

    animate(backdrop, {
      opacity: [0, 1],
      duration: 180,
      ease: "outCubic",
    });
    animate(sheet, {
      opacity: [0.92, 1],
      y: ["100%", 0],
      duration: 260,
      ease: "outCubic",
    });
  }, [backdropRef, isClosing, isOpen, sheetRef]);
}
