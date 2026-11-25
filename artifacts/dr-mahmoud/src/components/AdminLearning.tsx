import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ClipboardCheck,
  Copy,
  FileText,
  Eye,
  Download,
  Search,
  ListChecks,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  X,
  BarChart3,
  MessageCircle,
  Activity,
  FileCheck2,
  AlertCircle,
  Edit2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  MapPin,
  LayoutDashboard,
  Folder,
  Bell,
  CreditCard,
  FileSpreadsheet,
  QrCode,
  Sparkles,
  FileEdit,
  Printer,
  Users,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { ACADEMIC_TRACKS, getStagesForTrack, getTrack } from "@/data/academic";
import type { Student as PlatformStudent } from "@/types/platform";
import type { PaymentReceipt } from "./admin/learning/PaymentsTab";

// Lazy-loaded heavy admin modules to drastically reduce initial AdminLearning bundle size
const ExamWizard = lazy(() => import("./ExamWizard").then((m) => ({ default: m.ExamWizard })));
const StudentsTab = lazy(() => import("./admin/learning/StudentsTab").then((m) => ({ default: m.StudentsTab })));
const CenterBookingsTab = lazy(() => import("./admin/learning/CenterBookingsTab").then((m) => ({ default: m.CenterBookingsTab })));
const PaymentsTab = lazy(() => import("./admin/learning/PaymentsTab").then((m) => ({ default: m.PaymentsTab })));
const NotificationsTab = lazy(() => import("./admin/learning/NotificationsTab").then((m) => ({ default: m.NotificationsTab })));
const MonthlyPaymentsTab = lazy(() => import("./admin/learning/MonthlyPaymentsTab").then((m) => ({ default: m.MonthlyPaymentsTab })));
const OverviewSection = lazy(() => import("./admin/learning/OverviewSection").then((m) => ({ default: m.OverviewSection })));
const ReportsTab = lazy(() => import("./admin/learning/ReportsTab").then((m) => ({ default: m.ReportsTab })));
const StudentSummariesAdminTab = lazy(() => import("./admin/learning/StudentSummariesAdminTab").then((m) => ({ default: m.StudentSummariesAdminTab })));
const StudentQuizGradesSheet = lazy(() => import("./platform/tabs/StudentQuizGradesSheet").then((m) => ({ default: m.StudentQuizGradesSheet })));
const AttendanceScannerTab = lazy(() => import("./admin/attendance/AttendanceScannerTab").then((m) => ({ default: m.AttendanceScannerTab })));
const TestBankTab = lazy(() => import("./admin/learning/TestBankTab").then((m) => ({ default: m.TestBankTab })));
const SelfAssessmentAdminTab = lazy(() => import("./admin/learning/SelfAssessmentAdminTab").then((m) => ({ default: m.SelfAssessmentAdminTab })));
const EssayExamsAdminTab = lazy(() => import("./admin/learning/EssayExamsAdminTab").then((m) => ({ default: m.EssayExamsAdminTab })));
const KholasaAdminTab = lazy(() => import("./kholasa/KholasaAdminTab").then((m) => ({ default: m.KholasaAdminTab })));
const MemoStudioTab = lazy(() => import("./admin/learning/MemoStudioTab").then((m) => ({ default: m.MemoStudioTab })));
const HomeworkAdminTab = lazy(() => import("./admin/learning/HomeworkAdminTab").then((m) => ({ default: m.HomeworkAdminTab })));

const isHomeworkItem = (q: any) =>
  q?.scope === "homework" ||
  q?.category === "واجب" ||
  q?.category === "homework" ||
  String(q?.title || "").toLowerCase().includes("واجب") ||
  String(q?.title || "").toLowerCase().includes("homework");

const SELF_CONTAINED_ADMIN_TABS = new Set<string>([
  "attendance",
  "testbank",
  "essay-exams",
  "self-assessment-packs",
  "subscriptions",
  "summaries",
]);

const WORKSPACE_SUBNAV_GROUPS: Array<{
  tabs: Array<{ id: AdminLearningTab; label: string }>;
}> = [
  {
    tabs: [
      { id: "students", label: "قائمة الطلاب" },
      { id: "attendance", label: "حضور السنتر QR" },
      { id: "center-bookings", label: "جدول السناتر" },
      { id: "summaries", label: "كشكول التلخيصات" },
    ],
  },
  {
    tabs: [
      { id: "payments", label: "إيصالات الدفع" },
      { id: "subscriptions", label: "الاشتراكات الشهرية" },
    ],
  },
  {
    tabs: [
      { id: "testbank", label: "بنك الأسئلة والمولد" },
      { id: "quizzes", label: "الاختبارات الإلكترونية" },
      { id: "homework", label: "الواجبات المنزلية" },
      { id: "essay-exams", label: "تصحيح المقالي" },
      { id: "grades-sheet", label: "شيت الدرجات" },
      { id: "memo-studio", label: "استوديو A4" },
      { id: "self-assessment-packs", label: "باقات التقييم الذاتي" },
    ],
  },
  {
    tabs: [
      { id: "overview", label: "اللوحة التشغيلية" },
      { id: "reports", label: "التقارير والتحليلات" },
      { id: "notifications", label: "الإشعارات والرسائل" },
    ],
  },
];

function AdminTabFallback() {
  return (
    <div className="grid place-items-center py-20">
      <div className="flex flex-col items-center gap-2.5 text-slate-500">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <span className="text-xs font-bold">جارٍ تحميل القسم...</span>
      </div>
    </div>
  );
}

type Student = PlatformStudent & {
  accessCode?: string | null;
  deviceId?: string | null;
  maxDevices?: number;
  boundDevices?: string[];
  enrolledCategories?: string[];
};
type FileItem = {
  id: number;
  courseId?: number | null;
  title: string;
  category: string;
  unit?: string | null;
  lesson?: string | null;
  stage?: string | null;
  stages?: string[];
  targetType?: "stages" | "videos";
  videoIds?: number[];
  subject?: string | null;
  tags?: string[];
  order?: number;
  originalName: string;
  description?: string | null;
  mimeType?: string;
  sizeBytes: number;
  isPublished: boolean;
  createdAt?: string;
};
interface Question {
  id?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  imageUrl?: string;
  points?: number;
}
type VideoOption = { id: number; courseId?: number | null; title: string; category: string; stage?: string | null; stages?: string[] };
interface Quiz {
  id: number;
  courseId?: number | null;
  videoId?: number | null;
  scope: "course" | "lesson";
  title: string;
  description?: string | null;
  category: string;
  unit?: string | null;
  lesson?: string | null;
  stage?: string | null;
  stages: string[];
  durationMinutes?: number | null;
  passingScore: number;
  maxAttempts: number;
  requiredProgress: number;
  questionsToShow?: number | null;
  shuffleQuestions?: boolean;
  showExplanations?: boolean;
  questions: Question[];
  isPublished: boolean;
  lockedReason?: string | null;
  createdAt?: string;
  attemptsCount?: number;
  uniqueStudentsCount?: number;
}
interface BankQuestion {
  id: number;
  courseId?: number | null;
  category: string;
  unit?: string | null;
  lesson?: string | null;
  stage?: string | null;
  stages?: string[];
  subject?: string | null;
  difficulty: "easy" | "medium" | "hard";
  tags?: string[];
  question: Question;
  createdAt?: string;
}
type Attempt = {
  id: number;
  studentName: string;
  quizTitle: string;
  score: number;
  passed: boolean;
  createdAt: string;
};
type LearningAnalytics = {
  summary: {
    totalStudents: number;
    approvedStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    completedLessons: number;
    averageProgress: number;
    quizPassRate: number;
    paidStudents?: number;
    pendingReviewPayments?: number;
  };
  governorateDistribution?: Array<{ name: string; count: number; percentage: number }>;
  topCities?: Array<{ name: string; count: number }>;
  gradeDistribution?: Array<{ name: string; count: number }>;
  students: Array<{
    studentId: number;
    name: string;
    phone: string;
    email?: string | null;
    governorate?: string;
    city?: string;
    grade?: string;
    status: string;
    paymentStatus?: string;
    assignedLessons: number;
    startedLessons: number;
    completedLessons: number;
    averageProgress: number;
    quizAttempts: number;
    averageQuizScore: number;
    lastActivity?: string | null;
    isActive: boolean;
  }>;
};
type RecoveryRequest = {
  id: number;
  status: string;
  createdAt: string;
  studentId: number;
  studentName: string;
  phone: string;
  accessCode?: string | null;
};

function authHeaders(json = true): HeadersInit {
  return json ? { "Content-Type": "application/json" } : {};
}

async function adminApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...authHeaders(!(options.body instanceof FormData)),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الطلب");
  return data;
}

async function optimizeLearningImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  const image = await createImageBitmap(file);
  const maxEdge = 2560;
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    image.close();
    return file;
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
    type: "image/webp",
    lastModified: file.lastModified,
  });
}

export type AdminLearningTab =
  | "overview"
  | "attendance"
  | "students"
  | "summaries"
  | "grades-sheet"
  | "center-bookings"
  | "payments"
  | "notifications"
  | "files"
  | "testbank"
  | "kholasa"
  | "memo-studio"
  | "quizzes"
  | "homework"
  | "essay-exams"
  | "subscriptions"
  | "reports"
  | "self-assessment-packs";

export function AdminLearning({
  role = "superadmin",
  initialTab = "students",
  onTabChange,
}: {
  role?: "superadmin" | "subadmin";
  initialTab?: AdminLearningTab;
  onTabChange?: (tab: AdminLearningTab) => void;
}) {
  const { toast } = useToast();
  const [tab, setTabState] = useState<AdminLearningTab>(initialTab);
  const [testBankInitialTab, setTestBankInitialTab] = useState<"explorer" | "upload" | "generate" | "auto_daily">(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const mode = sp.get("mode") || sp.get("subtab");
      if (mode === "generate" || mode === "upload" || mode === "auto_daily") return mode as any;
    }
    return "explorer";
  });

  useEffect(() => {
    const handleUrl = () => {
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        const mode = sp.get("mode") || sp.get("subtab");
        if (mode === "generate" || mode === "upload" || mode === "auto_daily" || mode === "explorer") {
          setTestBankInitialTab(mode as any);
        }
      }
    };
    window.addEventListener("popstate", handleUrl);
    return () => window.removeEventListener("popstate", handleUrl);
  }, []);

  const setTab = React.useCallback(
    (newTab: AdminLearningTab) => {
      setTabState(newTab);
      onTabChange?.(newTab);
    },
    [onTabChange],
  );

  const prevInitialTabRef = React.useRef(initialTab);
  useEffect(() => {
    if (initialTab && prevInitialTabRef.current !== initialTab) {
      setTabState(initialTab);
      prevInitialTabRef.current = initialTab;
    }
  }, [initialTab]);
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    type: "info",
    targetGrade: "all",
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [students, setStudents] = useState<Student[]>([]),
    [files, setFiles] = useState<FileItem[]>([]),
    [quizzes, setQuizzes] = useState<Quiz[]>([]),
    [attempts, setAttempts] = useState<Attempt[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceipt[]>([]);
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [videoCategories, setVideoCategories] = useState<string[]>([]);
  const [videoOptions, setVideoOptions] = useState<VideoOption[]>([]);
  const [learningCourses, setLearningCourses] = useState<
    Array<{ id: number; title: string; category: string; stages?: string[] }>
  >([]);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileSearch, setFileSearch] = useState("");
  const [fileCourseFilter, setFileCourseFilter] = useState("all");
  const [fileStageFilter, setFileStageFilter] = useState("all");
  const [fileStatusFilter, setFileStatusFilter] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");
  const [studentStageFilter, setStudentStageFilter] = useState("all");
  const [studentPaymentFilter, setStudentPaymentFilter] = useState("all");
  const [resultSearch, setResultSearch] = useState("");
  const [filePage, setFilePage] = useState(1);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [fileValidationError, setFileValidationError] = useState("");
  const [fileOptimization, setFileOptimization] = useState<{ before: number; after: number } | null>(null);
  const [lessonSearch, setLessonSearch] = useState("");
  const [lessonCourseFilter, setLessonCourseFilter] = useState("");
  const [lessonStageFilter, setLessonStageFilter] = useState("");
  const [fileStageSearch, setFileStageSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileForm, setFileForm] = useState({
    title: "",
    stage: "",
    category: "",
    unit: "",
    lesson: "",
    courseId: "",
    subject: "",
    tags: "",
    order: 1,
    description: "",
    file: null as File | null,
    targetType: "stages" as "stages" | "videos",
    stages: [] as string[],
    videoIds: [] as string[],
  });
  const [quizForm, setQuizForm] = useState({
    title: "",
    courseId: "",
    videoId: "",
    scope: "course" as "course" | "lesson",
    category: "",
    stage: "",
    stages: [] as string[],
    description: "",
    durationMinutes: "" as number | string,
    passingScore: 60,
    maxAttempts: 3,
    requiredProgress: 80,
    questionsToShow: null as number | null,
    shuffleQuestions: false,
    showExplanations: true,
    isPublished: false,
    questions: [
      { prompt: "", options: ["", "", "", ""], correctIndex: 0, explanation: "", imageUrl: "" },
    ] as Question[],
  });
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<number | null>(null);
  const [isImportingQuestions, setIsImportingQuestions] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [quizStageSearch, setQuizStageSearch] = useState("");
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<number>>(new Set());
  const quizImportInputRef = useRef<HTMLInputElement>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive" | "warning";
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const confirmAction = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    variant?: "default" | "destructive" | "warning";
    onConfirm: () => Promise<void> | void;
  }) => {
    setConfirmModal({
      isOpen: true,
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || "تأكيد",
      cancelText: "إلغاء",
      variant: opts.variant || "default",
      onConfirm: opts.onConfirm,
    });
  };

  const resetQuizForm = () => {
    setEditingQuizId(null);
    setQuizForm({
      title: "",
      courseId: "",
      videoId: "",
      scope: "course",
      category: "",
      stage: "",
      stages: [],
      description: "",
      durationMinutes: "",
      passingScore: 60,
      maxAttempts: 3,
      requiredProgress: 80,
      questionsToShow: null,
      shuffleQuestions: false,
      showExplanations: true,
      isPublished: false,
      questions: [{ prompt: "", options: ["", "", "", ""], correctIndex: 0, explanation: "", imageUrl: "" }],
    });
  };

  const copyStudentCode = async (student: Student) => {
    if (!student.accessCode) return;
    try {
      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(student.accessCode);
          copied = true;
        } catch {
          copied = false;
        }
      }
      if (!copied) {
        const textarea = document.createElement("textarea");
        textarea.value = student.accessCode;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          if (!document.execCommand("copy")) throw new Error("copy failed");
        } finally {
          textarea.remove();
        }
      }
      setCopiedStudentId(student.id);
      toast({ title: "تم نسخ كود الطالب", description: student.accessCode });
      window.setTimeout(() => setCopiedStudentId((id) => id === student.id ? null : id), 1800);
    } catch {
      toast({ variant: "destructive", title: "تعذر نسخ الكود", description: "حدد الكود وانسخه يدويًا." });
    }
  };

  const importQuizQuestions = async (file: File) => {
    setIsImportingQuestions(true);
    setImportWarnings([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await adminApi<{ questions: Question[]; warnings: string[] }>(
        "/api/admin/learning/quizzes/import",
        { method: "POST", body: formData },
      );
      const hasManualQuestion = quizForm.questions.some((question) =>
        question.prompt.trim() || question.options.some((option) => option.trim()),
      );
      setQuizForm((current) => ({
        ...current,
        questions: hasManualQuestion ? [...current.questions, ...result.questions] : result.questions,
      }));
      setImportWarnings(result.warnings || []);
      toast({ title: `تم استيراد ${result.questions.length} سؤال`, description: "راجع الأسئلة والإجابات الصحيحة قبل الحفظ." });
    } catch (error) {
      toast({ variant: "destructive", title: "تعذر استيراد الأسئلة", description: (error as Error).message });
    } finally {
      setIsImportingQuestions(false);
      if (quizImportInputRef.current) quizImportInputRef.current.value = "";
    }
  };

  const lastCountsRef = React.useRef<{
    pendingReceipts: number | null;
    pendingStudents: number | null;
    pendingRecovery: number | null;
  }>({
    pendingReceipts: null,
    pendingStudents: null,
    pendingRecovery: null,
  });

  const playAdminNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const checkNotificationDeltas = (
    s: Student[],
    recoveryData: RecoveryRequest[],
    receiptsData: PaymentReceipt[],
  ) => {
    const newPendingReceipts = receiptsData.filter((r) => r.status === "pending").length;
    const newPendingStudents = s.filter((st) => st.status !== "approved" && st.status !== "suspended").length;
    const newPendingRecovery = recoveryData.filter((r) => r.status === "pending" || r.status === "open").length;

    if (lastCountsRef.current.pendingReceipts !== null) {
      if (newPendingReceipts > lastCountsRef.current.pendingReceipts) {
        playAdminNotificationChime();
        toast({
          title: "💳 إشعار جديد: إيصال تحويل مرفوع للمراجعة!",
          description: "قام طالب برفع إيصال تحويل جديد ينتظر موافقتك وتأكيد التفعيل.",
          variant: "warning",
          action: (
            <ToastAction
              altText="مراجعة الإيصالات"
              onClick={() => setTab("payments")}
            >
              مراجعة الإيصالات ←
            </ToastAction>
          ),
          onClick: () => setTab("payments"),
        });
      }
      if (newPendingStudents > lastCountsRef.current.pendingStudents!) {
        playAdminNotificationChime();
        toast({
          title: "👤 إشعار جديد: طالب جديد ينتظر التفعيل!",
          description: "قام طالب جديد بالتسجيل وينتظر مراجعة حسابه وتفعيله.",
          action: (
            <ToastAction
              altText="مراجعة الطلاب"
              onClick={() => {
                setStudentStatusFilter("pending");
                setTab("students");
              }}
            >
              عرض الطلاب ←
            </ToastAction>
          ),
          onClick: () => {
            setStudentStatusFilter("pending");
            setTab("students");
          },
        });
      }
      if (newPendingRecovery > lastCountsRef.current.pendingRecovery!) {
        playAdminNotificationChime();
        toast({
          title: "🔑 إشعار جديد: طلب استرجاع كود!",
          description: "وصل طلب جديد لاسترجاع كود الدخول من أحد الطلاب.",
          variant: "destructive",
          action: (
            <ToastAction
              altText="استرجاع الأكواد"
              onClick={() => setTab("reports")}
            >
              عرض الطلب ←
            </ToastAction>
          ),
          onClick: () => setTab("reports"),
        });
      }
    }

    lastCountsRef.current = {
      pendingReceipts: newPendingReceipts,
      pendingStudents: newPendingStudents,
      pendingRecovery: newPendingRecovery,
    };
  };

  const refreshAttemptsOnly = async () => {
    try {
      const a = await adminApi<Attempt[]>("/api/admin/learning/attempts");
      setAttempts(a);
      setAttemptsLoading(false);
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في التحديث", description: (e as Error).message });
    }
  };

  const load = async (silent = false) => {
    if (!silent) setIsRefreshingData(true);
    try {
      // Independent ultra-fast fetch for grades-sheet so it renders immediately (~50ms) without waiting on quizzes/students
      const attemptsPromise = adminApi<Attempt[]>("/api/admin/learning/attempts").then((a) => {
        setAttempts(a);
        setAttemptsLoading(false);
        return a;
      });

      // Phase 1: Core admin datasets
      const priorityPromise = Promise.all([
        adminApi<Student[]>("/api/admin/students"),
        adminApi<Quiz[]>("/api/admin/learning/quizzes"),
        attemptsPromise,
        adminApi<Array<{ id: number; title: string; category: string; stages?: string[] }>>("/api/courses"),
      ]);

      // Phase 2: Secondary datasets run concurrently in the background without blocking initial paint
      const secondaryPromise = Promise.all([
        adminApi<FileItem[]>("/api/admin/learning/files"),
        adminApi<VideoOption[]>("/api/videos"),
        adminApi<LearningAnalytics>("/api/admin/learning/analytics"),
        adminApi<RecoveryRequest[]>("/api/admin/recovery-requests"),
        adminApi<PaymentReceipt[]>("/api/admin/payment-receipts").catch((): PaymentReceipt[] => []),
      ]);

      const [s, q, , c] = await priorityPromise;
      setStudents(s);
      setQuizzes(q);
      setLearningCourses(c);
      setLoading(false);

      const [f, v, analyticsData, recoveryData, receiptsData] = await secondaryPromise;
      checkNotificationDeltas(s, recoveryData, receiptsData);

      setPaymentReceipts(receiptsData);
      setFiles(f);
      setAnalytics(analyticsData);
      setRecoveryRequests(recoveryData);
      setVideoOptions(v);
      setVideoCategories(
        Array.from(
          new Set(
            [
              ...v.map((item) => item.category),
              ...c.map((item) => item.title),
            ].filter(Boolean),
          ),
        ),
      );
      if (!silent) {
        toast({
          variant: "success",
          title: "تم تحديث البيانات",
          description: "تم تحديث إحصائيات المنصة وقائمة الطلاب بنجاح. 🔄",
        });
      }
    } catch (e) {
      if (!silent) {
        toast({
          variant: "destructive",
          title: "خطأ في التحديث",
          description: (e as Error).message,
        });
      }
    } finally {
      setAttemptsLoading(false);
      setLoading(false);
      if (!silent) setIsRefreshingData(false);
    }
  };

  const resolveRecoveryRequest = async (id: number) => {
    try {
      await adminApi(`/api/admin/recovery-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      });
      setRecoveryRequests((current) =>
        current.map((request) =>
          request.id === id ? { ...request, status: "resolved" } : request,
        ),
      );
      toast({ variant: "success", title: "تم إنهاء طلب استرجاع الكود" });
    } catch (error) {
      toast({ variant: "destructive", title: "تعذر تحديث الطلب", description: (error as Error).message });
    }
  };

  useEffect(() => {
    // First load: silent (no toast) — user just opened the admin panel
    void load(true);

    // Lightweight 30-second poller: checks fast SQL counts first (~3ms), and only pulls lists if pending counts changed
    const interval = setInterval(async () => {
      try {
        const counts = await adminApi<{
          pendingReceipts?: number;
          pendingStudents?: number;
          pendingRecovery?: number;
        }>("/api/admin/learning/counts");

        const prev = lastCountsRef.current;
        const changed =
          prev.pendingReceipts === null ||
          (counts.pendingReceipts ?? 0) !== prev.pendingReceipts ||
          (counts.pendingStudents ?? 0) !== prev.pendingStudents ||
          (counts.pendingRecovery ?? 0) !== prev.pendingRecovery;

        if (changed) {
          const [s, recoveryData, receiptsData] = await Promise.all([
            adminApi<Student[]>("/api/admin/students"),
            adminApi<RecoveryRequest[]>("/api/admin/recovery-requests"),
            adminApi<PaymentReceipt[]>("/api/admin/payment-receipts").catch((): PaymentReceipt[] => []),
          ]);
          checkNotificationDeltas(s, recoveryData, receiptsData);
          setStudents(s);
          setRecoveryRequests(recoveryData);
          setPaymentReceipts(receiptsData);
        }
      } catch {
        // Ignore transient background poll errors
      }
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);
  const updateStudent = (id: number, status: string) => {
    const studentObj = students.find((s) => s.id === id);
    const studentName = studentObj ? studentObj.name : `طالب #${id}`;
    const actionText = status === "approved" ? "تفعيل وتأكيد حساب" : "إيقاف / تعليق حساب";
    confirmAction({
      title: status === "approved" ? "قبول وتأكيد الطالب 🟢" : "تعليق حساب الطالب ⚠️",
      message: `هل أنت متأكد من ${actionText} الطالب (${studentName})؟`,
      confirmText: status === "approved" ? "تأكيد القبول" : "تعليق الحساب",
      variant: status === "approved" ? "default" : "warning",
      onConfirm: async () => {
        try {
          const updated = await adminApi<Student>(`/api/admin/students/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status, paymentStatus: status === "approved" ? "paid" : undefined }),
          });
          setStudents(prev => prev.map((s) => (s.id === id ? updated : s)));
          toast({
            title: status === "approved" ? "تم قبول الطالب وإصدار الكود" : "تم تحديث حالة الطالب",
          });
        } catch (e) {
          toast({ variant: "destructive", description: (e as Error).message });
        }
      },
    });
  };
  const updateStudentsBulk = async (studentIds: number[] | "all", status: "approved" | "suspended" | "pending") => {
    try {
      await adminApi("/api/admin/students/bulk-status", {
        method: "POST",
        body: JSON.stringify({ studentIds, status }),
      });
      setStudents((prev) =>
        prev.map((s) =>
          studentIds === "all" || (Array.isArray(studentIds) && studentIds.includes(s.id))
            ? { ...s, status: status as any }
            : s
        )
      );
      toast({
        title: status === "suspended" ? "تم إيقاف حسابات الطلاب 🔒" : "تم تفعيل حسابات الطلاب 🟢",
        description: status === "suspended" ? "تم إيقاف وصول الطلاب المحددين للمنصة بنجاح." : "تم التفعيل بنجاح.",
      });
    } catch (e) {
      toast({ variant: "destructive", description: (e as Error).message });
    }
  };
  const updateStudentCourses = async (
    student: Student,
    enrolledCourseIds: number[],
  ) => {
    try {
      const enrolledCategories = learningCourses
        .filter((course) => enrolledCourseIds.includes(course.id))
        .map((course) => course.title);
      const updated = await adminApi<Student>(
        `/api/admin/students/${student.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enrolledCourseIds, enrolledCategories }),
        },
      );
      setStudents((prev) => prev.map((s) => (s.id === student.id ? updated : s)));
      toast({ title: "تم تحديث كورسات الطالب" });
    } catch (e) {
      toast({ variant: "destructive", description: (e as Error).message });
    }
  };
  const updateStudentMode = (
    student: Student,
    learningMode: "online" | "offline",
  ) => {
    const modeLabel = learningMode === "online" ? "أونلاين" : "أوفلاين (سنتر)";
    confirmAction({
      title: "تغيير نظام الدراسة 💻",
      message: `هل أنت متأكد من تغيير نظام دراسة الطالب (${student.name}) إلى [${modeLabel}]؟`,
      confirmText: "تأكيد التغيير",
      onConfirm: async () => {
        try {
          const updated = await adminApi<Student>(
            `/api/admin/students/${student.id}`,
            { method: "PATCH", body: JSON.stringify({ learningMode }) },
          );
          setStudents(prev => prev.map((s) => (s.id === student.id ? updated : s)));
          toast({
            title: `تم تحويل الطالب لنظام ${learningMode === "online" ? "أونلاين" : "أوفلاين"}`,
          });
        } catch (e) {
          toast({ variant: "destructive", description: (e as Error).message });
        }
      },
    });
  };
  const updateStudentPaymentStatus = (
    student: Student,
    paymentStatus: string,
  ) => {
    const statusLabel = paymentStatus === "paid" ? "مدفوع ومفعّل" : paymentStatus === "pending_review" ? "قيد المراجعة" : "غير مدفوع";
    confirmAction({
      title: "تحديث حالة الاشتراك والدفع 💳",
      message: `هل أنت متأكد من تغيير حالة الاشتراك والدفع للطالب (${student.name}) إلى [${statusLabel}]؟`,
      confirmText: "تحديث الاشتراك",
      onConfirm: async () => {
        try {
          const updated = await adminApi<Student>(
            `/api/admin/students/${student.id}`,
            { method: "PATCH", body: JSON.stringify({ paymentStatus }) },
          );
          setStudents(prev => prev.map((s) => (s.id === student.id ? updated : s)));
          toast({
            title: paymentStatus === "paid" ? "تم تفعيل الاشتراك المدفوع للطالب 💳" : paymentStatus === "pending_review" ? "حالة الإيصال قيد المراجعة ⏳" : "تم إلغاء تفعيل الاشتراك (مجاني)",
          });
        } catch (e) {
          toast({ variant: "destructive", description: (e as Error).message });
        }
      },
    });
  };
  const deleteStudent = (id: number) => {
    const removedStudent = students.find((student) => student.id === id);
    confirmAction({
      title: "حذف حساب الطالب نهائيًا 🚨",
      message: `هل أنت متأكد من حذف حساب الطالب (${removedStudent?.name || "هذا الطالب"}) وكل محاولاته وبياناته نهائيًا؟`,
      confirmText: "نعم، حذف الحساب",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await adminApi(`/api/admin/students/${id}`, { method: "DELETE" });
          setStudents(prev => prev.filter((s) => s.id !== id));
          toast({ title: "تم حذف حساب الطالب بنجاح" });
        } catch {
          toast({ title: "خطأ في حذف الطالب", variant: "destructive" });
        }
      },
    });
  };
  const selectLearningFile = async (file: File | null) => {
    setIsFileDragging(false);
    setFileValidationError("");
    setFileOptimization(null);
    if (!file) return;
    const allowedExtensions = ["pdf", "doc", "docx", "zip", "ppt", "pptx", "txt", "jpg", "jpeg", "png", "webp"];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(extension)) {
      setFileValidationError("صيغة الملف غير مدعومة. استخدم PDF أو Office أو ZIP أو صورة.");
      return;
    }
    if (file.size > 150 * 1024 * 1024) {
      setFileValidationError("حجم الملف أكبر من 150 MB. اضغط الملف ثم حاول مرة أخرى.");
      return;
    }
    const optimizedFile = await optimizeLearningImage(file).catch(() => file);
    setFileOptimization(optimizedFile.size < file.size ? { before: file.size, after: optimizedFile.size } : null);
    setFileForm((current) => ({
      ...current,
      file: optimizedFile,
      title: current.title || file.name.replace(/\.[^.]+$/, ""),
    }));
    setShowFilePreview(false);
  };
  const uploadFile = async (isPublished: boolean) => {
    const hasTarget = fileForm.targetType === "videos"
      ? fileForm.videoIds.length > 0
      : Boolean(getTrack(fileForm.category)) && fileForm.stages.length > 0;
    if (!fileForm.file) {
      toast({
        variant: "destructive",
        description: "اختر الملف الذي تريد رفعه أولًا.",
      });
      return;
    }
    if (!fileForm.title.trim()) {
      toast({ variant: "destructive", description: "اكتب اسمًا واضحًا للملف." });
      return;
    }
    if (!hasTarget) {
      toast({
        variant: "destructive",
        description: fileForm.targetType === "videos"
          ? "اختر درسًا واحدًا على الأقل لربط الملف به."
          : "اختر القسم التعليمي ومرحلة واحدة على الأقل.",
      });
      return;
    }
    const duplicate = files.find(
      (file) =>
        file.originalName.toLowerCase() === fileForm.file?.name.toLowerCase() &&
        file.targetType === fileForm.targetType &&
        (fileForm.targetType === "videos"
          ? (file.videoIds || []).some((id) => fileForm.videoIds.includes(String(id)))
          : file.category === fileForm.category &&
            (file.stages || (file.stage ? [file.stage] : [])).some((stage) => fileForm.stages.includes(stage))),
    );
    if (duplicate) {
      toast({
        variant: "destructive",
        title: "الملف مرفوع قبل كده",
        description: `موجود باسم «${duplicate.title}». غيّر الملف أو احذف النسخة القديمة.`,
      });
      return;
    }
    setIsUploadingFile(true);
    setUploadProgress(0);
    const body = new FormData();
    body.append("title", fileForm.title);
    body.append("stage", fileForm.stage);
    body.append("stages", fileForm.stages.join(","));
    body.append("targetType", fileForm.targetType);
    body.append("videoIds", fileForm.videoIds.join(","));
    body.append("category", fileForm.category);
    body.append("courseId", fileForm.courseId);
    body.append("unit", fileForm.unit || "");
    body.append("lesson", fileForm.lesson || "");
    body.append("subject", fileForm.subject);
    body.append("tags", fileForm.tags);
    body.append("order", String(fileForm.order));
    body.append("description", fileForm.description);
    body.append("isPublished", String(isPublished));
    body.append("file", fileForm.file);
    try {
      const created = await new Promise<FileItem>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/admin/learning/files");
        request.withCredentials = true;
        request.upload.onprogress = (event) => {
          if (event.lengthComputable)
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
        };
        request.onload = () => {
          let data: unknown = null;
          try {
            data = JSON.parse(request.responseText || "{}");
          } catch {
            data = null;
          }
          if (request.status >= 200 && request.status < 300 && data) {
            resolve(data as FileItem);
            return;
          }
          if (request.status === 413) {
            reject(new Error("حجم الملف أكبر من الحد المسموح على السيرفر. اضغطه أو اختر ملفًا أصغر."));
            return;
          }
          const message = data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : `تعذر رفع الملف (${request.status || "خطأ اتصال"})`;
          reject(new Error(message));
        };
        request.onerror = () =>
          reject(new Error("تعذر الاتصال أثناء رفع الملف"));
        request.onabort = () => reject(new Error("تم إلغاء رفع الملف قبل اكتماله"));
        request.ontimeout = () => reject(new Error("استغرق رفع الملف وقتًا طويلًا. تحقق من الاتصال ثم حاول مرة أخرى"));
        request.timeout = 10 * 60 * 1000;
        request.send(body);
      });
      setFiles((current) => [created, ...current]);
      setFileForm((current) => ({
        ...current,
        title: "",
        category: "",
        courseId: "",
        stage: "",
        stages: [],
        videoIds: [],
        subject: "",
        tags: "",
        order: 1,
        description: "",
        file: null,
      }));
      setLessonSearch("");
      setLessonCourseFilter("");
      setLessonStageFilter("");
      setFileOptimization(null);
      setShowFilePreview(false);
      toast({
        title: isPublished ? "تم رفع ونشر الملف" : "تم حفظ الملف كمسودة",
        description: "تم ربط الملف بالمكان الذي اخترته بنجاح.",
      });
    } catch (e) {
      toast({ variant: "destructive", description: (e as Error).message });
    } finally {
      setIsUploadingFile(false);
      setUploadProgress(0);
    }
  };
  const deleteFile = async (id: number) => {
    if (!confirm("متأكد إنك عايز تحذف الملف نهائيًا؟")) return;
    try {
      await adminApi(`/api/admin/learning/files/${id}`, { method: "DELETE" });
      setFiles(prev => prev.filter((f) => f.id !== id));
    } catch {
      toast({ title: "خطأ في حذف الملف", variant: "destructive" });
    }
  };
  const toggleFile = async (file: FileItem) => {
    const updated = await adminApi<FileItem>(
      `/api/admin/learning/files/${file.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !file.isPublished }),
      },
    );
    setFiles(prev => prev.map((f) => (f.id === file.id ? updated : f)));
  };
  const editFile = async (file: FileItem) => {
    const linkedCourse = learningCourses.find((course) => course.id === file.courseId);
    const fileTrack = getTrack(linkedCourse?.category || file.category);
    setEditingFile({
      ...file,
      category: fileTrack?.id || file.category,
      courseId: null,
      targetType: file.targetType || (file.videoIds?.length ? "videos" : "stages"),
      stages: file.stages?.length ? file.stages : file.stage ? [file.stage] : [],
      videoIds: file.videoIds || [],
    });
  };
  const saveEditedFile = async () => {
    if (!editingFile) return;
    if (!editingFile.title.trim()) {
      toast({ variant: "destructive", description: "اكتب اسمًا واضحًا للملف." });
      return;
    }
    if (editingFile.targetType === "videos" && !editingFile.videoIds?.length) {
      toast({ variant: "destructive", description: "اختر درسًا واحدًا على الأقل." });
      return;
    }
    const isCourseTargeted = Boolean(editingFile.courseId);
    if (editingFile.targetType !== "videos" && !isCourseTargeted && (!getTrack(editingFile.category) || !editingFile.stages?.length)) {
      toast({ variant: "destructive", description: "اختر القسم التعليمي ومرحلة واحدة على الأقل أو حدد كورس." });
      return;
    }
    const editingCategory = editingFile.targetType === "videos"
      ? videoOptions.find((video) => editingFile.videoIds?.includes(video.id))?.category || editingFile.category
      : editingFile.category;
    const updated = await adminApi<FileItem>(
      `/api/admin/learning/files/${editingFile.id}`,
      { method: "PATCH", body: JSON.stringify({
        title: editingFile.title,
        unit: editingFile.unit ? editingFile.unit.trim() : null,
        lesson: editingFile.lesson ? editingFile.lesson.trim() : null,
        targetType: editingFile.targetType || "stages",
        courseId: editingFile.courseId,
        subject: editingFile.subject || (learningCourses.find(c => c.id === editingFile.courseId)?.title) || "الحاسب الآلي والذكاء الاصطناعي",
        category: editingCategory,
        stages: editingFile.stages || [],
        videoIds: editingFile.videoIds || [],
      }) },
    );
    setFiles(prev => prev.map((item) => (item.id === editingFile.id ? { ...updated, videoIds: editingFile.videoIds } : item)));
    setEditingFile(null);
    toast({ title: "تم تحديث مكان ظهور الملف" });
  };
  const createQuiz = async (e: React.FormEvent, publishOverride?: boolean): Promise<boolean> => {
    e.preventDefault();
    if (!quizForm.title.trim()) {
      toast({ variant: "destructive", description: "اسم الاختبار مطلوب." });
      return false;
    }
    if (!quizForm.courseId || quizForm.stages.length === 0 || (quizForm.scope === "lesson" && !quizForm.videoId)) {
      toast({ variant: "destructive", description: "اختر الدفعة المستهدفة بالأعلى أولاً، وحدد الدرس إذا كان الاختبار تابعًا لدرس." });
      return false;
    }
    if (!quizForm.questions || quizForm.questions.length === 0 || quizForm.questions.some((q) => !(q as Question).prompt?.trim())) {
      toast({ variant: "destructive", description: "أضف سؤالًا واحدًا على الأقل، وتأكد أن جميع نصوص الأسئلة مكتوبة." });
      return false;
    }
    const wasEditing = editingQuizId !== null;
    const effectivePublished = typeof publishOverride === "boolean" ? publishOverride : quizForm.isPublished;
    try {
      const payload = {
        ...quizForm,
        isPublished: effectivePublished,
        courseId: Number(quizForm.courseId),
        videoId: quizForm.scope === "lesson" && quizForm.videoId ? Number(quizForm.videoId) : null,
        durationMinutes: quizForm.durationMinutes ? Number(quizForm.durationMinutes) : null,
        questionsToShow: quizForm.questionsToShow ? Number(quizForm.questionsToShow) : null,
      };
      const created = await adminApi<Quiz>(editingQuizId ? `/api/admin/learning/quizzes/${editingQuizId}` : "/api/admin/learning/quizzes", {
        method: editingQuizId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setQuizzes(prev => editingQuizId ? prev.map((quiz) => quiz.id === editingQuizId ? { ...created, attemptsCount: quiz.attemptsCount, uniqueStudentsCount: quiz.uniqueStudentsCount } : quiz) : [created, ...prev]);
      resetQuizForm();
      toast({ title: wasEditing ? "تم تحديث الاختبار بنجاح" : effectivePublished ? "تم نشر الامتحان للطلاب بنجاح" : "تم حفظ الاختبار كمسودة" });
      return true;
    } catch (e) {
      toast({ variant: "destructive", description: (e as Error).message });
      return false;
    }
  };
  const editQuiz = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setQuizForm({
      title: quiz.title,
      courseId: quiz.courseId ? String(quiz.courseId) : "",
      videoId: quiz.videoId ? String(quiz.videoId) : "",
      scope: quiz.scope || (quiz.videoId ? "lesson" : "course"),
      category: quiz.category,
      stage: quiz.stage || "",
      stages: quiz.stages?.length ? quiz.stages : quiz.stage ? [quiz.stage] : [],
      description: quiz.description || "",
      durationMinutes: quiz.durationMinutes ? String(quiz.durationMinutes) : "",
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts ?? 3,
      requiredProgress: quiz.requiredProgress ?? 80,
      questionsToShow: quiz.questionsToShow ?? null,
      shuffleQuestions: quiz.shuffleQuestions ?? false,
      showExplanations: quiz.showExplanations ?? true,
      isPublished: quiz.isPublished,
      questions: quiz.questions.map((question) => ({
        ...question,
        options: [...question.options],
        explanation: question.explanation || "",
        imageUrl: question.imageUrl || "",
      })),
    });
  };
  const deleteQuiz = async (id: number) => {
    if (!confirm("متأكد إنك عايز تحذف الاختبار نهائيًا؟")) return;
    try {
      await adminApi(`/api/admin/learning/quizzes/${id}`, { method: "DELETE" });
      setQuizzes(prev => prev.filter((q) => q.id !== id));
    } catch (err) {
      toast({ title: "خطأ في حذف الاختبار", description: (err as Error).message, variant: "destructive" });
    }
  };
  const toggleQuiz = async (quiz: Quiz) => {
    try {
      const updated = await adminApi<Quiz>(
        `/api/admin/learning/quizzes/${quiz.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isPublished: !quiz.isPublished }),
        },
      );
      setQuizzes(prev => prev.map((q) => (q.id === quiz.id ? { ...updated, attemptsCount: q.attemptsCount, uniqueStudentsCount: q.uniqueStudentsCount } : q)));
      toast({ title: updated.isPublished ? "تم نشر الاختبار للطلاب" : "تم إخفاء الاختبار ونقله للمسودات" });
    } catch (err: any) {
      toast({ title: "خطأ في تحديث الاختبار", description: err.message, variant: "destructive" });
    }
  };
  const setQuestion = (index: number, patch: Partial<Question>) =>
    setQuizForm(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, ...patch } : q,
      ),
    }));
  const duplicateQuestion = (index: number) => {
    setQuizForm(prev => {
      const question = prev.questions[index];
      return {
        ...prev,
        questions: [
          ...prev.questions.slice(0, index + 1),
          { ...question, options: [...question.options] },
          ...prev.questions.slice(index + 1),
        ],
      };
    });
    setCollapsedQuestions(new Set());
  };
  const toggleQuestion = (index: number) => {
    setCollapsedQuestions((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const availableCategories = Array.from(
    new Set([
      ...videoCategories,
      ...files.map((file) => file.category),
      ...quizzes.map((quiz) => quiz.category),
    ]),
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ar"));
  const selectedFileTrack = getTrack(fileForm.category);
  const availableFileStages = selectedFileTrack?.stages ?? [];
  const fileStageGroups = selectedFileTrack?.id === "baccalaureate"
    ? [
        { title: "البكالوريا", stages: availableFileStages.filter((stage) => stage.startsWith("البكالوريا")) },
        { title: "الثانوية العامة", stages: availableFileStages.filter((stage) => stage.startsWith("الثانوية العامة")) },
      ]
    : selectedFileTrack
      ? [{ title: selectedFileTrack.shortTitle, stages: availableFileStages }]
      : [];
  const visibleFileStageGroups = fileStageGroups
    .map((group) => ({ ...group, stages: group.stages.filter((stage) => stage.toLocaleLowerCase("ar").includes(fileStageSearch.trim().toLocaleLowerCase("ar"))) }))
    .filter((group) => group.stages.length > 0);
  const filteredLessonOptions = useMemo(() => {
    const query = lessonSearch.trim().toLowerCase();
    return videoOptions.filter((video) => {
      const videoStages = video.stages?.length ? video.stages : video.stage ? [video.stage] : [];
      return (
        (!lessonCourseFilter || String(video.courseId || "") === lessonCourseFilter) &&
        (!lessonStageFilter || videoStages.includes(lessonStageFilter)) &&
        (!query || video.title.toLowerCase().includes(query) || video.category.toLowerCase().includes(query))
      );
    });
  }, [videoOptions, lessonCourseFilter, lessonStageFilter, lessonSearch]);
  const selectedLessonCourse = learningCourses.find((course) => String(course.id) === lessonCourseFilter);
  const availableLessonStages = selectedLessonCourse?.stages?.length
    ? selectedLessonCourse.stages
    : getStagesForTrack(selectedLessonCourse?.category);
  const fileDestinationReady = fileForm.targetType === "videos"
    ? fileForm.videoIds.length > 0
    : Boolean(selectedFileTrack) && fileForm.stages.length > 0;
  const destinationSummary = fileForm.targetType === "videos"
    ? fileForm.videoIds.length
      ? `مرفق داخل ${fileForm.videoIds.length} ${fileForm.videoIds.length === 1 ? "درس" : "دروس"}`
      : "لم تختر درسًا بعد"
    : selectedFileTrack && fileForm.stages.length
      ? `${selectedFileTrack.title} ← ${fileForm.stages.join("، ")}`
      : "لم تحدد القسم والمراحل بعد";
  const selectedQuizCourse = learningCourses.find(
    (course) => String(course.id) === quizForm.courseId,
  );
  const selectedQuizTrack = getTrack(selectedQuizCourse?.category);
  const availableQuizStages = selectedQuizCourse?.stages?.length
    ? selectedQuizCourse.stages
    : selectedQuizCourse
      ? getStagesForTrack(selectedQuizCourse.category)
      : ACADEMIC_TRACKS.flatMap((track) => track.stages);
  const quizStageGroups = selectedQuizTrack?.id === "baccalaureate" || (!selectedQuizCourse && ACADEMIC_TRACKS.some((t) => t.id === "baccalaureate"))
    ? [
        { title: "البكالوريا", stages: availableQuizStages.filter((stage) => stage.startsWith("البكالوريا")) },
        { title: "الثانوية العامة", stages: availableQuizStages.filter((stage) => stage.startsWith("الثانوية العامة")) },
        { title: "الكليات والجامعات", stages: availableQuizStages.filter((stage) => stage.includes("كلية") || stage.includes("جامعة") || stage.includes("الفرقة")) },
      ]
    : selectedQuizTrack
      ? [{ title: selectedQuizTrack.shortTitle, stages: availableQuizStages }]
      : availableQuizStages.length ? [{ title: selectedQuizCourse?.title || "المراحل المتاحة", stages: availableQuizStages }] : [];
  const visibleQuizStageGroups = quizStageGroups
    .map((group) => ({ ...group, stages: group.stages.filter((stage) => stage.toLocaleLowerCase("ar").includes(quizStageSearch.trim().toLocaleLowerCase("ar"))) }))
    .filter((group) => group.stages.length > 0);
  const filteredFiles = useMemo(
    () =>
      files.filter((file) => {
        const query = fileSearch.trim().toLowerCase();
        const matchesSearch =
          !query ||
          file.title.toLowerCase().includes(query) ||
          file.originalName.toLowerCase().includes(query);
        return (
          matchesSearch &&
          (fileCourseFilter === "all" || file.category === fileCourseFilter) &&
          (fileStageFilter === "all" ||
            (file.stages?.length ? file.stages : [file.stage || "غير محدد"]).includes(fileStageFilter)) &&
          (fileStatusFilter === "all" ||
            (fileStatusFilter === "published"
              ? file.isPublished
              : !file.isPublished))
        );
      }),
    [files, fileSearch, fileCourseFilter, fileStageFilter, fileStatusFilter],
  );
  const studentStages = Array.from(new Set(students.map((student) =>
    student.grade === "أخرى" ? student.otherGradeDetail || student.grade : student.grade,
  ).filter(Boolean) as string[]));
  const studentDistribution = useMemo(() => {
    const normalize = (value?: string | null) => String(value || "").trim().toLocaleLowerCase("ar");
    const stageMap = new Map<string, Student[]>();
    for (const student of students) {
      const stage = student.grade === "أخرى"
        ? student.otherGradeDetail?.trim() || "مرحلة غير محددة"
        : student.grade?.trim() || "مرحلة غير محددة";
      stageMap.set(stage, [...(stageMap.get(stage) || []), student]);
    }

    const stages = Array.from(stageMap, ([name, members]) => ({
      name,
      count: members.length,
      paid: members.filter((student) => student.paymentStatus === "paid").length,
      online: members.filter((student) => student.learningMode !== "offline").length,
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ar"));

    const courses = learningCourses.map((course) => {
      const members = students.filter((student) => {
        const assignedIds = new Set(student.enrolledCourseIds || []);
        const assignedNames = new Set((student.enrolledCategories || []).map(normalize));
        return assignedIds.has(course.id) || assignedNames.has(normalize(course.title)) || assignedNames.has(normalize(course.category));
      });
      return {
        id: course.id,
        title: course.title,
        stages: course.stages || [],
        count: members.length,
        paid: members.filter((student) => student.paymentStatus === "paid").length,
        active: members.filter((student) => student.status === "approved").length,
      };
    }).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "ar"));

    return { stages, courses };
  }, [students, learningCourses]);
  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLocaleLowerCase("ar");
    return students.filter((student) => {
      const assignedCourseNames = learningCourses
        .filter((course) => (student.enrolledCourseIds || []).includes(course.id))
        .map((course) => course.title);
      const searchable = [student.name, student.phone, student.email, student.accessCode, ...(student.enrolledCategories || []), ...assignedCourseNames];
      const effectiveStage = student.grade === "أخرى" ? student.otherGradeDetail || student.grade : student.grade;
      return (
        (!query || searchable.some((value) => String(value || "").toLocaleLowerCase("ar").includes(query))) &&
        (studentStatusFilter === "all" || student.status === studentStatusFilter) &&
        (studentStageFilter === "all" || effectiveStage === studentStageFilter) &&
        (studentPaymentFilter === "all" || student.paymentStatus === studentPaymentFilter)
      );
    });
  }, [students, learningCourses, studentSearch, studentStatusFilter, studentStageFilter, studentPaymentFilter]);
  const filteredAttempts = attempts.filter((attempt) => {
    const query = resultSearch.trim().toLocaleLowerCase("ar");
    return !query || attempt.studentName.toLocaleLowerCase("ar").includes(query) || attempt.quizTitle.toLocaleLowerCase("ar").includes(query);
  });
  const exportResults = () => {
    const rows = [["الطالب", "الاختبار", "النتيجة", "الحالة", "التاريخ"], ...filteredAttempts.map((attempt) => [attempt.studentName, attempt.quizTitle, `${attempt.score}%`, attempt.passed ? "ناجح" : "لم ينجح", new Date(attempt.createdAt).toLocaleDateString("ar-EG")])];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `quiz-results-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
    URL.revokeObjectURL(url);
  };
  const filePageSize = 8;
  const filePageCount = Math.max(
    1,
    Math.ceil(filteredFiles.length / filePageSize),
  );
  const visibleFiles = filteredFiles.slice(
    (filePage - 1) * filePageSize,
    filePage * filePageSize,
  );
  useEffect(() => {
    setFilePage(1);
  }, [fileSearch, fileCourseFilter, fileStageFilter, fileStatusFilter]);
  type TabEntry = [string, string, React.ComponentType<{ className?: string; strokeWidth?: number }>];
  const allTabs: TabEntry[] = [
    ["overview", "اللوحة التشغيلية", LayoutDashboard],
    ["attendance", "تسجيل الحضور والـ Scan 📷", QrCode],
    ["center-bookings", "حجوزات السناتر", MapPin],
    ["students", "الطلاب", GraduationCap],
    ["summaries", "تلاخيص الطلاب 📝", FileText],
    ["grades-sheet", "شيت الدرجات 📊", FileSpreadsheet],
    ["subscriptions", "الاشتراكات الشهرية", CreditCard],
    ["payments", "إيصالات الدفع", FileCheck2],
    ["files", "الملفات", Folder],
    ["testbank", "بنك الأسئلة الشامل ومستودع المنهج 📚", BookOpen],
    ["kholasa", "الزتونات والخرائط 💎", Sparkles],
    ["memo-studio", "استوديو المذكرات والطباعة 🖨️", Printer],
    ["quizzes", "منظومة الامتحانات والمولد الذكي 🚀", ClipboardCheck],
    ["essay-exams", "تصحيح المقالي واستلام الإجابات ✍️", FileEdit],
    ["self-assessment-packs", "باقات التقييم الذاتي ⚡", Sparkles],
    ["notifications", "إرسال إشعار", Bell],
    ["reports", "التقارير", BarChart3],
  ];

  // Subadmin has access to student management, attendance scanner, daily reports & self-assessment packs
  const SUBADMIN_TABS = new Set(["attendance", "students", "center-bookings", "summaries", "grades-sheet", "subscriptions", "payments", "essay-exams", "reports", "self-assessment-packs"]);
  const tabs = role === "subadmin"
    ? allTabs.filter(([value]) => SUBADMIN_TABS.has(value))
    : allTabs;

  const pendingReceiptsCount = useMemo(() => {
    return paymentReceipts.filter((r) => r.status === "pending").length;
  }, [paymentReceipts]);
  const PILLAR_NAMES: Record<string, string> = {
    students: "👥 شؤون الطلاب والسناتر",
    attendance: "👥 شؤون الطلاب والسناتر",
    "center-bookings": "👥 شؤون الطلاب والسناتر",
    summaries: "👥 شؤون الطلاب والسناتر",
    testbank: "📝 بنك الأسئلة والتقييم",
    quizzes: "📝 بنك الأسئلة والتقييم",
    "memo-studio": "📝 بنك الأسئلة والتقييم",
    "essay-exams": "📝 بنك الأسئلة والتقييم",
    "grades-sheet": "📝 بنك الأسئلة والتقييم",
    curriculums: "📚 المحتوى والمناهج التعليمية",
    courses: "📚 المحتوى والمناهج التعليمية",
    videos: "📚 المحتوى والمناهج التعليمية",
    files: "📚 المحتوى والمناهج التعليمية",
    kholasa: "📚 المحتوى والمناهج التعليمية",
    payments: "💳 المالية والاشتراكات",
    subscriptions: "💳 المالية والاشتراكات",
    "self-assessment-packs": "💳 المالية والاشتراكات",
    overview: "⚙️ غرفة العمليات والإعدادات",
    notifications: "⚙️ غرفة العمليات والإعدادات",
    reports: "⚙️ غرفة العمليات والإعدادات",
  };

  const tabMeta: Record<string, [string, string]> = {
    overview: ["اللوحة التشغيلية وإحصائيات المنصة", "نظرة عامة على أعداد الطلاب، المشتركين، والتوزيع حسب المراحل والكورسات."],
    attendance: ["تسجيل الحضور والغياب اليومي (QR Code)", "مسح سريع لكود الطالب بالكاميرا، تسجيل الحضور فورياً، إشعار ولي الأمر، ويومية كاملة بالغياب."],
    students: ["إدارة جميع الطلاب", "راجع التسجيلات والصلاحيات والكورسات المخصصة لكل طالب."],
    summaries: ["مراجعة وتدقيق تلخيصات الدروس", "استعرض صور الكشكول المرفوعة من الطلاب واعتمدها أو أضف ملحوظات معلم."],
    "grades-sheet": ["شيت وقوائم درجات الطلاب في الاختبارات", "شيت تفاعلي كامل لعرض نتائج درجات الطلاب والفلترة الحية وتصدير شيت Excel."],
    "center-bookings": ["كشف وإدارة حجوزات السناتر", "جدول تفصيلي مخصص لمتابعة جميع الطلاب المسجلين بالسناتر والمواعيد الحضورية المحددة."],
    subscriptions: ["متابعة الاشتراكات الشهرية", "راقب حالة الاشتراكات الشهرية للطلاب وتجديدها والمتأخرات."],
    payments: ["إيصالات الدفع", "راجع إيصالات الدفع من الطلاب ووافق أو ارفض."],
    notifications: ["إرسال إشعار للطلاب", "أرسل تنبيهًا أو إشعارًا عامًا لجميع الطلاب أو مرحلة دراسية محددة."],
    files: ["مكتبة الملفات التعليمية", "ارفع الملفات وحدد مكان ظهورها للطلاب أو داخل الدروس."],
    testbank: ["بنك الأسئلة الشامل ومستودع المنهج", "مستودع الأسئلة المنظم هرمياً بالوحدات والدروس، وتصفح وإضافة واستيراد الأسئلة من ملفات Word و PDF."],
    kholasa: ["إدارة المحتوى والزتونة والأسئلة والاختبارات", "مركز موحد ومنظم لكل درس: الفيديو، التعريفات، الزتونة، الخرائط الذهنية، البطاقات، بنك الأسئلة، ورفع أو توليد الاختبارات."],
    "memo-studio": ["استوديو المذكرات والطباعة A4 الاحترافية", "صمم وطبّق هوامش وأغلفة المذكرات وحوّل أي درس أو اختبار لورقة A4 جاهزة للطباعة والتصدير PDF مع نسخة للطالب ونسخة للمعلم."],
    quizzes: ["منظومة الامتحانات والمولد الذكي", "توليد الامتحانات من بنك الأسئلة، طباعة أوراق A4 للسنتر، ومتابعة الاختبارات المنشورة ونسب نجاح الطلاب."],
    "essay-exams": ["تصحيح الامتحانات المقالية", "استلام إجابات الطلاب المصورة بالكاميرا، مراجعتها ورصد الدرجات والملاحظات."],
    reports: ["التقارير والمتابعة", "راقب نشاط الطلاب والتقدم ومؤشرات الأداء التعليمية."],
    "self-assessment-packs": ["إدارة وتفعيل باقات التقييم الذاتي (3 محاولات بـ 50 ج.م)", "متابعة طلبات الزوار وتفعيل باقات المحاولات فورياً للطلاب والزوار بمجرد تأكيد الدفع."],
  };
  return (
    <div className="admin-learning-workspace space-y-6 text-[#0F172A]" dir="rtl">
      {/* 1. Clean Enterprise Section Header & Breadcrumb */}
      {(() => {
        const urlMode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mode") : null;
        const urlStatus = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("status") : null;
        const activeTitle = tab === "students" && urlMode === "offline"
          ? "حجوزات السناتر والمواعيد (أوفلاين)"
          : tab === "students" && urlStatus === "pending"
          ? "الحجوزات والطلبات ينتظر التفعيل"
          : tabMeta[tab]?.[0] || tab;
        const activeSub = tab === "students" && urlMode === "offline"
          ? "سجل حجوزات وطلاب السناتر الحضورية بالزقازيق والمواعيد المحددة."
          : tab === "students" && urlStatus === "pending"
          ? "طلبات التسجيل الجديدة والاشتراكات المعلقة بانتظار تفعيل المشرف."
          : tabMeta[tab]?.[1] || "";
        const pillarName = PILLAR_NAMES[tab] || "لوحة الإدارة";

        return (
          <div className="no-print flex flex-col gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
                <span className="inline-flex items-center gap-1 text-[#2563EB] font-bold">
                  {pillarName}
                </span>
                <span className="text-[#94A3B8]">/</span>
                <span className="text-[#0F172A] font-bold">{activeTitle}</span>
              </div>
              <h2 className="text-xl font-black text-[#0F172A]">
                {activeTitle}
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B]">
                {activeSub}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {tab === "files" && (
                <Button
                  type="button"
                  onClick={() => {
                    setTimeout(
                      () =>
                        document
                          .getElementById("file-upload-form")
                          ?.scrollIntoView({ behavior: "smooth" }),
                      50,
                    );
                  }}
                  className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="h-4 w-4 ml-1" /> إضافة ملف تعليمي
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isRefreshingData}
                onClick={() => void load(false)}
                className="h-10 px-4 rounded-xl border-[#E2E8F0] bg-white hover:bg-[#F6F8FC] text-[#0F172A] text-xs font-semibold transition-all disabled:opacity-75 shadow-xs"
              >
                <RefreshCw className={`h-4 w-4 ml-1.5 text-[#64748B] ${isRefreshingData ? "animate-spin text-[#2563EB]" : ""}`} />
                {isRefreshingData ? "جاري التحديث..." : "تحديث البيانات"}
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Contextual Workspace Sub-Tabs Bar (1-click switching between related tools) */}
      {(() => {
        const activeGroup = WORKSPACE_SUBNAV_GROUPS.find((g) => g.tabs.some((t) => t.id === tab));
        if (!activeGroup) return null;
        return (
          <div className="no-print flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#E2E8F0] bg-white/90 p-1.5 shadow-2xs">
            {activeGroup.tabs.map((t) => {
              const isCurrent = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        );
      })()}

      {(tab === "grades-sheet" ? attemptsLoading : (loading && !SELF_CONTAINED_ADMIN_TABS.has(tab))) ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <Suspense fallback={<AdminTabFallback />}>
          {tab === "overview" && (
            <OverviewSection
              students={students as any}
              paymentReceipts={paymentReceipts}
              learningCourses={learningCourses}
              onNavigateToTab={(targetTab) => setTab(targetTab as any)}
              onSelectStageFilter={(filter) => {
                setTab("students");
                setStudentSearch("");
                setStudentStageFilter(filter);
              }}
              onSelectCourseFilter={(courseTitle) => {
                setTab("students");
                setStudentStageFilter("all");
                setStudentSearch(courseTitle);
              }}
            />
          )}
          {tab === "students" && (
            <div id="students-tab-section">
              <StudentsTab
              key={`${typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mode") || "all" : "all"}_${typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("status") || "all" : "all"}`}
              role={role}
              students={students}
              recoveryRequests={recoveryRequests}
              paymentReceipts={paymentReceipts}
              studentStages={studentStages}
              learningCourses={learningCourses}
              onUpdateStatus={async (id, status) => { await updateStudent(id, status); }}
              onUpdateStatusBulk={updateStudentsBulk}
              onUpdateMode={async (student, mode) => { await updateStudentMode(student, mode); }}
              onUpdatePaymentStatus={async (student, status) => { await updateStudentPaymentStatus(student, status); }}
              onUpdateStudentCourses={async (student, courseIds) => { await updateStudentCourses(student, courseIds); }}
              onDeleteStudent={async (id) => { await deleteStudent(id); }}
              onSetMaxDevices={async (s) => {
                const newMax = (s.maxDevices || 1) === 1 ? 2 : 1;
                try {
                  await adminApi(`/api/admin/students/${s.id}/set-max-devices`, {
                    method: "POST",
                    body: JSON.stringify({ maxDevices: newMax }),
                  });
                  toast({
                    title: newMax === 2 ? "تمت الموافقة والسماح بجهاز ثانٍ 📱📱" : "تم إلغاء تفعيل الجهاز الثاني 📱",
                    description: newMax === 2 ? `يمكن للطالب ${s.name} الآن تسجيل الدخول من جهازين في نفس الوقت.` : `تمت إعادة الحد الأقصى للطالب ${s.name} إلى جهاز واحد فقط.`,
                  });
                  setStudents((prev) => prev.map((item) => item.id === s.id ? { ...item, maxDevices: newMax } : item));
                } catch (err) {
                  toast({ variant: "destructive", description: (err as Error).message });
                }
              }}
              onResetDevice={async (s) => {
                if (!s.deviceId && (!s.boundDevices || s.boundDevices.length === 0)) return;
                try {
                  await adminApi(`/api/admin/students/${s.id}/reset-device`, { method: "POST" });
                  toast({ title: "تم فك وإلغاء قفل الأجهزة", description: `تمت إزالة ربط كافة الأجهزة للطالب ${s.name} بنجاح.` });
                  setStudents((prev) => prev.map((item) => item.id === s.id ? { ...item, deviceId: null, boundDevices: [] } : item));
                } catch (err) {
                  toast({ variant: "destructive", description: (err as Error).message });
                }
              }}
              onCopyStudentCode={(s) => copyStudentCode(s)}
              copiedStudentId={copiedStudentId}
              onNavigateToReports={() => setTab("reports")}
              onApproveReceipt={async (receiptId) => {
                try {
                  await adminApi(`/api/admin/payment-receipts/${receiptId}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: "approved" }),
                  });
                  toast({ title: "تم تأكيد الدفع وتفعيل الكورس للطالب 💳" });
                  void load(true); // silent refresh — don't show extra "تم تحديث البيانات" toast
                } catch (err) {
                  toast({ variant: "destructive", description: (err as Error).message });
                }
              }}
              onStudentUpdated={(updatedStudent) => {
                setStudents((prev) =>
                  prev.map((item) => (item.id === updatedStudent.id ? { ...item, ...updatedStudent } : item))
                );
              }}
            />
            </div>
          )}
          {tab === "attendance" && (
            <AttendanceScannerTab role={role} />
          )}
          {tab === "summaries" && (
            <StudentSummariesAdminTab role={role} />
          )}
          {tab === "grades-sheet" && (
            <StudentQuizGradesSheet
              attempts={attempts as any}
              stages={studentStages}
              quizzes={quizzes}
              onRefresh={refreshAttemptsOnly}
            />
          )}
          {tab === "center-bookings" && (
            <CenterBookingsTab
              role={role}
              students={students}
              learningCourses={learningCourses}
              onUpdateStatus={async (id, status) => { await updateStudent(id, status); }}
              onUpdatePaymentStatus={async (student, status) => { await updateStudentPaymentStatus(student, status); }}
              onUpdateMode={async (student, mode) => { await updateStudentMode(student, mode); }}
              onResetDevice={async (s) => {
                if (!s.deviceId && (!s.boundDevices || s.boundDevices.length === 0)) return;
                try {
                  await adminApi(`/api/admin/students/${s.id}/reset-device`, { method: "POST" });
                  toast({ title: "تم فك وإلغاء قفل الأجهزة", description: `تمت إزالة ربط كافة الأجهزة للطالب ${s.name} بنجاح.` });
                  setStudents((prev) => prev.map((item) => item.id === s.id ? { ...item, deviceId: null, boundDevices: [] } : item));
                } catch (err) {
                  toast({ variant: "destructive", description: (err as Error).message });
                }
              }}
              onSetMaxDevices={async (s) => {
                const newMax = s.maxDevices === 2 ? 1 : 2;
                try {
                  await adminApi(`/api/admin/students/${s.id}/set-max-devices`, {
                    method: "POST",
                    body: JSON.stringify({ maxDevices: newMax }),
                  });
                  toast({
                    title: newMax === 2 ? "تمت الموافقة والسماح بجهاز ثانٍ 📱📱" : "تم إلغاء تفعيل الجهاز الثاني 📱",
                  });
                  setStudents((prev) => prev.map((item) => item.id === s.id ? { ...item, maxDevices: newMax } : item));
                } catch (err) {
                  toast({ variant: "destructive", description: (err as Error).message });
                }
              }}
              onDeleteStudent={(id) => deleteStudent(id)}
              copiedStudentId={copiedStudentId}
              onCopyStudentCode={(s) => copyStudentCode(s)}
              onUpdateStudentCourses={async (s, ids) => { await updateStudentCourses(s, ids); }}
              onUpdateBooking={(id, data) => {
                setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
              }}
            />
          )}
          {tab === "subscriptions" && (
            <MonthlyPaymentsTab />
          )}
          {tab === "payments" && (
            <PaymentsTab receipts={paymentReceipts} onRefresh={load} role={role} />
          )}

          {tab === "notifications" && (
            <NotificationsTab
              students={students}
              onSend={async (form) => {
                try {
                  const result = await adminApi<{ count: number }>("/api/admin/notifications/broadcast", {
                    method: "POST",
                    body: JSON.stringify(form),
                  });
                  toast({
                    title: `تم إرسال الإشعار بنجاح لـ ${result.count} طالب 🎉`,
                  });
                } catch (e) {
                  toast({ variant: "destructive", description: (e as Error).message });
                }
              }}
            />
          )}
          {tab === "reports" && (
            <ReportsTab
              analytics={analytics as any}
              recoveryRequests={recoveryRequests}
              resolveRecoveryRequest={async (id) => {
                try {
                  await adminApi(`/api/admin/recovery-requests/${id}/resolve`, { method: "POST" });
                  toast({ title: "تم تحديث حالة طلب استرجاع الكود" });
                  void load(true);
                } catch (e) {
                  toast({ variant: "destructive", description: (e as Error).message });
                }
              }}
            />
          )}
          {tab === "files" && (
            <div className="space-y-6">
              <div className="mx-auto max-w-4xl">
                <form
                  id="file-upload-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void uploadFile(true);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"
                >
                  <div className="mb-6 border-b border-slate-100 pb-5">
                    <h3 className="text-xl font-black text-slate-900">
                      رفع ملف تعليمي جديد
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      حدد مكان الظهور، اختر الطلاب أو الدروس، ثم أضف الملف وانشره.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                      <span className="mb-1 block text-xs font-black text-primary">الخطوة 1</span>
                      <span className="mb-3 block text-base font-black text-slate-900">أين سيظهر الملف؟</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {([['stages', 'لطلاب كورس ومراحل', 'يظهر في مكتبة الملفات للطلاب المحددين'], ['videos', 'مرفق داخل درس', 'يظهر مع الفيديو داخل صفحة الدرس']] as const).map(([value, label, description]) => (
                          <button key={value} type="button" onClick={() => setFileForm({
                            ...fileForm,
                            targetType: value,
                            stages: [],
                            stage: "",
                            videoIds: [],
                            ...(value === "videos" ? { category: "", courseId: "" } : {}),
                          })}
                            className={`rounded-xl border p-4 text-right transition ${fileForm.targetType === value ? 'border-primary bg-white text-primary ring-2 ring-primary/10' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                            <strong className="block text-sm">{label}</strong>
                            <span className="mt-1 block text-xs font-normal text-slate-500">{description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {fileForm.targetType === "videos" && <div className="md:col-span-2">
                      <span className="mb-1 block text-xs font-black text-primary">الخطوة 2</span>
                      <span className="mb-3 block text-base font-black text-slate-900">اختر الدروس المرتبطة</span>
                      <div className="mb-3 grid gap-2 sm:grid-cols-3">
                        <select
                          value={lessonCourseFilter}
                          onChange={(event) => {
                            setLessonCourseFilter(event.target.value);
                            setLessonStageFilter("");
                          }}
                          className="input-admin min-h-11"
                        >
                          <option value="">كل الكورسات</option>
                          {learningCourses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                        </select>
                        <select
                          value={lessonStageFilter}
                          onChange={(event) => setLessonStageFilter(event.target.value)}
                          disabled={!lessonCourseFilter}
                          className="input-admin min-h-11 disabled:bg-slate-100"
                        >
                          <option value="">كل المراحل</option>
                          {availableLessonStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                        <label className="relative">
                          <Search className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                          <input value={lessonSearch} onChange={(event) => setLessonSearch(event.target.value)} placeholder="ابحث عن درس..." className="input-admin min-h-11 pr-9" />
                        </label>
                      </div>
                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                        {filteredLessonOptions.map((video) => {
                          const id = String(video.id);
                          const checked = fileForm.videoIds.includes(id);
                          return <label key={video.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
                            <input className="mt-1" type="checkbox" checked={checked} onChange={() => {
                              const videoIds = checked ? fileForm.videoIds.filter((item) => item !== id) : [...fileForm.videoIds, id];
                              const firstVideo = videoOptions.find((item) => videoIds.includes(String(item.id)));
                              setFileForm({ ...fileForm, videoIds, category: firstVideo?.category || "" });
                            }} />
                            <span className="min-w-0"><strong className="block truncate text-sm">{video.title}</strong><small className="text-slate-500">{video.category}{video.stage ? ` · ${video.stage}` : ""}</small></span>
                          </label>;
                        })}
                        {!filteredLessonOptions.length && <p className="py-5 text-center text-sm text-slate-500">لا توجد دروس مطابقة للفلاتر الحالية.</p>}
                      </div>
                      {fileForm.videoIds.length > 0 && <p className="mt-2 text-xs font-bold text-primary">تم اختيار {fileForm.videoIds.length} {fileForm.videoIds.length === 1 ? "درس" : "دروس"}</p>}
                    </div>}
                    {fileForm.targetType === "stages" && <>
                    <div className="md:col-span-2">
                      <span className="block text-xs font-black text-primary">الخطوة 2</span>
                      <span className="block text-base font-black text-slate-900">حدد الكورس والقسم والمراحل</span>
                      <p className="mt-1 text-xs text-slate-500">اختر الكورس التابع له الملف ثم حدد مراحل القسم الدراسي.</p>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="الكورس التابع له الملف 📚">
                        <select
                          value={fileForm.courseId}
                          onChange={(e) => {
                            setFileForm({
                              ...fileForm,
                              courseId: e.target.value,
                            });
                          }}
                          className="input-admin min-h-12 border-slate-300 focus:border-primary font-bold text-sm"
                        >
                          <option value="">-- اختياري: اختر الكورس التابع له الملف --</option>
                          {learningCourses.map((c) => (
                            <option key={c.id} value={c.id}>
                              📚 {c.title}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="md:col-span-2 grid gap-2 sm:grid-cols-3">
                      {ACADEMIC_TRACKS.map((track) => {
                        const selected = selectedFileTrack?.id === track.id;
                        return <button
                          key={track.id}
                          type="button"
                          onClick={() => setFileForm({
                            ...fileForm,
                            category: track.id,
                            courseId: "",
                            stage: "",
                            stages: [],
                          })}
                          className={`rounded-xl border p-4 text-right transition ${selected ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/10" : "border-slate-200 bg-white text-slate-700 hover:border-primary/50"}`}
                        >
                          <strong className="block text-sm">{track.title}</strong>
                          <span className="mt-1 block text-xs font-normal text-slate-500">{track.eyebrow}</span>
                        </button>;
                      })}
                    </div>
                    <div className="md:col-span-2">
                    <Field label="المراحل التي سيظهر لها الملف">
                      <div className="min-h-12 rounded-xl border border-slate-300 bg-white p-3">
                        {!selectedFileTrack && <span className="p-1 text-sm text-slate-400">اختر القسم التعليمي أولًا</span>}
                        {selectedFileTrack && availableFileStages.length > 5 && <div className="relative mb-3"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input value={fileStageSearch} onChange={(event) => setFileStageSearch(event.target.value)} placeholder="ابحث داخل مراحل القسم..." className="input-admin min-h-10 pr-9 text-xs" /></div>}
                        {fileForm.stages.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3"><span className="ml-1 text-[11px] font-bold text-slate-500">المحدد ({fileForm.stages.length}):</span>{fileForm.stages.slice(0, 4).map((stage) => <span key={stage} className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{stage}</span>)}{fileForm.stages.length > 4 && <span className="text-[11px] font-bold text-slate-500">+{fileForm.stages.length - 4}</span>}</div>}
                        <div className="flex flex-wrap gap-2">
                        {selectedFileTrack && <button
                          type="button"
                          onClick={() => {
                            const allSelected = availableFileStages.every((stage) => fileForm.stages.includes(stage));
                            const stages = allSelected ? [] : [...availableFileStages];
                            setFileForm({ ...fileForm, stages, stage: stages[0] || "" });
                          }}
                          className="rounded-lg border border-dashed border-primary px-3 py-2 text-xs font-black text-primary"
                        >
                          {availableFileStages.every((stage) => fileForm.stages.includes(stage)) ? "إلغاء تحديد الكل" : "تحديد كل مراحل القسم"}
                        </button>}
                        {visibleFileStageGroups.map((group) => <details key={group.title} open className="w-full rounded-xl bg-slate-50 p-3">
                          <summary className="mb-2 cursor-pointer text-xs font-bold text-slate-800">{group.title} <span className="font-normal text-slate-400">({group.stages.length})</span></summary>
                          <div className="flex flex-wrap gap-2">{group.stages.map((stage) => {
                            const checked = fileForm.stages.includes(stage);
                            return <button key={stage} type="button" onClick={() => {
                              const stages = checked ? fileForm.stages.filter((item) => item !== stage) : [...fileForm.stages, stage];
                              setFileForm({ ...fileForm, stages, stage: stages[0] || "" });
                            }} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${checked ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-primary"}`}>
                              {stage.replace(`${group.title} · `, "")}
                            </button>;
                          })}</div>
                        </details>)}
                        {selectedFileTrack && visibleFileStageGroups.length === 0 && <p className="w-full py-3 text-center text-xs text-slate-500">لا توجد مرحلة مطابقة للبحث</p>}
                        </div>
                      </div>
                    </Field>
                    </div>
                    </>}
                    <details className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <summary className="cursor-pointer select-none text-sm font-bold text-slate-700">تفاصيل إضافية (اختياري)</summary>
                      <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <Field label="المادة">
                      <input
                        value={fileForm.subject}
                        onChange={(e) =>
                          setFileForm({ ...fileForm, subject: e.target.value })
                        }
                        placeholder="مثال: البرمجة وعلوم الحاسب"
                        className="input-admin min-h-12 border-slate-300 focus:border-primary"
                      />
                    </Field>
                    <Field label="الكلمات المفتاحية">
                      <input
                        value={fileForm.tags}
                        onChange={(e) =>
                          setFileForm({ ...fileForm, tags: e.target.value })
                        }
                        placeholder="PDF، مراجعة، تمارين"
                        className="input-admin min-h-12 border-slate-300 focus:border-primary"
                      />
                      <p className="text-xs text-slate-500">
                        افصل بين الكلمات بفاصلة.
                      </p>
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="وصف الملف">
                        <textarea
                          value={fileForm.description}
                          onChange={(e) =>
                            setFileForm({
                              ...fileForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="اشرح محتوى الملف وطريقة استخدامه للطالب"
                          className="input-admin min-h-28 resize-none border-slate-300 focus:border-primary"
                        />
                      </Field>
                    </div>
                      </div>
                    </details>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 p-4 md:p-5">
                    <span className="mb-1 block text-xs font-black text-primary">الخطوة 3</span>
                    <label className="mb-3 block text-base font-black text-slate-900">
                      اختر الملف واكتب اسمه
                    </label>
                    <div
                      onDragEnter={(event) => { event.preventDefault(); setIsFileDragging(true); }}
                      onDragOver={(event) => event.preventDefault()}
                      onDragLeave={(event) => { event.preventDefault(); if (event.currentTarget === event.target) setIsFileDragging(false); }}
                      onDrop={(event) => { event.preventDefault(); selectLearningFile(event.dataTransfer.files?.[0] || null); }}
                      className={`relative min-h-44 rounded-2xl border-2 border-dashed p-6 text-center transition ${isFileDragging ? "scale-[1.01] border-primary bg-blue-50 ring-4 ring-blue-100" : fileForm.file ? "border-emerald-300 bg-emerald-50/40" : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-blue-50/40"}`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.zip,.ppt,.pptx,.txt,image/*"
                        onChange={(e) => { selectLearningFile(e.target.files?.[0] || null); e.target.value = ""; }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label="اختيار ملف تعليمي"
                      />
                      <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${fileForm.file ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-primary"}`}>
                        {fileForm.file ? <FileCheck2 className="h-7 w-7" /> : <Upload className="h-7 w-7" />}
                      </span>
                      <strong className="mt-3 block text-sm text-slate-800">
                        {fileForm.file ? "تم اختيار الملف — أكمل مكان ظهوره بالأسفل" : isFileDragging ? "اترك الملف هنا" : "اضغط لاختيار الملف أو اسحبه هنا"}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        PDF, DOCX, ZIP, PPTX — بحد أقصى 150MB
                      </span>
                    </div>
                    <div className="mt-4">
                      <Field label="الاسم الذي سيظهر للطالب">
                        <input
                          required
                          value={fileForm.title}
                          onChange={(event) => setFileForm({ ...fileForm, title: event.target.value })}
                          placeholder="مثال: ملخص الدرس الثالث"
                          className="input-admin min-h-12 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                        />
                        <p className="text-xs text-slate-500">يُكتب تلقائيًا من اسم الملف ويمكنك تعديله.</p>
                      </Field>
                    </div>
                    {fileValidationError && <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{fileValidationError}</p>}
                    {fileOptimization && <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">تم تحسين الصورة تلقائيًا مع الحفاظ على الجودة: {(fileOptimization.before / 1024 / 1024).toFixed(1)} MB ← {(fileOptimization.after / 1024 / 1024).toFixed(1)} MB</p>}
                    {fileForm.file && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-primary">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <strong className="block truncate text-sm">
                              {fileForm.file.name}
                            </strong>
                            <span className="text-xs text-slate-500">
                              {(fileForm.file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFileForm({ ...fileForm, file: null });
                              setFileValidationError("");
                              setFileOptimization(null);
                              setShowFilePreview(false);
                              if (fileInputRef.current)
                                fileInputRef.current.value = "";
                            }}
                            className="relative z-10 rounded-lg p-2 text-red-600 hover:bg-red-50"
                            aria-label="إزالة الملف"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        {isUploadingFile && (
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-xs">
                              <span>جاري الرفع</span>
                              <strong>{uploadProgress}%</strong>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {showFilePreview && (
                          <div className="relative z-10 mt-4">
                            <LocalFilePreview file={fileForm.file} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`mt-5 rounded-xl border p-4 text-sm ${fileDestinationReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                    <strong className="block">مكان ظهور الملف</strong>
                    <span>{destinationSummary}</span>
                  </div>

                  <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploadingFile}
                        onClick={() => void uploadFile(false)}
                        className="h-11"
                      >
                        حفظ كمسودة
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!fileForm.file}
                        onClick={() => setShowFilePreview((value) => !value)}
                        className="h-11"
                      >
                        <Eye className="h-4 w-4" />
                        {showFilePreview ? "إخفاء المعاينة" : "معاينة"}
                      </Button>
                    </div>
                    <Button
                      type="submit"
                      disabled={isUploadingFile}
                      className="h-11 px-6"
                    >
                      {isUploadingFile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري الرفع {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          رفع ونشر الملف
                        </>
                      )}
                    </Button>
                  </div>
                </form>

              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        الملفات التعليمية الأخيرة
                      </h3>
                      <p className="text-sm text-slate-500">
                        {filteredFiles.length} ملف مطابق
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="relative">
                        <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                        <input
                          value={fileSearch}
                          onChange={(e) => setFileSearch(e.target.value)}
                          placeholder="ابحث عن ملف..."
                          className="input-admin min-h-10 pr-9"
                        />
                      </label>
                      <select
                        value={fileCourseFilter}
                        onChange={(e) => setFileCourseFilter(e.target.value)}
                        className="input-admin min-h-10"
                      >
                        <option value="all">كل الأقسام والكورسات</option>
                        {availableCategories.map((category) => (
                          <option key={category} value={category}>
                            {getTrack(category)?.title || category}
                          </option>
                        ))}
                      </select>
                      <select
                        value={fileStageFilter}
                        onChange={(e) => setFileStageFilter(e.target.value)}
                        className="input-admin min-h-10"
                      >
                        <option value="all">كل المراحل</option>
                        {Array.from(
                          new Set(
                            files.flatMap((file) => file.stages?.length ? file.stages : [file.stage || "غير محدد"]),
                          ),
                        ).map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                      <select
                        value={fileStatusFilter}
                        onChange={(e) => setFileStatusFilter(e.target.value)}
                        className="input-admin min-h-10"
                      >
                        <option value="all">كل الحالات</option>
                        <option value="published">منشور</option>
                        <option value="draft">مسودة</option>
                      </select>
                    </div>
                  </div>
                </div>
                {visibleFiles.length === 0 ? (
                  <div className="p-14 text-center">
                    <FileText className="mx-auto h-10 w-10 text-slate-300" />
                    <h4 className="mt-3 font-bold">مفيش ملفات مطابقة</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      غيّر البحث أو الفلاتر، أو ارفع أول ملف.
                    </p>
                  </div>
                ) : (
                  <>
                  <div className="grid gap-3 p-4 md:hidden">
                    {visibleFiles.map((file) => {
                      const linkedLessons = videoOptions.filter((video) => file.videoIds?.includes(video.id));
                      const fileStages = file.stages?.length ? file.stages : file.stage ? [file.stage] : [];
                      return (
                        <article key={file.id} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary"><FileText className="h-5 w-5" /></div>
                            <div className="min-w-0 flex-1">
                              <strong className="block truncate text-sm">{file.title}</strong>
                              <span className="block truncate text-xs text-slate-500">{file.originalName}</span>
                            </div>
                            <button type="button" onClick={() => void toggleFile(file)} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${file.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {file.isPublished ? "منشور" : "مسودة"}
                            </button>
                          </div>
                          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                            <strong className="mb-1 block text-slate-800">مكان الظهور</strong>
                            {file.targetType === "videos"
                              ? linkedLessons.length
                                ? linkedLessons.map((video) => video.title).join("، ")
                                : `داخل ${file.videoIds?.length || 0} درس`
                              : `${getTrack(file.category)?.title || file.category}${fileStages.length ? ` ← ${fileStages.join("، ")}` : ""}`}
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                            <span>{(file.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => setPreviewFile(file)} className="rounded-lg p-2 hover:bg-blue-50" aria-label="معاينة"><Eye className="h-4 w-4" /></button>
                              <button type="button" onClick={() => void editFile(file)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="تعديل"><Edit2 className="h-4 w-4" /></button>
                              <a href={`/api/learning/files/${file.id}/download`} className="rounded-lg p-2 hover:bg-slate-100" aria-label="تحميل"><Download className="h-4 w-4" /></a>
                              <button type="button" onClick={() => void deleteFile(file.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1050px] text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="p-4 text-right">اسم الملف</th>
                          <th className="p-4 text-right">مكان الظهور</th>
                          <th className="p-4 text-right">التحديد</th>
                          <th className="p-4">النوع</th>
                          <th className="p-4">الحجم</th>
                          <th className="p-4">تاريخ الرفع</th>
                          <th className="p-4">الحالة</th>
                          <th className="p-4">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleFiles.map((file) => (
                          <tr
                            key={file.id}
                            className="border-t border-slate-100 hover:bg-slate-50/70"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-primary">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <strong className="block max-w-52 truncate">
                                    {file.title}
                                  </strong>
                                  <small className="block max-w-52 truncate text-slate-500">
                                    {file.originalName}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-semibold">{file.targetType === "videos" ? "داخل درس" : getTrack(file.category)?.title || file.category}</td>
                            <td className="max-w-56 p-4 text-slate-600">
                              {file.targetType === "videos"
                                ? videoOptions.filter((video) => file.videoIds?.includes(video.id)).map((video) => video.title).join("، ") || `${file.videoIds?.length || 0} درس`
                                : (file.stages?.length ? file.stages.join("، ") : file.stage || "غير محدد")}
                            </td>
                            <td className="p-4 text-center">
                              {file.mimeType?.split("/").pop()?.toUpperCase() ||
                                "FILE"}
                            </td>
                            <td className="p-4 text-center">
                              {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB
                            </td>
                            <td className="p-4 text-center text-slate-500">
                              {file.createdAt
                                ? new Date(file.createdAt).toLocaleDateString(
                                    "ar-EG",
                                  )
                                : "—"}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => void toggleFile(file)}
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${file.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                              >
                                {file.isPublished ? "منشور" : "مسودة"}
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setPreviewFile(file)}
                                  className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-primary"
                                  title="معاينة"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void editFile(file)}
                                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                  title="تعديل"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <a
                                  href={`/api/learning/files/${file.id}/download`}
                                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                  title="تحميل"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => void deleteFile(file.id)}
                                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                  title="حذف"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm">
                  <span className="text-slate-500">
                    صفحة {filePage} من {filePageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={filePage <= 1}
                      onClick={() => setFilePage((page) => page - 1)}
                    >
                      السابق
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={filePage >= filePageCount}
                      onClick={() => setFilePage((page) => page + 1)}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              </section>

              {editingFile && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={() => setEditingFile(null)}>
                  <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                    <div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-black">تعديل الملف</h3><p className="text-xs text-slate-500">غيّر مكان ظهوره بدون إعادة رفعه.</p></div><button type="button" onClick={() => setEditingFile(null)}><X className="h-5 w-5" /></button></div>
                    <Field label="اسم الملف"><input className="input-admin" value={editingFile.title} onChange={(event) => setEditingFile({ ...editingFile, title: event.target.value })} /></Field>
                    <div className="my-3">
                      <Field label="الكورس التابع له الملف 📚">
                        <select
                          className="input-admin font-bold text-sm"
                          value={editingFile.courseId || ""}
                          onChange={(e) => {
                            const cId = e.target.value ? Number(e.target.value) : null;
                            const matched = learningCourses.find((c) => c.id === cId);
                            setEditingFile({
                              ...editingFile,
                              courseId: cId,
                              category: matched ? matched.title : editingFile.category,
                              subject: matched ? matched.title : editingFile.subject,
                              stages: matched?.stages?.length ? matched.stages : editingFile.stages,
                            });
                          }}
                        >
                          <option value="">-- اختياري: اختر من الكورسات المتاحة --</option>
                          {learningCourses.map((c) => (
                            <option key={c.id} value={c.id}>
                              📚 {c.title}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
                      <Field label="الوحدة التعليمية (اختياري)">
                        <input
                          className="input-admin"
                          list="file-curriculum-units-admin"
                          value={editingFile.unit || ""}
                          placeholder="مثال: الوحدة الأولى: الذكاء الاصطناعي والمجتمع"
                          onChange={(event) => setEditingFile({ ...editingFile, unit: event.target.value })}
                        />
                        <datalist id="file-curriculum-units-admin">
                          <option value="الوحدة الأولى: الذكاء الاصطناعي والمجتمع" />
                          <option value="الوحدة الثانية: الأمن السيبراني والتشفير" />
                          <option value="الوحدة الثالثة: تطبيقات الويب" />
                          <option value="الوحدة الرابعة: الحوسبة السحابية" />
                          <option value="الوحدة الخامسة: قواعد البيانات" />
                        </datalist>
                      </Field>
                      <Field label="الدرس التابع له في المنهج (اختياري)">
                        <input
                          className="input-admin"
                          value={editingFile.lesson || ""}
                          placeholder="مثال: الدرس الثالث: الذكاء الاصطناعي في حياتنا اليومية"
                          onChange={(event) => setEditingFile({ ...editingFile, lesson: event.target.value })}
                        />
                      </Field>
                    </div>
                    <div className="my-4 grid grid-cols-2 gap-2">{([['stages', 'مراحل محددة'], ['videos', 'فيديو أو درس']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setEditingFile({ ...editingFile, targetType: value, stages: [], videoIds: [] })} className={`rounded-xl border p-3 font-bold ${editingFile.targetType === value ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200'}`}>{label}</button>)}</div>
                    {editingFile.targetType === "videos" ? <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border p-3">{videoOptions.map((video) => { const checked = editingFile.videoIds?.includes(video.id) || false; return <label key={video.id} className="flex gap-3 rounded-lg p-2 hover:bg-slate-50"><input type="checkbox" checked={checked} onChange={() => setEditingFile({ ...editingFile, videoIds: checked ? editingFile.videoIds?.filter((id) => id !== video.id) : [...(editingFile.videoIds || []), video.id] })} /><span><strong className="block text-sm">{video.title}</strong><small>{video.category}</small></span></label>; })}</div> : <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-3">{ACADEMIC_TRACKS.map((track) => <button type="button" key={track.id} onClick={() => setEditingFile({ ...editingFile, courseId: null, category: track.id, stages: [] })} className={`rounded-xl border p-3 text-sm font-bold ${getTrack(editingFile.category)?.id === track.id ? "border-primary bg-primary/5 text-primary" : "border-slate-200"}`}>{track.shortTitle}</button>)}</div>
                      <div className="flex flex-wrap gap-2 rounded-xl border p-3">{(getTrack(editingFile.category)?.stages || []).map((stage) => { const checked = editingFile.stages?.includes(stage) || false; return <button type="button" key={stage} onClick={() => setEditingFile({ ...editingFile, stages: checked ? editingFile.stages?.filter((item) => item !== stage) : [...(editingFile.stages || []), stage] })} className={`rounded-lg border px-3 py-2 text-xs font-bold ${checked ? 'bg-primary text-white' : 'bg-slate-50'}`}>{stage}</button>; })}</div>
                    </div>}
                    <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditingFile(null)}>إلغاء</Button><Button onClick={() => void saveEditedFile()}>حفظ التعديلات</Button></div>
                  </div>
                </div>
              )}

              {previewFile && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
                  onClick={() => setPreviewFile(null)}
                >
                  <div
                    className="w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-black">{previewFile.title}</h3>
                        <p className="text-xs text-slate-500">
                          {previewFile.originalName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewFile(null)}
                        className="rounded-lg p-2 hover:bg-slate-100"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <iframe
                      src={`/api/learning/files/${previewFile.id}/download`}
                      title={`معاينة ${previewFile.title}`}
                      className="h-[70vh] w-full rounded-xl border bg-slate-50"
                    />
                    <a
                      href={`/api/learning/files/${previewFile.id}/download`}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary"
                    >
                      <Download className="h-4 w-4" />
                      تحميل الملف
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "testbank" && (
            <TestBankTab
              adminApi={adminApi}
              onNavigateToQuizzes={() => setTab("quizzes")}
              onNavigateToMemoStudio={() => setTab("memo-studio")}
              initialTab={testBankInitialTab}
            />
          )}
          {tab === "kholasa" && (
            <KholasaAdminTab
              adminApi={adminApi}
              videoOptions={videoOptions}
            />
          )}
          {tab === "memo-studio" && (
            <MemoStudioTab
              quizzes={quizzes}
              learningCourses={learningCourses}
              adminApi={adminApi}
              onNavigateToQuizzes={() => setTab("quizzes")}
            />
          )}
          {tab === "quizzes" && (
            <ExamWizard
              quizForm={quizForm}
              setQuizForm={setQuizForm}
              editingQuizId={editingQuizId}
              resetQuizForm={resetQuizForm}
              createQuiz={createQuiz}
              learningCourses={learningCourses}
              videoOptions={videoOptions}
              adminApi={adminApi}
              quizzes={quizzes.filter((q) => !isHomeworkItem(q))}
              editQuiz={editQuiz}
              toggleQuiz={toggleQuiz}
              deleteQuiz={deleteQuiz}
              onDurationUpdated={(quizId, durationMinutes) => {
                setQuizzes((prev) =>
                  prev.map((item) => (item.id === quizId ? { ...item, durationMinutes } : item))
                );
              }}
              onNavigateToTestBank={(targetSubTab = "generate") => {
                setTestBankInitialTab(targetSubTab);
                setTab("testbank");
              }}
              onNavigateToMemoStudio={() => setTab("memo-studio")}
            />
          )}
          {tab === "homework" && (
            <HomeworkAdminTab
              adminApi={adminApi}
              quizzes={quizzes}
              onRefreshQuizzes={() => load(true)}
              toggleQuiz={toggleQuiz}
              deleteQuiz={(hw) => deleteQuiz(hw.id)}
            />
          )}
          {tab === "essay-exams" && (
            <EssayExamsAdminTab role={role} />
          )}
          {tab === "self-assessment-packs" && (
            <SelfAssessmentAdminTab role={role} />
          )}
        </Suspense>
      )}

      <AnimatePresence>
        {confirmModal?.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setConfirmModal(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111C2E]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                  confirmModal.variant === "destructive"
                    ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                    : confirmModal.variant === "warning"
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                    : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                }`}>
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1 text-right">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {confirmModal.title}
                  </h3>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {confirmModal.cancelText || "إلغاء"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmModal.onConfirm;
                    setConfirmModal(null);
                    await action();
                  }}
                  className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition cursor-pointer ${
                    confirmModal.variant === "destructive"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[#2583F7] hover:bg-[#1470DB]"
                  }`}
                >
                  {confirmModal.confirmText || "تأكيد"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Status({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "قيد المراجعة",
    approved: "معتمد",
    suspended: "موقوف",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${status === "approved" ? "bg-emerald-500/10 text-emerald-600" : status === "suspended" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}
    >
      {map[status] || status}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed p-20 text-center text-muted-foreground">
      {text}
    </div>
  );
}

function CourseAccess({
  student,
  courses,
  onChange,
}: {
  student: Student;
  courses: Array<{ id: number; title: string }>;
  onChange: (courseIds: number[]) => void;
}) {
  const selected = student.enrolledCourseIds?.length
    ? student.enrolledCourseIds
    : courses
        .filter((course) =>
          (student.enrolledCategories || []).includes(course.title),
        )
        .map((course) => course.id);
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="mb-3">
        <strong className="text-sm">الكورسات المسموح بيها</strong>
        <p className="text-xs text-muted-foreground">
          مرحلة الطالب بتتفتح تلقائيًا، واختار هنا أي كورسات إضافية.
        </p>
      </div>
      {courses.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          ضيف كورس من تبويب الكورسات علشان يظهر هنا.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {courses.map((course) => (
            <label
              key={course.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${selected.includes(course.id) ? "border-primary bg-primary/10 text-primary" : "bg-background"}`}
            >
              <input
                type="checkbox"
                checked={selected.includes(course.id)}
                onChange={() =>
                  onChange(
                    selected.includes(course.id)
                      ? selected.filter((item) => item !== course.id)
                      : [...selected, course.id],
                  )
                }
              />
              {course.title}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function LocalFilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  if (!url) return null;
  if (file.type.startsWith("image/"))
    return (
      <img
        src={url}
        alt={`معاينة ${file.name}`}
        className="max-h-64 w-full rounded-xl border bg-white object-contain"
      />
    );
  if (file.type === "application/pdf" || file.type.startsWith("text/"))
    return (
      <iframe
        src={url}
        title={`معاينة ${file.name}`}
        className="h-72 w-full rounded-xl border bg-white"
      />
    );
  return (
    <div className="rounded-xl border border-dashed bg-background p-4 text-center">
      <FileText className="mx-auto mb-2 text-primary" />
      <p className="text-xs font-bold">
        المتصفح مش بيدعم معاينة النوع ده، لكن الملف جاهز للرفع.
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {file.type || "نوع غير معروف"}
      </p>
    </div>
  );
}


