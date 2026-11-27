import React, { useState } from "react";
import { Trash2, Edit, CheckCircle2, Search, AlertCircle, RefreshCw, Eye, EyeOff, X, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AdminApiFn, getOptionLabel, isEnglishQuestion } from "./types";

interface QuizReviewModalProps {
  adminApi: AdminApiFn;
  reviewingQuiz: any | null;
  setReviewingQuiz: (quiz: any | null) => void;
  onPublishQuiz: (quizId: number, publish: boolean) => void;
  onQuizUpdated?: (quiz: any) => void;
}

export function QuizReviewModal({
  adminApi,
  reviewingQuiz,
  setReviewingQuiz,
  onPublishQuiz,
  onQuizUpdated,
}: QuizReviewModalProps) {
  const { toast } = useToast();
  const [reviewShowAnswers, setReviewShowAnswers] = useState<boolean>(true);
  const [isSavingQuizQuestions, setIsSavingQuizQuestions] = useState<boolean>(false);
  const [editingQuizQuestionIdx, setEditingQuizQuestionIdx] = useState<number | null>(null);
  const [replacingQuestionIdx, setReplacingQuestionIdx] = useState<number | null>(null);
  const [candidatePickerModal, setCandidatePickerModal] = useState<{ open: boolean; questionIndex: number } | null>(null);
  const [candidateQuestions, setCandidateQuestions] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [candidateSearch, setCandidateSearch] = useState<string>("");

  // Save changes to Quiz Questions from Review Modal
  const handleSaveReviewedQuizQuestions = async () => {
    if (!reviewingQuiz) return;
    setIsSavingQuizQuestions(true);
    try {
      const updated = await adminApi<any>(`/api/admin/learning/quizzes/${reviewingQuiz.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: reviewingQuiz.title,
          questions: reviewingQuiz.questions,
          isPublished: reviewingQuiz.isPublished,
        }),
      });
      toast({ title: "تم حفظ كافة تعديلات أسئلة الاختبار بنجاح! 💾" });
      setReviewingQuiz(updated);
      setEditingQuizQuestionIdx(null);
      onQuizUpdated?.(updated);
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حفظ التعديلات على الاختبار" });
    } finally {
      setIsSavingQuizQuestions(false);
    }
  };

  // Delete Question from Quiz in Review Modal with confirmation and auto-save
  const handleDeleteQuizQuestion = async (qIdx: number) => {
    if (!reviewingQuiz) return;
    const targetQ = reviewingQuiz.questions[qIdx];
    const confirmMsg = `هل أنت متأكد من حذف هذا السؤال من الاختبار؟\n\n«${targetQ?.prompt?.slice(0, 60)}...»`;
    if (!window.confirm(confirmMsg)) return;

    const nextQuestions = reviewingQuiz.questions.filter((_: any, i: number) => i !== qIdx);
    if (nextQuestions.length === 0) {
      toast({ variant: "destructive", description: "لا يمكن حذف جميع الأسئلة. يجب أن يحتوي الاختبار على سؤال واحد على الأقل." });
      return;
    }

    try {
      const updated = await adminApi<any>(`/api/admin/learning/quizzes/${reviewingQuiz.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: reviewingQuiz.title,
          questions: nextQuestions,
          isPublished: reviewingQuiz.isPublished,
        }),
      });
      setReviewingQuiz(updated);
      if (editingQuizQuestionIdx === qIdx) setEditingQuizQuestionIdx(null);
      onQuizUpdated?.(updated);
      toast({ title: `تم حذف السؤال بنجاح 🗑️ (المتبقي: ${nextQuestions.length} سؤال)` });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حذف السؤال" });
    }
  };

  // Instant 1-Click Replace Question with a clean random question from the bank
  const handleAutoReplaceQuizQuestion = async (qIdx: number) => {
    if (!reviewingQuiz) return;
    setReplacingQuestionIdx(qIdx);
    try {
      const res = await adminApi<any>(`/api/admin/learning/quizzes/${reviewingQuiz.id}/replace-question`, {
        method: "POST",
        body: JSON.stringify({ questionIndex: qIdx }),
      });
      if (res.quiz) {
        setReviewingQuiz(res.quiz);
        onQuizUpdated?.(res.quiz);
        toast({
          title: "تم استبدال السؤال بنجاح! 🔄",
          description: `السؤال الجديد: «${res.newQuestion?.prompt?.slice(0, 50)}...»`,
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر استبدال السؤال من البنك" });
    } finally {
      setReplacingQuestionIdx(null);
    }
  };

  // Open Candidate Picker to choose a specific replacement question manually
  const handleOpenCandidatePicker = async (qIdx: number) => {
    if (!reviewingQuiz) return;
    setCandidatePickerModal({ open: true, questionIndex: qIdx });
    setLoadingCandidates(true);
    setCandidateSearch("");
    try {
      const res = await adminApi<any>(`/api/admin/learning/quizzes/${reviewingQuiz.id}/replacement-candidates`);
      setCandidateQuestions(res.candidates || []);
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر جلب الأسئلة البديلة" });
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Pick a specific candidate question
  const handlePickCandidateQuestion = async (candidate: any) => {
    if (!reviewingQuiz || !candidatePickerModal) return;
    const qIdx = candidatePickerModal.questionIndex;
    try {
      const res = await adminApi<any>(`/api/admin/learning/quizzes/${reviewingQuiz.id}/replace-question`, {
        method: "POST",
        body: JSON.stringify({
          questionIndex: qIdx,
          replacementQuestionId: candidate.id,
          replacementQuestion: candidate.question,
        }),
      });
      if (res.quiz) {
        setReviewingQuiz(res.quiz);
        onQuizUpdated?.(res.quiz);
        setCandidatePickerModal(null);
        toast({
          title: "تم استبدال السؤال بالسؤال المختار بنجاح! 🎯",
          description: `السؤال الجديد: «${candidate.question?.prompt?.slice(0, 50)}...»`,
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر استبدال السؤال" });
    }
  };

  return (
    <>
      {reviewingQuiz && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5"
          onClick={(e) => e.target === e.currentTarget && setReviewingQuiz(null)}
        >
          <div className="w-full max-w-4xl bg-card rounded-3xl shadow-2xl border border-border text-right max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-foreground">
                      مراجعة أسئلة الاختبار: {reviewingQuiz.title}
                    </h3>
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        reviewingQuiz.isPublished
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {reviewingQuiz.isPublished ? "منشور للطلاب 🟢" : "مسودة غير منشورة 🔒"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {reviewingQuiz.questions?.length || 0} أسئلة · درجة النجاح: {reviewingQuiz.passingScore}% ·{" "}
                    {reviewingQuiz.openHours ? `الإتاحة: ${reviewingQuiz.openHours} ساعة` : "مفتوح دائماً"} ·{" "}
                    {reviewingQuiz.durationMinutes ? `مؤقت ${reviewingQuiz.durationMinutes} دقيقة` : "بدون مؤقت"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Direct Toggle Answers Button */}
                <button
                  type="button"
                  onClick={() => setReviewShowAnswers((prev) => !prev)}
                  className={`h-9 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border shadow-2xs ${
                    reviewShowAnswers
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted border-border text-muted-foreground hover:text-foreground"
                  }`}
                  title="الضغط هنا يُظهر أو يُخفي الإجابات النموذجية"
                >
                  {reviewShowAnswers ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4" />}
                  <span>{reviewShowAnswers ? "الإجابات: معروضة ✓" : "الإجابات: مخفية 🙈"}</span>
                </button>

                {/* Publish / Unpublish direct toggle button */}
                {!reviewingQuiz.isPublished ? (
                  <Button
                    type="button"
                    onClick={() => onPublishQuiz(reviewingQuiz.id, true)}
                    className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" /> نشر الاختبار للطلاب الآن 🚀
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onPublishQuiz(reviewingQuiz.id, false)}
                    className="h-9 px-3.5 rounded-xl text-xs font-bold border-amber-500/40 text-amber-600 hover:bg-amber-500/10 cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock className="h-3.5 w-3.5" /> تحويل لمسودة (إخفاء عن الطلاب) 🔒
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setReviewingQuiz(null)}
                  className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Notice Bar */}
            <div className="px-5 py-2.5 bg-muted/40 border-b border-border/80 flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {reviewingQuiz.isPublished
                    ? "الاختبار منشور وظاهر للطلاب حالياً. يمكنك تعديل أي سؤال وحفظ التغييرات فوراً."
                    : "الاختبار محفوظ كمسودة ولن يظهر للطلاب حتى تضغط على زر «نشر الاختبار للطلاب الآن». راجع الأسئلة وتأكد منها بحرية."}
                </span>
              </span>
              <span className="font-bold text-foreground shrink-0 pr-2">
                إجمالي الأسئلة: {reviewingQuiz.questions?.length || 0}
              </span>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(reviewingQuiz.questions || []).length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-xs font-bold border border-dashed border-border rounded-2xl">
                  لا توجد أسئلة داخل هذا الاختبار
                </div>
              ) : (
                (reviewingQuiz.questions || []).map((q: any, qIdx: number) => {
                  const isEnglish = isEnglishQuestion(q.prompt, q.options);
                  const isEditingThis = editingQuizQuestionIdx === qIdx;

                  return (
                    <div
                      key={qIdx}
                      className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 transition-colors"
                    >
                      {/* Question Top Bar */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white text-xs font-black">
                            {qIdx + 1}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              isEnglish
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {isEnglish ? "EN (LTR)" : "عربي (RTL)"}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-bold">
                            {q.points || 1} {q.points === 1 ? "درجة" : "درجات"}
                          </span>
                          {q.lesson && (
                            <span
                              className="text-[10px] font-black px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 max-w-[220px] truncate"
                              title={`الدرس: ${q.lesson}`}
                            >
                              📖 {q.lesson}
                            </span>
                          )}
                          {q.difficulty && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {q.difficulty === "easy" ? "سهل 🟢" : q.difficulty === "hard" ? "صعب 🔴" : "متوسط 🟡"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingQuizQuestionIdx(isEditingThis ? null : qIdx)}
                            className="h-7 text-[11px] font-bold gap-1 text-slate-600 dark:text-slate-300 hover:text-primary cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span>{isEditingThis ? "إغلاق التعديل" : "تعديل السؤال"}</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={replacingQuestionIdx === qIdx}
                            onClick={() => handleAutoReplaceQuizQuestion(qIdx)}
                            className="h-7 text-[11px] font-bold gap-1 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 cursor-pointer"
                            title="استبدال السؤال بسؤال بديل عشوائي من البنك"
                          >
                            <RefreshCw className={`h-3 w-3 ${replacingQuestionIdx === qIdx ? "animate-spin" : ""}`} />
                            <span>{replacingQuestionIdx === qIdx ? "جارٍ الاستبدال..." : "استبدال السؤال 🔄"}</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCandidatePicker(qIdx)}
                            className="h-7 text-[11px] font-bold gap-1 text-blue-700 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 cursor-pointer"
                            title="تصفح بنك الأسئلة واختيار سؤال بديل محدد"
                          >
                            <Search className="h-3 w-3" />
                            <span>اختر بديلاً...</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuizQuestion(qIdx)}
                            className="h-7 text-[11px] font-bold gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 cursor-pointer"
                            title="حذف هذا السؤال من الاختبار نهائياً"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>حذف السؤال</span>
                          </Button>
                        </div>
                      </div>

                      {/* Inline Editor or Display */}
                      {isEditingThis ? (
                        <div className="space-y-3 pt-1 bg-muted/20 p-3 rounded-xl border border-primary/20">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground">نص السؤال:</label>
                            <textarea
                              rows={2}
                              dir={isEnglish ? "ltr" : "rtl"}
                              value={q.prompt}
                              onChange={(e) => {
                                const nextQuestions = [...reviewingQuiz.questions];
                                nextQuestions[qIdx] = { ...nextQuestions[qIdx], prompt: e.target.value };
                                setReviewingQuiz({ ...reviewingQuiz, questions: nextQuestions });
                              }}
                              className={`w-full rounded-xl border border-border bg-background p-2.5 text-xs font-bold ${
                                isEnglish ? "text-left font-sans" : "text-right font-sans"
                              }`}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground">
                              الاختيارات (اختر الدائرة للإجابة الصحيحة):
                            </label>
                            {(q.options || []).map((opt: string, oIdx: number) => {
                              const letter = getOptionLabel(oIdx, isEnglish);
                              const isChecked = q.correctIndex === oIdx;
                              return (
                                <div key={oIdx} dir={isEnglish ? "ltr" : "rtl"} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`review-correct-${qIdx}`}
                                    checked={isChecked}
                                    onChange={() => {
                                      const nextQuestions = [...reviewingQuiz.questions];
                                      nextQuestions[qIdx] = { ...nextQuestions[qIdx], correctIndex: oIdx };
                                      setReviewingQuiz({ ...reviewingQuiz, questions: nextQuestions });
                                    }}
                                    className="h-4 w-4 accent-emerald-600 cursor-pointer shrink-0"
                                  />
                                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-[11px] font-black shrink-0">
                                    {letter}
                                  </span>
                                  <input
                                    type="text"
                                    dir={isEnglish ? "ltr" : "rtl"}
                                    value={opt}
                                    onChange={(e) => {
                                      const nextQuestions = [...reviewingQuiz.questions];
                                      const nextOpts = [...nextQuestions[qIdx].options];
                                      nextOpts[oIdx] = e.target.value;
                                      nextQuestions[qIdx] = { ...nextQuestions[qIdx], options: nextOpts };
                                      setReviewingQuiz({ ...reviewingQuiz, questions: nextQuestions });
                                    }}
                                    className={`flex-1 h-8 px-3 rounded-xl border text-xs font-bold bg-background ${
                                      isChecked ? "border-emerald-500/50 bg-emerald-500/5" : "border-border"
                                    } ${isEnglish ? "text-left font-sans" : "text-right font-sans"}`}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-muted-foreground">الدرجة:</label>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={q.points || 1}
                                onChange={(e) => {
                                  const nextQuestions = [...reviewingQuiz.questions];
                                  nextQuestions[qIdx] = { ...nextQuestions[qIdx], points: Number(e.target.value) };
                                  setReviewingQuiz({ ...reviewingQuiz, questions: nextQuestions });
                                }}
                                className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-bold text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-muted-foreground">التفسير:</label>
                              <input
                                type="text"
                                dir={isEnglish ? "ltr" : "rtl"}
                                value={q.explanation || ""}
                                onChange={(e) => {
                                  const nextQuestions = [...reviewingQuiz.questions];
                                  nextQuestions[qIdx] = { ...nextQuestions[qIdx], explanation: e.target.value };
                                  setReviewingQuiz({ ...reviewingQuiz, questions: nextQuestions });
                                }}
                                placeholder="خطوات الإجابة النموذجية..."
                                className={`w-full h-8 px-2 rounded-lg border border-border bg-background text-xs ${
                                  isEnglish ? "text-left font-sans" : "text-right font-sans"
                                }`}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setEditingQuizQuestionIdx(null)}
                              className="h-7 text-xs bg-primary text-white font-bold"
                            >
                              تم تعديل السؤال ✓
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p
                            dir={isEnglish ? "ltr" : "rtl"}
                            className={`text-xs font-bold text-foreground leading-relaxed whitespace-pre-line ${
                              isEnglish ? "text-left font-sans" : "text-right font-sans"
                            }`}
                          >
                            {q.prompt}
                          </p>

                          {q.imageUrl && (
                            <div className="max-w-xs rounded-xl overflow-hidden border border-border">
                              <img src={q.imageUrl} alt="صورة السؤال" className="h-32 w-full object-cover" />
                            </div>
                          )}

                          {/* Choices */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1" dir={isEnglish ? "ltr" : "rtl"}>
                            {(q.options || []).map((opt: string, oIdx: number) => {
                              const isCorrect = oIdx === q.correctIndex;
                              const highlightCorrect = reviewShowAnswers && isCorrect;
                              const letter = getOptionLabel(oIdx, isEnglish);
                              return (
                                <div
                                  key={oIdx}
                                  dir={isEnglish ? "ltr" : "rtl"}
                                  className={`p-2 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                                    highlightCorrect
                                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold"
                                      : "bg-muted/40 border-border text-foreground"
                                  }`}
                                >
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black mt-0.5 ${
                                      highlightCorrect ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <span className={`flex-1 whitespace-normal break-words leading-relaxed ${isEnglish ? "text-left font-sans font-medium" : "text-right font-medium"}`}>
                                    {opt}
                                  </span>
                                  {highlightCorrect && (
                                    <Check className={`h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5 ${isEnglish ? "ml-auto" : "mr-auto"}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation */}
                          {reviewShowAnswers && q.explanation && (
                            <div
                              dir={isEnglish ? "ltr" : "rtl"}
                              className={`p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-primary space-y-0.5 ${
                                isEnglish ? "text-left font-sans" : "text-right font-sans"
                              }`}
                            >
                              <span className="font-bold block">
                                {isEnglish ? "Explanation / Steps:" : "التفسير / خطوات الإجابة:"}
                              </span>
                              <p className="text-foreground">{q.explanation}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 flex items-center justify-between p-4 border-t border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  disabled={isSavingQuizQuestions}
                  onClick={handleSaveReviewedQuizQuestions}
                  className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  {isSavingQuizQuestions ? "جارٍ حفظ التعديلات..." : "حفظ التعديلات على الاختبار 💾"}
                </Button>

                {!reviewingQuiz.isPublished && (
                  <Button
                    type="button"
                    onClick={async () => {
                      await handleSaveReviewedQuizQuestions();
                      await onPublishQuiz(reviewingQuiz.id, true);
                    }}
                    className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm"
                  >
                    حفظ ونشر للطلاب الآن 🚀
                  </Button>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewingQuiz(null)}
                className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء وإغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CANDIDATE QUESTION PICKER MODAL                              */}
      {/* ============================================================ */}
      {candidatePickerModal && candidatePickerModal.open && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-5"
          onClick={(e) => e.target === e.currentTarget && setCandidatePickerModal(null)}
        >
          <div className="w-full max-w-3xl bg-card rounded-3xl shadow-2xl border border-border text-right max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    اختيار سؤال بديل من بنك الأسئلة
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    اختر السؤال البديل المناسب لاستبداله بالسؤال رقم {(candidatePickerModal.questionIndex ?? 0) + 1}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCandidatePickerModal(null)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-border bg-card">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث في نص الأسئلة أو الاختيارات البديلة..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full h-10 pr-9 pl-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Candidates List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingCandidates ? (
                <div className="p-12 text-center text-muted-foreground text-xs font-bold flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span>جارٍ جلب الأسئلة البديلة المتوفرة في البنك...</span>
                </div>
              ) : (() => {
                const filtered = candidateQuestions.filter((c: any) => {
                  if (!candidateSearch.trim()) return true;
                  const s = candidateSearch.trim().toLowerCase();
                  const inPrompt = String(c.question?.prompt || "").toLowerCase().includes(s);
                  const inOpts = (c.question?.options || []).some((o: string) => String(o).toLowerCase().includes(s));
                  const inLesson = String(c.lesson || "").toLowerCase().includes(s);
                  return inPrompt || inOpts || inLesson;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-12 text-center text-muted-foreground text-xs font-bold border border-dashed border-border rounded-2xl">
                      {candidateQuestions.length === 0
                        ? "لا توجد أسئلة بديلة إضافية غير مستخدمة في بنك الأسئلة لهذا النطاق."
                        : "لا توجد نتائج مطابقة لبحثك."}
                    </div>
                  );
                }

                return filtered.map((c: any) => {
                  const isEng = isEnglishQuestion(c.question?.prompt, c.question?.options);
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-border bg-muted/20 hover:border-primary/50 hover:bg-card transition-all p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/40 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                            {c.lesson || c.stage || "عام"}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            c.difficulty === "easy"
                              ? "bg-emerald-500/15 text-emerald-600"
                              : c.difficulty === "hard"
                              ? "bg-rose-500/15 text-rose-600"
                              : "bg-amber-500/15 text-amber-600"
                          }`}>
                            {c.difficulty === "easy" ? "سهل" : c.difficulty === "hard" ? "صعب" : "متوسط"}
                          </span>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handlePickCandidateQuestion(c)}
                          className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer shadow-xs gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>اختيار هذا السؤال كبديل 🎯</span>
                        </Button>
                      </div>

                      <p
                        dir={isEng ? "ltr" : "rtl"}
                        className={`text-xs font-bold text-foreground leading-relaxed ${
                          isEng ? "text-left font-sans" : "text-right font-sans"
                        }`}
                      >
                        {c.question?.prompt}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1" dir={isEng ? "ltr" : "rtl"}>
                        {(c.question?.options || []).map((opt: string, optIdx: number) => {
                          const isCorr = optIdx === c.question?.correctIndex;
                          const lbl = getOptionLabel(optIdx, isEng);
                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                                isCorr
                                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold"
                                  : "bg-background border-border text-foreground"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black mt-0.5 ${
                                  isCorr ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {lbl}
                              </span>
                              <span className={`flex-1 whitespace-normal break-words leading-relaxed ${isEng ? "text-left font-sans" : "text-right"}`}>
                                {opt}
                              </span>
                              {isCorr && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

export default QuizReviewModal;
