import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

type UseOverlayHistoryOptions<TOverlay extends string> = {
  onPopOverlayRef: MutableRefObject<((overlay: TOverlay) => void) | null>;
  stateKey: string;
};

export function useOverlayHistory<TOverlay extends string>({
  onPopOverlayRef,
  stateKey,
}: UseOverlayHistoryOptions<TOverlay>) {
  const stackRef = useRef<TOverlay[]>([]);
  const ignoreNextPopRef = useRef(false);

  useEffect(() => {
    function handlePopState() {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }

      const overlay = stackRef.current.pop();

      if (overlay) {
        onPopOverlayRef.current?.(overlay);
      }
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [onPopOverlayRef]);

  const push = useCallback(
    (overlay: TOverlay) => {
      const stack = stackRef.current;

      if (stack.at(-1) === overlay) {
        return;
      }

      const currentState =
        typeof window.history.state === "object" &&
        window.history.state !== null
          ? window.history.state
          : {};

      stack.push(overlay);
      window.history.pushState(
        { ...currentState, [stateKey]: overlay },
        "",
        window.location.href,
      );
    },
    [stateKey],
  );

  const consume = useCallback((overlay: TOverlay) => {
    const stack = stackRef.current;

    if (stack.at(-1) !== overlay) {
      return;
    }

    stack.pop();
    ignoreNextPopRef.current = true;
    window.history.back();
  }, []);

  return { consume, push };
}
