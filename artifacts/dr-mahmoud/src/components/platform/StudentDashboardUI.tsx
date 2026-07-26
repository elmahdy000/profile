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
        className={`inline-grid place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/75 font-bold text-primary-foreground shadow-sm ring-[2.5px] ring-card ${avatarSizes[size]}`}
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
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-[2px] border-card bg-emerald-500 shadow-sm"
          title="نشط الآن على المنصة"
        />
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
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-6 mb-7">
      <div>
        {badge && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/15 mb-2.5">
            {badge}
          </span>
        )}
        <h1 className="text-[22px] font-extrabold leading-tight text-foreground md:text-[26px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
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
    blue: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-muted-foreground">{label}</p>
          <strong className="mt-1.5 block text-[26px] font-extrabold leading-tight text-foreground">
            {value}
          </strong>
          {helper && (
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">{helper}</p>
          )}
        </div>
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconColors[color]}`}
        >
          <Icon className="h-[22px] w-[22px]" />
        </span>
      </div>
      {trend && (
        <div className="mt-3 border-t border-border pt-2.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <span>↑</span> {trend}
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
        {showPercentage && <span className="text-primary">{clamped}%</span>}
      </div>
      <div className="h-[7px] w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
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
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-base font-bold text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
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
    <div className="border-b border-muted py-3.5 last:border-0 flex items-center justify-between gap-4">
      <dt className="text-[12px] font-bold text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-[13px] font-bold text-foreground text-left truncate">
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
    info: "border-primary/15 bg-primary/10 text-primary",
    success: "border-emerald-500/25 bg-emerald-500/12 text-emerald-500",
    warning: "border-amber-500/25 bg-amber-500/12 text-amber-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${styles[variant]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${variant === "success" ? "bg-emerald-500" : variant === "warning" ? "bg-amber-500" : "bg-primary"}`} />
      {children}
    </span>
  );
}
