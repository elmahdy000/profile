import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FileEdit,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Eye,
  X,
  Send,
  Loader2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Search,
  BookOpen,
  Calendar,
  AlertCircle,
  HelpCircle,
  FileText,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";

interface EssayQuestion {
  id: string;
  prompt: string;
  points: number;
  imageUrl?: string;
  modelAnswer?: string;
  modelAnswerImageUrl?: string;
  explanation?: string;
}

interface EssayExam {
  id: number;
  title: string;
  description?: string;
  stage?: string;
  stages?: string[];
  category?: string;
  durationMinutes: number;
  totalPoints: number;
  questionsCount?: number;
  allowImageUpload: boolean;
  isPublished: boolean;
  mySubmission?: {
    id: number;
    status: "in_progress" | "submitted" | "reviewed";
    startedAt: string;
    submittedAt?: string;
    adminScore?: number;
    adminFeedback?: string;
    answers?: Array<{
      questionId: string;
      writtenText?: string;
      attachmentUrl?: string;
      score?: number;
      feedback?: string;
    }>;
  } | null;
}

interface EssayExamDetail extends EssayExam {
  questions: EssayQuestion[];
}

export function EssayExamsTab({
  student,
  onBackToDashboard,
}: {
  student: Student;
  onBackToDashboard?: () => void;
}) {
  const { toast } = useToast();
  const [exams, setExams] = useState<EssayExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Active exam state
  const [activeExam, setActiveExam] = useState<EssayExamDetail | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "exam_room" | "model_answer">("list");
  const [loadingExam, setLoadingExam] = useState(false);

  // Student answers in exam room: map of questionId -> { writtenText, attachmentUrl }
  const [answers, setAnswers] = useState<Record<string, { writtenText: string; attachmentUrl?: string }>>({});
  const [uploadingForQuestion, setUploadingForQuestion] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // Timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Image lightbox preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // 1. Load available essay exams
  const loadExams = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/learning/essay-exams", { credentials: "include" });
      if (!res.ok) throw new Error("تعذر تحميل الامتحانات المقالية");
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({
        title: "خطأ في التحميل",
        description: err.message || "حدث خطأ أثناء تحميل الامتحانات المقالية",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  // 2. Open an exam
  const handleOpenExam = async (examId: number, autoStart = false) => {
    try {
      setLoadingExam(true);
      const res = await fetch(`/api/learning/essay-exams/${examId}`, { credentials: "include" });
      if (!res.ok) throw new Error("تعذر جلب تفاصيل الامتحان");
      const examData: EssayExamDetail = await res.json();
      setActiveExam(examData);

      const submission = examData.mySubmission;

      if (submission?.status === "submitted" || submission?.status === "reviewed") {
        // Preload answers if reviewing
        if (submission.answers) {
          const map: Record<string, { writtenText: string; attachmentUrl?: string }> = {};
          submission.answers.forEach((ans) => {
            map[ans.questionId] = {
              writtenText: ans.writtenText || "",
              attachmentUrl: ans.attachmentUrl,
            };
          });
          setAnswers(map);
        }
        setViewMode("model_answer");
      } else {
        // Either not started or in_progress
        if (!submission && autoStart) {
          // Trigger start
          const startRes = await fetch(`/api/learning/essay-exams/${examId}/start`, {
            method: "POST",
            credentials: "include",
          });
          if (!startRes.ok) throw new Error("تعذر بدء مؤقت الامتحان");
          const startData = await startRes.json();
          examData.mySubmission = {
            id: startData.submissionId,
            status: "in_progress",
            startedAt: startData.startedAt,
          };
          setActiveExam({ ...examData });
        }

        // Initialize answers state
        const initialAnswers: Record<string, { writtenText: string; attachmentUrl?: string }> = {};
        if (submission?.answers) {
          submission.answers.forEach((ans) => {
            initialAnswers[ans.questionId] = {
              writtenText: ans.writtenText || "",
              attachmentUrl: ans.attachmentUrl,
            };
          });
        }
        setAnswers(initialAnswers);

        // Setup timer based on startedAt
        const startedTime = examData.mySubmission?.startedAt
          ? new Date(examData.mySubmission.startedAt).getTime()
          : Date.now();
        const durationSec = (examData.durationMinutes || 60) * 60;
        const elapsedSec = Math.floor((Date.now() - startedTime) / 1000);
        const rem = Math.max(0, durationSec - elapsedSec);

        setRemainingSeconds(rem);
        setTimerExpired(rem <= 0);
        setViewMode("exam_room");
      }
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "تعذر فتح الامتحان المقالي",
        variant: "destructive",
      });
    } finally {
      setLoadingExam(false);
    }
  };

  // 3. Countdown timer effect
  useEffect(() => {
    if (viewMode !== "exam_room") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerExpired(true);
          handleAutoSubmitOnExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewMode]);

  // Format time as HH:MM:SS
  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // 4. Handle text answer change
  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        writtenText: text,
      },
    }));
  };

  // 5. Handle image upload for handwritten solution
  const handleUploadImage = async (questionId: string, file: File) => {
    if (!file) return;
    try {
      setUploadingForQuestion(questionId);
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/learning/essay-exams/upload-answer-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "فشل رفع الصورة");
      }

      const result = await res.json();
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...(prev[questionId] || { writtenText: "" }),
          attachmentUrl: result.fileUrl,
        },
      }));

      toast({
        title: "تم رفع صورة الحل بنجاح 📸",
        description: "تم حفظ ورقة إجابتك وجاهزة للاعتماد",
      });
    } catch (err: any) {
      toast({
        title: "خطأ في رفع الصورة",
        description: err.message || "حدث خطأ أثناء رفع ورقة الإجابة",
        variant: "destructive",
      });
    } finally {
      setUploadingForQuestion(null);
    }
  };

  const handleRemoveImage = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { writtenText: "" }),
        attachmentUrl: undefined,
      },
    }));
  };

  // 6. Submit exam
  const handleSubmitExam = async () => {
    if (!activeExam) return;
    try {
      setSubmitting(true);
      const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        writtenText: ans.writtenText || "",
        attachmentUrl: ans.attachmentUrl || null,
      }));

      const totalDurationSec = (activeExam.durationMinutes || 60) * 60;
      const timeSpent = Math.max(1, totalDurationSec - remainingSeconds);

      const res = await fetch(`/api/learning/essay-exams/${activeExam.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          answers: formattedAnswers,
          timeSpentSeconds: timeSpent,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "فشل تسليم الامتحان");
      }

      const result = await res.json();

      // Update activeExam with model answers returned upon submit
      if (result.modelAnswers) {
        setActiveExam((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            questions: result.modelAnswers,
            mySubmission: result.submission,
          };
        });
      }

      setConfirmSubmitOpen(false);
      setViewMode("model_answer");

      toast({
        title: "🎉 تم تسليم الامتحان المقالي بنجاح!",
        description: "ظهر لك الآن الحل النموذجي والمثالي المعتمد لكل سؤال",
      });

      // Reload exams list in background
      loadExams();
    } catch (err: any) {
      toast({
        title: "تعذر تسليم الامتحان",
        description: err.message || "حدث خطأ أثناء تسليم الإجابات",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmitOnExpiry = () => {
    toast({
      title: "⏰ انتهى وقت الامتحان المحدد!",
      description: "جاري تسليم إجاباتك تلقائياً وعرض الحل النموذجي...",
      variant: "warning",
    });
    handleSubmitExam();
  };

  // Filtered exams list
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(search.toLowerCase()));
      return matchSearch;
    });
  }, [exams, search]);

  // Answered questions counter
  const answeredCount = useMemo(() => {
    if (!activeExam?.questions) return 0;
    return activeExam.questions.filter((q) => {
      const a = answers[q.id];
      return (a?.writtenText && a.writtenText.trim().length > 0) || Boolean(a?.attachmentUrl);
    }).length;
  }, [activeExam, answers]);

  // ─────────────────────────────────────────────────────────────
  // VIEW 1: EXAMS LIST
  // ─────────────────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <div className="space-y-6" dir="rtl">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-200/60 bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 p-6 sm:p-8 text-white shadow-xl dark:border-blue-900/40">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>نظام الامتحانات المقالية التحريرية ✍️</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              الامتحانات والواجبات المقالية
            </h1>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              اختبر مهاراتك في الحل التحريري وكتابة المعادلات والمسائل الكيميائية بالتفصيل. يبدأ عداد الوقت (ساعة كاملة) وفور انتهائك يظهر لك الحل النموذجي والمثالي المعتمد من د. محمود المهدي.
            </p>
          </div>
          <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-sky-400/20 blur-2xl" />
        </div>

        {/* Search bar & Refresh */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن اختبار مقالي بالاسم..."
              className="w-full rounded-2xl border border-border bg-card pr-10 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadExams}
            disabled={loading}
            className="w-full sm:w-auto rounded-xl gap-2 text-xs font-bold"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث القائمة
          </Button>
        </div>

        {/* Exams Grid */}
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="mt-3 text-xs font-semibold text-muted-foreground">جاري تحميل الامتحانات المقالية...</span>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FileEdit className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-base font-bold text-foreground">لا توجد امتحانات مقالية منشورة حالياً</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              سيقوم د. محمود بنشر اختبارات مقالية جديدة لك قريباً. تفقد المنصة بانتظام!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredExams.map((exam) => {
              const sub = exam.mySubmission;
              const isSubmitted = sub?.status === "submitted" || sub?.status === "reviewed";
              const isInProgress = sub?.status === "in_progress";
              const isReviewed = sub?.status === "reviewed";

              return (
                <div
                  key={exam.id}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md hover:border-primary/40 relative overflow-hidden group"
                >
                  <div className="space-y-3.5">
                    {/* Top badging */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 text-xs font-bold">
                        <FileEdit className="h-3.5 w-3.5" />
                        {exam.stage || "الكيمياء العامة"}
                      </span>
                      {isReviewed ? (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-extrabold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          تم التقييم: {sub.adminScore} / {exam.totalPoints}
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 px-2.5 py-1 text-xs font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          تم التسليم ✅
                        </span>
                      ) : isInProgress ? (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-1 text-xs font-bold animate-pulse">
                          <Clock className="h-3.5 w-3.5" />
                          جاري الحل ⏱️
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-muted text-muted-foreground px-2.5 py-1 text-xs font-semibold">
                          لم يبدأ بعد
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {exam.title}
                      </h3>
                      {exam.description && (
                        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                          {exam.description}
                        </p>
                      )}
                    </div>

                    {/* Exam Specs (Duration & Points) */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                      <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-2 text-muted-foreground font-medium">
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{exam.durationMinutes || 60} دقيقة (ساعة)</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-2 text-muted-foreground font-medium">
                        <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{exam.totalPoints} درجة</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 pt-3">
                    {isSubmitted ? (
                      <Button
                        onClick={() => handleOpenExam(exam.id)}
                        disabled={loadingExam}
                        className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs shadow-xs"
                      >
                        <Sparkles className="h-4 w-4" />
                        عرض الحل النموذجي والمثالي
                      </Button>
                    ) : isInProgress ? (
                      <Button
                        onClick={() => handleOpenExam(exam.id)}
                        disabled={loadingExam}
                        className="w-full rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 text-xs shadow-xs animate-pulse"
                      >
                        <Clock className="h-4 w-4" />
                        متابعة حل الاختبار ✍️
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleOpenExam(exam.id, true)}
                        disabled={loadingExam}
                        className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 text-xs shadow-xs"
                      >
                        <FileEdit className="h-4 w-4" />
                        بدء الاختبار المقالي (60 دقيقة) ⏱️
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 2: LIVE EXAM ROOM (COUNTDOWN & ANSWER SUBMISSION)
  // ─────────────────────────────────────────────────────────────
  if (viewMode === "exam_room" && activeExam) {
    const isWarning = remainingSeconds < 300; // < 5 minutes
    const progressPercent = Math.max(
      0,
      Math.min(100, (remainingSeconds / ((activeExam.durationMinutes || 60) * 60)) * 100)
    );

    return (
      <div className="space-y-6 pb-28" dir="rtl">
        {/* Sticky Exam Header Bar with Countdown Timer */}
        <div className="sticky top-14 z-30 -mx-4 sm:-mx-6 -mt-6 px-4 sm:px-6 py-3 bg-white/95 dark:bg-[#0E1626]/95 backdrop-blur-md border-b border-border shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm("الامتحان لا يزال جارياً والوقت يحتسب! هل تريد الرجوع للقائمة الرئيسية؟")) {
                  setViewMode("list");
                }
              }}
              className="p-1.5 rounded-xl border border-border hover:bg-muted text-muted-foreground"
              title="خروج مؤقت"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-foreground truncate max-w-xs sm:max-w-md">
                {activeExam.title}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                تمت إجابة {answeredCount} من {activeExam.questions.length} سؤال
              </span>
            </div>
          </div>

          {/* Countdown Clock Display */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-2xl px-3.5 py-1.5 border font-mono text-sm font-extrabold shadow-xs transition-colors ${
                isWarning
                  ? "bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-400 animate-pulse"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
              }`}
            >
              <Clock className="h-4 w-4 shrink-0" />
              <span>{formatTimer(remainingSeconds)}</span>
              {isWarning && <span className="text-[10px] font-sans font-bold">باقي أقل من 5 دقائق!</span>}
            </div>

            <Button
              onClick={() => setConfirmSubmitOpen(true)}
              disabled={submitting}
              className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5 shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              إنهاء وتسليم
            </Button>
          </div>
        </div>

        {/* Warning notification banner */}
        <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div className="space-y-1">
            <strong className="font-bold">تعليمات هامة للاختبار المقالي:</strong>
            <p className="text-[11px] leading-relaxed opacity-90">
              يمكنك كتابة إجابتك نصياً في الخانة المخصصة، أو كتابتها بخط يدك في ورقة خارجية وتصويرها بالكاميرا ورفعها (موصى به جداً للمعادلات والرسومات). فور تسليمك للامتحان سيظهر لك الحل النموذجي والمثالي مباشرة!
            </p>
          </div>
        </div>

        {/* Questions list */}
        <div className="space-y-6">
          {activeExam.questions.map((q, idx) => {
            const currentAnswer = answers[q.id] || { writtenText: "" };
            const isAnswered =
              (currentAnswer.writtenText && currentAnswer.writtenText.trim().length > 0) ||
              Boolean(currentAnswer.attachmentUrl);
            const isUploading = uploadingForQuestion === q.id;

            return (
              <div
                key={q.id}
                className={`rounded-3xl border bg-card p-5 sm:p-6 shadow-xs transition-all ${
                  isAnswered ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
                }`}
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary text-white text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      السؤال رقم ({idx + 1})
                    </h3>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    {q.points} درجات
                  </span>
                </div>

                {/* Question Prompt */}
                <div className="mt-4 space-y-3">
                  <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed whitespace-pre-wrap select-text">
                    {q.prompt}
                  </p>

                  {/* Question Image (if any) */}
                  {q.imageUrl && (
                    <div className="mt-2 rounded-2xl overflow-hidden border border-border bg-muted/30 max-w-lg">
                      <img
                        src={q.imageUrl}
                        alt={`شكل السؤال ${idx + 1}`}
                        className="w-full object-contain max-h-72 cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => setPreviewImageUrl(q.imageUrl!)}
                      />
                    </div>
                  )}
                </div>

                {/* Answer Area */}
                <div className="mt-5 space-y-4 pt-4 border-t border-border/60">
                  {/* Text Answer */}
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      الإجابة التحريرية المكتوبة:
                    </label>
                    <textarea
                      value={currentAnswer.writtenText}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="اكتب إجابتك هنا بالتفصيل أو الشرح النظري..."
                      rows={4}
                      className="w-full rounded-2xl border border-border bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs leading-relaxed resize-y"
                    />
                  </div>

                  {/* Handwritten paper upload (Chemistry formulas / diagrams) */}
                  {activeExam.allowImageUpload && (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <ImageIcon className="h-4 w-4 text-primary" />
                          <span>صورة ورقة الإجابة المكتوبة بخط اليد (اختياري للمعادلات):</span>
                        </div>

                        {/* File input button */}
                        <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 text-xs font-bold transition-colors w-fit">
                          {isUploading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>جاري الرفع...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5" />
                              <span>{currentAnswer.attachmentUrl ? "تغيير الصورة" : "التقاط أو رفع ورقة الحل 📷"}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadImage(q.id, file);
                            }}
                          />
                        </label>
                      </div>

                      {/* Uploaded image preview */}
                      {currentAnswer.attachmentUrl && (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-2.5">
                          <div
                            className="flex items-center gap-2.5 cursor-pointer min-w-0"
                            onClick={() => setPreviewImageUrl(currentAnswer.attachmentUrl!)}
                          >
                            <img
                              src={currentAnswer.attachmentUrl}
                              alt="ورقة إجابة الطالب"
                              className="h-12 w-12 rounded-lg object-cover border border-border shrink-0"
                            />
                            <div className="truncate text-xs">
                              <span className="font-bold text-foreground block truncate">تم إرفاق ورقة الحل</span>
                              <span className="text-[10px] text-primary flex items-center gap-1">
                                <Eye className="h-3 w-3" /> انقر للمعاينة وتكبير الصورة
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(q.id)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="حذف الصورة"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Bottom Submit Bar */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-3 sm:p-4 shadow-xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-bold text-foreground block sm:inline">حالة الإجابة: </span>
              <span className="font-semibold text-muted-foreground">
                أجبت على {answeredCount} من أصل {activeExam.questions.length} سؤال
              </span>
            </div>

            <Button
              size="lg"
              onClick={() => setConfirmSubmitOpen(true)}
              disabled={submitting}
              className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold gap-2 px-6 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري التسليم...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>إنهاء وتسليم الاختبار المقالي 🚀</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmSubmitOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary mx-auto">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">تأكيد تسليم الاختبار المقالي</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  لقد قمت بحل <strong className="text-foreground">{answeredCount}</strong> من أصل{" "}
                  <strong className="text-foreground">{activeExam.questions.length}</strong> أسئلة.
                  {answeredCount < activeExam.questions.length && (
                    <span className="block mt-1 text-amber-600 dark:text-amber-400 font-bold">
                      ⚠️ انتبه: توجد أسئلة لم تقم بالإجابة عليها بعد!
                    </span>
                  )}
                  بمجرد التسليم سيتم غلق التعديل وعرض الحل النموذجي والمثالي فورياً.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmSubmitOpen(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs font-bold"
                >
                  العودة للحل
                </Button>
                <Button
                  onClick={handleSubmitExam}
                  disabled={submitting}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  تأكيد وتسليم الآن
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 3: MODEL ANSWER & EVALUATION VIEW
  // ─────────────────────────────────────────────────────────────
  if (viewMode === "model_answer" && activeExam) {
    const sub = activeExam.mySubmission;
    const isReviewed = sub?.status === "reviewed";

    return (
      <div className="space-y-6 pb-20" dir="rtl">
        {/* Navigation back */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-xl gap-2 text-xs font-bold"
          >
            <ChevronRight className="h-4 w-4" />
            الرجوع لقائمة الامتحانات المقالية
          </Button>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            تم تسليم الاختبار بنجاح
          </span>
        </div>

        {/* Hero Celebration / Model Answer Banner */}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>الحل النموذجي والمثالي المعتمد</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black">
              {activeExam.title}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              إليك الإجابات النموذجية والشرح وخطوات الحل وتوزيع الدرجات المعتمدة من د. محمود المهدي لكل سؤال، لمقارنتها بإجابتك التحريرية ومعرفة نقاط القوة ومواطن التحسين.
            </p>
          </div>

          <div className="absolute left-0 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        </div>

        {/* If reviewed by Dr. Mahmoud: show Score & Feedback card */}
        {isReviewed && (
          <div className="rounded-3xl border border-emerald-500/40 bg-card p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">نتيجة وتقييم د. محمود المهدي</h3>
                  <span className="text-xs text-muted-foreground">تم تصحيح وتدقيق إجاباتك يدوياً</span>
                </div>
              </div>

              {/* Big Score Badge */}
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-2">
                <span className="text-xs text-muted-foreground font-bold">الدرجة المستحقة:</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {sub?.adminScore}
                </span>
                <span className="text-xs text-muted-foreground font-bold">
                  / {activeExam.totalPoints}
                </span>
              </div>
            </div>

            {/* Dr. Mahmoud's Feedback */}
            {sub?.adminFeedback && (
              <div className="rounded-2xl bg-muted/40 p-4 space-y-1.5 border border-border">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  ملاحظات وتوجيهات د. محمود:
                </span>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {sub.adminFeedback}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Questions comparison list */}
        <div className="space-y-8">
          {activeExam.questions.map((q, idx) => {
            const studentAns = answers[q.id];

            return (
              <div
                key={q.id}
                className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-6"
              >
                {/* Question Title */}
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary text-white text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      السؤال رقم ({idx + 1})
                    </h3>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                    {q.points} درجات
                  </span>
                </div>

                {/* Prompt */}
                <div className="space-y-3">
                  <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed select-text">
                    {q.prompt}
                  </p>
                  {q.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-border bg-muted/30 max-w-md">
                      <img
                        src={q.imageUrl}
                        alt="صورة السؤال"
                        className="w-full object-contain max-h-60 cursor-pointer"
                        onClick={() => setPreviewImageUrl(q.imageUrl!)}
                      />
                    </div>
                  )}
                </div>

                {/* Student's Submitted Answer Section */}
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-blue-500" />
                      إجابتك التي قمت بتسليمها:
                    </span>
                  </div>

                  {studentAns?.writtenText ? (
                    <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap bg-card rounded-xl p-3 border border-border/60 leading-relaxed select-text">
                      {studentAns.writtenText}
                    </p>
                  ) : (
                    <span className="text-xs text-muted-foreground italic block">
                      (لم يتم إدخال إجابة نصية)
                    </span>
                  )}

                  {/* Student uploaded handwritten image */}
                  {studentAns?.attachmentUrl && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-muted-foreground block mb-1.5">
                        ورقة الحل المرفوعة بخط يدك:
                      </span>
                      <div
                        className="relative rounded-2xl overflow-hidden border border-border bg-card max-w-sm cursor-pointer group"
                        onClick={() => setPreviewImageUrl(studentAns.attachmentUrl!)}
                      >
                        <img
                          src={studentAns.attachmentUrl}
                          alt="ورقة إجابة الطالب"
                          className="w-full max-h-64 object-contain group-hover:scale-102 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white text-xs font-bold gap-1">
                          <Eye className="h-4 w-4" />
                          <span>انقر لتكبير الصورة</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Model / Ideal Answer Section (The Gold Standard) */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-5 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>الحل النموذجي والمثالي المعتمد من د. محمود:</span>
                  </div>

                  {q.modelAnswer ? (
                    <div className="text-xs sm:text-sm text-foreground font-medium leading-relaxed whitespace-pre-wrap bg-white dark:bg-[#0E1626] rounded-xl p-4 border border-emerald-500/20 shadow-2xs select-text">
                      {q.modelAnswer}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      الحل النموذجي قيد التحديث
                    </span>
                  )}

                  {/* Model Answer Image (e.g., Doctor's handwritten formula or diagram) */}
                  {q.modelAnswerImageUrl && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block mb-1.5">
                        رسمة / ورقة الحل النموذجية التوضيحية:
                      </span>
                      <div
                        className="rounded-2xl overflow-hidden border border-emerald-500/30 bg-card max-w-md cursor-pointer hover:opacity-95"
                        onClick={() => setPreviewImageUrl(q.modelAnswerImageUrl!)}
                      >
                        <img
                          src={q.modelAnswerImageUrl}
                          alt="صورة الحل النموذجي"
                          className="w-full max-h-72 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step Explanation / Grading breakdown */}
                  {q.explanation && (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        توضيح وتوزيع الدرجات:
                      </span>
                      <p className="leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back to exams bottom button */}
        <div className="text-center pt-6">
          <Button
            size="lg"
            onClick={() => setViewMode("list")}
            className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 px-8"
          >
            <ChevronRight className="h-4 w-4" />
            العودة للامتحانات المقالية
          </Button>
        </div>
      </div>
    );
  }

  // Lightbox Image Preview Modal
  return (
    <>
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-xs p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-2 right-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImageUrl}
              alt="معاينة الصورة"
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
