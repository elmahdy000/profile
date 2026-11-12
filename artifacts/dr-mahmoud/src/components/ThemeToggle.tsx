import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTheme, useAppTheme } from "@/lib/theme";

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const theme = useAppTheme();
  const nextLabel = theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer px-3",
        !showLabel && "w-10 px-0",
        className
      )}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-400 shrink-0" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" />
      )}
      {showLabel && (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
          {nextLabel}
        </span>
      )}
    </button>
  );
}
