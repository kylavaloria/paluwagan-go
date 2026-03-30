import { Wallet, LogOut, Loader } from "lucide-react";
import { useWallet } from "../hooks/useWallet";

export default function WalletButton() {
  const { address, isConnecting, isAvailable, connect, disconnect, shortAddress } = useWallet();

  if (isAvailable === false) {
    return (
      <a
        href="https://www.freighter.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn--secondary btn--sm"
      >
        <Wallet size={14} />
        Install Wallet
      </a>
    );
  }

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="address-copy" title={address}>
          <Wallet size={14} />
          {shortAddress}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={disconnect} title="Disconnect">
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn btn--primary btn--sm"
      onClick={connect}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <>
          <Loader size={14} className="btn-spinner" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet size={14} />
          Connect Wallet
        </>
      )}
    </button>
  );
}
