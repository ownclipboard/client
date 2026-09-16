/**
 * Live updates. The api publishes one message per change on the account's own
 * Ably channel, carrying ids and folder slugs but never clip content, so every
 * event ends in a refetch through the normal endpoints.
 *
 * Nothing here is load bearing: when the server has no Ably key, or the socket
 * never connects, the app keeps working exactly as it did before.
 */
import { ref } from "vue";
import type { Realtime, RealtimeChannel } from "ably";
import { $http, setConnectionId } from "../http";
import { $events } from "../events";
import { getFolders } from "../stores/tabs.store";
import type { components } from "../types/api";

type RealtimeSummary = components["schemas"]["RealtimeSummary"];
type RealtimeTokenResponse = components["schemas"]["RealtimeTokenResponse"];
type ClipEvent = components["schemas"]["RealtimeClipEvent"];
type ClipsChangedEvent = components["schemas"]["RealtimeClipsChangedEvent"];

/** What a view needs to decide whether to refetch. */
export type RealtimeChange = {
  /** Event name, e.g. `clip.new`. */
  event: string;
  /** Folder slugs touched. Empty only if the server sent none. */
  folders: string[];
  /** Set when the change is known to involve a file clip. */
  isFile: boolean;
  /** True for `clips.changed`, which can cover many clips and many folders. */
  bulk: boolean;
};

export const realtimeConnected = ref(false);

let client: Realtime | null = null;
let channel: RealtimeChannel | null = null;
// A dropped connection misses messages entirely, there is no replay, so the
// views are told to refetch once it comes back.
let missedWhileAway = false;

/**
 * Attach to the account's channel. Safe to call when realtime is disabled or
 * already running; both are a no-op.
 */
export async function startRealtime(summary?: RealtimeSummary | null) {
  if (client || !summary?.enabled || !summary.channel) return;

  // Loaded on demand: a deployment without realtime never pays for the sdk.
  const { Realtime: AblyRealtime } = await import("ably");

  client = new AblyRealtime({
    // The token is signed by the api and handed over unread; the Ably key
    // stays on the server, and the sdk renews through here on its own.
    authCallback: (_params, callback) => {
      $http
        .post<any, RealtimeTokenResponse>("/realtime/token")
        .then((token) => callback(null, token as any))
        .catch((err) => callback(err as any, null));
    }
  });

  client.connection.on("connected", () => {
    realtimeConnected.value = true;
    // Echoed back to us as `from`, which is how a tab recognises its own events.
    setConnectionId(client?.connection.id || "");
    if (missedWhileAway) {
      missedWhileAway = false;
      $events.emit("realtime:resync");
    }
  });

  const dropped = () => {
    realtimeConnected.value = false;
    missedWhileAway = true;
  };
  client.connection.on("disconnected", dropped);
  client.connection.on("suspended", dropped);

  channel = client.channels.get(summary.channel);
  channel.subscribe((message) => handle(message.name || "", message.data));
}

/** Detach and forget the connection. */
export function stopRealtime() {
  channel?.unsubscribe();
  channel = null;
  client?.close();
  client = null;
  realtimeConnected.value = false;
  missedWhileAway = false;
  setConnectionId("");
}

function handle(event: string, data: ClipEvent | ClipsChangedEvent | undefined) {
  // Our own writes already updated the screen, so skip the pointless refetch.
  if (data?.from && client?.connection.id && data.from === client.connection.id) return;

  const bulk = event === "clips.changed";
  const folders = bulk
    ? (data as ClipsChangedEvent)?.folders || []
    : [(data as ClipEvent)?.folder].filter(Boolean as unknown as (v?: string) => v is string);

  // Counts belong to folders the user may not be looking at, so they are
  // refreshed centrally rather than by whichever view happens to be mounted.
  getFolders();

  const change: RealtimeChange = {
    event,
    folders,
    isFile: (data as ClipEvent)?.kind === "file",
    bulk
  };
  $events.emit("realtime:clips", change as unknown as Record<string, any>);
}
