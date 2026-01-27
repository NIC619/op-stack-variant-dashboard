# Project Context

UniFi Monitor & Management Frontend – Admin dashboard for monitoring and managing L1/L2 contracts and block information for the UniFi OP Stack chain.

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- wagmi + viem for wallet and contract interactions
- TanStack React Query
- React Router
- Pure CSS (no CSS framework)

**Testing:**
- Jest + React Testing Library (via `react-scripts test`)

## Project Structure

```text
project-root/
├── src/                     # Frontend code
│   ├── components/          # React components (cards, role monitors, UI widgets)
│   ├── pages/               # Top-level pages (Block monitor, Predeploys, Chain status, etc.)
│   ├── config/              # Chain configs, wagmi config, L1/L2 contract lists & ABIs
│   ├── utils/               # RPC utilities, contract helpers, ABIs
│   ├── types/               # Shared TypeScript types
│   └── index.tsx            # App entrypoint
├── public/                  # Static assets
├── .env.example             # Required environment variables
├── package.json             # Frontend dependencies & scripts
└── README.md                # Detailed project docs
```

> Note: Solidity contracts, Hardhat/Foundry configs, and deployment scripts live in separate UniFi contract repositories. This repo is frontend-only.

## Development Commands

**Setup:**
```bash
npm install --legacy-peer-deps
cp .env.example .env  # Configure RPC endpoints, L1/L2 contract addresses, role addresses
```

**Frontend:**
```bash
npm start                       # Start dev server (http://localhost:3000)
npm run build                   # Build for production
npm test                        # React tests
```

## Key Patterns

**Frontend Integration:**
- Use wagmi hooks for wallet connection and contract reads/writes
- Use viem for low-level RPC, log queries, and typed contract calls
- Use TanStack React Query for caching, loading states, and refetching
- Handle transaction states explicitly (idle, pending, success, error) with clear user feedback
- Keep chain configuration, addresses, and ABIs centralized in `src/config/`

**Security Considerations:**
- Frontend should never expose private keys or sensitive secrets
- RPC endpoints and explorer API keys are configured via `.env` and proxied through `/api/*` routes when needed
- For on-chain changes (upgrades, ownership transfers), show calldata clearly so multisig/DAO can review

## Important Files

- `src/config/wagmi.ts` – Wagmi configuration and chain setup
- `src/utils/rpc.ts` – RPC endpoint configuration and helpers (`getBlockByTag`, `fetchBlockData`)
- `src/utils/contracts.ts` – Contract interaction utilities (owner/admin, implementation, balances, view calls)
- `src/config/predeploys.ts` – L2 predeploy contract metadata
- `src/config/l1contracts.ts` – L1 contract metadata
- `.env.example` – Required environment variables (L1/L2 RPC URLs, role addresses, contract addresses)

## Useful Links

- Deployment addresses / explorers: configured via `.env` (`REACT_APP_L1_EXPLORER_BASE_URL`, `REACT_APP_L2_EXPLORER_URL`)
- Project documentation: see `README.md` in this repo
- Audit reports: refer to UniFi protocol docs / security repositories for contract audits

