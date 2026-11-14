import React from "react";
import { WifiOff, Sparkles, FolderDown, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfflineModeBannerProps {
  isOnline: boolean;
  forceOfflineMode: boolean;
  lessonsCount: number;
  questionsCount: number;
  onOpenVault: () => void;
  onToggleForceOffline: () => void;
}

export const OfflineModeBanner: React.FC<OfflineModeBannerProps> = ({
  isOnline,
  forceOfflineMode,
  lessonsCount,
  questionsCount,
  onOpenVault,
  onToggleForceOffline,
}) => {
  return (
    <div
      dir="rtl"
      className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-600/15 border-b border-amber-300/40 dark:border-amber-700/40 px-4 py-2.5 transition-all text-right"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <WifiOff className="h-4 w-4 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-900 dark:text-amber-100">
                {!isOnline ? "أنت في وضع عدم الاتصال (أوفلاين) ⚡" : "وضع الأوفلاين الاختياري نشط ⚡"}
              </span>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-200/60 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                متاح {lessonsCount} درس • {questionsCount} سؤال
              </span>
            </div>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium hidden sm:block">
              يمكنك متابعة ومذاكرة جميع دروسك وأسئلتك المحفوظة مسبقاً على حسابك بدون الحاجة للإنترنت.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={onOpenVault}
            className="h-7.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <FolderDown className="h-3.5 w-3.5" />
            <span>محفظة الأوفلاين</span>
            <ArrowLeft className="h-3 w-3" />
          </Button>

          {forceOfflineMode && isOnline && (
            <button
              type="button"
              onClick={onToggleForceOffline}
              className="text-[11px] font-bold text-amber-800 dark:text-amber-200 hover:underline px-2 py-1 rounded-md"
              title="إلغاء وضع الأوفلاين الاختياري"
            >
              العودة للوضع المتصل
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
