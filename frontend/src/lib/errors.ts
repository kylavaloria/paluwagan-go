/**
 * Friendly error messages for contract and wallet errors.
 * Maps known error strings/codes to plain-language explanations.
 */

const CONTRACT_ERROR_MAP: Record<string, string> = {
  // Contract error codes (appear as "Error(Contract, #N)")
  "1": "We couldn't find that group. Double-check the group number or link.",
  "2": "You don't have permission to do this.",
  "3": "This group has already started — no further changes can be made.",
  "4": "This group is full — no more spots available.",
  "5": "You're already a member of this group!",
  "6": "This is a private group. You'll need an invite from the organizer.",
  "7": "This action can't be done right now based on the group's current status.",
  "8": "Not all payments have been confirmed yet.",
  "9": "The payout for this round has already been released.",
  "10": "This action doesn't match the current round.",
  "11": "This payment has already been confirmed.",
  "12": "The payout order has already been set.",
  "13": "All spots need to be filled before you can start the group.",
  "14": "That wallet isn't the payout recipient for this round.",
  "15": "Invalid organizer role selected.",
  "16": "Invalid payout order mode selected.",
  "17": "Please specify a valid cycle gap when using a custom schedule.",
  "18": "The deadline hasn't passed yet — you can only mark missed payments after the due date.",
  "19": "Choose a group name between 1 and 50 characters.",
  "20": "The organizer hasn't released the payout for this round yet.",
  "21": "The recipient must confirm they received the payout before the group can advance to the next round.",
};

const WALLET_ERROR_PATTERNS: Array<[RegExp, string]> = [
  [/not detected|not found|not installed/i, "To use Paluwagan Go, you'll need the Freighter wallet extension. Install it from the Chrome Web Store and refresh this page."],
  [/switch to testnet|wrong network|not.*testnet/i, "Please switch your Freighter wallet to Testnet to continue."],
  [/cancel|reject|denied|declined/i, "Transaction was cancelled. No changes were made."],
  [/timed out/i, "The transaction is taking longer than expected. Please try again."],
  [/simulation failed/i, "Something went wrong while preparing the transaction. Please try again."],
];

export function friendlyError(error: unknown): string {
  const raw = extractRawMessage(error);

  // Check for contract error codes: "Error(Contract, #4)" or similar patterns
  const contractCodeMatch = raw.match(/Error\(Contract,\s*#?(\d+)\)/i)
    || raw.match(/ContractError\((\d+)\)/i)
    || raw.match(/contract.*error.*?(\d+)/i);

  if (contractCodeMatch) {
    const code = contractCodeMatch[1];
    if (CONTRACT_ERROR_MAP[code]) {
      return CONTRACT_ERROR_MAP[code];
    }
  }

  // Check for wallet error patterns
  for (const [pattern, message] of WALLET_ERROR_PATTERNS) {
    if (pattern.test(raw)) {
      return message;
    }
  }

  // Fallback: if the raw message is reasonably short and readable, show it
  if (raw.length > 0 && raw.length < 200 && !raw.includes("xdr") && !raw.includes("ScVal")) {
    return raw;
  }

  return "Something went wrong. Please try again.";
}

function extractRawMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
}
