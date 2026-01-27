import { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { DEFAULT_L1_RPC_URL } from '../utils/contracts';
import { DISPUTE_GAME_FACTORY_ABI } from '../utils/l1abis';
import './RoleMonitor.css';

interface TEEProverMonitorProps {
  activityThresholds: number[]; // in minutes
}

interface BlockProcessedStatus {
  timestamp: number | null;
  blockNumber: bigint | null;
  offset: bigint | null;
  withdrawalCount: bigint | null;
  txHash: string | null;
  loading: boolean;
  error: string | null;
}

interface TEERpcStatus {
  ok: boolean;
  loading: boolean;
  error: string | null;
}

export function TEEProverMonitor({
  activityThresholds,
}: TEEProverMonitorProps) {
  const [blockProcessedStatus, setBlockProcessedStatus] = useState<BlockProcessedStatus>({
    timestamp: null,
    blockNumber: null,
    offset: null,
    withdrawalCount: null,
    txHash: null,
    loading: true,
    error: null,
  });

  const [teeRpcStatus, setTeeRpcStatus] = useState<TEERpcStatus>({
    ok: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const disputeGameFactoryAddress = process.env.REACT_APP_L1_DISPUTE_GAME_FACTORY_ADDRESS;
    const teeNodeUrl = process.env.REACT_APP_TEE_NODE_RPC_URL;

    if (!disputeGameFactoryAddress || !teeNodeUrl) {
      return;
    }

    const fetchBlockProcessed = async () => {
      try {
        const client = createPublicClient({
          transport: http(process.env.REACT_APP_L1_RPC_URL || DEFAULT_L1_RPC_URL),
        });

        const currentBlock = await client.getBlockNumber();
        // At most 7200 blocks per day; query last 7200 blocks
        const blocksToCheck = 7_200n;
        const fromBlock = currentBlock > blocksToCheck ? currentBlock - blocksToCheck : 0n;

        // Find the BlockProcessed event from the ABI
        const blockProcessedEvent = DISPUTE_GAME_FACTORY_ABI.find(
          (item) => item.type === 'event' && item.name === 'BlockProcessed'
        );

        if (!blockProcessedEvent) {
          throw new Error('BlockProcessed event not found in ABI');
        }

        const logs = await client.getLogs({
          address: disputeGameFactoryAddress as `0x${string}`,
          event: blockProcessedEvent as any,
          fromBlock,
          toBlock: 'latest',
        });

        if (logs.length === 0) {
          setBlockProcessedStatus({
            timestamp: null,
            blockNumber: null,
            offset: null,
            withdrawalCount: null,
            txHash: null,
            loading: false,
            error: `No BlockProcessed events in last ${blocksToCheck.toString()} blocks`,
          });
          return;
        }

        // Sort by block number descending and take the latest
        const latestLog = logs.sort((a, b) => {
          const aBlock = a.blockNumber || 0n;
          const bBlock = b.blockNumber || 0n;
          return aBlock > bBlock ? -1 : aBlock < bBlock ? 1 : 0;
        })[0];

        // Get the block to get timestamp
        const block = await client.getBlock({
          blockNumber: latestLog.blockNumber,
        });

        const args = (latestLog as { args?: { blockNumber?: bigint; offset?: bigint; withdrawalCount?: bigint } }).args;
        setBlockProcessedStatus({
          timestamp: Number(block.timestamp),
          blockNumber: args?.blockNumber ?? latestLog.blockNumber,
          offset: args?.offset ?? null,
          withdrawalCount: args?.withdrawalCount ?? null,
          txHash: latestLog.transactionHash ?? null,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching BlockProcessed events:', error);
        setBlockProcessedStatus({
          timestamp: null,
          blockNumber: null,
          offset: null,
          withdrawalCount: null,
          txHash: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    const fetchTEERpc = async () => {
      try {
        // Use the same proxy logic as rpc.ts
        const isVercel = typeof window !== 'undefined' && 
          (window.location.hostname.includes('vercel.app') || 
           window.location.hostname.includes('vercel.com'));
        
        let rpcUrl = teeNodeUrl;
        if (isVercel && /^http:\/\/\d+\.\d+\.\d+\.\d+:\d+/.test(teeNodeUrl)) {
          rpcUrl = window.location.origin + '/api/rpc-proxy?url=' + encodeURIComponent(teeNodeUrl);
        }

        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tee_getExecutionProof',
            params: ['0x1'],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Check for JSON-RPC error
        if (data.error) {
          throw new Error(data.error.message || 'JSON-RPC error');
        }

        // Check for valid result with expected fields
        if (data.result && data.result.proof && data.result.stateRoot && data.result.header) {
          setTeeRpcStatus({
            ok: true,
            loading: false,
            error: null,
          });
        } else {
          throw new Error('Invalid response: missing required fields');
        }
      } catch (error) {
        console.error('Error querying TEE RPC:', error);
        setTeeRpcStatus({
          ok: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    const fetchAll = async () => {
      await Promise.all([fetchBlockProcessed(), fetchTEERpc()]);
    };

    fetchAll();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [activityThresholds]);

  const getActivityWarningLevel = (): { level: number; message: string } | null => {
    if (!blockProcessedStatus.timestamp) {
      return { level: 6, message: blockProcessedStatus.error || 'No recent BlockProcessed event found' };
    }

    const now = Math.floor(Date.now() / 1000);
    const minutesSinceLastEvent = Math.floor((now - blockProcessedStatus.timestamp) / 60);

    // Check thresholds in descending order (most severe first)
    for (let i = activityThresholds.length - 1; i >= 0; i--) {
      if (minutesSinceLastEvent >= activityThresholds[i]) {
        return {
          level: i + 1,
          message: `No BlockProcessed event for ${minutesSinceLastEvent} minutes (threshold: ${activityThresholds[i]}m)`,
        };
      }
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

  const getWarningClass = (level: number): string => {
    if (level >= 5) return 'warning-critical';
    if (level >= 3) return 'warning-high';
    if (level >= 1) return 'warning-medium';
    return '';
  };

  const getTxUrl = (txHash: string): string => {
    const explorerBaseUrl = process.env.REACT_APP_L1_EXPLORER_BASE_URL || 'https://etherscan.io';
    return `${explorerBaseUrl}/tx/${txHash}`;
  };

  const disputeGameFactoryAddress = process.env.REACT_APP_L1_DISPUTE_GAME_FACTORY_ADDRESS;
  const teeNodeUrl = process.env.REACT_APP_TEE_NODE_RPC_URL;

  if (!disputeGameFactoryAddress || !teeNodeUrl) {
    return null; // Don't render if not configured
  }

  const isLoading = blockProcessedStatus.loading || teeRpcStatus.loading;
  const hasError = blockProcessedStatus.error || teeRpcStatus.error;

  return (
    <div className="role-monitor-card">
      <div className="role-header">
        <h3>TEE Prover</h3>
      </div>

      {isLoading ? (
        <div className="role-status">Loading...</div>
      ) : hasError && !blockProcessedStatus.timestamp && !teeRpcStatus.ok ? (
        <div className="role-status error">
          {blockProcessedStatus.error && <div>BlockProcessed: {blockProcessedStatus.error}</div>}
          {teeRpcStatus.error && <div>TEE RPC: {teeRpcStatus.error}</div>}
        </div>
      ) : (
        <>
          {/* BlockProcessed Status */}
          <div className="status-section">
            <h4>BlockProcessed Events</h4>
            <div className="status-item">
              <span className="status-label">Last Event:</span>
              {blockProcessedStatus.timestamp ? (
                blockProcessedStatus.txHash ? (
                  <a
                    href={getTxUrl(blockProcessedStatus.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="status-value tx-link"
                  >
                    {formatTimestamp(blockProcessedStatus.timestamp)}
                  </a>
                ) : (
                  <span className="status-value">{formatTimestamp(blockProcessedStatus.timestamp)}</span>
                )
              ) : (
                <span className="status-value">No event found</span>
              )}
            </div>
            {blockProcessedStatus.timestamp && (
              <>
                <div className="status-item">
                  <span className="status-label">Time Since:</span>
                  <span className="status-value">{formatTimeSince(blockProcessedStatus.timestamp)}</span>
                </div>
                {blockProcessedStatus.blockNumber && (
                  <div className="status-item">
                    <span className="status-label">Processed L2 Block Number:</span>
                    <span className="status-value">{blockProcessedStatus.blockNumber.toString()}</span>
                  </div>
                )}
              </>
            )}
            {activityWarning && (
              <div className={`warning-box ${getWarningClass(activityWarning.level)}`}>
                <span className="warning-icon">⚠️</span>
                <span className="warning-message">{activityWarning.message}</span>
              </div>
            )}
            {blockProcessedStatus.error && !activityWarning && (
              <div className="role-status error" style={{ marginTop: '12px', padding: '12px' }}>
                {blockProcessedStatus.error}
              </div>
            )}
          </div>

          {/* TEE RPC Status */}
          <div className="status-section">
            <h4>TEE Prover Service</h4>
            <div className="status-item">
              <span className="status-label">Status:</span>
              <span className="status-value">
                {teeRpcStatus.ok ? (
                  <span style={{ color: '#38a169', fontWeight: 600 }}>✓ OK</span>
                ) : (
                  <span style={{ color: '#e53e3e', fontWeight: 600 }}>✗ Error</span>
                )}
              </span>
            </div>
            {teeRpcStatus.error && (
              <div className="role-status error" style={{ marginTop: '12px', padding: '12px' }}>
                {teeRpcStatus.error}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
