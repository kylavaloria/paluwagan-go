import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
} from "@stellar/freighter-api";

const WALLET_NOT_FOUND_MESSAGE =
  "Freighter wallet was not detected. Install Freighter and refresh the page.";

function extractErrorMessage(value: unknown): string {
  if (!value) return "Unknown wallet error";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "message" in value) {
    const msg = (value as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return "Unknown wallet error";
}

function assertPublicKey(address: string | undefined): string {
  if (!address) {
    throw new Error("Freighter did not return a public key.");
  }

  if (!address.startsWith("G")) {
    throw new Error(`Unexpected wallet address format: ${address}`);
  }

  return address;
}

export async function isFreighterAvailable(): Promise<boolean> {
  const result = await isConnected();
  return Boolean(result.isConnected);
}

export async function connectWallet(): Promise<string> {
  const available = await isFreighterAvailable();
  if (!available) {
    throw new Error(WALLET_NOT_FOUND_MESSAGE);
  }

  const access = await requestAccess();
  if (access.error) {
    throw new Error(`Freighter connection failed: ${extractErrorMessage(access.error)}`);
  }

  return assertPublicKey(access.address);
}

export async function getWalletAddress(): Promise<string> {
  const available = await isFreighterAvailable();
  if (!available) {
    throw new Error(WALLET_NOT_FOUND_MESSAGE);
  }

  const response = await getAddress();
  if (response.error) {
    throw new Error(`Unable to get wallet address: ${extractErrorMessage(response.error)}`);
  }

  if (!response.address) {
    return connectWallet();
  }

  return assertPublicKey(response.address);
}

export async function assertFreighterTestnet(): Promise<void> {
  const available = await isFreighterAvailable();
  if (!available) {
    throw new Error(WALLET_NOT_FOUND_MESSAGE);
  }

  const network = await getNetwork();
  if (network.error) {
    throw new Error(`Unable to read Freighter network: ${extractErrorMessage(network.error)}`);
  }

  const label = `${network.network ?? ""}`.toLowerCase();
  const passphrase = `${network.networkPassphrase ?? ""}`;

  const looksLikeTestnet = label.includes("test")
    || passphrase.includes("Test SDF Network ; September 2015");

  if (!looksLikeTestnet) {
    throw new Error(
      `Freighter is on "${network.network ?? "unknown"}". Please switch to Testnet.`,
    );
  }
}
