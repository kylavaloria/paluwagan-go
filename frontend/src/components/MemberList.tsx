import { Copy, Check } from "lucide-react";
import { useState } from "react";
import StarRating from "./StarRating";

interface MemberListProps {
  members: string[];
  payoutOrder?: string[];
  currentCycle?: number;
  creatorAddress?: string;
  currentUserAddress?: string | null;
  trustScores?: Record<string, number | null | undefined>;
  trustLoading?: boolean;
  usernames?: Record<string, string | null | undefined>;
  usernamesLoading?: boolean;
}

function truncate(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function MemberList({
  members,
  payoutOrder,
  currentCycle,
  creatorAddress,
  currentUserAddress,
  trustScores,
  trustLoading,
  usernames,
  usernamesLoading,
}: MemberListProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 2000);
  };

  // Determine the payout position for a member
  const getPayoutPosition = (addr: string): number | null => {
    if (!payoutOrder || payoutOrder.length === 0) return null;
    const idx = payoutOrder.indexOf(addr);
    return idx >= 0 ? idx + 1 : null;
  };

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Member</th>
            <th>Rating</th>
            {payoutOrder && payoutOrder.length > 0 && <th>Payout Order</th>}
            <th>Role</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {members.map((addr, i) => {
            const isCreator = addr === creatorAddress;
            const isYou = addr === currentUserAddress;
            const payoutPos = getPayoutPosition(addr);
            const isCurrentRecipient = payoutPos !== null && currentCycle === payoutPos;
            const score = trustScores ? trustScores[addr] : undefined;
            const username = usernames ? usernames[addr] : undefined;

            return (
              <tr key={addr}>
                <td>{i + 1}</td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                      {usernames ? (
                        username === undefined ? (
                          <span className="text-muted text-sm">{usernamesLoading ? "Loading…" : "—"}</span>
                        ) : username ? (
                          <span style={{ fontWeight: 700, color: "var(--text-heading)" }}>@{username}</span>
                        ) : (
                          <span className="text-muted text-sm">—</span>
                        )
                      ) : null}
                      {isYou && <span className="badge badge--active">You</span>}
                    </div>
                    <span className="address">{truncate(addr)}</span>
                  </div>
                </td>
                <td>
                  {trustScores ? (
                    score === undefined ? (
                      <span className="text-muted text-sm">{trustLoading ? "Loading…" : "—"}</span>
                    ) : (
                      <StarRating score={score} size={16} showLabel={false} />
                    )
                  ) : (
                    <span className="text-muted text-sm">—</span>
                  )}
                </td>
                {payoutOrder && payoutOrder.length > 0 && (
                  <td>
                    {payoutPos !== null && (
                      <span className="flex items-center gap-2">
                        Round {payoutPos}
                        {isCurrentRecipient && (
                          <span className="badge badge--success">Current</span>
                        )}
                      </span>
                    )}
                  </td>
                )}
                <td>
                  {isCreator ? (
                    <span className="badge badge--neutral">Organizer</span>
                  ) : (
                    <span className="text-muted text-sm">Member</span>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => copyAddress(addr)}
                    title="Copy full address"
                  >
                    {copied === addr ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
