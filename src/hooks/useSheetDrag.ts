import type { PointerEvent } from "react";
import { useRef, useState } from "react";

type UseSheetDragOptions = {
  onDismiss: () => void;
};

export function useSheetDrag({ onDismiss }: UseSheetDragOptions) {
  const [offset, setOffset] = useState(0);
  const startYRef = useRef<number | null>(null);

  function reset() {
    setOffset(0);
    startYRef.current = null;
  }

  function handleStart(event: PointerEvent<HTMLDivElement>) {
    startYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (startYRef.current === null) {
      return;
    }

    setOffset(Math.max(0, event.clientY - startYRef.current));
  }

  function handleEnd() {
    if (offset > 70) {
      onDismiss();
      return;
    }

    reset();
  }

  return {
    handleEnd,
    handleMove,
    handleStart,
    offset,
    reset,
  };
}
