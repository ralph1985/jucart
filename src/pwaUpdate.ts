import { registerSW } from "virtual:pwa-register";

import {
  pwaUpdateApplyEvent,
  pwaUpdateAvailableEvent,
} from "./pwaUpdateEvents";

export function registerPwaUpdate() {
  let visibilityListener: (() => void) | null = null;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new Event(pwaUpdateAvailableEvent));
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) {
        return;
      }

      visibilityListener = () => {
        if (document.visibilityState === "visible") {
          void registration.update();
        }
      };
      document.addEventListener("visibilitychange", visibilityListener);
    },
  });

  const applyUpdate = () => {
    void updateSW(true);
  };
  window.addEventListener(pwaUpdateApplyEvent, applyUpdate);

  return () => {
    window.removeEventListener(pwaUpdateApplyEvent, applyUpdate);
    if (visibilityListener) {
      document.removeEventListener("visibilitychange", visibilityListener);
    }
  };
}
