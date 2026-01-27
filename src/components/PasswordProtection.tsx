import { useState, useEffect } from 'react';
import './PasswordProtection.css';

interface PasswordProtectionProps {
  children: React.ReactNode;
}

export default function PasswordProtection({ children }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  // Check if we're on Vercel (production) or local development
  const isVercel = typeof window !== 'undefined' && 
    (window.location.hostname.includes('vercel.app') || 
     window.location.hostname.includes('vercel.com'));

  useEffect(() => {
    // Skip password protection in local development
    if (!isVercel) {
      setIsAuthenticated(true);
      setIsChecking(false);
      return;
    }

    // Check if already authenticated (stored in sessionStorage for security)
    const authKey = sessionStorage.getItem('unifi_dashboard_auth');
    if (authKey === 'authenticated') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, [isVercel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Verify password via serverless function (password never exposed in client bundle)
      const isVercel = typeof window !== 'undefined' && 
        (window.location.hostname.includes('vercel.app') || 
         window.location.hostname.includes('vercel.com'));

      let authenticated = false;

      if (isVercel) {
        // On Vercel: verify password server-side
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
        sessionStorage.setItem('unifi_dashboard_auth', 'authenticated');
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
  if (!isVercel) {
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
