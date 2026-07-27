import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createNotification,
  getNotificationTargetUrl,
  handleActivateEvent,
  handleNotificationClickEvent,
  handlePushEvent,
  parsePushPayload,
} from "./sw";

type TestWindowClient = {
  focus?: () => Promise<unknown>;
  navigate?: (url: string) => Promise<unknown>;
  url: string;
};

function createEnvironment() {
  const cache = {
    match: vi.fn(() => Promise.resolve(undefined as Response | undefined)),
    put: vi.fn(() => Promise.resolve()),
  };
  const clients = {
    matchAll: vi.fn<() => Promise<TestWindowClient[]>>(() =>
      Promise.resolve([]),
    ),
    openWindow: vi.fn(() => Promise.resolve(null)),
    claim: vi.fn(() => Promise.resolve()),
  };

  return {
    caches: {
      open: vi.fn(() => Promise.resolve(cache)),
      keys: vi.fn(() => Promise.resolve([])),
      delete: vi.fn(() => Promise.resolve(true)),
    } as unknown as CacheStorage,
    clients,
    location: new URL("https://jucart.example/") as unknown as Location,
    registration: {
      showNotification: vi.fn(() => Promise.resolve()),
    },
    cache,
  };
}

describe("service worker push notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a notification from push JSON payload", () => {
    expect(
      createNotification(
        {
          body: "Hay cambios nuevos en la lista",
          title: "Cambios en Jucart",
          url: "/history",
        },
        "https://jucart.example",
      ),
    ).toEqual({
      options: expect.objectContaining({
        badge: "/icons/jucart-144.png",
        body: "Hay cambios nuevos en la lista",
        data: {
          url: "https://jucart.example/history",
        },
        icon: "/icons/jucart-192.png",
        tag: "jucart-remote-changes",
      }),
      title: "Cambios en Jucart",
    });
  });

  it("falls back when push payload is empty or malformed", () => {
    expect(parsePushPayload(null)).toEqual({});
    expect(
      parsePushPayload({
        json: () => {
          throw new Error("invalid json");
        },
        text: () => "Texto plano",
      }),
    ).toEqual({ body: "Texto plano" });
    expect(
      createNotification({}, "https://jucart.example").options,
    ).toMatchObject({
      body: "Hay cambios nuevos en la lista",
      data: {
        url: "https://jucart.example/",
      },
    });
  });

  it("shows a notification when a push event arrives", async () => {
    const env = createEnvironment();
    const waitUntil = vi.fn();

    handlePushEvent(
      {
        data: {
          json: () => ({
            body: "Hay cambios nuevos en la lista",
            title: "Cambios en Jucart",
            url: "/",
          }),
          text: () => "",
        },
        waitUntil,
      } as unknown as Parameters<typeof handlePushEvent>[0],
      env,
    );

    expect(waitUntil).toHaveBeenCalledWith(expect.any(Promise));
    await waitUntil.mock.calls[0][0];
    expect(env.registration.showNotification).toHaveBeenCalledWith(
      "Cambios en Jucart",
      expect.objectContaining({
        body: "Hay cambios nuevos en la lista",
      }),
    );
  });

  it("focuses an existing Jucart window when the notification is clicked", async () => {
    const focus = vi.fn(() =>
      Promise.resolve({ url: "https://jucart.example/" }),
    );
    const env = createEnvironment();
    const close = vi.fn();
    const waitUntil = vi.fn();
    env.clients.matchAll.mockResolvedValue([
      {
        focus,
        url: "https://jucart.example/",
      },
    ]);

    handleNotificationClickEvent(
      {
        notification: {
          close,
          data: {
            url: "/",
          },
        },
        waitUntil,
      } as unknown as Parameters<typeof handleNotificationClickEvent>[0],
      env,
    );

    await waitUntil.mock.calls[0][0];
    expect(close).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
    expect(env.clients.openWindow).not.toHaveBeenCalled();
  });

  it("opens Jucart on notification click and rejects external URLs", async () => {
    const env = createEnvironment();
    const waitUntil = vi.fn();

    expect(
      getNotificationTargetUrl(
        { url: "https://external.example/" },
        "https://jucart.example",
      ),
    ).toBe("https://jucart.example/");

    handleNotificationClickEvent(
      {
        notification: {
          close: vi.fn(),
          data: {
            url: "https://external.example/",
          },
        },
        waitUntil,
      } as unknown as Parameters<typeof handleNotificationClickEvent>[0],
      env,
    );

    await waitUntil.mock.calls[0][0];
    expect(env.clients.openWindow).toHaveBeenCalledWith(
      "https://jucart.example/",
    );
  });

  it("recarga una vez los clientes antiguos al activar una migración", async () => {
    const env = createEnvironment();
    const navigate = vi.fn(() => Promise.resolve());
    env.clients.matchAll.mockResolvedValue([
      { navigate, url: "https://jucart.example/" },
    ]);
    const claim = vi.fn(() => Promise.resolve());
    env.clients.claim = claim;

    await handleActivateEvent(env);

    expect(claim).toHaveBeenCalledOnce();
    expect(env.cache.put).toHaveBeenCalledWith(
      "pwa-update-v1",
      expect.any(Response),
    );
    expect(navigate).toHaveBeenCalledWith("https://jucart.example/");
  });

  it("no repite la recarga si la migración ya está marcada", async () => {
    const env = createEnvironment();
    env.cache.match.mockResolvedValue(new Response("done"));
    const navigate = vi.fn(() => Promise.resolve());
    env.clients.matchAll.mockResolvedValue([
      { navigate, url: "https://jucart.example/" },
    ]);

    await handleActivateEvent(env);

    expect(navigate).not.toHaveBeenCalled();
    expect(env.cache.put).not.toHaveBeenCalled();
  });
});
