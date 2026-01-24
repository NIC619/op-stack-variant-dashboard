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

  // Get the target RPC URL from query parameter
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    console.error('Missing url query parameter');
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  // Decode the URL
  const decodedUrl = decodeURIComponent(targetUrl);

  // Validate that the URL is from allowed environment variables
  const allowedUrls = [
    process.env.REACT_APP_GATEWAY_RPC_URL,
    process.env.REACT_APP_MAIN_NODE_RPC_URL,
    process.env.REACT_APP_TEE_NODE_RPC_URL,
    process.env.REACT_APP_L2_RPC_URL,
  ].filter(Boolean);

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
