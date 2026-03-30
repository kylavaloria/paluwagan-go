import {
  Contract,
  Networks,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { CONTRACT_ID, RPC_URL } from "../config/env";

const server = new rpc.Server(RPC_URL, { allowHttp: false });

export function getServer(): rpc.Server {
  return server;
}

export function getContractId(): string {
  return CONTRACT_ID;
}

export function getNetworkPassphrase(): string {
  return Networks.TESTNET;
}

export function getContract(): Contract {
  return new Contract(CONTRACT_ID);
}

export function buildInvokeOp(method: string, args: xdr.ScVal[] = []) {
  return getContract().call(method, ...args);
}

/** Current Soroban ledger sequence from RPC (for comparing with `group.cycle_due_ledger`). */
export async function getLatestLedgerSequence(): Promise<number> {
  const res = await getServer().getLatestLedger();
  return res.sequence;
}

