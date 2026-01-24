import { createPublicClient, http } from 'viem';
import type { BlockInfo, RpcEndpoint } from '../types';

// Validate required RPC endpoint environment variables
if (!process.env.REACT_APP_GATEWAY_RPC_URL) {
  throw new Error('REACT_APP_GATEWAY_RPC_URL is not set. Please configure it in your .env file.');
}
if (!process.env.REACT_APP_MAIN_NODE_RPC_URL) {
  throw new Error('REACT_APP_MAIN_NODE_RPC_URL is not set. Please configure it in your .env file.');
}
if (!process.env.REACT_APP_TEE_NODE_RPC_URL) {
  throw new Error('REACT_APP_TEE_NODE_RPC_URL is not set. Please configure it in your .env file.');
}

// Helper function to get the RPC URL (use proxy in production for IP addresses)
function getRpcUrl(originalUrl: string): string {
  // Check if we're on Vercel (runtime check)
  const isVercel = typeof window !== 'undefined' && 
    (window.location.hostname.includes('vercel.app') || 
     window.location.hostname.includes('vercel.com'));
  
  // In production/Vercel, use proxy for IP addresses (raw IP:port URLs)
  // This avoids CORS and mixed content issues
  if (isVercel && /^http:\/\/\d+\.\d+\.\d+\.\d+:\d+/.test(originalUrl)) {
    // Use the Vercel API proxy
    const proxyUrl = '/api/rpc-proxy?url=' + encodeURIComponent(originalUrl);
    return proxyUrl;
  }
  // In development or for HTTPS URLs, use direct connection
  return originalUrl;
}

// Create endpoints - URLs will be resolved at runtime in getBlockByTag
export const RPC_ENDPOINTS: RpcEndpoint[] = [
  {
    name: 'Gateway Endpoint',
    url: process.env.REACT_APP_GATEWAY_RPC_URL!,
  },
  {
    name: 'Main Node Endpoint',
    url: process.env.REACT_APP_MAIN_NODE_RPC_URL!,
  },
  {
    name: 'TEE Node Endpoint',
    url: process.env.REACT_APP_TEE_NODE_RPC_URL!,
  },
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
