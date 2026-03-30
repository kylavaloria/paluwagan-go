import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface MemberListProps {
  members: string[];
  payoutOrder?: string[];
  currentCycle?: number;
  creatorAddress?: string;
  currentUserAddress?: string | null;
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

            return (
              <tr key={addr}>
                <td>{i + 1}</td>
                <td>
                  <span className="address">{truncate(addr)}</span>
                  {isYou && <span className="badge badge--active" style={{ marginLeft: 8 }}>You</span>}
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
