interface StatusBadgeProps {
  status: string;
}

import { useTranslation } from "react-i18next";

const STATUS_CLASS: Record<string, string> = {
  WaitingForMembers: "badge--waiting",
  Active: "badge--active",
  Completed: "badge--completed",
  Unpaid: "badge--danger",
  PendingConfirmation: "badge--warning",
  Confirmed: "badge--success",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const className = STATUS_CLASS[status] || "badge--neutral";
  const label = STATUS_CLASS[status] ? t(`status.${status}`) : status;
  return <span className={`badge ${className}`}>{label}</span>;
}
