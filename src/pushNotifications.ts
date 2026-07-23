export type PushNotificationStatus =
  | "unsupported"
  | "unconfigured"
  | "prompt"
  | "denied"
  | "subscribed"
  | "unsubscribed"
  | "syncing"
  | "error";

export type PushNotificationSnapshot = {
  status: PushNotificationStatus;
  message: string;
};

type SerializedPushSubscription = {
  endpoint?: string;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
};

export async function getPushNotificationSnapshot(): Promise<PushNotificationSnapshot> {
  const supportSnapshot = getPushNotificationSupportSnapshot();

  if (supportSnapshot) {
    return supportSnapshot;
  }

  if (Notification.permission === "denied") {
    return {
      status: "denied",
      message: "Bloqueadas",
    };
  }

  if (Notification.permission !== "granted") {
    return {
      status: "prompt",
      message: "Pendientes",
    };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription
      ? {
          status: "subscribed",
          message: "Activadas",
        }
      : {
          status: "unsubscribed",
          message: "Desactivadas",
        };
  } catch {
    return {
      status: "error",
      message: "Error",
    };
  }
}

export async function enablePushNotifications(
  clientId: string,
): Promise<PushNotificationSnapshot> {
  const supportSnapshot = getPushNotificationSupportSnapshot();

  if (supportSnapshot) {
    return supportSnapshot;
  }

  const permission = await Notification.requestPermission();

  if (permission === "denied") {
    return {
      status: "denied",
      message: "Bloqueadas",
    };
  }

  if (permission !== "granted") {
    return {
      status: "prompt",
      message: "Pendientes",
    };
  }

  let hasExistingSubscription = true;
  let subscription: PushSubscription | null = null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription =
      await registration.pushManager.getSubscription();
    hasExistingSubscription = existingSubscription !== null;
    subscription =
      existingSubscription ??
      (await registration.pushManager.subscribe({
        applicationServerKey: decodeBase64UrlToUint8Array(getVapidPublicKey()),
        userVisibleOnly: true,
      }));
    const serializedSubscription = serializePushSubscription(subscription);

    const { registerSupabasePushSubscription } =
      await import("./shoppingItemsSupabase");

    await registerSupabasePushSubscription({
      clientId,
      endpoint: serializedSubscription.endpoint,
      p256dh: serializedSubscription.p256dh,
      auth: serializedSubscription.auth,
      userAgent: navigator.userAgent,
    });

    return {
      status: "subscribed",
      message: "Activadas",
    };
  } catch {
    if (!hasExistingSubscription && subscription) {
      await subscription.unsubscribe();
    }

    return {
      status: "error",
      message: "Error",
    };
  }
}

export async function disablePushNotifications(): Promise<PushNotificationSnapshot> {
  const supportSnapshot = getPushNotificationSupportSnapshot();

  if (supportSnapshot) {
    return supportSnapshot;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const { disableSupabasePushSubscription } =
        await import("./shoppingItemsSupabase");

      await disableSupabasePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }

    return {
      status: "unsubscribed",
      message: "Desactivadas",
    };
  } catch {
    return {
      status: "error",
      message: "Error",
    };
  }
}

function getPushNotificationSupportSnapshot(): PushNotificationSnapshot | null {
  if (
    typeof Notification === "undefined" ||
    typeof navigator.serviceWorker === "undefined" ||
    typeof PushManager === "undefined"
  ) {
    return {
      status: "unsupported",
      message: "No soportadas",
    };
  }

  if (!getVapidPublicKey()) {
    return {
      status: "unconfigured",
      message: "Sin clave",
    };
  }

  return null;
}

function serializePushSubscription(subscription: PushSubscription) {
  const serializedSubscription =
    subscription.toJSON() as SerializedPushSubscription;
  const endpoint = serializedSubscription.endpoint ?? subscription.endpoint;
  const p256dh = serializedSubscription.keys?.p256dh;
  const auth = serializedSubscription.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid push subscription");
  }

  return {
    endpoint,
    p256dh,
    auth,
  };
}

function getVapidPublicKey() {
  return import.meta.env.VITE_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
}

function decodeBase64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
