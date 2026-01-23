import React from 'react';
import './PauseFlowGraph.css';

interface PauseFlowGraphProps {
  guardianAddress: string | null;
  superchainConfigAddress: string;
  systemConfigAddress: string;
  optimismPortalAddress: string;
  l1StandardBridgeAddress: string;
}

export function PauseFlowGraph({
  guardianAddress,
  superchainConfigAddress,
  systemConfigAddress,
  optimismPortalAddress,
  l1StandardBridgeAddress,
}: PauseFlowGraphProps) {
  const truncateAddress = (address: string): string => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="pause-flow-graph">
      <h2>Emergency Pause/Unpause Call Flow</h2>

      <div className="pause-flow-container">
        {/* Guardian Node */}
        <div className="pause-flow-level">
          <div className="pause-node guardian-node">
            <span className="node-label">Guardian</span>
            {guardianAddress && (
              <span className="node-address" title={guardianAddress}>
                {truncateAddress(guardianAddress)}
              </span>
            )}
          </div>
          <div className="flow-arrow write-arrow">↓ trigger pause/unpause</div>
        </div>

        {/* SuperchainConfig Node */}
        <div className="pause-flow-level">
          <div className="pause-node authority-node">
            <span className="node-label">SuperchainConfig</span>
            <span className="node-address" title={superchainConfigAddress}>
              {truncateAddress(superchainConfigAddress)}
            </span>
            <span className="node-description">Central Pause Authority</span>
          </div>
          <div className="flow-arrow read-arrow">↑ read pause state</div>
        </div>

        {/* SystemConfig Node */}
        <div className="pause-flow-level">
          <div className="pause-node router-node">
            <span className="node-label">SystemConfig</span>
            <span className="node-address" title={systemConfigAddress}>
              {truncateAddress(systemConfigAddress)}
            </span>
            <span className="node-description">Pause State Router</span>
          </div>
          <div className="flow-arrow read-arrow">↑ read pause state</div>
        </div>

        {/* Consumer Nodes */}
        <div className="pause-flow-level">
          <div className="pause-consumers">
            <div className="pause-node consumer-node">
              <span className="node-label">OptimismPortal</span>
              <span className="node-address" title={optimismPortalAddress}>
                {truncateAddress(optimismPortalAddress)}
              </span>
              <span className="node-effect">Blocks: Withdrawals</span>
              <span className="node-effect allows">Allows: Deposits</span>
            </div>
            <div className="pause-node consumer-node">
              <span className="node-label">L1StandardBridge</span>
              <span className="node-address" title={l1StandardBridgeAddress}>
                {truncateAddress(l1StandardBridgeAddress)}
              </span>
              <span className="node-effect">Blocks: All Bridging</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="pause-flow-legend">
          <div className="legend-item">
            <span className="legend-icon write-arrow">↓</span>
            <span>Write Operation (trigger)</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon read-arrow">↑</span>
            <span>Read Operation (check state)</span>
          </div>
        </div>

        {/* Key Information */}
        <div className="pause-info-box">
          <h3>Key Information</h3>
          <ul>
            <li><strong>Who can pause:</strong> Only Guardian</li>
            <li><strong>Pause duration:</strong> Max 3 months (auto-expiry)</li>
            <li><strong>Asymmetric control:</strong> Blocks withdrawals, allows deposits</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
