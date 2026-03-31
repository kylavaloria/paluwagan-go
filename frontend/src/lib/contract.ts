import {
  Account,
  BASE_FEE,
  Memo,
  Networks,
  Operation,
  rpc,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { NETWORK } from "../config/env";
import {
  assertFreighterTestnet,
  connectWallet,
  getWalletAddress,
} from "./freighter";
import { getContractId, getNetworkPassphrase, getServer } from "./stellar";

export type Group = {
  name: string;
  creator: string;
  organizer_role: string;
  payout_order_mode: string;
  contribution_amount: string | number;
  max_members: number;
  current_members: number;
  schedule: string;
  payout_type: string;
  visibility: string;
  status: string;
  current_cycle: number;
  total_cycles: number;
  locked: boolean;
  interest_bps: number;
  cycle_ledger_gap: number;
  cycle_due_ledger: number;
};

export type PayoutState =
  | "NotReleased"
  | "ReleasedByOrganizer"
  | "ReceivedConfirmedByRecipient"
  | string;

export type UserTrust = {
  joined_groups: number;
  completed_groups: number;
  missed_payments: number;
  late_payments: number;
  defaulted_groups: number;
  reliability_score: number | null;
};

export type ListedGroup = {
  id: number;
  group: Group;
};

const NETWORK_PASSPHRASE = Networks.TESTNET;
const READ_SIM_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function toU32(value: number): xdr.ScVal {
  return xdr.ScVal.scvU32(value);
}

function toAddress(value: string): xdr.ScVal {
  if (!StrKey.isValidEd25519PublicKey(value)) {
    throw new Error(`Invalid Stellar public key: ${value}`);
  }
  return nativeToScVal(value, { type: "address" });
}

function toStringVal(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

/** Soroban `CreateGroupParams` (`contracttype`): XDR map with symbol keys. */
const CREATE_GROUP_PARAMS_ENTRY_TYPES: Record<string, [string, string]> = {
  contribution_amount: ["symbol", "i128"],
  custom_cycle_ledger_gap: ["symbol", "u32"],
  interest_bps: ["symbol", "u32"],
  is_public: ["symbol", "bool"],
  max_members: ["symbol", "u32"],
  name: ["symbol", "string"],
  organizer_role: ["symbol", "symbol"],
  payout_order_mode: ["symbol", "symbol"],
  payout_type: ["symbol", "symbol"],
  schedule: ["symbol", "symbol"],
};

function toCreateGroupParamsScVal(
  name: string,
  organizerRole: "org_only" | "org_member",
  payoutOrderMode: "join_order" | "randomized",
  contributionAmount: bigint | number | string,
  maxMembers: number,
  schedule: string,
  payoutType: string,
  isPublic: boolean,
  interestBps: number,
  customCycleLedgerGap: number,
): xdr.ScVal {
  return nativeToScVal(
    {
      contribution_amount: BigInt(contributionAmount),
      custom_cycle_ledger_gap: customCycleLedgerGap,
      interest_bps: interestBps,
      is_public: isPublic,
      max_members: maxMembers,
      name,
      organizer_role: organizerRole,
      payout_order_mode: payoutOrderMode,
      payout_type: payoutType,
      schedule,
    },
    { type: CREATE_GROUP_PARAMS_ENTRY_TYPES },
  );
}

function asErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function normalizeNative(value: unknown): unknown {
  if (value && typeof value === "object" && "tag" in value) {
    const tag = (value as { tag?: unknown }).tag;
    if (typeof tag === "string" && tag.length > 0) {
      return tag;
    }
  }

  if (value instanceof Map) {
    return Object.fromEntries(Array.from(value.entries()).map(([k, v]) => [k, normalizeNative(v)]));
  }

  if (Array.isArray(value)) {
    return value.map(normalizeNative);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [k, normalizeNative(v)]);
    return Object.fromEntries(entries);
  }

  return value;
}

/** Soroban/Rust enums often decode into `u32` discriminants — map to variant names used in the UI. */
function coerceRustEnum<T extends readonly string[]>(value: unknown, variants: T): string {
  if (typeof value === "string") {
    if ((variants as readonly string[]).includes(value)) return value;
    if (/^[0-9]+$/.test(value)) {
      const n = parseInt(value, 10);
      if (n >= 0 && n < variants.length) return variants[n]!;
    }
    return value;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    const n = value;
    if (n >= 0 && n < variants.length) return variants[n]!;
    return String(value);
  }

  if (typeof value === "bigint") {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 0 && n < variants.length) return variants[n]!;
    return value.toString();
  }

  return String(value);
}

function normalizeGroupFromChain(raw: unknown): Group {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid group response from contract.");
  }
  const g = raw as Record<string, unknown>;
  return {
    ...g,
    name: typeof g.name === "string" ? g.name : "",
    visibility: coerceRustEnum(g.visibility, ["Public", "Private"] as const),
    status: coerceRustEnum(g.status, ["WaitingForMembers", "Active", "Completed"] as const),
    organizer_role: coerceRustEnum(g.organizer_role, ["OrganizerOnly", "OrganizerAsMember"] as const),
    payout_order_mode: coerceRustEnum(g.payout_order_mode, ["JoinOrder", "Randomized"] as const),
  } as Group;
}

function parseSimulationResult<T>(sim: rpc.Api.SimulateTransactionResponse): T {
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Contract simulation failed: ${asErrorMessage(sim.error)}`);
  }

  const retval = sim.result?.retval;
  if (!retval) {
    return undefined as T;
  }

  return normalizeNative(scValToNative(retval)) as T;
}

function buildUnsignedTx(source: Account, method: string, args: xdr.ScVal[]) {
  const op = Operation.invokeContractFunction({
    contract: getContractId(),
    function: method,
    args,
  });

  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
    memo: Memo.none(),
  })
    .addOperation(op)
    .setTimeout(60)
    .build();
}

async function prepareWriteTx(source: Account, method: string, args: xdr.ScVal[]) {
  const tx = buildUnsignedTx(source, method, args);
  const simulated = await getServer().simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Contract simulation failed: ${asErrorMessage(simulated.error)}`);
  }

  return rpc.assembleTransaction(tx, simulated).build();
}

async function simulateRead<T>(method: string, args: xdr.ScVal[]): Promise<T> {
  const source = new Account(READ_SIM_SOURCE, "0");
  const tx = buildUnsignedTx(source, method, args);
  const sim = await getServer().simulateTransaction(tx);
  return parseSimulationResult<T>(sim);
}

async function waitForSuccess(hash: string): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const server = getServer();

  for (let i = 0; i < 20; i += 1) {
    const status = await server.getTransaction(hash);

    if (status.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return status as rpc.Api.GetSuccessfulTransactionResponse;
    }

    if (status.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Contract transaction failed on-chain: ${asErrorMessage(status)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  throw new Error("Timed out waiting for Soroban transaction result.");
}

async function submitWrite<T>(method: string, args: xdr.ScVal[]): Promise<T> {
  if (NETWORK !== "testnet") {
    throw new Error(`Invalid app network: "${NETWORK}". Expected "testnet".`);
  }

  await assertFreighterTestnet();
  await connectWallet();
  const walletAddress = await getWalletAddress();

  const account = await getServer().getAccount(walletAddress);
  const tx = await prepareWriteTx(account, method, args);

  const signed = await signTransaction(tx.toXDR(), {
    address: walletAddress,
    networkPassphrase: getNetworkPassphrase(),
  });

  if (typeof signed !== "string" && signed.error) {
    throw new Error(`Freighter signing failed: ${asErrorMessage(signed.error)}`);
  }

  const signedXdr = typeof signed === "string" ? signed : signed.signedTxXdr;
  if (!signedXdr) {
    throw new Error("Freighter did not return a signed transaction XDR.");
  }

  const signedTx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());
  const sent = await getServer().sendTransaction(signedTx);

  if (sent.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${asErrorMessage(sent.errorResult)}`);
  }

  if (!sent.hash) {
    throw new Error(`Transaction submission returned no hash: ${asErrorMessage(sent)}`);
  }

  const txResult = await waitForSuccess(sent.hash);
  if (!txResult.returnValue) {
    return undefined as T;
  }

  return normalizeNative(scValToNative(txResult.returnValue)) as T;
}

// write functions (require signature)
export async function createGroup(
  creator: string,
  name: string,
  organizerRole: "org_only" | "org_member",
  payoutOrderMode: "join_order" | "randomized",
  contributionAmount: bigint | number | string,
  maxMembers: number,
  schedule: string,
  payoutType: string,
  isPublic: boolean,
  interestBps: number,
  customCycleLedgerGap: number,
): Promise<number> {
  return submitWrite<number>("create_group", [
    toAddress(creator),
    toCreateGroupParamsScVal(
      name,
      organizerRole,
      payoutOrderMode,
      contributionAmount,
      maxMembers,
      schedule,
      payoutType,
      isPublic,
      interestBps,
      customCycleLedgerGap,
    ),
  ]);
}

export async function inviteUser(groupId: number, creator: string, user: string): Promise<void> {
  await submitWrite<void>("invite_user", [toU32(groupId), toAddress(creator), toAddress(user)]);
}

export async function joinGroup(groupId: number, user: string): Promise<void> {
  await submitWrite<void>("join_group", [toU32(groupId), toAddress(user)]);
}

export async function lockGroup(groupId: number, creator: string): Promise<void> {
  await submitWrite<void>("lock_group", [toU32(groupId), toAddress(creator)]);
}

export async function generatePayoutOrder(groupId: number, creator: string): Promise<void> {
  await submitWrite<void>("generate_payout_order", [toU32(groupId), toAddress(creator)]);
}

export async function confirmPaymentSender(groupId: number, cycle: number, sender: string): Promise<void> {
  await submitWrite<void>("confirm_payment_sender", [toU32(groupId), toU32(cycle), toAddress(sender)]);
}

export async function confirmPaymentReceiver(
  groupId: number,
  cycle: number,
  receiver: string,
  sender: string,
): Promise<void> {
  await submitWrite<void>("confirm_payment_receiver", [
    toU32(groupId),
    toU32(cycle),
    toAddress(receiver),
    toAddress(sender),
  ]);
}

export async function markMissedPayments(groupId: number, creator: string): Promise<void> {
  await submitWrite<void>("mark_missed_payments", [toU32(groupId), toAddress(creator)]);
}

export async function releaseCyclePayout(groupId: number, creator: string): Promise<string> {
  return submitWrite<string>("release_cycle_payout", [toU32(groupId), toAddress(creator)]);
}

export async function confirmPayoutReceived(groupId: number, cycle: number, recipient: string): Promise<void> {
  await submitWrite<void>("confirm_payout_received", [
    toU32(groupId),
    toU32(cycle),
    toAddress(recipient),
  ]);
}

export async function advanceCycle(groupId: number, creator: string): Promise<void> {
  await submitWrite<void>("advance_cycle", [toU32(groupId), toAddress(creator)]);
}

export async function setUsername(user: string, username: string): Promise<void> {
  await submitWrite<void>("set_username", [toAddress(user), toStringVal(username)]);
}

// read functions (no signature)
export async function getGroup(groupId: number): Promise<Group> {
  const raw = await simulateRead<unknown>("get_group", [toU32(groupId)]);
  return normalizeGroupFromChain(raw);
}

export async function getGroupMembers(groupId: number): Promise<string[]> {
  return simulateRead<string[]>("get_group_members", [toU32(groupId)]);
}

export async function getPayoutOrder(groupId: number): Promise<string[]> {
  return simulateRead<string[]>("get_payout_order", [toU32(groupId)]);
}

export async function getPayoutState(groupId: number, cycle: number): Promise<PayoutState> {
  const raw = await simulateRead<unknown>("get_payout_state", [toU32(groupId), toU32(cycle)]);
  return coerceRustEnum(raw, [
    "NotReleased",
    "ReleasedByOrganizer",
    "ReceivedConfirmedByRecipient",
  ] as const);
}

export async function getUserTrust(address: string): Promise<UserTrust> {
  return simulateRead<UserTrust>("get_user_trust", [toAddress(address)]);
}

export async function getUsername(address: string): Promise<string | null> {
  const raw = await simulateRead<unknown>("get_username", [toAddress(address)]);
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export async function getUsernameOwner(username: string): Promise<string | null> {
  const raw = await simulateRead<unknown>("get_username_owner", [toStringVal(username)]);
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export async function listPublicGroups(startId: number, limit: number): Promise<ListedGroup[]> {
  const raw = await simulateRead<unknown[]>("list_public_groups", [toU32(startId), toU32(limit)]);
  if (!Array.isArray(raw)) return [];

  return raw.map((entry) => {
    const e = entry as { id?: unknown; group?: unknown };
    const id = typeof e.id === "number" ? e.id : parseInt(String(e.id ?? "0"), 10);
    const group = normalizeGroupFromChain(e.group);
    return { id, group };
  });
}

export async function getPaymentStatus(
  groupId: number,
  cycle: number,
  sender: string,
): Promise<"Unpaid" | "PendingConfirmation" | "Confirmed" | string> {
  const raw = await simulateRead<unknown>("get_payment_status", [
    toU32(groupId),
    toU32(cycle),
    toAddress(sender),
  ]);
  return coerceRustEnum(raw, ["Unpaid", "PendingConfirmation", "Confirmed"] as const);
}

export async function verifyPayment(groupId: number, cycle: number, sender: string): Promise<boolean> {
  return simulateRead<boolean>("verify_payment", [toU32(groupId), toU32(cycle), toAddress(sender)]);
}

/*
Example usage:

await connectWallet();
await createGroup(
  "G...CREATOR",
  "My group",
  "org_member",
  "join_order",
  10000000,
  5,
  "weekly",
  "fixed",
  true,
  0,
  0,
);
const group = await getGroup(1);
*/


