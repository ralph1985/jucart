import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

import {
  createWebPushPayload,
  getDeliveryResult,
  parseSendPushNotificationPayload,
} from "./pushPayload.ts";

type PushSubscriptionRow = {
  auth: string;
  client_id: string;
  endpoint: string;
  id: string;
  p256dh: string;
};

type WebPushSubscription = {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
};

const requiredEnvVars = [
  "PUSH_VAPID_PRIVATE_KEY",
  "PUSH_VAPID_PUBLIC_KEY",
  "PUSH_VAPID_SUBJECT",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
] as const;

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Método no permitido." }, { status: 405 });
  }

  const env = readEnv();

  if (!env.valid) {
    return Response.json(
      { error: `Faltan variables: ${env.missing.join(", ")}.` },
      { status: 500 },
    );
  }

  if (!isAuthorizedRequest(request, env.values.SUPABASE_SERVICE_ROLE_KEY)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Payload JSON inválido." }, { status: 400 });
  }

  const parsedPayload = parseSendPushNotificationPayload(body);

  if (!parsedPayload.valid) {
    return Response.json({ error: parsedPayload.error }, { status: 400 });
  }

  webPush.setVapidDetails(
    env.values.PUSH_VAPID_SUBJECT,
    env.values.PUSH_VAPID_PUBLIC_KEY,
    env.values.PUSH_VAPID_PRIVATE_KEY,
  );

  const supabase = createClient(
    env.values.SUPABASE_URL,
    env.values.SUPABASE_SERVICE_ROLE_KEY,
  );
  const payload = parsedPayload.payload;
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, client_id")
    .eq("list_id", payload.listId)
    .is("disabled_at", null);

  if (error) {
    return Response.json(
      { error: "No se pudieron leer destinatarios." },
      { status: 500 },
    );
  }

  const recipientSubscriptions = (data ?? []).filter(
    (subscription: PushSubscriptionRow) =>
      subscription.client_id !== payload.originClientId,
  );
  const serializedPayload = createWebPushPayload(payload);
  const deliveryResults = await Promise.all(
    recipientSubscriptions.map((subscription: PushSubscriptionRow) =>
      sendNotification(subscription, serializedPayload),
    ),
  );
  const disabledSubscriptionIds = recipientSubscriptions
    .filter((_, index) => deliveryResults[index]?.disabled)
    .map((subscription) => subscription.id);

  if (disabledSubscriptionIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ disabled_at: new Date().toISOString() })
      .in("id", disabledSubscriptionIds);
  }

  return Response.json({
    disabled: disabledSubscriptionIds.length,
    failed: deliveryResults.filter((result) => !result.ok).length,
    recipients: recipientSubscriptions.length,
    sent: deliveryResults.filter((result) => result.ok).length,
  });
});

async function sendNotification(
  subscription: PushSubscriptionRow,
  payload: string,
) {
  try {
    await webPush.sendNotification(mapSubscription(subscription), payload, {
      TTL: 60,
    });

    return {
      disabled: false,
      ok: true,
    };
  } catch (error) {
    return getDeliveryResult(error);
  }
}

function mapSubscription(
  subscription: PushSubscriptionRow,
): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      auth: subscription.auth,
      p256dh: subscription.p256dh,
    },
  };
}

function readEnv() {
  const values = Object.fromEntries(
    requiredEnvVars.map((name) => [name, Deno.env.get(name)?.trim() ?? ""]),
  ) as Record<(typeof requiredEnvVars)[number], string>;
  const missing = requiredEnvVars.filter((name) => !values[name]);

  return missing.length > 0
    ? {
        missing,
        valid: false as const,
      }
    : {
        valid: true as const,
        values,
      };
}

function isAuthorizedRequest(request: Request, serviceRoleKey: string) {
  return request.headers.get("authorization") === `Bearer ${serviceRoleKey}`;
}
