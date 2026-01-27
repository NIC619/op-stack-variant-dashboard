import { useState, useEffect } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { DEFAULT_L1_RPC_URL } from '../utils/contracts';
import './RoleMonitor.css';

interface RoleMonitorProps {
  roleName: string;
  address: string;
  activityThresholds: number[]; // in minutes
  balanceThresholds: number[]; // in ETH
}

interface RoleStatus {
  lastTxTimestamp: number | null;
  lastTxHash: string | null;
  balance: string | null;
  loading: boolean;
  error: string | null;
}

export function RoleMonitor({
  roleName,
  address,
  activityThresholds,
  balanceThresholds
}: RoleMonitorProps) {
  const [status, setStatus] = useState<RoleStatus>({
    lastTxTimestamp: null,
    lastTxHash: null,
    balance: null,
    loading: true,
    error: null,
  });

  const [addressCopied, setAddressCopied] = useState(false);

  useEffect(() => {
    const fetchLastTransaction = async (client: any): Promise<{ timestamp: number; hash: string } | null> => {
      // Try to use block explorer API if configured
      const explorerApiUrl = process.env.REACT_APP_L1_EXPLORER_API_URL;

      if (explorerApiUrl) {
        try {
          // Get chain ID from RPC
          const chainId = await client.getChainId();

          // Check if we're on Vercel (use proxy to hide API key)
          const isVercel = typeof window !== 'undefined' && 
            (window.location.hostname.includes('vercel.app') || 
             window.location.hostname.includes('vercel.com'));

          // Build query parameters
          const params = new URLSearchParams({
            chainid: chainId.toString(),
            module: 'account',
            action: 'txlist',
            address: address,
            startblock: '0',
            endblock: '99999999',
            page: '1',
            offset: '1',
            sort: 'desc',
          });

          // Use proxy on Vercel (API key is server-side only)
          // In local dev, API key is still exposed but that's acceptable for development
          let apiEndpoint: string;
          if (isVercel) {
            // Use serverless function proxy (API key stays on server)
            apiEndpoint = `${window.location.origin}/api/explorer-proxy?${params}`;
          } else {
            // Local development - direct API call (API key will be exposed in bundle)
            // Note: For production security, always use the proxy
            const explorerApiKey = process.env.REACT_APP_L1_EXPLORER_API_KEY || '';
            if (explorerApiKey) {
              params.append('apikey', explorerApiKey);
            }
            apiEndpoint = `${explorerApiUrl}?${params}`;
          }

          const response = await fetch(apiEndpoint);
          const data = await response.json();

          // Etherscan v2 API format
          if (data.status === '1' && data.result && data.result.length > 0) {
            const latestTx = data.result[0];
            return {
              timestamp: parseInt(latestTx.timeStamp, 10),
              hash: latestTx.hash,
            };
          }
        } catch (error) {
          console.warn(`Block explorer API failed for ${roleName}, falling back to RPC:`, error);
        }
      }

      // Fallback: Check recent blocks via RPC (much faster with limited range)
      try {
        const currentBlock = await client.getBlockNumber();
        // Only check last 100 blocks as fallback
        const blocksToCheck = 100n;
        const startBlock = currentBlock - blocksToCheck;

        for (let i = currentBlock; i >= startBlock; i--) {
          try {
            const block = await client.getBlock({
              blockNumber: i,
              includeTransactions: true,
            });

            if (block.transactions && Array.isArray(block.transactions)) {
              for (const tx of block.transactions) {
                if (typeof tx === 'object' && tx.from && tx.hash) {
                  if (tx.from.toLowerCase() === address.toLowerCase()) {
                    return {
                      timestamp: Number(block.timestamp),
                      hash: tx.hash,
                    };
                  }
                }
              }
            }
          } catch (error) {
            // Skip block on error
            continue;
          }
        }
      } catch (error) {
        console.warn(`RPC fallback failed for ${roleName}:`, error);
      }

      return null;
    };

    const fetchRoleStatus = async () => {
      try {
        const client = createPublicClient({
          transport: http(process.env.REACT_APP_L1_RPC_URL || DEFAULT_L1_RPC_URL),
        });

        // Fetch balance and latest transaction in parallel
        const [balanceWei, lastTxData] = await Promise.all([
          client.getBalance({ address: address as `0x${string}` }),
          fetchLastTransaction(client),
        ]);

        const balanceEth = formatEther(balanceWei);

        setStatus({
          lastTxTimestamp: lastTxData?.timestamp || null,
          lastTxHash: lastTxData?.hash || null,
          balance: balanceEth,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error(`Error fetching ${roleName} status:`, error);
        setStatus({
          lastTxTimestamp: null,
          lastTxHash: null,
          balance: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    fetchRoleStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRoleStatus, 30000);
    return () => clearInterval(interval);
  }, [roleName, address]);

  const getActivityWarningLevel = (): { level: number; message: string } | null => {
    if (!status.lastTxTimestamp) {
      return { level: 6, message: 'No recent transaction found' };
    }

    const now = Math.floor(Date.now() / 1000);
    const minutesSinceLastTx = Math.floor((now - status.lastTxTimestamp) / 60);

    // Check thresholds in descending order (most severe first)
    for (let i = activityThresholds.length - 1; i >= 0; i--) {
      if (minutesSinceLastTx >= activityThresholds[i]) {
        return {
          level: i + 1,
          message: `No transaction for ${minutesSinceLastTx} minutes (threshold: ${activityThresholds[i]}m)`,
        };
      }
    }

    return null; // No warning
  };

  const getBalanceWarningLevel = (): { level: number; message: string } | null => {
    if (!status.balance) {
      return null;
    }

    const balanceNum = parseFloat(status.balance);

    // Find the most severe threshold (lowest value) that balance is below
    // Lower balance = higher warning level (more severe)
    let mostSevereLevel = -1;
    let mostSevereThreshold = -1;

    for (let i = 0; i < balanceThresholds.length; i++) {
      if (balanceNum < balanceThresholds[i]) {
        mostSevereLevel = i + 1;
        mostSevereThreshold = balanceThresholds[i];
      }
    }

    if (mostSevereLevel > 0) {
      return {
        level: mostSevereLevel,
        message: `Balance ${balanceNum.toFixed(4)} ETH below threshold ${mostSevereThreshold} ETH`,
      };
    }

    return null; // No warning
  };

  const formatTimestamp = (timestamp: number | null): string => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatTimeSince = (timestamp: number | null): string => {
    if (!timestamp) return 'Unknown';
    const now = Math.floor(Date.now() / 1000);
    const seconds = now - timestamp;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const activityWarning = getActivityWarningLevel();
  const balanceWarning = getBalanceWarningLevel();

  const getWarningClass = (level: number): string => {
    if (level >= 5) return 'warning-critical';
    if (level >= 3) return 'warning-high';
    if (level >= 1) return 'warning-medium';
    return '';
  };

  const truncateAddress = (addr: string): string => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddressToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const getTxUrl = (txHash: string): string => {
    const explorerBaseUrl = process.env.REACT_APP_L1_EXPLORER_BASE_URL || 'https://etherscan.io';
    return `${explorerBaseUrl}/tx/${txHash}`;
  };

  return (
    <div className="role-monitor-card">
      <div className="role-header">
        <h3>{roleName}</h3>
        <span
          className="role-address copyable"
          title={address}
          onClick={copyAddressToClipboard}
        >
          {truncateAddress(address)}
          {addressCopied && <span className="copy-feedback"> ✓</span>}
        </span>
      </div>

      {status.loading ? (
        <div className="role-status">Loading...</div>
      ) : status.error ? (
        <div className="role-status error">Error: {status.error}</div>
      ) : (
        <>
          {/* Activity Status */}
          <div className="status-section">
            <h4>Activity</h4>
            <div className="status-item">
              <span className="status-label">Last Transaction:</span>
              {status.lastTxHash ? (
                <a
                  href={getTxUrl(status.lastTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="status-value tx-link"
                >
                  {formatTimestamp(status.lastTxTimestamp)}
                </a>
              ) : (
                <span className="status-value">{formatTimestamp(status.lastTxTimestamp)}</span>
              )}
            </div>
            <div className="status-item">
              <span className="status-label">Time Since:</span>
              <span className="status-value">{formatTimeSince(status.lastTxTimestamp)}</span>
            </div>
            {activityWarning && (
              <div className={`warning-box ${getWarningClass(activityWarning.level)}`}>
                <span className="warning-icon">⚠️</span>
                <span className="warning-message">{activityWarning.message}</span>
              </div>
            )}
          </div>

          {/* Balance Status */}
          <div className="status-section">
            <h4>Balance</h4>
            <div className="status-item">
              <span className="status-label">ETH Balance:</span>
              <span className="status-value">
                {status.balance ? `${parseFloat(status.balance).toFixed(4)} ETH` : 'Unknown'}
              </span>
            </div>
            {balanceWarning && (
              <div className={`warning-box ${getWarningClass(balanceWarning.level)}`}>
                <span className="warning-icon">⚠️</span>
                <span className="warning-message">{balanceWarning.message}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
