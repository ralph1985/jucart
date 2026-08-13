import { useEffect, useState } from "react";

export function useVisualViewportInset() {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
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

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewportInset);
      window.visualViewport?.removeEventListener("scroll", updateViewportInset);
    };
  }, []);

  return keyboardInset;
}
