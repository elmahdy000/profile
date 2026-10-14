import { useState, type ComponentType, type ReactNode } from "react";

const avatarSizes = {
  sm: "h-9 w-9 text-[11px]",
  md: "h-11 w-11 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-24 w-24 text-2xl",
};

export function StudentAvatar({
  name,
  src,
  size = "md",
  showOnlineStatus = false,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof avatarSizes;
  showOnlineStatus?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "ط";

  return (
    <div className="relative inline-block shrink-0">
      <span
        className={`inline-grid place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 font-bold text-white shadow-sm ring-2 ring-background/80 ${avatarSizes[size]}`}
        aria-label={`صورة الطالب ${name}`}
      >
        {src && !failed ? (
          <img
            src={src}
            alt={`صورة الطالب ${name}`}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          initials
        )}
      </span>
      {showOnlineStatus && (
        <span
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500 shadow-xs"
          title="نشط الآن على المنصة"
        >
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
        </span>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  badge,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  badge?: string;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border/60 pb-5 mb-7">
      <div className="space-y-1">
        {badge && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {badge}
          </span>
        )}
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-xs md:text-[13px] leading-relaxed text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function StatisticCard({
  label,
  value,
  helper,
  icon: Icon,
  trend,
  color = "blue",
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
  trend?: string;
  color?: "blue" | "emerald" | "purple" | "amber";
}) {
  const iconColors = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/70 dark:border-slate-800/80 bg-gradient-to-b from-card to-card/80 dark:from-slate-900/90 dark:to-[#0B1322] p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
      {/* Vercel-style subtle top ambient shine */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-muted-foreground tracking-wide">{label}</p>
          <strong className={`mt-1.5 block font-mono font-black tracking-tight text-foreground dark:text-white tabular-nums ${String(value).length > 8 ? 'text-[18px]' : 'text-[26px]'}`}>
            {value}
          </strong>
          {helper && (
            <p className="mt-1 text-[11px] font-medium text-muted-foreground/85 truncate">{helper}</p>
          )}
        </div>
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${iconColors[color]} shadow-2xs transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {trend && (
        <div className="mt-3.5 border-t border-border/50 pt-2.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <span className="inline-block rounded-md bg-emerald-500/10 px-1 py-0.5 text-[10px]">↑</span>
          <span>{trend}</span>
        </div>
      )}
    </article>
  );
}

export function ProgressBar({
  progress,
  className = "",
  showPercentage = true,
}: {
  progress: number;
  className?: string;
  showPercentage?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between text-[12px] font-bold mb-2">
        <span className="text-muted-foreground">نسبة التقدم</span>
        {showPercentage && (
          <span className="font-mono text-xs font-black text-primary tabular-nums">{clamped}%</span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/80 p-0.5 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-700 ease-out shadow-xs"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-gradient-to-b from-card/60 to-card/20 p-8 text-center">
      {/* Ambient background glow */}
      <div className="absolute h-32 w-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
      
      <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-b from-primary/15 to-primary/5 border border-primary/20 text-primary shadow-xs">
        <Icon className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-base font-extrabold text-foreground tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-sm text-xs md:text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProfileInfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="border-b border-border/50 py-3.5 last:border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 transition-colors hover:bg-muted/20 px-2 rounded-lg">
      <dt className="text-[12px] font-bold text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-[13px] font-semibold text-foreground sm:text-left break-words">
        {value || "غير محدد"}
      </dd>
    </div>
  );
}

export function StatusBadge({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "info" | "success" | "warning";
}) {
  const styles = {
    info: "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  const dotStyles = {
    info: "bg-blue-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs ${styles[variant]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[variant]}`} />
      {children}
    </span>
  );
}

