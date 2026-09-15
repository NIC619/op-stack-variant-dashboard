const {
  issueToken,
  buildAuthCookie,
  buildClearCookie,
  isAuthConfigured,
  verifyToken,
  parseCookies,
  COOKIE_NAME,
} = require('../lib/auth');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // GET reports the CURRENT session state, so the client can tell whether its stored
  // "authenticated" flag still corresponds to a live cookie.
  //
  // The client keeps its flag in sessionStorage, which outlives the cookie: the cookie is
  // good for 7 days (DEFAULT_MAX_AGE_SECONDS) and dies sooner still if AUTH_SECRET is
  // rotated, while a restored or long-lived tab can hold sessionStorage indefinitely. With
  // no way to check, the UI stayed "logged in" while every protected proxy answered 401 —
  // a dead dashboard with no route back to the login form. This endpoint is that route.
  //
  // `configured` lets the client skip the gate entirely when no password is set, rather
  // than showing a form that accepts any non-empty string.
  if (req.method === 'GET') {
    // Never cached: a stale "authenticated: true" would recreate the bug this fixes.
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    const configured = isAuthConfigured();
    const authenticated = !configured || verifyToken(parseCookies(req)[COOKIE_NAME]);
    // Clear a cookie we just rejected so the browser stops sending it.
    if (configured && !authenticated) {
      res.setHeader('Set-Cookie', buildClearCookie());
    }
    return res.status(200).json({ configured, authenticated });
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
    // Issue a signed, HttpOnly cookie. Protected proxies (/api/l1-rpc, etc.)
    // verify this cookie before forwarding, so the API routes can't be driven
    // directly by anyone who just knows the deployment URL.
    const token = issueToken();
    res.setHeader('Set-Cookie', buildAuthCookie(token));

    return res.status(200).json({
      authenticated: true,
    });
  } else {
    return res.status(401).json({ 
      authenticated: false,
      error: 'Incorrect password'
    });
  }
};
