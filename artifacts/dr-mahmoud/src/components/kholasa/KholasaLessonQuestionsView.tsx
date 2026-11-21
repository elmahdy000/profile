import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Languages,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { studentApi } from "./kholasa-api";
import { ProtectedKholasaImage } from "./ProtectedKholasaImage";
import { BidiStatement } from "./BidiStatement";
import {
  isPrimarilyEnglish,
  splitModelAnswerTranslation,
  isSpeechSupported,
  speakEnglishText,
  stopSpeech,
} from "./kholasa-speech";

interface QuestionCounts {
  mcq: number;
  trueFalse: number;
  essay: number;
}

interface McqOrTfItem {
  id: number;
  difficulty: string;
  concept: string | null;
  translation: string | null;
  question: {
    prompt: string;
    options: string[];
    explanation?: string;
    imageUrl?: string;
    questionType?: string;
  };
}

interface EssayItem {
  id: number;
  difficulty: string;
  points: number;
  prompt: string;
  modelAnswer: string;
  explanation: string | null;
  imageUrl: string | null;
}

interface CheckResult {
  selectedOption: number;
  isCorrect: boolean;
  correctOption: number;
  explanation: string | null;
  translation: string | null;
}

interface KholasaLessonQuestionsViewProps {
  materialId: number;
  initialCounts?: QuestionCounts;
  darkSurface?: boolean;
}

const DIFF_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: "سهل", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  medium: { label: "متوسط", color: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  hard: { label: "صعب", color: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
};

export function KholasaLessonQuestionsView({
  materialId,
  initialCounts,
  darkSurface = false,
}: KholasaLessonQuestionsViewProps) {
  const { toast } = useToast();
  const [qType, setQType] = useState<"mcq" | "true_false" | "essay">("mcq");
  const [difficulty, setDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<QuestionCounts>(
    initialCounts || { mcq: 0, trueFalse: 0, essay: 0 },
  );
  const [items, setItems] = useState<Array<McqOrTfItem | EssayItem>>([]);
  const [loading, setLoading] = useState(true);

  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, CheckResult>>({});
  const [revealedEssays, setRevealedEssays] = useState<Record<number, boolean>>({});
  const [showTransMap, setShowTransMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    return () => stopSpeech();
  }, [materialId]);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await studentApi<{
        type: "mcq" | "true_false" | "essay";
        counts: QuestionCounts;
        total: number;
        page: number;
        totalPages: number;
        items: Array<McqOrTfItem | EssayItem>;
      }>(
        `/api/learning/kholasa/materials/${materialId}/questions?type=${qType}&difficulty=${difficulty}&page=${page}&limit=12`,
      );
      setCounts(res.counts || { mcq: 0, trueFalse: 0, essay: 0 });
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [materialId, qType, difficulty, page]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  // If current tab has 0 questions on first load, auto-switch to first non-empty type
  useEffect(() => {
    if (!loading && total === 0 && difficulty === "all") {
      if (qType === "mcq" && counts.mcq === 0) {
        if (counts.trueFalse > 0) setQType("true_false");
        else if (counts.essay > 0) setQType("essay");
      }
    }
  }, [loading, total, difficulty, qType, counts]);

  const handlePickOption = async (questionBankId: number, selectedOption: number) => {
    if (results[questionBankId] || checkingId === questionBankId) return;
    try {
      setCheckingId(questionBankId);
      const res = await studentApi<{
        isCorrect: boolean;
        correctOption: number;
        explanation: string | null;
        translation: string | null;
      }>(`/api/learning/kholasa/materials/${materialId}/check-answer`, {
        method: "POST",
        body: JSON.stringify({ questionBankId, selectedOption }),
      });
      setResults((prev) => ({
        ...prev,
        [questionBankId]: {
          selectedOption,
          isCorrect: res.isCorrect,
          correctOption: res.correctOption,
          explanation: res.explanation,
          translation: res.translation,
        },
      }));
      if (!res.isCorrect) {
        window.dispatchEvent(new Event("kholasa:mistakes-updated"));
      }
    } catch (err: any) {
      toast({
        title: "مش عارفين نتأكد من الإجابة دلوقتي",
        description: err?.message || "حصلت مشكلة بسيطة، جرب تختار وتدوس تاني.",
        variant: "destructive",
      });
    } finally {
      setCheckingId(null);
    }
  };

  const cardClass = darkSurface
    ? "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 text-slate-100 space-y-3"
    : "rounded-2xl border border-border bg-card p-4 sm:p-5 text-foreground shadow-2xs space-y-3";

  const mutedClass = darkSurface ? "text-slate-300" : "text-muted-foreground";

  const answeredResults = Object.values(results);
  const solvedCount = answeredResults.length;
  const correctCount = answeredResults.filter((r) => r.isCorrect).length;
  const accuracyPct = solvedCount > 0 ? Math.round((correctCount / solvedCount) * 100) : 0;

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* Live Session Scoreboard */}
      {qType !== "essay" && solvedCount > 0 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border px-4 py-2.5 text-xs ${
            darkSurface ? "border-sky-500/30 bg-sky-950/30 text-slate-100" : "border-primary/25 bg-primary/5 text-foreground"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3 font-bold">
            <span>
              تم حل: <strong className="font-mono text-primary">{solvedCount}</strong>
            </span>
            <span>•</span>
            <span className="text-emerald-500">
              صحيح: <strong className="font-mono">{correctCount}</strong>
            </span>
            <span>•</span>
            <span>
              الدقة:{" "}
              <strong className={`font-mono ${accuracyPct >= 75 ? "text-emerald-500" : "text-amber-500"}`}>
                {accuracyPct}%
              </strong>
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setResults({})}
            className={`h-8 rounded-xl text-[11px] font-bold gap-1 cursor-pointer ${
              darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""
            }`}
          >
            <RotateCcw className="h-3 w-3" /> إعادة التمرين
          </Button>
        </div>
      )}
      {/* Question Type Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={`flex flex-wrap gap-1.5 rounded-2xl border p-1.5 ${
            darkSurface ? "border-white/10 bg-slate-950/60" : "border-border bg-muted/40"
          }`}
        >
          {[
            { id: "mcq" as const, label: `اختيار من متعدد (${counts.mcq})` },
            { id: "true_false" as const, label: `صح وخطأ (${counts.trueFalse})` },
            { id: "essay" as const, label: `مقالي بالإجابة النموذجية (${counts.essay})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setQType(t.id);
                setPage(1);
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
                qType === t.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : darkSurface
                    ? "text-slate-300 hover:bg-white/10"
                    : "text-muted-foreground hover:bg-card"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-1.5">
          {[
            { id: "all" as const, label: "الكل" },
            { id: "easy" as const, label: "سهل" },
            { id: "medium" as const, label: "متوسط" },
            { id: "hard" as const, label: "صعب" },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDifficulty(d.id);
                setPage(1);
              }}
              className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                difficulty === d.id
                  ? "border-primary bg-primary/15 text-primary"
                  : darkSurface
                    ? "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className={`${cardClass} text-center py-12`}>
          <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-bold">لا توجد أسئلة من هذا النوع ضمن التصفية الحالية.</p>
        </div>
      ) : qType === "essay" ? (
        <div className="space-y-3.5">
          {(items as EssayItem[]).map((item, idx) => {
            if (!item) return null;
            const diffInfo = DIFF_LABELS[item.difficulty] || DIFF_LABELS.medium;
            const revealed = Boolean(revealedEssays[item.id]);
            const qNum = (page - 1) * 12 + idx + 1;
            const promptText = item.prompt || (item as any)?.question?.prompt || "";
            const isPromptEng = isPrimarilyEnglish(promptText);
            const imageUrl = item.imageUrl || (item as any)?.question?.imageUrl || null;

            return (
              <div key={item.id} className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-black text-primary">سؤال مقالي #{qNum}</span>
                  <div className="flex items-center gap-2">
                    {isPromptEng && isSpeechSupported() && (
                      <button
                        type="button"
                        onClick={() => speakEnglishText(promptText)}
                        title="الاستماع للسؤال"
                        className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold hover:bg-primary/20 cursor-pointer"
                      >
                        <Volume2 className="h-3 w-3" /> استماع
                      </button>
                    )}
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${diffInfo.color}`}>
                      {diffInfo.label}
                    </span>
                    <span className={`text-[11px] font-bold ${mutedClass}`}>{item.points || 5} درجات</span>
                  </div>
                </div>

                <div
                  dir={isPromptEng ? "ltr" : "rtl"}
                  className={`text-sm font-bold leading-relaxed ${isPromptEng ? "text-left font-sans" : "text-right"}`}
                >
                  <BidiStatement text={promptText} />
                </div>

                {imageUrl && (
                  <ProtectedKholasaImage
                    src={imageUrl}
                    alt="صورة السؤال"
                    className="max-h-56 rounded-xl border border-border/40 object-contain"
                  />
                )}

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRevealedEssays((p) => ({ ...p, [item.id]: !revealed }))}
                    className={`h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
                      darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""
                    }`}
                  >
                    {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {revealed ? "إخفاء الإجابة النموذجية" : "عرض الإجابة النموذجية"}
                  </Button>
                </div>

                {revealed && (() => {
                  const { main: mainAns, translation: ansTrans } = splitModelAnswerTranslation(item.modelAnswer);
                  const isAnsEng = isPrimarilyEnglish(mainAns);
                  const expParts = item.explanation ? splitModelAnswerTranslation(item.explanation) : null;
                  const isExpEng = expParts ? isPrimarilyEnglish(expParts.main) : false;

                  return (
                    <div
                      className={`rounded-xl border p-3.5 space-y-2.5 text-xs leading-6 ${
                        darkSurface
                          ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-100"
                          : "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2" dir="rtl">
                        <strong className="text-emerald-500 font-black">✓ الإجابة النموذجية:</strong>
                        {isAnsEng && isSpeechSupported() && (
                          <button
                            type="button"
                            onClick={() => speakEnglishText(mainAns)}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 hover:bg-emerald-500/20 cursor-pointer"
                          >
                            <Volume2 className="h-3 w-3" /> استماع
                          </button>
                        )}
                      </div>
                      <div
                        dir={isAnsEng ? "ltr" : "rtl"}
                        className={`whitespace-pre-line leading-relaxed ${isAnsEng ? "text-left font-sans" : "text-right"}`}
                      >
                        <BidiStatement text={mainAns} />
                      </div>
                      {ansTrans && (
                        <div
                          dir="rtl"
                          className={`rounded-lg border px-3 py-2 text-right whitespace-pre-line ${
                            darkSurface
                              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          }`}
                        >
                          <strong className="block mb-0.5 text-[11px] font-black">🌐 الترجمة:</strong>
                          {ansTrans}
                        </div>
                      )}
                      {expParts && (
                        <div className={`pt-2 border-t border-emerald-500/20 ${mutedClass}`}>
                          <strong dir="rtl" className="block text-right mb-1 font-bold text-amber-700 dark:text-amber-400">💡 ملاحظات التصحيح:</strong>
                          <div
                            dir={isExpEng ? "ltr" : "rtl"}
                            className={isExpEng ? "text-left font-sans" : "text-right"}
                          >
                            <BidiStatement text={expParts.main} />
                          </div>
                          {expParts.translation && (
                            <p dir="rtl" className="mt-1.5 text-right text-emerald-500 font-semibold">
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
      ) : (
        <div className="space-y-3.5">
          {(items as McqOrTfItem[]).map((item, idx) => {
            if (!item) return null;
            const diffInfo = DIFF_LABELS[item.difficulty] || DIFF_LABELS.medium;
            const res = results[item.id];
            const isChecking = checkingId === item.id;
            const qNum = (page - 1) * 12 + idx + 1;
            const showTrans = Boolean(showTransMap[item.id]);
            const qObj = item.question || (item as any);
            const promptText = qObj?.prompt || (item as any)?.prompt || "";
            const isPromptEng = isPrimarilyEnglish(promptText);
            const optionsList: string[] = Array.isArray(qObj?.options)
              ? qObj.options
              : Array.isArray((item as any)?.options)
              ? (item as any).options
              : [];
            const imageUrl = qObj?.imageUrl || (item as any)?.imageUrl || null;
            const translationText = item.translation || qObj?.translation || (item as any)?.translation || null;

            return (
              <div key={item.id} className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-primary">سؤال #{qNum}</span>
                    {item.concept && (
                      <span className="rounded-md bg-sky-500/10 text-sky-500 px-2 py-0.5 text-[10px] font-bold">
                        {item.concept}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isPromptEng && isSpeechSupported() && (
                      <button
                        type="button"
                        onClick={() => speakEnglishText(promptText)}
                        title="الاستماع للسؤال"
                        className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold hover:bg-primary/20 cursor-pointer"
                      >
                        <Volume2 className="h-3 w-3" /> استماع
                      </button>
                    )}
                    {translationText && (
                      <button
                        type="button"
                        onClick={() => setShowTransMap((p) => ({ ...p, [item.id]: !showTrans }))}
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[10px] font-bold hover:bg-muted cursor-pointer"
                      >
                        <Languages className="h-3 w-3" /> {showTrans ? "إخفاء الترجمة" : "ترجمة"}
                      </button>
                    )}
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${diffInfo.color}`}>
                      {diffInfo.label}
                    </span>
                  </div>
                </div>

                <div
                  dir={isPromptEng ? "ltr" : "rtl"}
                  className={`text-sm font-bold leading-relaxed ${isPromptEng ? "text-left" : "text-right"}`}
                >
                  <BidiStatement text={promptText} />
                </div>

                {showTrans && translationText && (
                  <p dir="rtl" className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-3 py-2 text-xs text-sky-400 font-semibold text-right">
                    {translationText}
                  </p>
                )}

                {imageUrl && (
                  <ProtectedKholasaImage
                    src={imageUrl}
                    alt="صورة السؤال"
                    className="max-h-56 rounded-xl border border-border/40 object-contain"
                  />
                )}

                <div className={`grid gap-2 ${qType === "true_false" ? "sm:grid-cols-2" : ""}`}>
                  {optionsList.map((opt, oi) => {
                    const isPicked = res?.selectedOption === oi;
                    const isCorrectOpt = res?.correctOption === oi;
                    const isWrongPicked = res && isPicked && !res.isCorrect;
                    const isOptEng = isPromptEng || isPrimarilyEnglish(opt);

                    return (
                      <button
                        key={oi}
                        type="button"
                        dir={isOptEng ? "ltr" : "rtl"}
                        disabled={Boolean(res) || isChecking}
                        onClick={() => void handlePickOption(item.id, oi)}
                        className={`w-full rounded-xl border p-3 ${isOptEng ? "text-left" : "text-right"} text-xs sm:text-sm font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                          res
                            ? isCorrectOpt
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-500 font-bold"
                              : isWrongPicked
                                ? "border-rose-500 bg-rose-500/15 text-rose-500"
                                : darkSurface
                                  ? "border-white/10 opacity-60"
                                  : "border-border opacity-60"
                            : darkSurface
                              ? "border-white/15 bg-slate-950/60 hover:border-sky-400 hover:bg-white/10"
                              : "border-border bg-background hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <span className="h-6 w-6 shrink-0 rounded-lg border border-current/25 flex items-center justify-center text-xs font-black">
                          {oi + 1}
                        </span>
                        <span className="flex-1">
                          <BidiStatement text={opt} />
                        </span>
                        {res && isCorrectOpt && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                        {res && isWrongPicked && <XCircle className="h-4 w-4 shrink-0 text-rose-500" />}
                      </button>
                    );
                  })}
                </div>

                {res && (() => {
                  const expParts = res.explanation ? splitModelAnswerTranslation(res.explanation) : null;
                  const isExpEng = expParts ? isPrimarilyEnglish(expParts.main) : false;

                  return (
                    <div
                      className={`rounded-xl border p-3 text-xs leading-6 ${
                        res.isCorrect
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-rose-500/30 bg-rose-500/10"
                      }`}
                    >
                      <strong dir="rtl" className={`block text-right ${res.isCorrect ? "text-emerald-500" : "text-rose-500"}`}>
                        {res.isCorrect
                          ? "✓ عاش يا بطل! إجابتك صح."
                          : "✕ إجابتك مش مظبوطة — متقلقش، حفظنا السؤال في «ركن غلطاتي» عشان تراجعه براحتك."}
                      </strong>
                      {expParts && (
                        <div className={`mt-1.5 space-y-1 ${mutedClass}`}>
                          <div dir={isExpEng ? "ltr" : "rtl"} className={isExpEng ? "text-left" : "text-right"}>
                            💡 <BidiStatement text={expParts.main} />
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
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`h-9 rounded-xl text-xs font-bold gap-1 cursor-pointer ${
              darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""
            }`}
          >
            <ChevronRight className="h-4 w-4" /> الصفحة السابقة
          </Button>
          <span className={`text-xs font-bold ${mutedClass}`}>
            صفحة {page} من {totalPages} (إجمالي {total} سؤال)
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`h-9 rounded-xl text-xs font-bold gap-1 cursor-pointer ${
              darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""
            }`}
          >
            الصفحة التالية <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

