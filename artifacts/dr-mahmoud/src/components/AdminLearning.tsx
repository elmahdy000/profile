import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ClipboardCheck,
  Copy,
  FileText,
  Eye,
  Download,
  Minus,
  Search,
  HardDrive,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getStagesForTrack } from "@/data/academic";

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
  title: string;
  category: string;
  stage?: string | null;
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
type Quiz = {
  id: number;
  title: string;
  category: string;
  stage?: string | null;
  passingScore: number;
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
  const [learningCourses, setLearningCourses] = useState<
    Array<{ id: number; title: string; category: string }>
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
  const [showFilePreview, setShowFilePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileForm, setFileForm] = useState({
    title: "",
    stage: "أولى بكالوريا",
    category: "",
    subject: "",
    tags: "",
    order: 1,
    description: "",
    file: null as File | null,
  });
  const [quizForm, setQuizForm] = useState({
    title: "",
    category: "",
    stage: "",
    description: "",
    passingScore: 60,
    questions: [
      { prompt: "", options: ["", "", "", ""], correctIndex: 0 },
    ] as Question[],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [s, f, q, a, v, c, analyticsData, recoveryData] = await Promise.all([
        adminApi<Student[]>("/api/admin/students"),
        adminApi<FileItem[]>("/api/admin/learning/files"),
        adminApi<Quiz[]>("/api/admin/learning/quizzes"),
        adminApi<Attempt[]>("/api/admin/learning/attempts"),
        adminApi<Array<{ category: string }>>("/api/videos"),
        adminApi<Array<{ id: number; title: string; category: string }>>("/api/courses"),
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
    load();
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
  const getNextFileNumber = (stage: string, category: string) =>
    Math.max(
      0,
      ...files
        .filter(
          (file) =>
            (file.stage || "") === stage &&
            file.category.trim().toLowerCase() ===
              category.trim().toLowerCase(),
        )
        .map((file) => Number(file.order) || 0),
    ) + 1;
  const uploadFile = async (isPublished: boolean) => {
    if (!fileForm.file || fileForm.order < 1) {
      toast({
        variant: "destructive",
        description: "اختار الملف وحدد رقمه داخل الدرس.",
      });
      return;
    }
    const duplicate = files.find(
      (file) =>
        file.originalName.toLowerCase() === fileForm.file?.name.toLowerCase() &&
        file.category.trim().toLowerCase() ===
          fileForm.category.trim().toLowerCase() &&
        (file.stage || "") === fileForm.stage,
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
    body.append("category", fileForm.category);
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
          const data = JSON.parse(request.responseText || "{}");
          if (request.status >= 200 && request.status < 300)
            resolve(data as FileItem);
          else reject(new Error(data.error || "تعذر رفع الملف"));
        };
        request.onerror = () =>
          reject(new Error("تعذر الاتصال أثناء رفع الملف"));
        request.send(body);
      });
      setFiles([created, ...files]);
      setFileForm({
        ...fileForm,
        title: "",
        order: fileForm.order + 1,
        description: "",
        file: null,
      });
      toast({
        title: isPublished ? "تم رفع ونشر الملف" : "تم حفظ الملف كمسودة",
        description:
          "احتفظنا ببيانات المرحلة والكورس لتقدر ترفع الملف اللي بعده بسرعة.",
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
    const title = prompt("اسم الملف الجديد", file.title)?.trim();
    if (!title || title === file.title) return;
    const updated = await adminApi<FileItem>(
      `/api/admin/learning/files/${file.id}`,
      { method: "PATCH", body: JSON.stringify({ title }) },
    );
    setFiles(files.map((item) => (item.id === file.id ? updated : item)));
    toast({ title: "تم تحديث اسم الملف" });
  };
  const createQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await adminApi<Quiz>("/api/admin/learning/quizzes", {
        method: "POST",
        body: JSON.stringify(quizForm),
      });
      setQuizzes([created, ...quizzes]);
      setQuizForm({
        title: "",
        category: "",
        stage: "",
        description: "",
        passingScore: 60,
        questions: [{ prompt: "", options: ["", "", "", ""], correctIndex: 0 }],
      });
      toast({ title: "تم إنشاء الاختبار" });
    } catch (e) {
      toast({ variant: "destructive", description: (e as Error).message });
    }
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
  const availableCategories = Array.from(
    new Set([
      ...videoCategories,
      ...files.map((file) => file.category),
      ...quizzes.map((quiz) => quiz.category),
    ]),
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ar"));
  const selectedFileCourse = learningCourses.find(
    (course) => course.title === fileForm.category,
  );
  const availableFileStages = getStagesForTrack(selectedFileCourse?.category);
  const selectedQuizCourse = learningCourses.find(
    (course) => course.title === quizForm.category,
  );
  const availableQuizStages = getStagesForTrack(selectedQuizCourse?.category);
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
            (file.stage || "غير محدد") === fileStageFilter) &&
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
  return (
    <div className="space-y-6" dir="rtl">
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
                            onClick={() =>
                              navigator.clipboard.writeText(s.accessCode!)
                            }
                            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-primary"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {s.accessCode}
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
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.7fr)]">
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
                      أضف ملفات الدروس والمراجعات والتمارين ثم انشرها للطلاب.
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="اسم الملف أو الدرس">
                      <input
                        required
                        value={fileForm.title}
                        onChange={(e) =>
                          setFileForm({ ...fileForm, title: e.target.value })
                        }
                        placeholder="مثال: مراجعة الدرس الثالث"
                        className="input-admin min-h-12 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                    </Field>
                    <Field label="المرحلة الدراسية">
                      <select
                        required
                        value={fileForm.stage}
                        onChange={(e) =>
                          setFileForm({ ...fileForm, stage: e.target.value })
                        }
                        className="input-admin min-h-12 border-slate-300 focus:border-primary"
                      >
                        {availableFileStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage === "عام" ? "عام لكل مراحل الكورس" : stage}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="الكورس المرتبط بالملف">
                      <select
                        required
                        value={fileForm.category}
                        onChange={(e) => {
                          const course = learningCourses.find(
                            (item) => item.title === e.target.value,
                          );
                          const stages = getStagesForTrack(course?.category);
                          setFileForm({
                            ...fileForm,
                            category: e.target.value,
                            stage: stages[0] || "عام",
                          });
                        }}
                        className="input-admin min-h-12 border-slate-300 focus:border-primary"
                      >
                        <option value="">اختر الكورس أولًا</option>
                        {learningCourses.map((course) => (
                          <option key={course.id} value={course.title}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="المادة">
                      <input
                        required
                        value={fileForm.subject}
                        onChange={(e) =>
                          setFileForm({ ...fileForm, subject: e.target.value })
                        }
                        placeholder="مثال: البرمجة وعلوم الحاسب"
                        className="input-admin min-h-12 border-slate-300 focus:border-primary"
                      />
                    </Field>
                    <Field label="رقم الملف داخل الدرس">
                      <div className="flex min-h-12 overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                        <button
                          type="button"
                          aria-label="تقليل رقم الملف"
                          onClick={() =>
                            setFileForm({
                              ...fileForm,
                              order: Math.max(1, fileForm.order - 1),
                            })
                          }
                          className="grid w-12 place-items-center border-l text-slate-500 hover:bg-slate-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          required
                          value={fileForm.order}
                          onChange={(e) =>
                            setFileForm({
                              ...fileForm,
                              order: Math.max(1, Number(e.target.value)),
                            })
                          }
                          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-center font-bold outline-none"
                        />
                        <button
                          type="button"
                          aria-label="زيادة رقم الملف"
                          onClick={() =>
                            setFileForm({
                              ...fileForm,
                              order: fileForm.order + 1,
                            })
                          }
                          className="grid w-12 place-items-center border-r text-primary hover:bg-primary/5"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        بيحدد ترتيب ظهور الملف داخل الدرس. الرقم المقترح التالي:{" "}
                        {getNextFileNumber(fileForm.stage, fileForm.category)}
                      </p>
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

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      الملف المرفق
                    </label>
                    <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-primary hover:bg-blue-50/40">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.zip,.ppt,.pptx,.txt,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setFileForm({
                            ...fileForm,
                            file,
                            title:
                              fileForm.title ||
                              file?.name.replace(/\.[^.]+$/, "") ||
                              "",
                          });
                          setShowFilePreview(false);
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label="اختيار ملف تعليمي"
                      />
                      <Upload className="mx-auto h-10 w-10 text-primary" />
                      <strong className="mt-3 block text-sm text-slate-800">
                        اسحب الملف هنا أو اضغط للاختيار
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        PDF, DOCX, ZIP, PPTX — بحد أقصى 150MB
                      </span>
                    </div>
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

                  <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploadingFile || !fileForm.file}
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
                      disabled={isUploadingFile || !fileForm.file}
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

                <aside className="space-y-4 xl:sticky xl:top-6">
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="flex items-center gap-2 font-black text-slate-900">
                      <ListChecks className="h-5 w-5 text-primary" />
                      قائمة النشر
                    </h3>
                    <ul className="mt-4 space-y-3 text-sm text-slate-600">
                      {[
                        "اكتب اسم واضح للملف والدرس",
                        "تأكد من المرحلة والكورس",
                        "راجع رقم الملف وترتيبه",
                        "عاين الملف قبل النشر",
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="flex items-center gap-2 font-black text-slate-900">
                      <HardDrive className="h-5 w-5 text-primary" />
                      مواصفات الرفع
                    </h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">الصيغ المدعومة</span>
                        <strong>PDF, DOCX, ZIP, PPTX</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">أقصى حجم</span>
                        <strong>150MB</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">حالة النشر</span>
                        <strong className="text-emerald-600">
                          فوري أو مسودة
                        </strong>
                      </div>
                    </div>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-black text-slate-900">آخر الملفات</h3>
                    <div className="mt-4 space-y-3">
                      {files.slice(0, 3).map((file) => (
                        <button
                          type="button"
                          key={file.id}
                          onClick={() => setPreviewFile(file)}
                          className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-right hover:bg-slate-50"
                        >
                          <FileText className="h-5 w-5 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <strong className="block truncate text-xs">
                              {file.title}
                            </strong>
                            <small className="text-[11px] text-slate-500">
                              {file.category} ·{" "}
                              {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB
                            </small>
                          </span>
                        </button>
                      ))}
                      {files.length === 0 && (
                        <p className="text-sm text-slate-500">
                          لسه مفيش ملفات مرفوعة.
                        </p>
                      )}
                    </div>
                  </article>
                </aside>
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
                        <option value="all">كل الكورسات</option>
                        {availableCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
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
                            files.map((file) => file.stage || "غير محدد"),
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
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="p-4 text-right">اسم الملف</th>
                          <th className="p-4 text-right">الكورس</th>
                          <th className="p-4 text-right">المرحلة</th>
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
                            <td className="p-4">{file.category}</td>
                            <td className="p-4">{file.stage || "غير محدد"}</td>
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
                                  <Plus className="h-4 w-4 rotate-45" />
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
                <h3 className="font-black text-lg">إنشاء اختبار</h3>
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
                      value={quizForm.category}
                      onChange={(e) => {
                        const course = learningCourses.find(
                          (item) => item.title === e.target.value,
                        );
                        const stages = getStagesForTrack(course?.category);
                        setQuizForm({
                          ...quizForm,
                          category: e.target.value,
                          stage: stages[0] || "",
                        });
                      }}
                      className="input-admin"
                    >
                      <option value="">اختر الكورس</option>
                      {learningCourses.map((course) => (
                        <option key={course.id} value={course.title}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="المرحلة / المجموعة">
                    <select
                      required
                      value={quizForm.stage}
                      onChange={(e) =>
                        setQuizForm({ ...quizForm, stage: e.target.value })
                      }
                      className="input-admin"
                    >
                      <option value="">اختر المرحلة</option>
                      {availableQuizStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage === "عام" ? "عام لكل مراحل الكورس" : stage}
                        </option>
                      ))}
                    </select>
                  </Field>
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
                </div>
                {quizForm.questions.map((q, qi) => (
                  <div
                    key={qi}
                    className="rounded-2xl bg-muted/50 p-4 space-y-3"
                  >
                    <div className="flex justify-between">
                      <strong>السؤال {qi + 1}</strong>
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
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
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
                        <label key={oi} className="flex items-center gap-2">
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
                            placeholder={`الإجابة ${oi + 1}`}
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
                ))}
                <div className="flex gap-2">
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
                  <Button type="submit">نشر الاختبار</Button>
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
                      {q.questions.length} سؤال · نجاح {q.passingScore}% ·{" "}
                      {q.isPublished ? "منشور" : "مخفي"}
                    </p>
                    <div className="mt-3 flex gap-2">
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
