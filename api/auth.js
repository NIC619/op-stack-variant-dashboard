module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Get correct password from environment variable (server-side only)
  // Use ACCESS_PASSWORD (without REACT_APP_ prefix) to ensure it's never in the client bundle
  const correctPassword = process.env.ACCESS_PASSWORD;

  if (!correctPassword) {
    // Password protection not configured
    return res.status(200).json({ 
      authenticated: true,
      message: 'Password protection not configured'
    });
  }

  // Verify password (server-side comparison - password never exposed)
  if (password === correctPassword) {
    // Generate a simple token (in production, use a proper JWT or session token)
    const token = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
    
    return res.status(200).json({ 
      authenticated: true,
      token: token
    });
  } else {
    return res.status(401).json({ 
      authenticated: false,
      error: 'Incorrect password'
    });
  }
};
