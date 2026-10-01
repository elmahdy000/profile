import React from "react";
import { Lock, Play, CreditCard, Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LockedContentNoticeProps {
  title: string;
  description?: string;
  onGoToPreview: () => void;
  onOpenPayment: () => void;
}

export function LockedContentNotice({
  title,
  description,
  onGoToPreview,
  onOpenPayment,
}: LockedContentNoticeProps) {
  return (
    <div className="mx-auto max-w-2xl py-8 px-4 text-right dir-rtl animate-in fade-in duration-300">
      <div className="overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-white to-slate-50 dark:from-[#0D1B2E] dark:to-[#07101E] p-6 sm:p-8 shadow-xl text-center">
        {/* Animated Lock Icon */}
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 shadow-inner">
          <Lock className="h-10 w-10 animate-bounce duration-1000" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 mb-3">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>محتوى يتطلب اشتراك الشهر الجديد</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
          {title} مقفول مؤقتاً
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto mb-6">
          {description || "تم قفل هذا المحتوى لحين سداد اشتراك الشهر الجديد وتأكيد الدفع من الإدارة."}
        </p>

        {/* Free Preview Callout */}
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 text-right">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-300">
                🎥 متاح لك حالياً كمعاينة مجانية:
              </h4>
              <p className="text-[11px] sm:text-xs text-emerald-800/80 dark:text-emerald-200/80 mt-0.5 leading-relaxed">
                يمكنك الآن مشاهدة ومتابعة <strong>الدرسين الأول والثاني مجاناً</strong> من قسم المحاضرات قبل سداد الاشتراك.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            onClick={onOpenPayment}
            className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/25"
          >
            <CreditCard className="h-4 w-4 ml-2" />
            سداد الاشتراك أو رفع الإيصال 💳
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onGoToPreview}
            className="w-full sm:w-auto h-12 px-6 rounded-2xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm"
          >
            <Play className="h-4 w-4 ml-2 text-blue-600" />
            مشاهدة فيديوهات المعاينة المجانية
          </Button>
        </div>
      </div>
    </div>
  );
}
