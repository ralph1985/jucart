import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./supabaseConfig";

export type RemoteActionStatus = "pending" | "running" | "completed" | "failed";

export type RemoteAction = {
  id: string;
  action: string;
  status: RemoteActionStatus;
  resultSummary: string | null;
  errorMessage: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
};

type RemoteActionRow = {
  id: string;
  action: string;
  status: RemoteActionStatus;
  result_summary: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  client ??= createClient(config.url, config.anonKey);
  return client;
}

function mapRemoteAction(row: RemoteActionRow): RemoteAction {
  return {
    id: row.id,
    action: row.action,
    status: row.status,
    resultSummary: row.result_summary,
    errorMessage: row.error_message,
    createdAt: Date.parse(row.created_at),
    startedAt: row.started_at ? Date.parse(row.started_at) : null,
    finishedAt: row.finished_at ? Date.parse(row.finished_at) : null,
  };
}

export async function createRemoteBackupAction(clientRequestId: string) {
  const supabase = getClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { data, error } = await supabase.functions.invoke("remote-actions", {
    body: {
      action: "supabase_backup",
      clientRequestId,
      payload: {},
    },
  });
  if (error) throw error;
  if (!data?.id) throw new Error(data?.error ?? "No se pudo crear la orden.");
  return data.id as string;
}

export async function getLatestRemoteAction(): Promise<RemoteAction | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("remote_actions")
    .select(
      "id, action, status, result_summary, error_message, created_at, started_at, finished_at",
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRemoteAction(data as RemoteActionRow) : null;
}

export function subscribeToRemoteActions(onChange: () => void) {
  const supabase = getClient();
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel("remote_actions:current-user")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "remote_actions" },
      onChange,
    );
  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
