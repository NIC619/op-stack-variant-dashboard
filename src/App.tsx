import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { WagmiConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config/wagmi';
import ChainStatusPage from './pages/ChainStatus';
import PredeploysPage from './pages/Predeploys';
import L1ContractsPage from './pages/L1Contracts';
import ConnectWallet from './components/ConnectWallet';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="app-container">
            <nav className="navbar">
              <div className="nav-brand">UniFi Monitor & Management</div>
              <div className="nav-links">
                <Link to="/">Chain Status</Link>
                <Link to="/l2-predeploys">L2 Predeploys</Link>
                <Link to="/l1-contracts">L1 Contracts</Link>
              </div>
              <ConnectWallet />
            </nav>

            <main className="main-content">
              <Routes>
                <Route path="/" element={<ChainStatusPage />} />
                <Route path="/l2-predeploys" element={<PredeploysPage />} />
                <Route path="/l1-contracts" element={<L1ContractsPage />} />
              </Routes>
            </main>
          </div>
        </Router>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default App;
