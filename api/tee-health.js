// Server-side proxy for the prover health endpoint.
//
// The dashboard is served over HTTPS and the monitoring stack serves plain HTTP on a raw IP,
// so the browser blocks a direct fetch as mixed content — which surfaces as a bare
// "Failed to fetch" with no detail. src/utils/rpc.ts already proxies raw-IP RPC URLs on
// Vercel for exactly this reason; this is the same treatment for the health endpoint.
//
// Fetching it here also keeps the monitor's address out of the client bundle when
// TEE_HEALTH_URL_SECRET is used, matching how api/l1-rpc.js handles the L1 upstream.
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // A cached liveness signal is worse than none: it reports the last known good state
  // long after the thing has stopped.
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') return res.status(200).json({});
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const upstream =
    process.env.TEE_HEALTH_URL_SECRET || process.env.REACT_APP_TEE_HEALTH_URL;
  if (!upstream) {
    return res.status(501).json({
      error: 'Prover health endpoint not configured',
      hint: 'Set REACT_APP_TEE_HEALTH_URL (or TEE_HEALTH_URL_SECRET) to the monitoring /health URL.',
    });
  }

  try {
    const response = await fetch(upstream, { headers: { Accept: 'application/json' } });
    const body = await response.json();
    // Pass the status through unchanged. The upstream answers 503 when its data is stale
    // rather than repeating old values, and flattening that to 200 here would reintroduce
    // exactly the failure the endpoint was designed to avoid.
    return res.status(response.status).json(body);
  } catch (error) {
    console.error('TEE health proxy error:', error);
    return res.status(502).json({
      ok: false,
      stale: true,
      error: 'Failed to reach the prover health endpoint',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
