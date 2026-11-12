import { useState, useEffect, useMemo } from "react";
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Play,
  Loader2,
  RefreshCw,
  BookOpen,
  ArrowRight,
  Award,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { studentApi } from "./kholasa-api";
import { ProtectedKholasaImage } from "./ProtectedKholasaImage";
import { BidiStatement } from "./BidiStatement";
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

export function MistakeHubTab({ onMistakeCountChange }: { onMistakeCountChange?: (count: number) => void }) {
  const { toast } = useToast();
  const [data, setData] = useState<MistakesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");

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
      toast({ title: "تعذر تحميل ركن غلطاتي", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMistakes();
  }, []);

  const unitsList = useMemo(() => {
    if (!data?.mistakes) return [];
    const s = new Set<string>();
    for (const m of data.mistakes) {
      if (m.unit) s.add(m.unit);
    }
    return Array.from(s);
  }, [data]);

  const visibleMistakes = useMemo(() => {
    if (!data?.mistakes) return [];
    if (selectedUnit === "all") return data.mistakes;
    return data.mistakes.filter((m) => m.unit === selectedUnit);
  }, [data, selectedUnit]);

  const handleResolve = async (mistakeId: number) => {
    try {
      await studentApi(`/api/learning/mistakes/${mistakeId}/resolve`, { method: "POST" });
      toast({ title: "أحسنت! تم تعليم السؤال كمتقن ✓" });
      await loadMistakes();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
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
    } catch (err: any) {
      toast({ title: "تعذر بدء التدريب", description: err.message, variant: "destructive" });
    } finally {
      setStartingPractice(false);
    }
  };

  const handleSubmitPractice = async () => {
    if (!practiceItems || practiceItems.length === 0) return;
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
    } catch (err: any) {
      toast({ title: "تعذر تسليم التدريب", description: err.message, variant: "destructive" });
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
    return (
      <div className="space-y-6 text-right max-w-3xl mx-auto" dir="rtl">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
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
              <h2 className="text-sm sm:text-base font-black">امتحان مراجعة «غلطاتي»</h2>
              <p className="text-xs text-muted-foreground">
                أي سؤال تحله صح سيتم إتقانه وإزالته تلقائياً من قائمة الأخطاء.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-extrabold">
            {practiceItems.length} سؤال
          </span>
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
            const rev = practiceResult?.review.find((r) => r.mistakeId === item.mistakeId);
            const selected = practiceAnswers[item.mistakeId];
            return (
              <div key={item.mistakeId} className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-bold">سؤال {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    {item.lesson && <span className="rounded-md bg-muted px-2 py-0.5">{item.lesson}</span>}
                    <span className="rounded-md bg-rose-500/10 text-rose-500 px-2 py-0.5 font-bold">
                      أخطأت به {item.wrongCount}×
                    </span>
                  </div>
                </div>

                <div className="text-sm sm:text-base font-bold text-foreground">
                  <BidiStatement text={item.question.prompt} />
                </div>

                {item.question.imageUrl && (
                  <ProtectedKholasaImage
                    src={item.question.imageUrl}
                    alt="صورة السؤال"
                    className="max-h-60 rounded-xl border border-border object-contain"
                  />
                )}

                <div className="grid gap-2">
                  {item.question.options.map((opt, oi) => {
                    const isPicked = selected === oi;
                    const isCorrectOpt = rev?.correctOption === oi;
                    const isWrongPicked = rev && isPicked && !rev.isCorrect;

                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={Boolean(practiceResult)}
                        onClick={() => setPracticeAnswers((p) => ({ ...p, [item.mistakeId]: oi }))}
                        className={`w-full rounded-xl border p-3 text-right text-xs sm:text-sm font-semibold transition flex items-center gap-2.5 cursor-pointer ${
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
                      </button>
                    );
                  })}
                </div>

                {(rev?.explanation || rev?.translation) && (
                  <div className="rounded-xl bg-muted/50 border border-border p-3 text-xs leading-6 space-y-1.5">
                    {rev?.translation && (
                      <div className="text-sky-600 dark:text-sky-400 font-semibold">
                        🌐 {rev.translation}
                      </div>
                    )}
                    {rev?.explanation && (
                      <div>
                        <strong className="text-primary block mb-0.5">💡 التفسير:</strong>
                        <BidiStatement text={rev.explanation} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!practiceResult && (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void handleSubmitPractice()}
              disabled={submittingPractice}
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
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground block">أخطاء تحتاج مراجعة</span>
            <strong className="text-2xl font-black font-mono">{data?.unresolvedCount || 0}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-muted-foreground block">أسئلة أتقنتها وتمت معالجتها</span>
            <strong className="text-2xl font-black font-mono">{data?.resolvedCount || 0}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-muted-foreground block">أكثر درس يحتاج تركيزك</span>
            <strong className="text-xs font-black block truncate">
              {data?.topWeakness ? data.topWeakness.lesson || data.topWeakness.unit : "لا توجد نقاط ضعف 🎉"}
            </strong>
          </div>
        </div>
      </div>

      {/* Practice Exam Banner */}
      {(data?.unresolvedCount || 0) > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> امتحان مجمع فوري من غلطاتك
            </h3>
            <p className="text-xs text-muted-foreground">
              اختبر نفسك الآن في الأسئلة التي أخطأت فيها؛ وبمجرد حل السؤال بشكل صحيح يُحذف تلقائياً من قائمة الأخطاء.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void handleStartPractice()}
            disabled={startingPractice || visibleMistakes.length === 0}
            className="h-10 px-5 rounded-xl font-bold text-xs gap-2 shrink-0 cursor-pointer"
          >
            {startingPractice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            ابدأ امتحان من غلطاتي ({Math.min(15, visibleMistakes.length)})
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
              {u}
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
            لا توجد أي أخطاء قيد المراجعة حالياً. كلما حللت اختبارات أو تحديات يومية، ستُحفظ الأسئلة التي تحتاج مراجعة هنا تلقائياً.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {visibleMistakes.map((m) => {
            const correctAns =
              m.question.correctAnswer || m.question.options[m.question.correctIndex] || "";
            const wrongAns =
              m.lastWrongOption !== null &&
              m.lastWrongOption >= 0 &&
              m.question.options[m.lastWrongOption]
                ? m.question.options[m.lastWrongOption]
                : null;

            return (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.unit && <span className="rounded-md bg-muted px-2 py-0.5 font-bold">{m.unit}</span>}
                    {m.lesson && <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 font-bold">{m.lesson}</span>}
                    {m.concept && <span className="rounded-md bg-amber-500/10 text-amber-600 px-2 py-0.5 font-bold">{m.concept}</span>}
                  </div>
                  <span className="rounded-full bg-rose-500/10 text-rose-500 px-2.5 py-0.5 font-extrabold">
                    تكرر الخطأ {m.wrongCount}×
                  </span>
                </div>

                <div className="text-sm font-bold text-foreground">
                  <BidiStatement text={m.question.prompt} />
                </div>

                {m.question.imageUrl && (
                  <ProtectedKholasaImage
                    src={m.question.imageUrl}
                    alt="صورة السؤال"
                    className="max-h-56 rounded-xl border border-border object-contain"
                  />
                )}

                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  {wrongAns && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-2.5 text-rose-600 dark:text-rose-400">
                      <span className="font-bold block mb-0.5">✕ إجابتك السابقة:</span>
                      <BidiStatement text={wrongAns} />
                    </div>
                  )}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-emerald-600 dark:text-emerald-400">
                    <span className="font-bold block mb-0.5">✓ الإجابة الصحيحة:</span>
                    <BidiStatement text={correctAns} />
                  </div>
                </div>

                {m.question.explanation && (
                  <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground leading-6">
                    <strong className="text-foreground">💡 الشرح: </strong>
                    <BidiStatement text={m.question.explanation} />
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleResolve(m.id)}
                    className="h-8 rounded-xl text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> فهمته وأتقنته ✓
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

