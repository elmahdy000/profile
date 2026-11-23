import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Plus,
  Play,
  Clock,
  Award,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Check,
  Printer,
  X,
  FileCheck2,
  FileText,
  BookOpen,
  Layers,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { InlineDurationEditor } from "../InlineDurationEditor";
import { QuizViewsModal } from "../QuizViewsModal";

interface CurriculumExamsViewProps {
  stage: string;
  unit: string;
  lesson: string;
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onCreateExamClick: () => void;
  onReviewQuiz?: (quiz: any) => void;
}

export function CurriculumExamsView({
  stage,
  unit,
  lesson,
  adminApi,
  onCreateExamClick,
  onReviewQuiz,
}: CurriculumExamsViewProps) {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Review modal state
  const [selectedQuizForReview, setSelectedQuizForReview] = useState<any | null>(null);
  const [showAnswers, setShowAnswers] = useState<boolean>(true);
  const [viewingQuizStats, setViewingQuizStats] = useState<any | null>(null);

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
      if (selectedQuizForReview?.id === quizId) {
        setSelectedQuizForReview(null);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر حذف الامتحان" });
    }
  };

  // Open review modal
  const handleOpenReview = (quiz: any) => {
    if (onReviewQuiz) {
      onReviewQuiz(quiz);
    } else {
      setSelectedQuizForReview(quiz);
      setShowAnswers(true);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
        <div>
          <h4 className="text-sm font-black text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <span>الامتحانات والاختبارات المخزنة ({quizzes.length})</span>
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
            يمكنك إنشاء امتحان إلكتروني فوري وسحب الأسئلة تلقائياً من بنك أسئلة هذا الدرس بضغطة زر واحدة، ويتم تخزينه فوراً مع إمكانية مراجعة إجاباته في أي وقت.
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
            const isHomework = quiz.scope === "homework" || quiz.category === "واجب";

            return (
              <div
                key={quiz.id}
                className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            quiz.isPublished
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${quiz.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {quiz.isPublished ? "منشور ومتاح للطلاب" : "مسودة مغلقة"}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          isHomework
                            ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                            : "bg-violet-500/15 text-violet-600 border-violet-500/30"
                        }`}>
                          {isHomework ? "واجب منزلي 📚" : "امتحان إلكتروني 📝"}
                        </span>
                      </div>

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
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-bold text-muted-foreground border-t border-border/50">
                    <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                      <ClipboardCheck className="h-3 w-3 text-primary" /> {qCount} سؤال
                    </span>
                    <InlineDurationEditor
                      quizId={quiz.id}
                      durationMinutes={quiz.durationMinutes}
                      onUpdated={(newDuration) => {
                        setQuizzes((prev) =>
                          prev.map((q) => (q.id === quiz.id ? { ...q, durationMinutes: newDuration } : q))
                        );
                      }}
                    />
                    <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                      <Award className="h-3 w-3 text-emerald-500" /> النجاح: {quiz.passingScore}%
                    </span>
                    <span className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                      <RefreshCw className="h-3 w-3 text-blue-500" /> {quiz.maxAttempts ? `${quiz.maxAttempts} محاولات` : "بلا حدود"}
                    </span>
                  </div>

                  {/* Students Opened / Tested Stats Banner */}
                  {isHomework ? (
                    <button
                      type="button"
                      onClick={() => setViewingQuizStats(quiz)}
                      className="w-full text-right p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Eye className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black truncate">
                            {quiz.openedStudentsCount > 0
                              ? `فتح الواجب: ${quiz.openedStudentsCount} طلاب (${quiz.totalOpensCount || quiz.openedStudentsCount} مرة) 👁️`
                              : "لم يقم أي طالب بفتح الواجب بعد"}
                          </div>
                          <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 block truncate">
                            اضغط لعرض أسماء وتفاصيل الطلاب وأوقات الفتح ↗
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black bg-amber-600 text-white px-2 py-0.5 rounded-lg shrink-0 shadow-2xs">
                        {quiz.openedStudentsCount || 0} طالب
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setViewingQuizStats(quiz)}
                      className="w-full text-right p-2.5 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-900 dark:text-violet-200 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black truncate">
                            {quiz.uniqueStudentsCount > 0 || quiz.openedStudentsCount > 0
                              ? `اختبر: ${quiz.uniqueStudentsCount || 0} طالب | فتح: ${quiz.openedStudentsCount || 0}`
                              : "لم يختبره أو يفتحه طلاب بعد"}
                          </div>
                          <span className="text-[10px] text-violet-700/80 dark:text-violet-300/80 block truncate">
                            اضغط لعرض كشف أسماء الطلاب ومحاولاتهم ↗
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black bg-violet-600 text-white px-2 py-0.5 rounded-lg shrink-0 shadow-2xs">
                        {quiz.openedStudentsCount || quiz.uniqueStudentsCount || 0} طالب
                      </span>
                    </button>
                  )}
                </div>

                {/* Actions: Direct Button to Show Answers & Review */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleOpenReview(quiz)}
                    className="h-8 text-xs font-bold gap-1.5 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shadow-xs flex-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>إظهار الإجابات والمراجعة 👁️</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleTogglePublish(quiz)}
                    disabled={togglingId === quiz.id}
                    className={`h-8 text-[11px] font-bold rounded-xl gap-1 cursor-pointer shrink-0 ${
                      quiz.isPublished
                        ? "text-amber-600 border-amber-300 hover:bg-amber-50"
                        : "text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    {togglingId === quiz.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : quiz.isPublished ? (
                      "إخفاء"
                    ) : (
                      "نشر"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Standalone Exam & Answers Review Modal ── */}
      {selectedQuizForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 p-4 sm:p-5 shrink-0 bg-muted/15">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600/10 text-violet-600 border border-violet-600/20 shadow-xs">
                  <FileCheck2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-foreground truncate">
                    {selectedQuizForReview.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold flex-wrap">
                    <span>{selectedQuizForReview.questions?.length || 0} أسئلة</span>
                    <span>•</span>
                    <span>نسبة النجاح: {selectedQuizForReview.passingScore}%</span>
                    <span>•</span>
                    <span>{selectedQuizForReview.stage || stage}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Answers Button */}
                <button
                  type="button"
                  onClick={() => setShowAnswers((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border shadow-2xs ${
                    showAnswers
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted border-border text-muted-foreground hover:text-foreground"
                  }`}
                  title="الضغط هنا يُظهر أو يُخفي الإجابات النموذجية لجميع الأسئلة فوراً"
                >
                  {showAnswers ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4" />}
                  <span>{showAnswers ? "الإجابات: معروضة ✓" : "الإجابات: مخفية 🙈"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedQuizForReview(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {(selectedQuizForReview.questions || []).map((q: any, idx: number) => {
                const isEssay = q.questionType === "essay" || (!q.options || q.options.length === 0);
                const isTf = !isEssay && (q.questionType === "true_false" || (q.options && q.options.length === 2 && (q.options.includes("صواب") || q.options.includes("صح"))));
                const correctOptionText = q.correctAnswer || (q.options && typeof q.correctIndex === "number" ? q.options[q.correctIndex] : "");

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-border bg-card dark:bg-[#070D18] shadow-2xs space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary text-white text-xs font-black">
                          {idx + 1}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                          isEssay
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                            : isTf
                            ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        }`}>
                          {isEssay ? "✍️ سؤال مقالي" : isTf ? "صواب أم خطأ" : "اختيار من متعدد"}
                        </span>
                        {q.lesson && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            📖 {q.lesson}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {q.points || (isEssay ? 5 : 1)} درجات
                      </span>
                    </div>

                    {/* Question Prompt */}
                    <p className="text-xs sm:text-sm font-black text-foreground leading-relaxed select-text" dir="auto">
                      {q.prompt}
                    </p>

                    {/* Options or Essay Model Answer */}
                    {isEssay ? (
                      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-black text-amber-800 dark:text-amber-300">
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4" />
                            <span>الإجابة النموذجية المعتمدة للسؤال المقالي:</span>
                          </span>
                          {!showAnswers && (
                            <span className="text-[10px] font-bold text-muted-foreground">(مخفية)</span>
                          )}
                        </div>
                        {showAnswers ? (
                          <p className="text-xs sm:text-sm font-bold text-foreground whitespace-pre-line leading-relaxed select-text pt-1">
                            {q.correctAnswer || q.explanation || "لم يتم تحديد إجابة نموذجية"}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            (تم إخفاء الإجابة النموذجية - اضغط على زر إظهار الإجابات بالأعلى لعرضها)
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options?.map((opt: string, oIdx: number) => {
                          const isCorrect = typeof q.correctIndex === "number" ? oIdx === q.correctIndex : opt.trim() === correctOptionText.trim();
                          const letter = ["أ", "ب", "ج", "د", "هـ"][oIdx] || String(oIdx + 1);

                          const highlightCorrect = showAnswers && isCorrect;

                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                                highlightCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-black shadow-2xs"
                                  : "bg-muted/20 border-border text-foreground font-medium"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-black ${
                                  highlightCorrect ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                }`}>
                                  {letter}
                                </span>
                                <span className="truncate">{opt}</span>
                              </div>
                              {highlightCorrect && (
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-0.5">
                                  <Check className="h-3 w-3" />
                                  <span>الإجابة الصحيحة</span>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation */}
                    {showAnswers && !isEssay && q.explanation && (
                      <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200 font-medium">
                        <strong className="font-black ml-1">تفسير الإجابة:</strong>
                        <span>{q.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-muted/20 border-t border-border/60 shrink-0 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground font-bold">
                تم حفظ وتخزين هذا الاختبار بشكل دائم في النظام.
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedQuizForReview(null)}
                className="text-xs font-bold"
              >
                إغلاق النافذة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz / Homework Views Modal */}
      {viewingQuizStats && (
        <QuizViewsModal
          isOpen={Boolean(viewingQuizStats)}
          onClose={() => setViewingQuizStats(null)}
          quizId={viewingQuizStats.id}
          quizTitle={viewingQuizStats.title}
          isHomework={viewingQuizStats.scope === "homework" || viewingQuizStats.category === "واجب"}
          adminApi={adminApi}
        />
      )}
    </div>
  );
}
