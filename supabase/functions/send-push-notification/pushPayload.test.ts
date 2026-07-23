import { describe, expect, it } from "vitest";

import {
  createWebPushPayload,
  getDeliveryResult,
  parseSendPushNotificationPayload,
} from "./pushPayload";

describe("send-push-notification payload", () => {
  it("validates and normalizes the minimum payload", () => {
    expect(
      parseSendPushNotificationPayload({
        list_id: "00000000-0000-4000-8000-000000000001",
        origin_client_id: "client-1",
      }),
    ).toEqual({
      payload: {
        body: "Hay cambios nuevos en la lista",
        listId: "00000000-0000-4000-8000-000000000001",
        originClientId: "client-1",
        title: "Cambios en Jucart",
        url: "/",
      },
      valid: true,
    });
  });

  it("keeps custom notification text and only accepts local URLs", () => {
    const parsedPayload = parseSendPushNotificationPayload({
      body: "Begoña añadió pan",
      list_id: "00000000-0000-4000-8000-000000000001",
      origin_client_id: "client-1",
      title: "Jucart",
      url: "https://external.example/",
    });

    expect(parsedPayload).toEqual({
      payload: {
        body: "Begoña añadió pan",
        listId: "00000000-0000-4000-8000-000000000001",
        originClientId: "client-1",
        title: "Jucart",
        url: "/",
      },
      valid: true,
    });
  });

  it("rejects missing routing fields", () => {
    expect(parseSendPushNotificationPayload({})).toEqual({
      error: "`list_id` y `origin_client_id` son obligatorios.",
      valid: false,
    });
  });

  it("serializes the web push payload expected by the service worker", () => {
    expect(
      createWebPushPayload({
        body: "Hay cambios nuevos en la lista",
        listId: "00000000-0000-4000-8000-000000000001",
        originClientId: "client-1",
        title: "Cambios en Jucart",
        url: "/",
      }),
    ).toBe(
      JSON.stringify({
        body: "Hay cambios nuevos en la lista",
        title: "Cambios en Jucart",
        url: "/",
      }),
    );
  });

  it("marks expired endpoints as disabled", () => {
    expect(getDeliveryResult({ statusCode: 410 })).toEqual({
      disabled: true,
      ok: false,
      statusCode: 410,
    });
    expect(getDeliveryResult({ statusCode: 500 })).toEqual({
      disabled: false,
      ok: false,
      statusCode: 500,
    });
  });
});
