import type { PublicClient } from 'viem';

export const PROVER_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'chainID',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'attestedProvers',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [
      { type: 'address', name: 'addr' },
      { type: 'uint64', name: 'validUntil' },
      {
        type: 'tuple',
        name: 'ty',
        components: [
          { type: 'uint8', name: 'teeType' },
          { type: 'uint8', name: 'elType' },
        ],
      },
      { type: 'bytes32', name: 'goldenMeasurementHash' },
    ],
  },
] as const;

export interface ProverInstance {
  addr: `0x${string}`;
  validUntil: bigint;
  teeType: number;
  elType: number;
}

export async function getProverInstance(
  client: PublicClient,
  registry: `0x${string}`,
  id: bigint,
): Promise<ProverInstance> {
  const result = (await client.readContract({
    address: registry,
    abi: PROVER_REGISTRY_ABI,
    functionName: 'attestedProvers',
    args: [id],
  })) as readonly [
    `0x${string}`,
    bigint,
    { teeType: number; elType: number },
    `0x${string}`,
  ];

  return {
    addr: result[0],
    validUntil: result[1],
    teeType: result[2].teeType,
    elType: result[2].elType,
  };
}

export async function getRegistryChainId(
  client: PublicClient,
  registry: `0x${string}`,
): Promise<bigint> {
  return (await client.readContract({
    address: registry,
    abi: PROVER_REGISTRY_ABI,
    functionName: 'chainID',
  })) as bigint;
}
