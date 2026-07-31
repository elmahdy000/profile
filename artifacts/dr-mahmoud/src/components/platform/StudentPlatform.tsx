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
  Moon,
  Sun,
  Copy,
  Sparkles,
  AlertCircle,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoLessonsSection } from "@/components/YoutubeSection";
import { toast } from "@/hooks/use-toast";
import { getTrack, getTrackForStage } from "@/data/academic";
import {
  RegistrationStageSelector,
  createDefaultRegistrationStage,
} from "@/components/ui/RegistrationStageSelector";
import { EmptyState, PageHeader, ProfileInfoRow, StatisticCard, StatusBadge, StudentAvatar } from "./StudentDashboardUI";
import { CppCompilerPanel } from "./CppCompilerPanel";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { ProfileTab } from "./tabs/ProfileTab";
import { FilesTab } from "./tabs/FilesTab";
import { QuizzesTab } from "./tabs/QuizzesTab";
import { DashboardTab } from "./tabs/DashboardTab";
import { AccessScreen } from "./tabs/AccessScreen";

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
function AppFilePreviewModal({ file, onClose }: { file: LearningFile | null; onClose: () => void }) {
  if (!file) return null;
  const previewUrl = `/api/learning/files/${file.id}/preview#toolbar=0&navpanes=0&scrollbar=1`;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] grid place-items-center bg-black/70 backdrop-blur-sm p-3 sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <motion.section initial={{ scale: 0.98, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 12 }} role="dialog" aria-modal="true" aria-label={`معاينة ${file.title}`} className="flex h-[min(90vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><div className="min-w-0"><strong className="block truncate text-foreground">{file.title}</strong><span className="block truncate text-xs text-muted-foreground">{file.originalName}</span></div><button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-muted transition-colors" aria-label="إغلاق المعاينة"><X className="h-5 w-5" /></button></header>
        <div className="min-h-0 flex-1 bg-muted p-2 sm:p-4">
          {file.mimeType?.startsWith("image/") ? <img src={previewUrl} alt={file.title} className="h-full w-full object-contain" /> : file.mimeType === "application/pdf" || file.mimeType?.startsWith("text/") ? <iframe src={previewUrl} title={file.title} className="h-full w-full rounded-xl border border-border bg-card" /> : <div className="grid h-full place-items-center rounded-xl border border-border bg-card p-8 text-center"><div><FileText className="mx-auto h-12 w-12 text-primary" /><strong className="mt-4 block text-foreground">لا يمكن عرض هذا النوع داخل المتصفح</strong><p className="mt-2 text-sm text-muted-foreground">اطلب نسخة PDF لمعاينتها داخل المنصة.</p></div></div>}
        </div>
      </motion.section>
    </motion.div>
  );
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


export function StudentPlatform() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "dashboard" | "lessons" | "compiler" | "files" | "quizzes" | "profile"
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
  const latestNotificationIdRef = useRef(0);

  // Restore saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("dr_mahmoud_theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
    else if (saved === "light") document.documentElement.classList.remove("dark");
  }, []);

  // Quiz active states & Timer
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState<number | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
    attemptsUsed: number;
    attemptsRemaining: number;
  } | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizElapsedSeconds, setQuizElapsedSeconds] = useState(0);
  const [quizTabSwitchCount, setQuizTabSwitchCount] = useState(0);
  const MAX_TAB_SWITCHES = 3;
  const submitQuizRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Anti-cheat: detect tab/window switching during active quiz
  useEffect(() => {
    if (!activeQuiz || quizResult) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setQuizTabSwitchCount((prev) => {
          const next = prev + 1;
          if (next >= MAX_TAB_SWITCHES) {
            toast({
              variant: "destructive",
              title: `تم رصد ${MAX_TAB_SWITCHES} مغادرة للاختبار`,
              description: "جاري تسليم إجاباتك تلقائياً...",
            });
            void submitQuizRef.current();
          } else {
            toast({
              variant: "destructive",
              title: `تحذير — غادرت الاختبار (${next}/${MAX_TAB_SWITCHES})`,
              description: next === MAX_TAB_SWITCHES - 1 ? "المرة الجاية سيتم التسليم تلقائياً!" : "يُمنع مغادرة نافذة الاختبار أثناء الحل.",
            });
          }
          return next;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeQuiz, quizResult]);

  // Exam Countdown Timer Effect
  useEffect(() => {
    if (!activeQuiz || quizResult) return;
    if (quizTimeRemaining !== null && quizTimeRemaining <= 0) {
      toast({ title: "انتهى وقت الاختبار", description: "جاري تسليم إجاباتك تلقائياً..." });
      void submitQuizRef.current();
      return;
    }
    const timer = setInterval(() => {
      if (quizTimeRemaining !== null) {
        setQuizTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }
      setQuizElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, quizResult, quizTimeRemaining]);

  const startQuiz = (quiz: Quiz) => {
    if (quiz.locked || (quiz.maxAttempts !== undefined && (quiz.attemptsUsed || 0) >= quiz.maxAttempts)) {
      toast({
        variant: "destructive",
        title: "الاختبار غير متاح الآن",
        description: quiz.lockedReason || "استخدمت كل المحاولات المتاحة لهذا الاختبار.",
      });
      return;
    }
    // Map questions with their original index before shuffling
    let mappedQuestions = quiz.questions.map((q, idx) => ({ ...q, _originalIndex: idx }));
    if (quiz.shuffleQuestions) {
      for (let i = mappedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mappedQuestions[i], mappedQuestions[j]] = [mappedQuestions[j], mappedQuestions[i]];
      }
    }
    if (quiz.questionsToShow && quiz.questionsToShow > 0 && quiz.questionsToShow < mappedQuestions.length) {
      mappedQuestions = mappedQuestions.slice(0, quiz.questionsToShow);
    }
    setActiveQuiz({ ...quiz, questions: mappedQuestions });
    setQuizAnswers(Array(mappedQuestions.length).fill(-1));
    setQuizResult(null);
    setQuizTabSwitchCount(0);
    setQuizStartTime(Date.now());
    setQuizElapsedSeconds(0);
    setQuizTimeRemaining(quiz.durationMinutes ? quiz.durationMinutes * 60 : null);
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    setQuizSubmitting(true);
    const timeSpentSeconds = Math.round((Date.now() - quizStartTime) / 1000);

    // Map answers back using full quiz original questions length
    const totalOriginalQuestions = activeQuiz.questions ? activeQuiz.questions.length : 0;
    const originalAnswers = Array(totalOriginalQuestions).fill(-1);
    
    activeQuiz.questions.forEach((q: any, i: number) => {
      const targetIdx = q._originalIndex !== undefined ? q._originalIndex : i;
      if (targetIdx >= 0 && targetIdx < totalOriginalQuestions) {
        originalAnswers[targetIdx] = quizAnswers[i];
      }
    });

    try {
      const res = await api<{
        score: number;
        passed: boolean;
        correct: number;
        total: number;
        attemptsUsed: number;
        attemptsRemaining: number;
        details?: Array<{ questionIndex: number; selectedOption: number; correctOption: number; isCorrect: boolean }>;
      }>(
        `/api/learning/quizzes/${activeQuiz.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers: originalAnswers, timeSpentSeconds }),
        },
      );
      setQuizResult(res);
      setQuizTimeRemaining(null);
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
      setFiles(f);
      setQuizzes(q);
      setVideos(v);
      setProgress(p);
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
  const playNotificationSound = useNotificationSound();
  useEffect(() => {
    if (!student) return;
    const stream = new EventSource("/api/learning/notifications/stream", { withCredentials: true });
    const refresh = (event: Event) => {
      const latestId = Number(JSON.parse((event as MessageEvent).data || "{}").latestId || 0);
      if (latestId) latestNotificationIdRef.current = latestId;
      playNotificationSound();
      void loadLearningData();
      toast({ title: "محتوى جديد", description: "تم تحديث الدروس والملفات والاختبارات المتاحة لك." });
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
        const rows = await api<StudentNotification[]>("/api/learning/notifications");
        const latestId = Math.max(0, ...rows.map((item) => item.id));
        if (latestNotificationIdRef.current > 0 && latestId > latestNotificationIdRef.current) {
          latestNotificationIdRef.current = latestId;
          setNotifications(rows);
          playNotificationSound();
          void loadLearningData();
          toast({ title: "محتوى جديد", description: "تم تحديث المحتوى المتاح لك تلقائيًا." });
        } else {
          latestNotificationIdRef.current = latestId;
          setNotifications(rows);
        }
      } catch {
        // SSE keeps retrying; the next poll provides an independent fallback.
      }
    };
    const timer = window.setInterval(poll, 12000);
    return () => window.clearInterval(timer);
  }, [student?.id]);
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
    if (notification.readAt) return;
    try {
      const updated = await api<StudentNotification>(
        `/api/learning/notifications/${notification.id}/read`,
        { method: "PATCH" },
      );
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch {
      // Reading notifications should never interrupt the learning experience.
    }
  };
  const markAllNotificationsRead = async () => {
    try {
      await api("/api/learning/notifications/read-all", { method: "POST" });
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
      );
    } catch {
      // Reading notifications should never interrupt the learning experience.
    }
  };
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;
  const nav = [
    ["dashboard", "الرئيسية", Home],
    ["lessons", "كورساتي", BookOpen],
    ["compiler", "محرر الكود C++", Code2],
    ["files", "الملفات", FolderOpen],
    ["quizzes", "الاختبارات", ClipboardCheck],
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
        {sidebarOpen && <button className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" aria-label="إغلاق القائمة" onClick={() => setSidebarOpen(false)} />}
        <aside className={`fixed inset-y-0 right-0 z-50 flex w-[248px] flex-col border-l border-slate-800/80 bg-[#0F1B2D] text-slate-100 transition-transform lg:sticky lg:top-0 lg:z-20 lg:min-h-screen ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
          <button className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3 border-b border-slate-800/80 px-4 py-4">
            <img
              src="/logo.webp"
              alt="شعار منصة د. محمود المهدي"
              className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10"
            />
            <div><strong className="block text-[13px] font-bold text-white">بوابة الطالب</strong><span className="text-[10px] text-slate-400">د. محمود المهدي</span></div>
          </div>
          <div className="mx-3 mt-3 flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-[#14233A] p-2.5"><StudentAvatar name={student.name} src={student.avatarUrl} size="sm" /><div className="min-w-0"><strong className="block truncate text-[12px] font-bold text-white">{student.name}</strong><span className="text-[10px] text-slate-400">طالب متفعّل</span></div></div>
          <nav className="mt-4 space-y-1 px-2.5">
            {nav.map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => { setTab(value); setSidebarOpen(false); }}
                aria-current={tab === value ? "page" : undefined}
                className={`relative flex min-h-[40px] w-full items-center gap-3 rounded-xl px-3 text-right text-[13px] font-bold transition-all duration-150 cursor-pointer ${
                  tab === value
                    ? "bg-blue-600/15 text-[#3B82F6] font-extrabold border border-blue-500/30"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                {tab === value && (
                  <span className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-[#1769FF]" />
                )}
                <Icon className={`h-[18px] w-[18px] ${tab === value ? "text-[#3B82F6]" : "opacity-75"}`} />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-2 px-3 pb-4 border-t border-slate-800/60 pt-3">
            <button
              type="button"
              onClick={() => {
                const isDark = document.documentElement.classList.toggle("dark");
                localStorage.setItem("dr_mahmoud_theme", isDark ? "dark" : "light");
              }}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-800 text-[12px] font-bold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Moon className="h-3.5 w-3.5 hidden dark:inline" />
              <Sun className="h-3.5 w-3.5 dark:hidden" />
              <span className="dark:hidden">الوضع الليلي</span>
              <span className="hidden dark:inline">الوضع النهاري</span>
            </button>
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
              onClick={logout}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
                      <div className="max-h-80 overflow-y-auto p-1.5">
                        {notifications.length === 0 ? (
                          <p className="p-8 text-center text-[13px] text-muted-foreground">مفيش إشعارات جديدة</p>
                        ) : notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              void markNotificationRead(notification);
                              if (notification.type === "lesson") setTab("lessons");
                              if (notification.type === "file") setTab("files");
                              if (notification.type === "quiz") setTab("quizzes");
                              setShowNotifications(false);
                            }}
                            className={`mb-0.5 w-full rounded-xl p-3 text-right transition-colors hover:bg-muted ${notification.readAt ? "opacity-60" : "bg-primary/5"}`}
                          >
                            <span className="flex items-start gap-2.5">
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-border" : "bg-primary"}`} />
                              <span>
                                <strong className="block text-[13px] font-bold text-foreground">{notification.title}</strong>
                                <span className="mt-0.5 block text-[12px] leading-5 text-muted-foreground">{notification.message}</span>
                                <span className="mt-1 block text-[10px] text-muted-foreground/70">{new Date(notification.createdAt).toLocaleDateString("ar-EG")}</span>
                              </span>
                            </span>
                          </button>
                        ))}
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
          <div className="mx-auto max-w-[1440px] p-4 pb-8 sm:p-6 lg:p-8">{tab === "dashboard" ? (
            <DashboardTab
              student={student}
              files={files}
              quizzes={quizzes}
              videos={videos}
              progress={progress}
              dataLoading={dataLoading}
              dataError={dataError}
              onRetry={loadLearningData}
              onOpen={setTab}
            />
          ) : tab === "lessons" ? (
            <VideoLessonsSection
              student={student}
              files={files}
              quizzes={quizzes}
              onStartQuiz={startQuiz}
            />
          ) : tab === "compiler" ? (
            <CppCompilerPanel />
          ) : tab === "files" ? (
            <FilesTab files={files} />
          ) : tab === "quizzes" ? (
            <QuizzesTab quizzes={quizzes} onStartQuiz={startQuiz} />
          ) : (
            <ProfileTab student={student} onStudentChange={setStudent} />
          )}</div>
        </section>
      </div>

      <nav
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-sm lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {nav.filter(([value]) => value !== "compiler").map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => { setTab(value); setSidebarOpen(false); }}
              aria-current={tab === value ? "page" : undefined}
              className={`my-1 flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition-colors active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tab === value ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              <Icon
                className={`h-[23px] w-[23px] ${tab === value ? "stroke-[2.5]" : ""}`}
              />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence>
        {linkedPreviewFile && <AppFilePreviewModal file={linkedPreviewFile} onClose={() => setLinkedPreviewFile(null)} />}
        {activeQuiz && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/75 p-4 overflow-y-auto flex items-center justify-center backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (activeQuiz && !quizResult) {
                void submitQuiz();
              } else {
                setActiveQuiz(null);
              }
            }}
          >
            <motion.div
              className="w-full max-w-xl rounded-3xl bg-background p-5 md:p-6 shadow-2xl relative border border-border"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              {/* Sticky Timer Bar */}
              <div className="sticky top-0 z-10 -mx-5 -mt-5 md:-mx-6 md:-mt-6 mb-0">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 md:px-6 rounded-t-3xl border-b border-border transition-colors duration-500 ${
                  quizResult
                    ? "bg-muted/80"
                    : quizTimeRemaining !== null
                      ? quizTimeRemaining < 30
                        ? "bg-red-500/15 border-red-500/30"
                        : quizTimeRemaining < 60
                        ? "bg-amber-500/12 border-amber-500/25"
                        : "bg-card"
                      : "bg-card"
                }`} dir="rtl">
                  {/* Right side (RTL): Quiz title & Stats */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-base md:text-lg font-black text-foreground leading-tight truncate" dir="auto">
                      {activeQuiz.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-semibold">
                      <span>{activeQuiz.questionsToShow && activeQuiz.questionsToShow > 0 ? activeQuiz.questionsToShow : activeQuiz.questions.length} سؤال</span>
                      <span>•</span>
                      <span>نجاح {activeQuiz.passingScore}%</span>
                      {!quizResult && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-primary">
                            أجبت: {quizAnswers.filter(a => a >= 0).length}/{activeQuiz.questions.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Left side (LTR): Timer & Anti-cheat warning badge */}
                  {!quizResult && (
                    <div className="flex items-center gap-2 shrink-0 justify-end" dir="ltr">
                      {quizTabSwitchCount > 0 && (
                        <div className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold ${quizTabSwitchCount >= MAX_TAB_SWITCHES - 1 ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse" : "bg-amber-500/15 text-amber-600 border border-amber-500/20"}`}>
                          <span>⚠</span>
                          <span>{quizTabSwitchCount}/{MAX_TAB_SWITCHES}</span>
                        </div>
                      )}

                      <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs transition-all duration-500 ${
                        quizTimeRemaining === null
                          ? "bg-muted text-muted-foreground"
                          : quizTimeRemaining < 30
                          ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse"
                          : quizTimeRemaining < 60
                          ? "bg-amber-500/15 text-amber-600 border border-amber-500/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-black text-sm tabular-nums">
                          {quizTimeRemaining !== null
                            ? `${Math.floor(quizTimeRemaining / 60)}:${String(quizTimeRemaining % 60).padStart(2, "0")}`
                            : `${Math.floor(quizElapsedSeconds / 60)}:${String(quizElapsedSeconds % 60).padStart(2, "0")}`
                          }
                        </span>
                        {quizTimeRemaining !== null && (
                          <span className="text-[10px] font-bold opacity-70">
                            / {Math.floor((activeQuiz.durationMinutes ?? 0) * 60 / 60)}:{String((activeQuiz.durationMinutes ?? 0) * 60 % 60).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar for countdown */}
                {quizTimeRemaining !== null && !quizResult && activeQuiz.durationMinutes && (
                  <div className="h-1 w-full bg-border overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear ${
                        quizTimeRemaining < 30 ? "bg-red-500" : quizTimeRemaining < 60 ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${(quizTimeRemaining / (activeQuiz.durationMinutes * 60)) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="border-b border-border mt-4 mb-4" />


              <div className="mt-4 space-y-5 max-h-[60vh] overflow-y-auto px-1" dir="ltr">
                {activeQuiz.questions.map((q, qi) => {
                  const origIdx = (q as any)._originalIndex !== undefined ? (q as any)._originalIndex : qi;
                  const details = (quizResult as any)?.details as Array<{ questionIndex: number; selectedOption: number; correctOption: number; isCorrect: boolean }> | undefined;
                  const detail = details?.find((d: { questionIndex: number }) => d.questionIndex === origIdx);
                  const isSelected = quizAnswers[qi] !== undefined && quizAnswers[qi] >= 0;
                  const isCorrect = detail ? detail.isCorrect : Boolean(quizResult && quizAnswers[qi] === q.correctIndex);
                  const isWrong = quizResult && isSelected && !isCorrect;

                  return (
                    <div key={qi} className={`space-y-4 rounded-2xl border p-5 transition-all shadow-xs text-left ${
                      quizResult
                        ? isCorrect
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : isWrong
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-border bg-card/40"
                        : "border-border bg-card/60"
                    }`}>
                      {/* Question Header & Prompt */}
                      <div className="w-full space-y-2.5">
                        <div className="flex items-start justify-between gap-3 w-full">
                          <div className="flex-1 space-y-2">
                            {(() => {
                              const lines = q.prompt.split('\n').map((l) => l.trim()).filter(Boolean);
                              const arLines = lines.filter((l) => /[\u0600-\u06FF]/.test(l));
                              const enLines = lines.filter((l) => !/[\u0600-\u06FF]/.test(l));

                              // Detect if English lines contain code (variables, cout, cin, braces, semicolons)
                              const titleLine = enLines[0] || "";
                              const codeLines = enLines.slice(1);

                              return (
                                <>
                                  {/* English Title Line */}
                                  {titleLine && (
                                    <h3 dir="ltr" className="text-base md:text-lg font-bold text-foreground leading-snug">
                                      {qi + 1}. {titleLine}
                                    </h3>
                                  )}

                                  {/* Code Block if lines look like C++/Code */}
                                  {codeLines.length > 0 && (
                                    <div dir="ltr" className="my-2.5 overflow-x-auto rounded-xl bg-slate-900 dark:bg-slate-950 p-3.5 text-xs md:text-sm font-mono text-emerald-400 border border-slate-800 shadow-inner leading-relaxed">
                                      {codeLines.map((cLine, ci) => (
                                        <div key={ci} className="whitespace-pre">{cLine}</div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Arabic Translation Badge Card */}
                                  {arLines.length > 0 && (
                                    <div dir="rtl" className="text-right text-xs md:text-sm font-semibold text-primary/90 bg-primary/5 dark:bg-primary/10 border border-primary/15 rounded-xl px-3.5 py-2 mt-2 leading-relaxed shadow-2xs">
                                      {arLines.join(" ")}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {quizResult && (
                            <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
                              isCorrect ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
                            }`}>
                              {isCorrect ? '✓ صح' : '✗ غلط'}
                            </span>
                          )}
                        </div>
                      </div>

                      {q.imageUrl && (
                        <div className="my-3 overflow-hidden rounded-xl border border-border bg-muted max-h-56 flex justify-center">
                          <img src={q.imageUrl} alt={`Question ${qi + 1} image`} className="object-contain max-h-56" />
                        </div>
                      )}

                      <div className="space-y-2.5 pt-1" dir="ltr">
                        {q.options.map((option, oi) => {
                          const optionSelected = quizAnswers[qi] === oi;
                          const correctOptionIndex = detail ? detail.correctOption : q.correctIndex;
                          const optionIsCorrect = correctOptionIndex !== undefined && correctOptionIndex === oi;
                          let optionStyle = "border-border hover:bg-muted/70 hover:border-primary/30";

                          if (quizResult) {
                            if (optionIsCorrect) {
                              optionStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold";
                            } else if (optionSelected && !optionIsCorrect) {
                              optionStyle = "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300 line-through opacity-80";
                            } else {
                              optionStyle = "border-border opacity-50";
                            }
                          } else if (optionSelected) {
                            optionStyle = "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20 shadow-xs";
                          }

                          return (
                            <label
                              key={oi}
                              dir="auto"
                              className={`flex min-h-12 cursor-pointer items-center gap-3.5 rounded-xl border px-4 py-3 transition-all ${optionStyle}`}
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
                                className="text-primary focus:ring-primary h-4 w-4 shrink-0 cursor-pointer"
                              />
                              <span dir="auto" className="text-sm md:text-base font-medium flex-1 leading-normal">
                                {option}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {quizResult && activeQuiz.showExplanations !== false && q.explanation && (
                        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/10 p-3.5 text-xs text-foreground text-right" dir="rtl">
                          <strong className="block font-bold mb-1 text-primary">الشرح:</strong>
                          <span className="text-muted-foreground" dir="auto">{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {quizResult ? (
                <div
                  className={`mt-5 rounded-2xl p-6 text-center shadow-lg transition-all border ${
                    quizResult.passed
                      ? "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                      : "bg-red-500/10 dark:bg-red-950/40 border-red-500/30 text-red-900 dark:text-red-200"
                  }`}
                  dir="rtl"
                >
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-background/80 shadow-md mb-3">
                    {quizResult.passed ? (
                      <Sparkles className="h-8 w-8 text-emerald-500 animate-bounce" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    )}
                  </div>

                  <strong className="block text-3xl font-black tracking-tight">
                    {quizResult.passed ? "مبروك! تم الاجتياز بنجاح 🎉" : "للأسف لم تتخطَ درجة النجاح 💔"}
                  </strong>

                  <p className="mt-1 text-xs md:text-sm font-semibold opacity-90">
                    {quizResult.passed
                      ? "أداء ممتاز! تم توثيق نتيجتك وحفظ المحاولة بنجاح."
                      : `درجة النجاح المطلوبة هي ${activeQuiz?.passingScore}%، ادرس الأسئلة الموضحة بالأسفل وحاول مجدداً.`}
                  </p>

                  <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-current/10" dir="ltr">
                    <div className="rounded-xl bg-background/60 p-2.5 text-center shadow-2xs">
                      <span className="block text-[10px] font-bold text-muted-foreground">النسبة</span>
                      <strong className="block text-base font-black text-primary">{quizResult.score}%</strong>
                    </div>

                    <div className="rounded-xl bg-background/60 p-2.5 text-center shadow-2xs">
                      <span className="block text-[10px] font-bold text-muted-foreground">الإجابات الصحيحة</span>
                      <strong className="block text-base font-black text-emerald-600 dark:text-emerald-400">
                        {quizResult.correct} / {quizResult.total}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-background/60 p-2.5 text-center shadow-2xs">
                      <span className="block text-[10px] font-bold text-muted-foreground">المحاولات المتبقية</span>
                      <strong className="block text-base font-black text-amber-600 dark:text-amber-400">
                        {quizResult.attemptsRemaining}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={submitQuiz}
                  disabled={quizSubmitting}
                  className="mt-5 w-full h-12 text-base font-extrabold rounded-xl shadow-lg bg-primary hover:bg-primary/90 text-white transition-all active:scale-[0.98]"
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
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setActiveQuiz(null);
                  setQuizResult(null);
                }}
                className="mt-2 w-full font-bold text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إغلاق نافذة الاختبار ✕
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
