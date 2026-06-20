// Shared auth helpers for the Vercel serverless functions in /api.
//
// Lives outside the /api directory so Vercel never exposes it as a route; it is
// just bundled into the functions that require it.
//
// Model: a single shared password (ACCESS_PASSWORD). On successful login we set a
// signed, HttpOnly cookie. Protected proxies verify that cookie before forwarding,
// so the API routes can't be driven directly by anyone who finds the URL.
//
// If ACCESS_PASSWORD is NOT set, auth is considered disabled and requireAuth() lets
// every request through — this preserves the current "open" behaviour until a
// password is configured.
const crypto = require('crypto');

const COOKIE_NAME = 'dash_auth';
const DEFAULT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Secret used to sign tokens. Prefer a dedicated AUTH_SECRET, but fall back to
// ACCESS_PASSWORD so a single env var is enough to turn protection on.
function getSecret() {
  return process.env.AUTH_SECRET || process.env.ACCESS_PASSWORD || '';
}

function isAuthConfigured() {
  return Boolean(process.env.ACCESS_PASSWORD);
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

// Token = "<expiryMs>.<hmac(expiryMs)>". Stateless: no server-side store needed.
function issueToken(maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  const secret = getSecret();
  const exp = String(Date.now() + maxAgeSeconds * 1000);
  return `${exp}.${sign(exp, secret)}`;
}

function verifyToken(token) {
  const secret = getSecret();
  if (!secret || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = sign(exp, secret);
  // Constant-time compare; lengths must match for timingSafeEqual.
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const expMs = Number(exp);
  return Number.isFinite(expMs) && expMs > Date.now();
}

// Build a Set-Cookie header value for the auth cookie.
function buildAuthCookie(token, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  return [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');
}

function buildClearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function parseCookies(req) {
  const header = req.headers && req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// Guard for protected API routes. Returns true if the request may proceed.
// If auth is enabled and the cookie is missing/invalid, sends a 401 and returns
// false (caller should `return` immediately).
function requireAuth(req, res) {
  if (!isAuthConfigured()) return true; // protection disabled -> open
  const cookies = parseCookies(req);
  if (verifyToken(cookies[COOKIE_NAME])) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

module.exports = {
  COOKIE_NAME,
  DEFAULT_MAX_AGE_SECONDS,
  isAuthConfigured,
  issueToken,
  verifyToken,
  buildAuthCookie,
  buildClearCookie,
  parseCookies,
  requireAuth,
};
