import { useState, useEffect, useMemo } from "react";
import {
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Loader2,
  RefreshCw,
  BookOpen,
  ArrowRight,
  Award,
  Sparkles,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { studentApi } from "./kholasa-api";
import { ProtectedKholasaImage } from "./ProtectedKholasaImage";
import { BidiStatement } from "./BidiStatement";
import { isPrimarilyEnglish, splitModelAnswerTranslation } from "./kholasa-speech";
import { renderUnitTitleWithIsolatedEnglish } from "../platform/tabs/SelfAssessmentTab";
import type { MistakeDiagnosisBucket, StudentMistakeRow } from "./types";

interface MistakesResponse {
  unresolvedCount: number;
  resolvedCount: number;
  totalCount: number;
  topWeakness: MistakeDiagnosisBucket | null;
  breakdown: MistakeDiagnosisBucket[];
  mistakes: StudentMistakeRow[];
}

interface PracticeItem {
  mistakeId: number;
  unit: string | null;
  lesson: string | null;
  concept: string | null;
  wrongCount: number;
  question: {
    prompt: string;
    options: string[];
    explanation?: string;
    translation?: string;
    imageUrl?: string;
  };
}

interface PracticeSubmitResult {
  success: boolean;
  correctCount: number;
  total: number;
  score: number;
  review: Array<{
    mistakeId: number;
    prompt: string;
    options: string[];
    selectedOption: number;
    correctOption: number;
    isCorrect: boolean;
    explanation: string | null;
    translation: string | null;
  }>;
}

function resolveDisplayCorrectAnswer(qObj: any): string {
  const options: string[] = Array.isArray(qObj?.options) ? qObj.options : [];
  if (typeof qObj?.correctAnswer === "string" && qObj.correctAnswer.trim()) {
    const trimmed = qObj.correctAnswer.trim();
    const matched = options.find((opt) => typeof opt === "string" && opt.trim() === trimmed);
    if (matched) return matched;
  }
  const idx = Number(qObj?.correctIndex);
  if (Number.isInteger(idx) && idx >= 0 && idx < options.length && options[idx]) {
    return options[idx];
  }
  return typeof qObj?.correctAnswer === "string" ? qObj.correctAnswer : "";
}

export function MistakeHubTab({
  onMistakeCountChange,
  onOpenLessonInKholasa,
}: {
  onMistakeCountChange?: (count: number) => void;
  onOpenLessonInKholasa?: (unit: string | null, lesson: string | null) => void;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<MistakesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Practice Exam state
  const [practiceItems, setPracticeItems] = useState<PracticeItem[] | null>(null);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, number>>({});
  const [startingPractice, setStartingPractice] = useState(false);
  const [submittingPractice, setSubmittingPractice] = useState(false);
  const [practiceResult, setPracticeResult] = useState<PracticeSubmitResult | null>(null);

  const loadMistakes = async () => {
    try {
      setLoading(true);
      const res = await studentApi<MistakesResponse>("/api/learning/mistakes");
      setData(res);
      onMistakeCountChange?.(res.unresolvedCount || 0);
    } catch (err: any) {
      toast({ title: "حصلت مشكلة في تحميل ركن غلطاتي", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMistakes();
  }, []);

  const unitCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!data?.mistakes) return map;
    for (const m of data.mistakes) {
      if (m?.unit) {
        map.set(m.unit, (map.get(m.unit) || 0) + 1);
      }
    }
    return map;
  }, [data]);

  const unitsList = useMemo(() => Array.from(unitCounts.keys()), [unitCounts]);

  // Auto-reset unit filter if all mistakes in the selected unit were resolved
  useEffect(() => {
    if (selectedUnit !== "all" && !unitsList.includes(selectedUnit)) {
      setSelectedUnit("all");
    }
  }, [selectedUnit, unitsList]);

  const visibleMistakes = useMemo(() => {
    if (!data?.mistakes) return [];
    const safeList = data.mistakes.filter((m) => Boolean(m && (m.question || (m as any).prompt)));
    if (selectedUnit === "all") return safeList;
    return safeList.filter((m) => m.unit === selectedUnit);
  }, [data, selectedUnit]);

  const handleResolve = async (mistakeId: number) => {
    if (resolvingId === mistakeId) return;
    try {
      setResolvingId(mistakeId);
      await studentApi(`/api/learning/mistakes/${mistakeId}/resolve`, { method: "POST" });
      toast({ title: "عاش يا بطل! السؤال بقى متقن خلاص ✓" });
      await loadMistakes();
      window.dispatchEvent(new Event("kholasa:mistakes-updated"));
    } catch (err: any) {
      toast({ title: "حصلت مشكلة بسيطة", description: err.message, variant: "destructive" });
    } finally {
      setResolvingId(null);
    }
  };

  const handleStartPractice = async () => {
    try {
      setStartingPractice(true);
      setPracticeResult(null);
      setPracticeAnswers({});
      const res = await studentApi<{ total: number; items: PracticeItem[] }>("/api/learning/mistakes/practice", {
        method: "POST",
        body: JSON.stringify({
          unit: selectedUnit !== "all" ? selectedUnit : undefined,
          limit: 15,
        }),
      });
      setPracticeItems(res.items || []);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({ title: "حصلت مشكلة في بدء التدريب", description: err.message, variant: "destructive" });
    } finally {
      setStartingPractice(false);
    }
  };

  const answeredPracticeCount = useMemo(() => {
    if (!practiceItems) return 0;
    return practiceItems.filter((item) => practiceAnswers[item.mistakeId] !== undefined).length;
  }, [practiceItems, practiceAnswers]);

  const handleSubmitPractice = async () => {
    if (!practiceItems || practiceItems.length === 0) return;
    if (answeredPracticeCount === 0) {
      toast({
        title: "اختر إجابة واحدة على الأقل",
        description: "جاوب على الأسئلة أولاً قبل الضغط على التصحيح.",
        variant: "destructive",
      });
      return;
    }
    try {
      setSubmittingPractice(true);
      const answers = practiceItems.map((item) => ({
        mistakeId: item.mistakeId,
        selectedOption: practiceAnswers[item.mistakeId] ?? -1,
      }));
      const res = await studentApi<PracticeSubmitResult>("/api/learning/mistakes/practice/submit", {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setPracticeResult(res);
      await loadMistakes();
      window.dispatchEvent(new Event("kholasa:mistakes-updated"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({ title: "حصلت مشكلة في تسليم التدريب", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingPractice(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="grid place-items-center py-20" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Practice Exam View
  if (practiceItems) {
    const progressPct =
      practiceItems.length > 0 ? Math.round((answeredPracticeCount / practiceItems.length) * 100) : 0;

    return (
      <div className="space-y-6 text-right max-w-3xl mx-auto" dir="rtl">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPracticeItems(null);
                  setPracticeResult(null);
                }}
                className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
              >
                <ArrowRight className="h-4 w-4" /> العودة لركن غلطاتي
              </Button>
              <div>
                <h2 className="text-sm sm:text-base font-black">غلطاتك اللي محتاجة تراجعها</h2>
                <p className="text-xs text-muted-foreground">
                  أي سؤال تحله صح سيتم إتقانه وإزالته تلقائياً من قائمة الأخطاء.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-extrabold">
              {answeredPracticeCount} / {practiceItems.length} مجاب
            </span>
          </div>

          {!practiceResult && (
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {practiceResult && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-black text-emerald-600 dark:text-emerald-400">
                النتيجة: {practiceResult.correctCount} من {practiceResult.total} ({practiceResult.score}%)
              </h3>
              <p className="text-xs text-muted-foreground">
                تم تحديث رصيد إتقانك تلقائياً وإزالة الأسئلة التي أجبت عليها بشكل صحيح!
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setPracticeItems(null);
                setPracticeResult(null);
              }}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              عرض القائمة المحدثة
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {practiceItems.map((item, idx) => {
            if (!item) return null;
            const rev = practiceResult?.review.find((r) => r.mistakeId === item.mistakeId);
            const selected = practiceAnswers[item.mistakeId];
            const qObj = item.question || (item as any);
            const promptText = qObj?.prompt || (item as any)?.prompt || "";
            const isPromptEng = isPrimarilyEnglish(promptText);
            const optionsList: string[] = Array.isArray(qObj?.options)
              ? qObj.options
              : Array.isArray((item as any)?.options)
              ? (item as any).options
              : [];
            const imageUrl = qObj?.imageUrl || (item as any)?.imageUrl || null;
            const wasSkipped = Boolean(rev && rev.selectedOption < 0);

            return (
              <div key={item.mistakeId} className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-bold">سؤال {idx + 1}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.lesson && <span className="rounded-md bg-muted px-2 py-0.5">{item.lesson}</span>}
                    {rev ? (
                      rev.isCorrect ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> تم إتقان السؤال ✓
                        </span>
                      ) : wasSkipped ? (
                        <span className="rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 font-bold">
                          لم يتم حله (ما زال في المراجعة)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 font-bold">
                          <XCircle className="h-3.5 w-3.5" /> إجابة غير صحيحة
                        </span>
                      )
                    ) : (
                      <span className="rounded-md bg-rose-500/10 text-rose-500 px-2.5 py-0.5 font-bold">
                        {item.wrongCount === 1
                          ? "غلطت في السؤال ده مرة"
                          : item.wrongCount === 2
                          ? "غلطت في السؤال ده مرتين"
                          : `غلطت في السؤال ده ${item.wrongCount} مرات`}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  dir={isPromptEng ? "ltr" : "rtl"}
                  className={`text-sm sm:text-base font-bold text-foreground leading-relaxed ${isPromptEng ? "text-left font-sans" : "text-right"}`}
                >
                  <BidiStatement text={promptText} />
                </div>

                {imageUrl && (
                  <ProtectedKholasaImage
                    src={imageUrl}
                    alt="صورة السؤال"
                    className="max-h-60 rounded-xl border border-border object-contain"
                  />
                )}

                <div className="grid gap-2">
                  {optionsList.map((opt, oi) => {
                    const isPicked = selected === oi;
                    const isCorrectOpt = rev?.correctOption === oi;
                    const isWrongPicked = rev && isPicked && !rev.isCorrect;
                    const isOptEng = isPromptEng || isPrimarilyEnglish(opt);

                    return (
                      <button
                        key={oi}
                        type="button"
                        dir={isOptEng ? "ltr" : "rtl"}
                        disabled={Boolean(practiceResult)}
                        onClick={() => setPracticeAnswers((p) => ({ ...p, [item.mistakeId]: oi }))}
                        className={`w-full rounded-xl border p-3 ${isOptEng ? "text-left font-sans" : "text-right"} text-xs sm:text-sm font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                          rev
                            ? isCorrectOpt
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold"
                              : isWrongPicked
                                ? "border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-300"
                                : "border-border opacity-70"
                            : isPicked
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border hover:bg-muted/60"
                        }`}
                      >
                        <span className="h-6 w-6 shrink-0 rounded-lg border border-current/25 flex items-center justify-center text-xs font-black">
                          {oi + 1}
                        </span>
                        <span className="flex-1">
                          <BidiStatement text={opt} />
                        </span>
                        {rev && isCorrectOpt && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                        {rev && isWrongPicked && <XCircle className="h-4 w-4 shrink-0 text-rose-500" />}
                      </button>
                    );
                  })}
                </div>

                {(rev?.explanation || rev?.translation) && (() => {
                  const expParts = rev.explanation ? splitModelAnswerTranslation(rev.explanation) : null;
                  const isExpEng = expParts ? isPrimarilyEnglish(expParts.main) : false;
                  return (
                    <div className="rounded-xl bg-muted/50 border border-border p-3 text-xs leading-6 space-y-1.5">
                      {rev?.translation && (
                        <div dir="rtl" className="text-right text-sky-600 dark:text-sky-400 font-semibold">
                          🌐 {rev.translation}
                        </div>
                      )}
                      {expParts && (
                        <div>
                          <strong dir="rtl" className="text-primary block text-right mb-0.5">💡 ليه دي الإجابة الصح؟</strong>
                          <div dir={isExpEng ? "ltr" : "rtl"} className={isExpEng ? "text-left font-sans" : "text-right"}>
                            <BidiStatement text={expParts.main} />
                          </div>
                          {expParts.translation && (
                            <p dir="rtl" className="mt-1 text-right text-emerald-500 font-semibold">
                              🌐 {expParts.translation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {!practiceResult && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {answeredPracticeCount < practiceItems.length
                ? `متبقي ${practiceItems.length - answeredPracticeCount} سؤال بدون إجابة (لن يتم احتسابهم كأخطاء جديدة)`
                : "أجبت على جميع الأسئلة — جاهز للتصحيح!"}
            </span>
            <Button
              type="button"
              onClick={() => void handleSubmitPractice()}
              disabled={submittingPractice || answeredPracticeCount === 0}
              className="h-11 px-8 rounded-xl font-black text-sm cursor-pointer"
            >
              {submittingPractice ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              تصحيح وحفظ الإتقان ✓
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-foreground">ركن «غلطاتي» والتشخيص الذكي</h1>
            <span className="rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2.5 py-0.5 text-xs font-extrabold">
              {data?.unresolvedCount || 0} قيد المراجعة
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            أي سؤال تخطئ فيه في الاختبارات أو التقييم الذاتي أو التحدي اليومي يُسجل هنا تلقائياً لتراجعه وتتقنه قبل الامتحان.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadMistakes()}
          className="h-9 rounded-xl text-xs font-bold gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </header>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-card dark:bg-[#0A101D] p-4 flex items-center justify-between gap-3 shadow-2xs hover:border-rose-300 transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">أسئلة لسه محتاج تراجعها</span>
            <strong className="text-2xl font-black font-mono tabular-nums text-rose-600 dark:text-rose-400 block leading-tight">{data?.unresolvedCount || 0}</strong>
            <span className="inline-block text-[10px] font-semibold text-rose-600/90 dark:text-rose-400/90 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-900/40">
              قيد المراجعة والتدريب
            </span>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200/60 dark:border-rose-900/40 shadow-inner">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-card dark:bg-[#0A101D] p-4 flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-300 transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">أسئلة بقيت بتحلها صح</span>
            <strong className="text-2xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 block leading-tight">{data?.resolvedCount || 0}</strong>
            <span className="inline-block text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/40">
              أتقنتها بنجاح 🎯
            </span>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 border border-emerald-200/60 dark:border-emerald-900/40 shadow-inner">
            <Award className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-card dark:bg-[#0A101D] p-4 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-300 transition-colors">
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">أكثر درس محتاج تركز عليه</span>
            <strong className="text-xs font-black text-slate-900 dark:text-slate-100 block truncate leading-tight">
              {data?.topWeakness ? (data.topWeakness.lesson || data.topWeakness.unit) : "لا توجد نقاط ضعف 🎉"}
            </strong>
            <span className="inline-block text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40 truncate max-w-full">
              {data?.topWeakness?.unit ? renderUnitTitleWithIsolatedEnglish(data.topWeakness.unit) : "أداء ممتاز ومستقر"}
            </span>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 border border-amber-200/60 dark:border-amber-900/40 shadow-inner">
            <BookOpen className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Practice Exam Banner */}
      {(data?.unresolvedCount || 0) > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> امتحن نفسك في الأسئلة اللي غلطت فيها
            </h3>
            <p className="text-xs text-muted-foreground">
              اختبر نفسك الآن في الأسئلة اللي غلطت فيها قبل كده؛ وأول ما تحل السؤال صح هيتشال تلقائياً من قائمة الأخطاء وتتقنه.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void handleStartPractice()}
            disabled={startingPractice || visibleMistakes.length === 0}
            className="h-10 px-5 rounded-xl font-bold text-xs gap-2 shrink-0 cursor-pointer"
          >
            {startingPractice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            يلا نحل غلطاتك تاني ({Math.min(15, visibleMistakes.length)})
          </Button>
        </div>
      )}

      {/* Filter Pills */}
      {unitsList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedUnit("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              selectedUnit === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            الكل ({data?.unresolvedCount || 0})
          </button>
          {unitsList.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setSelectedUnit(u)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                selectedUnit === u
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {renderUnitTitleWithIsolatedEnglish(u)} ({unitCounts.get(u) || 0})
            </button>
          ))}
        </div>
      )}

      {/* Mistakes List or Empty State */}
      {visibleMistakes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-2.5">
          <Target className="h-10 w-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-black">سجلك نظيف تماماً! 🎉</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            مفيش أي أخطاء محتاجة مراجعة دلوقتي. كل ما تحل امتحانات أو تدريبات، أي سؤال تغلط فيه هيتسجل هنا تلقائياً عشان تراجعه وتتقنه.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {visibleMistakes.map((m) => {
            const qObj = m.question || (m as any);
            const optionsList: string[] = Array.isArray(qObj?.options) ? qObj.options : [];
            const promptText = qObj?.prompt || (m as any)?.prompt || "";
            const isPromptEng = isPrimarilyEnglish(promptText);
            const imageUrl = qObj?.imageUrl || (m as any)?.imageUrl || null;
            const explanationText = qObj?.explanation || null;
            const translationText = qObj?.translation || null;

            const correctAns = resolveDisplayCorrectAnswer(qObj);
            const wrongAns =
              m.lastWrongOption !== null &&
              m.lastWrongOption !== undefined &&
              m.lastWrongOption >= 0 &&
              m.lastWrongOption < optionsList.length &&
              optionsList[m.lastWrongOption]
                ? optionsList[m.lastWrongOption]
                : null;

            return (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.unit && (
                      <span className="rounded-md bg-muted px-2 py-0.5 font-bold">
                        {renderUnitTitleWithIsolatedEnglish(m.unit)}
                      </span>
                    )}
                    {m.lesson && <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 font-bold">{m.lesson}</span>}
                    {m.concept && <span className="rounded-md bg-amber-500/10 text-amber-600 px-2 py-0.5 font-bold">{m.concept}</span>}
                  </div>
                  <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2.5 py-0.5 font-bold">
                    {m.wrongCount === 1
                      ? "غلطت في السؤال ده مرة"
                      : m.wrongCount === 2
                      ? "غلطت في السؤال ده مرتين"
                      : `غلطت في السؤال ده ${m.wrongCount} مرات`}
                  </span>
                </div>

                <div
                  dir={isPromptEng ? "ltr" : "rtl"}
                  className={`text-sm font-bold text-foreground leading-relaxed ${isPromptEng ? "text-left font-sans" : "text-right"}`}
                >
                  <BidiStatement text={promptText} />
                </div>

                {translationText && (
                  <p dir="rtl" className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-3 py-2 text-xs text-sky-600 dark:text-sky-400 font-semibold text-right flex items-start gap-1.5">
                    <Languages className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{translationText}</span>
                  </p>
                )}

                {imageUrl && (
                  <ProtectedKholasaImage
                    src={imageUrl}
                    alt="صورة السؤال"
                    className="max-h-56 rounded-xl border border-border object-contain"
                  />
                )}

                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  {wrongAns && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-rose-600 dark:text-rose-400 space-y-1">
                      <span dir="rtl" className="font-black block text-right">✕ إنت جاوبت إيه؟</span>
                      <div
                        dir={isPrimarilyEnglish(wrongAns) ? "ltr" : "rtl"}
                        className={`leading-relaxed ${isPrimarilyEnglish(wrongAns) ? "text-left font-sans" : "text-right"}`}
                      >
                        <BidiStatement text={wrongAns} />
                      </div>
                    </div>
                  )}
                  {correctAns && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-emerald-700 dark:text-emerald-300 space-y-1">
                      <span dir="rtl" className="font-black block text-right">✓ الإجابة الصح:</span>
                      <div
                        dir={isPrimarilyEnglish(correctAns) ? "ltr" : "rtl"}
                        className={`leading-relaxed ${isPrimarilyEnglish(correctAns) ? "text-left font-sans" : "text-right"}`}
                      >
                        <BidiStatement text={correctAns} />
                      </div>
                    </div>
                  )}
                </div>

                {explanationText && (() => {
                  const expParts = splitModelAnswerTranslation(explanationText);
                  const isExpEng = isPrimarilyEnglish(expParts.main);
                  return (
                    <div className="rounded-xl bg-muted/40 border border-border/70 p-3 text-xs text-muted-foreground leading-6 space-y-1">
                      <strong dir="rtl" className="text-foreground block text-right mb-0.5 font-bold">💡 ليه دي الإجابة الصح؟</strong>
                      <div dir={isExpEng ? "ltr" : "rtl"} className={isExpEng ? "text-left font-sans text-foreground/90" : "text-right"}>
                        <BidiStatement text={expParts.main} />
                      </div>
                      {expParts.translation && (
                        <p dir="rtl" className="mt-1 text-right text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                          🌐 {expParts.translation}
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {onOpenLessonInKholasa && (m.lesson || m.unit) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenLessonInKholasa(m.unit, m.lesson)}
                      className="h-8 rounded-xl text-xs font-bold gap-1.5 text-primary hover:bg-primary/10 cursor-pointer"
                    >
                      <BookOpen className="h-3.5 w-3.5" /> راجع شرح الدرس في الخلاصة
                    </Button>
                  ) : (
                    <div />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={resolvingId === m.id}
                    onClick={() => void handleResolve(m.id)}
                    className="h-8 rounded-xl text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    {resolvingId === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    فهمت الغلطة ✓
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
