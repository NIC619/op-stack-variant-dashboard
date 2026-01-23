import './TransactionSuccessModal.css';

interface TransactionSuccessModalProps {
  txHash: string;
  explorerUrl: string;
  contractName: string;
  onClose: () => void;
}

export default function TransactionSuccessModal({
  txHash,
  explorerUrl,
  contractName,
  onClose,
}: TransactionSuccessModalProps) {
  const txUrl = `${explorerUrl}/tx/${txHash}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal transaction-success-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✅ Transaction Submitted!</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="success-message">
            Your transaction to <strong>{contractName}</strong> has been submitted to the network.
          </p>

          <div className="tx-hash-section">
            <label>Transaction Hash:</label>
            <div className="tx-hash">
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </div>
          </div>

          <a
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary explorer-link"
          >
            View on Explorer 🔗
          </a>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
