import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTheme, useAppTheme } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useAppTheme();
  const nextLabel = theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن";
  return (
    <button type="button" onClick={toggleTheme} aria-label={nextLabel} title={nextLabel}
      className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-card-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
      {theme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-700" />}
    </button>
  );
}
