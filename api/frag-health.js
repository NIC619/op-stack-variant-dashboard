const { requireAuth } = require('../lib/auth');
const WebSocket = require('ws');

// How long to listen for frag notifications. Must stay well under the Vercel
// function limit (maxDuration 10s in vercel.json), leaving room for the WS
// handshake and response serialization.
const DEFAULT_PROBE_MS = 5000;
const MAX_PROBE_MS = 8000;
// Connection establishment gets its own timeout so a slow/hanging handshake is
// reported as unreachable instead of silently eating the observation window.
const CONNECT_TIMEOUT_MS = 3000;
// Hard ceiling on connect + observe combined, keeping headroom under the 10s
// maxDuration. The observation window is trimmed if the handshake was slow.
const TOTAL_BUDGET_MS = 9000;
// JSON-RPC id of our frag_subscribe request, used to match the ack.
const SUBSCRIBE_ID = 1;

// Derive the frag-stream WS URL from a gateway RPC URL: same host, port 9999.
// The frag stream is plain WS (no TLS) on the gateway box, like the raw RPC.
const FRAG_WS_PORT = 9999;
function deriveFragWsUrl(rpcUrl) {
  try {
    const parsed = new URL(rpcUrl);
    return `ws://${parsed.hostname}:${FRAG_WS_PORT}`;
  } catch {
    return null;
  }
}

// Allowed frag WS targets, collected dynamically from env (same approach as
// rpc-proxy.js): explicit REACT_APP_GATEWAY[_n]_FRAG_WS_URL vars, plus URLs
// derived from each REACT_APP_GATEWAY[_n]_RPC_URL host with port 9999.
function getAllowedUrls() {
  const FRAG_WS_KEY = /^REACT_APP_GATEWAY(_\d+)?_FRAG_WS_URL$/;
  const GATEWAY_RPC_KEY = /^REACT_APP_GATEWAY(_\d+)?_RPC_URL$/;
  const allowed = new Set();
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    if (FRAG_WS_KEY.test(key)) allowed.add(value);
    if (GATEWAY_RPC_KEY.test(key)) {
      const derived = deriveFragWsUrl(value);
      if (derived) allowed.add(derived);
    }
  }
  return allowed;
}

// Point-in-time probe of a frag stream. The :9999 endpoint is a jsonrpsee
// subscription server (namespace `frag`), NOT push-on-connect: we must send
// frag_subscribe after the handshake, then count frag_subscription
// notifications over the observation window. The window only starts once the
// connection is open, so a slow handshake never masquerades as a quiet
// (off-epoch) gateway. Always resolves, never rejects.
function probeFragStream(url, probeMs) {
  return new Promise(resolve => {
    const startedAt = Date.now();
    let notifications = 0;
    let settled = false;
    let ws = null;
    let connectTimer = null;
    let observeTimer = null;

    const finish = extra => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(observeTimer);
      if (ws) {
        try {
          ws.terminate();
        } catch {
          // already closed
        }
      }
      resolve({
        url,
        notifications,
        ok: notifications > 0,
        elapsedMs: Date.now() - startedAt,
        ...extra,
      });
    };

    // Belt & braces alongside ws's handshakeTimeout: if the socket is still
    // CONNECTING when this fires, that is a transport failure, not silence.
    connectTimer = setTimeout(
      () => finish({ error: `Connection timed out after ${CONNECT_TIMEOUT_MS}ms` }),
      CONNECT_TIMEOUT_MS,
    );

    try {
      ws = new WebSocket(url, { handshakeTimeout: CONNECT_TIMEOUT_MS });
    } catch (err) {
      finish({ error: err instanceof Error ? err.message : 'WebSocket init failed' });
      return;
    }

    ws.on('open', () => {
      clearTimeout(connectTimer);
      // Observation window starts now; trim it so connect + observe stays
      // inside the function's time budget.
      const windowMs = Math.max(
        0,
        Math.min(probeMs, TOTAL_BUDGET_MS - (Date.now() - startedAt)),
      );
      observeTimer = setTimeout(() => finish({}), windowMs);
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: SUBSCRIBE_ID,
          method: 'frag_subscribe',
          params: [],
        }),
      );
    });

    ws.on('message', data => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return; // non-JSON frame — ignore
      }
      if (msg.method === 'frag_subscription') {
        notifications += 1;
        return;
      }
      // Ack for our frag_subscribe request. A rejection (e.g. "Method not
      // found") means the endpoint is up but not a frag stream — a protocol
      // failure, not normal off-epoch silence.
      if (msg.id === SUBSCRIBE_ID) {
        if (msg.error) {
          finish({
            error: `frag_subscribe rejected: ${
              msg.error.message || JSON.stringify(msg.error)
            }`,
          });
        } else if (!('result' in msg)) {
          finish({ error: 'Invalid frag_subscribe response (no result)' });
        }
        // Valid ack → keep listening for notifications.
      }
    });

    ws.on('error', err => {
      finish({ error: err instanceof Error ? err.message : 'WebSocket error' });
    });

    // Server closed on us before the probe window ended. Zero notifications at
    // this point is a failure to observe, not proof of streaming.
    ws.on('close', () => {
      if (notifications > 0) {
        finish({});
      } else {
        finish({ error: 'Connection closed before any frag notification' });
      }
    });
  });
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require a valid auth cookie (no-op if ACCESS_PASSWORD is not configured).
  if (!requireAuth(req, res)) return;

  const targetUrl = req.query.url;
  if (!targetUrl) {
    console.error('Missing url query parameter');
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  const decodedUrl = decodeURIComponent(targetUrl);

  const allowedUrls = getAllowedUrls();
  if (!allowedUrls.has(decodedUrl)) {
    console.error('Frag WS URL not allowed:', decodedUrl);
    return res.status(403).json({ error: 'URL not allowed', provided: decodedUrl });
  }

  const probeMs = Math.min(
    Number(process.env.FRAG_PROBE_MS) || DEFAULT_PROBE_MS,
    MAX_PROBE_MS,
  );

  try {
    const result = await probeFragStream(decodedUrl, probeMs);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Frag health probe error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      url: decodedUrl,
      ok: false,
      notifications: 0,
      error: errorMessage,
    });
  }
};
