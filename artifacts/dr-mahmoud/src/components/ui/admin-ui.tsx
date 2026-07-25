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
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-right text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] ${
          active
            ? "bg-gradient-to-r from-[#0B63CE] to-[#0956B4] text-white shadow-md shadow-[#0B63CE]/25 border border-transparent"
            : "bg-[#EAF3FF] hover:bg-[#0B63CE] text-[#0B63CE] hover:text-white border border-[#0B63CE]/20 group active:scale-[0.98]"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              active ? "text-white" : "text-[#0B63CE] group-hover:text-white"
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
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-right text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] ${
        active
          ? "bg-[#0B63CE] text-white font-bold shadow-sm shadow-[#0B63CE]/20 border border-transparent"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 group active:scale-[0.98]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${
            active ? "text-white" : "text-slate-400 group-hover:text-[#0B63CE]"
          }`}
          strokeWidth={1.8}
        />
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            active
              ? "bg-white/20 text-white"
              : "bg-slate-100 text-slate-600 group-hover:bg-[#0B63CE]/10 group-hover:text-[#0B63CE]"
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
  color = "blue",
  badge,
  onClick,
}) => {
  const colorMap = {
    blue: {
      bg: "bg-blue-50/70 hover:bg-blue-100/60 border-blue-200/70",
      iconBg: "bg-blue-600 text-white shadow-blue-500/25",
      text: "text-blue-900",
    },
    emerald: {
      bg: "bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-200/70",
      iconBg: "bg-emerald-600 text-white shadow-emerald-500/25",
      text: "text-emerald-900",
    },
    amber: {
      bg: "bg-amber-50/70 hover:bg-amber-100/60 border-amber-200/70",
      iconBg: "bg-amber-600 text-white shadow-amber-500/25",
      text: "text-amber-900",
    },
    indigo: {
      bg: "bg-indigo-50/70 hover:bg-indigo-100/60 border-indigo-200/70",
      iconBg: "bg-indigo-600 text-white shadow-indigo-500/25",
      text: "text-indigo-900",
    },
    purple: {
      bg: "bg-purple-50/70 hover:bg-purple-100/60 border-purple-200/70",
      iconBg: "bg-purple-600 text-white shadow-purple-500/25",
      text: "text-purple-900",
    },
  };

  const scheme = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all ${
        onClick ? "cursor-pointer hover:shadow-md active:scale-[0.99]" : ""
      } ${scheme.bg} backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl shadow-md ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">{title}</p>
            <h3 className={`text-xl font-extrabold ${scheme.text} mt-0.5`}>
              {value}
            </h3>
          </div>
        </div>
        {badge && (
          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-white/80 border border-slate-200 text-slate-700 shadow-xs">
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-200/40 pt-1.5">
          {subtitle}
        </p>
      )}
    </div>
  );
};

