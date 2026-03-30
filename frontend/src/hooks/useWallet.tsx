import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { isFreighterAvailable, connectWallet as freighterConnect, getWalletAddress } from "../lib/freighter";

interface WalletContextValue {
  address: string | null;
  isConnecting: boolean;
  isAvailable: boolean | null;
  connect: () => Promise<string | null>;
  disconnect: () => void;
  shortAddress: string;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Check if Freighter is available on mount
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const available = await isFreighterAvailable();
        if (!cancelled) setIsAvailable(available);

        // If available, try to get existing address silently
        if (available) {
          try {
            const addr = await getWalletAddress();
            if (!cancelled && addr) setAddress(addr);
          } catch {
            // Not connected yet, that's fine
          }
        }
      } catch {
        if (!cancelled) setIsAvailable(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    setIsConnecting(true);
    try {
      const addr = await freighterConnect();
      setAddress(addr);
      return addr;
    } catch {
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  const shortAddress = address ? truncateAddress(address) : "";

  return (
    <WalletContext value={{ address, isConnecting, isAvailable, connect, disconnect, shortAddress }}>
      {children}
    </WalletContext>
  );
}
