import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Plus,
  Play,
  Clock,
  Award,
  RefreshCw,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CurriculumExamsViewProps {
  stage: string;
  unit: string;
  lesson: string;
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onCreateExamClick: () => void;
}

export function CurriculumExamsView({
  stage,
  unit,
  lesson,
  adminApi,
  onCreateExamClick,
}: CurriculumExamsViewProps) {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadQuizzes = async () => {
    if (!stage || !unit) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ stage, unit });
      if (lesson && lesson !== "all") {
        params.append("lesson", lesson);
      }
      const res = await adminApi<any[]>(`/api/admin/learning/curriculum/quizzes?${params.toString()}`);
      setQuizzes(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "تعذر تحميل الامتحانات" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, [stage, unit, lesson]);

  const handleTogglePublish = async (quiz: any) => {
    setTogglingId(quiz.id);
    try {
      const nextStatus = !quiz.isPublished;
      await adminApi(`/api/admin/learning/quizzes/${quiz.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: nextStatus }),
      });
      toast({
        title: nextStatus ? "تم نشر الاختبار للطلاب بنجاح 🟢" : "تم تحويل الاختبار إلى مسودة 🟡",
      });
      setQuizzes((prev) => prev.map((q) => (q.id === quiz.id ? { ...q, isPublished: nextStatus } : q)));
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر تحديث حالة النشر" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteQuiz = async (quizId: number, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف امتحان (${title})؟`)) return;
    try {
      await adminApi(`/api/admin/learning/quizzes/${quizId}`, {
        method: "DELETE",
      });
      toast({ title: `تم حذف الامتحان (${title}) بنجاح 🗑️` });
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر حذف الامتحان" });
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
        <div>
          <h4 className="text-sm font-black text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <span>الامتحانات والاختبارات المرتبطة ({quizzes.length})</span>
          </h4>
          <p className="text-[11px] text-muted-foreground font-semibold">
            {lesson === "all" ? `كل اختبارات ${unit}` : `اختبارات الدرس: ${lesson}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={loadQuizzes}
            disabled={loading}
            className="h-8 text-xs font-bold gap-1 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onCreateExamClick}
            className="h-8 text-xs font-bold gap-1.5 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            إنشاء امتحان لهذا الدرس
          </Button>
        </div>
      </div>

      {/* Quizzes List or Empty State */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground font-bold text-xs flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>جاري تحميل الامتحانات المرتبطة...</span>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-3">
          <ClipboardCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h5 className="text-sm font-black text-foreground">لا توجد امتحانات إلكترونية مرتبطة بهذا الدرس بعد</h5>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            يمكنك إنشاء امتحان إلكتروني فوري وسحب الأسئلة تلقائياً من بنك أسئلة هذا الدرس بضغطة زر واحدة.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onCreateExamClick}
            className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            إنشاء أول امتحان الآن
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {quizzes.map((quiz) => {
            const qCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
            return (
              <div
                key={quiz.id}
                className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs hover:border-primary/40 transition-all"
              >
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black mb-1.5 ${
                        quiz.isPublished
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${quiz.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {quiz.isPublished ? "منشور ومتاح للطلاب" : "مسودة مغلقة"}
                    </span>
                    <h5 className="text-xs sm:text-sm font-black text-foreground line-clamp-2 leading-tight">
                      {quiz.title}
                    </h5>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="حذف الامتحان"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold text-muted-foreground border-t border-border/50">
                  <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                    <ClipboardCheck className="h-3 w-3 text-primary" /> {qCount} سؤال
                  </span>
                  <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                    <Clock className="h-3 w-3 text-amber-500" /> {quiz.durationMinutes ? `${quiz.durationMinutes} دقيقة` : "مفتوح"}
                  </span>
                  <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                    <Award className="h-3 w-3 text-emerald-500" /> النجاح: {quiz.passingScore}%
                  </span>
                  <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                    <RefreshCw className="h-3 w-3 text-blue-500" /> {quiz.maxAttempts ? `${quiz.maxAttempts} محاولات` : "بلا حدود"}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleTogglePublish(quiz)}
                    disabled={togglingId === quiz.id}
                    className={`h-8 text-[11px] font-bold rounded-xl gap-1 cursor-pointer ${
                      quiz.isPublished
                        ? "text-amber-600 border-amber-300 hover:bg-amber-50"
                        : "text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    {togglingId === quiz.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : quiz.isPublished ? (
                      "إخفاء عن الطلاب"
                    ) : (
                      "نشر للطلاب الآن"
                    )}
                  </Button>

                  <a
                    href={`/platform/quizzes`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    معاينة بالمنصة
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
