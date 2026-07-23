import { afterEach, describe, expect, it, vi } from "vitest";

import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationSnapshot,
} from "./pushNotifications";
import {
  disableSupabasePushSubscription,
  registerSupabasePushSubscription,
} from "./shoppingItemsSupabase";

vi.mock("./shoppingItemsSupabase", () => ({
  disableSupabasePushSubscription: vi.fn(() => Promise.resolve(true)),
  registerSupabasePushSubscription: vi.fn(() => Promise.resolve(true)),
}));

function setNotificationApi(
  permission: NotificationPermission,
  requestPermission = vi.fn(() => Promise.resolve(permission)),
) {
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: {
      permission,
      requestPermission,
    },
  });

  return { requestPermission };
}

function setPushApi(subscription: PushSubscription | null = null) {
  const currentSubscription = subscription;
  const nextSubscription =
    subscription ?? createPushSubscription("https://push.example/new");
  const pushManager = {
    getSubscription: vi.fn(() => Promise.resolve(currentSubscription)),
    subscribe: vi.fn(() => Promise.resolve(nextSubscription)),
  };
  const serviceWorker = {
    ready: Promise.resolve({ pushManager }),
  };

  Object.defineProperty(globalThis, "PushManager", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: serviceWorker,
  });

  return {
    pushManager,
    subscription: nextSubscription,
  };
}

function createPushSubscription(endpoint: string): PushSubscription {
  return {
    endpoint,
    getKey: vi.fn(),
    options: {
      applicationServerKey: null,
      userVisibleOnly: true,
    },
    toJSON: () => ({
      endpoint,
      keys: {
        auth: "auth-key",
        p256dh: "p256dh-key",
      },
    }),
    unsubscribe: vi.fn(() => Promise.resolve(true)),
  } as unknown as PushSubscription;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "Notification");
  Reflect.deleteProperty(globalThis, "PushManager");
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("pushNotifications", () => {
  it("reports unsupported browsers without requesting permission", async () => {
    vi.stubEnv("VITE_PUSH_VAPID_PUBLIC_KEY", "public-key");

    await expect(getPushNotificationSnapshot()).resolves.toEqual({
      message: "No soportadas",
      status: "unsupported",
    });
  });

  it("reports pending permission without requesting it", async () => {
    vi.stubEnv("VITE_PUSH_VAPID_PUBLIC_KEY", "public-key");
    const { requestPermission } = setNotificationApi("default");
    setPushApi();

    await expect(getPushNotificationSnapshot()).resolves.toEqual({
      message: "Pendientes",
      status: "prompt",
    });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("subscribes and stores the push endpoint after permission is granted", async () => {
    vi.stubEnv(
      "VITE_PUSH_VAPID_PUBLIC_KEY",
      "BHrmrkMlKLRikY-WOROxZs-gSg-yH_Bo20dp1Kt2BRFB9dvny_3I-ymbUpcowJJGPCNkQCM6HA8yC5MZtL-ijXU",
    );
    const { requestPermission } = setNotificationApi(
      "default",
      vi.fn(() => Promise.resolve("granted" as NotificationPermission)),
    );
    const { pushManager } = setPushApi();

    await expect(enablePushNotifications("client-1")).resolves.toEqual({
      message: "Activadas",
      status: "subscribed",
    });

    expect(requestPermission).toHaveBeenCalledOnce();
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      applicationServerKey: expect.any(Uint8Array),
      userVisibleOnly: true,
    });
    expect(registerSupabasePushSubscription).toHaveBeenCalledWith({
      auth: "auth-key",
      clientId: "client-1",
      endpoint: "https://push.example/new",
      p256dh: "p256dh-key",
      userAgent: navigator.userAgent,
    });
  });

  it("does not subscribe when permission is denied", async () => {
    vi.stubEnv("VITE_PUSH_VAPID_PUBLIC_KEY", "public-key");
    setNotificationApi(
      "default",
      vi.fn(() => Promise.resolve("denied" as NotificationPermission)),
    );
    const { pushManager } = setPushApi();

    await expect(enablePushNotifications("client-1")).resolves.toEqual({
      message: "Bloqueadas",
      status: "denied",
    });

    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(registerSupabasePushSubscription).not.toHaveBeenCalled();
  });

  it("disables the stored endpoint and unsubscribes locally", async () => {
    vi.stubEnv("VITE_PUSH_VAPID_PUBLIC_KEY", "public-key");
    setNotificationApi("granted");
    const subscription = createPushSubscription("https://push.example/current");
    setPushApi(subscription);

    await expect(disablePushNotifications()).resolves.toEqual({
      message: "Desactivadas",
      status: "unsubscribed",
    });

    expect(disableSupabasePushSubscription).toHaveBeenCalledWith(
      "https://push.example/current",
    );
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });
});
