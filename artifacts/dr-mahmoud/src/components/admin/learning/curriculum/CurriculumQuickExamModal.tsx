import React, { useState, useEffect } from "react";
import { Sparkles, X, Check, Loader2, Clock, Award, RefreshCw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CurriculumQuickExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: string;
  unit: string;
  lesson: string;
  totalAvailableQuestions: number;
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
  adminApi,
  onSuccess,
}: CurriculumQuickExamModalProps) {
  const { toast } = useToast();

  const isWholeUnit = lesson === "all";
  const defaultTitle = isWholeUnit
    ? `اختبار شامل على (${unit})`
    : `اختبار على (${lesson})`;

  const [title, setTitle] = useState(defaultTitle);
  const [questionsCount, setQuestionsCount] = useState<number>(Math.min(15, Math.max(5, totalAvailableQuestions)));
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [passingScore, setPassingScore] = useState<number>(60);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(isWholeUnit ? `اختبار شامل على (${unit})` : `اختبار على (${lesson})`);
      setQuestionsCount(Math.min(15, Math.max(5, totalAvailableQuestions)));
      setDurationMinutes(30);
      setPassingScore(60);
      setMaxAttempts(3);
      setShuffleQuestions(true);
      setIsPublished(true);
    }
  }, [isOpen, unit, lesson, totalAvailableQuestions, isWholeUnit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى كتابة عنوان الاختبار" });
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        title: title.trim(),
        stage,
        scope: isWholeUnit ? "unit" : "lesson",
        unit,
        lesson: isWholeUnit ? undefined : lesson,
        count: Number(questionsCount) || 10,
        durationMinutes: Number(durationMinutes) || 30,
        passingScore: Number(passingScore) || 60,
        maxAttempts: Number(maxAttempts) || 3,
        shuffleQuestions,
        publishMode: isPublished ? "publish" : "draft",
      };

      const res = await adminApi<any>("/api/admin/learning/question-bank/generate-quiz", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast({
        title: "تم إنشاء الاختبار بنجاح! 🚀",
        description: `تم توليد "${title}" بـ ${res.quiz?.questions?.length || questionsCount} سؤال.`,
      });
      onSuccess(res.quiz);
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر إنشاء الاختبار" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600/10 text-violet-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground">
                إنشاء امتحان إلكتروني فوري
              </h3>
              <p className="text-[11px] text-muted-foreground font-semibold">
                {unit} • {isWholeUnit ? "شامل الوحدة" : lesson}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">عنوان الاختبار *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          {/* Grid Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">عدد الأسئلة (المتاح: {totalAvailableQuestions})</label>
              <input
                type="number"
                min={1}
                max={Math.max(1, totalAvailableQuestions)}
                value={questionsCount}
                onChange={(e) => setQuestionsCount(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">المدة بالدقائق (0 = مفتوح)</label>
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
              <label className="text-xs font-bold text-foreground">نسبة النجاح %</label>
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
              <label className="text-xs font-bold text-foreground">عدد المحاولات المسموحة</label>
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
              <span>خلط ترتيب الأسئلة عشوائياً لكل طالب</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground select-none">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span>نشر الاختبار للطلاب فوراً (إلغاء التحديد لحفظه كمسودة)</span>
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
              disabled={generating || totalAvailableQuestions === 0}
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
