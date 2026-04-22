import {
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  recoverAddress,
} from 'viem';

export type SignedPoe = {
  poe: {
    parentHash: `0x${string}`;
    blockHash: `0x${string}`;
    blockNumber: bigint;
    timestamp: bigint;
    stateRoot: `0x${string}`;
  };
  id: bigint;
  signature: `0x${string}`;
};

const SIGNED_POE_ABI = [
  {
    type: 'tuple',
    components: [
      {
        type: 'tuple',
        name: 'poe',
        components: [
          { type: 'bytes32', name: 'parentHash' },
          { type: 'bytes32', name: 'blockHash' },
          { type: 'uint256', name: 'blockNumber' },
          { type: 'uint256', name: 'timestamp' },
          { type: 'bytes32', name: 'stateRoot' },
        ],
      },
      { type: 'uint256', name: 'id' },
      { type: 'bytes', name: 'signature' },
    ],
  },
] as const;

export function decodeTeeProof(proof: `0x${string}`): SignedPoe {
  const [decoded] = decodeAbiParameters(SIGNED_POE_ABI, proof);
  const d = decoded as {
    poe: {
      parentHash: `0x${string}`;
      blockHash: `0x${string}`;
      blockNumber: bigint;
      timestamp: bigint;
      stateRoot: `0x${string}`;
    };
    id: bigint;
    signature: `0x${string}`;
  };
  return {
    poe: {
      parentHash: d.poe.parentHash,
      blockHash: d.poe.blockHash,
      blockNumber: d.poe.blockNumber,
      timestamp: d.poe.timestamp,
      stateRoot: d.poe.stateRoot,
    },
    id: d.id,
    signature: d.signature,
  };
}

export type FieldCheck = {
  ok: boolean;
  mismatches: string[];
};

export function checkPoeAgainstEnvelope(
  signed: SignedPoe,
  envelope: {
    stateRoot: `0x${string}`;
    header: {
      hash: `0x${string}`;
      number: number;
      parentHash: `0x${string}`;
      timestamp: number;
    };
  },
): FieldCheck {
  const mismatches: string[] = [];
  const { poe } = signed;
  const { header } = envelope;

  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  if (!eq(poe.parentHash, header.parentHash)) {
    mismatches.push(`parentHash: poe=${poe.parentHash} envelope=${header.parentHash}`);
  }
  if (!eq(poe.blockHash, header.hash)) {
    mismatches.push(`blockHash: poe=${poe.blockHash} envelope=${header.hash}`);
  }
  if (poe.blockNumber !== BigInt(header.number)) {
    mismatches.push(`blockNumber: poe=${poe.blockNumber} envelope=${header.number}`);
  }
  if (poe.timestamp !== BigInt(header.timestamp)) {
    mismatches.push(`timestamp: poe=${poe.timestamp} envelope=${header.timestamp}`);
  }
  if (!eq(poe.stateRoot, envelope.stateRoot)) {
    mismatches.push(`stateRoot: poe=${poe.stateRoot} envelope=${envelope.stateRoot}`);
  }

  return { ok: mismatches.length === 0, mismatches };
}

export async function recoverProverSigner(
  signed: SignedPoe,
  chainId: bigint,
  proverRegistry: `0x${string}`,
): Promise<`0x${string}`> {
  const preimage = encodeAbiParameters(
    [
      { type: 'string' },
      { type: 'uint256' },
      { type: 'address' },
      {
        type: 'tuple',
        components: [
          { type: 'bytes32' },
          { type: 'bytes32' },
          { type: 'uint256' },
          { type: 'uint256' },
          { type: 'bytes32' },
        ],
      },
      { type: 'bytes32' },
    ],
    [
      'VERIFY_PROOF',
      chainId,
      proverRegistry,
      [
        signed.poe.parentHash,
        signed.poe.blockHash,
        signed.poe.blockNumber,
        signed.poe.timestamp,
        signed.poe.stateRoot,
      ],
      signed.poe.blockHash,
    ],
  );

  const hash = keccak256(preimage);
  return recoverAddress({ hash, signature: signed.signature });
}
