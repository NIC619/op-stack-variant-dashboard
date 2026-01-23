import { useEffect, useState } from 'react';
import { getContractInfo, getViewFunctionData } from '../utils/contracts';
import type { Predeploy } from '../types';
import './ContractCard.css';

interface ContractCardProps {
  predeploy: Predeploy;
  isSelected: boolean;
  onSelect: () => void;
  onTransferClick: () => void;
  onWithdrawClick: () => void;
  onUpgradeClick: () => void;
  connectedAddress?: string;
  rpcUrl?: string;
}

export default function ContractCard({
  predeploy,
  isSelected,
  onSelect,
  onTransferClick,
  onWithdrawClick,
  onUpgradeClick,
  connectedAddress,
  rpcUrl,
}: ContractCardProps) {
  const [contractInfo, setContractInfo] = useState<{ owner: string | null; balance: bigint | null; implementation: string | null }>({
    owner: null,
    balance: null,
    implementation: null,
  });
  const [viewData, setViewData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedProvers, setExpandedProvers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        setLoading(true);

        // Fetch owner and balance if not purely view-function based
        if (!predeploy.viewFunctions || predeploy.isManageable) {
          const info = await getContractInfo(predeploy.address, rpcUrl);
          setContractInfo({
            owner: info.owner,
            balance: info.balance,
            implementation: info.implementation,
          });
          setError(info.error);
        }

        // If contract has view functions, fetch those as well
        if (predeploy.viewFunctions && predeploy.viewFunctions.length > 0) {
          const functionNames = predeploy.viewFunctions.map(vf => vf.name);
          const data = await getViewFunctionData(predeploy.address, functionNames, rpcUrl);
          setViewData(data);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch contract info';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [predeploy.address, predeploy.viewFunctions, predeploy.isManageable, rpcUrl]);

  const isOwnedByConnected =
    connectedAddress && contractInfo.owner
      ? connectedAddress.toLowerCase() === contractInfo.owner.toLowerCase()
      : false;

  const copyToClipboard = async (value: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isCopyableValue = (functionName?: string, value?: any): boolean => {
    if (!functionName) return false;

    // Check if value is a valid address or hash
    if (typeof value === 'string' && value.startsWith('0x')) {
      // 42 chars = address, 66 chars = bytes32
      if (value.length === 42 || value.length === 66) {
        return true;
      }
    }

    // Special handling for attestedProvers fields
    if (functionName.startsWith('attestedProvers_')) {
      const parts = functionName.split('_');
      const fieldName = parts[2];
      if (fieldName === 'addr') return true;
      if (fieldName === 'goldenMeasurement') {
        const subField = parts[3];
        return subField === 'hash';
      }
      return false;
    }

    // Copyable: addresses, hashes, and other hex values by function name
    return functionName === 'hash' ||
           functionName === 'batcherHash' ||
           functionName.toLowerCase().includes('address') ||
           functionName.toLowerCase().includes('account') ||
           functionName.toLowerCase().includes('config') ||
           functionName.toLowerCase().includes('factory') ||
           functionName.toLowerCase().includes('game') ||
           functionName.toLowerCase().includes('registry') ||
           functionName === 'recipient' ||
           functionName === 'otherMessenger' ||
           functionName === 'otherBridge' ||
           functionName === 'messenger' ||
           functionName === 'signalService';
  };

  const categoryColors: Record<Predeploy['category'], string> = {
    bridge: '#3b82f6',
    vault: '#f59e0b',
    factory: '#8b5cf6',
    system: '#10b981',
    governance: '#ef4444',
    tee: '#06b6d4',
  };

  return (
    <div
      className={`predeploy-card ${isSelected ? 'selected' : ''} ${isOwnedByConnected ? 'owned' : ''}`}
      onClick={onSelect}
    >
      <div className="card-header">
        <div>
          <h3 className="card-title">{predeploy.name}</h3>
          <p
            className="card-address copyable"
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(predeploy.address, 'contractAddress');
            }}
            style={{ cursor: 'pointer' }}
            title="Click to copy full address"
          >
            {truncateAddress(predeploy.address)}
            {copiedField === 'contractAddress' && ' ✓'}
          </p>
        </div>
        <span className="category-badge" style={{ backgroundColor: categoryColors[predeploy.category] }}>
          {predeploy.category}
        </span>
      </div>

      <p className="card-description">{predeploy.description}</p>

      <div className="card-info">
        {/* Display owner/balance if contract is manageable or has no view functions */}
        {(!predeploy.viewFunctions || predeploy.isManageable) && (
          <>
            <div className="info-row">
              <span className="info-label">{(predeploy.name === 'ProxyAdmin' || predeploy.name === 'ProverRegistry' || predeploy.name === 'WorkloadVerifier') ? 'Owner:' : 'Proxy Admin:'}</span>
              <span
                className="info-value copyable"
                onClick={(e) => {
                  e.stopPropagation();
                  if (contractInfo.owner) {
                    copyToClipboard(contractInfo.owner, 'proxyAdmin');
                  }
                }}
                style={{ cursor: contractInfo.owner ? 'pointer' : 'default' }}
                title={contractInfo.owner ? 'Click to copy' : undefined}
              >
                {loading ? 'Loading...' : error ? '—' : contractInfo.owner ? truncateAddress(contractInfo.owner) : 'Unknown'}
                {copiedField === 'proxyAdmin' && ' ✓'}
              </span>
            </div>

            {/* Display implementation address for proxy contracts (except ProxyAdmin, ProverRegistry, and WorkloadVerifier) */}
            {predeploy.name !== 'ProxyAdmin' && predeploy.name !== 'ProverRegistry' && predeploy.name !== 'WorkloadVerifier' && (
              <div className="info-row">
                <span className="info-label">Implementation:</span>
                <span
                  className="info-value copyable"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (contractInfo.implementation) {
                      copyToClipboard(contractInfo.implementation, 'implementation');
                    }
                  }}
                  style={{ cursor: contractInfo.implementation ? 'pointer' : 'default' }}
                  title={contractInfo.implementation ? 'Click to copy' : undefined}
                >
                  {loading ? 'Loading...' : contractInfo.implementation ? truncateAddress(contractInfo.implementation) : '—'}
                  {copiedField === 'implementation' && ' ✓'}
                </span>
              </div>
            )}

            {predeploy.category === 'vault' && (
              <div className="info-row">
                <span className="info-label">Balance:</span>
                <span className="info-value">
                  {loading ? 'Loading...' : contractInfo.balance !== null ? formatBalance(contractInfo.balance) : '—'}
                </span>
              </div>
            )}
          </>
        )}

        {/* Display view function results if available */}
        {predeploy.viewFunctions && predeploy.viewFunctions.length > 0 && (
          predeploy.viewFunctions.map(vf => {
            const rawValue = viewData[vf.name];

            // Skip expiration display if corresponding paused state is false
            if (vf.name === 'expiration_global' && !viewData['paused_global']) {
              return null;
            }
            if (vf.name === 'expiration_portal' && !viewData['paused_portal']) {
              return null;
            }

            const isCopyable = isCopyableValue(vf.name, rawValue);
            const displayValue = rawValue !== undefined && rawValue !== null
              ? formatViewData(rawValue, vf.name)
              : '—';

            return (
              <div className="info-row" key={vf.name}>
                <span className="info-label">{vf.label}:</span>
                <span
                  className={isCopyable ? 'info-value copyable' : 'info-value'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isCopyable && rawValue) {
                      copyToClipboard(String(rawValue), vf.name);
                    }
                  }}
                  style={{ cursor: isCopyable && rawValue ? 'pointer' : 'default' }}
                  title={isCopyable && rawValue ? 'Click to copy' : undefined}
                >
                  {loading ? 'Loading...' : displayValue}
                  {copiedField === vf.name && ' ✓'}
                </span>
              </div>
            );
          })
        )}

        {/* Display dynamically queried attestedProvers mapping results - Grouped and Collapsible */}
        {(() => {
          // Group attested prover fields by instance ID
          const proverGroups: Record<string, Record<string, any>> = {};
          Object.keys(viewData)
            .filter(key => key.startsWith('attestedProvers_'))
            .forEach(key => {
              const parts = key.split('_');
              const instanceId = parts[1];
              if (!proverGroups[instanceId]) {
                proverGroups[instanceId] = {};
              }
              proverGroups[instanceId][key] = viewData[key];
            });

          const instanceIds = Object.keys(proverGroups).sort((a, b) => parseInt(a) - parseInt(b));

          if (instanceIds.length === 0) return null;

          const toggleProver = (instanceId: string) => {
            setExpandedProvers(prev => {
              const newSet = new Set(prev);
              if (newSet.has(instanceId)) {
                newSet.delete(instanceId);
              } else {
                newSet.add(instanceId);
              }
              return newSet;
            });
          };

          return instanceIds.map(instanceId => {
            const isExpanded = expandedProvers.has(instanceId);
            const proverData = proverGroups[instanceId];
            const keys = Object.keys(proverData).sort();

            // Get address for summary display
            const addrKey = keys.find(k => k.endsWith('_addr'));
            const addrValue = addrKey ? proverData[addrKey] : null;
            const shortAddr = addrValue ? `${addrValue.slice(0, 6)}...${addrValue.slice(-4)}` : '';

            return (
              <div key={`prover-${instanceId}`} className="attested-prover-section">
                <div
                  className="attested-prover-header"
                  onClick={() => toggleProver(instanceId)}
                >
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  <span className="prover-title">Attested Prover {instanceId}</span>
                  {!isExpanded && shortAddr && (
                    <span className="prover-summary">{shortAddr}</span>
                  )}
                </div>

                {isExpanded && keys.map(key => {
                  const rawValue = proverData[key];
                  const parts = key.split('_');
                  const fieldName = parts[2];

                  const isCopyable = isCopyableValue(key, rawValue);
                  const displayValue = rawValue !== undefined && rawValue !== null
                    ? formatViewData(rawValue, key)
                    : '—';

                  // Create label based on field name
                  let label = '';
                  if (fieldName === 'addr') label = 'Address';
                  else if (fieldName === 'validUntil') label = 'Valid Until';
                  else if (fieldName === 'teeType') label = 'TEE Type';
                  else if (fieldName === 'elType') label = 'EL Type';
                  else if (fieldName === 'goldenMeasurement') {
                    const subField = parts[3];
                    if (subField === 'cloudType') label = 'Golden Measurement Cloud Type';
                    else if (subField === 'teeType') label = 'Golden Measurement TEE Type';
                    else if (subField === 'elType') label = 'Golden Measurement EL Type';
                    else if (subField === 'tag') label = 'Golden Measurement Tag';
                    else if (subField === 'hash') label = 'Golden Measurement Hash';
                  }

                  return (
                    <div className="info-row prover-field" key={key}>
                      <span className="info-label">{label}:</span>
                      <span
                        className={isCopyable ? 'info-value copyable' : 'info-value'}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCopyable && rawValue) {
                            copyToClipboard(String(rawValue), key);
                          }
                        }}
                        style={{ cursor: isCopyable && rawValue ? 'pointer' : 'default' }}
                        title={isCopyable && rawValue ? 'Click to copy' : undefined}
                      >
                        {loading ? 'Loading...' : displayValue}
                        {copiedField === key && ' ✓'}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>

      {isOwnedByConnected && (
        <div className="owned-indicator">✓ You own this contract</div>
      )}

      {error && (
        <div className="error-message" style={{ color: '#ef4444', padding: '8px', fontSize: '12px' }}>
          Error: {error}
        </div>
      )}

      {predeploy.isManageable && (
        <div className="card-actions">
          <button
            className="btn btn-small btn-transfer"
            onClick={e => {
              e.stopPropagation();
              onTransferClick();
            }}
          >
            {(predeploy.name === 'ProxyAdmin' || predeploy.name === 'ProverRegistry' || predeploy.name === 'WorkloadVerifier') ? 'Transfer Owner' : 'Transfer Admin'}
          </button>
          {predeploy.name !== 'ProxyAdmin' && predeploy.name !== 'ProverRegistry' && predeploy.name !== 'WorkloadVerifier' && (
            <button
              className="btn btn-small btn-upgrade"
              onClick={e => {
                e.stopPropagation();
                onUpgradeClick();
              }}
            >
              Upgrade Impl
            </button>
          )}
          {predeploy.category === 'vault' && (
            <button
              className="btn btn-small btn-withdraw"
              onClick={e => {
                e.stopPropagation();
                onWithdrawClick();
              }}
            >
              Withdraw
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function truncateAddress(address: string, length: number = 10): string {
  if (!address || address.length <= length) return address;
  return `${address.slice(0, length)}...${address.slice(-4)}`;
}

function formatBalance(balance: bigint): string {
  const eth = Number(balance) / 1e18;
  return eth.toFixed(4) + ' ETH';
}

function formatViewData(value: any, functionName?: string): string {
  // Special handling for attestedProvers individual fields
  if (functionName?.startsWith('attestedProvers_')) {
    const parts = functionName.split('_');
    const fieldName = parts[2];

    // Address field
    if (fieldName === 'addr' && typeof value === 'string') {
      return truncateAddress(value);
    }

    // ValidUntil field (timestamp)
    if (fieldName === 'validUntil' && (typeof value === 'bigint' || typeof value === 'number')) {
      const timestamp = typeof value === 'bigint' ? Number(value) : value;
      if (timestamp === 0) {
        return '0 (Not set)';
      }
      const date = new Date(timestamp * 1000);
      return `${timestamp} (${date.toUTCString()})`;
    }

    // TEEType enum: 0=Unknown, 1=IntelTDX, 2=AmdSevSnp
    if (fieldName === 'teeType') {
      const teeType = typeof value === 'bigint' ? Number(value) : value;
      switch (teeType) {
        case 0: return 'Unknown (0)';
        case 1: return 'IntelTDX (1)';
        case 2: return 'AmdSevSnp (2)';
        default: return `Unknown (${teeType})`;
      }
    }

    // ELType enum: 0=Unset, 1=Geth, 2=Reth
    if (fieldName === 'elType') {
      const elType = typeof value === 'bigint' ? Number(value) : value;
      switch (elType) {
        case 0: return 'Unset (0)';
        case 1: return 'Geth (1)';
        case 2: return 'Reth (2)';
        default: return `Unknown (${elType})`;
      }
    }

    // Golden measurement fields
    if (fieldName === 'goldenMeasurement') {
      const subField = parts[3];

      // CloudType enum: 0=Unset, 1=GCP, 2=Azure
      if (subField === 'cloudType') {
        const cloudType = typeof value === 'bigint' ? Number(value) : value;
        switch (cloudType) {
          case 0: return 'Unset (0)';
          case 1: return 'GCP (1)';
          case 2: return 'Azure (2)';
          default: return `Unknown (${cloudType})`;
        }
      }

      // TEEType enum: 0=Unknown, 1=IntelTDX, 2=AmdSevSnp
      if (subField === 'teeType') {
        const teeType = typeof value === 'bigint' ? Number(value) : value;
        switch (teeType) {
          case 0: return 'Unknown (0)';
          case 1: return 'IntelTDX (1)';
          case 2: return 'AmdSevSnp (2)';
          default: return `Unknown (${teeType})`;
        }
      }

      // ELType enum: 0=Unset, 1=Geth, 2=Reth
      if (subField === 'elType') {
        const elType = typeof value === 'bigint' ? Number(value) : value;
        switch (elType) {
          case 0: return 'Unset (0)';
          case 1: return 'Geth (1)';
          case 2: return 'Reth (2)';
          default: return `Unknown (${elType})`;
        }
      }

      // Tag (string)
      if (subField === 'tag' && typeof value === 'string') {
        return value;
      }

      // Hash (bytes32)
      if (subField === 'hash' && typeof value === 'string') {
        return truncateHash(value);
      }
    }
  }

  // Special handling for getAnchorRoot (returns tuple: [root: bytes32, l2SequenceNumber: uint256])
  if (functionName === 'getAnchorRoot' && Array.isArray(value) && value.length === 2) {
    const root = value[0];
    const l2SequenceNumber = value[1];
    const rootStr = typeof root === 'string' ? truncateHash(root) : String(root);
    const seqNumStr = typeof l2SequenceNumber === 'bigint' ? l2SequenceNumber.toString() : String(l2SequenceNumber);
    return `Root: ${rootStr}, L2 Seq: ${seqNumStr}`;
  }

  // Special handling for respectedGameType
  if (functionName === 'respectedGameType') {
    const gameType = typeof value === 'bigint' ? Number(value) : value;
    switch (gameType) {
      case 0: return 'Permissionless (0)';
      case 1: return 'Permissioned (1)';
      case 6: return 'OP_SUCCINCT (6)';
      default: return `Unknown (${gameType})`;
    }
  }

  // Special handling for withdrawalNetwork and withdrawalNetworkL2Owner
  if (functionName === 'withdrawalNetwork' || functionName === 'withdrawalNetworkL2Owner') {
    const networkValue = typeof value === 'bigint' ? Number(value) : value;
    return networkValue === 0 ? 'L1' : 'L2';
  }

  // Special handling for ETH amounts (minWithdrawalAmount, totalProcessed, totalSupply, initBonds)
  if (functionName === 'minWithdrawalAmount' || functionName === 'totalProcessed' || functionName === 'totalSupply' || functionName?.startsWith('initBonds_')) {
    if (typeof value === 'bigint') {
      return formatBalance(value);
    }
  }

  // Special handling for 32-byte hashes (truncate)
  if (functionName === 'hash' || functionName === 'batcherHash') {
    if (typeof value === 'string') {
      return truncateHash(value);
    }
  }

  // Special handling for timestamps
  if (functionName === 'retirementTimestamp' && (typeof value === 'bigint' || typeof value === 'number')) {
    const timestamp = typeof value === 'bigint' ? Number(value) : value;
    if (timestamp === 0) {
      return '0 (Not retired)';
    }
    const date = new Date(timestamp * 1000);
    return `${timestamp} (${date.toUTCString()})`;
  }

  // Handle string values
  if (typeof value === 'string') {
    // If it looks like an address, truncate it
    if (value.startsWith('0x') && value.length === 42) {
      return truncateAddress(value);
    }
    return value;
  }

  // Handle bigint values
  if (typeof value === 'bigint') {
    return value.toString();
  }

  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

function truncateHash(hash: string, length: number = 16): string {
  if (!hash || hash.length <= length) return hash;
  return `${hash.slice(0, length)}...${hash.slice(-4)}`;
}
