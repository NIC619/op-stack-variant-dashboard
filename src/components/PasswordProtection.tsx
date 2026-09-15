import { useState, useEffect } from 'react';
import { isLocalDev } from '../utils/env';
import './PasswordProtection.css';

// sessionStorage key for the "this tab has logged in" flag. Only a UI hint — the signed
// HttpOnly cookie is what actually authorizes the API proxies.
const AUTH_KEY = 'unifi_dashboard_auth';

interface PasswordProtectionProps {
  children: React.ReactNode;
}

export default function PasswordProtection({ children }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  // Local dev is exempt outright; a deployed build asks the server what to do.
  const [gated, setGated] = useState(!isLocalDev());

  useEffect(() => {
    if (isLocalDev()) {
      setIsAuthenticated(true);
      setIsChecking(false);
      return;
    }

    let cancelled = false;

    // Ask the server whether protection is on and whether THIS browser still holds a valid
    // cookie. sessionStorage alone is not trustworthy: it can outlive the 7-day cookie (and
    // any AUTH_SECRET rotation) in a long-lived or restored tab, which used to leave the UI
    // showing a dashboard whose every request 401s, with no way back to the login form.
    (async () => {
      try {
        const response = await fetch(`${window.location.origin}/api/auth`, {
          headers: { Accept: 'application/json' },
        });
        // A 500/502/405 still carries a JSON body, and reading `authenticated` off it would
        // land in the "cookie is dead" branch below and log out a perfectly good session.
        // Only a well-formed 200 is an answer; anything else is a failed check, which the
        // catch below handles by leaving the existing session alone.
        if (!response.ok) {
          throw new Error(`Session check failed: HTTP ${response.status}`);
        }
        const data = (await response.json()) as { configured?: unknown; authenticated?: unknown };
        if (typeof data.configured !== 'boolean' || typeof data.authenticated !== 'boolean') {
          throw new Error('Session check returned an unexpected body');
        }
        if (cancelled) return;

        if (data.configured === false) {
          // No password set on this deployment — don't show a form that accepts anything.
          setGated(false);
          setIsAuthenticated(true);
        } else if (data.authenticated === true) {
          sessionStorage.setItem(AUTH_KEY, 'authenticated');
          setIsAuthenticated(true);
        } else {
          // The cookie is gone or expired — drop the stale flag and show the form again.
          sessionStorage.removeItem(AUTH_KEY);
          setIsAuthenticated(false);
        }
      } catch {
        // The check itself failed (offline, function cold-start error). Fall back to the
        // stored flag rather than logging a working session out over one failed request;
        // the proxies still enforce the cookie server-side, so this cannot grant access.
        if (cancelled) return;
        setIsAuthenticated(sessionStorage.getItem(AUTH_KEY) === 'authenticated');
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Verify password via serverless function (password never exposed in client bundle)
      let authenticated = false;

      if (!isLocalDev()) {
        // Any deployed build: verify the password server-side
        const response = await fetch(`${window.location.origin}/api/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });

        const data = await response.json();
        authenticated = data.authenticated === true;

        if (!authenticated) {
          setError(data.error || 'Incorrect password. Please try again.');
          setPassword('');
          return;
        }
      } else {
        // Local development: skip password check (no protection needed)
        authenticated = true;
      }

      if (authenticated) {
        // Store authentication in sessionStorage (cleared when browser closes)
        sessionStorage.setItem(AUTH_KEY, 'authenticated');
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Failed to verify password. Please try again.');
      setPassword('');
    }
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="password-protection-container">
        <div className="password-protection-box">
          <div className="password-loading">Loading...</div>
        </div>
      </div>
    );
  }

  // Skip password protection in local development
  if (!gated) {
    return <>{children}</>;
  }

  // Show password form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="password-protection-container">
        <div className="password-protection-box">
          <div className="password-header">
            <h1>UniFi Monitor & Management</h1>
            <p>This site is password protected</p>
          </div>
          <form onSubmit={handleSubmit} className="password-form">
            <div className="password-input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                className={error ? 'error' : ''}
              />
              {error && <div className="password-error">{error}</div>}
            </div>
            <button type="submit" className="password-submit-btn">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}
