import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  X,
  Check,
  Loader2,
  Clock,
  Award,
  RefreshCw,
  Shuffle,
  CheckSquare,
  BookOpen,
  Layers,
  Target,
  FileCheck2,
  Trash2,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { QuizQuestion } from "@/types/platform";

interface CurriculumQuickExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: string;
  unit: string;
  lesson: string;
  totalAvailableQuestions: number;
  availableUnitLessons?: Array<{ lesson: string; totalQuestions: number }>;
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onSuccess: (quiz: any) => void;
  initialMode?: "exam" | "homework";
}

export function CurriculumQuickExamModal({
  isOpen,
  onClose,
  stage,
  unit,
  lesson,
  totalAvailableQuestions,
  availableUnitLessons = [],
  adminApi,
  onSuccess,
  initialMode = "exam",
}: CurriculumQuickExamModalProps) {
  const { toast } = useToast();

  const isInitialWholeUnit = lesson === "all";

  // Mode: "exam" = اختبار / امتحان إلكتروني, "homework" = واجب منزلي
  const [creationMode, setCreationMode] = useState<"exam" | "homework">(initialMode);

  // Wizard Step: "config" = Settings & Filters, "review" = Preview & Inspect Questions
  const [currentStep, setCurrentStep] = useState<"config" | "review">("config");

  // Scope: "single" = current lesson only, "multi" = user selects specific lessons, "unit" = all lessons in unit
  const [examScope, setExamScope] = useState<"single" | "multi" | "unit">(
    isInitialWholeUnit ? "unit" : "single"
  );

  // Multi-lesson selected state
  const [selectedMultiLessons, setSelectedMultiLessons] = useState<string[]>([]);
  const [isTitleCustomized, setIsTitleCustomized] = useState(false);

  // Active lessons pool in this unit
  const unitLessonsList = useMemo(() => {
    if (availableUnitLessons.length > 0) return availableUnitLessons;
    if (lesson && lesson !== "all") {
      return [{ lesson, totalQuestions: totalAvailableQuestions }];
    }
    return [];
  }, [availableUnitLessons, lesson, totalAvailableQuestions]);

  // Compute available questions count based on chosen scope
  const activeAvailableCount = useMemo(() => {
    if (examScope === "single") {
      if (unitLessonsList.length > 0) {
        const found = unitLessonsList.find((l) => l.lesson === lesson);
        return found ? found.totalQuestions : totalAvailableQuestions;
      }
      return totalAvailableQuestions;
    }
    if (examScope === "multi") {
      const selectedSet = new Set(selectedMultiLessons);
      return unitLessonsList
        .filter((l) => selectedSet.has(l.lesson))
        .reduce((sum, l) => sum + (l.totalQuestions || 0), 0);
    }
    // Unit scope
    return unitLessonsList.reduce((sum, l) => sum + (l.totalQuestions || 0), totalAvailableQuestions);
  }, [examScope, lesson, selectedMultiLessons, unitLessonsList, totalAvailableQuestions]);

  const [title, setTitle] = useState("");
  const [questionsCount, setQuestionsCount] = useState<number>(10);
  const [questionType, setQuestionType] = useState<"all" | "mcq" | "true_false">("all");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [passingScore, setPassingScore] = useState<number>(60);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [isPublished, setIsPublished] = useState<boolean>(true);

  // Loading states
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [savingPublish, setSavingPublish] = useState<boolean>(false);

  // Reviewed questions state (populated from preview endpoint)
  const [reviewedQuestions, setReviewedQuestions] = useState<QuizQuestion[]>([]);

  // Helper: Generate smart dynamic title
  const generateSuggestedTitle = (
    mode: "exam" | "homework",
    scope: "single" | "multi" | "unit",
    singleLes: string,
    multiLessons: string[]
  ) => {
    const prefix = mode === "homework" ? "واجب منزلي" : "اختبار تقييمي";
    if (scope === "single") {
      return `${prefix}: ${singleLes}`;
    }
    if (scope === "multi") {
      if (multiLessons.length === 0) return `${prefix}: مراجعة دروس مخصصة`;
      if (multiLessons.length === 1) return `${prefix} على: ${multiLessons[0]}`;
      if (multiLessons.length === 2) return `${prefix}: ${multiLessons[0]} و ${multiLessons[1]}`;
      return `${prefix} شامل على ${multiLessons.length} دروس مختارة (${unit})`;
    }
    return `${prefix} شامل على (${unit})`;
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentStep("config");
      setCreationMode(initialMode);
      const initialScope = isInitialWholeUnit ? "unit" : "single";
      setExamScope(initialScope);
      const initialSelected = lesson && lesson !== "all" ? [lesson] : [];
      setSelectedMultiLessons(initialSelected);
      setIsTitleCustomized(false);
      setTitle(generateSuggestedTitle(initialMode, initialScope, lesson, initialSelected));
      setQuestionsCount(Math.min(15, Math.max(5, totalAvailableQuestions || 10)));
      setQuestionType("all");
      setDurationMinutes(initialMode === "homework" ? 0 : 30);
      setPassingScore(60);
      setMaxAttempts(3);
      setShuffleQuestions(true);
      setIsPublished(true);
      setReviewedQuestions([]);
    }
  }, [isOpen, unit, lesson, totalAvailableQuestions, isInitialWholeUnit, initialMode]);

  // Adjust title when mode, scope, or selected multi lessons change
  const handleModeChange = (newMode: "exam" | "homework") => {
    setCreationMode(newMode);
    if (newMode === "homework") {
      setDurationMinutes(0); // open time for homework
    } else {
      setDurationMinutes(30);
    }
    if (!isTitleCustomized) {
      setTitle(generateSuggestedTitle(newMode, examScope, lesson, selectedMultiLessons));
    }
  };

  const handleScopeChange = (newScope: "single" | "multi" | "unit") => {
    setExamScope(newScope);
    if (!isTitleCustomized) {
      setTitle(generateSuggestedTitle(creationMode, newScope, lesson, selectedMultiLessons));
    }
    if (newScope === "multi" && selectedMultiLessons.length === 0 && lesson && lesson !== "all") {
      setSelectedMultiLessons([lesson]);
    }
  };

  const handleToggleMultiLesson = (lesName: string) => {
    let next: string[];
    if (selectedMultiLessons.includes(lesName)) {
      next = selectedMultiLessons.filter((l) => l !== lesName);
    } else {
      next = [...selectedMultiLessons, lesName];
    }
    setSelectedMultiLessons(next);
    if (!isTitleCustomized) {
      setTitle(generateSuggestedTitle(creationMode, "multi", lesson, next));
    }
  };

  // Step 1 -> Step 2: Fetch and Preview Questions for Review
  const handlePreviewQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى كتابة عنوان للمهمة" });
      return;
    }

    if (examScope === "multi" && selectedMultiLessons.length === 0) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى اختيار درس واحد على الأقل" });
      return;
    }

    setLoadingPreview(true);
    try {
      const isMulti = examScope === "multi";
      const isSingle = examScope === "single";

      const payload = {
        title: title.trim(),
        stage,
        unit: examScope === "unit" ? unit : undefined,
        scope: creationMode === "homework" ? "homework" : (examScope === "unit" ? "unit" : "lesson"),
        lesson: isSingle ? lesson : undefined,
        lessons: isMulti ? selectedMultiLessons : undefined,
        count: Number(questionsCount) || 10,
        questionType: questionType === "all" ? undefined : questionType,
        isHomework: creationMode === "homework",
      };

      const res = await adminApi<{ questions: QuizQuestion[]; targetCount: number; targetLessons: string[] }>(
        "/api/admin/learning/test-bank/preview-exam",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!res.questions || res.questions.length === 0) {
        throw new Error("لم يتم العثور على أسئلة تطابق هذه الشروط في بنك الأسئلة.");
      }

      setReviewedQuestions(res.questions);
      setCurrentStep("review");
      toast({
        title: "تم استخراج الأسئلة للمراجعة 🔍",
        description: `تم سحب ${res.questions.length} سؤالاً بنجاح. راجع الأسئلة واحذف ما لا ترغب به قبل النشر.`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "تنبيه", description: err.message || "تعذر استخراج الأسئلة للمراجعة" });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Remove a question during review
  const handleRemoveQuestion = (indexToRemove: number) => {
    setReviewedQuestions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Step 2: Final Publish of Reviewed Questions
  const handleFinalPublish = async () => {
    if (reviewedQuestions.length === 0) {
      toast({ variant: "destructive", title: "تنبيه", description: "لا توجد أسئلة متبقية للنشر. يرجى العودة وإعادة الاختيار." });
      return;
    }

    setSavingPublish(true);
    try {
      const isMulti = examScope === "multi";
      const isSingle = examScope === "single";

      const payload = {
        title: title.trim(),
        stage,
        unit: examScope === "unit" ? unit : undefined,
        scope: creationMode === "homework" ? "homework" : (examScope === "unit" ? "unit" : "lesson"),
        lesson: isSingle ? lesson : undefined,
        lessons: isMulti ? selectedMultiLessons : undefined,
        count: reviewedQuestions.length,
        durationMinutes: creationMode === "homework" ? null : (Number(durationMinutes) || 30),
        passingScore: Number(passingScore) || 60,
        maxAttempts: Number(maxAttempts) || 3,
        shuffleQuestions,
        isPublished,
        isHomework: creationMode === "homework",
        customQuestions: reviewedQuestions,
      };

      const res = await adminApi<any>("/api/admin/learning/test-bank/generate-exam", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const actualCreated = res.quiz || res;
      const isHw = creationMode === "homework";

      toast({
        title: isHw ? "تم نشر الواجب لطلاب المرحلة بنجاح! 📚" : "تم نشر الامتحان للطلاب بنجاح! 🚀",
        description: `تم إسناد "${title}" بـ ${reviewedQuestions.length} سؤالاً لطلاب مرحلة ${stage}.`,
      });

      onSuccess(actualCreated);
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر إتمام النشر" });
    } finally {
      setSavingPublish(false);
    }
  };

  if (!isOpen) return null;

  // Breakdown counts of reviewed questions
  const reviewedMcqCount = reviewedQuestions.filter((q) => q.questionType !== "true_false" && q.options?.length > 2).length;
  const reviewedTfCount = reviewedQuestions.length - reviewedMcqCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-4 sm:p-5 shrink-0 bg-muted/10">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl border shadow-xs ${
              creationMode === "homework"
                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                : "bg-violet-600/10 text-violet-600 border-violet-600/20"
            }`}>
              {creationMode === "homework" ? <BookOpen className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-foreground">
                  {creationMode === "homework" ? "إنشاء وإسناد واجب منزلي للطلاب" : "إنشاء امتحان إلكتروني تقييمي"}
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  creationMode === "homework"
                    ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                    : "bg-violet-500/15 text-violet-600 border-violet-500/30"
                }`}>
                  {creationMode === "homework" ? "واجب منزلي" : "امتحان إلكتروني"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold">
                {unit} • {stage} {currentStep === "review" && "• خطوة مراجعة الأسئلة"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* STEP 1: CONFIGURATION FORM */}
        {currentStep === "config" && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
            {/* Mode Switch: Exam vs Homework */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                <span>نوع المهمة المطلوبة:</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => handleModeChange("exam")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    creationMode === "exam"
                      ? "bg-violet-600 text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>امتحان إلكتروني (اختبارات)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("homework")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    creationMode === "homework"
                      ? "bg-amber-600 text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>واجب منزلي (صفحة الواجب)</span>
                </button>
              </div>
            </div>

            {/* Scope Selector: Single Lesson, Multi Lessons, or Whole Unit */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                <Target className="h-4 w-4 text-violet-600" />
                <span>نطاق استخراج الأسئلة من بنك الأسئلة:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/40 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => handleScopeChange("single")}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    examScope === "single"
                      ? "bg-violet-600 text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Target className="h-3.5 w-3.5" />
                  <span>الدرس الحالي</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScopeChange("multi")}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    examScope === "multi"
                      ? "bg-violet-600 text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>عدة دروس مخصصة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScopeChange("unit")}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    examScope === "unit"
                      ? "bg-violet-600 text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>شامل الوحدة</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePreviewQuestions} className="space-y-4">
              {/* Multi-lessons Checklist (if examScope === "multi") */}
              {examScope === "multi" && (
                <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-foreground">
                    <span className="flex items-center gap-1.5">
                      <CheckSquare className="h-4 w-4 text-violet-600" />
                      <span>حدد الدروس المطلوب استخراج الأسئلة منها بالتساوي:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const all = unitLessonsList.filter((l) => l.totalQuestions > 0).map((l) => l.lesson);
                          setSelectedMultiLessons(all);
                          if (!isTitleCustomized) setTitle(generateSuggestedTitle(creationMode, "multi", lesson, all));
                        }}
                        className="text-[10px] text-violet-600 font-bold hover:underline cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMultiLessons([]);
                          if (!isTitleCustomized) setTitle(generateSuggestedTitle(creationMode, "multi", lesson, []));
                        }}
                        className="text-[10px] text-muted-foreground font-bold hover:underline cursor-pointer"
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  </div>

                  {unitLessonsList.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">لا توجد دروس أخرى مسجلة في هذه الوحدة.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      {unitLessonsList.map((lesItem, idx) => {
                        const isChecked = selectedMultiLessons.includes(lesItem.lesson);
                        const hasQuestions = lesItem.totalQuestions > 0;
                        return (
                          <div
                            key={idx}
                            onClick={() => hasQuestions && handleToggleMultiLesson(lesItem.lesson)}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                              !hasQuestions
                                ? "opacity-50 bg-muted/20 border-border cursor-not-allowed"
                                : isChecked
                                ? "bg-violet-600/15 border-violet-600 text-foreground font-bold shadow-xs"
                                : "bg-background border-border hover:bg-muted/40 text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!hasQuestions}
                                readOnly
                                className="h-3.5 w-3.5 accent-violet-600 pointer-events-none rounded"
                              />
                              <span className="truncate text-[11px]">{lesItem.lesson}</span>
                            </div>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isChecked ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"}`}>
                              {lesItem.totalQuestions} س
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-[11px] font-bold text-violet-700 dark:text-violet-300 flex items-center justify-between pt-1 border-t border-violet-500/20">
                    <span>تم اختيار: {selectedMultiLessons.length} دروس</span>
                    <span>إجمالي الأسئلة المتاحة: {activeAvailableCount} سؤال</span>
                  </div>
                </div>
              )}

              {/* Title Input with Smart Suggestion */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    {creationMode === "homework" ? "عنوان الواجب المنزلي *" : "عنوان الاختبار الإلكتروني *"}
                  </label>
                  {isTitleCustomized && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsTitleCustomized(false);
                        setTitle(generateSuggestedTitle(creationMode, examScope, lesson, selectedMultiLessons));
                      }}
                      className="text-[10px] text-violet-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      استعادة العنوان الذكي
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsTitleCustomized(true);
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>

              {/* Grid Settings: Count and Question Types (MCQ + True/False) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">عدد الأسئلة المطلوب:</label>
                    <span className="text-[11px] font-black text-violet-600">
                      (المتاح: {activeAvailableCount})
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, activeAvailableCount)}
                    value={questionsCount}
                    onChange={(e) => setQuestionsCount(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">نوع الأسئلة (حصر دقيق):</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="all">مزيج شامل (MCQ + صواب وخطأ)</option>
                    <option value="mcq">اختيار من متعدد فقط (MCQ)</option>
                    <option value="true_false">صواب أم خطأ فقط (True/False)</option>
                  </select>
                </div>

                {creationMode === "exam" && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">المدة بالدقائق (0 = مفتوح):</label>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">نسبة النجاح المطلوبة %:</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">عدد المحاولات المسموحة:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Options Toggles */}
              <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground select-none">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="rounded text-violet-600 focus:ring-violet-500 h-4 w-4"
                  />
                  <span>خلط ترتيب الأسئلة عشوائياً بين الدروس لكل طالب</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground select-none">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>
                    {creationMode === "homework"
                      ? "إظهار ونشر الواجب لطلاب المرحلة فوراً داخل تبويب الواجب"
                      : "نشر الاختبار لطلاب المرحلة فوراً داخل منصة الاختبارات"}
                  </span>
                </label>
              </div>

              {/* Submit to Preview Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loadingPreview}>
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loadingPreview || activeAvailableCount === 0}
                  className={`gap-1.5 text-white font-bold cursor-pointer ${
                    creationMode === "homework"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-violet-600 hover:bg-violet-700"
                  }`}
                >
                  {loadingPreview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span>معاينة ومراجعة الأسئلة قبل النشر 🔍</span>
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: REVIEW QUESTIONS VIEW */}
        {currentStep === "review" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Review Bar Summary */}
            <div className="p-3 sm:p-4 bg-muted/30 border-b border-border/60 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-foreground">
                    تم استخراج {reviewedQuestions.length} سؤالاً للمراجعة
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    {reviewedMcqCount} اختيار من متعدد
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                    {reviewedTfCount} صواب وخطأ
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  يمكنك مراجعة كل سؤال وحذف أي سؤال لا ترغب به قبل الضغط على النشر النهائي.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep("config")}
                  disabled={savingPublish}
                  className="gap-1 text-xs font-bold cursor-pointer"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>تعديل الإعدادات</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFinalPublish}
                  disabled={savingPublish || reviewedQuestions.length === 0}
                  className={`gap-1.5 text-white font-bold cursor-pointer ${
                    creationMode === "homework"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-violet-600 hover:bg-violet-700"
                  }`}
                >
                  {savingPublish ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>
                    {creationMode === "homework"
                      ? `نشر الواجب لطلاب المرحلة (${reviewedQuestions.length} سؤال) 🚀`
                      : `نشر الامتحان للطلاب (${reviewedQuestions.length} سؤال) 🚀`}
                  </span>
                </Button>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {reviewedQuestions.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-foreground">تم حذف جميع الأسئلة المستخرجة.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep("config")}
                    className="text-xs font-bold"
                  >
                    العودة للإعدادات وإعادة الاستخراج
                  </Button>
                </div>
              ) : (
                reviewedQuestions.map((q, idx) => {
                  const isTf = q.questionType === "true_false" || (q.options && q.options.length === 2 && (q.options.includes("صواب") || q.options.includes("صح")));
                  const correctOptionText = q.correctAnswer || (q.options && typeof q.correctIndex === "number" ? q.options[q.correctIndex] : "");

                  return (
                    <div
                      key={idx}
                      className="p-3.5 sm:p-4 rounded-xl border border-border bg-card dark:bg-[#070D18] shadow-2xs space-y-3 transition-all hover:border-violet-500/40"
                    >
                      {/* Card Header: Question index, Badges, Delete button */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="grid h-6 w-6 place-items-center rounded-lg bg-muted text-foreground text-xs font-black">
                            {idx + 1}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                            isTf
                              ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          }`}>
                            {isTf ? "صواب أم خطأ" : "اختيار من متعدد"}
                          </span>
                          {q.lesson && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted/60 text-muted-foreground truncate max-w-[200px]">
                              {q.lesson}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          title="حذف السؤال من هذا الامتحان/الواجب"
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">حذف</span>
                        </button>
                      </div>

                      {/* Question Prompt */}
                      <p className="text-xs sm:text-sm font-black text-foreground leading-relaxed select-text" dir="auto">
                        {q.prompt}
                      </p>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options?.map((opt, oIdx) => {
                          const isCorrect = typeof q.correctIndex === "number" ? oIdx === q.correctIndex : opt.trim() === correctOptionText.trim();
                          const letter = ["أ", "ب", "ج", "د", "هـ"][oIdx] || String(oIdx + 1);

                          return (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                                isCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-black shadow-2xs"
                                  : "bg-muted/20 border-border text-foreground font-medium"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-black ${
                                  isCorrect ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                }`}>
                                  {letter}
                                </span>
                                <span className="truncate">{opt}</span>
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-0.5">
                                  <Check className="h-3 w-3" />
                                  <span>الإجابة الصحيحة</span>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation if available */}
                      {q.explanation && (
                        <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200 font-medium">
                          <strong className="font-black ml-1">تفسير الإجابة:</strong>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with Final Publish Button */}
            <div className="p-4 bg-muted/20 border-t border-border/60 shrink-0 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep("config")}
                disabled={savingPublish}
                className="gap-1 text-xs font-bold cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>رجوع للإعدادات</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={savingPublish}
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleFinalPublish}
                  disabled={savingPublish || reviewedQuestions.length === 0}
                  className={`gap-1.5 text-white font-bold cursor-pointer ${
                    creationMode === "homework"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-violet-600 hover:bg-violet-700"
                  }`}
                >
                  {savingPublish ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>
                    {creationMode === "homework"
                      ? `نشر الواجب لطلاب المرحلة (${reviewedQuestions.length} سؤال) 🚀`
                      : `نشر الامتحان للطلاب (${reviewedQuestions.length} سؤال) 🚀`}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
