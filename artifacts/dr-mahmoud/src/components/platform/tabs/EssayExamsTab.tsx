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
  Check,
  Plus,
  Minus,
  SlidersHorizontal,
  BarChart3,
  Tag,
  Target,
  Save,
  CheckCheck,
  TrendingUp,
  Layers,
  Volume2,
  VolumeX,
  EyeOff,
  GraduationCap,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@/types/platform";
import {
  isPrimarilyEnglish,
  splitModelAnswerTranslation,
  speakEnglishText,
  stopSpeech,
  isSpeechSupported,
} from "../../kholasa/kholasa-speech";
import { BidiStatement } from "../../kholasa/BidiStatement";

interface EssayBankQuestion {
  id: number;
  unit: string;
  lesson: string;
  difficulty: string;
  points: number;
  prompt: string;
  translation?: string | null;
  modelAnswer: string;
  explanation?: string | null;
  imageUrl?: string | null;
  modelAnswerImageUrl?: string | null;
}

interface EssayBankUnitTree {
  unit: string;
  totalQuestions: number;
  lessons: Array<{ lesson: string; count: number }>;
}

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
  unit?: string;
  lesson?: string;
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

  // Sub-section state: "bank" for 1000+ unit/lesson questions, "exams" for formal timed exam papers
  const [mainSection, setMainSection] = useState<"bank" | "exams">("bank");
  const [bankQuestions, setBankQuestions] = useState<EssayBankQuestion[]>([]);
  const [bankTree, setBankTree] = useState<EssayBankUnitTree[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedLesson, setSelectedLesson] = useState<string>("all");
  const [bankSearch, setBankSearch] = useState("");
  const [revealedBankAnswers, setRevealedBankAnswers] = useState<Record<number, boolean>>({});
  const [speakingQuestionId, setSpeakingQuestionId] = useState<number | null>(null);
  const [speakingModelId, setSpeakingModelId] = useState<number | null>(null);
  const [masteredBankIds, setMasteredBankIds] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem("dr_mahmoud_essay_mastered");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleMastered = (id: number) => {
    setMasteredBankIds((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("dr_mahmoud_essay_mastered", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleToggleSpeakPrompt = (qId: number, text: string) => {
    if (speakingQuestionId === qId) {
      stopSpeech();
      setSpeakingQuestionId(null);
    } else {
      stopSpeech();
      setSpeakingModelId(null);
      setSpeakingQuestionId(qId);
      speakEnglishText(text, {
        onEnd: () => setSpeakingQuestionId(null),
      });
    }
  };

  const handleToggleSpeakModel = (qId: number, text: string) => {
    if (speakingModelId === qId) {
      stopSpeech();
      setSpeakingModelId(null);
    } else {
      stopSpeech();
      setSpeakingQuestionId(null);
      setSpeakingModelId(qId);
      speakEnglishText(text, {
        onEnd: () => setSpeakingModelId(null),
      });
    }
  };

  // Active exam state
  const [activeExam, setActiveExam] = useState<EssayExamDetail | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "exam_room" | "model_answer">("list");
  const [loadingExam, setLoadingExam] = useState(false);

  // Student answers in exam room: map of questionId -> { writtenText, attachmentUrl, score }
  const [answers, setAnswers] = useState<Record<string, { writtenText: string; attachmentUrl?: string; score?: number }>>({});
  const [uploadingForQuestion, setUploadingForQuestion] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // Self-assessment state: student scores themselves and reflects on missing details
  const [selfScores, setSelfScores] = useState<Record<string, number>>({});
  const [selfNotes, setSelfNotes] = useState<string>("");
  const [savingSelfScore, setSavingSelfScore] = useState<boolean>(false);
  const [selfAssessedSuccess, setSelfAssessedSuccess] = useState<boolean>(false);
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});

  // Timer state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmittedRef = useRef(false);

  // Image lightbox preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // 1. Load available essay exams
  const loadExams = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/learning/essay-exams", { credentials: "include" });
      if (!res.ok) throw new Error("تعذر تحميل الامتحانات المقالية");
      const data = await res.json();
      setExams(Array.isArray(data) ? data : (data?.exams || []));
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

  // 1.5. Load questions from essay question bank (grouped by units and lessons)
  const loadBank = async () => {
    try {
      setLoadingBank(true);
      const res = await fetch("/api/learning/essay-question-bank/browse", { credentials: "include" });
      if (!res.ok) throw new Error("تعذر تحميل بنك الأسئلة المقالية");
      const data = await res.json();
      if (data.success) {
        setBankQuestions(data.questions || []);
        setBankTree(data.tree || []);
      }
    } catch (err: any) {
      console.error("Bank load error:", err);
    } finally {
      setLoadingBank(false);
    }
  };

  useEffect(() => {
    loadExams();
    loadBank();
  }, []);

  // 2. Open an exam
  const handleOpenExam = async (examId: number, autoStart = false) => {
    try {
      setLoadingExam(true);
      const res = await fetch(`/api/learning/essay-exams/${examId}`, { credentials: "include" });
      if (!res.ok) throw new Error("تعذر جلب تفاصيل الامتحان");
      const rawData = await res.json();
      const examObj = rawData.exam || rawData;
      const subObj = rawData.mySubmission || rawData.submission || examObj.mySubmission || null;
      const examData: EssayExamDetail = {
        ...examObj,
        questions: examObj.questions || rawData.questions || [],
        mySubmission: subObj,
      };
      setActiveExam(examData);

      const submission = examData.mySubmission;

      if (submission?.status === "submitted" || submission?.status === "reviewed") {
        // Preload answers if reviewing
        const map: Record<string, { writtenText: string; attachmentUrl?: string; score?: number }> = {};
        const scores: Record<string, number> = {};
        if (submission.answers) {
          submission.answers.forEach((ans) => {
            map[ans.questionId] = {
              writtenText: ans.writtenText || "",
              attachmentUrl: ans.attachmentUrl,
              score: ans.score,
            };
            if (ans.score !== undefined && ans.score !== null) {
              scores[ans.questionId] = ans.score;
            }
          });
        }
        setAnswers(map);
        setSelfScores(scores);
        if (submission.adminFeedback?.startsWith("تقييم ذاتي:")) {
          setSelfNotes(submission.adminFeedback.replace(/^تقييم ذاتي:\s*/, ""));
        } else if (submission.adminFeedback) {
          setSelfNotes(submission.adminFeedback);
        } else {
          setSelfNotes("");
        }
        setSelfAssessedSuccess(submission.status === "reviewed");
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
          const startSub = startData.submission || {};
          examData.mySubmission = {
            id: startData.submissionId || startSub.id,
            status: "in_progress",
            startedAt: startData.startedAt || startSub.startedAt,
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
        const elapsedSec = Math.max(0, Math.floor((Date.now() - startedTime) / 1000));
        const rem = Math.max(0, durationSec - elapsedSec);

        setElapsedSeconds(elapsedSec);
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

  // 3. Countdown timer effect & elapsed time tracker
  useEffect(() => {
    if (viewMode !== "exam_room") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    autoSubmittedRef.current = false;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
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
      formData.append("photo", file);

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
          attachmentUrl: result.fileUrl || result.url,
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

  // Calculated total self-assessed score
  const totalSelfScore = useMemo(() => {
    return Object.values(selfScores).reduce((sum, s) => sum + (Number(s) || 0), 0);
  }, [selfScores]);

  // Handle Save Student Self Assessment
  const handleSaveSelfAssessment = async () => {
    if (!activeExam) return;
    try {
      setSavingSelfScore(true);
      const res = await fetch(`/api/learning/essay-exams/${activeExam.id}/self-assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          questionScores: selfScores,
          selfNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "تعذر حفظ التقييم الذاتي");
      }

      const result = await res.json();
      setSelfAssessedSuccess(true);
      if (result.submission) {
        setActiveExam((prev) => (prev ? { ...prev, mySubmission: result.submission } : prev));
      }

      toast({
        title: "🎉 تم رصد تقييمك الذاتي بنجاح!",
        description: `تم حفظ درجتك (${result.totalScore ?? totalSelfScore} / ${activeExam.totalPoints}) وملاحظاتك الذاتية للاستفادة منها.`,
      });
      loadExams();
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء حفظ التقييم الذاتي",
        variant: "destructive",
      });
    } finally {
      setSavingSelfScore(false);
    }
  };

  // Helper to append deficiency diagnostic note to self-assessment
  const handleAddDeficiencyTag = (questionNumber: number, tagText: string) => {
    const snippet = `• س${questionNumber}: ${tagText}`;
    setSelfNotes((prev) => {
      if (prev.includes(snippet)) return prev;
      return prev.trim() ? `${prev.trim()}\n${snippet}` : snippet;
    });
    toast({
      title: "تم تسجيل الملاحظة ✍️",
      description: snippet,
    });
  };

  // 15-minute minimum solve period (cooldown) before revealing model answers
  const MIN_COOLDOWN_SECONDS = 15 * 60; // 15 دقيقة
  const cooldownRemainingSeconds = Math.max(0, MIN_COOLDOWN_SECONDS - elapsedSeconds);
  const isCooldownOver = cooldownRemainingSeconds <= 0 || remainingSeconds <= 0;

  // 6. Submit exam
  const handleSubmitExam = async (skipValidation = false) => {
    if (!activeExam) return;

    // التحقق من انقضاء مدة الـ 15 دقيقة المقررة للحل الورقي
    if (!isCooldownOver && !skipValidation) {
      const remMins = Math.ceil(cooldownRemainingSeconds / 60);
      toast({
        title: "⏳ يرجى قضاء 15 دقيقة في الحل الورقي أولاً",
        description: `متبقي ${remMins} دقيقة لتفعيل زر عرض الحل النموذجي (${formatTimer(cooldownRemainingSeconds)}). استغل هذا الوقت في حل الأسئلة في كشكولك أو ورقتك الخارجية بتركيز.`,
        variant: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        writtenText: ans.writtenText || "",
        attachmentUrl: ans.attachmentUrl || null,
      }));

      const totalDurationSec = (activeExam.durationMinutes || 60) * 60;
      const timeSpent = Math.max(elapsedSeconds, Math.max(1, totalDurationSec - remainingSeconds));

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

      // Initialize self-scores to 0 for each question
      const initialScores: Record<string, number> = {};
      (result.modelAnswers || activeExam.questions).forEach((q: EssayQuestion) => {
        initialScores[q.id] = 0;
      });
      setSelfScores(initialScores);

      setConfirmSubmitOpen(false);
      setViewMode("model_answer");

      toast({
        title: "🎉 تم تسليم الامتحان بنجاح!",
        description: "ظهر لك الآن الحل النموذجي المعتمد. يمكنك البدء في تقييم نفسك ومقارنة إجابتك.",
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

  // Always call the latest handleSubmitExam (the timer interval captures stale state otherwise)
  const submitExamRef = useRef(handleSubmitExam);
  submitExamRef.current = handleSubmitExam;

  const handleAutoSubmitOnExpiry = () => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    toast({
      title: "⏰ انتهى وقت الامتحان المحدد!",
      description: "جاري تسليم إجاباتك وعرض الحل النموذجي المعتمد...",
      variant: "warning",
    });
    // Defer out of the setState updater so it isn't run as a side effect of rendering
    setTimeout(() => submitExamRef.current(true), 0);
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

  // Lessons available for the selected unit
  const availableLessons = useMemo(() => {
    if (selectedUnit === "all") {
      const set = new Set<string>();
      bankTree.forEach((u) => u.lessons.forEach((l) => set.add(l.lesson)));
      return Array.from(set);
    }
    const unitObj = bankTree.find((u) => u.unit === selectedUnit);
    return unitObj ? unitObj.lessons.map((l) => l.lesson) : [];
  }, [bankTree, selectedUnit]);

  // Filtered essay bank questions
  const filteredBankQuestions = useMemo(() => {
    return bankQuestions.filter((q) => {
      const matchUnit = selectedUnit === "all" || q.unit === selectedUnit;
      const matchLesson = selectedLesson === "all" || q.lesson === selectedLesson;
      const qLower = bankSearch.toLowerCase().trim();
      const matchSearch =
        !qLower ||
        q.prompt.toLowerCase().includes(qLower) ||
        q.modelAnswer.toLowerCase().includes(qLower) ||
        (q.explanation && q.explanation.toLowerCase().includes(qLower));
      return matchUnit && matchLesson && matchSearch;
    });
  }, [bankQuestions, selectedUnit, selectedLesson, bankSearch]);

  // ─────────────────────────────────────────────────────────────
  // VIEW 1: EXAMS LIST
  // ─────────────────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <div className="space-y-6" dir="rtl">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-blue-600 p-6 sm:p-8 text-white shadow-xl dark:border-blue-900/40">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>نظام الأسئلة والامتحانات المقالية ✍️</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              الأسئلة والواجبات المقالية المعتمدة
            </h1>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              تدرّب على صياغة الحلول التحريرية وكتابة الأكواد وتتبع المفاهيم العلمية. كل سؤال مقالي مزود بالحل النموذجي وعناصر التصحيح والترجمة الصوتية لتقيّم نفسك وتتقن الإجابة بنسبة 100%.
            </p>
          </div>
          <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-sky-400/20 blur-2xl" />
        </div>

        {/* View Switcher: Bank (By Unit/Lesson) vs Formal Timed Exam Papers */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setMainSection("bank")}
            className={`flex-1 min-w-[220px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              mainSection === "bank"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BookOpen className="h-4 w-4 text-blue-600" />
            <span>بنك الأسئلة المقالية للدروس والوحدات</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
              {bankQuestions.length} سؤال
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainSection("exams")}
            className={`flex-1 min-w-[220px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              mainSection === "exams"
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className="h-4 w-4 text-amber-500" />
            <span>نماذج الامتحانات المقالية التحريرية</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {exams.length} نماذج
            </span>
          </button>
        </div>

        {/* ─────────────── SECTION A: ESSAY QUESTION BANK BY UNIT & LESSON ─────────────── */}
        {mainSection === "bank" ? (
          <div className="space-y-6">
            {/* 1. Units Taxonomy Pills */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                  الوحدات الدراسية المتاحة:
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  إجمالي الأسئلة: <span className="font-mono text-blue-600 font-bold">{bankQuestions.length}</span> سؤال مقالي
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUnit("all");
                    setSelectedLesson("all");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedUnit === "all"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                  }`}
                >
                  كافة الوحدات ({bankQuestions.length})
                </button>
                {bankTree.map((u) => (
                  <button
                    key={u.unit}
                    type="button"
                    onClick={() => {
                      setSelectedUnit(u.unit);
                      setSelectedLesson("all");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedUnit === u.unit
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                    }`}
                  >
                    {u.unit} ({u.totalQuestions})
                  </button>
                ))}
              </div>

              {/* 2. Lessons Pills */}
              {availableLessons.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                    دروس الوحدة:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedLesson("all")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        selectedLesson === "all"
                          ? "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                      }`}
                    >
                      كل دروس الوحدة
                    </button>
                    {availableLessons.map((les) => (
                      <button
                        key={les}
                        type="button"
                        onClick={() => setSelectedLesson(les)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          selectedLesson === les
                            ? "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                        }`}
                      >
                        {les}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Search and stats bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="ابحث في نص الأسئلة المقالية أو المفاهيم..."
                  className="w-full rounded-2xl border border-border bg-card pr-10 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                  معروض: <span className="font-mono text-blue-600 font-bold">{filteredBankQuestions.length}</span> سؤال
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadBank}
                  disabled={loadingBank}
                  className="rounded-xl gap-1.5 text-xs font-bold cursor-pointer"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${loadingBank ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </div>
            </div>

            {/* 4. Questions List */}
            {loadingBank ? (
              <div className="grid place-items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="mt-3 text-xs font-semibold text-muted-foreground">جاري تحميل أسئلة بنك المقالي...</span>
              </div>
            ) : filteredBankQuestions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center space-y-2">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
                <h3 className="text-sm font-bold text-foreground">لا توجد أسئلة مقالية مطابقة للفلتر المحدد</h3>
                <p className="text-xs text-muted-foreground">جرب اختيار وحدة أخرى أو مسح كلمات البحث.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBankQuestions.map((q, idx) => {
                  const isPromptEng = isPrimarilyEnglish(q.prompt);
                  const promptParts = splitModelAnswerTranslation(q.prompt);
                  const isRevealed = Boolean(revealedBankAnswers[q.id]);
                  const isMastered = Boolean(masteredBankIds[q.id]);
                  const { main: modelMain, translation: modelTrans } = splitModelAnswerTranslation(q.modelAnswer);
                  const isModelEng = isPrimarilyEnglish(modelMain);
                  const expParts = q.explanation ? splitModelAnswerTranslation(q.explanation) : null;
                  const isExpEng = expParts ? isPrimarilyEnglish(expParts.main) : false;

                  const difficultyLabel =
                    q.difficulty === "easy" ? "سهل" : q.difficulty === "hard" ? "صعب" : "متوسط";
                  const difficultyClass =
                    q.difficulty === "easy"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                      : q.difficulty === "hard"
                      ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200"
                      : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200";

                  return (
                    <article
                      key={q.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:border-blue-400/50"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            سؤال مقالي #{idx + 1}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${difficultyClass}`}>
                            {difficultyLabel}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {q.points} درجات
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md truncate max-w-[220px]">
                            {q.unit}
                          </span>
                        </div>

                        {/* Mastered Pill */}
                        <button
                          type="button"
                          onClick={() => toggleMastered(q.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            isMastered
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <CheckCircle2 className={`h-3.5 w-3.5 ${isMastered ? "text-emerald-600" : "text-slate-400"}`} />
                          {isMastered ? "أتقنت السؤال ✓" : "تحديد كمتقن"}
                        </button>
                      </div>

                      {/* Question Prompt */}
                      <div className="space-y-2">
                        <div
                          dir={isPromptEng ? "ltr" : "rtl"}
                          className={`text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line ${
                            isPromptEng ? "text-left font-sans" : "text-right"
                          }`}
                        >
                          <BidiStatement text={promptParts.main} />
                        </div>

                        {/* English Prompt Audio pronunciation */}
                        {isPromptEng && isSpeechSupported() && (
                          <div className="flex items-center gap-2 pt-1" dir="ltr">
                            <button
                              type="button"
                              onClick={() => handleToggleSpeakPrompt(q.id, promptParts.main)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/80 cursor-pointer"
                            >
                              {speakingQuestionId === q.id ? (
                                <>
                                  <VolumeX className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                                  <span>إيقاف الصوت</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-3.5 w-3.5 text-blue-600" />
                                  <span>استماع لنطق السؤال 🔊</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Arabic Prompt Translation */}
                        {(q.translation || promptParts.translation) && (
                          <div
                            dir="rtl"
                            className="rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-2.5 text-xs text-blue-800 dark:text-blue-300 text-right leading-relaxed"
                          >
                            <strong className="block text-[11px] font-black text-blue-700 dark:text-blue-300 mb-0.5">
                              🌐 ترجمة السؤال:
                            </strong>
                            <BidiStatement text={q.translation || promptParts.translation || ""} />
                          </div>
                        )}

                        {/* Optional Question Image */}
                        {q.imageUrl && (
                          <div className="pt-2">
                            <img
                              src={q.imageUrl}
                              alt="توضيح السؤال"
                              className="max-h-72 rounded-xl border border-slate-200 dark:border-slate-800 object-contain cursor-pointer hover:opacity-90"
                              onClick={() => setPreviewImageUrl(q.imageUrl || null)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setRevealedBankAnswers((prev) => ({
                              ...prev,
                              [q.id]: !isRevealed,
                            }))
                          }
                          className="rounded-xl text-xs font-black gap-1.5 cursor-pointer"
                        >
                          {isRevealed ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" /> إخفاء الحل النموذجي
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5 text-blue-600" /> عرض الإجابة النموذجية وملاحظات التصحيح 💡
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Model Answer & Evaluation Box */}
                      {isRevealed && (
                        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 sm:p-5 space-y-3.5 animate-in fade-in">
                          <div className="flex items-center justify-between gap-2" dir="rtl">
                            <strong className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ✓ الإجابة النموذجية المعتمدة:
                            </strong>
                            {isModelEng && isSpeechSupported() && (
                              <button
                                type="button"
                                onClick={() => handleToggleSpeakModel(q.id, modelMain)}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-100/70 dark:bg-emerald-900/50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200/80 cursor-pointer"
                              >
                                {speakingModelId === q.id ? (
                                  <>
                                    <VolumeX className="h-3 w-3 text-rose-500" /> إيقاف
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-3 w-3" /> استماع للإجابة
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Main Model Answer */}
                          <div
                            dir={isModelEng ? "ltr" : "rtl"}
                            className={`whitespace-pre-line text-xs sm:text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200 ${
                              isModelEng ? "text-left font-sans" : "text-right"
                            }`}
                          >
                            <BidiStatement text={modelMain} />
                          </div>

                          {/* Arabic Translation of Model Answer */}
                          {modelTrans && (
                            <div
                              dir="rtl"
                              className="rounded-xl border border-emerald-300/80 dark:border-emerald-800/60 bg-emerald-100/50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-900 dark:text-emerald-200 text-right whitespace-pre-line font-medium leading-relaxed"
                            >
                              <strong className="block text-[11px] font-black text-emerald-800 dark:text-emerald-300 mb-0.5">
                                🌐 الترجمة العربية للإجابة النموذجية:
                              </strong>
                              <BidiStatement text={modelTrans} />
                            </div>
                          )}

                          {/* Optional Model Answer Image */}
                          {q.modelAnswerImageUrl && (
                            <div className="pt-2">
                              <img
                                src={q.modelAnswerImageUrl}
                                alt="مخطط الإجابة النموذجية"
                                className="max-h-72 rounded-xl border border-emerald-200 dark:border-emerald-800 object-contain cursor-pointer"
                                onClick={() => setPreviewImageUrl(q.modelAnswerImageUrl || null)}
                              />
                            </div>
                          )}

                          {/* Correction Notes / Rubric */}
                          {expParts && (
                            <div className="pt-3 border-t border-emerald-200/80 dark:border-emerald-800/60 text-xs space-y-1.5">
                              <strong className="block font-black text-amber-800 dark:text-amber-300 text-right" dir="rtl">
                                💡 ملاحظات التصحيح وعناصر التقييم:
                              </strong>
                              <div
                                dir={isExpEng ? "ltr" : "rtl"}
                                className={`whitespace-pre-line text-slate-700 dark:text-slate-300 font-medium ${
                                  isExpEng ? "text-left font-sans" : "text-right"
                                }`}
                              >
                                <BidiStatement text={expParts.main} />
                              </div>
                              {expParts.translation && (
                                <p dir="rtl" className="mt-1 text-right text-emerald-800 dark:text-emerald-300 font-semibold">
                                  🌐 {expParts.translation}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Self Reflection */}
                          <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500">
                              تقييمك الذاتي لفهمك للسؤال:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleMastered(q.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                              >
                                فهمت السؤال بالكامل ✓
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ─────────────── SECTION B: FORMAL TIMED EXAM PAPERS ─────────────── */
          <div className="space-y-4">
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
              <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center space-y-2">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <FileEdit className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">لا توجد نماذج امتحانات مقالية منشورة حالياً</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  يمكنك الاستفادة فوراً من <strong>بنك الأسئلة المقالية للدروس والوحدات</strong> في التاب أعلاه حيث يحتوي على كافة أسئلة المنهج التحريرية!
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => setMainSection("bank")}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    الانتقال لبنك الأسئلة المقالية للدروس ({bankQuestions.length} سؤال) 📚
                  </Button>
                </div>
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
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 text-xs font-bold">
                              <FileEdit className="h-3.5 w-3.5" />
                              {exam.stage || "منهج البكالوريا"}
                            </span>
                            {exam.unit && (
                              <span className="inline-flex items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 text-[11px] font-semibold" title={exam.unit}>
                                {exam.unit.length > 18 ? exam.unit.slice(0, 18) + "..." : exam.unit}
                              </span>
                            )}
                            {exam.lesson && (
                              <span className="inline-flex items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 text-[11px] font-semibold" title={exam.lesson}>
                                {exam.lesson.length > 18 ? exam.lesson.slice(0, 18) + "..." : exam.lesson}
                              </span>
                            )}
                          </div>
                          {isReviewed ? (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 px-2.5 py-1 text-xs font-extrabold border border-purple-500/20 shrink-0 font-mono tabular-nums">
                              <Sparkles className="h-3.5 w-3.5" />
                              تقييمك: {sub.adminScore} / {exam.totalPoints}
                            </span>
                          ) : isSubmitted ? (
                            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-bold shrink-0">
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
                            <span className="font-mono tabular-nums">{exam.durationMinutes || 60} دقيقة</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-2 text-muted-foreground font-medium">
                            <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="font-mono tabular-nums">{exam.totalPoints} درجة</span>
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
                            <Eye className="h-4 w-4" />
                            عرض الحل النموذجي والتقييم 🔍
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
        <div className="sticky top-14 z-30 -mx-4 sm:-mx-6 -mt-6 px-4 sm:px-6 py-3 bg-white/90 dark:bg-[#070D18]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-[#1E2E48] shadow-xs flex flex-wrap items-center justify-between gap-3 relative">
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
                الأسئلة: {activeExam.questions.length} أسئلة • نظام الحل الورقي الذاتي 📝
              </span>
            </div>
          </div>

          {/* Countdown Clock Display & Cooldown Status */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Exam remaining time */}
            <div
              className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 border font-mono text-xs font-extrabold shadow-xs transition-colors ${
                isWarning
                  ? "bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-400 animate-pulse"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
              }`}
              title="الوقت الكلي المتبقي للامتحان"
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{formatTimer(remainingSeconds)}</span>
              {isWarning && <span className="text-[10px] font-sans font-bold">باقي أقل من 5 دقائق!</span>}
            </div>

            {/* 15-Minute Cooldown Status Badge */}
            {!isCooldownOver ? (
              <div className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-xs font-bold shadow-xs">
                <Clock className="h-3.5 w-3.5 animate-spin text-amber-600" />
                <span>فتح الإجابة بعد: {formatTimer(cooldownRemainingSeconds)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>متاح عرض الإجابة الآن ✅</span>
              </div>
            )}

            <Button
              onClick={() => {
                if (!isCooldownOver) {
                  toast({
                    title: "⏳ متبقي وقت للحل الورقي أولاً",
                    description: `يُرجى قضاء 15 دقيقة في حل الأسئلة في ورقتك أولاً. متبقي ${Math.ceil(cooldownRemainingSeconds / 60)} دقيقة لفتح الإجابة النموذجية (${formatTimer(cooldownRemainingSeconds)}).`,
                    variant: "warning",
                  });
                  return;
                }
                setConfirmSubmitOpen(true);
              }}
              disabled={submitting}
              className={`rounded-xl text-xs font-bold gap-1.5 shadow-xs transition-all ${
                isCooldownOver
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              {isCooldownOver ? "إنهاء ومقارنة بالحل النموذجي 🚀" : `متاح بعد (${formatTimer(cooldownRemainingSeconds)})`}
            </Button>
          </div>
        </div>

        {/* Paper Solving Instructions Banner */}
        <div className="rounded-3xl border border-blue-400/30 bg-blue-500/10 p-5 flex items-start gap-3.5 text-xs text-foreground shadow-xs">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600/15 text-blue-600 dark:text-blue-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 leading-relaxed flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm font-extrabold text-blue-700 dark:text-blue-300">
                📝 نظام الامتحان المقالي الورقي والتقييم الذاتي:
              </strong>
              <span className="rounded-full bg-blue-500/15 border border-blue-500/20 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                بدون رفع ملفات أو تصحيح يدوي معقد
              </span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                <strong className="text-foreground">ابدأ الحل الآن:</strong> اقرأ الأسئلة وحلها بالكامل في كشكولك أو ورقتك الخارجية بقلمك.
              </li>
              <li>
                <strong className="text-foreground">لا يُشترط رفع صور أو كتابة إجابات:</strong> تم إعفاؤك من كتابة النصوص الطويلة أو تصوير الأوراق.
              </li>
              <li>
                <strong className="text-foreground">فتح الإجابات بعد 15 دقيقة:</strong> لضمان تركيزك وجدية محاولتك، سيتم تفعيل زر <span className="text-emerald-600 dark:text-emerald-400 font-bold">«إنهاء ومقارنة بالحل النموذجي»</span> تلقائياً بعد مرور 15 دقيقة لتطلع على الحل الرسمي وسلم الدرجات وتحدد مستواك بنفسك.
              </li>
            </ul>
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-foreground">
                        مسودة أو ملاحظات إلكترونية:
                      </label>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        (اختياري - يمكنك الاكتفاء بالحل في كشكولك الورقي)
                      </span>
                    </div>
                    <textarea
                      value={currentAnswer.writtenText}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      placeholder="خانة مسودة اختيارية لكتابة ملاحظاتك أو كودك... (يمكنك حل السؤال بالكامل في كشكولك فقط)"
                      rows={3}
                      className="w-full rounded-2xl border border-border bg-background p-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs leading-relaxed resize-y"
                    />
                  </div>

                  {/* Handwritten paper upload (code tracing / diagrams) */}
                  {activeExam.allowImageUpload && (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <ImageIcon className="h-4 w-4 text-primary" />
                          <span>توثيق صورة ورقة الحل بالكاميرا (اختياري تماماً - لتوثيق حلك إن رغبت):</span>
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
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-center sm:text-right">
              {!isCooldownOver ? (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                  <Clock className="h-4 w-4 shrink-0 animate-spin" />
                  <span>
                    فترة الحل الورقي الذاتي: متبقي ({formatTimer(cooldownRemainingSeconds)}) لفتح زر الإجابة النموذجية
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    انقضت فترة الـ 15 دقيقة! يمكنك الآن تسليم الاختبار والاطلاع على الإجابة النموذجية
                  </span>
                </div>
              )}
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                حل في كشكولك بدون الحاجة لرفع ملفات أو كتابة نصوص إجبارية
              </span>
            </div>

            <Button
              size="lg"
              onClick={() => {
                if (!isCooldownOver) {
                  const remMin = Math.ceil(cooldownRemainingSeconds / 60);
                  toast({
                    title: "⏳ متبقي وقت للحل الورقي أولاً",
                    description: `يرجى قضاء 15 دقيقة على الأقل في المحاولة الورقية أولاً. متبقي ${remMin} دقيقة (${formatTimer(cooldownRemainingSeconds)}).`,
                    variant: "warning",
                  });
                  return;
                }
                setConfirmSubmitOpen(true);
              }}
              disabled={submitting}
              className={`rounded-2xl font-extrabold gap-2 px-6 shadow-md transition-all w-full sm:w-auto ${
                isCooldownOver
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/90 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري التسليم...</span>
                </>
              ) : isCooldownOver ? (
                <>
                  <Send className="h-4 w-4" />
                  <span>إنهاء ومقارنة إجابتي بالحل النموذجي 🚀</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  <span>متاح بعد ({formatTimer(cooldownRemainingSeconds)})</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmSubmitOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-foreground">تأكيد إنهاء الاختبار المقالي</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  هل انتهيت من محاولة حل جميع الأسئلة في كشكولك أو ورقتك الخارجية؟
                  <br />
                  بمجرد النقر على <strong className="text-foreground">«تأكيد وعرض الحل النموذجي»</strong>، سيتم إنهاء وقت الاختبار فوراً وفتح الإجابة النموذجية المعتمدة وسلم الدرجات والشرح الكامل لمقارنة ما كتبته وتقييم نفسك.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmSubmitOpen(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs font-bold"
                >
                  العودة للاختبار
                </Button>
                <Button
                  onClick={() => handleSubmitExam()}
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  تأكيد وعرض الحل النموذجي 🚀
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
    const isReviewed = sub?.status === "reviewed" || selfAssessedSuccess;
    const percentScore = activeExam.totalPoints > 0 ? Math.round((totalSelfScore / activeExam.totalPoints) * 100) : 0;

    return (
      <div className="space-y-6 pb-28" dir="rtl">
        {/* Navigation & Hierarchy Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-xl gap-2 text-xs font-bold"
          >
            <ChevronRight className="h-4 w-4" />
            الرجوع لقائمة الامتحانات المقالية
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {activeExam.stage && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
                <BookOpen className="h-3.5 w-3.5" />
                {activeExam.stage}
              </span>
            )}
            {activeExam.unit && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Layers className="h-3.5 w-3.5" />
                {activeExam.unit}
              </span>
            )}
            {activeExam.lesson && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-bold text-purple-600 dark:text-purple-400">
                <FileText className="h-3.5 w-3.5" />
                {activeExam.lesson}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              تم التسليم بنجاح
            </span>
          </div>
        </div>

        {/* Hero Banner: Self-Assessment Control Center */}
        <div className="rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-bold text-emerald-300 backdrop-blur-md">
                <Target className="h-4 w-4 text-emerald-300 animate-pulse" />
                <span>لوحة التقييم الذاتي ومقارنة الحل النموذجي</span>
              </div>

              {isReviewed && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/30 border border-emerald-400/40 px-3 py-1 text-xs font-black text-emerald-200">
                  <CheckCheck className="h-4 w-4 text-emerald-300" />
                  تم اعتماد تقييمك الذاتي
                </span>
              )}
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {activeExam.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-3xl">
                بناءً على نظام المنصة: يمكنك الآن مقارنة إجابتك التحريرية والبرمجية بالحل النموذجي وخطوات التتبع والشرح المعتمد، ثم رصد درجتك المستحقة لكل سؤال وتدوين ما كان ينقصك في الملاحظات لاعتماد تقييمك الذاتي.
              </p>
            </div>

            {/* Score & Reflection Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
              {/* Score Display Card (4 cols) */}
              <div className="lg:col-span-4 rounded-2xl bg-white/10 dark:bg-black/30 border border-white/15 p-5 flex flex-col justify-between backdrop-blur-md space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Award className="h-4 w-4" />
                    مجموع درجتك المرصودة ذاتياً:
                  </span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl sm:text-4xl font-black text-white">
                      {totalSelfScore}
                    </span>
                    <span className="text-sm font-bold text-slate-300">
                      / {activeExam.totalPoints} درجة
                    </span>
                    <span className="mr-auto inline-flex items-center rounded-xl bg-emerald-500/25 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-black text-emerald-200">
                      {percentScore}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, percentScore))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-300 font-semibold">
                    <span>
                      {percentScore >= 90
                        ? "🌟 إتقان ممتاز"
                        : percentScore >= 75
                        ? "👏 مستوى متميز وجيد جداً"
                        : percentScore >= 50
                        ? "👍 متوسط - راجع النواقص"
                        : "⚠️ يحتاج مراجعة وتثبيت"}
                    </span>
                    <span>{percentScore}% إنجاز</span>
                  </div>
                </div>
              </div>

              {/* Self Reflection & Action Card (8 cols) */}
              <div className="lg:col-span-8 rounded-2xl bg-white/10 dark:bg-black/30 border border-white/15 p-5 backdrop-blur-md flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <FileEdit className="h-4 w-4" />
                    ملاحظاتك الذاتية ومواطن النقص المستفادة (سجل ما تعلمته وما كان ينقصك):
                  </label>
                  <textarea
                    rows={3}
                    value={selfNotes}
                    onChange={(e) => setSelfNotes(e.target.value)}
                    placeholder="سجل ملاحظاتك هنا: مثلاً (نسيت شرط التوقف في دالة التكرار، أو خطأ في نوع المتغير، أو نقص في تتبع خطوات المصفوفة...)"
                    className="w-full rounded-xl bg-black/30 border border-white/20 p-3 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-slate-300">
                    💡 يمكنك النقر على أوسمة التشخيص أسفل كل سؤال لإضافتها تلقائياً إلى ملاحظاتك.
                  </span>
                  <Button
                    onClick={handleSaveSelfAssessment}
                    disabled={savingSelfScore}
                    className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs gap-2 px-5 py-2 shadow-lg"
                  >
                    {savingSelfScore ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isReviewed ? "تحديث واعتماد تقييمي الذاتي 🏆" : "حفظ واعتماد تقييمي الذاتي 🏆"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute left-0 bottom-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* Questions comparison list */}
        <div className="space-y-8">
          {activeExam.questions.map((q, idx) => {
            const studentAns = answers[q.id];
            const currentScore = selfScores[q.id] ?? (studentAns?.score ?? 0);

            // Point buttons generator
            const pointOptions = Array.from({ length: q.points + 1 }, (_, i) => i);

            return (
              <div
                key={q.id}
                className="rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-6"
              >
                {/* Question Title & Points Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary text-white text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      السؤال رقم ({idx + 1})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground border border-border">
                      الدرجة الكاملة: {q.points} درجات
                    </span>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                      تقييمك: {currentScore} / {q.points}
                    </span>
                  </div>
                </div>

                {/* Prompt */}
                <div className="space-y-3">
                  <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed select-text font-mono">
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

                {/* Side-by-Side Comparison: Student's Answer vs Model Answer */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Student's Answer */}
                  <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                        <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-blue-500" />
                          إجابتك التحريرية التي سلمتها:
                        </span>
                      </div>

                      {studentAns?.writtenText ? (
                        <div className="text-xs sm:text-sm text-foreground whitespace-pre-wrap bg-card rounded-xl p-3.5 border border-border/60 leading-relaxed font-mono select-text">
                          {studentAns.writtenText}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground block p-3 bg-card rounded-xl border border-border/40">
                          📝 حل ورقي في كشكولك الخارجي — قارن ما كتبته في ورقتك بالحل النموذجي المقابل.
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
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white text-xs font-bold gap-1">
                              <Eye className="h-4 w-4" />
                              <span>انقر لتكبير ورقة إجابتك</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Model Answer */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          الحل النموذجي والمثالي المعتمد:
                        </span>
                      </div>

                      {q.modelAnswer ? (
                        <div className="text-xs sm:text-sm text-foreground font-mono leading-relaxed whitespace-pre-wrap bg-white dark:bg-[#0E1626] rounded-xl p-3.5 border border-emerald-500/25 shadow-2xs select-text">
                          {q.modelAnswer}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          الحل النموذجي قيد التحديث
                        </span>
                      )}

                      {/* Model Answer Image */}
                      {q.modelAnswerImageUrl && (
                        <div className="pt-2">
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block mb-1.5">
                            رسمة / ورقة الحل النموذجية التوضيحية:
                          </span>
                          <div
                            className="rounded-2xl overflow-hidden border border-emerald-500/30 bg-card max-w-sm cursor-pointer hover:opacity-95"
                            onClick={() => setPreviewImageUrl(q.modelAnswerImageUrl!)}
                          >
                            <img
                              src={q.modelAnswerImageUrl}
                              alt="صورة الحل النموذجي"
                              className="w-full max-h-64 object-contain"
                            />
                          </div>
                        </div>
                      )}

                      {/* Step Explanation / Grading breakdown */}
                      {q.explanation && (() => {
                        const expParts = splitModelAnswerTranslation(q.explanation);
                        const isExpEng = isPrimarilyEnglish(expParts.main);
                        return (
                          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                            <span className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                              <Sparkles className="h-3.5 w-3.5" />
                              توزيع الدرجات وخطوات التتبع:
                            </span>
                            <div
                              dir={isExpEng ? "ltr" : "rtl"}
                              className={`leading-relaxed whitespace-pre-wrap font-medium ${isExpEng ? "text-left font-sans" : "text-right"}`}
                            >
                              <BidiStatement text={expParts.main} />
                            </div>
                            {expParts.translation && (
                              <div dir="rtl" className="pt-2 border-t border-amber-500/20 text-right text-emerald-800 dark:text-emerald-300">
                                <strong className="block text-[11px] font-black text-emerald-700 dark:text-emerald-300 mb-0.5">
                                  🌐 الترجمة العربية:
                                </strong>
                                <BidiStatement text={expParts.translation} />
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Interactive Self-Scoring & Deficiency Diagnostics */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      كم درجة تستحق على هذا السؤال مقارنة بالحل النموذجي أعلاه؟
                    </span>
                    <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-xl">
                      اختر درجتك: ({currentScore} من {q.points})
                    </span>
                  </div>

                  {/* Quick score buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {pointOptions.map((pts) => {
                      const isSelected = currentScore === pts;
                      return (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => {
                            setSelfScores((prev) => ({ ...prev, [q.id]: pts }));
                          }}
                          className={`h-9 min-w-9 px-3 rounded-xl text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-md scale-105"
                              : "bg-background border border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          {pts === 0 ? "0 (صفر)" : pts === q.points ? `${pts} (كاملة)` : pts}
                        </button>
                      );
                    })}
                  </div>

                  {/* Deficiency Diagnostic Quick Tags */}
                  <div className="pt-2 border-t border-primary/10 space-y-2">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      انقر لتشخيص النواقص وتسجيلها في ملاحظاتك تلقائياً:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "🌟 إجابة نموذجية كاملة", text: "إجابة نموذجية مطابقة تماماً" },
                        { label: "⚠️ نقص في خطوات الخوارزمية والتتبع", text: "نقص في تتبع المتغيرات أو خطوات الخوارزمية" },
                        { label: "⚠️ خطأ في الشروط المنطقية أو الصياغة", text: "خطأ في الشرط المنطقي أو صياغة الأكواد" },
                        { label: "❌ الناتج النهائي غير صحيح", text: "الناتج النهائي غير مطابق للحل النموذجي" },
                        { label: "💡 سوء فهم لمطلوب السؤال", text: "سوء فهم لمطلوب المسألة" },
                      ].map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => handleAddDeficiencyTag(idx + 1, chip.text)}
                          className="rounded-lg bg-background/80 hover:bg-background border border-border/80 px-2.5 py-1 text-[11px] font-medium text-foreground transition-all hover:border-primary/50"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Bottom Action Bar */}
        <div className="sticky bottom-4 z-40 rounded-2xl border border-emerald-500/30 bg-card/95 backdrop-blur-md p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-bold">الدرجة المرصودة ذاتياً:</span>
              <span className="text-lg font-black text-foreground">
                {totalSelfScore} <span className="text-xs text-muted-foreground">/ {activeExam.totalPoints}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-xl text-xs font-bold"
            >
              العودة للقائمة
            </Button>
            <Button
              onClick={handleSaveSelfAssessment}
              disabled={savingSelfScore}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black gap-2 px-6 shadow-md"
            >
              {savingSelfScore ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isReviewed ? "تحديث واعتماد التقييم 🏆" : "حفظ واعتماد التقييم الذاتي 🏆"}
            </Button>
          </div>
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
