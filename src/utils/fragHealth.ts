import { GATEWAY_RPC_URLS } from './rpc';

// Frag-stream health probing for the ChainStatus "Frag Stream" section.
//
// Each gateway exposes a jsonrpsee WS subscription server on :9999 (namespace
// `frag`). It is NOT push-on-connect: after the handshake we must send
// frag_subscribe, then the server pushes frag_subscription notifications for
// every frag it emits. A probe counts notifications over a short window.
//
// On a Vercel deployment the browser cannot open ws://IP:9999 directly (mixed
// content + no CORS), so the probe runs in /api/frag-health and the frontend
// polls it. In local dev the browser probes the WS directly.

// Listen window for one probe. Keep in sync with DEFAULT_PROBE_MS in
// api/frag-health.js (the dev direct-WS path uses this value).
export const PROBE_WINDOW_MS = 5000;

const FRAG_WS_PORT = 9999;

// Explicit frag WS URL overrides. Same numbered-slot pattern as the RPC URLs
// in rpc.ts — these MUST be literal process.env.REACT_APP_* references because
// CRA inlines env vars via static find-and-replace at build time.
const GATEWAY_FRAG_WS_URLS = [
  process.env.REACT_APP_GATEWAY_FRAG_WS_URL,
  process.env.REACT_APP_GATEWAY_2_FRAG_WS_URL,
  process.env.REACT_APP_GATEWAY_3_FRAG_WS_URL,
  process.env.REACT_APP_GATEWAY_4_FRAG_WS_URL,
  process.env.REACT_APP_GATEWAY_5_FRAG_WS_URL,
  process.env.REACT_APP_GATEWAY_6_FRAG_WS_URL,
  process.env.REACT_APP_GATEWAY_7_FRAG_WS_URL,
  process.env.REACT_APP_GATEWAY_8_FRAG_WS_URL,
];

export interface FragGateway {
  name: string;
  wsUrl: string;
}

export interface FragProbeResult {
  url: string;
  ok: boolean;
  notifications: number;
  elapsedMs?: number;
  error?: string;
}

// Derive ws://<host>:9999 from a gateway RPC URL.
function deriveFragWsUrl(rpcUrl: string): string | null {
  try {
    const parsed = new URL(rpcUrl);
    return `ws://${parsed.hostname}:${FRAG_WS_PORT}`;
  } catch {
    return null;
  }
}

// One entry per configured gateway slot: an explicit FRAG_WS_URL wins,
// otherwise the URL is derived from the slot's RPC URL. Display numbers match
// the env var numbers (slot index + 1), same as the endpoint cards.
export const FRAG_GATEWAYS: FragGateway[] = GATEWAY_RPC_URLS.map((rpcUrl, i) => {
  const wsUrl = GATEWAY_FRAG_WS_URLS[i] || (rpcUrl ? deriveFragWsUrl(rpcUrl) : null);
  return wsUrl ? { name: `Gateway ${i + 1}`, wsUrl } : null;
}).filter((g): g is FragGateway => g !== null);

// Direct ws:// probing is only viable from the CRA dev server (http:// origin,
// no serverless runtime). Any production build — vercel.app, vercel.com, or a
// custom domain — is served over HTTPS where a raw ws://IP:9999 is
// mixed-content blocked, so it must go through /api/frag-health.
function isLocalDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

// Connection timeout for the dev direct probe. Mirrors CONNECT_TIMEOUT_MS in
// api/frag-health.js: a socket that never opens is a transport failure, not
// off-epoch silence, and must not eat into the observation window.
const CONNECT_TIMEOUT_MS = 3000;
// JSON-RPC id of our frag_subscribe request, used to match the ack.
const SUBSCRIBE_ID = 1;

// Direct browser probe for local dev (http:// origin can open ws:// sockets).
function probeDirect(wsUrl: string): Promise<FragProbeResult> {
  return new Promise(resolve => {
    const startedAt = Date.now();
    let notifications = 0;
    let settled = false;
    let ws: WebSocket | null = null;
    let observeTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (error?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(observeTimer);
      if (ws) {
        try {
          ws.close();
        } catch {
          // already closed
        }
      }
      resolve({
        url: wsUrl,
        ok: notifications > 0,
        notifications,
        elapsedMs: Date.now() - startedAt,
        ...(error ? { error } : {}),
      });
    };

    const connectTimer = setTimeout(
      () => finish(`Connection timed out after ${CONNECT_TIMEOUT_MS}ms`),
      CONNECT_TIMEOUT_MS,
    );

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      finish(err instanceof Error ? err.message : 'WebSocket init failed');
      return;
    }

    ws.onopen = () => {
      clearTimeout(connectTimer);
      // Observation window starts once the connection is open.
      observeTimer = setTimeout(() => finish(), PROBE_WINDOW_MS);
      ws?.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: SUBSCRIBE_ID,
          method: 'frag_subscribe',
          params: [],
        }),
      );
    };

    ws.onmessage = event => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return; // non-JSON frame — ignore
      }
      if (msg.method === 'frag_subscription') {
        notifications += 1;
        return;
      }
      // Ack for our frag_subscribe request: a rejection means the endpoint is
      // up but not a frag stream — a protocol failure, not off-epoch silence.
      if (msg.id === SUBSCRIBE_ID) {
        if (msg.error) {
          finish(
            `frag_subscribe rejected: ${msg.error.message || JSON.stringify(msg.error)}`,
          );
        } else if (!('result' in msg)) {
          finish('Invalid frag_subscribe response (no result)');
        }
        // Valid ack → keep listening for notifications.
      }
    };

    // Browsers expose no detail on WS errors; report a generic failure.
    ws.onerror = () => finish('WebSocket connection failed');

    ws.onclose = () => {
      if (notifications > 0) {
        finish();
      } else {
        finish('Connection closed before any frag notification');
      }
    };
  });
}

// Probe via the serverless function on deployed hosts.
async function probeViaApi(wsUrl: string): Promise<FragProbeResult> {
  const apiUrl =
    window.location.origin + '/api/frag-health?url=' + encodeURIComponent(wsUrl);
  const response = await fetch(apiUrl);
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch {
      // non-JSON error body
    }
    return { url: wsUrl, ok: false, notifications: 0, error: message };
  }
  return response.json();
}

export async function probeFragStream(wsUrl: string): Promise<FragProbeResult> {
  try {
    if (isLocalDev()) {
      return await probeDirect(wsUrl);
    }
    return await probeViaApi(wsUrl);
  } catch (err) {
    return {
      url: wsUrl,
      ok: false,
      notifications: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
