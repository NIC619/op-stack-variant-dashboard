# L1 Contracts Integration Progress

## Session Summary
Adding L1 contract management functionality to the UniFi Monitor & Management dashboard.

## Completed ✅

### Infrastructure Setup
1. **Environment Variables**
   - Added `REACT_APP_L1_RPC_URL` for L1 contract queries
   - Renamed `REACT_APP_RPC_URL` to `REACT_APP_L2_RPC_URL`
   - Updated all references and documentation

2. **L1 Contracts Page**
   - Created `/l1-contracts` route
   - Created `L1Contracts.tsx` page (mirrors Predeploys functionality)
   - Updated navigation to include L1 Contracts tab
   - Renamed title from "L2 Monitor & Management" to "UniFi Monitor & Management"

3. **Component Updates**
   - Updated `PredeployCard` to accept optional `rpcUrl` parameter
   - Enhanced copyable detection to recognize addresses and hashes by value
   - Added special formatting for various data types

### L1 Contracts Implemented (7/7) ✅

#### 1. AnchorStateRegistry ✅
- **Address**: `0x5415b132cb934066dc9bf1924a0cad9fb4eed07e`
- **View Functions**:
  - `version`, `disputeGameFinalityDelaySeconds`, `systemConfig`
  - `disputeGameFactory`, `anchorGame`, `respectedGameType`
  - `retirementTimestamp`, `paused`, `getAnchorRoot`
- **Special Formatting**:
  - `respectedGameType`: 0=Permissionless, 1=Permissioned, 6=OP_SUCCINCT
  - `getAnchorRoot`: Parses tuple and displays root + L2 sequence number
  - `retirementTimestamp`: Shows timestamp + human-readable UTC date

#### 2. DisputeGameFactory ✅
- **Address**: `0xC3566eB389bA4e6c378f6f0a7e99C32033AeA9D4`
- **View Functions**:
  - `version`, `portalAddress`, `proverRegistryAddress`
  - `getBlockNumber`, `getCurrentOffset`, `gameCount`
- **Special Features**:
  - Queries `gameImpls` mapping for GameTypes 0, 1, 6
  - Queries `initBonds` mapping for GameTypes 0, 1, 6
  - Only displays non-zero values
  - Formats bond amounts as ETH

#### 3. L1StandardBridge ✅
- **Address**: `0xa99A27d6F39630332e0F39C9Fa3D2E0C0d76B3e7`
- **Proxy Type**: L1ChugSplashProxy
- **View Functions**:
  - `version`, `signalService`, `systemConfig`, `paused`
- **Special Handling**:
  - Uses `getOwner()` and `getImplementation()` instead of `admin()` and `implementation()`
  - Calls must be made with `account: '0x0000000000000000000000000000000000000000'`

#### 4. OptimismPortal ✅
- **Address**: `0x0E9c3F12dcA3494D7A6d96bF47FB1d45E949A4B2`
- **View Functions**:
  - `version`, `proofMaturityDelaySeconds`, `systemConfig`
  - `ethLockbox`, `anchorStateRegistry`, `paused`, `disputeGameFactory`

#### 5. SystemConfig ✅
- **Address**: `0x3c2b21BAD19002D888B25a183BcDae97ab520B7c`
- **View Functions**:
  - State variables: `version`, `batcherHash`, `gasLimit`, `basefeeScalar`, `blobbasefeeScalar`
  - EIP-1559 params: `eip1559Denominator`, `eip1559Elasticity`
  - Operator fees: `operatorFeeScalar`, `operatorFeeConstant`
  - Chain config: `l2ChainId`, `unsafeBlockSigner`, `startBlock`, `paused`
  - Contract references: `l1CrossDomainMessenger`, `l1StandardBridge`, `disputeGameFactory`, `optimismPortal`, `batchInbox`
  - `resourceConfig` (tuple expanded into 6 separate rows)
- **Special Handling**:
  - `resourceConfig`: Automatically expanded into individual rows for each component:
    - Resource Config - Max Resource Limit
    - Resource Config - Elasticity Multiplier
    - Resource Config - Base Fee Max Change Denominator
    - Resource Config - Minimum Base Fee
    - Resource Config - System Tx Max Gas
    - Resource Config - Maximum Base Fee

#### 6. ProxyAdmin ✅
- **Address**: `0xd3D6C903D4B4a2199439F4147CC4Ac4781bC5016`
- **Description**: Owner of L1 contract proxies, controls admin/upgrade rights for other L1 contracts
- **View Functions**: None (uses `owner()` from contract info)
- **Special Handling**:
  - Displays "Transfer Owner" button (not "Transfer Admin")
  - Hides "Upgrade Impl" button
  - Uses `owner()` function to get ownership info

#### 7. EthLockbox ✅ (Configuration ready, awaiting deployment)
- **Address**: `0x0000000000000000000000000000000000000000` (Pending deployment)
- **View Functions**:
  - `version`, `systemConfig`, `paused`
- **Status**: ABI and configuration complete, ready for deployment
- **Note**: Once deployed, update address in `l1contracts.ts` and `l1abis.ts`

## Remaining Work ⏳

### Post-Deployment Tasks

1. **Update EthLockbox address** when contract is deployed
   - Update address in `src/config/l1contracts.ts`
   - Add address mapping in `src/utils/l1abis.ts`

## Key Implementation Details

### File Structure
- **ABIs**: `src/utils/l1abis.ts` - All L1 contract ABIs
- **Config**: `src/config/l1contracts.ts` - L1 contract configurations
- **Page**: `src/pages/L1Contracts.tsx` - L1 contracts management page
- **Utils**: `src/utils/contracts.ts` - Query functions with L1/L2 support

### Special Patterns

#### L1ChugSplashProxy Contracts
For contracts using L1ChugSplashProxy (like L1StandardBridge):
```typescript
// Must call with account: address(0) to bypass proxy check
const result = await client.readContract({
  address: contractAddress,
  abi: CONTRACT_ABI,
  functionName: 'getOwner', // or 'getImplementation'
  account: '0x0000000000000000000000000000000000000000',
});
```

#### Mapping Queries
For contracts with mappings (like DisputeGameFactory and ProverRegistry):

**DisputeGameFactory**:
- Special handling in `getViewFunctionData()` (contracts.ts:569-610)
- Queries specific keys (GameTypes 0, 1, 6)
- Only adds non-zero results to viewData
- Uses naming pattern: `mappingName_KeyName` (e.g., `gameImpls_Permissionless`)

**ProverRegistry attestedProvers**:
- Special handling in `getViewFunctionData()` (contracts.ts:708-755)
- Dynamically determines query range using `nextInstanceId` result
- Queries registered provers starting at instance ID 1 (1 to nextInstanceId)
- Only adds non-zero prover addresses to viewData
- Expands ProverInstance struct into separate fields during query
- Uses naming pattern: `attestedProvers_1_addr`, `attestedProvers_1_validUntil`, `attestedProvers_1_teeType`, `attestedProvers_1_elType`, `attestedProvers_1_goldenMeasurementHash`
- Each field displayed as a separate row (similar to ResourceConfig expansion)

#### Custom Formatting
In `ContractCard.tsx`:
- Tuple parsing for `getAnchorRoot`
- Game type mapping for `respectedGameType`
- ETH amounts for `initBonds_*`
- Timestamp formatting for `retirementTimestamp`
- Boolean values display as "true"/"false"
- **Attested Provers fields**:
  - `attestedProvers_*_addr`: Truncated address with copy functionality
  - `attestedProvers_*_validUntil`: Timestamp with UTC date
  - `attestedProvers_*_teeType`: TEE type enum (0=Unknown, 1=IntelTDX, 2=AmdSevSnp)
  - `attestedProvers_*_elType`: EL type enum (0=Unset, 1=Geth, 2=Reth)
  - `attestedProvers_*_goldenMeasurementHash`: Truncated hash with copy functionality

In `contracts.ts` (getViewFunctionData):
- `resourceConfig` tuple expansion: Automatically detects resourceConfig and expands it into 6 individual properties (resourceConfig_maxResourceLimit, resourceConfig_elasticityMultiplier, etc.)

### Environment Variables Required
```bash
REACT_APP_L1_RPC_URL=https://ethereum-holesky-rpc.publicnode.com
REACT_APP_L1_EXPLORER_API_URL=https://api.etherscan.io/v2/api
REACT_APP_L1_EXPLORER_API_KEY=your_etherscan_api_key
REACT_APP_L1_EXPLORER_BASE_URL=https://hoodi.etherscan.io
REACT_APP_L2_RPC_URL=http://34.51.145.209:8545
REACT_APP_GATEWAY_RPC_URL=https://testnet-unifi-rpc.puffer.fi/
REACT_APP_MAIN_NODE_RPC_URL=http://34.51.145.209:8545
REACT_APP_TEE_NODE_RPC_URL=http://34.1.254.59:8545
REACT_APP_BATCHER_ADDRESS=0x46EB9DBf04b800B78a43bbE59f7e613Be4E340D1
REACT_APP_PROPOSER_ADDRESS=0x4aD30eCFb92b9311A853d296c515fb0D6505d89C
```

## Recent Updates

### Component Renaming
- Renamed `PredeployCard` component to `ContractCard` to better reflect its dual use for both L2 predeploys and L1 contracts
- Files renamed:
  - `src/components/PredeployCard.tsx` → `ContractCard.tsx`
  - `src/components/PredeployCard.css` → `ContractCard.css`
- Updated all imports in `Predeploys.tsx` and `L1Contracts.tsx`

### L1 Contract Addresses in Environment Variables
- Moved all L1 contract addresses from hardcoded values in `l1contracts.ts` to environment variables
- This enables the project to be used across different OP Stack chains
- Environment variables added:
  - `REACT_APP_L1_ANCHOR_STATE_REGISTRY_ADDRESS`
  - `REACT_APP_L1_DISPUTE_GAME_FACTORY_ADDRESS`
  - `REACT_APP_L1_ETH_LOCKBOX_ADDRESS`
  - `REACT_APP_L1_STANDARD_BRIDGE_ADDRESS`
  - `REACT_APP_L1_OPTIMISM_PORTAL_ADDRESS`
  - `REACT_APP_L1_PROXY_ADMIN_ADDRESS`
  - `REACT_APP_L1_SYSTEM_CONFIG_ADDRESS`
- Added warning banner on L1 Contracts page when addresses are missing
- Updated `.env` and `.env.example` files with L1 contract address variables

### Copyable Contract Addresses
- Made contract addresses in card headers clickable and copyable
- Added visual feedback (blue color, underline on hover, checkmark on copy)
- Works for both L2 predeploys and L1 contracts
- Displays full address on copy, even though truncated version is shown

### Removed Hardcoded L1 Addresses
- Updated `l1abis.ts` to build L1_CONTRACT_ABIS mapping dynamically from environment variables
- Fixed `contracts.ts` to use environment variables for L1StandardBridge and DisputeGameFactory address checks
- All L1 contract addresses now sourced from environment variables
- Ensures full portability across different OP Stack chains

### Signal Service Contracts
- Added L2 SignalService predeploy with `L1_SIGNAL_SERVICE` view function
- Added L1 SignalService contract (no view functions)
- Both contracts marked as non-manageable (not upgradeable)
- Addresses configurable via environment variables:
  - `REACT_APP_L2_SIGNAL_SERVICE_ADDRESS`
  - `REACT_APP_L1_SIGNAL_SERVICE_ADDRESS`
- Created SIGNAL_SERVICE_ABI for L2 contract

### ProverRegistry Contract (L1)
- Added ProverRegistry at `0x6975F222dC988900c181c0a15F1D901F67E98bc8`
- Manageable contract with owner (not a proxy, no implementation)
- View functions: version, chainID, verifier, requiredProverTypes, attestValiditySeconds, maxBlockNumberDiff, nextInstanceId
- Category: tee
- Created PROVER_REGISTRY_ABI with all 7 view functions + owner + attestedProvers mapping
- Environment variable: `REACT_APP_L1_PROVER_REGISTRY_ADDRESS`
- **Attested Provers Mapping**: Dynamically queries attestedProvers mapping using nextInstanceId
  - Uses nextInstanceId to determine how many provers are registered (e.g., if nextInstanceId=3, queries IDs 0, 1, 2)
  - Returns ProverInstance struct with: addr, validUntil, ProverType (teeType, elType), goldenMeasurementHash
  - Only displays provers with non-zero addresses
  - Results stored as `attestedProvers_0`, `attestedProvers_1`, etc.

### TEE Category
- Added new "TEE" category for Trusted Execution Environment contracts
- Updated type definition in `types/index.ts`
- Added cyan color (#06b6d4) for TEE category badge
- Added TEE filter option to both L2 Predeploys and L1 Contracts pages
- ProverRegistry categorized under TEE

### Attested Provers Mapping (ProverRegistry)
- Added `attestedProvers` function to PROVER_REGISTRY_ABI in l1abis.ts
- Added `goldenMeasurementRegistry` function to PROVER_REGISTRY_ABI for validity checking
- Implemented dynamic mapping query in contracts.ts (lines 708-790)
- **Query Logic**:
  - Uses `nextInstanceId` to determine query range
  - Queries instance IDs starting at 1 (e.g., if nextInstanceId=2, queries IDs 1 and 2)
  - Only displays provers with non-zero addresses
  - **Validity Check**: Queries `goldenMeasurementRegistry` for each prover's golden measurement hash
    - If `GoldenMeasurementInfo.elType == 0`, golden measurement is deregistered → skip prover
    - If `GoldenMeasurementInfo.elType != 0`, golden measurement is valid → display prover
  - Expands ProverInstance struct into individual fields during query (similar to ResourceConfig)
- **Field Expansion**:
  - `attestedProvers_1_addr`: Prover address
  - `attestedProvers_1_validUntil`: Validity timestamp (uint64)
  - `attestedProvers_1_teeType`: TEE type from ProverType tuple (uint8)
  - `attestedProvers_1_elType`: EL type from ProverType tuple (uint8)
  - **Golden Measurement Details** (instead of just hash):
    - `attestedProvers_1_goldenMeasurement_cloudType`: Cloud provider (uint8)
    - `attestedProvers_1_goldenMeasurement_teeType`: TEE type (uint8)
    - `attestedProvers_1_goldenMeasurement_elType`: EL type (uint8)
    - `attestedProvers_1_goldenMeasurement_tag`: Version/build identifier (string)
    - `attestedProvers_1_goldenMeasurement_hash`: Measurement hash (bytes32)
- **Display Logic**:
  - ContractCard displays each field as a separate row
  - Labels: "Attested Prover 1 - Address", "Attested Prover 1 - Golden Measurement Cloud Type", etc.
  - Custom formatting for each field type:
    - Address: Truncated with copy functionality
    - Valid Until: Timestamp with UTC date format
    - TEE Type: Enum mapping (0=Unknown, 1=IntelTDX, 2=AmdSevSnp)
    - EL Type: Enum mapping (0=Unset, 1=Geth, 2=Reth)
    - Cloud Type: Enum mapping (0=Unset, 1=GCP, 2=Azure)
    - Tag: String display
    - Hash: Truncated with copy functionality

### Owner-Based Contract Handling (ProverRegistry & WorkloadVerifier)
- ProverRegistry and WorkloadVerifier are treated like ProxyAdmin (owner-based, not proxy-based)
- Shows "Owner" label instead of "Proxy Admin"
- Hides "Implementation" field (not applicable for non-proxy contracts)
- Shows only "Transfer Owner" button (no "Upgrade Impl" button)
- Modal dialogs updated in both L1Contracts.tsx and Predeploys.tsx

### WorkloadVerifier Contract (L1)
- Added WorkloadVerifier at `0xAA69125d32Db5b7Ec15A5cD69b9879c7AA0d3DA0`
- Manageable contract with owner (not a proxy, no implementation)
- View functions: dcapAttestation, snpAttestation, tpmAttestation (all return addresses)
- Category: tee
- Created WORKLOAD_VERIFIER_ABI with 3 view functions + owner
- Environment variable: `REACT_APP_L1_WORKLOAD_VERIFIER_ADDRESS`

### Contract Ownership Graph
- Created `OwnershipGraph` component to visualize contract ownership hierarchy
- **Features**:
  - Displays ownership chain: EOA → ProxyAdmin → Managed Contracts
  - Queries ProxyAdmin's owner in real-time
  - Groups contracts by their proxy admin
  - **Owner-Based Contracts**: Separate section for contracts with direct owner() (not proxy-based)
    - ProxyAdmin, ProverRegistry, WorkloadVerifier
    - Displays: Owner → Contracts (direct ownership)
    - **Groups contracts by owner**: Multiple contracts with same owner shown together
  - Shows unmanaged contracts separately
  - **Color-coded nodes** (consistent coloring rules):
    - **Purple**: EOAs (owners at the top of hierarchy)
    - **Pink**: Contracts that manage other contracts (only ProxyAdmin)
    - **Light Blue**: All other contracts (proxy-based, owner-based, unmanaged contracts)
  - Responsive design with hover effects
  - **Copyable addresses**: Click any address to copy with visual feedback (checkmark)
  - Positioned below contract cards for better UX flow
- **Implementation**:
  - New component: `src/components/OwnershipGraph.tsx`
  - Styling: `src/components/OwnershipGraph.css`
  - Integrated into both **L2 Predeploys** and **L1 Contracts** pages
  - Uses viem to query ProxyAdmin contract for owner and admin addresses
  - Distinguishes proxy-based vs owner-based contracts using `isOwnerBased` property
  - Queries owner-based contracts' owner() directly instead of through ProxyAdmin
  - Visual arrows showing ownership flow
  - Three sections: Managed Contracts (proxy-based), Owner-Based Contracts, Non-Managed Contracts

## Recent Updates (January 2026)

### Emergency Pause/Unpause Call Flow Graph (NEW)
- **Purpose**: Visualizes the emergency pause mechanism control flow in Optimism
- **Components**:
  - **Guardian**: (Purple) EOA/Multi-sig that can trigger pause/unpause
  - **SuperchainConfig**: (Pink) Central pause authority that stores pause state
  - **SystemConfig**: (Orange/Pink) Pause state router
  - **OptimismPortal**: (Light Blue) Consumer that blocks withdrawals when paused (allows deposits)
  - **L1StandardBridge**: (Light Blue) Consumer that blocks all bridging when paused
- **Features**:
  - Visual flow with directional arrows
  - Write arrows (↓) for pause/unpause triggers
  - Read arrows (↑) for state checks
  - Color-coded nodes by role
  - Key information panel with pause mechanics summary
  - Legend explaining arrow types
  - Contract effects displayed (what gets blocked vs allowed)
- **Implementation**:
  - New component: `src/components/PauseFlowGraph.tsx`
  - Styling: `src/components/PauseFlowGraph.css`
  - Integrated into L1 Contracts page below ownership graph
  - Dynamically fetches Guardian address from SuperchainConfig
- **Control Flow**:
  1. Guardian triggers pause/unpause on SuperchainConfig
  2. SuperchainConfig stores pause state
  3. SystemConfig reads pause state from SuperchainConfig
  4. OptimismPortal and L1StandardBridge check SystemConfig for pause state
- **Key Information Displayed**:
  - Who can pause: Only Guardian
  - Pause duration: Max 3 months (auto-expiry)
  - Asymmetric control: Blocks withdrawals, allows deposits

### Ownership Graph Improvements
- **Removed section headers**: Cleaner UI - only main "Contract Ownership Graph" title remains
- **Simplified EOA label**: Changed "EOA (ProxyAdmin Owner)" to just "Owner" (purple color indicates EOA)
- **Consistent color scheme**:
  - Purple: EOAs/Owners
  - Pink: Contracts that manage others (only ProxyAdmin)
  - Light blue: All other contracts (proxy-based, owner-based, unmanaged)
- **Grouped owner-based contracts**: Contracts sharing same owner displayed together

### EthLockbox Removal
- Removed EthLockbox contract from L1 contracts list
- Removed all references from:
  - Contract configuration (l1contracts.ts)
  - ABIs (l1abis.ts)
  - Environment files (.env, .env.example)
  - OptimismPortal view functions

### SystemConfig Enhancements
- Added `guardian` view function - displays guardian address
- Added `superchainConfig` view function - displays SuperchainConfig contract address

### SuperchainConfig Contract (NEW)
- **Address**: Configurable via `REACT_APP_L1_SUPERCHAIN_CONFIG_ADDRESS`
- **Description**: Superchain configuration and pause management
- **View Functions**:
  - `version` - Contract version
  - `guardian` - Guardian address
  - `pauseExpiry` - Pause expiry duration in seconds
  - **Pause State Queries** (with parameterized functions):
    - `ALL PAUSED` - Global pause state (queries `paused(address(0))`)
    - `PORTAL PAUSED` - OptimismPortal pause state (queries `paused(PORTAL_ADDRESS)`)
    - `All Pause Expiration` - Global pause expiration timestamp (only shown if paused)
    - `Portal Pause Expiration` - Portal pause expiration timestamp (only shown if paused)
- **Implementation Details**:
  - Added support for parameterized view functions
  - Special handling in `getViewFunctionData` for functions requiring address parameters
  - Conditional display: Expiration fields only shown when corresponding pause state is true
  - Similar pattern to DisputeGameFactory and ProverRegistry special handling

## Next Steps

1. Test all L1 contracts functionality
2. Update README with L1 contracts documentation
3. Consider adding more view functions to contracts as needed

## Notes
- Build size: ~124.4 kB (gzipped)
- All builds completing successfully
- All timestamps formatted in English (en-US) locale with 12-hour format
- **UniFiFeeVault ABI fixed**: Added dedicated ABI with l2Owner, withdrawalNetworkL2Owner, percentageL2Owner, l1UniFiRewardDistributorContract, minWithdrawalAmount, and totalProcessed functions
- No TypeScript errors (only minor warnings)
- All L1 contract addresses now fully configurable via environment variables
- Signal Service contracts added for both L1 and L2
- ProverRegistry added for TEE attestation and prover management
- TEE category added for Trusted Execution Environment contracts
- Attested provers mapping fully implemented:
  - Queries start at instance ID 1 (not 0)
  - Each ProverInstance expanded into separate fields for display
  - Golden measurement validity check: only displays provers with registered measurements
  - Golden measurement details displayed instead of just hash
  - Proper enum mappings for TEEType, ELType, and CloudType
- **Owner-Based Contract Handling**:
  - Added `isOwnerBased` property to Predeploy type
  - ProxyAdmin, ProverRegistry, and WorkloadVerifier marked as owner-based
  - OwnershipGraph now correctly handles both proxy-based and owner-based contracts
  - Owner-based contracts displayed in separate "Owner-Based Contracts" section
  - Queries owner() directly instead of through ProxyAdmin for these contracts
  - **Groups by owner**: Contracts sharing the same owner are grouped under one owner node

### Chain Status Page (NEW)
- **Purpose**: Monitor critical chain roles and block information
- **Formerly**: Block Monitor page (renamed to Chain Status)
- **Features**:
  - **Role Monitoring**: Real-time monitoring of Batcher and Proposer
  - **Block Information**: Block data across all RPC endpoints (Gateway, Main Node, TEE Node)
  - Refresh functionality for manual updates
- **Implementation**:
  - New page: `src/pages/ChainStatus.tsx` (renamed from BlockMonitor.tsx)
  - Styling: `src/pages/ChainStatus.css` (renamed from BlockMonitor.css)
  - Updated App.tsx routing and navigation
  - Build size: ~123.77 kB (gzipped, +1.23 kB)

#### RoleMonitor Component (NEW)
- **Purpose**: Monitor Batcher and Proposer activity and balance on L1
- **Monitored Roles**: Configurable via environment variables
  - **Batcher**: `REACT_APP_BATCHER_ADDRESS`
  - **Proposer**: `REACT_APP_PROPOSER_ADDRESS`
  - Warning banner displayed if addresses are missing
- **Activity Monitoring**:
  - **Primary method**: Fetches transaction history via Block Explorer API (Etherscan v2)
    - Queries most recent transaction directly from account history
    - Extremely fast (instant) regardless of transaction age
    - Uses `REACT_APP_L1_EXPLORER_API_URL` and `REACT_APP_L1_EXPLORER_API_KEY`
    - Automatically queries chain ID from RPC and passes to v2 API (supports all chains)
  - **Fallback method**: Scans recent L1 blocks via RPC if API unavailable
    - Checks last 100 blocks only (reduced from 1000 for faster fallback)
    - Sequential block checking
  - 6 warning levels: 5, 30, 60, 240, 720, 1440 minutes (1440 most severe)
  - Displays last transaction timestamp and time since
  - Color-coded warnings: Medium (yellow), High (orange), Critical (red)
  - Special handling: "No recent transaction found" = Level 6
- **Balance Monitoring**:
  - Queries L1 ETH balance using viem
  - 5 warning levels: 5, 2.5, 1, 0.5, 0.25 ETH (0.25 most severe)
  - Displays balance with 4 decimal places
  - Same color-coded warning system
- **Auto-Refresh**: Updates every 30 seconds automatically
- **UI/UX**:
  - Warning level text removed - color coding provides sufficient visual indication
  - Warning colors: Yellow (medium), Orange (high), Red (critical)
  - **Copyable addresses**: Click on role address to copy to clipboard (shows checkmark feedback)
  - **Transaction links**: Last transaction timestamp is clickable, opens transaction on block explorer in new tab
    - Uses `REACT_APP_L1_EXPLORER_BASE_URL` (e.g., https://hoodi.etherscan.io for Hoodi network)
- **Implementation**:
  - Component: `src/components/RoleMonitor.tsx`
  - Styling: `src/components/RoleMonitor.css`
  - Uses viem's `createPublicClient`, `getBalance`, and `getBlock`
  - Integrated into Chain Status page with two instances (one per role)
  - Positioned below Block Information section
- **Warning Level Logic**:
  - Activity: Checks time since last transaction against threshold array (descending order)
  - Balance: Checks ALL thresholds to find the most severe one (lowest threshold) that balance is below
    - Below 5 ETH but ≥ 2.5 ETH = Level 1 (least severe, yellow)
    - Below 2.5 ETH but ≥ 1 ETH = Level 2 (yellow)
    - Below 1 ETH but ≥ 0.5 ETH = Level 3 (orange)
    - Below 0.5 ETH but ≥ 0.25 ETH = Level 4 (orange)
    - Below 0.25 ETH = Level 5 (most severe, red)
  - Message displays the most severe threshold exceeded
  - Levels mapped to CSS classes: 1-2 = medium, 3-4 = high, 5+ = critical

### Collapsible Attested Provers (ProverRegistry) (NEW)
- **Purpose**: Improve UI readability for growing list of attested provers
- **Implementation**:
  - Added collapsible/expandable sections for each attested prover
  - Click-to-expand/collapse functionality with visual indicators (▶/▼ arrows)
  - Shows prover address summary when collapsed (e.g., `0xBfA7...0D22`)
  - Shows all fields when expanded (Address, Valid Until, TEE Type, EL Type, Golden Measurement details)
  - State management using React hooks: `useState<Set<string>>` to track expanded provers
  - All provers collapsed by default for cleaner initial view
- **Styling**:
  - Added `.attested-prover-section`: Card-like container with border
  - Added `.attested-prover-header`: Clickable header with hover effect
  - Added `.expand-icon`: Arrow icons (▶ collapsed, ▼ expanded)
  - Added `.prover-title`: Bold section title
  - Added `.prover-summary`: Monospace address display when collapsed
  - Added `.prover-field`: Indented field rows when expanded
- **Component Changes**:
  - Modified `ContractCard.tsx` (lines 256-358)
  - Added `ContractCard.css` (lines 203-251)
- **UX Improvements**:
  - Reduced vertical space usage significantly
  - Cleaner presentation of prover information
  - All fields remain accessible with one click
  - Maintained copyable functionality for all fields

### Wallet Connection & Transaction Execution (NEW)
- **Purpose**: Enable users to execute blockchain transactions directly from the dashboard
- **Wallet Integration**:
  - Added wagmi v1 integration with InjectedConnector for MetaMask and browser wallets
  - Created `ConnectWallet` component with connect/disconnect functionality
  - Added to navbar for easy access across all pages
  - Shows connected wallet address (shortened format: `0xBfA7...0D22`)
  - **Auto-connect disabled**: Requires explicit user action to connect wallet
- **Transaction Execution**:
  - Updated fee vault withdrawal to send actual blockchain transactions
  - Uses `useSendTransaction` and `useWaitForTransaction` hooks from wagmi
  - Prompts MetaMask for transaction approval
  - Transaction hash extraction: Handles object format from wagmi (`{hash: "0x..."}`)
  - Error handling for transaction failures
- **Transaction Success Modal**:
  - Shows immediately after transaction submission (doesn't wait for mining)
  - Displays transaction hash (shortened with full copy functionality)
  - "View on Explorer" button opens transaction in new tab
  - Configurable L2 explorer URL via `REACT_APP_L2_EXPLORER_URL`
  - Modal can be closed without reopening (hash tracking with `Set<string>`)
- **Auto-refresh After Transaction**:
  - Contract data automatically refreshes 3 seconds after transaction submission
  - Allows time for transaction to be mined before showing updated data
  - Uses React key prop with `refreshKey` state to force component re-render
- **Environment Variables**:
  - `REACT_APP_L2_EXPLORER_URL`: L2 block explorer URL (default: https://testnet-unifi-explorer.puffer.fi)
- **Implementation Files**:
  - `src/config/wagmi.ts`: Wagmi configuration with InjectedConnector
  - `src/components/ConnectWallet.tsx`: Wallet connection component
  - `src/components/ConnectWallet.css`: Wallet button styling
  - `src/components/TransactionSuccessModal.tsx`: Success popup component
  - `src/components/TransactionSuccessModal.css`: Modal styling
  - `src/pages/Predeploys.tsx`: Updated withdrawal handler with transaction execution
- **Key Features**:
  - Permissionless withdrawals: Anyone can trigger fee vault withdrawals (funds go to configured recipient)
  - Real-time transaction status tracking with loading states
  - Professional UI/UX with color-coded feedback
  - Prevents duplicate modals for same transaction hash
  - Clean production code (all debug logs removed)
- **Build Stats**: 131.82 kB (main bundle size, gzipped)

### Test Custom RPC Feature (NEW)
- **Purpose**: Quickly test block information from any custom RPC endpoint
- **Location**: Chain Status page → Block Information section
- **Features**:
  - "Test Custom RPC" button next to Block Information section header
  - Opens modal with RPC URL input field
  - Press Enter or click "Test" button to fetch block data
  - Displays block information for all three tags: latest, safe, finalized
  - Shows block number, hash (with copy functionality), and timestamp
  - Error handling for invalid or unreachable endpoints
- **Use Cases**:
  - Quickly verify if a custom RPC endpoint is working
  - Compare block data between different RPC providers
  - Debug RPC connectivity issues
- **Implementation**:
  - Added `TestRpcModal` component in `ChainStatus.tsx`
  - Added `TestBlockDisplay` component for rendering results
  - Added CSS styling for modal and button in `ChainStatus.css`
  - Reuses existing `getBlockByTag` utility function from `utils/rpc.ts`
