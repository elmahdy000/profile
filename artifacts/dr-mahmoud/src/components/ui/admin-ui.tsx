import React from "react";
import { ADMIN_TOKENS } from "@/lib/admin-design-tokens";

/**
 * Sidebar Navigation Item Component
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
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-right text-xs font-bold transition-all ${
          active
            ? "bg-[#0866D9] text-white shadow-sm"
            : "bg-[#0866D9]/10 hover:bg-[#0866D9]/20 text-[#0866D9] group"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              active ? "text-white" : "text-[#0866D9]"
            }`}
            strokeWidth={2}
          />
          <span>{label}</span>
        </div>
        {badge !== undefined && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              active
                ? "bg-white/20 text-white"
                : "bg-[#0866D9]/20 text-[#0866D9]"
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
      className={`w-full flex items-center justify-between px-3 py-2 text-right text-xs font-semibold rounded-xl transition-all ${
        active
          ? "bg-[#0866D9] text-white font-bold shadow-xs"
          : "text-[#64748B] hover:bg-[#F6F8FC] hover:text-[#0F172A] group"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${
            active ? "text-white" : "text-[#64748B] group-hover:text-[#0866D9]"
          }`}
          strokeWidth={1.8}
        />
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            active
              ? "bg-white/20 text-white"
              : "bg-[#E4EAF2] text-[#64748B] group-hover:bg-[#0866D9]/10 group-hover:text-[#0866D9]"
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
        return "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-500/5";
      case "playlist":
        return "bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-500/5";
      case "online":
        return "bg-sky-50 text-sky-700 border-sky-200 shadow-sm shadow-sky-500/5";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-500/5";
      case "undefined":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${getVariantStyles()} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${variant === "published" || variant === "success" ? "bg-emerald-500" : variant === "warning" ? "bg-amber-500 animate-pulse" : "bg-blue-500"}`} />
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
        return "text-[#0B63CE] bg-blue-50/50 hover:bg-blue-100/70 hover:text-[#0956B4] border-blue-200/50";
      case "edit":
        return "text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border-slate-200/60";
      case "delete":
        return "text-rose-600 bg-rose-50/50 hover:bg-rose-100/70 hover:text-rose-700 border-rose-200/50";
      case "link":
        return "text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border-slate-200/50";
      case "published":
        return "text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/70 border-emerald-200/50";
      case "warning":
        return "text-amber-600 bg-amber-50/50 hover:bg-amber-100/70 border-amber-200/50";
      default:
        return "text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200/50";
    }
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-4.5 h-4.5",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-2 rounded-xl border transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] disabled:opacity-50 disabled:pointer-events-none ${getActionColors()} ${className}`}
    >
      <Icon className={iconSizes[size]} strokeWidth={1.8} />
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
    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B63CE] hover:bg-[#0956B4] text-white text-xs font-bold transition-all shadow-md shadow-[#0B63CE]/20 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />}
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
    className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={1.8} />}
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
    className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-4 h-4 text-rose-600 shrink-0" strokeWidth={1.8} />}
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
    className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-transparent hover:bg-[#EAF3FF] text-[#0B63CE] text-xs font-bold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-4 h-4 text-[#0B63CE] shrink-0" strokeWidth={1.8} />}
    <span>{children}</span>
  </button>
);

/**
 * KPI Quick Metric Card for Admin Dashboard
 */
export interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  color?: "blue" | "emerald" | "amber" | "indigo" | "purple";
  badge?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border border-[#E4EAF2] bg-white transition-all h-full flex flex-col justify-between ${
        onClick ? "cursor-pointer hover:border-[#0866D9]/40 hover:shadow-xs" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#64748B]">{title}</p>
          <h3 className="text-2xl font-black text-[#0F172A] mt-1">
            {value}
          </h3>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F6F8FC] border border-[#E4EAF2] text-[#0866D9]">
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </div>
      </div>
      {(subtitle || badge) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#E4EAF2] pt-2.5">
          {subtitle && (
            <p className="text-xs text-[#64748B] truncate">{subtitle}</p>
          )}
          {badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#0866D9]/10 text-[#0866D9] shrink-0">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
