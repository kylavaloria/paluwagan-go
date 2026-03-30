const DEFAULT_NETWORK = "testnet";
const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";

const contractId = (import.meta.env.VITE_CONTRACT_ID as string | undefined)?.trim();
if (!contractId) {
  throw new Error(
    "VITE_CONTRACT_ID is not set. Add it to frontend/.env (see .env.example).",
  );
}

export const CONTRACT_ID = contractId;

export const NETWORK = ((import.meta.env.VITE_NETWORK as string | undefined)?.trim()
  || DEFAULT_NETWORK).toLowerCase();

if (NETWORK !== "testnet") {
  throw new Error(
    `Unsupported network "${NETWORK}". This frontend is configured for Stellar Testnet only.`,
  );
}

export const RPC_URL = TESTNET_RPC_URL;
