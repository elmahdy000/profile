import { useState, useEffect, useCallback } from "react";
import {
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AdminConfirmDialog } from "../dashboard/AdminConfirmDialog";

interface GlobalExamsStatus {
  publishedCount: number;
  unpublishedCount: number;
  isPaused: boolean;
  hasBackup: boolean;
  backupCount: number;
}

interface GlobalExamsMasterToggleProps {
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onStateChange?: (isPaused: boolean) => void;
  className?: string;
  compact?: boolean;
}

export function GlobalExamsMasterToggle({
  adminApi,
  onStateChange,
  className = "",
  compact = false,
}: GlobalExamsMasterToggleProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<GlobalExamsStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toggling, setToggling] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<"pause" | "resume" | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi<GlobalExamsStatus & { success: boolean }>(
        "/api/admin/learning/quizzes/global-status"
      );
      if (res && typeof res.isPaused === "boolean") {
        setStatus(res);
        onStateChange?.(res.isPaused);
      }
    } catch (err: any) {
      console.error("Failed to load global exams status:", err);
    } finally {
      setLoading(false);
    }
  }, [adminApi, onStateChange]);

  useEffect(() => {
    void fetchStatus();

    const handleEvent = () => void fetchStatus();
    window.addEventListener("exams-global-status-changed", handleEvent);
    return () => window.removeEventListener("exams-global-status-changed", handleEvent);
  }, [fetchStatus]);

  const handleOpenConfirm = (action: "pause" | "resume") => {
    setPendingAction(action);
    setConfirmOpen(true);
  };

  const handleExecuteToggle = async () => {
    if (!pendingAction) return;
    setToggling(true);
    try {
      const res = await adminApi<{
        success: boolean;
        isPaused: boolean;
        message: string;
        backupCount?: number;
        restoredCount?: number;
      }>("/api/admin/learning/quizzes/global-toggle", {
        method: "POST",
        body: JSON.stringify({ action: pendingAction }),
      });

      toast({
        title: pendingAction === "pause" ? "⏸️ تم إيقاف جميع الامتحانات" : "🟢 تم تفعيل جميع الامتحانات",
        description: res.message,
      });

      setConfirmOpen(false);
      setPendingAction(null);
      await fetchStatus();
      window.dispatchEvent(new CustomEvent("exams-global-status-changed"));
    } catch (err: any) {
      toast({
        title: "خطأ في تعديل حالة الامتحانات",
        description: err.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setToggling(false);
    }
  };

  if (loading && !status) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex items-center justify-between animate-pulse ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-200" />
          <div className="space-y-1.5">
            <div className="h-4 w-44 rounded-md bg-slate-200" />
            <div className="h-3 w-64 rounded-md bg-slate-200" />
          </div>
        </div>
        <div className="h-9 w-32 rounded-xl bg-slate-200" />
      </div>
    );
  }

  const isPaused = status?.isPaused ?? false;
  const backupCount = status?.backupCount ?? 0;
  const publishedCount = status?.publishedCount ?? 0;
  const totalDrafts = status?.unpublishedCount ?? 0;

  return (
    <>
      <div
        dir="rtl"
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-xs ${
          isPaused
            ? "border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 dark:border-amber-500/30 dark:from-amber-950/40 dark:to-rose-950/30"
            : "border-emerald-300/80 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 dark:border-emerald-500/30 dark:from-emerald-950/40 dark:to-teal-950/30"
        } ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"} ${className}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Details */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform ${
                isPaused
                  ? "bg-amber-500 text-white shadow-amber-500/25"
                  : "bg-emerald-600 text-white shadow-emerald-500/25"
              }`}
            >
              {isPaused ? <PauseCircle className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
            </div>

            <div className="space-y-1 text-right">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                  {isPaused ? "حالة الامتحانات على المنصة: معطلة وموقوفة مؤقتاً ⏸️" : "حالة الامتحانات على المنصة: مفعلة ونشطة 🟢"}
                </h4>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isPaused
                      ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700"
                      : "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700"
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isPaused ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        isPaused ? "bg-amber-600" : "bg-emerald-600"
                      }`}
                    />
                  </span>
                  {isPaused ? "موقوفة عن جميع الطلاب" : "متاحة للطلاب"}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {isPaused ? (
                  <>
                    الطلاب لا يمكنهم رؤية أو دخول أي امتحانات حالياً. تم حفظ{" "}
                    <strong className="font-extrabold text-amber-700 dark:text-amber-300">
                      {backupCount} امتحان
                    </strong>{" "}
                    في النسخة الاحتياطية وجاهزة للعودة بضغطة زر واحدة.
                  </>
                ) : (
                  <>
                    الامتحانات المنشورة متاحة للطلاب حسب مراحلهم واشتراكاتهم (
                    <strong className="font-extrabold text-emerald-700 dark:text-emerald-300">
                      {publishedCount} امتحان منشور حالياً
                    </strong>
                    ).
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {isPaused ? (
              <Button
                type="button"
                onClick={() => handleOpenConfirm("resume")}
                disabled={toggling}
                className="h-10 px-4 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                <span>إعادة تفعيل جميع الامتحانات للطلاب ({backupCount})</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenConfirm("pause")}
                disabled={toggling}
                className="h-10 px-4 sm:px-5 rounded-xl border-amber-500/50 bg-white hover:bg-amber-50 text-amber-700 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-950/40 font-bold text-xs sm:text-sm cursor-pointer shadow-xs transition-all flex items-center gap-2"
              >
                <PauseCircle className="h-4 w-4 text-amber-600" />
                <span>إيقاف جميع الامتحانات مؤقتاً</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void fetchStatus()}
              disabled={loading || toggling}
              title="تحديث الحالة"
              className="h-10 w-10 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white/80 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={confirmOpen}
        title={pendingAction === "pause" ? "تأكيد إيقاف جميع الامتحانات مؤقتاً" : "تأكيد إعادة تفعيل جميع الامتحانات"}
        description={
          pendingAction === "pause"
            ? `هل أنت متأكد من إيقاف جميع الامتحانات المنشورة على المنصة؟ سيتم حفظ قائمة الـ (${publishedCount}) امتحان المنشورة فوراً وإخفاؤها عن جميع الطلاب ولن يتمكن أي طالب من حلها حتى تعيد تفعيلها.`
            : `هل أنت متأكد من إعادة تفعيل الامتحانات؟ سيتم استرجاع الـ (${backupCount}) امتحان التي كانت نشطة فوراً وإتاحتها للطلاب مع الحفاظ على المسودات غير المنشورة كما هي.`
        }
        confirmLabel={pendingAction === "pause" ? "نعم، إيقاف جميع الامتحانات" : "نعم، إعادة التفعيل الآن"}
        cancelLabel="إلغاء وتراجع"
        variant={pendingAction === "pause" ? "warning" : "info"}
        isLoading={toggling}
        onConfirm={handleExecuteToggle}
        onCancel={() => {
          if (!toggling) {
            setConfirmOpen(false);
            setPendingAction(null);
          }
        }}
      />
    </>
  );
}

