import { createPublicClient, http } from 'viem';
import type { BlockInfo, RpcEndpoint } from '../types';
import { isLocalDev } from './env';

// Validate required RPC endpoint environment variables
if (!process.env.REACT_APP_GATEWAY_RPC_URL) {
  throw new Error('REACT_APP_GATEWAY_RPC_URL is not set. Please configure it in your .env file.');
}
if (!process.env.REACT_APP_MAIN_NODE_RPC_URL) {
  throw new Error('REACT_APP_MAIN_NODE_RPC_URL is not set. Please configure it in your .env file.');
}
// REACT_APP_TEE_NODE_* is deliberately OPTIONAL. Provers are not required to be publicly
// reachable — where they are not, their block heads come from the monitoring stack via the
// TEE Prover panel instead, and leaving these unset simply omits their cards here rather
// than rendering ones that can never load.

// Resolve an endpoint URL for the browser: direct in local dev, through
// /api/rpc-proxy in any production build.
//
// EVERY endpoint is proxied in production, not just raw http://IP:port ones. An
// https:// hostname is no safer to call directly: these are op-geth nodes behind
// nginx, and viem's application/json body forces a CORS preflight that geth
// answers with a 400 "Parse error" and no Access-Control-* headers — the browser
// then blocks the POST that would have succeeded, surfacing only "Failed to
// fetch". Raw IP endpoints additionally fail as mixed content. The proxy fixes
// both, and the URL must be set in the matching Vercel env var to pass its
// allowlist (see api/rpc-proxy.js).
//
// isLocalDev() rather than a vercel.app hostname check, so a deployment on a
// custom domain is treated as production too.
function getRpcUrl(originalUrl: string): string {
  if (isLocalDev()) return originalUrl;
  return '/api/rpc-proxy?url=' + encodeURIComponent(originalUrl);
}

// Numbered endpoint slots. Gateway 1 (REACT_APP_GATEWAY_RPC_URL) and TEE Node 1
// (REACT_APP_TEE_NODE_RPC_URL) keep their original unnumbered var names for
// backward compatibility; additional nodes use a numeric suffix (…_2, …_3, …).
//
// These MUST be listed as literal `process.env.REACT_APP_*` references: Create
// React App inlines env vars at build time via a static find-and-replace, so
// dynamic keys (process.env[`…${i}…`]) do NOT work in the browser bundle. To add
// more capacity, append a line here AND set the matching var in .env / Vercel.
export const GATEWAY_RPC_URLS = [
  process.env.REACT_APP_GATEWAY_RPC_URL,
  process.env.REACT_APP_GATEWAY_2_RPC_URL,
  process.env.REACT_APP_GATEWAY_3_RPC_URL,
  process.env.REACT_APP_GATEWAY_4_RPC_URL,
  process.env.REACT_APP_GATEWAY_5_RPC_URL,
  process.env.REACT_APP_GATEWAY_6_RPC_URL,
  process.env.REACT_APP_GATEWAY_7_RPC_URL,
  process.env.REACT_APP_GATEWAY_8_RPC_URL,
];

const TEE_NODE_RPC_URLS = [
  process.env.REACT_APP_TEE_NODE_RPC_URL,
  process.env.REACT_APP_TEE_NODE_2_RPC_URL,
  process.env.REACT_APP_TEE_NODE_3_RPC_URL,
  process.env.REACT_APP_TEE_NODE_4_RPC_URL,
  process.env.REACT_APP_TEE_NODE_5_RPC_URL,
  process.env.REACT_APP_TEE_NODE_6_RPC_URL,
  process.env.REACT_APP_TEE_NODE_7_RPC_URL,
  process.env.REACT_APP_TEE_NODE_8_RPC_URL,
];

// Turn a positional slot list into endpoints, skipping unset slots. The display
// number matches the env var's number (slot index + 1), so a gap (e.g. only
// GATEWAY_3 set) still labels it "Gateway 3 Endpoint".
function buildEndpoints(
  urls: Array<string | undefined>,
  label: string,
  tier: 'primary' | 'secondary',
): RpcEndpoint[] {
  return urls
    .map((url, i): RpcEndpoint | null =>
      url ? { name: `${label} ${i + 1} Endpoint`, url, tier } : null,
    )
    .filter((e): e is RpcEndpoint => e !== null);
}

// `tier` controls how endpoints are grouped in the Chain Status layout:
//   'primary'   → Main Node & Gateways (top layer)
//   'secondary' → TEE Nodes & Follower Node (second layer)
// URLs are resolved at runtime in getBlockByTag (proxied when needed).
export const RPC_ENDPOINTS: RpcEndpoint[] = [
  // Top layer: Main Node & Gateways
  {
    name: 'Main Node Endpoint',
    url: process.env.REACT_APP_MAIN_NODE_RPC_URL!,
    tier: 'primary',
  },
  ...buildEndpoints(GATEWAY_RPC_URLS, 'Gateway', 'primary'),
  // Second layer: TEE Nodes & Follower Node
  ...buildEndpoints(TEE_NODE_RPC_URLS, 'TEE Node', 'secondary'),
  ...(process.env.REACT_APP_FOLLOWER_NODE_RPC_URL
    ? [
        {
          name: 'Follower Node Endpoint',
          url: process.env.REACT_APP_FOLLOWER_NODE_RPC_URL,
          tier: 'secondary',
        } as RpcEndpoint,
      ]
    : []),
];

export async function getBlockByTag(
  endpoint: RpcEndpoint,
  tag: 'latest' | 'safe' | 'finalized',
): Promise<BlockInfo> {
  // Resolve the URL at runtime (check if we need proxy)
  let rpcUrl = getRpcUrl(endpoint.url);
  const isProxy = rpcUrl.startsWith('/api/');
  
  // If using proxy, construct the full URL with current origin
  if (isProxy && typeof window !== 'undefined') {
    rpcUrl = window.location.origin + rpcUrl;
  }
  
  const client = createPublicClient({
    transport: http(rpcUrl),
  });

  const block = await client.getBlock({
    blockTag: tag,
  });

  return {
    number: block.number,
    hash: block.hash,
    timestamp: block.timestamp,
  };
}

export async function fetchBlockData(
  endpoint: RpcEndpoint,
  tags: Array<'latest' | 'safe' | 'finalized'>,
): Promise<BlockInfo[]> {
  const promises = tags.map(tag => getBlockByTag(endpoint, tag));
  return Promise.all(promises);
}
