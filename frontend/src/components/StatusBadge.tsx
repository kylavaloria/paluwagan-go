interface StatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  WaitingForMembers: { label: "Waiting for Members", className: "badge--waiting" },
  Active: { label: "Active", className: "badge--active" },
  Completed: { label: "Completed", className: "badge--completed" },
  Unpaid: { label: "Unpaid", className: "badge--danger" },
  PendingConfirmation: { label: "Waiting for Confirmation", className: "badge--warning" },
  Confirmed: { label: "Confirmed", className: "badge--success" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, className: "badge--neutral" };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
