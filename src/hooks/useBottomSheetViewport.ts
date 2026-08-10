import { useEffect, useRef, useState } from "react";

type UseBottomSheetViewportOptions = {
  focusKey: string | null;
  isOpen: boolean;
  onFocus: () => void;
};

export function useBottomSheetViewport({
  focusKey,
  isOpen,
  onFocus,
}: UseBottomSheetViewportOptions) {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const onFocusRef = useRef(onFocus);

  useEffect(() => {
    onFocusRef.current = onFocus;
  }, [onFocus]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function updateViewportInset() {
      const visualViewport = window.visualViewport;

      if (!visualViewport) {
        setKeyboardInset(0);
        return;
      }

      setKeyboardInset(
        Math.max(
          0,
          window.innerHeight - visualViewport.height - visualViewport.offsetTop,
        ),
      );
    }

    updateViewportInset();
    window.visualViewport?.addEventListener("resize", updateViewportInset);
    window.visualViewport?.addEventListener("scroll", updateViewportInset);
    const focusFrame = window.requestAnimationFrame(() => onFocusRef.current());

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.visualViewport?.removeEventListener("resize", updateViewportInset);
      window.visualViewport?.removeEventListener("scroll", updateViewportInset);
    };
  }, [focusKey, isOpen]);

  return keyboardInset;
}
