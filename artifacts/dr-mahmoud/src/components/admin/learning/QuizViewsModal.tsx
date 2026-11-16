import React, { useState, useEffect } from "react";
import {
  Users,
  Eye,
  Calendar,
  Phone,
  Clock,
  X,
  Search,
  Loader2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewedStudent {
  id: number;
  quizId: number;
  studentId: number;
  studentName: string;
  studentPhone: string;
  studentGrade?: string | null;
  studentStage?: string | null;
  parentPhone?: string | null;
  firstViewedAt: string;
  lastViewedAt: string;
  viewCount: number;
}

interface QuizViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: number;
  quizTitle: string;
  isHomework?: boolean;
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
}

export function QuizViewsModal({
  isOpen,
  onClose,
  quizId,
  quizTitle,
  isHomework = true,
  adminApi,
}: QuizViewsModalProps) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<ViewedStudent[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !quizId) return;
    setLoading(true);
    setError(null);
    setSearchQuery("");

    adminApi<{
      quiz: any;
      totalStudents: number;
      totalViews: number;
      students: ViewedStudent[];
    }>(`/api/admin/learning/quizzes/${quizId}/views`)
      .then((res) => {
        setStudents(res.students || []);
        setTotalViews(res.totalViews || 0);
      })
      .catch((err) => {
        setError(err.message || "تعذر تحميل إحصائيات الطلاب");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, quizId]);

  if (!isOpen) return null;

  const filtered = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (s.studentName && s.studentName.toLowerCase().includes(q)) ||
      (s.studentPhone && s.studentPhone.includes(q)) ||
      (s.parentPhone && s.parentPhone.includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Eye className="h-3.5 w-3.5" />
                <span>إحصائيات فتح {isHomework ? "الواجب" : "الاختبار"}</span>
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                المعرف: #{quizId}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-foreground truncate" title={quizTitle}>
              {quizTitle}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-border">
          <div className="p-3 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-2xs">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-muted-foreground">
                فتحوا {isHomework ? "الواجب" : "الاختبار"}
              </span>
              <strong className="text-base sm:text-lg font-black text-foreground font-mono">
                {students.length} طالب
              </strong>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-2xs">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-muted-foreground">
                إجمالي مرات الفتح
              </span>
              <strong className="text-base sm:text-lg font-black text-foreground font-mono">
                {totalViews} مرة
              </strong>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-2xs">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-muted-foreground">
                طبيعة التسليم
              </span>
              <strong className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300">
                {isHomework ? "ورقي بالحصة ✍️" : "إلكتروني بالمنصة 💻"}
              </strong>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو رقم هاتف الطالب أو ولي الأمر..."
              className="w-full h-9 pr-9 pl-3 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs font-bold">جارٍ استخراج سجلات الطلاب...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Eye className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-xs font-bold">
                {searchQuery ? "لا يوجد طالب مطابق لبحثك" : "لم يقم أي طالب بفتح هذا المحتوى حتى الآن"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((s, idx) => {
                const firstDate = s.firstViewedAt
                  ? new Date(s.firstViewedAt).toLocaleString("ar-EG", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "—";
                const lastDate = s.lastViewedAt
                  ? new Date(s.lastViewedAt).toLocaleString("ar-EG", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "—";

                return (
                  <div
                    key={s.id || idx}
                    className="p-3.5 rounded-2xl border border-border bg-card hover:border-violet-400/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="h-6 w-6 rounded-lg bg-violet-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <strong className="text-xs sm:text-sm font-black text-foreground">
                          {s.studentName}
                        </strong>
                        {s.studentGrade && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {s.studentGrade}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-semibold">
                        {s.studentPhone && (
                          <a
                            href={`tel:${s.studentPhone}`}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                            dir="ltr"
                          >
                            <Phone className="h-3 w-3 text-emerald-600" />
                            <span>{s.studentPhone}</span>
                          </a>
                        )}
                        {s.parentPhone && (
                          <span className="flex items-center gap-1" dir="ltr">
                            <span className="text-[10px] text-muted-foreground">ولي الأمر:</span>
                            <span>{s.parentPhone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                      <div className="text-right sm:text-left space-y-0.5 text-[10px] sm:text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span>آخر فتح: <strong>{lastDate}</strong></span>
                        </div>
                        {s.viewCount > 1 && (
                          <div className="text-slate-400">
                            أول فتح: {firstDate}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300 font-black text-xs border border-violet-500/20">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{s.viewCount} {s.viewCount === 1 ? "مرة" : "مرات"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border bg-muted/30 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl font-bold text-xs"
          >
            إغلاق النافذة
          </Button>
        </div>
      </div>
    </div>
  );
}
