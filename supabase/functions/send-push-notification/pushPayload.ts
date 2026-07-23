export type SendPushNotificationPayload = {
  body: string;
  listId: string;
  originClientId: string;
  title: string;
  url: string;
};

export type PushNotificationPayloadValidation =
  | {
      payload: SendPushNotificationPayload;
      valid: true;
    }
  | {
      error: string;
      valid: false;
    };

export type PushSubscriptionDeliveryResult = {
  disabled: boolean;
  ok: boolean;
  statusCode?: number;
};

const defaultTitle = "Cambios en Jucart";
const defaultBody = "Hay cambios nuevos en la lista";
const defaultUrl = "/";
const goneStatusCode = 410;
const notFoundStatusCode = 404;

export function parseSendPushNotificationPayload(
  value: unknown,
): PushNotificationPayloadValidation {
  if (!value || typeof value !== "object") {
    return {
      error: "Payload JSON inválido.",
      valid: false,
    };
  }

  const candidate = value as Record<string, unknown>;
  const listId = normalizeRequiredString(candidate.list_id);
  const originClientId = normalizeRequiredString(candidate.origin_client_id);

  if (!listId || !originClientId) {
    return {
      error: "`list_id` y `origin_client_id` son obligatorios.",
      valid: false,
    };
  }

  return {
    payload: {
      body: normalizeOptionalString(candidate.body, defaultBody),
      listId,
      originClientId,
      title: normalizeOptionalString(candidate.title, defaultTitle),
      url: normalizeNotificationUrl(candidate.url),
    },
    valid: true,
  };
}

export function createWebPushPayload(payload: SendPushNotificationPayload) {
  return JSON.stringify({
    body: payload.body,
    title: payload.title,
    url: payload.url,
  });
}

export function getDeliveryResult(
  error: unknown,
): PushSubscriptionDeliveryResult {
  const statusCode = getStatusCode(error);

  return {
    disabled:
      statusCode === goneStatusCode || statusCode === notFoundStatusCode,
    ok: false,
    statusCode,
  };
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeOptionalString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeNotificationUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return defaultUrl;
  }

  const trimmedValue = value.trim();

  return trimmedValue.startsWith("/") ? trimmedValue : defaultUrl;
}

function getStatusCode(error: unknown) {
  if (!error || typeof error !== "object" || !("statusCode" in error)) {
    return undefined;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;

  return typeof statusCode === "number" ? statusCode : undefined;
}
