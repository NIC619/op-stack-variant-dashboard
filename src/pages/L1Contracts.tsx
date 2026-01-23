import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { L1_CONTRACTS } from '../config/l1contracts';
import { getContractInfo, generateTransferOwnershipCalldata, generateChangeProxyAdminCalldata, generateUpgradeCalldata, isValidAddress, DEFAULT_L1_RPC_URL } from '../utils/contracts';
import ContractCard from '../components/ContractCard';
import { OwnershipGraph } from '../components/OwnershipGraph';
import { PauseFlowGraph } from '../components/PauseFlowGraph';
import './L1Contracts.css';

type FilterCategory = 'all' | 'bridge' | 'vault' | 'factory' | 'system' | 'governance' | 'tee';

const GUARDIAN_ABI = [
  {
    type: 'function',
    name: 'guardian',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

export default function L1ContractsPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [showOnlyManageable, setShowOnlyManageable] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'transfer' | 'withdraw' | 'upgrade' | null>(null);
  const [newOwner, setNewOwner] = useState('');
  const [newImplementation, setNewImplementation] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [guardianAddress, setGuardianAddress] = useState<string | null>(null);

  const filtered = L1_CONTRACTS.filter(p => {
    const categoryMatch = filterCategory === 'all' || p.category === filterCategory;
    const manageableMatch = !showOnlyManageable || p.isManageable;
    return categoryMatch && manageableMatch;
  });

  // Fetch guardian address from SuperchainConfig
  useEffect(() => {
    const fetchGuardian = async () => {
      const superchainConfigAddress = process.env.REACT_APP_L1_SUPERCHAIN_CONFIG_ADDRESS;
      if (!superchainConfigAddress) {
        return;
      }

      try {
        const client = createPublicClient({
          transport: http(process.env.REACT_APP_L1_RPC_URL || DEFAULT_L1_RPC_URL),
        });

        const guardian = await client.readContract({
          address: superchainConfigAddress as `0x${string}`,
          abi: GUARDIAN_ABI,
          functionName: 'guardian',
        });

        setGuardianAddress(guardian as string);
      } catch (error) {
        console.error('Failed to fetch guardian address:', error);
      }
    };

    fetchGuardian();
  }, []);

  const handleTransferOwnership = async (predeploy: typeof L1_CONTRACTS[0]) => {
    if (!isValidAddress(newOwner)) {
      alert('Invalid Ethereum address');
      return;
    }

    setActionInProgress(true);
    try {
      const contractInfo = await getContractInfo(predeploy.address, DEFAULT_L1_RPC_URL);

      if (!contractInfo.owner) {
        alert('Could not retrieve current owner');
        return;
      }

      const PROXY_ADMIN_ADDRESS = '0x4200000000000000000000000000000000000018';
      const isProxyAdminManaged = contractInfo.owner.toLowerCase() === PROXY_ADMIN_ADDRESS.toLowerCase();

      let targetAddress: string;
      let calldata: string;

      if (isProxyAdminManaged && predeploy.name !== 'ProxyAdmin') {
        // For contracts managed by ProxyAdmin, call changeProxyAdmin on ProxyAdmin contract
        targetAddress = PROXY_ADMIN_ADDRESS;
        calldata = generateChangeProxyAdminCalldata(predeploy.address, newOwner);

        // Get the owner of ProxyAdmin contract
        const proxyAdminInfo = await getContractInfo(PROXY_ADMIN_ADDRESS, DEFAULT_L1_RPC_URL);
        if (!proxyAdminInfo.owner) {
          alert('Could not retrieve ProxyAdmin owner');
          return;
        }

        const isEOA = await isOwnerEOA(proxyAdminInfo.owner);

        if (isEOA) {
          if (connectedAddress?.toLowerCase() !== proxyAdminInfo.owner.toLowerCase()) {
            alert('You are not the owner of ProxyAdmin contract');
            return;
          }
          alert('Execute this transaction from your wallet:\n\nTo: ' + targetAddress + '\nData: ' + calldata);
        } else {
          alert(
            'ProxyAdmin is owned by a multisig or contract address.\n\nCalldata for multisig:\n' + calldata +
              '\n\nTarget: ' +
              targetAddress,
          );
        }
      } else {
        // For ProxyAdmin or contracts not managed by ProxyAdmin
        targetAddress = predeploy.address;
        calldata = generateTransferOwnershipCalldata(newOwner);

        const isEOA = await isOwnerEOA(contractInfo.owner);

        if (isEOA) {
          if (connectedAddress?.toLowerCase() !== contractInfo.owner.toLowerCase()) {
            alert('You are not the owner of this contract');
            return;
          }
          alert('Execute this transaction from your wallet:\n\nTo: ' + targetAddress + '\nData: ' + calldata);
        } else {
          alert(
            'This contract is owned by a multisig or contract address.\n\nCalldata for multisig:\n' + calldata +
              '\n\nTarget: ' +
              targetAddress,
          );
        }
      }

      resetForm();
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleWithdraw = async (predeploy: typeof L1_CONTRACTS[0]) => {
    setActionInProgress(true);
    try {
      const contractInfo = await getContractInfo(predeploy.address, DEFAULT_L1_RPC_URL);

      if (!contractInfo.owner) {
        alert('Could not retrieve current owner');
        return;
      }

      const isEOA = await isOwnerEOA(contractInfo.owner);

      if (isEOA) {
        if (connectedAddress?.toLowerCase() !== contractInfo.owner.toLowerCase()) {
          alert('You are not the owner of this contract');
          return;
        }
        // Execute withdraw directly
        const calldata = '0x3ccfd60b'; // withdraw() function selector
        alert('Execute this transaction from your wallet:\n\nTo: ' + predeploy.address + '\nData: ' + calldata);
      } else {
        // Owner is a contract
        const calldata = '0x3ccfd60b';
        alert(
          'This contract is owned by a multisig or contract address.\n\nCalldata for multisig:\n' + calldata +
            '\n\nTarget: ' +
            predeploy.address,
        );
      }

      resetForm();
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUpgrade = async (predeploy: typeof L1_CONTRACTS[0]) => {
    if (!isValidAddress(newImplementation)) {
      alert('Invalid Ethereum address');
      return;
    }

    setActionInProgress(true);
    try {
      const contractInfo = await getContractInfo(predeploy.address, DEFAULT_L1_RPC_URL);

      if (!contractInfo.owner) {
        alert('Could not retrieve current admin');
        return;
      }

      const PROXY_ADMIN_ADDRESS = '0x4200000000000000000000000000000000000018';
      const isProxyAdminManaged = contractInfo.owner.toLowerCase() === PROXY_ADMIN_ADDRESS.toLowerCase();

      let targetAddress: string;
      let calldata: string;

      if (isProxyAdminManaged && predeploy.name !== 'ProxyAdmin') {
        // For contracts managed by ProxyAdmin, call upgrade on ProxyAdmin contract
        targetAddress = PROXY_ADMIN_ADDRESS;
        calldata = generateUpgradeCalldata(predeploy.address, newImplementation);

        // Get the owner of ProxyAdmin contract
        const proxyAdminInfo = await getContractInfo(PROXY_ADMIN_ADDRESS, DEFAULT_L1_RPC_URL);
        if (!proxyAdminInfo.owner) {
          alert('Could not retrieve ProxyAdmin owner');
          return;
        }

        const isEOA = await isOwnerEOA(proxyAdminInfo.owner);

        if (isEOA) {
          if (connectedAddress?.toLowerCase() !== proxyAdminInfo.owner.toLowerCase()) {
            alert('You are not the owner of ProxyAdmin contract');
            return;
          }
          alert('Execute this transaction from your wallet:\n\nTo: ' + targetAddress + '\nData: ' + calldata);
        } else {
          alert(
            'ProxyAdmin is owned by a multisig or contract address.\n\nCalldata for multisig:\n' + calldata +
              '\n\nTarget: ' +
              targetAddress,
          );
        }
      } else {
        alert('This contract is not managed by ProxyAdmin. Direct upgrade not implemented.');
      }

      resetForm();
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActionInProgress(false);
    }
  };

  const resetForm = () => {
    setActionType(null);
    setNewOwner('');
    setNewImplementation('');
    setSelectedContract(null);
  };

  // Check for missing L1 contract addresses
  const missingAddresses = L1_CONTRACTS.filter(c => !c.address || c.address === '');
  const hasMissingAddresses = missingAddresses.length > 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>L1 Contracts Management</h1>
        <p>Query and manage L1 contracts</p>
      </div>

      {hasMissingAddresses && (
        <div className="warning-banner" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }}>
          ⚠️ Some L1 contract addresses are not configured ({missingAddresses.length}/{L1_CONTRACTS.length}).
          Please set the corresponding environment variables in .env file to enable full functionality.
          Missing: {missingAddresses.map(c => c.name).join(', ')}
        </div>
      )}

      {!isConnected && (
        <div className="warning-banner">
          ⚠️ Wallet not connected. Connect your wallet to manage contracts.
        </div>
      )}

      <div className="controls-section">
        <div className="control-group">
          <label htmlFor="category-filter">Filter by Category</label>
          <select
            id="category-filter"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as FilterCategory)}
          >
            <option value="all">All Categories</option>
            <option value="bridge">Bridge & Messaging</option>
            <option value="vault">Fee Vaults</option>
            <option value="factory">Factories (omitted)</option>
            <option value="system">System</option>
            <option value="governance">Governance & Attestation (omitted)</option>
            <option value="tee">TEE</option>
          </select>
        </div>

        <div className="control-group checkbox">
          <input
            id="manageable-filter"
            type="checkbox"
            checked={showOnlyManageable}
            onChange={e => setShowOnlyManageable(e.target.checked)}
          />
          <label htmlFor="manageable-filter">Show only manageable contracts</label>
        </div>
      </div>

      <div className="count-badge">{filtered.length} contracts</div>

      <div className="predeploys-grid">
        {filtered.map(predeploy => (
          <ContractCard
            key={predeploy.address}
            predeploy={predeploy}
            isSelected={selectedContract === predeploy.address}
            onSelect={() => setSelectedContract(predeploy.address)}
            onTransferClick={() => {
              setSelectedContract(predeploy.address);
              setActionType('transfer');
            }}
            onWithdrawClick={() => {
              setSelectedContract(predeploy.address);
              setActionType('withdraw');
            }}
            onUpgradeClick={() => {
              setSelectedContract(predeploy.address);
              setActionType('upgrade');
            }}
            connectedAddress={connectedAddress}
            rpcUrl={DEFAULT_L1_RPC_URL}
          />
        ))}
      </div>

      <OwnershipGraph
        contracts={L1_CONTRACTS}
        rpcUrl={process.env.REACT_APP_L1_RPC_URL || DEFAULT_L1_RPC_URL}
      />

      <PauseFlowGraph
        guardianAddress={guardianAddress}
        superchainConfigAddress={process.env.REACT_APP_L1_SUPERCHAIN_CONFIG_ADDRESS || ''}
        systemConfigAddress={process.env.REACT_APP_L1_SYSTEM_CONFIG_ADDRESS || ''}
        optimismPortalAddress={process.env.REACT_APP_L1_OPTIMISM_PORTAL_ADDRESS || ''}
        l1StandardBridgeAddress={process.env.REACT_APP_L1_STANDARD_BRIDGE_ADDRESS || ''}
      />

      {selectedContract && actionType && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {actionType === 'transfer'
                  ? ((L1_CONTRACTS.find(p => p.address === selectedContract)?.name === 'ProxyAdmin' || L1_CONTRACTS.find(p => p.address === selectedContract)?.name === 'ProverRegistry' || L1_CONTRACTS.find(p => p.address === selectedContract)?.name === 'WorkloadVerifier') ? 'Transfer Owner' : 'Transfer Admin')
                  : actionType === 'upgrade' ? 'Upgrade Implementation' : 'Withdraw Funds'}
              </h2>
              <button className="close-btn" onClick={resetForm}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {actionType === 'transfer' && (
                <>
                  <div className="form-group">
                    <label htmlFor="new-owner">
                      {(L1_CONTRACTS.find(p => p.address === selectedContract)?.name === 'ProxyAdmin' || L1_CONTRACTS.find(p => p.address === selectedContract)?.name === 'ProverRegistry' || L1_CONTRACTS.find(p => p.address === selectedContract)?.name === 'WorkloadVerifier') ? 'New Owner Address' : 'New Admin Address'}
                    </label>
                    <input
                      id="new-owner"
                      type="text"
                      placeholder="0x..."
                      value={newOwner}
                      onChange={e => setNewOwner(e.target.value)}
                      disabled={actionInProgress}
                    />
                  </div>
                </>
              )}

              {actionType === 'upgrade' && (
                <>
                  <div className="form-group">
                    <label htmlFor="new-implementation">New Implementation Address</label>
                    <input
                      id="new-implementation"
                      type="text"
                      placeholder="0x..."
                      value={newImplementation}
                      onChange={e => setNewImplementation(e.target.value)}
                      disabled={actionInProgress}
                    />
                  </div>
                </>
              )}

              {actionType === 'withdraw' && (
                <div className="confirmation-message">
                  <p>
                    Are you sure you want to withdraw all funds from{' '}
                    <strong>{L1_CONTRACTS.find(p => p.address === selectedContract)?.name}</strong>?
                  </p>
                  <p className="text-muted">This action will call the withdraw() function on the contract.</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={resetForm} disabled={actionInProgress}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const predeploy = L1_CONTRACTS.find(p => p.address === selectedContract);
                  if (predeploy) {
                    if (actionType === 'transfer') {
                      handleTransferOwnership(predeploy);
                    } else if (actionType === 'upgrade') {
                      handleUpgrade(predeploy);
                    } else {
                      handleWithdraw(predeploy);
                    }
                  }
                }}
                disabled={actionInProgress || (actionType === 'transfer' && !newOwner) || (actionType === 'upgrade' && !newImplementation)}
              >
                {actionInProgress ? 'Processing...' : actionType === 'transfer' ? 'Transfer' : actionType === 'upgrade' ? 'Upgrade' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function isOwnerEOA(ownerAddress: string): Promise<boolean> {
  // For now, assume EOA if not a known multisig pattern
  // In production, you'd check if the address has code
  const multisigPatterns = [
    'gnosis', // Gnosis Safe pattern
    'multisig', // Generic multisig
  ];

  const isKnownContract = multisigPatterns.some(pattern =>
    ownerAddress.toLowerCase().includes(pattern.toLowerCase()),
  );

  return !isKnownContract;
}
