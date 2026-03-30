/**
 * localStorage helpers for "My Groups" list.
 * Since the contract doesn't have user→groups mapping,
 * we persist group IDs the user has created or joined locally.
 *
 * IMPORTANT: Storage is keyed by wallet address so each wallet
 * only sees its own groups.
 */

export type GroupRole = "creator" | "member";

export interface StoredGroup {
  id: number;
  role: GroupRole;
  addedAt: number; // timestamp
}

function storageKey(walletAddress: string): string {
  return `paluwagan_my_groups_${walletAddress}`;
}

export function getMyGroups(walletAddress: string): StoredGroup[] {
  if (!walletAddress) return [];
  try {
    const raw = localStorage.getItem(storageKey(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function addMyGroup(walletAddress: string, id: number, role: GroupRole): void {
  if (!walletAddress) return;
  const key = storageKey(walletAddress);
  const groups = getMyGroups(walletAddress);
  // Don't duplicate
  const exists = groups.find((g) => g.id === id);
  if (exists) {
    // Upgrade role if needed: creator > member
    if (role === "creator" && exists.role !== "creator") {
      exists.role = "creator";
      localStorage.setItem(key, JSON.stringify(groups));
    }
    return;
  }

  groups.push({ id, role, addedAt: Date.now() });
  localStorage.setItem(key, JSON.stringify(groups));
}

export function removeMyGroup(walletAddress: string, id: number): void {
  if (!walletAddress) return;
  const key = storageKey(walletAddress);
  const groups = getMyGroups(walletAddress).filter((g) => g.id !== id);
  localStorage.setItem(key, JSON.stringify(groups));
}
