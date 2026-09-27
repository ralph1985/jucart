type PushPayload = {
  body?: unknown;
  title?: unknown;
  url?: unknown;
};

type PushData = {
  json: () => unknown;
  text: () => string;
};

type PushEventLike = Event & {
  data?: PushData | null;
  waitUntil: (promise: Promise<unknown>) => void;
};

type ExtendableEventLike = Event & {
  waitUntil: (promise: Promise<unknown>) => void;
};

type NotificationEventLike = Event & {
  notification: {
    close: () => void;
    data?: unknown;
  };
  waitUntil: (promise: Promise<unknown>) => void;
};

type WindowClientLike = {
  focus?: () => Promise<unknown> | unknown;
  navigate?: (url: string) => Promise<unknown> | unknown;
  url: string;
};

type ClientsLike = {
  claim?: () => Promise<void>;
  matchAll: (options: {
    includeUncontrolled: boolean;
    type: "window";
  }) => Promise<WindowClientLike[]>;
  openWindow?: (url: string) => Promise<WindowClientLike | null>;
};

type ServiceWorkerEnvironment = {
  clients: ClientsLike;
  location: Location;
  registration: {
    showNotification: (
      title: string,
      options?: NotificationOptions,
    ) => Promise<void>;
  };
  skipWaiting?: () => Promise<void>;
};

type ServiceWorkerGlobal = ServiceWorkerEnvironment & {
  addEventListener: (type: string, listener: (event: Event) => void) => void;
};

declare global {
  interface Window {
    __WB_MANIFEST?: unknown[];
  }
}

// vite-plugin-pwa requires this injection point even though Jucart does not
// precache resources or intercept fetches.
void self.__WB_MANIFEST;

const serviceWorker = self as unknown as ServiceWorkerGlobal;
const defaultNotificationTitle = "Cambios en Jucart";
const defaultNotificationBody = "Hay cambios nuevos en la lista";
const defaultNotificationUrl = "/";

serviceWorker.addEventListener("install", (event) => {
  (event as ExtendableEventLike).waitUntil(
    serviceWorker.skipWaiting?.() ?? Promise.resolve(),
  );
});

serviceWorker.addEventListener("activate", (event) => {
  (event as ExtendableEventLike).waitUntil(
    serviceWorker.clients.claim?.() ?? Promise.resolve(),
  );
});

serviceWorker.addEventListener("push", (event) => {
  handlePushEvent(event as PushEventLike, serviceWorker);
});

serviceWorker.addEventListener("notificationclick", (event) => {
  handleNotificationClickEvent(event as NotificationEventLike, serviceWorker);
});

export function handlePushEvent(
  event: PushEventLike,
  env: ServiceWorkerEnvironment,
) {
  const payload = parsePushPayload(event.data);
  const { options, title } = createNotification(payload, env.location.origin);

  event.waitUntil(env.registration.showNotification(title, options));
}

export function handleNotificationClickEvent(
  event: NotificationEventLike,
  env: ServiceWorkerEnvironment,
) {
  event.notification.close();

  const targetUrl = getNotificationTargetUrl(
    event.notification.data,
    env.location.origin,
  );

  event.waitUntil(openOrFocusJucart(targetUrl, env.clients));
}

export function parsePushPayload(data?: PushData | null): PushPayload {
  if (!data) {
    return {};
  }

  try {
    const payload = data.json();

    return isPushPayload(payload) ? payload : {};
  } catch {
    try {
      const body = data.text();

      return body ? { body } : {};
    } catch {
      return {};
    }
  }
}

export function createNotification(payload: PushPayload, origin: string) {
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title
      : defaultNotificationTitle;
  const body =
    typeof payload.body === "string" && payload.body.trim()
      ? payload.body
      : defaultNotificationBody;

  return {
    title,
    options: {
      badge: "/icons/jucart-144.png",
      body,
      data: {
        url: sanitizeNotificationUrl(payload.url, origin),
      },
      icon: "/icons/jucart-192.png",
      tag: "jucart-remote-changes",
    } satisfies NotificationOptions,
  };
}

export function getNotificationTargetUrl(data: unknown, origin: string) {
  if (!data || typeof data !== "object" || !("url" in data)) {
    return new URL(defaultNotificationUrl, origin).href;
  }

  return sanitizeNotificationUrl(data.url, origin);
}

async function openOrFocusJucart(targetUrl: string, clients: ClientsLike) {
  const windowClients = await clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  });
  const targetOrigin = new URL(targetUrl).origin;
  const existingClient = windowClients.find((client) => {
    try {
      return new URL(client.url).origin === targetOrigin;
    } catch {
      return false;
    }
  });

  if (existingClient?.focus) {
    await existingClient.focus();

    return;
  }

  await clients.openWindow?.(targetUrl);
}

function sanitizeNotificationUrl(value: unknown, origin: string) {
  if (typeof value !== "string" || !value.trim()) {
    return new URL(defaultNotificationUrl, origin).href;
  }

  try {
    const url = new URL(value, origin);

    return url.origin === origin
      ? url.href
      : new URL(defaultNotificationUrl, origin).href;
  } catch {
    return new URL(defaultNotificationUrl, origin).href;
  }
}

function isPushPayload(value: unknown): value is PushPayload {
  return typeof value === "object" && value !== null;
}
