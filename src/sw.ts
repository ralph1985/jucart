type PrecacheEntry = string | { revision?: string | null; url: string };

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

type FetchEventLike = Event & {
  request: Request;
  respondWith: (response: Promise<Response>) => void;
};

type WindowClientLike = {
  focus?: () => Promise<unknown> | unknown;
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
  caches: CacheStorage;
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
    __WB_MANIFEST?: PrecacheEntry[];
  }
}

const serviceWorker = self as unknown as ServiceWorkerGlobal;
const precacheManifest = self.__WB_MANIFEST ?? [];
const precacheCacheName = `jucart-precache-${hashPrecacheManifest(precacheManifest)}`;
const defaultNotificationTitle = "Cambios en Jucart";
const defaultNotificationBody = "Hay cambios nuevos en la lista";
const defaultNotificationUrl = "/";

serviceWorker.addEventListener("install", (event) => {
  (event as ExtendableEventLike).waitUntil(handleInstallEvent(serviceWorker));
});

serviceWorker.addEventListener("activate", (event) => {
  (event as ExtendableEventLike).waitUntil(handleActivateEvent(serviceWorker));
});

serviceWorker.addEventListener("fetch", (event) => {
  handleFetchEvent(event as FetchEventLike, serviceWorker);
});

serviceWorker.addEventListener("push", (event) => {
  handlePushEvent(event as PushEventLike, serviceWorker);
});

serviceWorker.addEventListener("notificationclick", (event) => {
  handleNotificationClickEvent(event as NotificationEventLike, serviceWorker);
});

export async function handleInstallEvent(env: ServiceWorkerEnvironment) {
  const cache = await env.caches.open(precacheCacheName);

  await cache.addAll(getPrecacheUrls(precacheManifest));
  await env.skipWaiting?.();
}

export async function handleActivateEvent(env: ServiceWorkerEnvironment) {
  const cacheNames = await env.caches.keys();
  const oldPrecacheNames = cacheNames.filter(
    (cacheName) =>
      cacheName.startsWith("jucart-precache-") &&
      cacheName !== precacheCacheName,
  );

  await Promise.all(
    oldPrecacheNames.map((cacheName) => env.caches.delete(cacheName)),
  );
  await env.clients.claim?.();
}

export function handleFetchEvent(
  event: FetchEventLike,
  env: ServiceWorkerEnvironment,
) {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(getCachedResponse("/index.html", event.request, env));

    return;
  }

  event.respondWith(getCachedResponse(event.request, event.request, env));
}

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

async function getCachedResponse(
  cacheRequest: RequestInfo,
  fallbackRequest: Request,
  env: ServiceWorkerEnvironment,
) {
  const cachedResponse = await env.caches.match(cacheRequest);

  return cachedResponse ?? fetch(fallbackRequest);
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

function getPrecacheUrls(entries: PrecacheEntry[]) {
  return entries
    .map((entry) => (typeof entry === "string" ? entry : entry.url))
    .filter((url) => url.trim().length > 0);
}

function hashPrecacheManifest(entries: PrecacheEntry[]) {
  const manifestKey = entries
    .map((entry) =>
      typeof entry === "string"
        ? entry
        : `${entry.url}:${entry.revision ?? "unversioned"}`,
    )
    .join("|");
  let hash = 0;

  for (let index = 0; index < manifestKey.length; index += 1) {
    hash = (hash << 5) - hash + manifestKey.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
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
