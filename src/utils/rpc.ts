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

export const RPC_ENDPOINTS: RpcEndpoint[] = [
  {
    name: 'Gateway Endpoint',
    url: process.env.REACT_APP_GATEWAY_RPC_URL,
  },
  {
    name: 'Main Node Endpoint',
    url: process.env.REACT_APP_MAIN_NODE_RPC_URL,
  },
  {
    name: 'TEE Node Endpoint',
    url: process.env.REACT_APP_TEE_NODE_RPC_URL,
  },
];

export async function getBlockByTag(
  endpoint: RpcEndpoint,
  tag: 'latest' | 'safe' | 'finalized',
): Promise<BlockInfo> {
  const client = createPublicClient({
    transport: http(endpoint.url),
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
