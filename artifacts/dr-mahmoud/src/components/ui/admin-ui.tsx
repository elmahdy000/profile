import React from "react";

export interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
  variant?: "default" | "featured";
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick, badge, variant = "default" }) => {
  if (variant === "featured") {
    return (
      <button type="button" onClick={onClick}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-right text-xs font-bold transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 hover:bg-primary/15 text-primary"}`}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-primary-foreground" : "text-primary"}`} strokeWidth={2} />
          <span>{label}</span>
        </div>
        {badge !== undefined && (
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${active ? "bg-white/20 text-primary-foreground" : "bg-primary/20 text-primary"}`}>{badge}</span>
        )}
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 text-right text-xs font-semibold rounded-xl transition-all ${active ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground group"}`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"}`} strokeWidth={1.8} />
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>{badge}</span>
      )}
    </button>
  );
};

export interface StatusBadgeProps {
  variant: "published" | "playlist" | "online" | "undefined" | "success" | "warning" | "danger";
  children: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, children, className = "" }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "published": case "success": return "bg-success/10 text-success border-success/25";
      case "playlist": return "bg-primary/10 text-primary border-primary/25";
      case "online": return "bg-info/10 text-info border-info/25";
      case "warning": return "bg-warning/10 text-warning border-warning/25";
      case "danger": return "bg-danger/10 text-danger border-danger/25";
      case "undefined": default: return "bg-muted text-muted-foreground border-border";
    }
  };
  const getDotColor = () => {
    switch (variant) {
      case "published": case "success": return "bg-success";
      case "warning": return "bg-warning animate-pulse";
      case "danger": return "bg-danger";
      case "playlist": return "bg-primary";
      default: return "bg-muted-foreground";
    }
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${getVariantStyles()} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
      {children}
    </span>
  );
};

export interface IconButtonProps {
  icon: React.ElementType;
  actionType: "preview" | "edit" | "delete" | "link" | "published" | "warning";
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const IconButton: React.FC<IconButtonProps> = ({ icon: Icon, actionType, label, onClick, disabled = false, className = "", size = "md" }) => {
  const getActionColors = () => {
    switch (actionType) {
      case "preview": return "text-primary bg-primary/8 hover:bg-primary/15 border-primary/20";
      case "edit": return "text-muted-foreground bg-muted hover:bg-border hover:text-foreground border-border";
      case "delete": return "text-danger bg-danger/8 hover:bg-danger/15 border-danger/20";
      case "link": return "text-muted-foreground bg-muted hover:bg-border hover:text-foreground border-border";
      case "published": return "text-success bg-success/8 hover:bg-success/15 border-success/20";
      case "warning": return "text-warning bg-warning/8 hover:bg-warning/15 border-warning/20";
      default: return "text-muted-foreground bg-muted hover:bg-border border-border";
    }
  };
  const iconSizes = { sm: "w-3.5 h-3.5", md: "w-4 h-4", lg: "w-4.5 h-4.5" };
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}
      className={`p-2 rounded-xl border transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none ${getActionColors()} ${className}`}
    >
      <Icon className={iconSizes[size]} strokeWidth={1.8} />
    </button>
  );
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ElementType;
}

export const PrimaryButton: React.FC<ButtonProps> = ({ children, icon: Icon, className = "", disabled, ...props }) => (
  <button {...props} disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-sm active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />}
    <span>{children}</span>
  </button>
);

export const SecondaryButton: React.FC<ButtonProps> = ({ children, icon: Icon, className = "", disabled, ...props }) => (
  <button {...props} disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-card hover:bg-muted text-foreground border border-border text-xs font-bold transition-all shadow-xs active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.8} />}
    <span>{children}</span>
  </button>
);

export const DangerButton: React.FC<ButtonProps> = ({ children, icon: Icon, className = "", disabled, ...props }) => (
  <button {...props} disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger border border-danger/25 text-xs font-bold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-4 h-4 text-danger shrink-0" strokeWidth={1.8} />}
    <span>{children}</span>
  </button>
);

export const PreviewButton: React.FC<ButtonProps> = ({ children, icon: Icon, className = "", disabled, ...props }) => (
  <button {...props} disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-transparent hover:bg-primary/10 text-primary text-xs font-bold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none ${className}`}
  >
    {Icon && <Icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.8} />}
    <span>{children}</span>
  </button>
);

export interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  color?: "blue" | "emerald" | "amber" | "indigo" | "purple";
  badge?: string;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon: Icon, badge, onClick }) => {
  return (
    <div onClick={onClick}
      className={`p-4 rounded-2xl border border-border bg-card transition-all h-full flex flex-col justify-between ${onClick ? "cursor-pointer hover:border-primary/30 hover:shadow-sm" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-black text-foreground mt-1">{value}</h3>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </div>
      </div>
      {(subtitle || badge) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          {badge && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary shrink-0">{badge}</span>}
        </div>
      )}
    </div>
  );
};