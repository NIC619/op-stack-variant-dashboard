import { createConfig, configureChains, mainnet } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { publicProvider } from 'wagmi/providers/public';

// Configure chains and providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet], // Fallback chain, users will override via wallet
  [publicProvider()],
);

// Create wagmi config with connectors
export const wagmiConfig = createConfig({
  autoConnect: false, // Don't auto-connect, require user action
  connectors: [
    new InjectedConnector({
      chains,
      options: {
        name: 'Injected',
        shimDisconnect: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});
