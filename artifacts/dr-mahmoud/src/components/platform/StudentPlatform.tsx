import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock,
  FileText,
  FolderOpen,
  Home,
  Loader2,
  LogOut,
  Play,
  ShieldCheck,
  Trophy,
  User,
  UserPlus,
  Menu,
  X,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  AlertCircle,
  Code2,
  Maximize2,
  ExternalLink,
  ArrowLeft,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoLessonsSection } from "@/components/YoutubeSection";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getTrack, getTrackForStage } from "@/data/academic";
import {
  RegistrationStageSelector,
  createDefaultRegistrationStage,
} from "@/components/ui/RegistrationStageSelector";
import { EmptyState, PageHeader, ProfileInfoRow, StatisticCard, StatusBadge, StudentAvatar } from "./StudentDashboardUI";
import { CppCompilerPanel } from "./CppCompilerPanel";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useWebPush } from "@/hooks/use-web-push";
import { ProfileTab } from "./tabs/ProfileTab";
import { FilesTab } from "./tabs/FilesTab";
import { QuizzesTab } from "./tabs/QuizzesTab";
import { DashboardTab } from "./tabs/DashboardTab";
import { AccessScreen } from "./tabs/AccessScreen";
import { StudentSummariesTab } from "./tabs/StudentSummariesTab";
import { IncompleteProfileModal } from "./tabs/IncompleteProfileModal";
import { SelfAssessmentTab } from "./tabs/SelfAssessmentTab";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FilePreviewModal } from "./FilePreviewModal";

import type {
  Student,
  LearningFile,
  QuizQuestion,
  Quiz,
  VideoSummary,
  ProgressRow,
  StudentNotification,
} from "@/types/platform";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(deviceId ? { "X-Device-Id": deviceId } : {}),
      ...(options?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر إتمام الطلب");
  return data as T;
}

const isEnglishQuestion = (prompt?: string, options?: string[]): boolean => {
  const allText = ((prompt || "") + " " + (options || []).join(" ")).trim();
  const arabicMatches = allText.match(/[\u0600-\u06FF]/g) || [];
  const latinMatches = allText.match(/[a-zA-Z]/g) || [];
  return latinMatches.length > arabicMatches.length;
};

const getOptionLetter = (index: number, isEng: boolean): string => {
  if (isEng) {
    return ["A", "B", "C", "D", "E", "F"][index] || String.fromCharCode(65 + index);
  }
  return ["أ", "ب", "ج", "د", "هـ", "و"][index] || String(index + 1);
};

function normalizeQuestionPrompt(p?: string | null): string {
  if (!p) return "";
  return p
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[؟?.,!،:;ـ_—\-\(\)\[\]\{\}«»"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function AppFilePreviewModal({ file, onClose }: { file: LearningFile | null; onClose: () => void }) {
  return <FilePreviewModal file={file} onClose={onClose} />;
}






async function cropAvatar(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 640;
  canvas.getContext("2d")?.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 640, 640);
  image.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("تعذر تجهيز الصورة")), "image/webp", .88));
}


export function getNotificationTarget(notification: { title: string; message: string; type?: string | null }): {
  tab: "dashboard" | "lessons" | "summaries" | "compiler" | "files" | "quizzes" | "self-assessment" | "profile" | "external";
  label: string;
  url?: string;
} {
  const type = (notification.type || "").toLowerCase();
  const titleMsg = (notification.title + " " + notification.message).toLowerCase();

  // 1. Direct external links
  const urlMatch = notification.message.match(/https?:\/\/[^\s]+/) || notification.title.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    return { tab: "external", label: "رابط خارجي 🔗", url: urlMatch[0] };
  }

  // 2. Honor Board
  if (
    titleMsg.includes("لوحة الشرف") ||
    titleMsg.includes("شرف") ||
    titleMsg.includes("أوائل") ||
    titleMsg.includes("متفوق") ||
    titleMsg.includes("تكريم")
  ) {
    return { tab: "external", label: "لوحة الشرف 🏆", url: "/honor-board" };
  }

  // 3. Self-Assessment (باقات التقييم والتدريب الذاتي)
  if (
    type === "self-assessment" ||
    type === "self_assessment" ||
    type === "assessment" ||
    titleMsg.includes("تقييم") ||
    titleMsg.includes("باقة") ||
    titleMsg.includes("بنك") ||
    titleMsg.includes("اسئلة") ||
    titleMsg.includes("أسئلة")
  ) {
    return { tab: "self-assessment", label: "التقييم الذاتي 🎯" };
  }

  // 4. Quizzes & Exams (امتحانات واختبارات)
  if (
    type === "quiz" ||
    type === "exam" ||
    type === "test" ||
    titleMsg.includes("امتحان") ||
    titleMsg.includes("اختبار") ||
    titleMsg.includes("كويز") ||
    titleMsg.includes("واجب") ||
    titleMsg.includes("درجة") ||
    titleMsg.includes("درجات") ||
    titleMsg.includes("سؤال") ||
    titleMsg.includes("نتيجة")
  ) {
    return { tab: "quizzes", label: "الاختبارات 📝" };
  }

  // 5. Lessons & Videos (فيديوهات وشروحات الكورسات)
  if (
    type === "lesson" ||
    type === "video" ||
    type === "course" ||
    titleMsg.includes("درس") ||
    titleMsg.includes("فيديو") ||
    titleMsg.includes("محاضرة") ||
    titleMsg.includes("شرح") ||
    titleMsg.includes("كورس") ||
    titleMsg.includes("فصل") ||
    titleMsg.includes("وحدة")
  ) {
    return { tab: "lessons", label: "كورساتي 📚" };
  }

  // 6. Summaries & Notes (كشكول الطالب والتلخيصات)
  if (
    type === "summary" ||
    type === "notebook" ||
    type === "note" ||
    titleMsg.includes("كشكول") ||
    titleMsg.includes("تلخيص") ||
    titleMsg.includes("تلخيصات") ||
    titleMsg.includes("مذكرة") ||
    titleMsg.includes("مذكراتي") ||
    titleMsg.includes("ملاحظة") ||
    titleMsg.includes("تعديل مطلوب")
  ) {
    return { tab: "summaries", label: "مذكراتي 📝" };
  }

  // 7. Files & Attachments (ملازم وملفات PDF)
  if (
    type === "file" ||
    type === "pdf" ||
    type === "attachment" ||
    titleMsg.includes("ملزمة") ||
    titleMsg.includes("ملف") ||
    titleMsg.includes("pdf") ||
    titleMsg.includes("مستند") ||
    titleMsg.includes("مذكرات")
  ) {
    return { tab: "files", label: "الملفات 📁" };
  }

  // 8. Account & Subscription & Devices (الحساب، الاشتراكات، الأجهزة)
  if (
    type === "subscription" ||
    type === "payment" ||
    type === "receipt" ||
    type === "center" ||
    type === "device" ||
    titleMsg.includes("اشتراك") ||
    titleMsg.includes("دفع") ||
    titleMsg.includes("إيصال") ||
    titleMsg.includes("حسابك") ||
    titleMsg.includes("تفعيل") ||
    titleMsg.includes("سنتر") ||
    titleMsg.includes("كود") ||
    titleMsg.includes("جهاز") ||
    titleMsg.includes("أجهزة") ||
    titleMsg.includes("بيانات")
  ) {
    return { tab: "profile", label: "حسابي 👤" };
  }

  // 9. C++ Compiler (محرر الأكواد)
  if (
    type === "compiler" ||
    type === "code" ||
    type === "cpp" ||
    titleMsg.includes("محرر") ||
    titleMsg.includes("كود") ||
    titleMsg.includes("برمجة") ||
    titleMsg.includes("c++")
  ) {
    return { tab: "compiler", label: "محرر C++ 💻" };
  }

  return { tab: "dashboard", label: "الرئيسية 🏠" };
}

export function StudentPlatform() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "dashboard" | "lessons" | "summaries" | "compiler" | "files" | "quizzes" | "self-assessment" | "profile"
  >("dashboard");
  const [files, setFiles] = useState<LearningFile[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [linkedPreviewFile, setLinkedPreviewFile] = useState<LearningFile | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [autoOpenSummaryUpload, setAutoOpenSummaryUpload] = useState(false);
  const latestNotificationIdRef = useRef(0);
  const handleNotificationClickRef = useRef<(n: StudentNotification) => void>(() => {});

  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    loading: pushLoading,
    subscribeToPush,
  } = useWebPush(student?.id);

  const [dismissedPushBanner, setDismissedPushBanner] = useState(() => {
    try {
      return localStorage.getItem("dr_mahmoud_dismissed_push_v1") === "true";
    } catch {
      return false;
    }
  });

  const handleEnablePush = async () => {
    const success = await subscribeToPush();
    if (success) {
      toast({
        title: "تم تفعيل الإشعارات الفورية بنجاح 🎉",
        description: "ستصلك الآن تنبيهات الكورسات والاختبارات وملاحظات الدكتور حتى لو كنت قافل الموقع تماماً!",
      });
    } else {
      toast({
        variant: "destructive",
        title: "تعذر تفعيل الإشعارات",
        description: "يرجى السماح بالإشعارات من إعدادات المتصفح أو أيقونة القفل بجانب رابط الموقع.",
      });
    }
  };

  const handleDismissPushBanner = () => {
    setDismissedPushBanner(true);
    try {
      localStorage.setItem("dr_mahmoud_dismissed_push_v1", "true");
    } catch {}
  };

  // Automatically request push notification permission from browser on login/visit
  useEffect(() => {
    if (!student || !isPushSupported) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const autoPrompt = async () => {
        try {
          await subscribeToPush();
        } catch {}
      };

      // Attempt prompt immediately
      void autoPrompt();

      // Also trigger on first user interaction anywhere on the platform
      const onFirstTap = () => {
        if (Notification.permission === "default") {
          void autoPrompt();
        }
        window.removeEventListener("click", onFirstTap);
        window.removeEventListener("touchstart", onFirstTap);
      };

      window.addEventListener("click", onFirstTap, { once: true });
      window.addEventListener("touchstart", onFirstTap, { once: true });
      return () => {
        window.removeEventListener("click", onFirstTap);
        window.removeEventListener("touchstart", onFirstTap);
      };
    }
  }, [student?.id, isPushSupported, subscribeToPush]);

  // Lock body scroll and handle Escape key when mobile sidebar is open
  useEffect(() => {
    if (!sidebarOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarOpen]);

  // Quiz active states & Timer
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState<number | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
    attemptsUsed: number;
    attemptsRemaining: number | null;
  } | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizElapsedSeconds, setQuizElapsedSeconds] = useState(0);
  const submitQuizRef = useRef<(isAuto?: boolean) => Promise<void>>(() => Promise.resolve());
  // Synchronous re-entrancy guard: setState is async, so a second trigger in the
  // same tick could slip past the state-based checks. This ref blocks that.
  const quizSubmitInFlightRef = useRef(false);
  const quizScrollContainerRef = useRef<HTMLDivElement>(null);
  const playNotificationSound = useNotificationSound();

  // Prevent accidental page refresh / navigation during active exam
  useEffect(() => {
    if (!activeQuiz || quizResult) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeQuiz, quizResult]);

  // Exam Countdown Timer Effect
  useEffect(() => {
    if (!activeQuiz || quizResult) return;
    const timer = setInterval(() => {
      setQuizElapsedSeconds((prev) => prev + 1);
      setQuizTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          toast({ title: "انتهى وقت الاختبار", description: "جاري تسليم إجاباتك تلقائياً..." });
          void submitQuizRef.current(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, quizResult]);

  const startQuiz = (quiz: Quiz) => {
    const hasAttemptLimit = quiz.maxAttempts !== undefined && quiz.maxAttempts !== null && quiz.maxAttempts > 0;
    if (quiz.locked || (hasAttemptLimit && (quiz.attemptsUsed || 0) >= (quiz.maxAttempts as number))) {
      toast({
        variant: "destructive",
        title: "الاختبار غير متاح الآن",
        description: quiz.lockedReason || "استخدمت كل المحاولات المتاحة لهذا الاختبار.",
      });
      return;
    }
    // Tag each question with its original DB index BEFORE shuffling
    const originalTotal = quiz.questions.length;
    let mappedQuestions = quiz.questions.map((q, idx) => ({ ...q, _originalIndex: idx, _originalTotal: originalTotal }));
    if (quiz.shuffleQuestions) {
      for (let i = mappedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mappedQuestions[i], mappedQuestions[j]] = [mappedQuestions[j], mappedQuestions[i]];
      }
    }
    if (quiz.questionsToShow && quiz.questionsToShow > 0 && quiz.questionsToShow < mappedQuestions.length) {
      mappedQuestions = mappedQuestions.slice(0, quiz.questionsToShow);
    }
    // _originalTotal is carried on every question so submitQuiz can build the right-sized array
    setActiveQuiz({ ...quiz, questions: mappedQuestions });
    setQuizAnswers(Array(mappedQuestions.length).fill(-1));
    setQuizResult(null);
    quizSubmitInFlightRef.current = false;
    setQuizStartTime(Date.now());
    setQuizElapsedSeconds(0);
    setQuizTimeRemaining(quiz.durationMinutes ? quiz.durationMinutes * 60 : null);
  };

  const submitQuiz = async (isAuto = false) => {
    // Guard against double/late submission: timer expiry, anti-cheat auto-submit,
    // and the manual button can all fire close together. Only submit once.
    if (!activeQuiz || quizResult || quizSubmitting || quizSubmitInFlightRef.current) return;

    // Check if there are unanswered questions when manually submitted
    if (!isAuto) {
      const answeredCount = quizAnswers.filter((a) => a >= 0).length;
      const totalQuestions = activeQuiz.questions.length;
      if (answeredCount < totalQuestions) {
        const remaining = totalQuestions - answeredCount;
        const confirmMsg = `تنبيه: لديك ${remaining} ${remaining === 1 ? "سؤال" : "أسئلة"} دون إجابة (أجبت على ${answeredCount} من أصل ${totalQuestions}).\n\nهل أنت متأكد من رغبتك في تسليم وتصحيح الاختبار الآن؟`;
        if (!window.confirm(confirmMsg)) {
          return;
        }
      }
    }

    quizSubmitInFlightRef.current = true;
    setQuizSubmitting(true);
    const timeSpentSeconds = Math.round((Date.now() - quizStartTime) / 1000);

    // The displayed questions may be shuffled and/or sliced.
    // We MUST send answers indexed by their ORIGINAL DB position so the backend
    // can match answers[i] with quiz.questions[i].correctIndex.
    //
    // Key insight: _originalTotal is the full DB question count (stored in startQuiz).
    // We build a full-length array and place each answer at its _originalIndex.
    // Slots for questions NOT shown to the student remain -1 (unanswered).
    const firstQ: any = activeQuiz.questions[0];
    const originalTotal: number = firstQ?._originalTotal ?? activeQuiz.questions.length;
    const answersToSend = Array<number>(originalTotal).fill(-1);

    const detailedAnswers = activeQuiz.questions.map((q: any, i: number) => {
      const originalIdx: number = q._originalIndex !== undefined ? q._originalIndex : i;
      if (originalIdx >= 0 && originalIdx < originalTotal) {
        answersToSend[originalIdx] = quizAnswers[i] ?? -1;
      }
      return {
        prompt: q.prompt,
        selectedOption: quizAnswers[i] ?? -1,
        originalIndex: originalIdx,
        questionIndex: i,
      };
    });

    try {
      const res = await api<{
        score: number;
        passed: boolean;
        correct: number;
        total: number;
        attemptsUsed: number;
        attemptsRemaining: number | null;
        details?: Array<{ questionIndex: number; prompt?: string; selectedOption: number; correctOption: number; isCorrect: boolean }>;
      }>(
        `/api/learning/quizzes/${activeQuiz.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers: answersToSend, detailedAnswers, timeSpentSeconds }),
        },
      );
      setQuizResult(res);
      setQuizTimeRemaining(null);

      // Play completion chime & trigger instant notification toast
      try { playNotificationSound(); } catch (e) {}
      toast({
        title: res.passed ? "مبروك! تم اجتياز الاختبار بنجاح 🎓" : "تم تسليم الاختبار وتوثيق محاولتك 📝",
        description: `النتيجة النهائية: ${res.score}% (${res.correct} من ${res.total} إجابة صحيحة) — ${
          res.passed ? "أداء ممتاز جداً! تم تسجيل النتيجة بنجاح." : "لم تتخطَ درجة النجاح، يمكنك مراجعة الإجابات بالأسفل."
        }`,
      });

      // Auto-scroll to top to reveal result card immediately
      setTimeout(() => {
        quizScrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 50);
      setQuizzes((current) =>
        current.map((quiz) =>
          quiz.id === activeQuiz.id
            ? {
                ...quiz,
                attemptsUsed: res.attemptsUsed,
                locked: res.attemptsRemaining === 0,
                lockedReason: res.attemptsRemaining === 0 ? "استخدمت كل المحاولات المتاحة" : quiz.lockedReason,
              }
            : quiz,
        ),
      );
    } catch (err) {
      // Allow retry after a failed submission (network error, etc.)
      quizSubmitInFlightRef.current = false;
      toast({ variant: "destructive", title: "خطأ في الاختبار", description: (err as Error).message });
    } finally {
      setQuizSubmitting(false);
    }
  };
  submitQuizRef.current = submitQuiz;

  useEffect(() => {
    api<{ student: Student | null }>("/api/student/me")
      .then((r) => setStudent(r.student))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const loadLearningData = async () => {
    if (!student) return;
    setDataLoading(true);
    setDataError("");
    try {
      const [f, q, v, p, n] = await Promise.all([
        api<LearningFile[]>("/api/learning/files"),
        api<Quiz[]>("/api/learning/quizzes"),
        api<VideoSummary[]>("/api/videos"),
        api<ProgressRow[]>("/api/learning/progress"),
        api<StudentNotification[]>("/api/learning/notifications"),
      ]);
      const progressRes: any = p;
      const progressRows: ProgressRow[] = Array.isArray(progressRes) ? progressRes : (progressRes?.rows || []);
      setFiles(f);
      setQuizzes(q);
      setVideos(v);
      setProgress(progressRows);
      setNotifications(n);
      latestNotificationIdRef.current = Math.max(0, ...n.map((item) => item.id));
    } catch (err) {
      setDataError((err as Error).message || "مقدرناش نحمّل محتواك دلوقتي.");
    } finally {
      setDataLoading(false);
    }
  };
  useEffect(() => {
    void loadLearningData();
  }, [student]);

  useEffect(() => {
    if (!student) return;
    const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
    const stream = new EventSource(`/api/learning/notifications/stream${deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ""}`, { withCredentials: true });
    const refresh = (event: Event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data || "{}");
        const latestId = Number(payload.latestId || 0);
        if (latestId) latestNotificationIdRef.current = latestId;
        const notif: StudentNotification | undefined = payload.notification;

        playNotificationSound();
        void loadLearningData();

        if (notif && notif.title) {
          // Prepend to notifications list
          setNotifications((prev) => {
            if (prev.some((item) => item.id === notif.id)) return prev;
            return [notif, ...prev];
          });

          const target = getNotificationTarget(notif);
          toast({
            title: `🔔 ${notif.title}`,
            description: notif.message,
            action: (
              <ToastAction
                altText="فتح"
                onClick={() => handleNotificationClickRef.current(notif)}
              >
                {target.label} ←
              </ToastAction>
            ),
            onClick: () => handleNotificationClickRef.current(notif),
          });

          // Also trigger browser OS notification if window is minimized or inactive
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          ) {
            try {
              new Notification(notif.title, {
                body: notif.message,
                icon: "/logo.webp",
                tag: `notif-${notif.id}`,
              });
            } catch {}
          }
        } else {
          toast({
            title: "تحديث جديد متاح 🚀",
            description: "تم تحديث محتوى الحساب والدروس الآن.",
            action: (
              <ToastAction
                altText="مشاهدة الدروس"
                onClick={() => {
                  setTab("lessons");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                مشاهدة الدروس ←
              </ToastAction>
            ),
            onClick: () => {
              setTab("lessons");
              window.scrollTo({ top: 0, behavior: "smooth" });
            },
          });
        }
      } catch {}
    };
    stream.addEventListener("refresh", refresh);
    return () => {
      stream.removeEventListener("refresh", refresh);
      stream.close();
    };
  }, [student?.id]);
  useEffect(() => {
    if (!student) return;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        // Also check if student approval status, payment status, or enrolled courses updated from admin side
        const meRes = await api<{ student: Student | null }>("/api/student/me").catch(() => null);
        if (meRes?.student) {
          const statusChanged = meRes.student.status !== student.status || meRes.student.paymentStatus !== student.paymentStatus;
          const oldCourses = (student.enrolledCourseIds ?? []).sort().join(",");
          const newCourses = (meRes.student.enrolledCourseIds ?? []).sort().join(",");
          const coursesChanged = oldCourses !== newCourses;

          if (statusChanged || coursesChanged) {
            setStudent(meRes.student);
            void loadLearningData();
            playNotificationSound();
            if (coursesChanged) {
              toast({
                title: "تم تفعيل المواد الدراسية الخاصة بك 🎓",
                description: "قام الأدمن بتحديث وتحديد الكورسات المتاحة لك، تم فتح المحتوى بنجاح.",
                variant: "success",
                action: (
                  <ToastAction
                    altText="فتح الكورسات"
                    onClick={() => {
                      setTab("lessons");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    فتح الكورسات ←
                  </ToastAction>
                ),
                onClick: () => {
                  setTab("lessons");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                },
              });
            } else if (statusChanged) {
              toast({
                title: "تم تحديث وتفعيل حسابك ✅",
                description: "تم تفعيل الاشتراك وفك تشغيل باقي الدروس والاختبارات بنجاح.",
                variant: "success",
                action: (
                  <ToastAction
                    altText="بدء التعلم"
                    onClick={() => {
                      setTab("lessons");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    بدء التعلم ←
                  </ToastAction>
                ),
                onClick: () => {
                  setTab("lessons");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                },
              });
            }
          }
        }

        const rows = await api<StudentNotification[]>("/api/learning/notifications");
        const latestId = Math.max(0, ...rows.map((item) => item.id));
        if (latestNotificationIdRef.current > 0 && latestId > latestNotificationIdRef.current) {
          latestNotificationIdRef.current = latestId;
          setNotifications(rows);
          playNotificationSound();
          void loadLearningData();
          const newest = rows[0];
          if (newest) {
            const target = getNotificationTarget(newest);
            toast({
              title: `🔔 ${newest.title}`,
              description: newest.message,
              action: (
                <ToastAction
                  altText="فتح"
                  onClick={() => handleNotificationClickRef.current(newest)}
                >
                  {target.label} ←
                </ToastAction>
              ),
              onClick: () => handleNotificationClickRef.current(newest),
            });
          }
        } else {
          latestNotificationIdRef.current = latestId;
          setNotifications(rows);
        }
      } catch {
        // SSE keeps retrying; the next poll provides an independent fallback.
      }
    };
    // Fallback polling every 30 seconds (SSE already provides instantaneous real-time push)
    const timer = window.setInterval(poll, 30000);
    return () => window.clearInterval(timer);
  }, [student?.id, student?.status, student?.paymentStatus, JSON.stringify(student?.enrolledCourseIds)]);
  useEffect(() => {
    if (!student) return;
    let lastRefresh = 0;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Debounce: skip if refreshed within the last 30 seconds
      const now = Date.now();
      if (now - lastRefresh < 30_000) return;
      lastRefresh = now;
      void loadLearningData();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [student?.id]);
  if (loading)
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  if (!student)
    return (
      <AccessScreen
        onLogin={(nextStudent) => {
          setStudent(nextStudent);
          window.dispatchEvent(new Event("student-auth-changed"));
        }}
      />
    );
  const logout = async () => {
    await api("/api/student/logout", { method: "POST" });
    localStorage.removeItem("dr_mahmoud_watch_progress");
    localStorage.removeItem("dr_mahmoud_watch_positions");
    localStorage.removeItem("dr_mahmoud_bookmarks");
    setStudent(null);
    window.dispatchEvent(new Event("student-auth-changed"));
  };
  const markNotificationRead = async (notification: StudentNotification) => {
    // Instantly remove notification from list so it disappears and doesn't linger
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    if (notification.readAt) return;
    try {
      await api<StudentNotification>(
        `/api/learning/notifications/${notification.id}/read`,
        { method: "PATCH" },
      );
    } catch {
      // Reading notifications should never interrupt the learning experience.
    }
  };
  const markAllNotificationsRead = async () => {
    // Instantly clear all notifications from list
    setNotifications([]);
    try {
      await api("/api/learning/notifications/read-all", { method: "POST" });
    } catch {
      // Reading notifications should never interrupt the learning experience.
    }
  };

  const handleNotificationClick = (notification: StudentNotification) => {
    void markNotificationRead(notification);
    setShowNotifications(false);

    const target = getNotificationTarget(notification);
    if (target.tab === "external" && target.url) {
      if (target.url.startsWith("http")) {
        window.open(target.url, "_blank");
      } else {
        window.location.href = target.url;
      }
      return;
    }

    if (target.tab !== "external") {
      setTab(target.tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  handleNotificationClickRef.current = handleNotificationClick;

  const unreadNotifications = notifications.filter((item) => !item.readAt).length;
  const nav = [
    ["dashboard", "الرئيسية", Home],
    ["lessons", "كورساتي", BookOpen],
    ["summaries", "مذكراتي 📝", FileText],
    ["compiler", "محرر C++", Code2],
    ["files", "الملفات", FolderOpen],
    ["quizzes", "الاختبارات", ClipboardCheck],
    ["self-assessment", "التقييم الذاتي 🎯", Sparkles],
    ["profile", "حسابي", User],
  ] as const;
  return (
    <main
      className="min-h-screen bg-background pb-24 lg:pb-0"
      dir="rtl"
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="/api/learning/files/"]');
        if (!link) return;
        const match = link.getAttribute("href")?.match(/\/api\/learning\/files\/(\d+)\/(?:download|preview)/);
        const file = match ? files.find((item) => item.id === Number(match[1])) : undefined;
        if (!file) return;
        event.preventDefault();
        setLinkedPreviewFile(file);
      }}
    >
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[248px_1fr]">
        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-[65] bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200 lg:hidden"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Responsive Sidebar */}
        <aside
          aria-label="قائمة التنقل الجانبية"
          className={`fixed inset-y-0 right-0 z-[70] flex h-dvh max-h-dvh w-[280px] max-w-[85vw] flex-col border-l border-slate-800/80 bg-[#0F1B2D] text-slate-100 shadow-2xl transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-[248px] lg:translate-x-0 lg:shadow-none ${
            sidebarOpen
              ? "translate-x-0 visible pointer-events-auto"
              : "translate-x-full invisible pointer-events-none lg:visible lg:pointer-events-auto"
          }`}
        >
          {/* Top Brand & Close Button Header */}
          <div className="shrink-0 flex items-center justify-between border-b border-slate-800/80 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <img
                src="/logo.webp"
                alt="شعار منصة د. محمود المهدي"
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10"
              />
              <div>
                <strong className="block text-[13px] font-bold text-white">بوابة الطالب</strong>
                <span className="text-[10px] text-slate-400">د. محمود المهدي</span>
              </div>
            </div>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800/80 hover:text-white transition lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="إغلاق القائمة"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Student Info Card */}
          <div className="shrink-0 mx-3 mt-3 flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-[#14233A] p-2.5">
            <StudentAvatar name={student.name} src={student.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-[12px] font-bold text-white">{student.name}</strong>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400">طالب متفعّل</span>
                {student.accessCode && (
                  <span className="font-mono text-[11px] font-extrabold text-[#60A5FA] bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/50 dir-ltr">
                    {student.accessCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Items (Scrollable middle section) */}
          <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 px-2.5 space-y-1">
            {nav.map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value);
                  setSidebarOpen(false);
                }}
                aria-current={tab === value ? "page" : undefined}
                className={`relative flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 text-right text-[13px] font-bold transition-all duration-150 cursor-pointer ${
                  tab === value
                    ? "bg-blue-600/15 text-[#3B82F6] font-extrabold border border-blue-500/30"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                {tab === value && (
                  <span className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-[#1769FF]" />
                )}
                <Icon className={`h-[18px] w-[18px] shrink-0 ${tab === value ? "text-[#3B82F6]" : "opacity-75"}`} />
                <span className="truncate">{label}</span>
              </button>
            ))}
            <a
              href="/honor-board"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 text-right text-[13px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 transition-all cursor-pointer mt-3 shadow-xs"
            >
              <Trophy className="h-[18px] w-[18px] shrink-0 text-amber-400" />
              <span className="truncate">لوحة الشرف 🏆</span>
            </a>
          </nav>

          {/* Bottom Footer Actions */}
          <div className="shrink-0 mt-auto space-y-2 border-t border-slate-800/60 bg-[#0F1B2D] p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <ThemeToggle className="h-9 w-full text-slate-300 shadow-none dark:border-slate-800 dark:bg-transparent" />
            <a
              href={`https://wa.me/201066711545?text=${encodeURIComponent(
                `مرحباً د. محمود 👋\n\nأود الاستفسار وحجز الكورس من داخل حسابي بالمنصة:\n- الاسم: ${student.name}\n- رقم الهاتف: ${student.phone}\n- المرحلة الدراسية: ${student.grade || "غير محدد"}\n- نظام التعليم: ${student.educationSystem || "غير محدد"}\n- المحافظة/المدينة: ${student.governorate || "غير محدد"} - ${student.city || ""}\n- وضع التعلم: ${student.learningMode === "offline" ? "أوفلاين بالزقازيق" : "أونلاين"}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/10 text-[12px] font-bold text-blue-400 transition-colors hover:bg-blue-600/20"
            >
              كلم الدعم / حجز كورس 💬
            </a>
            <button
              type="button"
              onClick={logout}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> تسجيل الخروج
            </button>
          </div>
        </aside>
        <section className="min-w-0 bg-[#F6F8FC] dark:bg-[#0B1220] min-h-screen">
          <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E4EAF2] bg-white/95 px-4 backdrop-blur-sm md:px-6 dark:border-[#26364D] dark:bg-[#111C2E]/95">
            <div className="flex items-center gap-3">
              <button className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة"><Menu className="h-[18px] w-[18px]" /></button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications((current) => !current)}
                  aria-label="الإشعارات"
                  aria-expanded={showNotifications}
                  className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-primary hover:border-primary/20"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -left-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white shadow-sm">
                      {Math.min(unreadNotifications, 9)}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
                    >
                      <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <div>
                          <strong className="text-[14px] font-bold text-foreground">الإشعارات</strong>
                          <p className="text-[11px] text-muted-foreground">كل جديد في حسابك وكورساتك</p>
                        </div>
                        {unreadNotifications > 0 && (
                          <button
                            type="button"
                            onClick={() => void markAllNotificationsRead()}
                            className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/20"
                          >
                            تحديد الكل كمقروء
                          </button>
                        )}
                      </div>

                      {/* Push Notification Prompt in Dropdown */}
                      {isPushSupported && !isPushSubscribed && (
                        <div className="mx-2 my-2 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-sky-500/10 border border-blue-500/20 p-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <BellRing className="h-4 w-4 text-blue-500 shrink-0 animate-bounce" />
                            <span className="text-[11px] font-semibold text-foreground">
                              تنبيهات فورية حتى لو قفلت الموقع
                            </span>
                          </div>
                          <Button
                            size="sm"
                            disabled={pushLoading}
                            onClick={handleEnablePush}
                            className="h-6 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold shrink-0"
                          >
                            {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "تفعيل"}
                          </Button>
                        </div>
                      )}

                      <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-muted-foreground space-y-1">
                            <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500/70" />
                            <p className="text-[13px] font-semibold text-foreground">مفيش إشعارات جديدة</p>
                            <p className="text-[11px]">تم قراءة ومراجعة جميع التنبيهات</p>
                          </div>
                        ) : notifications.map((notification) => {
                          const target = getNotificationTarget(notification);
                          return (
                            <div
                              key={notification.id}
                              className="group mb-0.5 flex items-start gap-1.5 rounded-xl bg-primary/5 border border-primary/20 p-2.5 transition-all hover:bg-primary/10"
                            >
                              <button
                                type="button"
                                onClick={() => handleNotificationClick(notification)}
                                className="flex-1 text-right flex items-start gap-2.5 cursor-pointer min-w-0"
                              >
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
                                <span className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1.5 mb-1">
                                    <strong className="block text-[13px] font-bold text-foreground truncate">{notification.title}</strong>
                                    <span className="shrink-0 text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1 group-hover:bg-primary group-hover:text-white transition-colors">
                                      <span>{target.label}</span>
                                      <ArrowLeft className="h-2.5 w-2.5" />
                                    </span>
                                  </div>
                                  <span className="block text-[12px] leading-5 text-muted-foreground line-clamp-2">{notification.message}</span>
                                  <span className="mt-1 block text-[10px] text-muted-foreground/70">{new Date(notification.createdAt).toLocaleDateString("ar-EG")}</span>
                                </span>
                              </button>
                              <button
                                type="button"
                                title="إخفاء الإشعار"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void markNotificationRead(notification);
                                }}
                                className="grid h-6 w-6 place-items-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors shrink-0"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="hidden text-[13px] font-bold text-foreground sm:inline">{nav.find(([value]) => value === tab)?.[1]}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setTab("profile")} className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-muted"><StudentAvatar name={student.name} src={student.avatarUrl} size="sm" /><span className="hidden max-w-40 truncate text-[13px] font-bold text-foreground sm:block">{student.name}</span></button>
              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="lg:hidden grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
          <div className="mx-auto max-w-[1440px] p-4 pb-8 sm:p-6 lg:p-8">
            {/* Offline Push Notifications Prompt Banner */}
            {isPushSupported && pushPermission === "default" && !dismissedPushBanner && (
              <div className="mb-6 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-4 sm:p-5 text-white shadow-lg shadow-blue-500/15 relative overflow-hidden">
                <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs text-white shadow-inner">
                      <BellRing className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                      <strong className="block text-sm sm:text-base font-bold">
                        فعّل إشعارات المنصة الفورية على جهازك 🔔
                      </strong>
                      <p className="text-xs sm:text-[13px] text-blue-100 mt-0.5 leading-relaxed">
                        لتصلك تنبيهات الدروس الجديدة، ونتائج الامتحانات، وملاحظات د. محمود حتى لو كان المتصفح أو الموقع مغلقاً تماماً.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={handleDismissPushBanner}
                      className="text-xs text-blue-100 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      لاحقاً
                    </button>
                    <Button
                      size="sm"
                      disabled={pushLoading}
                      onClick={handleEnablePush}
                      className="h-9 px-4 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-md"
                    >
                      {pushLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-1" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 ml-1 text-blue-600" />
                      )}
                      تفعيل الإشعارات الآن
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {tab === "dashboard" ? (
            <DashboardTab
              student={student}
              files={files}
              quizzes={quizzes}
              videos={videos}
              progress={progress}
              dataLoading={dataLoading}
              dataError={dataError}
              onRetry={loadLearningData}
              onOpen={(newTab) => {
                if (newTab === "summaries") setAutoOpenSummaryUpload(true);
                setTab(newTab);
              }}
            />
          ) : tab === "lessons" ? (
            <VideoLessonsSection
              student={student}
              videos={videos}
              files={files}
              quizzes={quizzes}
              onStartQuiz={startQuiz}
            />
          ) : tab === "summaries" ? (
            <StudentSummariesTab
              student={student}
              courses={videos.map((v) => ({ id: v.id, title: v.title }))}
              lessons={videos.map((v) => ({ id: v.id, title: v.title, courseId: v.courseId }))}
              autoOpenUpload={autoOpenSummaryUpload}
              onModalClosed={() => setAutoOpenSummaryUpload(false)}
            />
          ) : tab === "compiler" ? (
            <CppCompilerPanel />
          ) : tab === "files" ? (
            <FilesTab files={files} />
          ) : tab === "quizzes" ? (
            <QuizzesTab quizzes={quizzes} onStartQuiz={startQuiz} />
          ) : tab === "self-assessment" ? (
            <SelfAssessmentTab student={student} onBackToDashboard={() => setTab("dashboard")} />
          ) : (
            <ProfileTab student={student} onStudentChange={setStudent} />
          )}</div>
        </section>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-sm lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          <button
            type="button"
            onClick={() => { setTab("dashboard"); setSidebarOpen(false); }}
            aria-current={tab === "dashboard" ? "page" : undefined}
            className={`my-1 flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition-colors active:scale-[.98] ${
              tab === "dashboard" ? "bg-primary/10 text-primary font-black" : "text-muted-foreground"
            }`}
          >
            <Home className={`h-[22px] w-[22px] ${tab === "dashboard" ? "stroke-[2.5]" : ""}`} />
            <span>الرئيسية</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab("lessons"); setSidebarOpen(false); }}
            aria-current={tab === "lessons" ? "page" : undefined}
            className={`my-1 flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition-colors active:scale-[.98] ${
              tab === "lessons" ? "bg-primary/10 text-primary font-black" : "text-muted-foreground"
            }`}
          >
            <BookOpen className={`h-[22px] w-[22px] ${tab === "lessons" ? "stroke-[2.5]" : ""}`} />
            <span>كورساتي</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab("quizzes"); setSidebarOpen(false); }}
            aria-current={tab === "quizzes" ? "page" : undefined}
            className={`my-1 flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition-colors active:scale-[.98] ${
              tab === "quizzes" ? "bg-primary/10 text-primary font-black" : "text-muted-foreground"
            }`}
          >
            <ClipboardCheck className={`h-[22px] w-[22px] ${tab === "quizzes" ? "stroke-[2.5]" : ""}`} />
            <span>الاختبارات</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab("summaries"); setSidebarOpen(false); }}
            aria-current={tab === "summaries" ? "page" : undefined}
            className={`my-1 flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition-colors active:scale-[.98] ${
              tab === "summaries" ? "bg-primary/10 text-primary font-black" : "text-muted-foreground"
            }`}
          >
            <FileText className={`h-[22px] w-[22px] ${tab === "summaries" ? "stroke-[2.5]" : ""}`} />
            <span>مذكراتي</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="فتح القائمة الكاملة"
            className={`my-1 flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition-colors active:scale-[.98] ${
              sidebarOpen || ["files", "compiler", "profile"].includes(tab)
                ? "bg-primary/10 text-primary font-black"
                : "text-muted-foreground"
            }`}
          >
            <Menu className="h-[22px] w-[22px]" />
            <span>القائمة</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {linkedPreviewFile && <AppFilePreviewModal file={linkedPreviewFile} onClose={() => setLinkedPreviewFile(null)} />}
        {activeQuiz && (
          <motion.div
            className="fixed inset-0 z-[100] bg-slate-50 dark:bg-[#070D18] flex flex-col overflow-hidden select-none md:select-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* ── 1. Sticky Full-Width Header Bar ── */}
            <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0D1B2E]/95 backdrop-blur-md shadow-xs">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3" dir="rtl">
                {/* Title and stats on Right (RTL) */}
                <div className="min-w-0 flex-1 space-y-1 text-right">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 text-xs font-black">
                      اختبار إلكتروني
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight truncate" dir="auto">
                      {activeQuiz.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{activeQuiz.questionsToShow && activeQuiz.questionsToShow > 0 ? activeQuiz.questionsToShow : activeQuiz.questions.length} سؤال</span>
                    <span>•</span>
                    <span>نسبة النجاح {activeQuiz.passingScore}%</span>
                    {!quizResult && (
                      <>
                        <span>•</span>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">
                          أجبت: {quizAnswers.filter((a) => a >= 0).length} / {activeQuiz.questions.length}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Left side (LTR): Timer & Safe Exit button */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0" dir="ltr">
                  {!quizResult && (
                    <div
                      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs transition-all duration-300 ${
                        quizTimeRemaining === null
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          : quizTimeRemaining < 30
                          ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 animate-pulse"
                          : quizTimeRemaining < 60
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      <Clock className="h-4 w-4 shrink-0" />
                      <span className="font-black text-sm sm:text-base tabular-nums">
                        {quizTimeRemaining !== null
                          ? `${Math.floor(quizTimeRemaining / 60)}:${String(quizTimeRemaining % 60).padStart(2, "0")}`
                          : `${Math.floor(quizElapsedSeconds / 60)}:${String(quizElapsedSeconds % 60).padStart(2, "0")}`
                        }
                      </span>
                      {quizTimeRemaining !== null && (
                        <span className="text-[10px] font-bold opacity-70">
                          {(() => {
                            const totalSeconds = Math.round((activeQuiz.durationMinutes ?? 0) * 60);
                            return `/ ${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
                          })()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Explicit Exit button that requires confirmation */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!quizResult) {
                        if (
                          !window.confirm(
                            "هل أنت متأكد من رغبتك في الخروج من الاختبار؟ لن يتم حفظ إجاباتك إلا عند الضغط على زر 'تسليم وتصحيح الاختبار'."
                          )
                        ) {
                          return;
                        }
                      }
                      setActiveQuiz(null);
                      setQuizResult(null);
                    }}
                    className="h-9 px-3 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                  >
                    <X className="h-4 w-4 ml-1" />
                    {quizResult ? "إغلاق" : "خروج"}
                  </Button>
                </div>
              </div>

              {/* Progress bar for countdown */}
              {quizTimeRemaining !== null && !quizResult && activeQuiz.durationMinutes && (
                <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear ${
                      quizTimeRemaining < 30 ? "bg-red-500" : quizTimeRemaining < 60 ? "bg-amber-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${(quizTimeRemaining / (activeQuiz.durationMinutes * 60)) * 100}%` }}
                  />
                </div>
              )}
            </header>

            {/* ── 2. Full-Screen Scrollable Content (Takes 100% Height, Comfortable Reading) ── */}
            <div
              ref={quizScrollContainerRef}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 md:py-8 scroll-smooth"
            >
              <div className="max-w-3xl lg:max-w-4xl mx-auto space-y-6 pb-20">
                {/* Result Card: Placed at TOP when exam is finished */}
                {quizResult && (
                  <div
                    className={`rounded-3xl p-6 md:p-8 text-center shadow-xl transition-all border relative overflow-hidden ${
                      quizResult.passed
                        ? "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                        : "bg-red-500/10 dark:bg-red-950/40 border-red-500/30 text-red-900 dark:text-red-200"
                    }`}
                    dir="rtl"
                  >
                    <div className={`absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl opacity-20 ${quizResult.passed ? "bg-emerald-500" : "bg-red-500"}`} />

                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white dark:bg-[#0F1D32] shadow-md mb-3.5 border border-current/10">
                      {quizResult.passed ? (
                        <Sparkles className="h-9 w-9 text-emerald-500 animate-bounce" />
                      ) : (
                        <AlertCircle className="h-9 w-9 text-red-500" />
                      )}
                    </div>

                    <strong className="block text-2xl md:text-3xl font-black tracking-tight">
                      {quizResult.passed ? "مبروك! تم الاجتياز بنجاح 🎉" : "للأسف لم تتخطَ درجة النجاح 💔"}
                    </strong>

                    <p className="mt-1.5 text-xs md:text-sm font-semibold opacity-90 max-w-md mx-auto">
                      {quizResult.passed
                        ? "أداء ممتاز! تم توثيق نتيجتك وحفظ المحاولة بنجاح."
                        : `درجة النجاح المطلوبة هي ${activeQuiz?.passingScore}%، ادرس الأسئلة الموضحة بالأسفل وحاول مجدداً.`}
                    </p>

                    {/* Progress Bar for Score */}
                    <div className="mt-5 mb-2 max-w-md mx-auto space-y-1.5" dir="rtl">
                      <div className="flex justify-between items-center text-xs font-extrabold px-1">
                        <span>الدرجة المكتسبة</span>
                        <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">{quizResult.score}%</span>
                      </div>
                      <div className="h-3.5 w-full bg-white/80 dark:bg-[#070D18]/80 rounded-full overflow-hidden p-0.5 border border-current/15 shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            quizResult.passed
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : "bg-gradient-to-r from-red-500 to-amber-500"
                          }`}
                          style={{ width: `${quizResult.score}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid: RTL with explicit LTR number handling */}
                    <div className="grid grid-cols-3 gap-2 md:gap-4 mt-5 pt-5 border-t border-current/15 max-w-lg mx-auto" dir="rtl">
                      <div className="rounded-2xl bg-white/80 dark:bg-[#0F1D32]/80 p-3 text-center shadow-xs border border-current/5 flex flex-col items-center justify-center">
                        <span className="block text-[11px] md:text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">النسبة</span>
                        <strong className="block text-base md:text-lg font-black text-blue-600 dark:text-blue-400">{quizResult.score}%</strong>
                      </div>

                      <div className="rounded-2xl bg-white/80 dark:bg-[#0F1D32]/80 p-3 text-center shadow-xs border border-current/5 flex flex-col items-center justify-center min-w-0">
                        <span className="block text-[11px] md:text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap truncate w-full">الإجابات الصحيحة</span>
                        <div dir="ltr" className="flex items-center justify-center gap-0.5 whitespace-nowrap font-mono w-full">
                          <span className="text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {quizResult.correct} / {quizResult.total}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/80 dark:bg-[#0F1D32]/80 p-3 text-center shadow-xs border border-current/5 flex flex-col items-center justify-center">
                        <span className="block text-[11px] md:text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">المحاولات المتبقية</span>
                        <strong className="block text-xs md:text-sm font-black text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {quizResult.attemptsRemaining === null ? "بلا حدود" : quizResult.attemptsRemaining}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>↓ مرر لأسفل لمراجعة الأسئلة والشروحات التفصيلية</span>
                    </div>
                  </div>
                )}

                {/* Questions List */}
                {activeQuiz.questions.map((q, qi) => {
                  const origIdx = (q as any)._originalIndex !== undefined ? (q as any)._originalIndex : qi;
                  const details = (quizResult as any)?.details as Array<{ questionIndex: number; prompt?: string; selectedOption: number; correctOption: number; isCorrect: boolean }> | undefined;
                  const normPrompt = normalizeQuestionPrompt(q.prompt);
                  const detail = details?.find((d: any) => 
                    d.questionIndex === origIdx ||
                    (d.prompt && normalizeQuestionPrompt(d.prompt) === normPrompt)
                  );
                  const isSelected = quizAnswers[qi] !== undefined && quizAnswers[qi] >= 0;
                  const correctOptionIndex = detail ? detail.correctOption : q.correctIndex;
                  const isCorrect = detail ? detail.isCorrect : Boolean(quizResult && correctOptionIndex !== undefined && quizAnswers[qi] === correctOptionIndex);
                  const isWrong = quizResult && isSelected && !isCorrect;
                  const isEng = isEnglishQuestion(q.prompt, q.options);

                  return (
                    <div
                      key={qi}
                      className={`space-y-4 rounded-3xl border p-5 sm:p-7 transition-all shadow-xs ${isEng ? "text-left" : "text-right"} ${
                        quizResult
                          ? isCorrect
                            ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20"
                            : isWrong
                            ? "border-red-500/40 bg-red-500/5 dark:bg-red-950/20"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1B2E]"
                          : isSelected
                          ? "border-blue-500/40 bg-white dark:bg-[#0D1B2E] ring-1 ring-blue-500/10"
                          : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0D1B2E]"
                      }`}
                    >
                      {/* Question Header & Prompt */}
                      <div className="w-full space-y-3">
                        <div className={`flex items-start justify-between gap-3 w-full ${isEng ? "flex-row" : "flex-row-reverse"}`}>
                          <div className="flex-1 space-y-2.5">
                            {(() => {
                              if (!isEng) {
                                return (
                                  <h3 dir="rtl" className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 text-right leading-relaxed whitespace-pre-line break-words">
                                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black ml-2 shrink-0">
                                      {qi + 1}
                                    </span>
                                    {q.prompt}
                                  </h3>
                                );
                              }

                              const lines = q.prompt.split("\n").map((l) => l.trim()).filter(Boolean);
                              const arLines = lines.filter((l) => /[\u0600-\u06FF]/.test(l));
                              const enLines = lines.filter((l) => !/[\u0600-\u06FF]/.test(l));

                              const titleLine = enLines[0] || q.prompt;
                              const codeLines = enLines.slice(1);

                              return (
                                <>
                                  {/* English Title Line */}
                                  <h3 dir="ltr" className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 text-left leading-relaxed break-words whitespace-pre-line">
                                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black mr-2 shrink-0">
                                      {qi + 1}
                                    </span>
                                    {titleLine}
                                  </h3>

                                  {/* Code Block if lines look like C++/Code */}
                                  {codeLines.length > 0 && (
                                    <div dir="ltr" className="my-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs sm:text-sm font-mono text-emerald-400 border border-slate-800 shadow-inner leading-relaxed">
                                      {codeLines.map((cLine, ci) => (
                                        <div key={ci} className="whitespace-pre">{cLine}</div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Arabic Translation Badge Card */}
                                  {arLines.length > 0 && (
                                    <div dir="rtl" className="text-right text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 rounded-xl px-4 py-2.5 mt-2 leading-relaxed">
                                      {arLines.join(" ")}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {quizResult && (
                            <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
                              isCorrect ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-600 dark:text-red-400"
                            }`}>
                              {isCorrect ? "✓ إجابة صحيحة" : "✗ إجابة خاطئة"}
                            </span>
                          )}
                        </div>
                      </div>

                      {q.imageUrl && (
                        <div className="my-3 sm:my-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 p-2 sm:p-4 flex flex-col items-center justify-center">
                          <img
                            src={q.imageUrl}
                            alt={`Question ${qi + 1} image`}
                            onClick={() => setLightboxImage(q.imageUrl || null)}
                            className="object-contain max-h-[55vh] sm:max-h-[65vh] w-auto max-w-full rounded-xl cursor-zoom-in transition duration-200 hover:scale-[1.01] active:scale-95 shadow-sm"
                            title="اضغط لتكبير الصورة بملء الشاشة"
                          />
                          <button
                            type="button"
                            onClick={() => setLightboxImage(q.imageUrl || null)}
                            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            <span>اضغط لتكبير الصورة وفحص التفاصيل بدقة</span>
                          </button>
                        </div>
                      )}

                      {/* Options Radio List */}
                      <div className="space-y-3 pt-1" dir={isEng ? "ltr" : "rtl"}>
                        {q.options.map((option, oi) => {
                          const optionSelected = quizAnswers[qi] === oi;
                          const correctOptionIndex = detail ? detail.correctOption : q.correctIndex;
                          const optionIsCorrect = correctOptionIndex !== undefined && correctOptionIndex === oi;
                          let optionStyle = "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-blue-300 dark:hover:border-blue-700";

                          if (quizResult) {
                            if (optionIsCorrect) {
                              optionStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold";
                            } else if (optionSelected && !optionIsCorrect) {
                              optionStyle = "border-red-500 bg-red-500/15 text-red-800 dark:text-red-200 line-through opacity-80";
                            } else {
                              optionStyle = "border-slate-200 dark:border-slate-800 opacity-50";
                            }
                          } else if (optionSelected) {
                            optionStyle = "border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-bold ring-2 ring-blue-500/20 shadow-2xs";
                          }

                          const letter = getOptionLetter(oi, isEng);

                          return (
                            <label
                              key={oi}
                              dir={isEng ? "ltr" : "rtl"}
                              className={`flex min-h-12 sm:min-h-14 cursor-pointer items-center gap-3 sm:gap-3.5 rounded-2xl border px-3 sm:px-4 py-3 sm:py-3.5 transition-all select-none ${optionStyle}`}
                            >
                              <input
                                type="radio"
                                disabled={Boolean(quizResult)}
                                name={`q-${qi}`}
                                checked={optionSelected}
                                onChange={() =>
                                  setQuizAnswers(
                                    quizAnswers.map((a, i) => (i === qi ? oi : a)),
                                  )
                                }
                                className="text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0 cursor-pointer"
                              />
                              <span
                                className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm font-black transition-colors ${
                                  optionSelected
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {letter}
                              </span>
                              <span dir={isEng ? "ltr" : "rtl"} className={`text-sm sm:text-base font-semibold flex-1 leading-relaxed break-words whitespace-pre-line ${isEng ? "text-left" : "text-right"}`}>
                                {option}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {quizResult && activeQuiz.showExplanations !== false && q.explanation && (() => {
                        const isExplAr = /[\u0600-\u06FF]/.test(q.explanation);
                        return (
                          <div
                            className={`mt-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 ${
                              isExplAr ? "text-right" : "text-left"
                            }`}
                            dir={isExplAr ? "rtl" : "ltr"}
                          >
                            <strong className="block font-bold mb-1 text-blue-700 dark:text-blue-300">
                              {isExplAr ? "💡 توضيح وشرح الإجابة:" : "💡 Explanation:"}
                            </strong>
                            <span className="text-slate-600 dark:text-slate-300 leading-relaxed" dir={isExplAr ? "rtl" : "ltr"}>
                              {q.explanation}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}

                {/* ── 3. Bottom Action Section ── */}
                {!quizResult ? (
                  <div className="pt-4 pb-8 space-y-3 text-center">
                    <Button
                      onClick={() => submitQuiz(false)}
                      disabled={quizSubmitting}
                      className="w-full h-14 text-base sm:text-lg font-black rounded-2xl shadow-xl bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      {quizSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin h-5 w-5" />
                          <span>جارٍ التصحيح وحساب النتيجة...</span>
                        </div>
                      ) : (
                        "تسليم وتصحيح الاختبار"
                      )}
                    </Button>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      تأكد من الإجابة على جميع الأسئلة قبل التسليم. سيتم توثيق نتيجتك وحفظ المحاولة فوراً.
                    </p>
                  </div>
                ) : (
                  <div className="pt-4 pb-8 text-center">
                    <Button
                      onClick={() => {
                        setActiveQuiz(null);
                        setQuizResult(null);
                      }}
                      className="w-full h-13 text-base font-black rounded-2xl shadow-md bg-blue-600 hover:bg-blue-700 text-white transition-all"
                    >
                      إغلاق نافذة الاختبار ومتابعة الكورس ✕
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-6 select-none"
          >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <a
                href={lightboxImage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
                title="فتح في نافذة مستقلة"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">نافذة مستقلة</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white hover:bg-red-500/30 hover:text-red-300 transition"
                aria-label="إغلاق"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div
              className="max-h-[90vh] max-w-[95vw] overflow-auto flex items-center justify-center p-2"
              onClick={() => setLightboxImage(null)}
            >
              <img
                src={lightboxImage}
                alt="تكبير السؤال"
                className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl cursor-zoom-out"
              />
            </div>
          </motion.div>
        )}
        {student && (
          <IncompleteProfileModal
            student={student}
            onStudentUpdated={(updatedStudent) => setStudent(updatedStudent)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
