import React, { useState, useEffect, useMemo } from "react";
import {
  FileEdit,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Search,
  Users,
  Award,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Send,
  Upload,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ACADEMIC_TRACKS } from "@/data/academic";

interface EssayQuestion {
  id: string;
  prompt: string;
  points: number;
  imageUrl?: string;
  modelAnswer: string;
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
  questions: EssayQuestion[];
  allowImageUpload: boolean;
  isPublished: boolean;
  submissionsCount?: number;
  pendingCount?: number;
  reviewedCount?: number;
  createdAt?: string;
}

interface EssaySubmission {
  id: number;
  examId: number;
  examTitle?: string;
  studentId: number;
  studentName?: string;
  studentPhone?: string;
  studentGrade?: string;
  status: "in_progress" | "submitted" | "reviewed";
  startedAt: string;
  submittedAt?: string;
  timeSpentSeconds?: number;
  adminScore?: number;
  adminFeedback?: string;
  answers: Array<{
    questionId: string;
    writtenText?: string;
    attachmentUrl?: string;
    score?: number;
    feedback?: string;
  }>;
}

export function EssayExamsAdminTab({
  role = "superadmin",
}: {
  role?: "superadmin" | "subadmin";
}) {
  const { toast } = useToast();
  const [exams, setExams] = useState<EssayExam[]>([]);
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"exams" | "submissions">("exams");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  // Create / Edit Exam Modal
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [examFormData, setExamFormData] = useState<{
    title: string;
    description: string;
    stage: string;
    category: string;
    durationMinutes: number;
    allowImageUpload: boolean;
    isPublished: boolean;
    questions: EssayQuestion[];
  }>({
    title: "",
    description: "",
    stage: "الصف الثالث الثانوي",
    category: "الكيمياء العامة",
    durationMinutes: 60,
    allowImageUpload: true,
    isPublished: true,
    questions: [
      {
        id: "q_1",
        prompt: "",
        points: 10,
        modelAnswer: "",
        explanation: "",
      },
    ],
  });
  const [savingExam, setSavingExam] = useState(false);

  // Review / Grade Submission Modal
  const [gradingSubmission, setGradingSubmission] = useState<EssaySubmission | null>(null);
  const [gradingExam, setGradingExam] = useState<EssayExam | null>(null);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

  // Lightbox Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 1. Load exams
  const loadExams = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/admin/learning/essay-exams", { credentials: "include" });
      if (!res.ok) throw new Error("تعذر جلب الامتحانات المقالية");
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "تعذر تحميل الامتحانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Load all submissions or for an exam
  const loadSubmissions = async (examId?: number) => {
    try {
      setLoading(true);
      if (examId) {
        const res = await fetch(`/api/admin/learning/essay-exams/${examId}/submissions`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("تعذر جلب الإجابات");
        const data = await res.json();
        const subsList: EssaySubmission[] = Array.isArray(data) ? data : (data?.submissions || []);
        setSubmissions(subsList);
      } else {
        // Aggregate across exams
        const res = await fetch("/api/admin/learning/essay-exams", { credentials: "include" });
        if (res.ok) {
          const examsData: EssayExam[] = await res.json();
          let allSubs: EssaySubmission[] = [];
          for (const ex of (Array.isArray(examsData) ? examsData : [])) {
            const sRes = await fetch(`/api/admin/learning/essay-exams/${ex.id}/submissions`, {
              credentials: "include",
            });
            if (sRes.ok) {
              const sData = await sRes.json();
              const subsList: EssaySubmission[] = Array.isArray(sData) ? sData : (sData?.submissions || []);
              allSubs = [...allSubs, ...subsList.map((s) => ({ ...s, examTitle: ex.title }))];
            }
          }
          setSubmissions(allSubs);
        }
      }
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "تعذر جلب الإجابات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (activeSubTab === "submissions") {
      loadSubmissions();
    }
  }, [activeSubTab]);

  // Handle open create exam modal
  const handleOpenCreateModal = () => {
    setEditingExamId(null);
    setExamFormData({
      title: "",
      description: "",
      stage: "الصف الثالث الثانوي",
      category: "الكيمياء العامة",
      durationMinutes: 60,
      allowImageUpload: true,
      isPublished: true,
      questions: [
        {
          id: `q_${Date.now()}_1`,
          prompt: "",
          points: 10,
          modelAnswer: "",
          explanation: "",
        },
      ],
    });
    setExamModalOpen(true);
  };

  // Handle open edit exam modal
  const handleOpenEditModal = (exam: EssayExam) => {
    setEditingExamId(exam.id);
    setExamFormData({
      title: exam.title,
      description: exam.description || "",
      stage: exam.stage || "الصف الثالث الثانوي",
      category: exam.category || "الكيمياء العامة",
      durationMinutes: exam.durationMinutes || 60,
      allowImageUpload: exam.allowImageUpload ?? true,
      isPublished: exam.isPublished ?? true,
      questions: (exam.questions || []).map((q, idx) => ({
        ...q,
        id: q.id || `q_${Date.now()}_${idx}`,
      })),
    });
    setExamModalOpen(true);
  };

  // Add question to builder
  const handleAddQuestion = () => {
    setExamFormData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q_${Date.now()}_${prev.questions.length + 1}`,
          prompt: "",
          points: 10,
          modelAnswer: "",
          explanation: "",
        },
      ],
    }));
  };

  // Remove question from builder
  const handleRemoveQuestion = (idx: number) => {
    if (examFormData.questions.length <= 1) {
      toast({
        title: "تنبيه",
        description: "يجب أن يحتوي الاختبار على سؤال واحد على الأقل",
        variant: "warning",
      });
      return;
    }
    setExamFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  // Update question field
  const handleUpdateQuestion = (idx: number, field: keyof EssayQuestion, value: any) => {
    setExamFormData((prev) => {
      const copy = [...prev.questions];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, questions: copy };
    });
  };

  // Calculate total points
  const calculatedTotalPoints = useMemo(() => {
    return examFormData.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  }, [examFormData.questions]);

  // Save Exam (Create or Edit)
  const handleSaveExam = async () => {
    if (!examFormData.title.trim()) {
      toast({ title: "بيانات ناقصة", description: "يرجى كتابة عنوان الاختبار المقالي", variant: "warning" });
      return;
    }
    for (let i = 0; i < examFormData.questions.length; i++) {
      const q = examFormData.questions[i];
      if (!q.prompt.trim()) {
        toast({ title: "بيانات ناقصة", description: `يرجى كتابة نص السؤال رقم (${i + 1})`, variant: "warning" });
        return;
      }
      if (!q.modelAnswer.trim()) {
        toast({
          title: "بيانات ناقصة",
          description: `يرجى إدخال الحل النموذجي والمثالي المعتمد للسؤال رقم (${i + 1})`,
          variant: "warning",
        });
        return;
      }
    }

    try {
      setSavingExam(true);
      const payload = {
        title: examFormData.title,
        description: examFormData.description,
        stage: examFormData.stage,
        stages: [examFormData.stage],
        category: examFormData.category,
        durationMinutes: examFormData.durationMinutes || 60,
        totalPoints: calculatedTotalPoints,
        questions: examFormData.questions,
        allowImageUpload: examFormData.allowImageUpload,
        isPublished: examFormData.isPublished,
      };

      const url = editingExamId
        ? `/api/admin/learning/essay-exams/${editingExamId}`
        : "/api/admin/learning/essay-exams";
      const method = editingExamId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "تعذر حفظ الاختبار");
      }

      toast({
        title: editingExamId ? "تم تحديث الامتحان بنجاح ✅" : "تم إنشاء الامتحان المقالي بنجاح 🎉",
        description: "الامتحان متاح الآن للطلاب مع مؤقت الـ 60 دقيقة والحل النموذجي",
      });

      setExamModalOpen(false);
      loadExams(true);
    } catch (err: any) {
      toast({
        title: "خطأ في الحفظ",
        description: err.message || "حدث خطأ أثناء حفظ الاختبار المقالي",
        variant: "destructive",
      });
    } finally {
      setSavingExam(false);
    }
  };

  // Delete Exam
  const handleDeleteExam = async (exam: EssayExam) => {
    if (!window.confirm(`هل أنت متأكد من حذف الامتحان المقالي «${exam.title}»؟ سيتم حذف جميع إجابات الطلاب المتعلقة به.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/learning/essay-exams/${exam.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("تعذر حذف الاختبار");
      toast({ title: "تم الحذف", description: "تم حذف الامتحان المقالي بنجاح" });
      loadExams(true);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  // Open grading modal for a student submission
  const handleOpenGradingModal = (sub: EssaySubmission) => {
    const parentExam = exams.find((e) => e.id === sub.examId);
    setGradingExam(parentExam || null);
    setGradingSubmission(sub);

    // Initialize scores
    const initialScores: Record<string, number> = {};
    if (sub.answers) {
      sub.answers.forEach((ans) => {
        initialScores[ans.questionId] = ans.score ?? 0;
      });
    }
    setQuestionScores(initialScores);
    setOverallFeedback(sub.adminFeedback || "");
  };

  // Submit Grade
  const handleSaveGrade = async () => {
    if (!gradingSubmission) return;
    try {
      setSavingGrade(true);
      const totalScore = Object.values(questionScores).reduce((a, b) => a + (Number(b) || 0), 0);

      const res = await fetch(`/api/admin/learning/essay-exams/submissions/${gradingSubmission.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          adminScore: totalScore,
          adminFeedback: overallFeedback,
          status: "reviewed",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "تعذر اعتماد الدرجة");
      }

      toast({
        title: "تم اعتماد التصحيح بنجاح 🏆",
        description: `تم رصد الدرجة (${totalScore}) وإرسال إشعار فوري للطالب على جهازه!`,
      });

      setGradingSubmission(null);
      if (activeSubTab === "submissions") {
        loadSubmissions();
      }
      loadExams(true);
    } catch (err: any) {
      toast({
        title: "خطأ في الاعتماد",
        description: err.message || "حدث خطأ أثناء اعتماد الدرجة",
        variant: "destructive",
      });
    } finally {
      setSavingGrade(false);
    }
  };

  // Metrics
  const totalExamsCount = exams.length;
  const totalSubmissionsCount = exams.reduce((acc, e) => acc + (e.submissionsCount || 0), 0);
  const pendingReviewCount = exams.reduce((acc, e) => acc + (e.pendingCount || 0), 0);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(search.toLowerCase()));
      const matchStage = stageFilter === "all" || e.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [exams, search, stageFilter]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchSearch =
        (s.studentName && s.studentName.toLowerCase().includes(search.toLowerCase())) ||
        (s.studentPhone && s.studentPhone.includes(search)) ||
        (s.examTitle && s.examTitle.toLowerCase().includes(search.toLowerCase()));
      return matchSearch;
    });
  }, [submissions, search]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header & Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <FileEdit className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-semibold">إجمالي الامتحانات المقالية</span>
            <h4 className="text-xl font-black text-foreground">{totalExamsCount}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-semibold">إجمالي إجابات الطلاب</span>
            <h4 className="text-xl font-black text-foreground">{totalSubmissionsCount}</h4>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-semibold">بانتظار المراجعة والتصحيح</span>
            <h4 className="text-xl font-black text-amber-600 dark:text-amber-400">{pendingReviewCount}</h4>
          </div>
        </div>
      </div>

      {/* 2. Action Bar & SubTabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-border pb-4">
        {/* Subtabs switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-muted/50 p-1 border border-border w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("exams")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeSubTab === "exams"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileEdit className="h-4 w-4" />
            الامتحانات المقالية المنشورة
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("submissions")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeSubTab === "submissions"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Award className="h-4 w-4" />
            إجابات وتصحيح الطلاب ({pendingReviewCount})
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-1.5 text-xs shadow-xs"
          >
            <Plus className="h-4 w-4" />
            إنشاء امتحان مقالي جديد ✍️
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeSubTab === "exams") loadExams();
              else loadSubmissions();
            }}
            disabled={loading}
            className="rounded-xl gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeSubTab === "exams"
                ? "ابحث في الامتحانات المقالية بالاسم..."
                : "ابحث باسم الطالب، رقم الهاتف، أو اسم الامتحان..."
            }
            className="w-full rounded-2xl border border-border bg-card pr-10 pl-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          />
        </div>

        {activeSubTab === "exams" && (
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-2xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs w-full sm:w-auto font-medium"
          >
            <option value="all">كل المراحل الدراسية</option>
            {ACADEMIC_TRACKS.flatMap((t) => t.stages).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 4. Tab Content */}
      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mt-2 text-xs font-semibold text-muted-foreground">جاري تحميل البيانات...</span>
        </div>
      ) : activeSubTab === "exams" ? (
        /* ── EXAMS LIST ── */
        filteredExams.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center space-y-3">
            <FileEdit className="h-10 w-10 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-bold text-foreground">لا توجد امتحانات مقالية مطابقة</h4>
            <p className="text-xs text-muted-foreground">انقر على زر "إنشاء امتحان مقالي جديد" لإضافة أول امتحان مقالي للطلاب</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 shadow-xs hover:border-primary/40 transition-all space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 text-xs font-bold">
                      {exam.stage || "الكيمياء"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        exam.isPublished
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {exam.isPublished ? "منشور للطلاب" : "مسودة (مخفي)"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground">{exam.title}</h3>
                    {exam.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{exam.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                    <div className="rounded-xl bg-muted/40 p-2 text-center">
                      <span className="block font-bold text-foreground">{exam.durationMinutes || 60} دقيقة</span>
                      <span>المدة</span>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2 text-center">
                      <span className="block font-bold text-foreground">{exam.questions?.length || 0}</span>
                      <span>الأسئلة</span>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2 text-center">
                      <span className="block font-bold text-amber-600 dark:text-amber-400">{exam.totalPoints}</span>
                      <span>الدرجات</span>
                    </div>
                  </div>

                  {/* Submission badges */}
                  <div className="flex items-center justify-between rounded-xl bg-blue-500/5 border border-blue-500/10 p-2.5 text-xs">
                    <span className="text-muted-foreground font-semibold">إجابات الطلاب:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{exam.submissionsCount || 0} مسلم</span>
                      {(exam.pendingCount || 0) > 0 && (
                        <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                          {exam.pendingCount} ينتظر التصحيح
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      loadSubmissions(exam.id);
                      setActiveSubTab("submissions");
                    }}
                    className="flex-1 rounded-xl text-xs font-bold gap-1"
                  >
                    <Users className="h-3.5 w-3.5" />
                    عرض الإجابات
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditModal(exam)}
                    className="rounded-xl text-xs font-bold p-2 text-blue-600 hover:bg-blue-500/10"
                    title="تعديل الامتحان"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteExam(exam)}
                    className="rounded-xl text-xs font-bold p-2 text-destructive hover:bg-destructive/10"
                    title="حذف الامتحان"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── SUBMISSIONS LIST ── */
        filteredSubmissions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center space-y-2">
            <Award className="h-10 w-10 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-bold text-foreground">لا توجد إجابات مسلمة حالياً</h4>
            <p className="text-xs text-muted-foreground">بمجرد قيام الطلاب ببدء وتسليم الامتحانات المقالية ستظهر إجاباتهم هنا للتصحيح</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                <tr>
                  <th className="p-3.5">اسم الطالب</th>
                  <th className="p-3.5">الامتحان المقالي</th>
                  <th className="p-3.5">وقت التسليم</th>
                  <th className="p-3.5">المدة المستغرقة</th>
                  <th className="p-3.5">الحالة والدرجة</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSubmissions.map((sub) => {
                  const isReviewed = sub.status === "reviewed";

                  return (
                    <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-bold text-foreground">
                        <div>
                          <span>{sub.studentName || `طالب #${sub.studentId}`}</span>
                          {sub.studentPhone && (
                            <span className="block text-[11px] text-muted-foreground font-normal">
                              {sub.studentPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 font-medium text-foreground">
                        {sub.examTitle || `امتحان #${sub.examId}`}
                      </td>

                      <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleDateString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })
                          : "-"}
                      </td>

                      <td className="p-3.5 text-muted-foreground font-medium">
                        {sub.timeSpentSeconds
                          ? `${Math.floor(sub.timeSpentSeconds / 60)} دقيقة و ${sub.timeSpentSeconds % 60} ثانية`
                          : "-"}
                      </td>

                      <td className="p-3.5">
                        {isReviewed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            تم التصحيح ({sub.adminScore} درجة)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            ينتظر المراجعة والتصحيح
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleOpenGradingModal(sub)}
                          className={`rounded-xl text-xs font-bold gap-1 ${
                            isReviewed
                              ? "bg-muted text-foreground hover:bg-muted/80"
                              : "bg-primary text-white hover:bg-primary/90 shadow-xs"
                          }`}
                        >
                          <FileEdit className="h-3.5 w-3.5" />
                          {isReviewed ? "تعديل التقييم" : "تصحيح الإجابة ✍️"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: CREATE / EDIT ESSAY EXAM
      ───────────────────────────────────────────────────────────── */}
      {examModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileEdit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {editingExamId ? "تعديل الامتحان المقالي" : "إنشاء امتحان مقالي جديد ✍️"}
                  </h3>
                  <p className="text-xs text-muted-foreground">حدد الأسئلة، الدرجات، والحل النموذجي المعتمد للطلاب</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExamModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Exam Meta Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-foreground">عنوان الامتحان المقالي *</label>
                <input
                  type="text"
                  value={examFormData.title}
                  onChange={(e) => setExamFormData({ ...examFormData, title: e.target.value })}
                  placeholder="مثال: امتحان مقالي شامل على الكيمياء العضوية ومعادلات تفاعل الألكينات"
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">المرحلة الدراسية *</label>
                <select
                  value={examFormData.stage}
                  onChange={(e) => setExamFormData({ ...examFormData, stage: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                >
                  {ACADEMIC_TRACKS.flatMap((t) => t.stages).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">مدة الامتحان بالدقائق (المؤقت) *</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={examFormData.durationMinutes}
                  onChange={(e) =>
                    setExamFormData({ ...examFormData, durationMinutes: Number(e.target.value) || 60 })
                  }
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-foreground">وصف أو تعليمات الاختبار (اختياري)</label>
                <textarea
                  value={examFormData.description}
                  onChange={(e) => setExamFormData({ ...examFormData, description: e.target.value })}
                  placeholder="تعليمات للطالب، توجيهات كتابة المعادلات، الخ..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="flex items-center gap-4 sm:col-span-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={examFormData.allowImageUpload}
                    onChange={(e) => setExamFormData({ ...examFormData, allowImageUpload: e.target.checked })}
                    className="rounded h-4 w-4 text-primary"
                  />
                  <span>السماح للطالب برفع صورة ورقة الحل (للمعادلات الكيميائية)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={examFormData.isPublished}
                    onChange={(e) => setExamFormData({ ...examFormData, isPublished: e.target.checked })}
                    className="rounded h-4 w-4 text-primary"
                  />
                  <span>نشر الامتحان وظهوره فوراً للطلاب</span>
                </label>
              </div>
            </div>

            {/* Questions Builder */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">أسئلة الامتحان المقالي والحلول النموذجية</h4>
                  <span className="text-xs text-muted-foreground">
                    إجمالي الدرجات: <strong className="text-primary font-black">{calculatedTotalPoints}</strong> درجة
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddQuestion}
                  className="rounded-xl text-xs font-bold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة سؤال جديد
                </Button>
              </div>

              <div className="space-y-4">
                {examFormData.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary text-white text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-foreground">السؤال ({idx + 1})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">الدرجة:</span>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={q.points}
                            onChange={(e) => handleUpdateQuestion(idx, "points", Number(e.target.value) || 1)}
                            className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs text-center font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="حذف السؤال"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">نص السؤال المقالي *</label>
                      <textarea
                        value={q.prompt}
                        onChange={(e) => handleUpdateQuestion(idx, "prompt", e.target.value)}
                        placeholder="اكتب صيغة السؤال المقالي المطلوب من الطالب الإجابة عليه بالتفصيل..."
                        rows={3}
                        className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                      />
                    </div>

                    {/* Optional Question Image URL */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">رابط صورة توضيحية للسؤال (اختياري)</label>
                      <input
                        type="text"
                        value={q.imageUrl || ""}
                        onChange={(e) => handleUpdateQuestion(idx, "imageUrl", e.target.value)}
                        placeholder="https://... أو مسار صورة المعادلة أو الرسم البياني"
                        className="w-full rounded-xl border border-border bg-background p-2 text-xs text-foreground"
                      />
                    </div>

                    {/* Model Answer (Required) */}
                    <div className="space-y-1 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
                      <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        الحل النموذجي والمثالي المعتمد (يظهر للطالب فور التسليم) *
                      </label>
                      <textarea
                        value={q.modelAnswer}
                        onChange={(e) => handleUpdateQuestion(idx, "modelAnswer", e.target.value)}
                        placeholder="اكتب الحل النموذجي والمثالي الكامل بالخطوات والمعادلات والنتائج..."
                        rows={3}
                        className="w-full rounded-xl border border-emerald-500/30 bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs leading-relaxed"
                      />
                    </div>

                    {/* Optional Explanation / Grading Breakdown */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">توضيح خطوات وتوزيع الدرجات (اختياري)</label>
                      <input
                        type="text"
                        value={q.explanation || ""}
                        onChange={(e) => handleUpdateQuestion(idx, "explanation", e.target.value)}
                        placeholder="مثال: خطوة كتابة المعادلة = درجتان، الوزن = درجتان، استنتاج الناتج = درجة..."
                        className="w-full rounded-xl border border-border bg-background p-2 text-xs text-foreground"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                type="button"
                onClick={() => setExamModalOpen(false)}
                disabled={savingExam}
                className="rounded-xl text-xs font-bold"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleSaveExam}
                disabled={savingExam}
                className="rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-2 px-6 shadow-xs"
              >
                {savingExam ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {editingExamId ? "حفظ التعديلات" : "نشر واعتماد الامتحان 🚀"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: GRADING & REVIEWING STUDENT ESSAY SUBMISSION
      ───────────────────────────────────────────────────────────── */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    تصحيح ورقة إجابة: {gradingSubmission.studentName}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {gradingSubmission.examTitle} • استغرق في الحل:{" "}
                    {gradingSubmission.timeSpentSeconds
                      ? `${Math.floor(gradingSubmission.timeSpentSeconds / 60)} دقيقة`
                      : "ساعة"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGradingSubmission(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Questions Grading List */}
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
              {(gradingExam?.questions || []).map((q, idx) => {
                const ans = gradingSubmission.answers.find((a) => a.questionId === q.id);
                const assignedScore = questionScores[q.id] ?? ans?.score ?? 0;

                return (
                  <div key={q.id} className="rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary text-white text-xs font-bold">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-foreground">السؤال ({idx + 1})</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-semibold">
                          رصد الدرجة (من {q.points}):
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={q.points}
                          value={assignedScore}
                          onChange={(e) =>
                            setQuestionScores({
                              ...questionScores,
                              [q.id]: Math.min(q.points, Math.max(0, Number(e.target.value) || 0)),
                            })
                          }
                          className="w-16 rounded-lg border border-primary/40 bg-background px-2 py-1 text-xs text-center font-bold text-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Question text */}
                    <p className="text-xs sm:text-sm font-semibold text-foreground whitespace-pre-wrap">
                      {q.prompt}
                    </p>

                    {/* Student's answer */}
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">
                        إجابة الطالب التحريرية:
                      </span>
                      {ans?.writtenText ? (
                        <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {ans.writtenText}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">(لم يكتب إجابة نصية)</span>
                      )}

                      {/* Student's uploaded sheet image */}
                      {ans?.attachmentUrl && (
                        <div className="pt-2">
                          <span className="text-[11px] font-bold text-muted-foreground block mb-1">
                            ورقة الحل المرفوعة بخط يد الطالب:
                          </span>
                          <div
                            className="rounded-xl overflow-hidden border border-border bg-muted/40 max-w-xs cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => setPreviewImage(ans.attachmentUrl!)}
                          >
                            <img
                              src={ans.attachmentUrl}
                              alt="ورقة حل الطالب"
                              className="w-full max-h-48 object-contain"
                            />
                            <div className="p-1.5 text-center text-[10px] text-primary font-bold bg-primary/5">
                              انقر لمعاينة وتكبير الصورة 🔍
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Model Answer reference */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs space-y-1">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                        الحل النموذجي المعتمد للمراجعة:
                      </span>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {q.modelAnswer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total and Feedback Section */}
            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                <span className="text-xs font-bold text-foreground">إجمالي الدرجة المستحقة للطالب:</span>
                <div className="flex items-baseline gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="text-2xl font-black">
                    {Object.values(questionScores).reduce((a, b) => a + (Number(b) || 0), 0)}
                  </span>
                  <span className="text-xs text-muted-foreground font-bold">
                    / {gradingExam?.totalPoints || 0}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  ملاحظات وتوجيهات د. محمود المهدي للطالب:
                </label>
                <textarea
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  placeholder="اكتب تشجيعك وملاحظاتك ونقاط تحسين الطالب التي ستظهر له في شاشته..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  disabled={savingGrade}
                  className="rounded-xl text-xs font-bold"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveGrade}
                  disabled={savingGrade}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 px-6 shadow-xs"
                >
                  {savingGrade ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  اعتماد الدرجة وإرسال إشعار فوري للطالب 🔔
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-xs p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImage}
              alt="معاينة الصورة"
              className="max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
