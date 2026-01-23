import type { Predeploy } from '../types';

export const PREDEPLOYS: Predeploy[] = [
  // Core Bridge & Messaging
  {
    name: 'L2CrossDomainMessenger',
    address: '0x4200000000000000000000000000000000000007',
    description: 'Higher level API for sending cross domain messages between L1 and L2',
    category: 'bridge',
    isManageable: true,
    viewFunctions: [
      { name: 'version', label: 'Version' },
      { name: 'otherMessenger', label: 'Other Messenger' },
    ],
  },
  {
    name: 'L2StandardBridge',
    address: '0x4200000000000000000000000000000000000010',
    description: 'Facilitates ETH and token transfers across domains',
    category: 'bridge',
    isManageable: true,
    viewFunctions: [
      { name: 'version', label: 'Version' },
      { name: 'otherBridge', label: 'Other Bridge' },
      { name: 'messenger', label: 'Messenger' },
      { name: 'signalService', label: 'Signal Service' },
    ],
  },
  {
    name: 'L2ERC721Bridge',
    address: '0x4200000000000000000000000000000000000014',
    description: 'Manages NFT (ERC721) bridge transfers across domains',
    category: 'bridge',
    isManageable: true,
    viewFunctions: [
      { name: 'messenger', label: 'Messenger' },
      { name: 'otherBridge', label: 'Other Bridge' },
    ],
  },

  // Fee Vaults
  {
    name: 'SequencerFeeVault',
    address: '0x4200000000000000000000000000000000000011',
    description: 'Accumulates transaction priority fees from the sequencer',
    category: 'vault',
    isManageable: true,
    viewFunctions: [
      { name: 'version', label: 'Version' },
      { name: 'minWithdrawalAmount', label: 'Min Withdrawal Amount' },
      { name: 'recipient', label: 'Recipient' },
      { name: 'totalProcessed', label: 'Total Processed' },
      { name: 'withdrawalNetwork', label: 'Withdrawal Network' },
    ],
  },
  {
    name: 'BaseFeeVault',
    address: '0x4200000000000000000000000000000000000019',
    description: 'Accumulates L2 base fees',
    category: 'vault',
    isManageable: true,
    viewFunctions: [
      { name: 'version', label: 'Version' },
      { name: 'minWithdrawalAmount', label: 'Min Withdrawal Amount' },
      { name: 'recipient', label: 'Recipient' },
      { name: 'totalProcessed', label: 'Total Processed' },
      { name: 'withdrawalNetwork', label: 'Withdrawal Network' },
    ],
  },
  {
    name: 'L1FeeVault',
    address: '0x420000000000000000000000000000000000001a',
    description: 'Accumulates L1 transaction fee portions',
    category: 'vault',
    isManageable: true,
    viewFunctions: [
      { name: 'version', label: 'Version' },
      { name: 'minWithdrawalAmount', label: 'Min Withdrawal Amount' },
      { name: 'recipient', label: 'Recipient' },
      { name: 'totalProcessed', label: 'Total Processed' },
      { name: 'withdrawalNetwork', label: 'Withdrawal Network' },
    ],
  },
  {
    name: 'OperatorFeeVault',
    address: '0x420000000000000000000000000000000000001B',
    description: 'Collects operator-specific fees',
    category: 'vault',
    isManageable: true,
    viewFunctions: [
      { name: 'version', label: 'Version' },
      { name: 'minWithdrawalAmount', label: 'Min Withdrawal Amount' },
      { name: 'recipient', label: 'Recipient' },
      { name: 'totalProcessed', label: 'Total Processed' },
      { name: 'withdrawalNetwork', label: 'Withdrawal Network' },
    ],
  },
  {
    name: 'UniFiFeeVault',
    address: '0x420000000000000000000000000000000000002a',
    description: 'Distributes fees between L2 Owner and UniFi Reward Distributor',
    category: 'vault',
    isManageable: true,
    viewFunctions: [
      { name: 'l2Owner', label: 'L2 Owner' },
      { name: 'withdrawalNetworkL2Owner', label: 'Withdrawal Network L2 Owner' },
      { name: 'percentageL2Owner', label: 'Percentage L2 Owner' },
      { name: 'l1UniFiRewardDistributorContract', label: 'L1 UniFi Reward Distributor' },
      { name: 'minWithdrawalAmount', label: 'Min Withdrawal Amount' },
      { name: 'totalProcessed', label: 'Total Processed' },
    ],
  },

  // System Contracts
  {
    name: 'WETH9',
    address: '0x4200000000000000000000000000000000000006',
    description: 'Standard Wrapped Ether implementation',
    category: 'system',
    isManageable: false,
    viewFunctions: [
      { name: 'totalSupply', label: 'Total Supply' },
    ],
  },
  {
    name: 'L1Block',
    address: '0x4200000000000000000000000000000000000015',
    description: 'Maintains L1 context accessible on L2',
    category: 'system',
    isManageable: true,
    viewFunctions: [
      { name: 'version', label: 'Version' },
      { name: 'number', label: 'Number' },
      { name: 'timestamp', label: 'Timestamp' },
      { name: 'hash', label: 'Hash' },
      { name: 'sequenceNumber', label: 'Sequence Number' },
      { name: 'batcherHash', label: 'Batcher Hash' },
      { name: 'operatorFeeConstant', label: 'Operator Fee Constant' },
      { name: 'operatorFeeScalar', label: 'Operator Fee Scalar' },
      { name: 'DEPOSITOR_ACCOUNT', label: 'Depositor Account' },
    ],
  },
  {
    name: 'ProxyAdmin',
    address: '0x4200000000000000000000000000000000000018',
    description: 'Owner of all predeploy proxies',
    category: 'system',
    isManageable: true,
    isOwnerBased: true, // Has owner() but is not a proxy contract
  },
  {
    name: 'SignalService',
    address: process.env.REACT_APP_L2_SIGNAL_SERVICE_ADDRESS || '',
    description: 'Signal service for cross-chain communication',
    category: 'system',
    isManageable: false,
    viewFunctions: [
      { name: 'L1_SIGNAL_SERVICE', label: 'L1 Signal Service' },
    ],
  },
];
