module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get parameters from query string
  const { chainid, module, action, address, startblock, endblock, page, offset, sort } = req.query;

  if (!chainid || !module || !action || !address) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Get API key from environment variable (server-side only)
  const apiKey = process.env.REACT_APP_L1_EXPLORER_API_KEY;
  const apiUrl = process.env.REACT_APP_L1_EXPLORER_API_URL;

  if (!apiUrl) {
    return res.status(500).json({ error: 'Explorer API URL not configured' });
  }

  try {
    // Build query parameters
    const params = new URLSearchParams({
      chainid: chainid.toString(),
      module: module.toString(),
      action: action.toString(),
      address: address.toString(),
      startblock: startblock || '0',
      endblock: endblock || '99999999',
      page: page || '1',
      offset: offset || '1',
      sort: sort || 'desc',
    });

    // Add API key if available (server-side only - never exposed to client)
    if (apiKey) {
      params.append('apikey', apiKey);
    }

    // Forward the request to the explorer API
    const response = await fetch(`${apiUrl}?${params}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Explorer API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Explorer API error',
        status: response.status,
        message: errorText
      });
    }

    const data = await response.json();

    // Forward the response
    return res.status(200).json(data);
  } catch (error) {
    console.error('Explorer Proxy Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return res.status(500).json({ 
      error: 'Failed to proxy explorer API request',
      message: errorMessage
    });
  }
};
