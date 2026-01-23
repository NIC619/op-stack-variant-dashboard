import { useState, useEffect } from 'react';
import { RPC_ENDPOINTS, getBlockByTag } from '../utils/rpc';
import type { BlockInfo, RpcEndpoint } from '../types';
import { RoleMonitor } from '../components/RoleMonitor';
import './ChainStatus.css';

const BLOCK_TAGS = ['latest', 'safe', 'finalized'] as const;

// Role addresses from environment variables
const BATCHER_ADDRESS = process.env.REACT_APP_BATCHER_ADDRESS || '';
const PROPOSER_ADDRESS = process.env.REACT_APP_PROPOSER_ADDRESS || '';

// Warning thresholds
const ACTIVITY_THRESHOLDS = [5, 30, 60, 240, 720, 1440]; // minutes
const BALANCE_THRESHOLDS = [5, 2.5, 1, 0.5, 0.25]; // ETH

export default function ChainStatusPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showTestRpcModal, setShowTestRpcModal] = useState(false);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>Chain Status</h1>
            <p>Monitor chain roles and block information</p>
          </div>
          <button className="refresh-btn" onClick={handleRefresh}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Block Monitoring Section */}
      <div className="blocks-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Block Information</h2>
            <p className="section-description">Block data across all RPC endpoints</p>
          </div>
          <button className="test-rpc-btn" onClick={() => setShowTestRpcModal(true)}>
            🔍 Test Custom RPC
          </button>
        </div>
        <div className="endpoints-grid" key={`blocks-${refreshKey}`}>
          {RPC_ENDPOINTS.map(endpoint => (
            <div key={endpoint.url} className="endpoint-card">
              <h3 className="endpoint-name">{endpoint.name}</h3>
              <p className="endpoint-url">{endpoint.url}</p>

              <div className="tags-container">
                {BLOCK_TAGS.map(tag => (
                  <div key={tag} className="tag-section">
                    <h4 className="tag-name">{tag.charAt(0).toUpperCase() + tag.slice(1)}</h4>
                    <BlockDisplay endpoint={endpoint} tag={tag} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Monitoring Section */}
      <div className="roles-section" key={`roles-${refreshKey}`}>
        <h2 className="section-title">Role Monitoring</h2>
        {(!BATCHER_ADDRESS || !PROPOSER_ADDRESS) && (
          <div className="error-banner">
            <strong>Missing Role Addresses:</strong> Please configure REACT_APP_BATCHER_ADDRESS and REACT_APP_PROPOSER_ADDRESS in your .env file.
          </div>
        )}
        {BATCHER_ADDRESS && PROPOSER_ADDRESS && (
          <div className="roles-grid">
            <RoleMonitor
              roleName="Batcher"
              address={BATCHER_ADDRESS}
              activityThresholds={ACTIVITY_THRESHOLDS}
              balanceThresholds={BALANCE_THRESHOLDS}
            />
            <RoleMonitor
              roleName="Proposer"
              address={PROPOSER_ADDRESS}
              activityThresholds={ACTIVITY_THRESHOLDS}
              balanceThresholds={BALANCE_THRESHOLDS}
            />
          </div>
        )}
      </div>

      {/* Test RPC Modal */}
      {showTestRpcModal && (
        <TestRpcModal onClose={() => setShowTestRpcModal(false)} />
      )}
    </div>
  );
}

function TestRpcModal({ onClose }: { onClose: () => void }) {
  const [rpcUrl, setRpcUrl] = useState('');
  const [testKey, setTestKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    latest: BlockInfo | null;
    safe: BlockInfo | null;
    finalized: BlockInfo | null;
    errors: { latest?: string; safe?: string; finalized?: string };
  } | null>(null);

  const handleTest = async () => {
    if (!rpcUrl.trim()) {
      alert('Please enter an RPC URL');
      return;
    }

    setIsLoading(true);
    setTestResults(null);

    const endpoint: RpcEndpoint = {
      name: 'Test Endpoint',
      url: rpcUrl.trim(),
    };

    const results: typeof testResults = {
      latest: null,
      safe: null,
      finalized: null,
      errors: {},
    };

    // Fetch all block tags
    for (const tag of BLOCK_TAGS) {
      try {
        const block = await getBlockByTag(endpoint, tag);
        results[tag] = block;
      } catch (err) {
        results.errors[tag] = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    setTestResults(results);
    setIsLoading(false);
    setTestKey(prev => prev + 1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTest();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal test-rpc-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Test RPC Endpoint</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="test-rpc-input-section">
            <label htmlFor="rpc-url">RPC Endpoint URL</label>
            <div className="test-rpc-input-row">
              <input
                id="rpc-url"
                type="text"
                placeholder="https://your-rpc-endpoint.com"
                value={rpcUrl}
                onChange={e => setRpcUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <button
                className="btn btn-primary"
                onClick={handleTest}
                disabled={isLoading || !rpcUrl.trim()}
              >
                {isLoading ? 'Testing...' : 'Test'}
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="test-rpc-loading">
              <div className="spinner"></div>
              <span>Fetching block data...</span>
            </div>
          )}

          {testResults && (
            <div className="test-rpc-results" key={testKey}>
              <h3>Block Information</h3>
              <div className="test-rpc-url">{rpcUrl}</div>

              <div className="test-results-grid">
                {BLOCK_TAGS.map(tag => (
                  <div key={tag} className="test-result-section">
                    <h4 className="tag-name">{tag.charAt(0).toUpperCase() + tag.slice(1)}</h4>
                    {testResults.errors[tag] ? (
                      <div className="block-error">Error: {testResults.errors[tag]}</div>
                    ) : testResults[tag] ? (
                      <TestBlockDisplay block={testResults[tag]!} />
                    ) : (
                      <div className="block-empty">No data</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function TestBlockDisplay({ block }: { block: BlockInfo }) {
  const [copied, setCopied] = useState(false);

  const copyHashToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(block.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="block-details">
      <div className="block-row">
        <span className="block-label">Block #</span>
        <span className="block-value">{block.number.toString()}</span>
      </div>
      <div className="block-row">
        <span className="block-label">Hash</span>
        <div className="block-hash-container">
          <span className="block-hash" title={block.hash}>
            {truncateHash(block.hash)}
          </span>
          <button
            className="copy-btn"
            onClick={copyHashToClipboard}
            title="Copy full hash"
            aria-label="Copy hash"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>
      <div className="block-row">
        <span className="block-label">Timestamp</span>
        <span className="block-value">
          {new Date(Number(block.timestamp) * 1000).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          })}
        </span>
      </div>
    </div>
  );
}

function BlockDisplay({
  endpoint,
  tag,
}: {
  endpoint: RpcEndpoint;
  tag: 'latest' | 'safe' | 'finalized';
}) {
  const [block, setBlock] = useState<BlockInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        setLoading(true);
        const blockData = await getBlockByTag(endpoint, tag);
        setBlock(blockData);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setBlock(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBlock();
  }, [endpoint, tag]);

  const copyHashToClipboard = async () => {
    if (!block) return;
    try {
      await navigator.clipboard.writeText(block.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return <div className="block-loading">Loading...</div>;
  }

  if (error) {
    return <div className="block-error">Error: {error}</div>;
  }

  if (!block) {
    return <div className="block-empty">No data available</div>;
  }

  return (
    <div className="block-details">
      <div className="block-row">
        <span className="block-label">Block #</span>
        <span className="block-value">{block.number.toString()}</span>
      </div>
      <div className="block-row">
        <span className="block-label">Hash</span>
        <div className="block-hash-container">
          <span className="block-hash" title={block.hash}>
            {truncateHash(block.hash)}
          </span>
          <button
            className="copy-btn"
            onClick={copyHashToClipboard}
            title="Copy full hash"
            aria-label="Copy hash"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>
      <div className="block-row">
        <span className="block-label">Timestamp</span>
        <span className="block-value">
          {new Date(Number(block.timestamp) * 1000).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          })}
        </span>
      </div>
    </div>
  );
}

function truncateHash(hash: string, length = 10): string {
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}...${hash.slice(-4)}`;
}
