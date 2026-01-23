import { useState, useEffect } from 'react';
import { RPC_ENDPOINTS, getBlockByTag } from '../utils/rpc';
import type { BlockInfo, RpcEndpoint } from '../types';
import './BlockMonitor.css';

const BLOCK_TAGS = ['latest', 'safe', 'finalized'] as const;

export default function BlockMonitorPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1>Block Monitor</h1>
            <p>Block information across all RPC endpoints</p>
          </div>
          <button className="refresh-btn" onClick={handleRefresh}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="endpoints-grid" key={refreshKey}>
        {RPC_ENDPOINTS.map(endpoint => (
          <div key={endpoint.url} className="endpoint-card">
            <h2 className="endpoint-name">{endpoint.name}</h2>
            <p className="endpoint-url">{endpoint.url}</p>

            <div className="tags-container">
              {BLOCK_TAGS.map(tag => (
                <div key={tag} className="tag-section">
                  <h3 className="tag-name">{tag.charAt(0).toUpperCase() + tag.slice(1)}</h3>
                  <BlockDisplay endpoint={endpoint} tag={tag} />
                </div>
              ))}
            </div>
          </div>
        ))}
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
