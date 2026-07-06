export interface RpcEndpoint {
  name: string;
  url: string;
  // Layout grouping in the Chain Status "Block Information" section.
  // 'primary'   → Main Node & Gateways (top layer)
  // 'secondary' → TEE Nodes & Follower Node (second layer)
  tier?: 'primary' | 'secondary';
}

export interface BlockInfo {
  number: bigint;
  hash: string;
  timestamp: bigint;
}

export interface BlockMonitorData {
  endpoint: RpcEndpoint;
  tag: 'latest' | 'safe' | 'finalized';
  block: BlockInfo | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface ViewFunction {
  name: string;
  label: string;
}

export interface Predeploy {
  name: string;
  address: string;
  description: string;
  category: 'bridge' | 'vault' | 'factory' | 'system' | 'governance' | 'tee';
  isManageable: boolean;
  isOwnerBased?: boolean; // True for contracts with owner() but not proxy-based (e.g., ProverRegistry, WorkloadVerifier)
  viewFunctions?: ViewFunction[]; // For contracts without owner
}

export interface PredployInfo extends Predeploy {
  owner?: string;
  balance?: bigint;
  viewData?: Record<string, any>; // Results from view functions
  loading?: boolean;
  error?: string | null;
}
