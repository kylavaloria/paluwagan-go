import { Loader } from "lucide-react";
import type { ReactNode, MouseEvent } from "react";

interface ActionButtonProps {
  children: ReactNode;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  title?: string;
  className?: string;
}

export default function ActionButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  variant = "primary",
  size = "md",
  fullWidth = false,
  title,
  className = "",
}: ActionButtonProps) {
  const sizeClass = size === "sm" ? " btn--sm" : size === "lg" ? " btn--lg" : "";
  const widthClass = fullWidth ? " btn--full" : "";

  return (
    <button
      className={`btn btn--${variant}${sizeClass}${widthClass} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
    >
      {loading ? (
        <>
          <Loader size={size === "sm" ? 12 : 16} className="btn-spinner" />
          Please wait...
        </>
      ) : (
        children
      )}
    </button>
  );
}
