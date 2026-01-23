import { useState, useEffect } from 'react';
import { useAccount, useSendTransaction, useWaitForTransaction } from 'wagmi';
import { PREDEPLOYS } from '../config/predeploys';
import { getContractInfo, generateTransferOwnershipCalldata, generateChangeProxyAdminCalldata, generateUpgradeCalldata, isValidAddress } from '../utils/contracts';
import ContractCard from '../components/ContractCard';
import { OwnershipGraph } from '../components/OwnershipGraph';
import TransactionSuccessModal from '../components/TransactionSuccessModal';
import './Predeploys.css';

type FilterCategory = 'all' | 'bridge' | 'vault' | 'factory' | 'system' | 'governance' | 'tee';

export default function PredeploysPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const { sendTransaction, data: txHash, error: txError, isError: isTxError } = useSendTransaction();

  // Extract hash string from txHash object
  const hashString = txHash?.hash || (typeof txHash === 'string' ? txHash : undefined);

  const { isLoading: isTxLoading, error: txWaitError } = useWaitForTransaction({
    hash: hashString as `0x${string}` | undefined,
  });
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [showOnlyManageable, setShowOnlyManageable] = useState(false);
  const [selectedPredeploy, setSelectedPredeploy] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'transfer' | 'withdraw' | 'upgrade' | null>(null);
  const [newOwner, setNewOwner] = useState('');
  const [newImplementation, setNewImplementation] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string>('');
  const [successContractName, setSuccessContractName] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [processedHashes, setProcessedHashes] = useState<Set<string>>(new Set());

  // Handle transaction submitted (show modal when we get the hash)
  useEffect(() => {
    // Show success modal as soon as we have a transaction hash
    // (transaction was submitted to network)
    // Only show it once per hash
    if (hashString && !processedHashes.has(hashString)) {
      setSuccessTxHash(hashString);
      setShowSuccessModal(true);
      setActionInProgress(false);
      // Mark this hash as processed
      setProcessedHashes(prev => new Set(prev).add(hashString));
      // Refresh contract data after a delay (give time for tx to be mined)
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 3000);
    }
  }, [hashString, processedHashes]);

  // Handle transaction errors
  useEffect(() => {
    if (isTxError && txError) {
      alert('Transaction failed: ' + (txError as any)?.message || 'Unknown error');
      setActionInProgress(false);
    }
  }, [isTxError, txError]);

  // Handle wait for transaction errors
  useEffect(() => {
    if (txWaitError) {
      alert('Transaction confirmation error: ' + (txWaitError as any)?.message || 'Unknown error');
      setActionInProgress(false);
    }
  }, [txWaitError]);

  // Show loading state while transaction is being sent
  useEffect(() => {
    if (isTxLoading) {
      setActionInProgress(true);
    }
  }, [isTxLoading]);

  const filtered = PREDEPLOYS.filter(p => {
    const categoryMatch = filterCategory === 'all' || p.category === filterCategory;
    const manageableMatch = !showOnlyManageable || p.isManageable;
    return categoryMatch && manageableMatch;
  });

  const handleTransferOwnership = async (predeploy: typeof PREDEPLOYS[0]) => {
    if (!isValidAddress(newOwner)) {
      alert('Invalid Ethereum address');
      return;
    }

    setActionInProgress(true);
    try {
      const contractInfo = await getContractInfo(predeploy.address);

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
        const proxyAdminInfo = await getContractInfo(PROXY_ADMIN_ADDRESS);
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

  const handleWithdraw = async (predeploy: typeof PREDEPLOYS[0]) => {
    if (!connectedAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setActionInProgress(true);
    setSuccessContractName(predeploy.name);
    try {
      // Fee vaults have permissionless withdraw - anyone can call it
      // Funds go to the configured recipient address, not the caller
      const calldata = '0x3ccfd60b'; // withdraw() function selector

      sendTransaction({
        to: predeploy.address as `0x${string}`,
        data: calldata as `0x${string}`,
      });

      resetForm();
    } catch (error) {
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setActionInProgress(false);
    }
  };

  const handleUpgrade = async (predeploy: typeof PREDEPLOYS[0]) => {
    if (!isValidAddress(newImplementation)) {
      alert('Invalid Ethereum address');
      return;
    }

    setActionInProgress(true);
    try {
      const contractInfo = await getContractInfo(predeploy.address);

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
        const proxyAdminInfo = await getContractInfo(PROXY_ADMIN_ADDRESS);
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
    setSelectedPredeploy(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Predeploys Management</h1>
        <p>Query and manage OP Stack predeploy contracts</p>
      </div>

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
            key={`${predeploy.address}-${refreshKey}`}
            predeploy={predeploy}
            isSelected={selectedPredeploy === predeploy.address}
            onSelect={() => setSelectedPredeploy(predeploy.address)}
            onTransferClick={() => {
              setSelectedPredeploy(predeploy.address);
              setActionType('transfer');
            }}
            onWithdrawClick={() => {
              setSelectedPredeploy(predeploy.address);
              setActionType('withdraw');
            }}
            onUpgradeClick={() => {
              setSelectedPredeploy(predeploy.address);
              setActionType('upgrade');
            }}
            connectedAddress={connectedAddress}
          />
        ))}
      </div>

      <OwnershipGraph
        contracts={PREDEPLOYS}
        rpcUrl={process.env.REACT_APP_L2_RPC_URL || ''}
      />

      {selectedPredeploy && actionType && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {actionType === 'transfer'
                  ? ((PREDEPLOYS.find(p => p.address === selectedPredeploy)?.name === 'ProxyAdmin' || PREDEPLOYS.find(p => p.address === selectedPredeploy)?.name === 'ProverRegistry' || PREDEPLOYS.find(p => p.address === selectedPredeploy)?.name === 'WorkloadVerifier') ? 'Transfer Owner' : 'Transfer Admin')
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
                      {(PREDEPLOYS.find(p => p.address === selectedPredeploy)?.name === 'ProxyAdmin' || PREDEPLOYS.find(p => p.address === selectedPredeploy)?.name === 'ProverRegistry' || PREDEPLOYS.find(p => p.address === selectedPredeploy)?.name === 'WorkloadVerifier') ? 'New Owner Address' : 'New Admin Address'}
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
                    <strong>{PREDEPLOYS.find(p => p.address === selectedPredeploy)?.name}</strong>?
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
                  const predeploy = PREDEPLOYS.find(p => p.address === selectedPredeploy);
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

      {showSuccessModal && successTxHash && (
        <TransactionSuccessModal
          txHash={successTxHash}
          explorerUrl={process.env.REACT_APP_L2_EXPLORER_URL || 'https://testnet-unifi-explorer.puffer.fi'}
          contractName={successContractName}
          onClose={() => setShowSuccessModal(false)}
        />
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
