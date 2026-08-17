const { requireAuth } = require('../lib/auth');

// Methods this proxy will relay. An ALLOWLIST, because the URL check below is not a
// security boundary on its own: it decides WHICH node the request reaches, not what the
// request is allowed to do, and the body is forwarded verbatim.
//
// The nodes behind this proxy run op-geth with the `admin`, `debug` and `miner`
// namespaces enabled. Without this list, anyone who can reach this endpoint can call
// debug_setHead against a production prover and reset its chain head — a failure this
// project has already had in production once, from a different direction.
//
// Read-only calls only. Nothing here mutates node state, and transaction submission is
// deliberately absent: the dashboard signs through the user's wallet, never through this
// proxy. Add to this list when the UI needs a method; do not switch it to a denylist.
const ALLOWED_METHODS = new Set([
  // chain + block reads
  'eth_chainId', 'eth_blockNumber', 'eth_getBlockByNumber', 'eth_getBlockByHash',
  'eth_getBlockTransactionCountByNumber', 'eth_getBlockTransactionCountByHash',
  'eth_syncing',
  // state reads
  'eth_call', 'eth_getBalance', 'eth_getCode', 'eth_getStorageAt', 'eth_getProof',
  'eth_getTransactionCount',
  // transaction reads
  'eth_getTransactionByHash', 'eth_getTransactionReceipt', 'eth_getLogs',
  // fee reads
  'eth_estimateGas', 'eth_gasPrice', 'eth_maxPriorityFeePerGas', 'eth_feeHistory',
  // node identity — safe, and used to label endpoints in the UI
  'net_version', 'net_listening', 'net_peerCount', 'web3_clientVersion',
  // UniFi-specific read paths used by the dashboard
  'tee_getExecutionProof', 'frag_subscribe', 'optimism_syncStatus',
]);

// Returns the first disallowed method in a single or batch request, or null if every
// entry is permitted. Batches are checked element-by-element on purpose: a JSON-RPC body
// may legally be an ARRAY, so validating only `body.method` would let
// [{"method":"debug_setHead", ...}] straight through.
function firstDisallowedMethod(body) {
  const entries = Array.isArray(body) ? body : [body];
  if (entries.length === 0) return '(empty batch)';
  for (const entry of entries) {
    const method = entry && entry.method;
    if (typeof method !== 'string') return '(missing method)';
    if (!ALLOWED_METHODS.has(method)) return method;
  }
  return null;
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Only allow POST requests (standard for JSON-RPC)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require a valid auth cookie (no-op if ACCESS_PASSWORD is not configured).
  if (!requireAuth(req, res)) return;

  // Get the target RPC URL from query parameter
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    console.error('Missing url query parameter');
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  // Decode the URL
  const decodedUrl = decodeURIComponent(targetUrl);

  // Reject disallowed methods BEFORE the URL is resolved, so a probe learns nothing about
  // which upstreams are configured.
  const disallowed = firstDisallowedMethod(req.body);
  if (disallowed) {
    console.error('Method not allowed:', disallowed);
    return res.status(403).json({
      error: 'Method not allowed',
      method: disallowed,
      hint: 'This proxy relays read-only calls only. See ALLOWED_METHODS in api/rpc-proxy.js.',
    });
  }

  // Validate that the URL is from allowed environment variables. Collected
  // dynamically so any number of gateways / TEE nodes are allowed without
  // editing this file — set the matching Vercel env var and it's picked up.
  // Matches REACT_APP_{GATEWAY,MAIN_NODE,TEE_NODE,FOLLOWER_NODE}_RPC_URL with an
  // optional numeric suffix (…_2, …_3, …), e.g. REACT_APP_GATEWAY_2_RPC_URL.
  const RPC_URL_KEY = /^REACT_APP_(GATEWAY|MAIN_NODE|TEE_NODE|FOLLOWER_NODE)(_\d+)?_RPC_URL$/;
  const allowedUrls = Object.entries(process.env)
    .filter(([key, value]) => value && RPC_URL_KEY.test(key))
    .map(([, value]) => value);
  // L2 RPC is also proxied (predeploys / L2 contract pages).
  if (process.env.REACT_APP_L2_RPC_URL) {
    allowedUrls.push(process.env.REACT_APP_L2_RPC_URL);
  }

  if (!allowedUrls.includes(decodedUrl)) {
    console.error('URL not allowed:', decodedUrl);
    console.error('Allowed URLs:', allowedUrls);
    return res.status(403).json({ 
      error: 'URL not allowed',
      provided: decodedUrl,
      allowed: allowedUrls
    });
  }

  try {
    // Forward the request to the target RPC endpoint
    const response = await fetch(decodedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RPC endpoint error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'RPC endpoint error',
        status: response.status,
        message: errorText
      });
    }

    const data = await response.json();

    // Forward the response with 200 status (RPC responses are usually 200 even if they contain errors)
    return res.status(200).json(data);
  } catch (error) {
    console.error('RPC Proxy Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return res.status(500).json({ 
      error: 'Failed to proxy RPC request',
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
};
