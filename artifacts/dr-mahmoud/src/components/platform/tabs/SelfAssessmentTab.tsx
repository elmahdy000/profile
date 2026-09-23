import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Play,
  Layers,
  Phone,
  User,
  Zap,
  MessageCircle,
  Send,
  ArrowRight,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";

interface StageTaxonomy {
  stage: string;
  track: "ar" | "en";
  totalQuestions: number;
  units: Array<{
    unit: string;
    totalQuestions: number;
    lessons: Array<{
      lesson: string;
      totalQuestions: number;
    }>;
  }>;
}

interface QuestionClient {
  index: number;
  prompt: string;
  options: string[];
  imageUrl?: string;
  points: number;
}

interface ReviewDetail {
  questionIndex: number;
  prompt: string;
  options: string[];
  selectedOption: number;
  correctOption: number;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  imageUrl?: string;
}

export function SelfAssessmentTab({
  student,
  onBackToDashboard,
}: {
  student?: Student | null;
  onBackToDashboard?: () => void;
}) {
  const { toast } = useToast();

  // Mode: "setup" | "taking" | "results"
  const [step, setStep] = useState<"setup" | "taking" | "results">("setup");

  // Taxonomy & eligibility
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [stages, setStages] = useState<StageTaxonomy[]>([]);
  const [selectedStageName, setSelectedStageName] = useState<string>("");
  const [selectedUnitName, setSelectedUnitName] = useState<string>("");
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]); // empty = whole unit
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Guest details (if not logged in)
  const [guestPhone, setGuestPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<{
    canTakeTest?: boolean;
    isEnrolled?: boolean;
    isFreeTrial?: boolean;
    remainingPaid?: number;
    packageCost?: number;
    packageAttempts?: number;
    requiresTopup?: boolean;
    message?: string;
  }>({});

  // Active quiz session
  const [generating, setGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(600);
  const [totalSecondsSpent, setTotalSecondsSpent] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Results
  const [score, setScore] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(0);
  const [passed, setPassed] = useState<boolean>(false);
  const [reviewDetails, setReviewDetails] = useState<ReviewDetail[]>([]);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  // 1. Fetch Taxonomy on Mount
  useEffect(() => {
    async function loadTaxonomy() {
      try {
        setTaxonomyLoading(true);
        const res = await fetch("/api/learning/self-assessment/taxonomy", { credentials: "include" });
        const data = await res.json();
        if (data.stages && data.stages.length > 0) {
          setStages(data.stages);

          // Default stage selection based on student profile or first available
          if (student) {
            const isStudentLanguages =
              student.grade?.toLowerCase().includes("لغات") ||
              student.schoolType?.toLowerCase().includes("languages") ||
              student.languageTrack?.toLowerCase().includes("لغات");

            const matched = data.stages.find((s: StageTaxonomy) =>
              isStudentLanguages ? s.track === "en" : s.track === "ar"
            );
            const defaultStage = matched || data.stages[0];
            setSelectedStageName(defaultStage.stage);
            if (defaultStage.units.length > 0) {
              setSelectedUnitName(defaultStage.units[0].unit);
            }
          } else {
            setSelectedStageName(data.stages[0].stage);
            if (data.stages[0].units.length > 0) {
              setSelectedUnitName(data.stages[0].units[0].unit);
            }
          }
        }
      } catch (err) {
        toast({ variant: "destructive", title: "خطأ", description: "تعذر تحميل قائمة المنهج والوحدات" });
      } finally {
        setTaxonomyLoading(false);
      }
    }
    void loadTaxonomy();
  }, [student]);

  // 2. Check Eligibility (if student or when guest phone entered)
  const checkEligibility = async (phoneToCheck?: string) => {
    try {
      const qPhone = phoneToCheck !== undefined ? phoneToCheck : guestPhone;
      const url = `/api/learning/self-assessment/eligibility${qPhone ? `?phone=${encodeURIComponent(qPhone)}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      setEligibilityData(data);
      setEligibilityChecked(true);
      return data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (student) {
      void checkEligibility("");
    }
  }, [student]);

  // Timer Effect during Test Taking
  useEffect(() => {
    if (step !== "taking") return;
    const timer = setInterval(() => {
      setTotalSecondsSpent((prev) => prev + 1);
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleSubmitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Selected Stage & Unit Objects
  const currentStageObj = stages.find((s) => s.stage === selectedStageName) || stages[0];
  const currentUnitObj = currentStageObj?.units.find((u) => u.unit === selectedUnitName);

  // Toggle Lesson Selection
  const toggleLesson = (lessonName: string) => {
    if (selectedLessons.includes(lessonName)) {
      setSelectedLessons(selectedLessons.filter((l) => l !== lessonName));
    } else {
      setSelectedLessons([...selectedLessons, lessonName]);
    }
  };

  // Start Exam
  const handleStartExam = async () => {
    if (!selectedUnitName) {
      toast({ variant: "destructive", description: "يرجى اختيار الوحدة أولاً" });
      return;
    }

    if (!student && (!guestPhone || guestPhone.trim().length < 10)) {
      toast({ variant: "destructive", description: "يرجى كتابة رقم الهاتف للمتابعة" });
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/learning/self-assessment/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: selectedStageName,
          unit: selectedUnitName,
          lessons: selectedLessons.length > 0 ? selectedLessons : ["all"],
          count: questionCount,
          phone: guestPhone,
          studentName: guestName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresTopup) {
          setEligibilityData({
            canTakeTest: false,
            requiresTopup: true,
            packageCost: 50,
            packageAttempts: 3,
            message: data.error,
          });
        }
        throw new Error(data.error || "تعذر بدء الاختبار");
      }

      setSessionId(data.sessionId);
      setQuestions(data.questions || []);
      setAnswers({});
      setCurrentQIndex(0);
      setTimeRemainingSeconds((data.durationMinutes || 15) * 60);
      setTotalSecondsSpent(0);
      setStep("taking");

      toast({
        title: "بدأ الاختبار بالتوفيق! 🎯",
        description: `تم سحب ${data.questionsCount} سؤال للتقييم الذاتي.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "تنبيه",
        description: (err as Error).message,
      });
    } finally {
      setGenerating(false);
    }
  };

  // Submit Test
  const handleSubmitTest = async (isAuto = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/learning/self-assessment/submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers,
          timeSpentSeconds: totalSecondsSpent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تسليم الاختبار");

      setScore(data.score || 0);
      setTotalPoints(data.totalPoints || 0);
      setPercentage(data.percentage || 0);
      setPassed(Boolean(data.passed));
      setReviewDetails(data.review || []);
      setStep("results");

      if (isAuto) {
        toast({ title: "انتهى الوقت", description: "تم تسليم إجاباتك وإظهار تقرير التقييم الذاتي." });
      } else {
        toast({ title: "تم تسليم الاختبار بنجاح! 🌟", description: `نتيجتك: ${data.percentage}%` });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "خطأ في التسليم",
        description: (err as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Filtered review questions
  const displayedReview = showOnlyErrors
    ? reviewDetails.filter((item) => !item.isCorrect)
    : reviewDetails;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* ────────────────── STEP 1: SETUP ────────────────── */}
      {step === "setup" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  خدمة التقييم الذاتي الفوري حسب الطلب
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  اختبر نفسك وقيّم مستواك في أي وحدة أو درس 🎯
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                  اختر الوحدة أو الدروس التي ترغب في مراجعتها، وسيتم توليد اختبار مخصص فوراً من بنك الأسئلة
                  مع إظهار درجاتك وتوضيح الإجابة الصحيحة وشرح تفصيلي لكل خطأ تقع فيه!
                </p>
              </div>

              {onBackToDashboard && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBackToDashboard}
                  className="rounded-2xl border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs shrink-0"
                >
                  <ArrowRight className="h-4 w-4 ml-1.5" /> العودة للوحة التحكم
                </Button>
              )}
            </div>
          </div>

          {/* Access / Entitlement Badge */}
          {student ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30 dark:border-emerald-800 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Award className="h-5 w-5" />
              </div>
              <div className="text-xs sm:text-sm">
                <strong className="text-emerald-900 dark:text-emerald-300 font-bold block">
                  مرحباً بك يا {student.name} (طالب مسجل بالمنصة) 🎉
                </strong>
                <span className="text-emerald-700 dark:text-emerald-400">
                  متاح لك إجراء أي عدد من اختبارات التقييم الذاتي مجاناً وبلا حدود.
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    بيانات الطالب لاختبار التقييم الذاتي
                  </h3>
                  <p className="text-xs text-slate-500">
                    أول محاولة تجريبية مجانية 100% لجميع الزوار للتجربة واكتشاف قوة المنصة!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    رقم الهاتف (فودافون/أورنج/اتصالات/وي) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="مثال: 01012345678"
                      value={guestPhone}
                      onChange={(e) => {
                        setGuestPhone(e.target.value);
                        if (e.target.value.length >= 11) {
                          void checkEligibility(e.target.value);
                        }
                      }}
                      className="pr-9 rounded-xl text-xs h-10 border-slate-200"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    اسم الطالب
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="اكتب اسمك الثلاثي"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="pr-9 rounded-xl text-xs h-10 border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Status Notice for Guests */}
              {eligibilityChecked && (
                <div className="pt-1">
                  {eligibilityData.canTakeTest ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{eligibilityData.message || "محاولتك جاهزة ومتاحة الآن!"}</span>
                    </div>
                  ) : eligibilityData.requiresTopup ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>انتهت محاولتك المجانية</span>
                      </div>
                      <p className="leading-relaxed">
                        يمكنك شحن باقة <strong>(3 محاولات بـ 50 جنيه فقط)</strong> لمواصلة التقييم الذاتي
                        وحفظ نتائجك. يتم التفعيل الفوري من المساعد أو الأدمن.
                      </p>
                      <div className="pt-2 flex flex-wrap items-center gap-2.5">
                        <a
                          href="https://wa.me/201061803732?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A8%D8%A7%D9%82%D8%A9%203%20%D9%85%D8%AD%D8%A7%D9%88%D9%84%D8%A7%D8%AA%20%D8%AA%D9%82%D9%8A%D9%8A%D9%85%20%D8%B0%D8%A7%D8%AA%D9%8A%20(50%20%D8%AC%D9%86%D9%8A%D9%87)"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          تواصل مع المساعد لتفعيل الباقة
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Stepper Wizard: Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Step 1: Stage & Track */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-xs">1</span>
                المرحلة والمسار التعليمي
              </div>

              {taxonomyLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">جاري تحميل المراحل...</div>
              ) : (
                <div className="space-y-2">
                  {stages.map((st) => (
                    <button
                      key={st.stage}
                      type="button"
                      onClick={() => {
                        setSelectedStageName(st.stage);
                        if (st.units.length > 0) {
                          setSelectedUnitName(st.units[0].unit);
                          setSelectedLessons([]);
                        }
                      }}
                      className={`w-full text-right p-3 rounded-xl border text-xs font-semibold transition-all ${
                        selectedStageName === st.stage
                          ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{st.track === "en" ? "🇬🇧 لغات (Languages)" : "🇪🇬 عام (عربي)"}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border text-slate-500">
                          {st.totalQuestions} سؤال
                        </span>
                      </div>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
                        {st.stage}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Unit Selection */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-xs">2</span>
                الوحدة الدراسية
              </div>

              {!currentStageObj || currentStageObj.units.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">لا توجد وحدات متاحة لهذا المسار</div>
              ) : (
                <div className="space-y-2">
                  {currentStageObj.units.map((u) => (
                    <button
                      key={u.unit}
                      type="button"
                      onClick={() => {
                        setSelectedUnitName(u.unit);
                        setSelectedLessons([]);
                      }}
                      className={`w-full text-right p-3 rounded-xl border text-xs font-semibold transition-all ${
                        selectedUnitName === u.unit
                          ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{u.unit}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border text-slate-500">
                          {u.totalQuestions} سؤال
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-normal">
                        يتضمن {u.lessons.length} دروس رئيسية
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 3: Specific Lessons or All Unit */}
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-xs">3</span>
                نطاق الاختبار (الوحدة أو الدروس)
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedLessons([])}
                  className={`w-full text-right p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    selectedLessons.length === 0
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>🌟 شامل الوحدة بالكامل (كل الدروس)</span>
                    {selectedLessons.length === 0 && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  </div>
                </button>

                <div className="text-[11px] font-bold text-slate-400 pt-1">أو حدد دروساً معينة:</div>

                {currentUnitObj?.lessons.map((les) => {
                  const isChecked = selectedLessons.includes(les.lesson);
                  return (
                    <button
                      key={les.lesson}
                      type="button"
                      onClick={() => toggleLesson(les.lesson)}
                      className={`w-full text-right p-2.5 rounded-xl border text-xs transition-all ${
                        isChecked
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate max-w-[200px]">{les.lesson}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">{les.totalQuestions} ق</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-blue-600"
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question Count & Start Action */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                عدد الأسئلة:
              </span>
              <div className="flex items-center gap-2">
                {[10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={`h-9 px-3.5 rounded-xl text-xs font-bold border transition-all ${
                      questionCount === num
                        ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {num} سؤال ({Math.ceil(num * 1.5)} د)
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              disabled={generating || !selectedUnitName}
              onClick={handleStartExam}
              className="w-full sm:w-auto px-8 h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all"
            >
              {generating ? (
                <>جاري تحضير الأسئلة...</>
              ) : (
                <>
                  <Play className="h-4 w-4 ml-2 fill-white" />
                  ابدأ اختبار التقييم الذاتي الآن
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────── STEP 2: TAKING THE TEST ────────────────── */}
      {step === "taking" && questions.length > 0 && (
        <div className="space-y-5">
          {/* Top Bar: Progress & Timer */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-4 shadow-xs flex items-center justify-between gap-4 sticky top-4 z-30">
            <div className="flex items-center gap-2.5">
              <span className="h-8 px-3 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-bold text-xs flex items-center">
                سؤال {currentQIndex + 1} من {questions.length}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                {Object.keys(answers).length} إجابة مكتملة
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                  timeRemainingSeconds < 120
                    ? "bg-red-50 border-red-200 text-red-600 animate-pulse"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>الوقت المتبقي: {formatTimer(timeRemainingSeconds)}</span>
              </div>

              <Button
                variant="default"
                size="sm"
                disabled={submitting}
                onClick={() => {
                  if (confirm("هل أنت متأكد من تسليم الإجابات وعرض النتيجة؟")) {
                    void handleSubmitTest(false);
                  }
                }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-xs"
              >
                {submitting ? "جاري التصحيح..." : "تسليم الاختبار 🏁"}
              </Button>
            </div>
          </div>

          {/* Question Navigator Dots */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 shadow-xs flex flex-wrap items-center gap-1.5 justify-center">
            {questions.map((q, idx) => {
              const isAnswered = answers[idx] !== undefined;
              const isCurrent = currentQIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentQIndex(idx)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? "ring-2 ring-blue-600 bg-blue-600 text-white shadow-xs"
                      : isAnswered
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Current Question Card */}
          {(() => {
            const currentQ = questions[currentQIndex];
            const currentAnswer = answers[currentQIndex];

            return (
              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span>السؤال رقم #{currentQIndex + 1}</span>
                    <span>1 درجة</span>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                    {currentQ.prompt}
                  </h2>

                  {currentQ.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 max-w-md mx-auto my-3">
                      <img src={currentQ.imageUrl} alt="سؤال" className="w-full h-auto object-contain" />
                    </div>
                  )}
                </div>

                {/* Options List */}
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((optionText, optIdx) => {
                    const isSelected = currentAnswer === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [currentQIndex]: optIdx })}
                        className={`w-full text-right p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 font-semibold shadow-xs"
                            : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span className="leading-relaxed">{optionText}</span>
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mr-3 ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Prev / Next Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentQIndex === 0}
                    onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                    className="rounded-xl text-xs"
                  >
                    <ChevronRight className="h-4 w-4 ml-1" /> السابق
                  </Button>

                  {currentQIndex < questions.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs px-5"
                    >
                      التالي <ChevronLeft className="h-4 w-4 mr-1" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={submitting}
                      onClick={() => {
                        if (confirm("هل انتهيت وترغب في تسليم الاختبار الآن؟")) {
                          void handleSubmitTest(false);
                        }
                      }}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 font-bold"
                    >
                      تسليم الاختبار وعرض النتيجة
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ────────────────── STEP 3: RESULTS & EXPLANATIONS ────────────────── */}
      {step === "results" && (
        <div className="space-y-6">
          {/* Result Card */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-md text-center space-y-4">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-950 text-blue-600 shadow-inner mx-auto">
              <Award className="h-10 w-10 text-blue-600" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                تقرير نتيجة التقييم الذاتي
              </h2>
              <p className="text-xs text-slate-500">
                الوحدة: {selectedUnitName} • عدد الأسئلة: {reviewDetails.length}
              </p>
            </div>

            {/* Score & Percentage */}
            <div className="flex items-center justify-center gap-6 py-2">
              <div className="text-center">
                <span className="text-3xl sm:text-4xl font-black text-blue-600 block">
                  {percentage}%
                </span>
                <span className="text-xs text-slate-400 font-semibold">النسبة المئوية</span>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="text-center">
                <span className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-slate-200 block">
                  {score} / {totalPoints}
                </span>
                <span className="text-xs text-slate-400 font-semibold">إجمالي الدرجات</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("setup")}
                className="rounded-2xl text-xs font-bold"
              >
                <RotateCcw className="h-4 w-4 ml-1.5" />
                إجراء تقييم ذاتي جديد
              </Button>

              <Button
                variant={showOnlyErrors ? "default" : "outline"}
                onClick={() => setShowOnlyErrors(!showOnlyErrors)}
                className="rounded-2xl text-xs font-bold"
              >
                {showOnlyErrors ? "عرض كل الأسئلة" : "عرض الأخطاء فقط ❌"}
              </Button>
            </div>
          </div>

          {/* Questions Review List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-blue-600" />
              مراجعة الأسئلة والشروحات التفصيلية ({displayedReview.length} سؤال معروض):
            </h3>

            {displayedReview.map((rev) => (
              <div
                key={rev.questionIndex}
                className={`rounded-2xl border p-5 sm:p-6 space-y-4 transition-all ${
                  rev.isCorrect
                    ? "border-emerald-200 bg-white dark:bg-slate-900 dark:border-emerald-900/40"
                    : "border-red-200 bg-red-50/20 dark:bg-slate-900 dark:border-red-900/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-6 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600">
                      #{rev.questionIndex + 1}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        rev.isCorrect
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {rev.isCorrect ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> إجابة صحيحة (+1)
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" /> إجابة غير صحيحة (0)
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {rev.prompt}
                </h4>

                {/* Options with Highlight */}
                <div className="space-y-2 pt-1">
                  {rev.options.map((opt, oIdx) => {
                    const isSelected = rev.selectedOption === oIdx;
                    const isTrueCorrect = rev.correctOption === oIdx;

                    let optClass = "border-slate-200 dark:border-slate-800 text-slate-600 bg-white dark:bg-slate-800/40";
                    if (isTrueCorrect) {
                      optClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold";
                    } else if (isSelected && !rev.isCorrect) {
                      optClass = "border-red-500 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200 line-through";
                    }

                    return (
                      <div
                        key={oIdx}
                        className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${optClass}`}
                      >
                        <span>{opt}</span>
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                              إجابتك
                            </span>
                          )}
                          {isTrueCorrect && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-semibold">
                              الصحيحة ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Step-by-Step Explanation */}
                {rev.explanation && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-900/40 p-4 space-y-1.5 text-xs text-blue-950 dark:text-blue-200">
                    <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                      <HelpCircle className="h-3.5 w-3.5" />
                      الشرح التوضيحي للحل الصحيح:
                    </div>
                    <p className="leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
                      {rev.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
