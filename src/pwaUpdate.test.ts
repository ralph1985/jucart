import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  pwaUpdateApplyEvent,
  pwaUpdateApplyFailedEvent,
  pwaUpdateAvailableEvent,
} from "./pwaUpdateEvents";

type PwaCallbacks = {
  onNeedRefresh: () => void;
  onRegisteredSW: (
    swUrl: string,
    registration: ServiceWorkerRegistration | undefined,
  ) => void;
};

const pwaMocks = vi.hoisted(() => {
  let callbacks = {} as PwaCallbacks;
  const registrationUpdate = vi.fn(() => Promise.resolve());
  const registration = {
    update: registrationUpdate,
  } as unknown as ServiceWorkerRegistration;
  const updateSW = vi.fn(() => Promise.resolve());
  const registerSW = vi.fn((options) => {
    callbacks = options;
    return updateSW;
  });

  return {
    callbacks: () => callbacks,
    registerSW,
    registration,
    updateSW,
    reset() {
      callbacks = {} as PwaCallbacks;
      registerSW.mockClear();
      registrationUpdate.mockClear();
      updateSW.mockClear();
    },
  };
});

vi.mock("virtual:pwa-register", () => ({
  registerSW: pwaMocks.registerSW,
}));

import { registerPwaUpdate } from "./pwaUpdate";

describe("pwaUpdate", () => {
  beforeEach(() => {
    pwaMocks.reset();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
  });

  it("avisa cuando hay una actualización disponible", () => {
    const listener = vi.fn();
    window.addEventListener(pwaUpdateAvailableEvent, listener);
    const cleanup = registerPwaUpdate();

    pwaMocks.callbacks().onNeedRefresh();

    expect(listener).toHaveBeenCalledOnce();
    expect(pwaMocks.registerSW).toHaveBeenCalledWith(
      expect.objectContaining({ immediate: true }),
    );

    cleanup();
    window.removeEventListener(pwaUpdateAvailableEvent, listener);
  });

  it("comprueba la versión al volver a primer plano", () => {
    const cleanup = registerPwaUpdate();
    pwaMocks.callbacks().onRegisteredSW("/sw.js", pwaMocks.registration);

    Object.defineProperty(document, "visibilityState", { value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(pwaMocks.registration.update).toHaveBeenCalledOnce();
    cleanup();
  });

  it("activa la actualización y recarga mediante el evento de aplicación", () => {
    const cleanup = registerPwaUpdate();

    window.dispatchEvent(new Event(pwaUpdateApplyEvent));

    expect(pwaMocks.updateSW).toHaveBeenCalledWith(true);
    cleanup();
  });

  it("avisa si falla la activación de la actualización", async () => {
    const listener = vi.fn();
    window.addEventListener(pwaUpdateApplyFailedEvent, listener);
    pwaMocks.updateSW.mockRejectedValueOnce(new Error("offline"));
    const cleanup = registerPwaUpdate();

    window.dispatchEvent(new Event(pwaUpdateApplyEvent));
    await Promise.resolve();

    expect(listener).toHaveBeenCalledOnce();
    cleanup();
    window.removeEventListener(pwaUpdateApplyFailedEvent, listener);
  });

  it("permite registrarse aunque aún no exista una registration", () => {
    const cleanup = registerPwaUpdate();

    expect(() =>
      pwaMocks.callbacks().onRegisteredSW("/sw.js", undefined),
    ).not.toThrow();
    cleanup();
  });
});
