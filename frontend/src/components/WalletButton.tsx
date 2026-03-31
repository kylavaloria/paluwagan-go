import { Wallet, LogOut, Loader } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { useTranslation } from "react-i18next";

export default function WalletButton() {
  const { address, isConnecting, isAvailable, connect, disconnect, shortAddress } = useWallet();
  const { t } = useTranslation();

  if (isAvailable === false) {
    return (
      <a
        href="https://www.freighter.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn--secondary btn--sm"
      >
        <Wallet size={14} />
        {t("wallet.install")}
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
        <button className="btn btn--ghost btn--sm" onClick={disconnect} title={t("wallet.disconnect")}>
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
          {t("wallet.connecting")}
        </>
      ) : (
        <>
          <Wallet size={14} />
          {t("wallet.connect")}
        </>
      )}
    </button>
  );
}
