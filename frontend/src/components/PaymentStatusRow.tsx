import StatusBadge from "./StatusBadge";

interface PaymentStatusRowProps {
  address: string;
  status: string; // "Unpaid" | "PendingConfirmation" | "Confirmed"
  isYou?: boolean;
  actionButton?: React.ReactNode;
}

function truncate(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function PaymentStatusRow({
  address,
  status,
  isYou,
  actionButton,
}: PaymentStatusRowProps) {
  return (
    <div className="payment-row">
      <div className="payment-row-member">
        <span className="address">{truncate(address)}</span>
        {isYou && <span className="badge badge--active">You</span>}
      </div>
      <div className="payment-row-status">
        <StatusBadge status={status} />
      </div>
      {actionButton && (
        <div className="payment-row-actions">
          {actionButton}
        </div>
      )}
    </div>
  );
}
