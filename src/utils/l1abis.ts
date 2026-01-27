import type { Abi } from 'viem';

// ABI for AnchorStateRegistry contract
export const ANCHOR_STATE_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'disputeGameFinalityDelaySeconds',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'systemConfig',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'disputeGameFactory',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'anchorGame',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'respectedGameType',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'retirementTimestamp',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getAnchorRoot',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'root', type: 'bytes32' },
      { name: 'l2SequenceNumber', type: 'uint256' },
    ],
  },
] as const satisfies Abi;

// ABI for DisputeGameFactory contract
export const DISPUTE_GAME_FACTORY_ABI = [
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'portalAddress',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'proverRegistryAddress',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'getBlockNumber',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'getCurrentOffset',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'gameCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'gameImpls',
    stateMutability: 'view',
    inputs: [{ name: 'gameType', type: 'uint32' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'initBonds',
    stateMutability: 'view',
    inputs: [{ name: 'gameType', type: 'uint32' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'BlockProcessed',
    inputs: [
      { name: 'blockNumber', type: 'uint64', indexed: true },
      { name: 'offset', type: 'uint64', indexed: false },
      { name: 'withdrawalCount', type: 'uint256', indexed: false },
    ],
  },
] as const satisfies Abi;

// ABI for L1StandardBridge contract (uses L1ChugSplashProxy)
export const L1_STANDARD_BRIDGE_ABI = [
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'signalService',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'systemConfig',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  // L1ChugSplashProxy functions (must be called with from: address(0))
  {
    type: 'function',
    name: 'getOwner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'getImplementation',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const satisfies Abi;

// ABI for OptimismPortal contract
export const OPTIMISM_PORTAL_ABI = [
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'proofMaturityDelaySeconds',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'systemConfig',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'anchorStateRegistry',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'disputeGameFactory',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const satisfies Abi;

// ABI for SystemConfig contract
export const SYSTEM_CONFIG_ABI = [
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'guardian',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'superchainConfig',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'batcherHash',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'gasLimit',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'basefeeScalar',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'blobbasefeeScalar',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'eip1559Denominator',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'eip1559Elasticity',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'operatorFeeScalar',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'operatorFeeConstant',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'l2ChainId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'unsafeBlockSigner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'l1CrossDomainMessenger',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'l1StandardBridge',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'disputeGameFactory',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'optimismPortal',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'batchInbox',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'startBlock',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'resourceConfig',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'maxResourceLimit', type: 'uint32' },
          { name: 'elasticityMultiplier', type: 'uint8' },
          { name: 'baseFeeMaxChangeDenominator', type: 'uint8' },
          { name: 'minimumBaseFee', type: 'uint32' },
          { name: 'systemTxMaxGas', type: 'uint32' },
          { name: 'maximumBaseFee', type: 'uint128' },
        ],
      },
    ],
  },
] as const satisfies Abi;

// ABI for SuperchainConfig contract
export const SUPERCHAIN_CONFIG_ABI = [
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'guardian',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'pauseExpiry',
    stateMutability: 'pure',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [{ name: '_identifier', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'expiration',
    stateMutability: 'view',
    inputs: [{ name: '_identifier', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const satisfies Abi;

// ABI for ProverRegistry contract
export const PROVER_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'chainID',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'verifier',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'requiredProverTypes',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bytes' }],
  },
  {
    type: 'function',
    name: 'attestValiditySeconds',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'maxBlockNumberDiff',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'nextInstanceId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'attestedProvers',
    stateMutability: 'view',
    inputs: [{ name: 'instanceId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'addr', type: 'address' },
          { name: 'validUntil', type: 'uint64' },
          {
            name: 'ty',
            type: 'tuple',
            components: [
              { name: 'teeType', type: 'uint8' },
              { name: 'elType', type: 'uint8' },
            ],
          },
          { name: 'goldenMeasurementHash', type: 'bytes32' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'goldenMeasurementRegistry',
    stateMutability: 'view',
    inputs: [{ type: 'bytes32' }],
    outputs: [
      { type: 'uint8' },
      { type: 'uint8' },
      { type: 'uint8' },
      { type: 'string' },
    ],
  },
] as const satisfies Abi;

// ABI for WorkloadVerifier contract
export const WORKLOAD_VERIFIER_ABI = [
  {
    type: 'function',
    name: 'dcapAttestation',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'snpAttestation',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'tpmAttestation',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const satisfies Abi;

// ABI for ProxyAdmin contract
export const PROXY_ADMIN_ABI = [
  {
    type: 'function',
    name: 'changeProxyAdmin',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proxy', type: 'address' },
      { name: 'newAdmin', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'upgrade',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proxy', type: 'address' },
      { name: 'implementation', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const satisfies Abi;

// Contract address to ABI mapping
// Dynamically built from environment variables to support different OP Stack chains
const buildL1ContractABIs = (): Record<string, Abi> => {
  const mapping: Record<string, Abi> = {};

  // Add each contract if address is configured
  const anchorStateRegistry = process.env.REACT_APP_L1_ANCHOR_STATE_REGISTRY_ADDRESS;
  if (anchorStateRegistry) {
    mapping[anchorStateRegistry.toLowerCase()] = ANCHOR_STATE_REGISTRY_ABI;
  }

  const disputeGameFactory = process.env.REACT_APP_L1_DISPUTE_GAME_FACTORY_ADDRESS;
  if (disputeGameFactory) {
    mapping[disputeGameFactory.toLowerCase()] = DISPUTE_GAME_FACTORY_ABI;
  }

  const l1StandardBridge = process.env.REACT_APP_L1_STANDARD_BRIDGE_ADDRESS;
  if (l1StandardBridge) {
    mapping[l1StandardBridge.toLowerCase()] = L1_STANDARD_BRIDGE_ABI;
  }

  const optimismPortal = process.env.REACT_APP_L1_OPTIMISM_PORTAL_ADDRESS;
  if (optimismPortal) {
    mapping[optimismPortal.toLowerCase()] = OPTIMISM_PORTAL_ABI;
  }

  const proxyAdmin = process.env.REACT_APP_L1_PROXY_ADMIN_ADDRESS;
  if (proxyAdmin) {
    mapping[proxyAdmin.toLowerCase()] = PROXY_ADMIN_ABI;
  }

  const systemConfig = process.env.REACT_APP_L1_SYSTEM_CONFIG_ADDRESS;
  if (systemConfig) {
    mapping[systemConfig.toLowerCase()] = SYSTEM_CONFIG_ABI;
  }

  const superchainConfig = process.env.REACT_APP_L1_SUPERCHAIN_CONFIG_ADDRESS;
  if (superchainConfig) {
    mapping[superchainConfig.toLowerCase()] = SUPERCHAIN_CONFIG_ABI;
  }

  const proverRegistry = process.env.REACT_APP_L1_PROVER_REGISTRY_ADDRESS;
  if (proverRegistry) {
    mapping[proverRegistry.toLowerCase()] = PROVER_REGISTRY_ABI;
  }

  const workloadVerifier = process.env.REACT_APP_L1_WORKLOAD_VERIFIER_ADDRESS;
  if (workloadVerifier) {
    mapping[workloadVerifier.toLowerCase()] = WORKLOAD_VERIFIER_ABI;
  }

  return mapping;
};

export const L1_CONTRACT_ABIS: Record<string, Abi> = buildL1ContractABIs();
