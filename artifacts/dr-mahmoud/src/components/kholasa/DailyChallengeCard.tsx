import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flame, Play, CheckCircle2, Loader2, X, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { studentApi } from "./kholasa-api";
import { BidiStatement } from "./BidiStatement";
import { isPrimarilyEnglish, splitModelAnswerTranslation } from "./kholasa-speech";

interface DailyChallengePayload {
  todayKey: string;
  streak: number;
  totalCompletedDays: number;
  challenge: {
    id: number;
    challengeDate: string;
    completed: boolean;
    score: number | null;
    totalQuestions: number;
    answers: number[];
    questions: Array<{
      prompt: string;
      options: string[];
      correctIndex?: number;
      explanation?: string;
      translation?: string;
    }>;
  } | null;
}

export function DailyChallengeCard({ isPaid }: { isPaid: boolean }) {
  const { toast } = useToast();
  const [data, setData] = useState<DailyChallengePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadDaily = async () => {
    if (!isPaid) return;
    try {
      setLoading(true);
      const res = await studentApi<DailyChallengePayload>("/api/learning/daily-checkin");
      setData(res);
    } catch {
      // Non-critical widget on dashboard
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPaid) void loadDaily();
  }, [isPaid]);

  if (!isPaid || loading || !data?.challenge?.questions?.length) {
    return null;
  }

  const ch = data?.challenge;
  const streak = data?.streak ?? 0;

  const handleSubmit = async () => {
    if (!ch) return;
    try {
      setSubmitting(true);
      const arr = ch.questions.map((_, i) => answers[i] ?? -1);
      await studentApi("/api/learning/daily-checkin/submit", {
        method: "POST",
        body: JSON.stringify({ answers: arr }),
      });
      toast({ title: "تم تسجيل التحدي اليومي بنجاح" });
      window.dispatchEvent(new Event("kholasa:mistakes-updated"));
      await loadDaily();
    } catch (err: any) {
      toast({ title: "تعذر التسليم", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        dir="rtl"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-amber-500/50 transition-colors"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
            <Flame className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-foreground">
                تحدي النهارده ({ch?.totalQuestions || 5} أسئلة)
              </h3>
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[11px] font-bold border border-amber-500/25 font-mono tabular-nums">
                <Flame className="h-3 w-3" /> {streak} يوم التزام
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {ch?.completed
                ? `خلصت تحدي النهارده بنتيجة ${ch.score ?? 0} من ${ch.totalQuestions}. كمّل بكرة علشان تحافظ على سلسلتك.`
                : "أسئلة سريعة من منهجك في دقيقتين لتثبيت المعلومة والحفاظ على التزامك."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={loading}
          variant={ch?.completed ? "outline" : "default"}
          className="h-10 px-4 rounded-xl font-bold text-xs gap-2 shrink-0 cursor-pointer"
        >
          {ch?.completed ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              شوف نتيجتك ({ch.score}/{ch.totalQuestions})
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              ابدأ تحدي النهارده
            </>
          )}
        </Button>
      </motion.div>

      {/* Challenge Modal */}
      {modalOpen && ch && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-3 sm:p-5" dir="rtl">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Trophy className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-sm sm:text-base font-black">التحدي اليومي — {ch.challengeDate}</h3>
                  <p className="text-[11px] text-muted-foreground">سلسلة الالتزام الحالية: {streak} أيام</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {ch.completed && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                  <strong className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    نتيجة اليوم: {ch.score} من {ch.totalQuestions}
                  </strong>
                </div>
              )}

              {ch.questions.map((q, idx) => {
                if (!q) return null;
                const picked = ch.completed ? ch.answers[idx] : answers[idx];
                const promptText = q.prompt || (q as any)?.question?.prompt || "";
                const isPromptEng = isPrimarilyEnglish(promptText);
                const expParts = q.explanation ? splitModelAnswerTranslation(q.explanation) : null;
                const isExpEng = expParts ? isPrimarilyEnglish(expParts.main) : false;
                const optionsList: string[] = Array.isArray(q.options)
                  ? q.options
                  : Array.isArray((q as any)?.question?.options)
                  ? (q as any).question.options
                  : [];

                return (
                  <div key={idx} className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="text-xs font-bold text-muted-foreground">سؤال {idx + 1}</div>
                    <div
                      dir={isPromptEng ? "ltr" : "rtl"}
                      className={`text-sm font-bold text-foreground ${isPromptEng ? "text-left" : "text-right"}`}
                    >
                      <BidiStatement text={promptText} />
                    </div>
                    <div className="grid gap-2">
                      {optionsList.map((opt, oi) => {
                        const isPicked = picked === oi;
                        const isCorrectOpt = ch.completed && q.correctIndex === oi;
                        const isWrongPicked = ch.completed && isPicked && q.correctIndex !== oi;
                        const isOptEng = isPrimarilyEnglish(opt);
                        return (
                          <button
                            key={oi}
                            type="button"
                            dir={isOptEng ? "ltr" : "rtl"}
                            disabled={ch.completed}
                            onClick={() => setAnswers((p) => ({ ...p, [idx]: oi }))}
                            className={`w-full rounded-xl border p-2.5 ${isOptEng ? "text-left" : "text-right"} text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                              ch.completed
                                ? isCorrectOpt
                                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold"
                                  : isWrongPicked
                                    ? "border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-300"
                                    : "border-border opacity-70"
                                : isPicked
                                  ? "border-primary bg-primary/10 text-primary font-bold"
                                  : "border-border bg-card hover:bg-muted"
                            }`}
                          >
                            <span className="h-5 w-5 shrink-0 rounded-md border border-current/25 flex items-center justify-center text-[11px] font-black">
                              {oi + 1}
                            </span>
                            <span className="flex-1">
                              <BidiStatement text={opt} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {ch.completed && expParts && (
                      <div className="rounded-xl bg-muted/60 p-2.5 text-xs text-muted-foreground space-y-1">
                        <strong dir="rtl" className="text-primary block text-right">💡 التفسير:</strong>
                        <div dir={isExpEng ? "ltr" : "rtl"} className={isExpEng ? "text-left" : "text-right"}>
                          <BidiStatement text={expParts.main} />
                        </div>
                        {expParts.translation && (
                          <p dir="rtl" className="text-right text-emerald-500 font-semibold">
                            🌐 {expParts.translation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!ch.completed && (
              <div className="border-t border-border p-4 flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="h-10 px-6 rounded-xl font-bold text-xs cursor-pointer"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-1.5" /> : null}
                  تسليم التحدي اليومي ✓
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

