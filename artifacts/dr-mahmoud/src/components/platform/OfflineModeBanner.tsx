import React from "react";
import { WifiOff, FolderDown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface OfflineModeBannerProps {
  onOpenVault: () => void;
}

export const OfflineModeBanner: React.FC<OfflineModeBannerProps> = ({ onOpenVault }) => {
  const { isOnline, forceOfflineMode, isEffectivelyOffline, toggleForceOfflineMode, metrics } =
    useNetworkStatus();

  // If online and force offline is not active, DO NOT render the banner
  if (!isEffectivelyOffline) {
    return null;
  }

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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-900 dark:text-amber-100">
                {!isOnline ? "أنت في وضع عدم الاتصال (أوفلاين) ⚡" : "وضع الأوفلاين الاختياري (توفير الباقة) نشط ⚡"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/60 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                متاح {metrics.lessonsCount} درس • {metrics.questionsCount} سؤال بالمحفظة
              </span>
            </div>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium hidden sm:block mt-0.5">
              يمكنك مذاكرة جميع الشروحات المقروءة والخرائط الذهنية وحل بنك الأسئلة دون الحاجة للإنترنت.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={onOpenVault}
            className="h-8 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <FolderDown className="h-3.5 w-3.5" />
            <span>محفظة الأوفلاين</span>
            <ArrowLeft className="h-3 w-3" />
          </Button>

          {forceOfflineMode && isOnline && (
            <button
              type="button"
              onClick={() => toggleForceOfflineMode()}
              className="text-[11px] font-bold text-amber-800 dark:text-amber-200 hover:underline px-2 py-1 rounded-md cursor-pointer"
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
