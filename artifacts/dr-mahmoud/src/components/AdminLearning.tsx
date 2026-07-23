import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ACADEMIC_TRACKS, getStagesForTrack, getTrack } from "@/data/academic";

type Student = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  status: string;
  accessCode?: string | null;
  governorate?: string | null;
  city?: string | null;
  grade?: string | null;
  otherGradeDetail?: string | null;
  learningMode?: "online" | "offline";
  enrolledCourseIds?: number[];
  enrolledCategories?: string[];
  createdAt: string;
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
type Question = { prompt: string; options: string[]; correctIndex: number };
type VideoOption = { id: number; courseId?: number | null; title: string; category: string; stage?: string | null; stages?: string[] };
type Quiz = {
  id: number;
  courseId?: number | null;
  videoId?: number | null;
  scope?: "course" | "lesson";
  title: string;
  description?: string | null;
  category: string;
  stage?: string | null;
  stages?: string[];
  passingScore: number;
  maxAttempts?: number;
  requiredProgress?: number;
  questions: Question[];
  isPublished: boolean;
};
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
  };
  students: Array<{
    studentId: number;
    name: string;
    phone: string;
    status: string;
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

export function AdminLearning() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"students" | "files" | "quizzes" | "results" | "reports">(
    "files",
  );
  const [students, setStudents] = useState<Student[]>([]),
    [files, setFiles] = useState<FileItem[]>([]),
    [quizzes, setQuizzes] = useState<Quiz[]>([]),
    [attempts, setAttempts] = useState<Attempt[]>([]);
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
    passingScore: 60,
    maxAttempts: 3,
    requiredProgress: 80,
    isPublished: false,
    questions: [
      { prompt: "", options: ["", "", "", ""], correctIndex: 0 },
    ] as Question[],
  });
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<number | null>(null);
  const [isImportingQuestions, setIsImportingQuestions] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [quizStageSearch, setQuizStageSearch] = useState("");
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<number>>(new Set());
  const quizImportInputRef = useRef<HTMLInputElement>(null);

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
      passingScore: 60,
      maxAttempts: 3,
      requiredProgress: 80,
      isPublished: false,
      questions: [{ prompt: "", options: ["", "", "", ""], correctIndex: 0 }],
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

  const load = async () => {
    setLoading(true);
    try {
      const [s, f, q, a, v, c, analyticsData, recoveryData] = await Promise.all([
        adminApi<Student[]>("/api/admin/students"),
        adminApi<FileItem[]>("/api/admin/learning/files"),
        adminApi<Quiz[]>("/api/admin/learning/quizzes"),
        adminApi<Attempt[]>("/api/admin/learning/attempts"),
        adminApi<VideoOption[]>("/api/videos"),
        adminApi<Array<{ id: number; title: string; category: string; stages?: string[] }>>("/api/courses"),
        adminApi<LearningAnalytics>("/api/admin/learning/analytics"),
        adminApi<RecoveryRequest[]>("/api/admin/recovery-requests"),
      ]);
      setStudents(s);
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
    } catch (e) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: (e as Error).message,
      });
    } finally {
      setLoading(false);
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
  const updateStudent = async (id: number, status: string) => {
    try {
      const updated = await adminApi<Student>(`/api/admin/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setStudents(students.map((s) => (s.id === id ? updated : s)));
      toast({
        title:
          status === "approved"
            ? "تم قبول الطالب وإصدار الكود"
            : "تم تحديث حالة الطالب",
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
      setStudents(students.map((s) => (s.id === student.id ? updated : s)));
      toast({ title: "تم تحديث كورسات الطالب" });
    } catch (e) {
      toast({ variant: "destructive", description: (e as Error).message });
    }
  };
  const updateStudentMode = async (
    student: Student,
    learningMode: "online" | "offline",
  ) => {
    try {
      const updated = await adminApi<Student>(
        `/api/admin/students/${student.id}`,
        { method: "PATCH", body: JSON.stringify({ learningMode }) },
      );
      setStudents(students.map((s) => (s.id === student.id ? updated : s)));
      toast({
        title: `تم تحويل الطالب لنظام ${learningMode === "online" ? "أونلاين" : "أوفلاين"}`,
      });
    } catch (e) {
      toast({ variant: "destructive", description: (e as Error).message });
    }
  };
  const deleteStudent = async (id: number) => {
    if (!confirm("حذف الطالب وكل محاولاته؟")) return;
    await adminApi(`/api/admin/students/${id}`, { method: "DELETE" });
    setStudents(students.filter((s) => s.id !== id));
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
    await adminApi(`/api/admin/learning/files/${id}`, { method: "DELETE" });
    setFiles(files.filter((f) => f.id !== id));
  };
  const toggleFile = async (file: FileItem) => {
    const updated = await adminApi<FileItem>(
      `/api/admin/learning/files/${file.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !file.isPublished }),
      },
    );
    setFiles(files.map((f) => (f.id === file.id ? updated : f)));
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
    setFiles(files.map((item) => (item.id === editingFile.id ? { ...updated, videoIds: editingFile.videoIds } : item)));
    setEditingFile(null);
    toast({ title: "تم تحديث مكان ظهور الملف" });
  };
  const createQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.courseId || quizForm.stages.length === 0 || (quizForm.scope === "lesson" && !quizForm.videoId)) {
      toast({ variant: "destructive", description: "اختر الكورس ومرحلة واحدة على الأقل، وحدد الدرس إذا كان الاختبار تابعًا لدرس." });
      return;
    }
    const wasEditing = editingQuizId !== null;
    try {
      const created = await adminApi<Quiz>(editingQuizId ? `/api/admin/learning/quizzes/${editingQuizId}` : "/api/admin/learning/quizzes", {
        method: editingQuizId ? "PATCH" : "POST",
        body: JSON.stringify(quizForm),
      });
      setQuizzes(editingQuizId ? quizzes.map((quiz) => quiz.id === editingQuizId ? created : quiz) : [created, ...quizzes]);
      resetQuizForm();
      toast({ title: wasEditing ? "تم تحديث الاختبار" : "تم إنشاء الاختبار" });
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
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts || 3,
      requiredProgress: quiz.requiredProgress ?? 80,
      isPublished: quiz.isPublished,
      questions: quiz.questions.map((question) => ({ ...question, options: [...question.options] })),
    });
  };
  const deleteQuiz = async (id: number) => {
    await adminApi(`/api/admin/learning/quizzes/${id}`, { method: "DELETE" });
    setQuizzes(quizzes.filter((q) => q.id !== id));
  };
  const toggleQuiz = async (quiz: Quiz) => {
    const updated = await adminApi<Quiz>(
      `/api/admin/learning/quizzes/${quiz.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !quiz.isPublished }),
      },
    );
    setQuizzes(quizzes.map((q) => (q.id === quiz.id ? updated : q)));
  };
  const setQuestion = (index: number, patch: Partial<Question>) =>
    setQuizForm({
      ...quizForm,
      questions: quizForm.questions.map((q, i) =>
        i === index ? { ...q, ...patch } : q,
      ),
    });
  const duplicateQuestion = (index: number) => {
    const question = quizForm.questions[index];
    setQuizForm({
      ...quizForm,
      questions: [
        ...quizForm.questions.slice(0, index + 1),
        { ...question, options: [...question.options] },
        ...quizForm.questions.slice(index + 1),
      ],
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
  const availableQuizStages = selectedQuizCourse?.stages?.length ? selectedQuizCourse.stages : getStagesForTrack(selectedQuizCourse?.category);
  const visibleQuizStages = availableQuizStages.filter((stage) =>
    stage.toLocaleLowerCase("ar").includes(quizStageSearch.trim().toLocaleLowerCase("ar")),
  );
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
    ["students", "الطلاب", GraduationCap],
    ["files", "الملفات", FileText],
    ["quizzes", "الاختبارات", ClipboardCheck],
    ["results", "النتائج", Check],
    ["reports", "التقارير", BarChart3],
  ] as const;
  const tabMeta = {
    students: ["إدارة الطلاب", "راجع التسجيلات والصلاحيات والكورسات المخصصة لكل طالب."],
    files: ["مكتبة الملفات التعليمية", "ارفع الملفات وحدد مكان ظهورها للطلاب أو داخل الدروس."],
    quizzes: ["بناء وإدارة الاختبارات", "أنشئ الاختبارات وحدد الجمهور والإعدادات والأسئلة ثم انشرها."],
    results: ["نتائج الاختبارات", "تابع محاولات الطلاب ودرجات النجاح من مكان واحد."],
    reports: ["التقارير والمتابعة", "راقب نشاط الطلاب والتقدم ومؤشرات الأداء التعليمية."],
  } as const;
  return (
    <div className="admin-learning-workspace space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[28px] font-black leading-tight text-slate-900">
            إدارة المنصة التعليمية
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            إدارة الطلاب والملفات والاختبارات والنتائج
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} className="h-11 bg-white">
            <RefreshCw className="h-4 w-4" /> تحديث البيانات
          </Button>
          <Button
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
            className="h-11"
          >
            <Plus className="h-4 w-4" /> إضافة ملف تعليمي
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "إجمالي الطلاب",
            students.length,
            "طالب مسجل",
            GraduationCap,
            "bg-blue-50 text-blue-700",
          ],
          [
            "الملفات التعليمية",
            files.length,
            `${files.filter((file) => file.isPublished).length} ملف منشور`,
            FileText,
            "bg-cyan-50 text-cyan-700",
          ],
          [
            "الاختبارات المنشورة",
            quizzes.filter((quiz) => quiz.isPublished).length,
            `${quizzes.length} اختبار إجمالي`,
            ClipboardCheck,
            "bg-amber-50 text-amber-700",
          ],
          [
            "النتائج المسجلة",
            attempts.length,
            `${attempts.filter((attempt) => attempt.passed).length} نتيجة ناجحة`,
            ListChecks,
            "bg-emerald-50 text-emerald-700",
          ],
        ].map(([label, value, helper, Icon, color]: any) => (
          <article
            key={String(label)}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <strong className="text-2xl font-black text-slate-900">
                  {String(value)}
                </strong>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {String(label)}
                </p>
              </div>
              <div
                className={`grid h-11 w-11 place-items-center rounded-xl ${String(color)}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">{String(helper)}</p>
          </article>
        ))}
      </div>
      <div className="grid grid-cols-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition sm:text-sm ${tab === value ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-[17px] font-black text-slate-900">{tabMeta[tab][0]}</h3><p className="mt-1 text-xs text-slate-500">{tabMeta[tab][1]}</p></div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">تحديث تلقائي للبيانات</span>
      </div>
      {loading ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : (
        <>
          {tab === "students" && (
            <div className="space-y-3">
              {students.length === 0 ? (
                <Empty text="لا توجد طلبات تسجيل بعد" />
              ) : (
                students.map((s) => (
                  <article
                    key={s.id}
                    className="rounded-2xl border bg-card p-5 space-y-4"
                  >
                    <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-lg">{s.name}</h3>
                          <Status status={s.status} />
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.learningMode === "offline" ? "bg-violet-500/10 text-violet-700" : "bg-sky-500/10 text-sky-700"}`}
                          >
                            {s.learningMode === "offline"
                              ? "أوفلاين"
                              : "أونلاين"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {s.phone}
                          {s.email ? ` · ${s.email}` : ""}
                          {s.governorate ? ` · المحافظة: ${s.governorate}` : ""}
                          {s.city ? ` · المدينة: ${s.city}` : ""}
                          {s.grade
                            ? ` · المرحلة: ${s.grade === "أخرى" ? s.otherGradeDetail || "أخرى" : s.grade}`
                            : ""}
                        </p>
                        {s.accessCode && (
                          <button
                            type="button"
                            onClick={() => copyStudentCode(s)}
                            title="اضغط لنسخ كود الطالب"
                            className={`mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono transition ${copiedStudentId === s.id ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
                          >
                            {copiedStudentId === s.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {s.accessCode}
                            <span className="font-sans text-xs">{copiedStudentId === s.id ? "تم النسخ" : "نسخ"}</span>
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {s.status !== "approved" && (
                          <Button
                            onClick={() => updateStudent(s.id, "approved")}
                          >
                            <UserCheck /> قبول وإصدار كود
                          </Button>
                        )}
                        {s.status === "approved" && (
                          <Button
                            variant="outline"
                            onClick={() => updateStudent(s.id, "suspended")}
                          >
                            <UserX /> إيقاف
                          </Button>
                        )}
                        {s.status === "suspended" && (
                          <Button
                            variant="outline"
                            onClick={() => updateStudent(s.id, "approved")}
                          >
                            <UserCheck /> إعادة تفعيل
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          onClick={() => deleteStudent(s.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <strong className="text-sm">نظام حضور الطالب</strong>
                        <p className="text-xs text-muted-foreground">
                          الطالب هيشوف فيديوهات النظام المحدد بس.
                        </p>
                      </div>
                      <select
                        value={s.learningMode || "online"}
                        onChange={(e) =>
                          updateStudentMode(
                            s,
                            e.target.value as "online" | "offline",
                          )
                        }
                        className="input-admin sm:w-48"
                      >
                        <option value="online">أونلاين</option>
                        <option value="offline">أوفلاين</option>
                      </select>
                    </div>
                    <CourseAccess
                      student={s}
                      courses={learningCourses}
                      onChange={(courseIds) =>
                        updateStudentCourses(s, courseIds)
                      }
                    />
                  </article>
                ))
              )}
            </div>
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
                      <span className="block text-base font-black text-slate-900">حدد القسم والمراحل</span>
                      <p className="mt-1 text-xs text-slate-500">الملف سيصل للطلاب حسب مرحلتهم مباشرةً، ولا يحتاج إنشاء كورس أولًا.</p>
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
                      <div className="flex min-h-12 flex-wrap gap-2 rounded-xl border border-slate-300 bg-white p-2">
                        {!selectedFileTrack && <span className="p-1 text-sm text-slate-400">اختر القسم التعليمي أولًا</span>}
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
                        {fileStageGroups.map((group) => <div key={group.title} className="w-full rounded-xl bg-slate-50 p-3">
                          <strong className="mb-2 block text-xs text-slate-800">{group.title}</strong>
                          <div className="flex flex-wrap gap-2">{group.stages.map((stage) => {
                            const checked = fileForm.stages.includes(stage);
                            return <button key={stage} type="button" onClick={() => {
                              const stages = checked ? fileForm.stages.filter((item) => item !== stage) : [...fileForm.stages, stage];
                              setFileForm({ ...fileForm, stages, stage: stages[0] || "" });
                            }} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${checked ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-primary"}`}>
                              {stage.replace(`${group.title} · `, "")}
                            </button>;
                          })}</div>
                        </div>)}
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
            <div className="grid xl:grid-cols-[1fr_320px] gap-6">
              <form
                onSubmit={createQuiz}
                className="rounded-2xl border bg-card p-5 space-y-5"
              >
                <div><h3 className="font-black text-lg">{editingQuizId ? "تعديل الاختبار" : "إنشاء اختبار جديد"}</h3><p className="text-xs text-muted-foreground">حدد هل الاختبار للكورس كله أم تابع لدرس، ثم أضف الأسئلة.</p></div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field label="اسم الاختبار">
                    <input
                      required
                      value={quizForm.title}
                      onChange={(e) =>
                        setQuizForm({ ...quizForm, title: e.target.value })
                      }
                      className="input-admin"
                    />
                  </Field>
                  <Field label="الكورس المرتبط بالاختبار">
                    <select
                      required
                      value={quizForm.courseId}
                      onChange={(e) => {
                        const course = learningCourses.find(
                          (item) => String(item.id) === e.target.value,
                        );
                        setQuizForm({
                          ...quizForm,
                          courseId: e.target.value,
                          category: course?.title || "",
                          stage: "",
                          stages: [],
                          videoId: "",
                        });
                      }}
                      className="input-admin"
                    >
                      <option value="">اختر الكورس</option>
                      {learningCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="المراحل / المجموعات">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      {availableQuizStages.length > 5 && (
                        <div className="relative mb-3">
                          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input value={quizStageSearch} onChange={(event) => setQuizStageSearch(event.target.value)} placeholder="ابحث داخل المراحل..." className="input-admin min-h-10 pr-9 text-xs" />
                        </div>
                      )}
                      {quizForm.stages.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
                          <span className="ml-1 text-[11px] font-bold text-slate-500">المحدد ({quizForm.stages.length}):</span>
                          {quizForm.stages.map((stage) => <span key={stage} className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{stage}</span>)}
                        </div>
                      )}
                      <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
                      {visibleQuizStages.map((stage) => {
                        const selected = quizForm.stages.includes(stage);
                        return (
                          <button
                            key={stage}
                            type="button"
                            onClick={() => {
                              const stages = selected
                                ? quizForm.stages.filter((item) => item !== stage)
                                : [...quizForm.stages, stage];
                              setQuizForm({ ...quizForm, stages, stage: stages[0] || "", videoId: "" });
                            }}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold ${selected ? "border-primary bg-primary text-white" : "border-slate-200 bg-slate-50 text-slate-600"}`}
                          >
                            {stage === "عام" ? "كل مراحل الكورس" : stage}
                          </button>
                        );
                      })}
                      {availableQuizStages.length === 0 && <span className="px-2 py-1 text-xs text-muted-foreground">اختر الكورس أولًا</span>}
                      {availableQuizStages.length > 0 && visibleQuizStages.length === 0 && <span className="px-2 py-1 text-xs text-muted-foreground">لا توجد مرحلة مطابقة للبحث</span>}
                      </div>
                    </div>
                  </Field>
                  <Field label="نوع الاختبار">
                    <select value={quizForm.scope} onChange={(event) => setQuizForm({ ...quizForm, scope: event.target.value as "course" | "lesson", videoId: "" })} className="input-admin">
                      <option value="course">اختبار للكورس</option>
                      <option value="lesson">اختبار بعد درس</option>
                    </select>
                  </Field>
                  {quizForm.scope === "lesson" && <Field label="الدرس المطلوب">
                    <select required value={quizForm.videoId} onChange={(event) => setQuizForm({ ...quizForm, videoId: event.target.value })} className="input-admin">
                      <option value="">اختر الدرس</option>
                      {videoOptions.filter((video) => {
                        if (video.category !== quizForm.category) return false;
                        const videoStages = video.stages?.length ? video.stages : video.stage ? [video.stage] : [];
                        return quizForm.stages.some((stage) => stage === "عام" || videoStages.includes(stage));
                      }).map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}
                    </select>
                  </Field>}
                  <Field label="درجة النجاح %">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={quizForm.passingScore}
                      onChange={(e) =>
                        setQuizForm({
                          ...quizForm,
                          passingScore: Number(e.target.value),
                        })
                      }
                      className="input-admin"
                    />
                  </Field>
                  <Field label="عدد المحاولات">
                    <input type="number" min="1" max="20" value={quizForm.maxAttempts} onChange={(event) => setQuizForm({ ...quizForm, maxAttempts: Number(event.target.value) })} className="input-admin" />
                  </Field>
                  {quizForm.scope === "lesson" && <Field label="نسبة مشاهدة الدرس المطلوبة %">
                    <input type="number" min="0" max="100" value={quizForm.requiredProgress} onChange={(event) => setQuizForm({ ...quizForm, requiredProgress: Number(event.target.value) })} className="input-admin" />
                  </Field>}
                </div>
                <section className="rounded-2xl border-2 border-dashed border-primary/25 bg-primary/5 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary/10 p-3 text-primary"><Upload className="h-5 w-5" /></div>
                      <div>
                        <h4 className="font-black">استيراد الأسئلة من ملف</h4>
                        <p className="mt-1 text-xs text-muted-foreground">PDF أو Word (DOCX) أو TXT — يدعم الأسئلة والاختيارات والإجابة الصحيحة بالعربية والإنجليزية.</p>
                      </div>
                    </div>
                    <input
                      ref={quizImportInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      className="hidden"
                      onChange={(event) => event.target.files?.[0] && importQuizQuestions(event.target.files[0])}
                    />
                    <Button type="button" variant="outline" disabled={isImportingQuestions} onClick={() => quizImportInputRef.current?.click()}>
                      {isImportingQuestions ? <Loader2 className="animate-spin" /> : <Upload />}
                      {isImportingQuestions ? "جارٍ استخراج الأسئلة..." : "اختر ملف الأسئلة"}
                    </Button>
                  </div>
                  <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs text-slate-600">
                    مثال: <b>1. نص السؤال</b> ثم <b>A) الاختيار الأول</b> ... ثم <b>Answer: B</b> أو <b>الإجابة: ب</b>. ستظل كل الأسئلة قابلة للتعديل قبل النشر.
                  </p>
                  {importWarnings.length > 0 && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <strong className="flex items-center gap-1"><AlertCircle className="h-4 w-4" /> راجع الإجابات التالية</strong>
                      <ul className="mt-2 list-disc space-y-1 pr-5">{importWarnings.slice(0, 6).map((warning, index) => <li key={index}>{warning}</li>)}</ul>
                    </div>
                  )}
                </section>

                <div className="flex items-center justify-between">
                  <div><h4 className="font-black text-lg">أسئلة الاختبار</h4><p className="text-xs text-muted-foreground">حدد الدائرة بجوار الإجابة الصحيحة.</p></div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-black text-primary">{quizForm.questions.length} سؤال</span>
                </div>
                {quizForm.questions.map((q, qi) => (
                  <div
                    key={qi}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-black text-white">{qi + 1}</span><strong className="truncate">{q.prompt || `السؤال ${qi + 1}`}</strong></div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => duplicateQuestion(qi)} title="تكرار السؤال" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-primary"><Copy className="h-4 w-4" /></button>
                        <button type="button" onClick={() => toggleQuestion(qi)} title={collapsedQuestions.has(qi) ? "فتح السؤال" : "طي السؤال"} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
                          {collapsedQuestions.has(qi) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </button>
                        {quizForm.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setQuizForm({
                              ...quizForm,
                              questions: quizForm.questions.filter(
                                (_, i) => i !== qi,
                              ),
                            })
                          }
                          title="حذف السؤال"
                          className="grid h-9 w-9 place-items-center rounded-lg text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        )}
                      </div>
                    </div>
                    <div className={collapsedQuestions.has(qi) ? "hidden" : "space-y-3 p-4"}>
                    <input
                      required
                      placeholder="نص السؤال"
                      value={q.prompt}
                      onChange={(e) =>
                        setQuestion(qi, { prompt: e.target.value })
                      }
                      className="input-admin"
                    />
                    <div className="grid sm:grid-cols-2 gap-2">
                      {q.options.map((option, oi) => (
                        <label key={oi} className={`flex items-center gap-2 rounded-xl border p-2 transition ${q.correctIndex === oi ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}>
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={q.correctIndex === oi}
                            onChange={() =>
                              setQuestion(qi, { correctIndex: oi })
                            }
                          />
                          <input
                            required
                            placeholder={`الاختيار ${String.fromCharCode(65 + oi)}`}
                            value={option}
                            onChange={(e) =>
                              setQuestion(qi, {
                                options: q.options.map((o, i) =>
                                  i === oi ? e.target.value : o,
                                ),
                              })
                            }
                            className="input-admin"
                          />
                        </label>
                      ))}
                    </div>
                    </div>
                  </div>
                ))}
                <div className="sticky bottom-3 z-20 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setQuizForm({
                        ...quizForm,
                        questions: [
                          ...quizForm.questions,
                          {
                            prompt: "",
                            options: ["", "", "", ""],
                            correctIndex: 0,
                          },
                        ],
                      })
                    }
                  >
                    <Plus /> إضافة سؤال
                  </Button>
                  <label className="flex items-center gap-2 rounded-xl border px-3 text-sm"><input type="checkbox" checked={quizForm.isPublished} onChange={(event) => setQuizForm({ ...quizForm, isPublished: event.target.checked })} /> نشر للطلاب فورًا</label>
                  <Button type="submit">{editingQuizId ? "حفظ التعديلات" : quizForm.isPublished ? "إنشاء ونشر" : "حفظ كمسودة"}</Button>
                  {editingQuizId && <Button type="button" variant="ghost" onClick={resetQuizForm}>إلغاء التعديل</Button>}
                </div>
              </form>
              <div className="space-y-3">
                {quizzes.map((q) => (
                  <article
                    key={q.id}
                    className="rounded-2xl border bg-card p-4"
                  >
                    <h3 className="font-black">{q.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {q.scope === "lesson" ? `اختبار درس: ${videoOptions.find((video) => video.id === q.videoId)?.title || "درس غير متاح"}` : "اختبار على مستوى الكورس"}
                      {" · "}{q.questions.length} سؤال · نجاح {q.passingScore}% · {q.maxAttempts || 3} محاولات
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(q.stages?.length ? q.stages : q.stage ? [q.stage] : []).join("، ") || "بدون مرحلة"} · {q.isPublished ? "منشور" : "مسودة"}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editQuiz(q)}
                      >
                        <Edit2 className="h-4 w-4" /> تعديل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleQuiz(q)}
                      >
                        {q.isPublished ? "إخفاء" : "نشر"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteQuiz(q.id)}
                      >
                        <Trash2 /> حذف
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
          {tab === "results" && (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-4 text-right">الطالب</th>
                    <th className="p-4 text-right">الاختبار</th>
                    <th className="p-4">النتيجة</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-4 font-bold">{a.studentName}</td>
                      <td className="p-4">{a.quizTitle}</td>
                      <td className="p-4 text-center font-black">{a.score}%</td>
                      <td className="p-4 text-center">
                        {a.passed ? "ناجح" : "لم ينجح"}
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === "reports" && analytics && (
            <div className="space-y-6">
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

              <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b p-5">
                  <h3 className="text-lg font-black">متابعة تقدم الطلاب</h3>
                  <p className="text-xs text-slate-500">الأقل نشاطًا ظاهرين الأول علشان المتابعة تكون أسرع.</p>
                </div>
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-4 text-right">الطالب</th>
                      <th className="p-4">الدروس</th>
                      <th className="p-4">مكتمل</th>
                      <th className="p-4">متوسط التقدم</th>
                      <th className="p-4">الاختبارات</th>
                      <th className="p-4">آخر نشاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...analytics.students].sort((a, b) => Number(a.isActive) - Number(b.isActive)).map((row) => (
                      <tr key={row.studentId} className="border-t">
                        <td className="p-4"><strong className="block">{row.name}</strong><span className="text-xs text-slate-500" dir="ltr">{row.phone}</span></td>
                        <td className="p-4 text-center">{row.startedLessons}/{row.assignedLessons}</td>
                        <td className="p-4 text-center font-bold text-emerald-700">{row.completedLessons}</td>
                        <td className="p-4 text-center font-black">{row.averageProgress}%</td>
                        <td className="p-4 text-center">{row.quizAttempts} · {row.averageQuizScore}%</td>
                        <td className="p-4 text-center">
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {row.lastActivity ? new Date(row.lastActivity).toLocaleDateString("ar-EG") : "لسه مبدأش"}
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
