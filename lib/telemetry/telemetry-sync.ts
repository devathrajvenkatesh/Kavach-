/**
 * Kavach - Real-Time Telemetry & Cross-Tab Synchronization Bus
 *
 * Provides instantaneous (0ms) state and telemetry propagation across:
 * - All in-app tabs (Overview / AI Agent / Workspace / Threat Center / Audit)
 * - Multiple concurrent browser tabs and windows
 *
 * Uses BroadcastChannel, CustomEvents, and Storage events with fallback polling.
 */

export const TELEMETRY_BROADCAST_CHANNEL = "kavach_telemetry_broadcast_v1";
export const TELEMETRY_CUSTOM_EVENT = "kavach_telemetry_updated";
export const TELEMETRY_STORAGE_PING = "kavach_telemetry_ping_v1";

export interface TelemetryPayload {
  source: string;
  type?: string;
  timestamp?: number;
  payload?: unknown;
}

/**
 * Broadcasts a telemetry update immediately to all open components and browser tabs.
 */
export function broadcastTelemetryUpdate(info?: Partial<TelemetryPayload>): void {
  if (typeof window === "undefined") return;

  const data: TelemetryPayload = {
    source: info?.source || "client",
    type: info?.type || "SECURITY_UPDATE",
    timestamp: Date.now(),
    payload: info?.payload,
  };

  // 1. Same-window / in-app custom event
  try {
    window.dispatchEvent(new CustomEvent(TELEMETRY_CUSTOM_EVENT, { detail: data }));
  } catch (err) {
    console.warn("[TelemetrySync] CustomEvent dispatch error:", err);
  }

  // 2. Cross-browser-tab broadcast channel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(TELEMETRY_BROADCAST_CHANNEL);
      channel.postMessage(data);
      channel.close();
    }
  } catch (err) {
    console.warn("[TelemetrySync] BroadcastChannel post error:", err);
  }

  // 3. Fallback for older browsers: localStorage trigger for storage event
  try {
    if (window.localStorage) {
      localStorage.setItem(TELEMETRY_STORAGE_PING, String(Date.now()));
    }
  } catch {
    // Ignore storage quota or privacy mode errors
  }
}

/**
 * Subscribes to immediate telemetry updates from any tab or component.
 */
export function subscribeToTelemetry(callback: (data?: TelemetryPayload) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  // In-app custom event handler
  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent<TelemetryPayload>;
    callback(customEvt.detail);
  };

  // Cross-tab BroadcastChannel handler
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(TELEMETRY_BROADCAST_CHANNEL);
      channel.onmessage = (e: MessageEvent<TelemetryPayload>) => {
        callback(e.data);
      };
    } catch (err) {
      console.warn("[TelemetrySync] BroadcastChannel init error:", err);
    }
  }

  // Cross-tab storage event handler fallback
  const handleStorage = (e: StorageEvent) => {
    if (e.key === TELEMETRY_STORAGE_PING || e.key === "kavach_secure_workspace_files_v1") {
      callback();
    }
  };

  // Immediate re-sync when tab gains focus / visibility
  const handleFocus = () => {
    callback();
  };

  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      callback();
    }
  };

  window.addEventListener(TELEMETRY_CUSTOM_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    window.removeEventListener(TELEMETRY_CUSTOM_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibility);
    if (channel) {
      try {
        channel.close();
      } catch {
        // Ignore close errors
      }
    }
  };
}
