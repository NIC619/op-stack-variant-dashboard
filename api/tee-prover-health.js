// Prover health derived from L1 registry state — without contacting a prover.
//
// The dashboard used to poll each prover directly with tee_getExecutionProof('0x1') every
// 30s. That has three problems this endpoint avoids:
//
//   1. It needs the prover's RPC reachable from the internet. Those nodes run op-geth with
//      the admin/debug/miner namespaces enabled, so exposing them publicly to serve a health
//      check is a poor trade.
//   2. It makes a PRODUCTION prover generate a real signed proof on every poll, per open
//      tab — signing work on the machine whose actual job is finalising the chain.
//   3. It is blind to the failure that has actually bitten this fleet. A prover whose golden
//      measurement was deregistered, or whose registration expired, still answers
//      tee_getExecutionProof perfectly well — it can sign. What breaks is on-chain
//      VERIFICATION: verifyProof reverts and nothing that prover produces can be used. The
//      old probe reports green throughout.
//
// So health is read from the registry instead: is a prover of each required type registered,
// unexpired, and is its golden measurement still registered? That is the condition on-chain
// verification actually applies.
//
// This is a liveness check on the prover's STANDING, not on its process. It deliberately
// does not claim the prover is responsive right now — see `caveat` in the response. Pair it
// with the sequencer/frontier signals the dashboard already has if you need both.
const { requireAuth } = require('../lib/auth');

// Selectors, verified against the deployed ProverRegistry with `cast sig`.
const SEL_NEXT_INSTANCE_ID = '0xee45abb0'; // nextInstanceId()
const SEL_ATTESTED_PROVERS = '0x3d5f6fe1'; // attestedProvers(uint256)
const SEL_GM_REGISTRY      = '0x0c6dc467'; // goldenMeasurementRegistry(bytes32)

// How many instance slots back to scan. Registrations are append-only and rotate roughly
// every 15 days, so a small window covers every live prover many times over.
const SCAN_WINDOW = 12;

const TEE_TYPE = { 0: 'Unknown', 1: 'IntelTDX', 2: 'AmdSevSnp' };
const EL_TYPE = { 0: 'Unset', 1: 'Geth', 2: 'Reth' };

const words = (hex) => {
  const raw = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = [];
  for (let i = 0; i + 64 <= raw.length; i += 64) out.push(raw.slice(i, i + 64));
  return out;
};

// attestedProvers -> (address addr, uint64 validUntil, (uint8,uint8) ty, bytes32 gmHash).
// Fixed-size struct, so five sequential words and no dynamic tail.
function decodeInstance(hex) {
  const w = words(hex);
  if (w.length < 5) throw new Error('short attestedProvers return');
  return {
    address: '0x' + w[0].slice(24),
    validUntil: Number(BigInt('0x' + w[1])),
    teeType: Number(BigInt('0x' + w[2])),
    elType: Number(BigInt('0x' + w[3])),
    gmHash: '0x' + w[4],
  };
}

// goldenMeasurementRegistry -> (cloudType, teeType, elType, string tag). Only elType is
// needed and it is word[2], ahead of the string's offset, so the tail is never parsed.
// Length is checked in CHARACTERS: a whole-word count would accept a truncated third word,
// and a partial word decodes to a plausible value instead of an error — reporting a live
// measurement as deregistered.
function decodeGmRegistered(hex) {
  const raw = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (raw.length < 192) throw new Error('short goldenMeasurementRegistry return');
  return BigInt('0x' + raw.slice(128, 192)) !== 0n;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).json({});
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const registry =
    process.env.PROVER_REGISTRY_ADDRESS_SECRET ||
    process.env.REACT_APP_L1_PROVER_REGISTRY_ADDRESS;
  if (!registry) {
    return res.status(501).json({
      error: 'Prover registry not configured',
      hint: 'Set REACT_APP_L1_PROVER_REGISTRY_ADDRESS to the ProverRegistry address.',
    });
  }

  const upstreamUrl =
    process.env.L1_RPC_URL_SECRET ||
    process.env.REACT_APP_L1_RPC_URL ||
    'https://ethereum-hoodi-rpc.publicnode.com';

  let nextId = 0;
  const call = async (data, id) => {
    const r = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method: 'eth_call', params: [{ to: registry, data }, 'latest'] }),
    });
    if (!r.ok) throw new Error(`L1 RPC HTTP ${r.status}`);
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'eth_call failed');
    return j.result;
  };

  try {
    nextId = Number(BigInt(await call(SEL_NEXT_INSTANCE_ID, 1)));

    const from = Math.max(1, nextId - SCAN_WINDOW);
    const ids = [];
    for (let i = from; i <= nextId; i++) ids.push(i);

    const raw = await Promise.all(
      ids.map((i) => call(SEL_ATTESTED_PROVERS + i.toString(16).padStart(64, '0'), i).catch(() => null)),
    );

    const nowSec = Math.floor(Date.now() / 1000);
    const instances = [];
    for (let k = 0; k < ids.length; k++) {
      if (!raw[k]) continue;
      let inst;
      try { inst = decodeInstance(raw[k]); } catch { continue; }
      // Empty slots decode to the zero address.
      if (/^0x0{40}$/.test(inst.address)) continue;
      instances.push({ id: ids[k], ...inst });
    }

    // One registry read per DISTINCT measurement, not per instance.
    const gmHashes = [...new Set(instances.map((i) => i.gmHash))];
    const gmRegistered = {};
    await Promise.all(
      gmHashes.map(async (gm) => {
        try {
          gmRegistered[gm] = decodeGmRegistered(await call(SEL_GM_REGISTRY + gm.slice(2), 1));
        } catch {
          // A read failure is NOT evidence of deregistration. Reporting null keeps the UI
          // from turning a transient L1 blip into a fleet-wide outage.
          gmRegistered[gm] = null;
        }
      }),
    );

    const provers = instances.map((i) => {
      const expired = i.validUntil <= nowSec;
      const registered = gmRegistered[i.gmHash];
      return {
        instanceId: i.id,
        address: i.address,
        type: `${TEE_TYPE[i.teeType] ?? i.teeType}/${EL_TYPE[i.elType] ?? i.elType}`,
        goldenMeasurement: i.gmHash,
        goldenMeasurementRegistered: registered,
        validUntil: i.validUntil,
        secondsRemaining: Math.max(0, i.validUntil - nowSec),
        expired,
        // Usable == what verifyProof actually requires: unexpired AND measurement still
        // registered. `null` where the measurement could not be read.
        usable: registered === null ? null : !expired && registered,
      };
    });

    const usableByType = {};
    for (const p of provers) {
      if (p.usable !== true) continue;
      usableByType[p.type] = (usableByType[p.type] || 0) + 1;
    }

    return res.status(200).json({
      ok: true,
      checkedAt: nowSec,
      registry,
      nextInstanceId: nextId,
      usableByType,
      provers: provers.sort((a, b) => b.instanceId - a.instanceId),
      caveat:
        'Derived from L1 registry state. Reports whether a prover is REGISTERED and its ' +
        'golden measurement still valid — the condition on-chain verification applies. It ' +
        'does not prove the prover process is responding right now.',
    });
  } catch (error) {
    console.error('TEE prover health error:', error);
    return res.status(502).json({
      ok: false,
      error: 'Failed to read prover registry',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
