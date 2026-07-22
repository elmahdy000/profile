import React from "react";
import { ADMIN_TOKENS } from "@/lib/admin-design-tokens";

/**
 * Sidebar Navigation Item Component
 * Strict Color & Size Specification:
 * - All inactive sidebar icons: #718096
 * - Inactive menu text: #667085
 * - Active menu background: #0B63CE
 * - Active menu icon and text: #FFFFFF
 * - Hover background: #EAF3FF
 * - Hover icon and text: #0B63CE
 * - Size: 20px (w-5 h-5), Stroke Width: 1.75
 */
export interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
  variant?: "default" | "featured";
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  variant = "default",
}) => {
  if (variant === "featured") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-right text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] ${
          active
            ? "bg-[#0B63CE] text-white shadow-lg shadow-[#0B63CE]/20"
            : "bg-[#EAF3FF] hover:bg-[#0B63CE] text-[#0B63CE] hover:text-white border border-[#0B63CE]/20 group"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon
            className={`w-5 h-5 shrink-0 transition-colors ${
              active ? "text-white" : "text-[#0B63CE] group-hover:text-white"
            }`}
            strokeWidth={1.75}
          />
          <span>{label}</span>
        </div>
        {badge !== undefined && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              active
                ? "bg-white/20 text-white"
                : "bg-[#0B63CE]/10 text-[#0B63CE] group-hover:bg-white/20 group-hover:text-white"
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-right text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] ${
        active
          ? "bg-[#0B63CE] text-white font-bold shadow-md shadow-[#0B63CE]/15"
          : "text-[#667085] hover:bg-[#EAF3FF] hover:text-[#0B63CE] group"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`w-5 h-5 shrink-0 transition-colors ${
            active ? "text-white" : "text-[#718096] group-hover:text-[#0B63CE]"
          }`}
          strokeWidth={1.75}
        />
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            active
              ? "bg-white/20 text-white"
              : "bg-muted text-[#667085] group-hover:bg-[#0B63CE]/10 group-hover:text-[#0B63CE]"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

/**
 * Standardized Status Badge Component
 */
export interface StatusBadgeProps {
  variant: "published" | "playlist" | "online" | "undefined" | "success" | "warning";
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  children,
  className = "",
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "published":
      case "success":
        return "bg-[#E9F8F1] text-[#16A36A] border-[#B7E7D0]";
      case "playlist":
        return "bg-[#EAF3FF] text-[#0B63CE] border-[#B8D7FF]";
      case "online":
        return "bg-[#EEF6FF] text-[#175CD3] border-[#B2DDFF]";
      case "warning":
        return "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]";
      case "undefined":
      default:
        return "bg-[#F2F4F7] text-[#667085] border-[#DDE2E8]";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${getVariantStyles()} ${className}`}
    >
      {children}
    </span>
  );
};

/**
 * Standardized Action Icon Button Component
 */
export interface IconButtonProps {
  icon: React.ElementType;
  actionType: "preview" | "edit" | "delete" | "link" | "published" | "warning";
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  actionType,
  label,
  onClick,
  disabled = false,
  className = "",
  size = "md",
}) => {
  const getActionColors = () => {
    switch (actionType) {
      case "preview":
        return "text-[#0B63CE] hover:bg-[#EAF3FF] hover:text-[#0956B4]";
      case "edit":
        return "text-[#475467] hover:bg-[#F2F4F7] hover:text-[#14213D]";
      case "delete":
        return "text-[#E5484D] hover:bg-[#FFF0F1] hover:text-[#C93B40]";
      case "link":
        return "text-[#667085] hover:bg-[#F2F4F7] hover:text-[#14213D]";
      case "published":
        return "text-[#16A36A] hover:bg-[#E9F8F1]";
      case "warning":
        return "text-[#D97706] hover:bg-[#FEF3C7]";
      default:
        return "text-[#718096] hover:bg-[#F2F4F7]";
    }
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-[18px] h-[18px]",
    lg: "w-5 h-5",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-2 rounded-xl border border-transparent transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] disabled:opacity-50 disabled:pointer-events-none ${getActionColors()} ${className}`}
    >
      <Icon className={iconSizes[size]} strokeWidth={1.75} />
    </button>
  );
};

/**
 * Standardized Action Buttons
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ElementType;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  className = "",
  disabled,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B63CE] hover:bg-[#0956B4] text-white text-xs font-bold transition-all shadow-md shadow-[#0B63CE]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />}
    <span>{children}</span>
  </button>
);

export const SecondaryButton: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  className = "",
  disabled,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#344054] border border-[#D0D5DD] text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-[18px] h-[18px] text-[#475467] shrink-0" strokeWidth={1.75} />}
    <span>{children}</span>
  </button>
);

export const DangerButton: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  className = "",
  disabled,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E5484D] border border-[#FECDD3] text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5484D] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-[18px] h-[18px] text-[#E5484D] shrink-0" strokeWidth={1.75} />}
    <span>{children}</span>
  </button>
);

export const PreviewButton: React.FC<ButtonProps> = ({
  children,
  icon: Icon,
  className = "",
  disabled,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-transparent hover:bg-[#EAF3FF] text-[#0B63CE] text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-[18px] h-[18px] text-[#0B63CE] shrink-0" strokeWidth={1.75} />}
    <span>{children}</span>
  </button>
);
