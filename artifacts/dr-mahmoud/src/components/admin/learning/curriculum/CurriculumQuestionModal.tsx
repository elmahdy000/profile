import React, { useState, useEffect } from "react";
import { Plus, Edit3, X, Check, Loader2, HelpCircle, CheckSquare, FileText, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type QuestionType = "mcq" | "true_false" | "essay";

interface CurriculumQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  initialStage: string;
  initialUnit: string;
  initialLesson: string;
  initialData?: any | null;
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onSuccess: () => void;
}

export function CurriculumQuestionModal({
  isOpen,
  onClose,
  mode,
  initialStage,
  initialUnit,
  initialLesson,
  initialData = null,
  adminApi,
  onSuccess,
}: CurriculumQuestionModalProps) {
  const { toast } = useToast();

  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [tfCorrect, setTfCorrect] = useState<boolean>(true);
  const [modelAnswer, setModelAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [translation, setTranslation] = useState("");
  const [concept, setConcept] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [points, setPoints] = useState<number>(1);
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialData) {
        // Detect question type
        const isEssay = Boolean(initialData.modelAnswer !== undefined || initialData.model_answer !== undefined);
        const qObj = initialData.question || initialData;
        const isTf = !isEssay && (qObj.questionType === "true_false" || (Array.isArray(qObj.options) && qObj.options.length === 2));

        setQuestionType(isEssay ? "essay" : isTf ? "true_false" : "mcq");
        setPrompt(initialData.prompt || qObj.prompt || "");
        if (isEssay) {
          setModelAnswer(initialData.modelAnswer || initialData.model_answer || "");
        } else if (isTf) {
          const opts = Array.isArray(qObj.options) ? qObj.options : ["صح", "خطأ"];
          const corrIdx = typeof qObj.correctIndex === "number" ? qObj.correctIndex : 0;
          setTfCorrect(corrIdx === 0 || opts[corrIdx]?.includes("صح") || opts[corrIdx]?.toLowerCase() === "true");
        } else {
          setOptions(Array.isArray(qObj.options) && qObj.options.length >= 2 ? qObj.options : ["", "", "", ""]);
          setCorrectIndex(typeof qObj.correctIndex === "number" ? qObj.correctIndex : 0);
        }
        setExplanation(initialData.explanation || qObj.explanation || "");
        setTranslation(initialData.translation || qObj.translation || "");
        setConcept(initialData.concept || qObj.concept || "");
        setDifficulty(initialData.difficulty || qObj.difficulty || "medium");
        setPoints(initialData.points || qObj.points || 1);
        setImageUrl(initialData.imageUrl || qObj.imageUrl || initialData.image_url || "");
      } else {
        // Reset defaults
        setQuestionType("mcq");
        setPrompt("");
        setOptions(["", "", "", ""]);
        setCorrectIndex(0);
        setTfCorrect(true);
        setModelAnswer("");
        setExplanation("");
        setTranslation("");
        setConcept("");
        setDifficulty("medium");
        setPoints(1);
        setImageUrl("");
      }
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const updated = options.filter((_, i) => i !== index);
      setOptions(updated);
      if (correctIndex >= updated.length) {
        setCorrectIndex(updated.length - 1);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى كتابة نص السؤال" });
      return;
    }

    setSaving(true);
    try {
      if (questionType === "essay") {
        if (!modelAnswer.trim()) {
          toast({ variant: "destructive", title: "تنبيه", description: "يرجى كتابة الإجابة النموذجية للسؤال المقالي" });
          setSaving(false);
          return;
        }

        const payload = {
          stage: initialStage,
          unit: initialUnit,
          lesson: initialLesson,
          prompt: prompt.trim(),
          modelAnswer: modelAnswer.trim(),
          explanation: explanation.trim() || undefined,
          translation: translation.trim() || undefined,
          difficulty,
          points: Number(points) || 1,
          imageUrl: imageUrl.trim() || undefined,
        };

        if (mode === "edit" && initialData?.id) {
          await adminApi(`/api/admin/learning/essay-question-bank/${initialData.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
          toast({ title: "تم تحديث السؤال المقالي بنجاح! ✓" });
        } else {
          await adminApi("/api/admin/learning/essay-question-bank", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          toast({ title: "تمت إضافة السؤال المقالي بنجاح! 📝" });
        }
      } else {
        // MCQ or True/False
        let finalOptions: string[];
        let finalCorrectIdx: number;

        if (questionType === "true_false") {
          finalOptions = ["صح (True)", "خطأ (False)"];
          finalCorrectIdx = tfCorrect ? 0 : 1;
        } else {
          finalOptions = options.map((o) => o.trim()).filter(Boolean);
          if (finalOptions.length < 2) {
            toast({ variant: "destructive", title: "تنبيه", description: "يرجى إدخال خيارين على الأقل" });
            setSaving(false);
            return;
          }
          finalCorrectIdx = Math.max(0, Math.min(finalOptions.length - 1, correctIndex));
        }

        const payload = {
          stage: initialStage,
          unit: initialUnit,
          lesson: initialLesson,
          prompt: prompt.trim(),
          options: finalOptions,
          correctIndex: finalCorrectIdx,
          questionType,
          explanation: explanation.trim() || undefined,
          translation: translation.trim() || undefined,
          concept: concept.trim() || undefined,
          difficulty,
          points: Number(points) || 1,
          imageUrl: imageUrl.trim() || undefined,
        };

        if (mode === "edit" && initialData?.id) {
          await adminApi(`/api/admin/learning/question-bank/${initialData.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
          toast({ title: "تم تحديث السؤال بنجاح! ✓" });
        } else {
          await adminApi("/api/admin/learning/question-bank", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          toast({ title: "تمت إضافة السؤال بنجاح! 🎯" });
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر حفظ السؤال" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto" dir="rtl">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 sm:p-6 shadow-2xl space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              {mode === "add" ? <Plus className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground">
                {mode === "add" ? "إضافة سؤال جديد للدرس" : "تعديل بيانات السؤال"}
              </h3>
              <p className="text-[11px] text-muted-foreground font-semibold">
                {initialUnit} • {initialLesson === "all" ? "شامل الوحدة" : initialLesson}
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

        {/* Question Type Selector */}
        {mode === "add" && (
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-muted/30 border border-border/60">
            <button
              type="button"
              onClick={() => setQuestionType("mcq")}
              className={`h-9 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                questionType === "mcq" ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              <span>اختيار من متعدد</span>
            </button>
            <button
              type="button"
              onClick={() => setQuestionType("true_false")}
              className={`h-9 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                questionType === "true_false" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>صح وخطأ</span>
            </button>
            <button
              type="button"
              onClick={() => setQuestionType("essay")}
              className={`h-9 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                questionType === "essay" ? "bg-purple-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>سؤال مقالي</span>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Question Prompt */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">نص السؤال *</label>
            <textarea
              required
              rows={3}
              placeholder="اكتب نص السؤال هنا بدقة..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
            />
          </div>

          {/* Options (MCQ Mode) */}
          {questionType === "mcq" && (
            <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">خيارات الإجابة (اختر الإجابة الصحيحة بالضغط عليها):</span>
                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    + إضافة خيار
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectIndex(idx)}
                      className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-all cursor-pointer ${
                        correctIndex === idx
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      title={correctIndex === idx ? "الإجابة الصحيحة" : "تحديد كإجابة صحيحة"}
                    >
                      {correctIndex === idx ? "✓" : ["أ", "ب", "ج", "د", "هـ", "و"][idx]}
                    </button>
                    <input
                      type="text"
                      required
                      placeholder={`الخيار رقم ${idx + 1}...`}
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className={`flex-1 h-9 px-3 rounded-xl border text-xs font-bold text-foreground focus:outline-none ${
                        correctIndex === idx ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20" : "border-border bg-background"
                      }`}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* True / False Mode */}
          {questionType === "true_false" && (
            <div className="space-y-2 p-3.5 rounded-xl border border-border/80 bg-muted/20">
              <span className="text-xs font-bold text-foreground block">الإجابة الصحيحة:</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTfCorrect(true)}
                  className={`h-11 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    tfCorrect
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-card border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  <span>صح (True) ✓</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTfCorrect(false)}
                  className={`h-11 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    !tfCorrect
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-card border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <X className="h-4 w-4" />
                  <span>خطأ (False) ✕</span>
                </button>
              </div>
            </div>
          )}

          {/* Essay Model Answer Mode */}
          {questionType === "essay" && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">الإجابة النموذجية للسؤال المقالي *</label>
              <textarea
                required
                rows={3}
                placeholder="اكتب الإجابة النموذجية المكتملة..."
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
                className="w-full p-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
              />
            </div>
          )}

          {/* Explanation & Translation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">تفسير سبب الإجابة (Explanation)</label>
              <textarea
                rows={2}
                placeholder="لماذا هذه هي الإجابة الصحيحة؟..."
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">الترجمة العربية / الإنجليزية (Translation)</label>
              <textarea
                rows={2}
                placeholder="ترجمة السؤال إن وجد..."
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Metadata: Difficulty, Points, Image */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">مستوى الصعوبة</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
              >
                <option value="easy">سهل 🟢</option>
                <option value="medium">متوسط 🟡</option>
                <option value="hard">صعب 🔴</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">الدرجات (Points)</label>
              <input
                type="number"
                min={1}
                max={10}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">رابط صورة (اختياري)</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !prompt.trim()}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-white font-bold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {mode === "add" ? "إضافة السؤال للبنك" : "حفظ التعديل"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
