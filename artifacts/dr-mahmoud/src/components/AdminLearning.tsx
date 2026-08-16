import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ExamWizard } from "./ExamWizard";
import { ACADEMIC_TRACKS, getStagesForTrack, getTrack } from "@/data/academic";
import type { Student as PlatformStudent } from "@/types/platform";
import { StudentsTab } from "./admin/learning/StudentsTab";
import { CenterBookingsTab } from "./admin/learning/CenterBookingsTab";
import { PaymentsTab } from "./admin/learning/PaymentsTab";
import { NotificationsTab } from "./admin/learning/NotificationsTab";
import { OverviewSection } from "./admin/learning/OverviewSection";

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
}
interface BankQuestion {
  id: number;
  courseId?: number | null;
  category: string;
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

export function AdminLearning({
  role = "superadmin",
  initialTab = "students",
}: {
  role?: "superadmin" | "subadmin";
  initialTab?: "overview" | "students" | "center-bookings" | "payments" | "notifications" | "files" | "quizzes" | "results" | "reports";
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"overview" | "students" | "center-bookings" | "payments" | "notifications" | "files" | "quizzes" | "results" | "reports">(
    initialTab,
  );

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
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
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceipt[]>([]);
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [videoCategories, setVideoCategories] = useState<string[]>([]);
  const [videoOptions, setVideoOptions] = useState<VideoOption[]>([]);
  const [learningCourses, setLearningCourses] = useState<
    Array<{ id: number; title: string; category: string; stages?: string[] }>
  >([]);
  const [loading, setLoading] = useState(true);
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

  const [isRefreshingData, setIsRefreshingData] = useState(false);

  const load = async () => {
    setIsRefreshingData(true);
    try {
      const [s, f, q, a, v, c, analyticsData, recoveryData, receiptsData] = await Promise.all([
        adminApi<Student[]>("/api/admin/students"),
        adminApi<FileItem[]>("/api/admin/learning/files"),
        adminApi<Quiz[]>("/api/admin/learning/quizzes"),
        adminApi<Attempt[]>("/api/admin/learning/attempts"),
        adminApi<VideoOption[]>("/api/videos"),
        adminApi<Array<{ id: number; title: string; category: string; stages?: string[] }>>("/api/courses"),
        adminApi<LearningAnalytics>("/api/admin/learning/analytics"),
        adminApi<RecoveryRequest[]>("/api/admin/recovery-requests"),
        adminApi<PaymentReceipt[]>("/api/admin/payment-receipts").catch(() => []),
      ]);
      setStudents(s);
      setPaymentReceipts(receiptsData);
      setFiles(f);
      setQuizzes(q);
      setAttempts(a);
      setLearningCourses(c);
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
      toast({
        variant: "success",
        title: "تم تحديث البيانات",
        description: "تم تحديث إحصائيات المنصة وقائمة الطلاب بنجاح. 🔄",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: (e as Error).message,
      });
    } finally {
      setLoading(false);
      setIsRefreshingData(false);
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
  const sendBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      toast({ variant: "destructive", description: "اكتب العنوان والرسالة قبل الإرسال." });
      return;
    }
    setIsBroadcasting(true);
    try {
      const result = await adminApi<{ success: boolean; count: number; message: string }>(
        "/api/admin/notifications/broadcast",
        {
          method: "POST",
          body: JSON.stringify(broadcastForm),
        },
      );
      toast({ title: "تم الإرسال", description: result.message });
      setBroadcastForm({ title: "", message: "", type: "info", targetGrade: "all" });
    } catch (error) {
      toast({ variant: "destructive", title: "فشل الإرسال", description: (error as Error).message });
    } finally {
      setIsBroadcasting(false);
    }
  };
  useEffect(() => {
    void load();
    const refreshStudentQueues = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const [studentRows, recoveryRows] = await Promise.all([
          adminApi<Student[]>("/api/admin/students"),
          adminApi<RecoveryRequest[]>("/api/admin/recovery-requests"),
        ]);
        setStudents(studentRows);
        setRecoveryRequests(recoveryRows);
      } catch {
        // The next polling cycle retries without interrupting admin work.
      }
    };
    const timer = window.setInterval(refreshStudentQueues, 8000);
    const handleVisibility = () => void refreshStudentQueues();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
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
            body: JSON.stringify({ status }),
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
  const updateStudentCourses = (
    student: Student,
    enrolledCourseIds: number[],
  ) => {
    confirmAction({
      title: "تعديل مواد وكورسات الطالب 📚",
      message: `هل أنت متأكد من تعديل المواد والكورسات المسجلة للطالب (${student.name})؟`,
      confirmText: "حفظ التغييرات",
      onConfirm: async () => {
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
          setStudents(prev => prev.map((s) => (s.id === student.id ? updated : s)));
          toast({ title: "تم تحديث كورسات الطالب" });
        } catch (e) {
          toast({ variant: "destructive", description: (e as Error).message });
        }
      },
    });
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
    if (editingFile.targetType !== "videos" && (!getTrack(editingFile.category) || !editingFile.stages?.length)) {
      toast({ variant: "destructive", description: "اختر القسم التعليمي ومرحلة واحدة على الأقل." });
      return;
    }
    const editingCategory = editingFile.targetType === "videos"
      ? videoOptions.find((video) => editingFile.videoIds?.includes(video.id))?.category || editingFile.category
      : editingFile.category;
    const updated = await adminApi<FileItem>(
      `/api/admin/learning/files/${editingFile.id}`,
      { method: "PATCH", body: JSON.stringify({
        title: editingFile.title,
        targetType: editingFile.targetType || "stages",
        courseId: editingFile.courseId,
        category: editingCategory,
        stages: editingFile.stages || [],
        videoIds: editingFile.videoIds || [],
      }) },
    );
    setFiles(prev => prev.map((item) => (item.id === editingFile.id ? { ...updated, videoIds: editingFile.videoIds } : item)));
    setEditingFile(null);
    toast({ title: "تم تحديث مكان ظهور الملف" });
  };
  const createQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.title.trim()) {
      toast({ variant: "destructive", description: "اسم الاختبار مطلوب." });
      return;
    }
    if (!quizForm.courseId || quizForm.stages.length === 0 || (quizForm.scope === "lesson" && !quizForm.videoId)) {
      toast({ variant: "destructive", description: "اختر الكورس ومرحلة واحدة على الأقل، وحدد الدرس إذا كان الاختبار تابعًا لدرس." });
      return;
    }
    if (!quizForm.questions || quizForm.questions.length === 0 || quizForm.questions.some((q) => !(q as Question).prompt?.trim())) {
      toast({ variant: "destructive", description: "أضف سؤالًا واحدًا على الأقل، وتأكد أن جميع نص الأسئلة مكتوب." });
      return;
    }
    const wasEditing = editingQuizId !== null;
    try {
      const payload = {
        ...quizForm,
        courseId: Number(quizForm.courseId),
        videoId: quizForm.scope === "lesson" && quizForm.videoId ? Number(quizForm.videoId) : null,
        durationMinutes: quizForm.durationMinutes ? Number(quizForm.durationMinutes) : null,
        questionsToShow: quizForm.questionsToShow ? Number(quizForm.questionsToShow) : null,
      };
      const created = await adminApi<Quiz>(editingQuizId ? `/api/admin/learning/quizzes/${editingQuizId}` : "/api/admin/learning/quizzes", {
        method: editingQuizId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setQuizzes(prev => editingQuizId ? prev.map((quiz) => quiz.id === editingQuizId ? created : quiz) : [created, ...prev]);
      resetQuizForm();
      toast({ title: wasEditing ? "تم تحديث الاختبار بنجاح" : "تم إنشاء الاختبار بنجاح" });
    } catch (e) {
      toast({ variant: "destructive", description: (e as Error).message });
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
    } catch {
      toast({ title: "خطأ في حذف الاختبار", variant: "destructive" });
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
      setQuizzes(prev => prev.map((q) => (q.id === quiz.id ? updated : q)));
    } catch {
      toast({ title: "خطأ في تحديث الاختبار", variant: "destructive" });
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
  const tabs = [
    ["overview", "اللوحة التشغيلية", LayoutDashboard],
    ["center-bookings", "حجوزات السناتر", MapPin],
    ["students", "الطلاب", GraduationCap],
    ["payments", "إيصالات الدفع", CreditCard],
    ["files", "الملفات", Folder],
    ["quizzes", "الاختبارات", ClipboardCheck],
    ["results", "النتائج", Check],
    ["notifications", "إرسال إشعار", Bell],
    ["reports", "التقارير", BarChart3],
  ] as const;
  const tabMeta = {
    overview: ["اللوحة التشغيلية وإحصائيات المنصة", "نظرة عامة على أعداد الطلاب، المشتركين، والتوزيع حسب المراحل والكورسات."],
    students: ["إدارة جميع الطلاب", "راجع التسجيلات والصلاحيات والكورسات المخصصة لكل طالب."],
    "center-bookings": ["كشف وإدارة حجوزات السناتر", "جدول تفصيلي مخصص لمتابعة جميع الطلاب المسجلين بالسناتر والمواعيد الحضورية المحددة."],
    payments: ["إيصالات الدفع", "راجع إيصالات الدفع من الطلاب ووافق أو ارفض."],
    notifications: ["إرسال إشعار للطلاب", "أرسل تنبيهًا أو إشعارًا عامًا لجميع الطلاب أو مرحلة دراسية محددة."],
    files: ["مكتبة الملفات التعليمية", "ارفع الملفات وحدد مكان ظهورها للطلاب أو داخل الدروس."],
    quizzes: ["بناء وإدارة الاختبارات", "أنشئ الاختبارات وحدد الجمهور والإعدادات والأسئلة ثم انشرها."],
    results: ["نتائج الاختبارات", "تابع محاولات الطلاب ودرجات النجاح من مكان واحد."],
    reports: ["التقارير والمتابعة", "راقب نشاط الطلاب والتقدم ومؤشرات الأداء التعليمية."],
  } as const;
  return (
    <div className="admin-learning-workspace space-y-6 text-[#0F172A]" dir="rtl">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            إدارة المنصة التعليمية
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            لوحة الإدارة الشاملة للطلاب، الملفات، الاختبارات والنتائج
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            onClick={() => {
              setTab("files");
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
          <Button
            type="button"
            variant="outline"
            disabled={isRefreshingData}
            onClick={load}
            className="h-10 px-4 rounded-xl border-[#E2E8F0] bg-white hover:bg-[#F6F8FC] text-[#0F172A] text-xs font-semibold transition-all disabled:opacity-75"
          >
            <RefreshCw className={`h-4 w-4 ml-1 text-[#64748B] ${isRefreshingData ? "animate-spin text-[#2563EB]" : ""}`} />
            {isRefreshingData ? "جاري التحديث..." : "تحديث البيانات"}
          </Button>
        </div>
      </div>

      {/* 5. Management Tabs Bar (RTL Horizontal Scroll on Mobile) */}
      <div className="w-full overflow-x-auto overflow-y-hidden pb-1 scrollbar-none">
        <div className="flex w-max min-w-full gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-xs">
          {tabs.map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex-none flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition-all whitespace-nowrap ${
                tab === value
                  ? "bg-[#2563EB] text-white shadow-xs shadow-blue-500/20"
                  : "bg-transparent text-[#475569] hover:bg-[#F6F8FC] hover:text-[#0F172A]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Section Info Header */}
      {(() => {
        const urlMode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mode") : null;
        const urlStatus = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("status") : null;
        const activeTitle = tab === "students" && urlMode === "offline"
          ? "حجوزات السناتر والمواعيد (أوفلاين)"
          : tab === "students" && urlStatus === "pending"
          ? "الحجوزات والطلبات ينتظر التفعيل"
          : tabMeta[tab][0];
        const activeSub = tab === "students" && urlMode === "offline"
          ? "سجل حجوزات وطلاب السناتر الحضورية بالزقازيق والمواعيد المحددة."
          : tab === "students" && urlStatus === "pending"
          ? "طلبات التسجيل الجديدة والاشتراكات المعلقة بانتظار تفعيل المشرف."
          : tabMeta[tab][1];

        return (
          <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">{activeTitle}</h3>
              <p className="mt-1 text-sm text-[#64748B]">{activeSub}</p>
            </div>
            <div className="flex h-10 w-fit items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-3.5 text-xs font-medium text-[#64748B] shrink-0">
              <RefreshCw className="h-3.5 w-3.5 text-[#64748B]" />
              <span>تحديث تلقائي للبيانات</span>
            </div>
          </div>
        );
      })()}
      {loading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <OverviewSection
              students={students as any}
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
                  void load();
                } catch (err) {
                  toast({ variant: "destructive", description: (err as Error).message });
                }
              }}
            />
            </div>
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
          {tab === "payments" && (
            <PaymentsTab receipts={paymentReceipts} onRefresh={load} />
          )}
          {tab === "notifications" && (
            <NotificationsTab
              students={students}
              onSend={async (form) => {
                try {
                  const result = await adminApi<{ count: number }>("/api/admin/broadcast-notification", {
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
              quizzes={quizzes}
              editQuiz={editQuiz}
              toggleQuiz={toggleQuiz}
              deleteQuiz={deleteQuiz}
            />
          )}
          {tab === "results" && (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="relative w-full sm:max-w-sm"><Search className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" /><input value={resultSearch} onChange={(event) => setResultSearch(event.target.value)} placeholder="ابحث باسم الطالب أو الاختبار..." className="input-admin pr-9" /></label>
                <Button type="button" variant="outline" disabled={!filteredAttempts.length} onClick={exportResults}><Download className="h-4 w-4" /> تصدير CSV</Button>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-4 text-right">الطالب</th>
                    <th className="p-4 text-right">الاختبار</th>
                    <th className="p-4">النتيجة</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-slate-50/70">
                      <td className="p-4 font-bold">{a.studentName}</td>
                      <td className="p-4">{a.quizTitle}</td>
                      <td className="p-4 text-center font-black">{a.score}%</td>
                      <td className="p-4 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${a.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{a.passed ? "ناجح" : "لم ينجح"}</span>
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredAttempts.length && <div className="p-10"><Empty text={attempts.length ? "لا توجد نتائج مطابقة للبحث" : "لا توجد نتائج اختبارات بعد"} /></div>}
              </div>
            </div>
          )}
          {tab === "reports" && analytics && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <a
                  href="/api/admin/learning/analytics/export"
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <Download className="h-4 w-4" /> تصدير بيانات الطلاب CSV
                </a>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["طلاب نشطين آخر 14 يوم", analytics.summary.activeStudents, Activity, "bg-emerald-50 text-emerald-700"],
                  ["طلاب محتاجين متابعة", analytics.summary.inactiveStudents, GraduationCap, "bg-amber-50 text-amber-700"],
                  ["متوسط تقدم الدروس", `${analytics.summary.averageProgress}%`, BarChart3, "bg-blue-50 text-blue-700"],
                  ["نسبة نجاح الاختبارات", `${analytics.summary.quizPassRate}%`, ClipboardCheck, "bg-violet-50 text-violet-700"],
                ].map(([label, value, Icon, color]: any) => (
                  <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <strong className="text-2xl font-black">{String(value)}</strong>
                        <p className="mt-1 text-xs font-bold text-slate-600">{String(label)}</p>
                      </div>
                      <span className={`grid h-11 w-11 place-items-center rounded-xl ${String(color)}`}><Icon className="h-5 w-5" /></span>
                    </div>
                  </article>
                ))}
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-black">طلبات استرجاع الكود</h3>
                  <p className="text-xs text-slate-500">راجع بيانات الطالب وابعتله الكود على رقم واتساب المسجل.</p>
                </div>
                <div className="space-y-2">
                  {recoveryRequests.filter((request) => request.status === "pending").length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">مفيش طلبات استرجاع معلقة</p>
                  ) : recoveryRequests.filter((request) => request.status === "pending").map((request) => {
                    const message = `أهلًا ${request.studentName}، كود دخول منصة د. محمود المهدي الخاص بيك هو: ${request.accessCode || ""}`;
                    return (
                      <article key={request.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <strong>{request.studentName}</strong>
                          <p className="text-xs text-slate-500" dir="ltr">{request.phone}</p>
                          <span className="mt-1 block font-mono text-xs font-bold text-primary">{request.accessCode}</span>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`https://wa.me/${request.phone.replace(/^0/, "20")}?text=${encodeURIComponent(message)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#25D366] px-4 text-xs font-bold text-white"
                          >
                            <MessageCircle className="h-4 w-4" /> إرسال الكود
                          </a>
                          <Button size="sm" variant="outline" onClick={() => resolveRecoveryRequest(request.id)}>
                            <Check className="h-4 w-4" /> تم التواصل
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* Geographic & Grade Distribution Section */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* 1. Top Governorates Distribution */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">أكثر المحافظات إقبالاً على المنصة 📍</h3>
                      <p className="text-xs text-slate-500 mt-0.5">توزيع الطلاب حسب المحافظة والعنوان المسجل.</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                      {analytics.governorateDistribution?.length || 0} محافظة
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(analytics.governorateDistribution || []).slice(0, 7).map((gov) => (
                      <div key={gov.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-800">{gov.name}</span>
                          <span className="text-slate-600">{gov.count} طالب ({gov.percentage}%)</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0866D9] transition-all duration-500"
                            style={{ width: `${Math.max(4, gov.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Top Cities & Centered Hubs */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">أعلى المراكز والمدن نشاطاً 🏛️</h3>
                      <p className="text-xs text-slate-500 mt-0.5">أكثر المدن والمراكز المسجل منها طلاب.</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      Top 10 مدن
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(analytics.topCities || []).slice(0, 10).map((city, idx) => (
                      <div key={city.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs font-semibold">
                        <div className="flex items-center gap-2 truncate">
                          <span className="grid h-5 w-5 place-items-center rounded-md bg-white border text-[10px] font-bold text-slate-600 shadow-2xs">
                            {idx + 1}
                          </span>
                          <span className="truncate text-slate-800">{city.name}</span>
                        </div>
                        <span className="rounded-md bg-white px-2 py-0.5 font-bold text-[#0866D9] shadow-2xs shrink-0">
                          {city.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed Student Progress & Location Table */}
              <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">تحليلات تقدم ومواقع الطلاب التفصيلية</h3>
                    <p className="text-xs text-slate-500">الأقل نشاطاً ظاهرين في البداية لتسهيل المتابعة الفورية.</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    إجمالي المسجلين: {analytics.students.length} طالب
                  </span>
                </div>
                <table className="w-full min-w-[950px] text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th className="p-4 text-right">الطالب والمعلومات</th>
                      <th className="p-4 text-right">المحافظة والمدينة</th>
                      <th className="p-4">المرحلة الدراسية</th>
                      <th className="p-4">الدروس</th>
                      <th className="p-4">مكتمل</th>
                      <th className="p-4">متوسط التقدم</th>
                      <th className="p-4">الاختبارات</th>
                      <th className="p-4">آخر نشاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...analytics.students].sort((a, b) => Number(a.isActive) - Number(b.isActive)).map((row) => (
                      <tr key={row.studentId} className="border-t hover:bg-slate-50/60 transition">
                        <td className="p-4">
                          <strong className="block text-slate-900">{row.name}</strong>
                          <span className="text-xs text-slate-500 font-mono" dir="ltr">{row.phone}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="block text-xs font-bold text-slate-800">{row.governorate}</span>
                          <span className="text-[11px] text-slate-500">{row.city}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                            {row.grade}
                          </span>
                        </td>
                        <td className="p-4 text-center font-semibold">{row.startedLessons}/{row.assignedLessons}</td>
                        <td className="p-4 text-center font-bold text-emerald-700">{row.completedLessons}</td>
                        <td className="p-4">
                          <div className="mx-auto w-28">
                            <div className="mb-1 flex justify-between text-[11px]">
                              <span className="text-slate-500">التقدم</span>
                              <strong>{row.averageProgress}%</strong>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[#0866D9]" style={{ width: `${Math.min(100, Math.max(0, row.averageProgress))}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center font-medium">{row.quizAttempts} · {row.averageQuizScore}%</td>
                        <td className="p-4 text-center">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {row.lastActivity ? new Date(row.lastActivity).toLocaleDateString("ar-EG") : "لم يبدأ بعد"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}
        </>
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

// ── Payment Receipts Admin Panel ──

type PaymentReceipt = {
  id: number;
  status: string;
  adminNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  originalName: string;
  studentId: number;
  studentName: string;
  studentPhone: string;
  paymentStatus: string;
};

function PaymentReceiptsPanel({ receipts: propReceipts, onRefresh }: { receipts?: PaymentReceipt[]; onRefresh?: () => void }) {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<PaymentReceipt[]>(propReceipts || []);
  const [loading, setLoading] = useState(!propReceipts);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [actionId, setActionId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectForm, setShowRejectForm] = useState<number | null>(null);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const data = await adminApi<PaymentReceipt[]>("/api/admin/payment-receipts");
      setReceipts(data);
    } catch (err) {
      toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReceipts();
  }, []);

  const handleAction = async (receiptId: number, status: "approved" | "rejected", adminNotes?: string) => {
    setActionId(receiptId);
    try {
      await adminApi(`/api/admin/payment-receipts/${receiptId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNotes: adminNotes || undefined }),
      });
      toast({ title: status === "approved" ? "تم تأكيد الدفع" : "تم رفض الإيصال" });
      setShowRejectForm(null);
      setRejectNotes("");
      void loadReceipts();
    } catch (err) {
      toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const filtered = filter === "all" ? receipts : receipts.filter((r) => r.status === filter);

  const counts = {
    all: receipts.length,
    pending: receipts.filter((r) => r.status === "pending").length,
    approved: receipts.filter((r) => r.status === "approved").length,
    rejected: receipts.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="rounded-2xl border border-[#E4EAF2] bg-white p-5 shadow-xs space-y-5 text-[#0F172A]">
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4EAF2] pb-4">
        <div>
          <h3 className="text-base font-extrabold text-[#0F172A]">إدارة إيصالات الدفع</h3>
          <p className="text-xs text-[#64748B] mt-0.5">مراجعة وتأكيد التحويلات وإيصالات الدفع المرفوعة من الطلاب</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadReceipts}
            className="h-9 px-3 rounded-xl border-[#E4EAF2] bg-white hover:bg-[#F6F8FC] text-xs font-bold text-[#0F172A]"
          >
            <RefreshCw className="h-3.5 w-3.5 ml-1.5 text-[#64748B]" /> تحديث القائمة
          </Button>
        </div>
      </div>

      {/* Filter Tabs with Counts */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "الكل", count: counts.all },
          { key: "pending", label: "قيد المراجعة", count: counts.pending },
          { key: "approved", label: "مقبول", count: counts.approved },
          { key: "rejected", label: "مرفوض", count: counts.rejected },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key as any)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              filter === f.key
                ? "bg-[#0866D9] text-white shadow-xs"
                : "bg-[#F6F8FC] border border-[#E4EAF2] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E4EAF2]/50"
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                filter === f.key
                  ? "bg-white/20 text-white"
                  : "bg-[#E4EAF2] text-[#0F172A]"
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#0866D9]" />
        </div>
      ) : filtered.length === 0 ? (
        /* Professional Empty State */
        <div className="rounded-xl border border-dashed border-[#E4EAF2] bg-[#F6F8FC]/50 p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#0866D9]/10 text-[#0866D9] mb-3">
            <FileCheck2 className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <h4 className="text-sm font-extrabold text-[#0F172A]">لا توجد إيصالات دفع</h4>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            {filter === "all"
              ? "لم يقم أي طالب برفع إيصال دفع حتى الآن."
              : `لا توجد إيصالات مضافة بحالة «${filter === "pending" ? "قيد المراجعة" : filter === "approved" ? "مقبول" : "مرفوض"}».`}
          </p>
        </div>
      ) : (
        /* Responsive Table */
        <div className="overflow-x-auto rounded-xl border border-[#E4EAF2]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F6F8FC] text-[#64748B] font-bold border-b border-[#E4EAF2]">
              <tr>
                <th className="px-4 py-3">الطالب</th>
                <th className="px-4 py-3">رقم الهاتف</th>
                <th className="px-4 py-3">تاريخ الرفع</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EAF2] bg-white">
              {filtered.map((receipt) => (
                <React.Fragment key={receipt.id}>
                  <tr className="hover:bg-[#F6F8FC]/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                      {receipt.studentName}
                    </td>
                    <td className="px-4 py-3.5 text-[#64748B] dir-ltr text-right font-mono">
                      {receipt.studentPhone}
                    </td>
                    <td className="px-4 py-3.5 text-[#64748B]">
                      {new Date(receipt.createdAt).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          receipt.status === "pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : receipt.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            receipt.status === "pending"
                              ? "bg-amber-500 animate-pulse"
                              : receipt.status === "approved"
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                          }`}
                        />
                        {receipt.status === "pending"
                          ? "قيد المراجعة"
                          : receipt.status === "approved"
                          ? "مقبول"
                          : "مرفوض"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-bold border-[#E4EAF2] text-[#0F172A] hover:bg-[#F6F8FC]"
                          onClick={() => setPreviewId(previewId === receipt.id ? null : receipt.id)}
                        >
                          <Eye className="h-3.5 w-3.5 ml-1 text-[#64748B]" />
                          {previewId === receipt.id ? "إخفاء" : "عرض الصورة"}
                        </Button>
                        {receipt.status === "pending" && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={actionId === receipt.id}
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من قبول الإيصال وتفعيل الطالب (${receipt.studentName})؟`)) {
                                  handleAction(receipt.id, "approved");
                                }
                              }}
                              className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {actionId === receipt.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5 ml-1" />
                              )}
                              قبول
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={actionId === receipt.id}
                              onClick={() => setShowRejectForm(showRejectForm === receipt.id ? null : receipt.id)}
                              className="h-8 px-3 text-xs font-bold"
                            >
                              <UserX className="h-3.5 w-3.5 ml-1" />
                              رفض
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline Preview */}
                  {previewId === receipt.id && (
                    <tr className="bg-[#F6F8FC]/80">
                      <td colSpan={5} className="p-4">
                        <div className="overflow-hidden rounded-xl border border-[#E4EAF2] bg-white p-3 text-center">
                          <img
                            src={`/api/admin/payment-receipts/${receipt.id}/image`}
                            alt="إيصال الدفع"
                            className="mx-auto max-h-[450px] rounded-lg object-contain"
                          />
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Inline Reject Form */}
                  {showRejectForm === receipt.id && (
                    <tr className="bg-rose-50/50">
                      <td colSpan={5} className="p-3">
                        <div className="flex items-center gap-2 max-w-xl mr-auto">
                          <input
                            type="text"
                            placeholder="سبب الرفض (اختياري)..."
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            className="flex-1 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={actionId === receipt.id}
                            onClick={() => handleAction(receipt.id, "rejected", rejectNotes)}
                            className="h-8 text-xs font-bold"
                          >
                            {actionId === receipt.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "تأكيد الرفض"
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
