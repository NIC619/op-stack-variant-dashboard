// Server-side L1 RPC proxy.
//
// The upstream URL is read from a SERVER-ONLY env var (L1_RPC_URL_SECRET) so a
// paid/authenticated endpoint is never shipped in the client bundle. The browser
// only ever talks to the relative path /api/l1-rpc and never sees the real URL.
//
// Falls back to REACT_APP_L1_RPC_URL, then to the public Hoodi endpoint, so the
// app still works when no secret is configured.
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // JSON-RPC is always POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Resolve the upstream URL entirely server-side — never from the client.
  const upstreamUrl =
    process.env.L1_RPC_URL_SECRET ||
    process.env.REACT_APP_L1_RPC_URL ||
    'https://ethereum-hoodi-rpc.publicnode.com';

  try {
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('L1 RPC endpoint error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'RPC endpoint error',
        status: response.status,
        message: errorText,
      });
    }

    const data = await response.json();
    // JSON-RPC responses are 200 even when they carry an error object.
    return res.status(200).json(data);
  } catch (error) {
    console.error('L1 RPC Proxy Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return res.status(500).json({
      error: 'Failed to proxy L1 RPC request',
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
    });
  }
};
