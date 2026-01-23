import { useAccount, useConnect, useDisconnect } from 'wagmi';
import './ConnectWallet.css';

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">{shortenAddress(address)}</span>
        <button className="btn-disconnect" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-disconnected">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          className="btn-connect"
          onClick={() => connect({ connector })}
        >
          Connect Wallet
        </button>
      ))}
    </div>
  );
}
