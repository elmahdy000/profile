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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
}: CurriculumQuickExamModalProps) {
  const { toast } = useToast();

  const isInitialWholeUnit = lesson === "all";

  // Mode: "single" = current lesson only, "multi" = user selects specific lessons, "unit" = all lessons in unit
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
  const [generating, setGenerating] = useState<boolean>(false);

  // Helper: Generate smart dynamic title
  const generateSuggestedTitle = (
    scope: "single" | "multi" | "unit",
    singleLes: string,
    multiLessons: string[]
  ) => {
    if (scope === "single") {
      return `اختبار تقييمي: ${singleLes}`;
    }
    if (scope === "multi") {
      if (multiLessons.length === 0) return "اختبار مراجعة مخصص";
      if (multiLessons.length === 1) return `اختبار على: ${multiLessons[0]}`;
      if (multiLessons.length === 2) return `اختبار تقييمي: ${multiLessons[0]} و ${multiLessons[1]}`;
      return `اختبار مراجعة على ${multiLessons.length} دروس مختارة (${unit})`;
    }
    return `اختبار شامل على (${unit})`;
  };

  useEffect(() => {
    if (isOpen) {
      const initialScope = isInitialWholeUnit ? "unit" : "single";
      setExamScope(initialScope);
      const initialSelected = lesson && lesson !== "all" ? [lesson] : [];
      setSelectedMultiLessons(initialSelected);
      setIsTitleCustomized(false);
      setTitle(generateSuggestedTitle(initialScope, lesson, initialSelected));
      setQuestionsCount(Math.min(15, Math.max(5, totalAvailableQuestions || 10)));
      setQuestionType("all");
      setDurationMinutes(30);
      setPassingScore(60);
      setMaxAttempts(3);
      setShuffleQuestions(true);
      setIsPublished(true);
    }
  }, [isOpen, unit, lesson, totalAvailableQuestions, isInitialWholeUnit]);

  // Adjust title when scope or selected multi lessons change (if title not custom edited)
  const handleScopeChange = (newScope: "single" | "multi" | "unit") => {
    setExamScope(newScope);
    if (!isTitleCustomized) {
      setTitle(generateSuggestedTitle(newScope, lesson, selectedMultiLessons));
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
      setTitle(generateSuggestedTitle("multi", lesson, next));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى كتابة عنوان الاختبار" });
      return;
    }

    if (examScope === "multi" && selectedMultiLessons.length === 0) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى اختيار درس واحد على الأقل" });
      return;
    }

    setGenerating(true);
    try {
      const isMulti = examScope === "multi";
      const isSingle = examScope === "single";

      const payload = {
        title: title.trim(),
        stage,
        unit: examScope === "unit" ? unit : undefined,
        scope: examScope === "unit" ? "unit" : "lesson",
        lesson: isSingle ? lesson : undefined,
        lessons: isMulti ? selectedMultiLessons : undefined,
        count: Number(questionsCount) || 10,
        questionType: questionType === "all" ? undefined : questionType,
        durationMinutes: Number(durationMinutes) || 30,
        passingScore: Number(passingScore) || 60,
        maxAttempts: Number(maxAttempts) || 3,
        shuffleQuestions,
        isPublished,
        publishMode: isPublished ? "publish" : "draft",
      };

      const res = await adminApi<any>("/api/admin/learning/test-bank/generate-exam", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const actualCreated = res.quiz || res;
      toast({
        title: "تم إنشاء الاختبار بنجاح! 🚀",
        description: `تم توليد "${title}" بـ ${res.actualCount || actualCreated?.questions?.length || questionsCount} سؤالاً موزعة بالتساوي وبدقة على الدروس المحددة.`,
      });

      onSuccess(actualCreated);
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر إنشاء الاختبار" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600/10 text-violet-600 border border-violet-600/20 shadow-xs">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground">
                إنشاء امتحان إلكتروني مميز وموزع
              </h3>
              <p className="text-[11px] text-muted-foreground font-semibold">
                {unit} • {stage}
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

        {/* Scope Selector: Single Lesson, Multi Lessons, or Whole Unit */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-foreground flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-violet-600" />
            <span>نطاق استخراج الأسئلة (حظر تام للتسريب خارج الدروس):</span>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Multi-lessons Checklist (if examScope === "multi") */}
          {examScope === "multi" && (
            <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-black text-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-violet-600" />
                  <span>حدد الدروس المطلوب توزيع الأسئلة بينها بالتساوي:</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const all = unitLessonsList.filter((l) => l.totalQuestions > 0).map((l) => l.lesson);
                      setSelectedMultiLessons(all);
                      if (!isTitleCustomized) setTitle(generateSuggestedTitle("multi", lesson, all));
                    }}
                    className="text-[10px] text-violet-600 font-bold hover:underline cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMultiLessons([]);
                      if (!isTitleCustomized) setTitle(generateSuggestedTitle("multi", lesson, []));
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
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

          {/* Title with Smart Suggestion Restore */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">عنوان الاختبار *</label>
              {isTitleCustomized && (
                <button
                  type="button"
                  onClick={() => {
                    setIsTitleCustomized(false);
                    setTitle(generateSuggestedTitle(examScope, lesson, selectedMultiLessons));
                  }}
                  className="text-[10px] text-violet-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  اقتراح عنوان ذكي
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

          {/* Grid Settings */}
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
              <label className="text-xs font-bold text-foreground">نوع الأسئلة المطلوبة:</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as any)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="all">مزيج شامل (اختيار من متعدد + صح وخطأ)</option>
                <option value="mcq">اختيار من متعدد فقط (MCQ)</option>
                <option value="true_false">صواب أم خطأ فقط</option>
              </select>
            </div>

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

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">نسبة النجاح %:</label>
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
              <span>خلط ترتيب الأسئلة عشوائياً بين الدروس المحددة لكل طالب</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground select-none">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span>نشر الاختبار للطلاب فوراً (إلغاء التحديد لحفظه كمسودة للمراجعة أولاً)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={generating}>
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={generating || activeAvailableCount === 0}
              className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              توليد وحفظ الاختبار الآن
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
