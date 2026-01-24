import { createPublicClient, http, type Abi } from 'viem';
import { L1_CONTRACT_ABIS, L1_STANDARD_BRIDGE_ABI } from './l1abis';

// RPC URLs from environment variables
if (!process.env.REACT_APP_L1_RPC_URL) {
  throw new Error('REACT_APP_L1_RPC_URL is not set. Please create a .env file with REACT_APP_L1_RPC_URL configured.');
}
if (!process.env.REACT_APP_L2_RPC_URL) {
  throw new Error('REACT_APP_L2_RPC_URL is not set. Please create a .env file with REACT_APP_L2_RPC_URL configured.');
}
export const DEFAULT_L1_RPC_URL = process.env.REACT_APP_L1_RPC_URL;
export const DEFAULT_L2_RPC_URL = process.env.REACT_APP_L2_RPC_URL;

// ABI for Proxy contracts (to get admin)
export const PROXY_ABI = [
  {
    type: 'function',
    name: 'admin',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address', name: '' }],
  },
  {
    type: 'function',
    name: 'implementation',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address', name: '' }],
  },
  {
    type: 'function',
    name: 'changeAdmin',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_admin', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'upgradeTo',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_implementation', type: 'address' }],
    outputs: [],
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

// ABI for SignalService contract (L2)
export const SIGNAL_SERVICE_ABI = [
  {
    type: 'function',
    name: 'L1_SIGNAL_SERVICE',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const satisfies Abi;

// Simple ABI for owner-based contracts
export const OWNABLE_ABI = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'address',
      },
    ],
  },
  {
    type: 'function',
    name: 'transferOwnership',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'newOwner',
        type: 'address',
      },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
      },
    ],
  },
] as const satisfies Abi;

// ABI for vault contracts that have owner and withdraw
export const VAULT_ABI = [
  ...OWNABLE_ABI,
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdrawAll',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const satisfies Abi;

// ABI for L2CrossDomainMessenger
export const L2_CROSS_DOMAIN_MESSENGER_ABI = [
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'otherMessenger',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const satisfies Abi;

// ABI for L2StandardBridge
export const L2_STANDARD_BRIDGE_ABI = [
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'otherBridge',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'messenger',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'signalService',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const satisfies Abi;

// ABI for L2ERC721Bridge
export const L2_ERC721_BRIDGE_ABI = [
  {
    type: 'function',
    name: 'messenger',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'otherBridge',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const satisfies Abi;

// ABI for Fee Vault contracts with extended view functions
export const FEE_VAULT_EXTENDED_ABI = [
  ...VAULT_ABI,
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'minWithdrawalAmount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'recipient',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'totalProcessed',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'withdrawalNetwork',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const satisfies Abi;

// ABI for UniFiFeeVault
export const UNIFI_FEE_VAULT_ABI = [
  ...VAULT_ABI,
  {
    type: 'function',
    name: 'l2Owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'withdrawalNetworkL2Owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'percentageL2Owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'l1UniFiRewardDistributorContract',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'minWithdrawalAmount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalProcessed',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const satisfies Abi;

// ABI for WETH9
export const WETH9_ABI = [
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const satisfies Abi;

// ABI for L1Block
export const L1_BLOCK_ABI = [
  {
    type: 'function',
    name: 'version',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'number',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'timestamp',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'hash',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'sequenceNumber',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint64' }],
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
    name: 'operatorFeeConstant',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint128' }],
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
    name: 'DEPOSITOR_ACCOUNT',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const satisfies Abi;

export interface ContractInfo {
  address: string;
  owner: string | null;
  balance: bigint | null;
  implementation: string | null;
  error: string | null;
}

export async function getContractOwner(
  address: string,
  rpcUrl: string = DEFAULT_L2_RPC_URL,
): Promise<string | null> {
  const client = createPublicClient({
    transport: http(rpcUrl),
  });

  const lowerAddress = address.toLowerCase();

  // L1ChugSplashProxy contracts (like L1StandardBridge) use getOwner() with from: address(0)
  const l1StandardBridgeAddress = process.env.REACT_APP_L1_STANDARD_BRIDGE_ADDRESS?.toLowerCase();
  const isL1ChugSplashProxy = l1StandardBridgeAddress && lowerAddress === l1StandardBridgeAddress;

  if (isL1ChugSplashProxy) {
    try {
      const owner = await client.readContract({
        address: address as `0x${string}`,
        abi: L1_STANDARD_BRIDGE_ABI,
        functionName: 'getOwner',
        account: '0x0000000000000000000000000000000000000000',
      });
      return owner as string;
    } catch {
      return null;
    }
  }

  // ProxyAdmin contract uses owner() not admin()
  const isProxyAdmin = lowerAddress === '0x4200000000000000000000000000000000000018';

  if (isProxyAdmin) {
    try {
      const owner = await client.readContract({
        address: address as `0x${string}`,
        abi: OWNABLE_ABI,
        functionName: 'owner',
      });
      return owner as string;
    } catch {
      return null;
    }
  }

  // For other contracts, first try to get proxy admin (for upgradeable contracts)
  try {
    const admin = await client.readContract({
      address: address as `0x${string}`,
      abi: PROXY_ABI,
      functionName: 'admin',
    });
    return admin as string;
  } catch {
    // If not a proxy, try getting owner from implementation
    try {
      const owner = await client.readContract({
        address: address as `0x${string}`,
        abi: OWNABLE_ABI,
        functionName: 'owner',
      });
      return owner as string;
    } catch {
      return null;
    }
  }
}

export async function getImplementation(
  address: string,
  rpcUrl: string = DEFAULT_L2_RPC_URL,
): Promise<string | null> {
  const client = createPublicClient({
    transport: http(rpcUrl),
  });

  const lowerAddress = address.toLowerCase();

  // L1ChugSplashProxy contracts (like L1StandardBridge) use getImplementation() with from: address(0)
  const l1StandardBridgeAddress = process.env.REACT_APP_L1_STANDARD_BRIDGE_ADDRESS?.toLowerCase();
  const isL1ChugSplashProxy = l1StandardBridgeAddress && lowerAddress === l1StandardBridgeAddress;

  if (isL1ChugSplashProxy) {
    try {
      const implementation = await client.readContract({
        address: address as `0x${string}`,
        abi: L1_STANDARD_BRIDGE_ABI,
        functionName: 'getImplementation',
        account: '0x0000000000000000000000000000000000000000',
      });
      return implementation as string;
    } catch {
      return null;
    }
  }

  try {
    const implementation = await client.readContract({
      address: address as `0x${string}`,
      abi: PROXY_ABI,
      functionName: 'implementation',
    });
    return implementation as string;
  } catch {
    return null;
  }
}

export async function getBalance(
  address: string,
  rpcUrl: string = DEFAULT_L2_RPC_URL,
): Promise<bigint | null> {
  const client = createPublicClient({
    transport: http(rpcUrl),
  });

  try {
    const balance = await client.getBalance({
      address: address as `0x${string}`,
    });
    return balance;
  } catch {
    return null;
  }
}

export async function getContractInfo(
  address: string,
  rpcUrl?: string,
): Promise<ContractInfo> {
  const result: ContractInfo = {
    address,
    owner: null,
    balance: null,
    implementation: null,
    error: null,
  };

  try {
    const owner = await getContractOwner(address, rpcUrl);
    result.owner = owner;

    const balance = await getBalance(address, rpcUrl);
    result.balance = balance;

    const implementation = await getImplementation(address, rpcUrl);
    result.implementation = implementation;
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Unknown error';
  }

  return result;
}

export function generateTransferOwnershipCalldata(newOwner: string): string {
  // Encode the transferOwnership function call
  // Function selector: keccak256("transferOwnership(address)")
  const functionSelector = '0xa6f9dae1'; // Pre-calculated selector
  // Remove 0x prefix from newOwner if present and pad to 32 bytes
  const paddedAddress = newOwner.replace('0x', '').padStart(64, '0');
  return functionSelector + paddedAddress;
}

export function generateChangeProxyAdminCalldata(proxyAddress: string, newAdmin: string): string {
  // Encode the changeProxyAdmin function call
  // Function selector: keccak256("changeProxyAdmin(address,address)")
  const functionSelector = '0x7eff275e'; // Pre-calculated selector
  // Remove 0x prefix and pad both addresses to 32 bytes
  const paddedProxy = proxyAddress.replace('0x', '').padStart(64, '0');
  const paddedNewAdmin = newAdmin.replace('0x', '').padStart(64, '0');
  return functionSelector + paddedProxy + paddedNewAdmin;
}

export function generateUpgradeCalldata(proxyAddress: string, newImplementation: string): string {
  // Encode the upgrade function call
  // Function selector: keccak256("upgrade(address,address)")
  const functionSelector = '0x99a88ec4'; // Pre-calculated selector
  // Remove 0x prefix and pad both addresses to 32 bytes
  const paddedProxy = proxyAddress.replace('0x', '').padStart(64, '0');
  const paddedImpl = newImplementation.replace('0x', '').padStart(64, '0');
  return functionSelector + paddedProxy + paddedImpl;
}

export function generateWithdrawCalldata(): string {
  // Encode the withdraw function call
  // Function selector: keccak256("withdraw()") = 0x3ccfd60b
  return '0x3ccfd60b';
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isEOA(_address: string): boolean {
  // In a real scenario, you would check if the address is an EOA by verifying
  // if it has any code associated with it. For now, we assume it's EOA if no code.
  // This is a placeholder - actual implementation would require RPC call.
  return true; // Default assumption for now
}

// Get ABI based on contract address
function getAbiForContract(address: string): Abi | null {
  const lowerAddress = address.toLowerCase();

  // Check L1 contracts first
  if (L1_CONTRACT_ABIS[lowerAddress]) {
    return L1_CONTRACT_ABIS[lowerAddress];
  }

  // L2CrossDomainMessenger
  if (lowerAddress === '0x4200000000000000000000000000000000000007') {
    return L2_CROSS_DOMAIN_MESSENGER_ABI;
  }

  // L2StandardBridge
  if (lowerAddress === '0x4200000000000000000000000000000000000010') {
    return L2_STANDARD_BRIDGE_ABI;
  }

  // L2ERC721Bridge
  if (lowerAddress === '0x4200000000000000000000000000000000000014') {
    return L2_ERC721_BRIDGE_ABI;
  }

  // UniFiFeeVault (special vault with different functions)
  if (lowerAddress === '0x420000000000000000000000000000000000002a') {
    return UNIFI_FEE_VAULT_ABI;
  }

  // Fee Vaults (with extended view functions)
  if (
    lowerAddress === '0x4200000000000000000000000000000000000011' || // SequencerFeeVault
    lowerAddress === '0x4200000000000000000000000000000000000019' || // BaseFeeVault
    lowerAddress === '0x420000000000000000000000000000000000001a' || // L1FeeVault
    lowerAddress === '0x420000000000000000000000000000000000001b'    // OperatorFeeVault
  ) {
    return FEE_VAULT_EXTENDED_ABI;
  }

  // WETH9
  if (lowerAddress === '0x4200000000000000000000000000000000000006') {
    return WETH9_ABI;
  }

  // L1Block
  if (lowerAddress === '0x4200000000000000000000000000000000000015') {
    return L1_BLOCK_ABI;
  }

  // SignalService (L2)
  const l2SignalServiceAddress = process.env.REACT_APP_L2_SIGNAL_SERVICE_ADDRESS?.toLowerCase();
  if (l2SignalServiceAddress && lowerAddress === l2SignalServiceAddress) {
    return SIGNAL_SERVICE_ABI;
  }

  return null;
}

// Fetch view function data for contracts
export async function getViewFunctionData(
  address: string,
  functionNames: string[],
  rpcUrl: string = DEFAULT_L2_RPC_URL,
): Promise<Record<string, any>> {
  const client = createPublicClient({
    transport: http(rpcUrl),
  });

  const abi = getAbiForContract(address);
  if (!abi) {
    return {};
  }

  const results: Record<string, any> = {};

  // Check if we need to query resourceConfig
  const needsResourceConfig = functionNames.some(fn => fn.startsWith('resourceConfig_'));
  if (needsResourceConfig) {
    try {
      const result = await client.readContract({
        address: address as `0x${string}`,
        abi,
        functionName: 'resourceConfig',
      });

      // Expand resourceConfig into individual components
      if (typeof result === 'object' && result !== null) {
        const config = result as any;
        if ('maxResourceLimit' in config) {
          results['resourceConfig_maxResourceLimit'] = config.maxResourceLimit;
          results['resourceConfig_elasticityMultiplier'] = config.elasticityMultiplier;
          results['resourceConfig_baseFeeMaxChangeDenominator'] = config.baseFeeMaxChangeDenominator;
          results['resourceConfig_minimumBaseFee'] = config.minimumBaseFee;
          results['resourceConfig_systemTxMaxGas'] = config.systemTxMaxGas;
          results['resourceConfig_maximumBaseFee'] = config.maximumBaseFee;
        }
      }
    } catch (error) {
      // If resourceConfig query fails, set all components to null
      results['resourceConfig_maxResourceLimit'] = null;
      results['resourceConfig_elasticityMultiplier'] = null;
      results['resourceConfig_baseFeeMaxChangeDenominator'] = null;
      results['resourceConfig_minimumBaseFee'] = null;
      results['resourceConfig_systemTxMaxGas'] = null;
      results['resourceConfig_maximumBaseFee'] = null;
    }
  }

  for (const functionName of functionNames) {
    // Skip resourceConfig component names since we handle them above
    if (functionName.startsWith('resourceConfig_')) {
      continue;
    }

    // Skip SuperchainConfig parameterized functions since we handle them below
    if (functionName.startsWith('paused_') || functionName.startsWith('expiration_')) {
      continue;
    }

    try {
      const result = await client.readContract({
        address: address as `0x${string}`,
        abi,
        functionName,
      });
      results[functionName] = result;
    } catch (error) {
      results[functionName] = null;
    }
  }

  // Special handling for DisputeGameFactory mappings
  const disputeGameFactoryAddress = process.env.REACT_APP_L1_DISPUTE_GAME_FACTORY_ADDRESS?.toLowerCase();
  if (disputeGameFactoryAddress && address.toLowerCase() === disputeGameFactoryAddress) {
    const gameTypes = [
      { value: 0, name: 'Permissionless' },
      { value: 1, name: 'Permissioned' },
      { value: 6, name: 'OP_SUCCINCT' },
    ];

    for (const gameType of gameTypes) {
      // Query gameImpls mapping
      try {
        const implResult = await client.readContract({
          address: address as `0x${string}`,
          abi,
          functionName: 'gameImpls',
          args: [gameType.value],
        });
        // Only add if non-zero address
        if (implResult && implResult !== '0x0000000000000000000000000000000000000000') {
          results[`gameImpls_${gameType.name}`] = implResult;
        }
      } catch (error) {
        // Ignore errors
      }

      // Query initBonds mapping
      try {
        const bondResult = await client.readContract({
          address: address as `0x${string}`,
          abi,
          functionName: 'initBonds',
          args: [gameType.value],
        });
        // Only add if non-zero
        if (bondResult && bondResult !== 0n) {
          results[`initBonds_${gameType.name}`] = bondResult;
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }

  // Special handling for ProverRegistry attestedProvers mapping
  const proverRegistryAddress = process.env.REACT_APP_L1_PROVER_REGISTRY_ADDRESS?.toLowerCase();
  if (proverRegistryAddress && address.toLowerCase() === proverRegistryAddress) {
    // Get nextInstanceId to know how many provers are registered
    const nextInstanceId = results['nextInstanceId'];
    if (nextInstanceId && typeof nextInstanceId === 'bigint') {
      const count = Number(nextInstanceId);

      // Query all registered provers (1 to nextInstanceId)
      for (let instanceId = 1; instanceId <= count; instanceId++) {
        try {
          const proverResult = await client.readContract({
            address: address as `0x${string}`,
            abi,
            functionName: 'attestedProvers',
            args: [instanceId],
          });

          // Only add if prover address is non-zero
          if (proverResult && typeof proverResult === 'object') {
            const prover = proverResult as any;
            if (prover.addr && prover.addr !== '0x0000000000000000000000000000000000000000') {
              // Expand ProverInstance struct into individual fields
              const addr = prover.addr || prover[0];
              const validUntil = prover.validUntil || prover[1];
              const ty = prover.ty || prover[2];
              const goldenMeasurementHash = prover.goldenMeasurementHash || prover[3];

              // Query goldenMeasurementRegistry to check if measurement is valid
              try {
                const measurementInfo = await client.readContract({
                  address: address as `0x${string}`,
                  abi,
                  functionName: 'goldenMeasurementRegistry',
                  args: [goldenMeasurementHash],
                });

                // measurementInfo is returned as an array: [cloudType, teeType, elType, tag]
                if (measurementInfo && Array.isArray(measurementInfo) && measurementInfo.length >= 4) {
                  const [cloudType, gmTeeType, gmElType, tag] = measurementInfo;

                  // Convert to number for comparison
                  const elTypeNum = typeof gmElType === 'bigint' ? Number(gmElType) : gmElType;

                  // Skip prover if golden measurement is deregistered (elType == 0)
                  if (elTypeNum === 0) {
                    continue;
                  }

                  // Golden measurement is valid, add prover data
                  results[`attestedProvers_${instanceId}_addr`] = addr;
                  results[`attestedProvers_${instanceId}_validUntil`] = validUntil;

                  // Extract teeType and elType from ProverType tuple
                  if (typeof ty === 'object' && ty !== null) {
                    const teeType = typeof ty.teeType !== 'undefined' ? ty.teeType : ty[0];
                    const elType = typeof ty.elType !== 'undefined' ? ty.elType : ty[1];
                    results[`attestedProvers_${instanceId}_teeType`] = teeType;
                    results[`attestedProvers_${instanceId}_elType`] = elType;
                  }

                  // Add golden measurement details instead of just the hash
                  results[`attestedProvers_${instanceId}_goldenMeasurement_cloudType`] = cloudType;
                  results[`attestedProvers_${instanceId}_goldenMeasurement_teeType`] = gmTeeType;
                  results[`attestedProvers_${instanceId}_goldenMeasurement_elType`] = gmElType;
                  results[`attestedProvers_${instanceId}_goldenMeasurement_tag`] = tag;
                  results[`attestedProvers_${instanceId}_goldenMeasurement_hash`] = goldenMeasurementHash;
                }
              } catch (error) {
                // If measurement query fails, skip this prover
                continue;
              }
            }
          }
        } catch (error) {
          // Ignore errors
        }
      }
    }
  }

  // Special handling for SuperchainConfig paused and expiration functions
  const superchainConfigAddress = process.env.REACT_APP_L1_SUPERCHAIN_CONFIG_ADDRESS?.toLowerCase();
  if (superchainConfigAddress && address.toLowerCase() === superchainConfigAddress) {
    const optimismPortalAddress = process.env.REACT_APP_L1_OPTIMISM_PORTAL_ADDRESS;
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    // Query paused state for global (address(0))
    if (functionNames.includes('paused_global')) {
      try {
        const pausedGlobal = await client.readContract({
          address: address as `0x${string}`,
          abi,
          functionName: 'paused',
          args: [zeroAddress as `0x${string}`],
        });
        results['paused_global'] = pausedGlobal;
      } catch (error) {
        results['paused_global'] = null;
      }
    }

    // Query paused state for OptimismPortal
    if (functionNames.includes('paused_portal') && optimismPortalAddress) {
      try {
        const pausedPortal = await client.readContract({
          address: address as `0x${string}`,
          abi,
          functionName: 'paused',
          args: [optimismPortalAddress as `0x${string}`],
        });
        results['paused_portal'] = pausedPortal;
      } catch (error) {
        results['paused_portal'] = null;
      }
    }

    // Query expiration for global (address(0))
    if (functionNames.includes('expiration_global')) {
      try {
        const expirationGlobal = await client.readContract({
          address: address as `0x${string}`,
          abi,
          functionName: 'expiration',
          args: [zeroAddress as `0x${string}`],
        });
        results['expiration_global'] = expirationGlobal;
      } catch (error) {
        results['expiration_global'] = null;
      }
    }

    // Query expiration for OptimismPortal
    if (functionNames.includes('expiration_portal') && optimismPortalAddress) {
      try {
        const expirationPortal = await client.readContract({
          address: address as `0x${string}`,
          abi,
          functionName: 'expiration',
          args: [optimismPortalAddress as `0x${string}`],
        });
        results['expiration_portal'] = expirationPortal;
      } catch (error) {
        results['expiration_portal'] = null;
      }
    }
  }

  return results;
}
