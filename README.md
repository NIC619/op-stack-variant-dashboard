# UniFi Monitor & Management Frontend

A comprehensive admin dashboard for monitoring and managing L1 and L2 contracts, as well as block information for the UniFi OP Stack chain.

## Features

### Block Monitor
- **Real-time block tracking** across multiple RPC endpoints
- **Multi-endpoint support**: Configure multiple RPC endpoints in `src/utils/rpc.ts`
- **Block tags**: Query `unsafe`, `safe`, and `finalized` blocks
- **Auto-refresh**: 5-second refresh interval for real-time updates
- **Block details**: Number, hash, timestamp, transaction count, miner, gas info

### Predeploys Management
- **Query predeploy contract info**: View owner/admin, implementation address, balance, and status
- **Filter by category**:
  - Bridge & Messaging
  - Fee Vaults
  - Factories
  - System Contracts
  - Governance & Attestation
- **Management features** (for manageable contracts):
  - **Transfer Admin/Owner**: Transfer proxy admin or contract ownership
    - For ProxyAdmin: Transfer ownership directly
    - For ProxyAdmin-managed contracts: Change admin via ProxyAdmin contract
  - **Upgrade Implementation**: Upgrade contract implementation via ProxyAdmin
  - **Withdraw Funds**: Withdraw ETH from vault contracts
- **Smart ProxyAdmin routing**:
  - Automatically detects if contract is managed by ProxyAdmin (0x4200...0018)
  - Routes admin transfer and upgrade calls through ProxyAdmin contract
  - Generates appropriate calldata for multisig/DAO execution
- **Smart authorization handling**:
  - If owner is an EOA: Check wallet connection
  - If owner is a contract (multisig, DAO): Present calldata for transaction crafting

## Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- A compatible Ethereum wallet (MetaMask, WalletConnect, etc.)

### Installation

```bash
npm install --legacy-peer-deps
```

### Configuration

1. **Environment Variables**: Create a `.env` file in the project root (use `.env.example` as a template):

```bash
# L1 RPC URL for L1 contract interactions
REACT_APP_L1_RPC_URL=https://your-l1-rpc-url

# L2 RPC URL for L2 contract interactions
REACT_APP_L2_RPC_URL=http://your-l2-rpc-url

# Block Monitor RPC Endpoints
REACT_APP_GATEWAY_RPC_URL=https://your-gateway-rpc-url
REACT_APP_MAIN_NODE_RPC_URL=http://your-main-node-rpc-url
REACT_APP_TEE_NODE_RPC_URL=http://your-tee-node-rpc-url
```

2. **Wagmi Configuration**: Edit `src/config/wagmi.ts` to update:
- Chain ID (currently set to 1337)
- RPC endpoints
- Chain details

3. **Predeploy Contracts**: Edit `src/config/predeploys.ts` to add/remove predeploy contracts:

```typescript
{
  name: 'ContractName',
  address: '0x...',
  description: 'Description of what this contract does',
  category: 'bridge' | 'vault' | 'factory' | 'system' | 'governance',
  isManageable: true | false,
}
```

### Running the Frontend

```bash
npm start
```

Opens at `http://localhost:3000`

## Tech Stack

- **React 19** with TypeScript
- **Wagmi 2** - Wallet integration and smart contract interactions
- **Viem 2** - Ethereum client library
- **React Router 6** - Navigation
- **TanStack React Query 5** - Data fetching and caching
- **CSS3** - Styling (no framework, pure CSS)

## File Structure

```
src/
├── components/
│   ├── PredeployCard.tsx      # Individual predeploy contract card
│   └── PredeployCard.css
├── config/
│   ├── wagmi.ts               # Wagmi configuration
│   └── predeploys.ts          # Predeploy contracts list
├── pages/
│   ├── BlockMonitor.tsx       # Block monitoring page
│   ├── BlockMonitor.css
│   ├── Predeploys.tsx         # Predeploys management page
│   └── Predeploys.css
├── types/
│   └── index.ts               # TypeScript types
├── utils/
│   ├── rpc.ts                 # RPC utilities
│   └── contracts.ts           # Contract interaction utilities
├── App.tsx                    # Main app component
├── App.css
├── index.tsx
└── index.css
```

## Key Utilities

### RPC Utilities (`src/utils/rpc.ts`)
- `getBlockByTag()` - Fetch block by tag (unsafe, safe, finalized)
- `fetchBlockData()` - Fetch multiple blocks at once
- `RPC_ENDPOINTS` - List of all configured RPC endpoints

### Contract Utilities (`src/utils/contracts.ts`)
- `getContractOwner()` - Get owner/admin address of a contract (handles ProxyAdmin specially)
- `getImplementation()` - Get implementation address of a proxy contract
- `getBalance()` - Get ETH balance of an address
- `getContractInfo()` - Get owner, implementation, and balance info
- `getViewFunctionData()` - Fetch view function results from contracts
- `generateTransferOwnershipCalldata()` - Generate calldata for ownership transfer
- `generateChangeProxyAdminCalldata()` - Generate calldata for ProxyAdmin.changeProxyAdmin()
- `generateUpgradeCalldata()` - Generate calldata for ProxyAdmin.upgrade()
- `generateWithdrawCalldata()` - Generate calldata for withdraw function
- `isValidAddress()` - Validate Ethereum address format

## Usage

### Block Monitor
1. Navigate to the "Block Monitor" tab
2. View blocks across all three RPC endpoints
3. See real-time block data updated every 5 seconds
4. Click on block details to see expanded information

### Manage Predeploys
1. Navigate to the "Predeploys" tab
2. Connect your wallet using the wallet connection button
3. Filter contracts by category or show only manageable ones
4. View contract information:
   - Owner/Admin address (with visual indicator if you own it)
   - Implementation address (for proxy contracts)
   - Balance (for vault contracts)
   - Contract-specific view function data
5. Click action buttons to manage contracts:
   - **Transfer Owner/Admin**: Change contract ownership or admin
   - **Upgrade Impl**: Upgrade contract implementation (not available for ProxyAdmin)
   - **Withdraw**: Withdraw funds from vault contracts
6. For EOA owners:
   - Verify you are the owner (displayed on card)
   - Copy the calldata and execute the transaction from your wallet
7. For contract owners (multisig, DAO):
   - The calldata will be presented
   - Craft the transaction in your multisig/DAO interface using the provided calldata

## Management Actions

### Transfer Admin/Owner

#### For ProxyAdmin Contract
- **Button**: "Transfer Owner"
- **Target**: ProxyAdmin contract itself
- **Function**: `transferOwnership(address newOwner)`
- **Authorization**: Must be current owner (EOA or multisig)

#### For ProxyAdmin-Managed Contracts
- **Button**: "Transfer Admin"
- **Detection**: Automatically detects if admin is ProxyAdmin (0x4200...0018)
- **Target**: ProxyAdmin contract
- **Function**: `changeProxyAdmin(address proxy, address newAdmin)`
- **Authorization**: Must be ProxyAdmin owner (EOA or multisig)

#### For Other Contracts
- **Button**: "Transfer Admin"
- **Target**: Contract itself
- **Function**: `transferOwnership(address newOwner)`
- **Authorization**: Must be current owner (EOA or multisig)

### Upgrade Implementation
- **Available for**: All manageable contracts except ProxyAdmin
- **Detection**: Automatically detects if contract is managed by ProxyAdmin
- **Target**: ProxyAdmin contract
- **Function**: `upgrade(address proxy, address implementation)`
- **Authorization**: Must be ProxyAdmin owner (EOA or multisig)
- **Input**: New implementation contract address

### Withdraw Funds
- **Available for**: Vault contracts (SequencerFeeVault, BaseFeeVault, L1FeeVault, OperatorFeeVault, UniFiFeeVault)
- **Function**: `withdraw()`
- **Authorization**: Must be current owner (EOA or multisig)
- **Action**: Withdraws all accumulated ETH to the configured recipient

### Authorization Handling
- **For EOA Owner**: Must be the connected wallet
- **For Contract Owner (multisig/DAO)**: Calldata provided for transaction crafting

## Notes

- No authorization is enforced by the frontend - it assumes the user has legitimate access
- The frontend provides guidance based on contract ownership (EOA vs contract)
- Always verify transaction details before executing
- Some contracts are read-only and cannot be managed (marked as `isManageable: false`)

## Development

### TypeScript
Strict mode is enabled. All components use proper typing.

### Adding New Predeploys
Edit `src/config/predeploys.ts`:

```typescript
{
  name: 'YourContract',
  address: '0x...',
  description: 'What this contract does',
  category: 'system',
  isManageable: false,
}
```

### Adding New RPC Endpoints
1. Add the environment variable to your `.env` file:
```bash
REACT_APP_YOUR_ENDPOINT_RPC_URL=https://your-rpc-url
```

2. Add validation and endpoint configuration in `src/utils/rpc.ts`:
```typescript
// Add validation
if (!process.env.REACT_APP_YOUR_ENDPOINT_RPC_URL) {
  throw new Error('REACT_APP_YOUR_ENDPOINT_RPC_URL is not set.');
}

// Add to RPC_ENDPOINTS array
export const RPC_ENDPOINTS: RpcEndpoint[] = [
  // ... existing endpoints
  {
    name: 'Your Endpoint',
    url: process.env.REACT_APP_YOUR_ENDPOINT_RPC_URL,
  },
];
```

## Deployment

### Deploying to Vercel

This project is configured for easy deployment to Vercel. Vercel automatically handles React Router routing and provides a global CDN.

#### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the Create React App configuration

3. **Configure Environment Variables**:
   - In the Vercel project settings, go to "Environment Variables"
   - Add all the environment variables from your `.env` file:
     - `REACT_APP_L1_RPC_URL`
     - `REACT_APP_L2_RPC_URL`
     - `REACT_APP_GATEWAY_RPC_URL`
     - `REACT_APP_MAIN_NODE_RPC_URL`
     - `REACT_APP_TEE_NODE_RPC_URL`
     - `REACT_APP_ACCESS_PASSWORD` (optional - set a password to protect your deployment)

4. **Deploy**:
   - Click "Deploy"
   - Vercel will build and deploy your app
   - You'll get a URL like `https://your-project.vercel.app`

#### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```
   - Follow the prompts to link your project
   - Set environment variables when prompted or add them in the Vercel dashboard

3. **For production deployment**:
   ```bash
   vercel --prod
   ```

#### Automatic Deployments

Once connected to Vercel:
- Every push to `main` branch automatically triggers a production deployment
- Pull requests automatically get preview deployments
- All deployments are available in the Vercel dashboard

#### Custom Domain

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

#### Password Protection

The dashboard includes optional password protection that **only activates on Vercel deployments** (not in local development).

**To enable password protection:**

1. Set the `REACT_APP_ACCESS_PASSWORD` environment variable in Vercel:
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add `REACT_APP_ACCESS_PASSWORD` with your desired password
   - Deploy or redeploy your application

2. **Local development is not affected** - when running `npm start` locally, no password is required

**How it works:**
- Password protection only activates when the site is accessed via a Vercel domain (`.vercel.app` or `.vercel.com`)
- Password verification happens server-side via `/api/auth` (password never exposed in client bundle)
- Authentication is stored in `sessionStorage` (cleared when the browser closes)
- Users will see a password prompt before accessing the dashboard
- If the password is not set in environment variables, access is automatically granted

**Security:**
- ✅ Password is verified server-side (never exposed in client JavaScript)
- ✅ Password stored in Vercel environment variables (server-side only)
- ⚠️ Session-based authentication (not as secure as proper JWT tokens, but sufficient for basic protection)

## Security Considerations

### ⚠️ Important: API Keys and Secrets

**All `REACT_APP_*` environment variables are embedded in the client-side JavaScript bundle and are publicly visible.** Anyone can:
- View your source code in the browser
- Inspect the JavaScript bundle
- Extract API keys and secrets

**What this means:**
- ❌ **Never put sensitive API keys in `REACT_APP_*` variables** if they should remain secret
- ✅ **Use serverless function proxies** for sensitive API calls (like the explorer API)
- ✅ **Only use `REACT_APP_*` for public configuration** (RPC URLs, contract addresses, etc.)

**Current Security Implementation:**
- ✅ **Explorer API Key**: Protected via `/api/explorer-proxy` serverless function (key stays server-side on Vercel)
- ✅ **Access Password**: Protected via `/api/auth` serverless function (password verified server-side, never exposed in client)
- ✅ **RPC Endpoints**: Public IP addresses are proxied through `/api/rpc-proxy` (avoids CORS issues)
- ⚠️ **Local Development**: API keys and passwords may still be exposed in local dev (acceptable for development only)

**Best Practices:**
1. Use serverless functions (like `api/explorer-proxy.js`) to proxy sensitive API calls
2. Store API keys only in Vercel environment variables (server-side)
3. Never commit API keys to git
4. Rotate API keys if they've been exposed

## Building for Production

```bash
npm run build
```

Creates an optimized production build in the `build/` directory.

## License

MIT License

See [LICENSE](LICENSE) file for details.
