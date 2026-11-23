import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  BookCheck,
  BookOpen,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AdminApiFn,
  LessonNode,
  StageNode,
  TreeResponse,
  getOptionLabel,
  isEnglishQuestion,
  parseLessonSortOrder,
  parseUnitSortOrder,
} from "./test-bank/types";

const LAST_HW_STAGE_KEY = "dr_mahmoud_hw_last_stage";
const QUICK_COUNTS = [5, 10, 15, 20, 25, 30];

export function isHomeworkQuiz(quiz: any): boolean {
  if (!quiz) return false;
  return (
    quiz.scope === "homework" ||
    quiz.category === "واجب" ||
    quiz.category === "homework" ||
    String(quiz.title || "").toLowerCase().includes("واجب") ||
    String(quiz.title || "").toLowerCase().includes("homework")
  );
}

interface HomeworkAdminTabProps {
  adminApi: AdminApiFn;
  quizzes: any[];
  onRefreshQuizzes: () => Promise<void> | void;
  toggleQuiz: (quiz: any) => Promise<void> | void;
  deleteQuiz: (quiz: any) => Promise<void> | void;
}

type BuilderMode = "bank" | "manual" | "file";
type QuestionTypeFilter = "all" | "mcq" | "true_false" | "essay";

interface ManualQuestionDraft {
  prompt: string;
  questionType: "essay" | "mcq";
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export function HomeworkAdminTab({
  adminApi,
  quizzes,
  onRefreshQuizzes,
  toggleQuiz,
  deleteQuiz,
}: HomeworkAdminTabProps) {
  const { toast } = useToast();

  // Filter strictly to homework items
  const homeworkList = useMemo(() => quizzes.filter(isHomeworkQuiz), [quizzes]);

  // Tree data for Stage / Unit / Lesson picker
  const [treeData, setTreeData] = useState<StageNode[]>([]);
  const [loadingTree, setLoadingTree] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingTree(true);
    adminApi<TreeResponse>("/api/admin/learning/test-bank/tree")
      .then((res) => {
        if (!cancelled) setTreeData(res.tree || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingTree(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Builder state
  const [showBuilder, setShowBuilder] = useState<boolean>(true);
  const [builderMode, setBuilderMode] = useState<BuilderMode>("bank");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [questionType, setQuestionType] = useState<QuestionTypeFilter>("all");
  const [questionsCount, setQuestionsCount] = useState<number>(10);
  const [title, setTitle] = useState<string>("");
  const [isTitleCustom, setIsTitleCustom] = useState<boolean>(false);
  const [instructions, setInstructions] = useState<string>(
    "انقل وحل الأسئلة في كشكول الواجب بخط اليد وسلّمه في الحصة القادمة."
  );
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [notifyStudentsOnPublish, setNotifyStudentsOnPublish] = useState<boolean>(true);

  // Preview state (for bank or file mode)
  const [previewQuestions, setPreviewQuestions] = useState<any[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Manual questions state
  const [manualQuestions, setManualQuestions] = useState<ManualQuestionDraft[]>([]);
  const [draftPrompt, setDraftPrompt] = useState<string>("");
  const [draftType, setDraftType] = useState<"essay" | "mcq">("essay");
  const [draftOptions, setDraftOptions] = useState<string[]>(["", "", "", ""]);
  const [draftCorrectIndex, setDraftCorrectIndex] = useState<number>(0);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [analyzingFile, setAnalyzingFile] = useState<boolean>(false);

  // List filter & Views modal state
  const [listSearch, setListSearch] = useState<string>("");
  const [listStageFilter, setListStageFilter] = useState<string>("all");
  const [viewsModal, setViewsModal] = useState<{
    quiz: any;
    loading: boolean;
    students: Array<{
      id: number;
      studentName: string;
      studentPhone: string;
      studentGrade: string;
      parentPhone?: string;
      firstViewedAt: string;
      lastViewedAt: string;
      viewCount: number;
    }>;
  } | null>(null);
  const [notifyingId, setNotifyingId] = useState<number | null>(null);

  // Initialize stage from localStorage or first available stage
  useEffect(() => {
    if (treeData.length === 0) return;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(LAST_HW_STAGE_KEY) : null;
    const fallback =
      (saved && treeData.some((s) => s.stage === saved) ? saved : "") || treeData[0]?.stage || "";
    setSelectedStage((prev) => (prev && treeData.some((s) => s.stage === prev) ? prev : fallback));
  }, [treeData]);

  const currentStageNode = useMemo(
    () => treeData.find((s) => s.stage === selectedStage) || null,
    [treeData, selectedStage]
  );

  const sortedUnits = useMemo(() => {
    if (!currentStageNode) return [];
    return [...currentStageNode.units].sort((a, b) => parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit));
  }, [currentStageNode]);

  const currentUnitNode = useMemo(() => {
    if (selectedUnit === "all") return null;
    return sortedUnits.find((u) => u.unit === selectedUnit) || null;
  }, [sortedUnits, selectedUnit]);

  const sortedLessons = useMemo<LessonNode[]>(() => {
    if (!currentUnitNode) return [];
    return [...currentUnitNode.lessons].sort((a, b) => parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson));
  }, [currentUnitNode]);

  const activeLessonsPool = useMemo<LessonNode[]>(() => {
    if (!currentStageNode) return [];
    if (selectedUnit === "all") return sortedUnits.flatMap((u) => u.lessons);
    if (!currentUnitNode) return [];
    if (selectedLessons.length === 0) return sortedLessons;
    const set = new Set(selectedLessons);
    return sortedLessons.filter((l) => set.has(l.lesson));
  }, [currentStageNode, selectedUnit, sortedUnits, currentUnitNode, selectedLessons, sortedLessons]);

  const typeCounts = useMemo(() => {
    let mcq = 0;
    let tf = 0;
    let essay = 0;
    let totalObj = 0;
    for (const l of activeLessonsPool) {
      mcq += l.mcqCount ?? l.totalQuestions ?? 0;
      tf += l.tfCount ?? 0;
      essay += l.totalEssays ?? 0;
      totalObj += l.totalQuestions || 0;
    }
    return { all: totalObj + essay, mcq, true_false: tf, essay };
  }, [activeLessonsPool]);

  const availableCount = typeCounts[questionType];

  // Auto-generate clean homework title
  useEffect(() => {
    if (isTitleCustom) return;
    if (selectedUnit === "all") {
      setTitle("واجب منزلي شامل على المرحلة");
      return;
    }
    if (selectedLessons.length === 0) {
      setTitle(`واجب منزلي شامل: ${selectedUnit}`);
    } else if (selectedLessons.length === 1) {
      setTitle(`واجب منزلي: ${selectedLessons[0]}`);
    } else {
      setTitle(`واجب منزلي على ${selectedLessons.length} دروس (${selectedUnit})`);
    }
  }, [selectedUnit, selectedLessons, isTitleCustom]);

  const handleStageChange = (st: string) => {
    setSelectedStage(st);
    setSelectedUnit("all");
    setSelectedLessons([]);
    setPreviewQuestions(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_HW_STAGE_KEY, st);
    }
  };

  const handleToggleLesson = (les: string) => {
    setSelectedLessons((prev) => (prev.includes(les) ? prev.filter((x) => x !== les) : [...prev, les]));
    setPreviewQuestions(null);
  };

  const buildHomeworkPayload = (customQuestions?: any[]) => {
    const isWholeStage = selectedUnit === "all";
    const isSingleLesson = !isWholeStage && selectedLessons.length === 1;
    const isMultiLesson = !isWholeStage && selectedLessons.length > 1;
    const finalTitle = title.trim().includes("واجب")
      ? title.trim()
      : `واجب منزلي: ${title.trim() || "جديد"}`;

    return {
      title: finalTitle,
      description: instructions.trim() || undefined,
      stage: selectedStage,
      unit: !isWholeStage ? selectedUnit : undefined,
      scope: "homework",
      category: "واجب",
      lesson: isSingleLesson ? selectedLessons[0] : undefined,
      lessons: isMultiLesson ? selectedLessons : undefined,
      count: customQuestions ? customQuestions.length : Math.max(1, Number(questionsCount) || 10),
      questionType: questionType === "all" ? undefined : questionType,
      durationMinutes: null,
      passingScore: 50,
      maxAttempts: 5,
      shuffleQuestions: false,
      isPublished,
      isHomework: true,
      ...(customQuestions ? { customQuestions } : {}),
    };
  };

  const sendHomeworkNotification = async (hwTitle: string, stage: string, qCount: number) => {
    try {
      await adminApi("/api/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title: `واجب منزلي جديد 📚: ${hwTitle}`,
          message: `نزل ليك واجب جديد (${qCount} سؤال) في قسم «الواجب المنزلي». افتحه وحلّه قبل الحصة الجاية!`,
          type: "homework",
          targetGrade: stage,
        }),
      });
    } catch {
      // non-blocking
    }
  };

  // Mode 1: Preview from Bank
  const handlePreviewFromBank = async () => {
    if (!selectedStage) {
      toast({ variant: "destructive", description: "اختر المرحلة الدراسية أولاً" });
      return;
    }
    if (availableCount === 0) {
      toast({ variant: "destructive", description: "لا توجد أسئلة متاحة من النوع المختار في هذا النطاق" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await adminApi<{ questions: any[] }>("/api/admin/learning/test-bank/preview-exam", {
        method: "POST",
        body: JSON.stringify(buildHomeworkPayload()),
      });
      if (!res.questions?.length) throw new Error("لم يتم العثور على أسئلة تطابق الاختيار");
      setPreviewQuestions(res.questions);
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر جلب المعاينة" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mode 2: Add manual question to list
  const handleAddManualQuestion = () => {
    if (!draftPrompt.trim()) {
      toast({ variant: "destructive", description: "اكتب نص السؤال أولاً" });
      return;
    }
    if (draftType === "mcq") {
      const cleanOpts = draftOptions.map((o) => o.trim()).filter(Boolean);
      if (cleanOpts.length < 2) {
        toast({ variant: "destructive", description: "أضف اختيارين على الأقل للسؤال الاختياري" });
        return;
      }
      setManualQuestions((prev) => [
        ...prev,
        {
          prompt: draftPrompt.trim(),
          questionType: "mcq",
          options: cleanOpts,
          correctIndex: Math.min(draftCorrectIndex, cleanOpts.length - 1),
        },
      ]);
    } else {
      setManualQuestions((prev) => [
        ...prev,
        {
          prompt: draftPrompt.trim(),
          questionType: "essay",
          options: [],
          correctIndex: 0,
        },
      ]);
    }
    setDraftPrompt("");
    setDraftOptions(["", "", "", ""]);
    setDraftCorrectIndex(0);
  };

  // Mode 3: Analyze uploaded file into questions
  const handleAnalyzeHomeworkFile = async () => {
    if (!uploadFile) {
      toast({ variant: "destructive", description: "اختر ملف الأسئلة أولاً (Word / PDF / TXT)" });
      return;
    }
    setAnalyzingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("previewOnly", "true");
      fd.append("stage", selectedStage || "عام");
      fd.append("unit", selectedUnit === "all" ? "عام" : selectedUnit);
      fd.append("lesson", selectedLessons[0] || "واجب منزلي");
      fd.append("questionType", "auto");

      const res = await adminApi<{ questions: any[]; warnings?: string[] }>("/api/admin/learning/test-bank/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.questions?.length) {
        throw new Error(res.warnings?.[0] || "لم نتمكن من استخراج أسئلة من الملف، تأكد من تنسيقه.");
      }
      setPreviewQuestions(res.questions);
      toast({
        title: `تم استخراج ${res.questions.length} سؤال من الملف بنجاح`,
        description: "راجع الأسئلة بالأسفل ثم اضغط «نشر الواجب للطلاب».",
      });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر تحليل الملف" });
    } finally {
      setAnalyzingFile(false);
    }
  };

  // Unified Publish Homework action
  const handlePublishHomework = async (customQs?: any[]) => {
    if (!selectedStage) {
      toast({ variant: "destructive", description: "اختر المرحلة الدراسية أولاً" });
      return;
    }
    const questionsToUse =
      customQs ||
      (builderMode === "manual"
        ? manualQuestions.map((q) => ({
            prompt: q.prompt,
            questionType: q.questionType,
            options: q.questionType === "mcq" ? q.options : [],
            correctIndex: q.questionType === "mcq" ? q.correctIndex : 0,
            points: 1,
          }))
        : previewQuestions || undefined);

    if (builderMode === "manual" && (!questionsToUse || questionsToUse.length === 0)) {
      toast({ variant: "destructive", description: "أضف سؤال واحد على الأقل للواجب قبل النشر" });
      return;
    }
    if (builderMode === "file" && (!questionsToUse || questionsToUse.length === 0)) {
      toast({ variant: "destructive", description: "اضغط «تحليل الملف» أولاً لاستخراج الأسئلة" });
      return;
    }
    if (builderMode === "bank" && !questionsToUse && availableCount === 0) {
      toast({ variant: "destructive", description: "لا توجد أسئلة متاحة من هذا النوع في النطاق المختار" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildHomeworkPayload(questionsToUse);
      const res = await adminApi<any>("/api/admin/learning/test-bank/generate-exam", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const created = res.quiz || res;
      const finalCount = created.questions?.length || questionsToUse?.length || questionsCount;

      if (isPublished && notifyStudentsOnPublish) {
        await sendHomeworkNotification(created.title || payload.title, selectedStage, finalCount);
      }

      toast({
        title: isPublished ? "تم نشر الواجب في تاب الواجبات للطلاب بنجاح 📚" : "تم حفظ الواجب كمسودة 🔒",
        description: `"${created.title || payload.title}" (${finalCount} سؤال)${
          isPublished && notifyStudentsOnPublish ? " + تم إشعار طلاب المرحلة 🔔" : ""
        }`,
      });

      // Reset builder drafts
      setPreviewQuestions(null);
      setManualQuestions([]);
      setUploadFile(null);
      setIsTitleCustom(false);
      await onRefreshQuizzes();
    } catch (err: any) {
      toast({ variant: "destructive", title: "تعذر إنشاء الواجب", description: err.message || "حاول مرة أخرى" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Views modal to see who opened this homework
  const handleOpenViews = async (hw: any) => {
    setViewsModal({ quiz: hw, loading: true, students: [] });
    try {
      const res = await adminApi<{ students: any[] }>(`/api/admin/learning/quizzes/${hw.id}/views`);
      setViewsModal({ quiz: hw, loading: false, students: res.students || [] });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر جلب قائمة المشاهدات" });
      setViewsModal(null);
    }
  };

  // Send manual reminder notification for an existing homework
  const handleNotifyExisting = async (hw: any) => {
    const targetStage = hw.stage || (Array.isArray(hw.stages) ? hw.stages[0] : "") || "all";
    setNotifyingId(hw.id);
    try {
      const res = await adminApi<{ count?: number }>("/api/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title: `تذكير بالواجب المنزلي 📚: ${hw.title}`,
          message: `لا تنسَ حل "${hw.title}" (${hw.questions?.length || 0} سؤال) قبل الحصة القادمة!`,
          type: "homework",
          targetGrade: targetStage,
        }),
      });
      toast({
        title: "تم إرسال التذكير للطلاب 🔔",
        description: `وصل الإشعار لـ ${res.count ?? 0} طالب.`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر إرسال التذكير" });
    } finally {
      setNotifyingId(null);
    }
  };

  // Stats & filtered list
  const totalPublished = homeworkList.filter((h) => h.isPublished).length;
  const totalDrafts = homeworkList.length - totalPublished;
  const totalViewsCount = homeworkList.reduce((sum, h) => sum + (Number(h.openedStudents) || 0), 0);

  const availableListStages = useMemo(() => {
    const s = new Set<string>();
    homeworkList.forEach((h) => {
      if (h.stage) s.add(h.stage);
    });
    return Array.from(s);
  }, [homeworkList]);

  const filteredHomework = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return homeworkList.filter((h) => {
      if (listStageFilter !== "all" && h.stage !== listStageFilter) return false;
      if (q && !String(h.title || "").toLowerCase().includes(q) && !String(h.stage || "").toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [homeworkList, listSearch, listStageFilter]);

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* Compact Header */}
      <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <span className="h-11 w-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 grid place-items-center shrink-0">
            <BookCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <span>إدارة الواجبات المنزلية</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                منفصل تماماً عن الاختبارات
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              أي واجب تضيفه هنا ينزل مباشرة في تاب «الواجب المنزلي 📚» عند الطالب (بدون مؤقت امتحان + جاهز لطباعة A4 والتسليم الورقي).
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => setShowBuilder((v) => !v)}
          className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0 cursor-pointer"
        >
          {showBuilder ? "إخفاء نموذج الإضافة" : "+ إضافة واجب جديد"}
        </Button>
      </div>

      {/* 4 Clean KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="text-[11px] font-bold text-muted-foreground">إجمالي الواجبات</div>
          <div className="text-2xl font-black text-foreground font-mono mt-1">{homeworkList.length}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-card p-3.5">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">منشورة للطلاب</div>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">{totalPublished}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <div className="text-[11px] font-bold text-muted-foreground">مسودات مخفية</div>
          <div className="text-2xl font-black text-foreground font-mono mt-1">{totalDrafts}</div>
        </div>
        <div className="rounded-2xl border border-blue-200/70 dark:border-blue-900/40 bg-card p-3.5">
          <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400">طلاب فتحوا الواجبات</div>
          <div className="text-2xl font-black text-blue-600 font-mono mt-1">{totalViewsCount}</div>
        </div>
      </div>

      {/* Dedicated Homework Builder */}
      {showBuilder && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
          {/* 3 Creation Modes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                { id: "bank", label: "⚡ سحب من بنك الأسئلة", sub: "الأسرع — اختار الدرس والنوع والعدد" },
                { id: "manual", label: "✍️ كتابة أسئلة مباشرة", sub: "اكتب أسئلة مقالية أو اختيارية بنفسك" },
                { id: "file", label: "📎 رفع ملف واجب", sub: "Word / PDF / TXT يتحلل تلقائياً" },
              ] as const
            ).map((m) => {
              const active = builderMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setBuilderMode(m.id);
                    setPreviewQuestions(null);
                  }}
                  className={`rounded-xl border p-3 text-right transition cursor-pointer ${
                    active
                      ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  <div className="text-xs font-black text-foreground">{m.label}</div>
                  <div className="text-[10px] font-bold text-muted-foreground mt-0.5">{m.sub}</div>
                </button>
              );
            })}
          </div>

          {/* Shared Stage + Title + Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-foreground">المرحلة الدراسية *</label>
              <select
                value={selectedStage}
                onChange={(e) => handleStageChange(e.target.value)}
                disabled={loadingTree}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
              >
                {treeData.map((s) => (
                  <option key={s.stage} value={s.stage}>
                    {s.stage} ({s.totalQuestions + (s.totalEssays || 0)} سؤال بالبنك)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-foreground">عنوان الواجب *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsTitleCustom(true);
                }}
                placeholder="مثال: واجب منزلي على الدرس الثاني"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
              />
            </div>
          </div>

          {/* MODE 1: From Question Bank */}
          {builderMode === "bank" && (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3.5 sm:p-4">
              {/* Unit Pills */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-600" />
                  <span>الوحدة:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUnit("all");
                      setSelectedLessons([]);
                      setPreviewQuestions(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      selectedUnit === "all"
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    كل الوحدات
                  </button>
                  {sortedUnits.map((u) => (
                    <button
                      key={u.unit}
                      type="button"
                      onClick={() => {
                        setSelectedUnit(u.unit);
                        setSelectedLessons([]);
                        setPreviewQuestions(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        selectedUnit === u.unit
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {u.unit} ({(u.totalQuestions || 0) + (u.totalEssays || 0)})
                    </button>
                  ))}
                </div>
              </div>

              {/* Lesson Multi-Select Chips */}
              {currentUnitNode && sortedLessons.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                    <span>الدروس (اختار درس أو أكتر أو كل الوحدة):</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLessons([]);
                        setPreviewQuestions(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        selectedLessons.length === 0
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      كل دروس الوحدة ({sortedLessons.length})
                    </button>
                    {sortedLessons.map((l) => {
                      const checked = selectedLessons.includes(l.lesson);
                      return (
                        <button
                          key={l.lesson}
                          type="button"
                          onClick={() => handleToggleLesson(l.lesson)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                            checked
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-background border-border text-foreground hover:border-emerald-400"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                          <span>{l.lesson}</span>
                          <span className="font-mono text-[10px] opacity-80">
                            ({(l.totalQuestions || 0) + (l.totalEssays || 0)})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question Type & Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-foreground">نوع أسئلة الواجب:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: "all", label: "الكل (مختلط)", count: typeCounts.all },
                        { id: "mcq", label: "اختيار من متعدد", count: typeCounts.mcq },
                        { id: "true_false", label: "صح / خطأ", count: typeCounts.true_false },
                        { id: "essay", label: "مقالي للكتابة", count: typeCounts.essay },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={t.count === 0}
                        onClick={() => {
                          setQuestionType(t.id);
                          setPreviewQuestions(null);
                        }}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs font-bold transition ${
                          t.count === 0
                            ? "opacity-40 cursor-not-allowed bg-muted/40 border-border"
                            : questionType === t.id
                            ? "border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300 cursor-pointer"
                            : "border-border bg-background text-foreground hover:bg-muted/40 cursor-pointer"
                        }`}
                      >
                        <span>{t.label}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {t.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-foreground">عدد أسئلة الواجب:</label>
                    <span className="text-[11px] font-black font-mono text-emerald-600">
                      المتاح: {availableCount}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_COUNTS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQuestionsCount(n)}
                        className={`h-8 min-w-[38px] px-2 rounded-lg text-xs font-black font-mono border transition cursor-pointer ${
                          questionsCount === n
                            ? "bg-amber-500 text-slate-950 border-amber-500"
                            : "bg-background border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setQuestionsCount((c) => Math.max(1, c - 1))}
                      className="h-9 w-9 rounded-xl border border-border bg-background grid place-items-center cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(200, availableCount)}
                      value={questionsCount}
                      onChange={(e) => setQuestionsCount(Math.max(1, Number(e.target.value) || 1))}
                      className="flex-1 h-9 rounded-xl border border-border bg-background text-center text-sm font-black font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setQuestionsCount((c) => c + 1)}
                      className="h-9 w-9 rounded-xl border border-border bg-background grid place-items-center cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: Write Homework Questions Directly */}
          {builderMode === "manual" && (
            <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-black text-foreground">أضف سؤال للواجب:</label>
                <div className="inline-flex rounded-xl border border-border bg-background p-0.5">
                  <button
                    type="button"
                    onClick={() => setDraftType("essay")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      draftType === "essay" ? "bg-amber-500 text-slate-950" : "text-muted-foreground"
                    }`}
                  >
                    سؤال مقالي (للكشكول)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftType("mcq")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      draftType === "mcq" ? "bg-amber-500 text-slate-950" : "text-muted-foreground"
                    }`}
                  >
                    اختيار من متعدد
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={draftPrompt}
                onChange={(e) => setDraftPrompt(e.target.value)}
                placeholder="اكتب نص السؤال هنا..."
                className="w-full rounded-xl border border-border bg-background p-3 text-xs font-bold text-foreground"
              />

              {draftType === "mcq" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {draftOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="hwCorrect"
                        checked={draftCorrectIndex === idx}
                        onChange={() => setDraftCorrectIndex(idx)}
                        className="h-4 w-4 accent-emerald-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...draftOptions];
                          next[idx] = e.target.value;
                          setDraftOptions(next);
                        }}
                        placeholder={`الاختيار ${idx + 1}`}
                        className="flex-1 h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddManualQuestion}
                className="h-9 rounded-xl text-xs font-black cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 ml-1" /> إضافة السؤال لقائمة الواجب ({manualQuestions.length})
              </Button>

              {manualQuestions.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  {manualQuestions.map((mq, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-black text-amber-600 ml-1.5">{idx + 1}.</span>
                        <span className="font-bold text-foreground">{mq.prompt}</span>
                        <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                          {mq.questionType === "essay" ? "مقالي" : "اختياري"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualQuestions((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODE 3: Upload Homework File */}
          {builderMode === "file" && (
            <div className="rounded-2xl border border-dashed border-amber-400/60 bg-amber-500/5 p-5 text-center space-y-3">
              <UploadCloud className="h-8 w-8 text-amber-600 mx-auto" />
              <div className="text-xs font-black text-foreground">
                ارفع ملف الواجب (Word .docx / PDF / TXT) وسيتم استخراج الأسئلة تلقائياً
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <input
                  type="file"
                  accept=".docx,.doc,.pdf,.txt,.json"
                  onChange={(e) => {
                    setUploadFile(e.target.files?.[0] || null);
                    setPreviewQuestions(null);
                  }}
                  className="text-xs font-bold"
                />
                <Button
                  type="button"
                  disabled={!uploadFile || analyzingFile}
                  onClick={handleAnalyzeHomeworkFile}
                  className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs cursor-pointer"
                >
                  {analyzingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <Sparkles className="h-3.5 w-3.5 ml-1" />}
                  تحليل الملف واستخراج الأسئلة
                </Button>
              </div>
            </div>
          )}

          {/* Preview Questions Box (when previewed from bank or file) */}
          {previewQuestions && previewQuestions.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                  معاينة أسئلة الواجب ({previewQuestions.length} سؤال) — احذف أي سؤال لا تريده:
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewQuestions(null)}
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  إغلاق المعاينة
                </button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {previewQuestions.map((q, idx) => {
                  const isEn = isEnglishQuestion(q.prompt, q.options);
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-card px-3 py-2 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 min-w-0" dir={isEn ? "ltr" : "rtl"}>
                        <span className="font-black text-primary ml-1">{idx + 1}.</span>
                        <span className="font-bold text-foreground">{q.prompt}</span>
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-1 flex flex-wrap gap-2">
                            {q.options.map((opt: string, oi: number) => (
                              <span key={oi} className={q.correctIndex === oi ? "text-emerald-600 font-black" : ""}>
                                {getOptionLabel(oi, isEn)}) {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewQuestions((prev) => (prev ? prev.filter((_, i) => i !== idx) : null))}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Homework Instructions + Publish Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/60">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">تعليمات التسليم للطالب:</label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-5">
              <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 accent-amber-500 cursor-pointer"
                />
                <span>نشر الواجب فوراً للطلاب</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyStudentsOnPublish}
                  disabled={!isPublished}
                  onChange={(e) => setNotifyStudentsOnPublish(e.target.checked)}
                  className="h-4 w-4 accent-blue-600 cursor-pointer"
                />
                <span>إرسال إشعار فوري للطلاب 🔔</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            {builderMode === "bank" && (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || availableCount === 0}
                onClick={handlePreviewFromBank}
                className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
              >
                <Eye className="h-4 w-4 ml-1.5" />
                معاينة الأسئلة أولاً
              </Button>
            )}
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handlePublishHomework()}
              className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 ml-1.5 fill-slate-950" />
              )}
              {isPublished ? "نشر الواجب للطلاب الآن" : "حفظ الواجب كمسودة"}
            </Button>
          </div>
        </div>
      )}

      {/* Existing Homework List */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            <span>الواجبات المنزلية المسجّلة ({filteredHomework.length})</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="بحث في الواجبات..."
                className="h-9 pr-8 pl-3 rounded-xl border border-border bg-background text-xs font-bold"
              />
            </div>
            {availableListStages.length > 0 && (
              <select
                value={listStageFilter}
                onChange={(e) => setListStageFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold cursor-pointer"
              >
                <option value="all">كل المراحل</option>
                {availableListStages.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onRefreshQuizzes()}
              className="h-9 rounded-xl text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {filteredHomework.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-2 text-muted-foreground">
            <BookCheck className="h-8 w-8 mx-auto opacity-40" />
            <p className="text-xs font-bold">لا توجد واجبات منزلية حالياً — أضف أول واجب من الأعلى!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredHomework.map((hw) => (
              <div
                key={hw.id}
                className="rounded-2xl border border-border bg-background p-4 flex flex-col justify-between gap-3 hover:border-amber-400/60 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-black text-foreground leading-snug">{hw.title}</h4>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${
                        hw.isPublished
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {hw.isPublished ? "منشور 🟢" : "مسودة 🔒"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground">
                    <span>{hw.stage || "عام"}</span>
                    <span>•</span>
                    <span className="font-mono text-foreground">{hw.questions?.length || 0} سؤال</span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono">
                      فتحه {hw.openedStudents || 0} طالب
                    </span>
                  </div>
                  {hw.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{hw.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleOpenViews(hw)}
                    className="h-8 px-2.5 rounded-xl text-[11px] font-bold cursor-pointer"
                  >
                    <Users className="h-3.5 w-3.5 ml-1 text-blue-600" />
                    مين فتحه ({hw.openedStudents || 0})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={notifyingId === hw.id}
                    onClick={() => void handleNotifyExisting(hw)}
                    className="h-8 px-2.5 rounded-xl text-[11px] font-bold cursor-pointer"
                  >
                    {notifyingId === hw.id ? (
                      <Loader2 className="h-3.5 w-3.5 ml-1 animate-spin" />
                    ) : (
                      <Bell className="h-3.5 w-3.5 ml-1 text-amber-600" />
                    )}
                    تذكير الطلاب
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void toggleQuiz(hw)}
                    className="h-8 px-2.5 rounded-xl text-[11px] font-bold cursor-pointer"
                  >
                    {hw.isPublished ? <EyeOff className="h-3.5 w-3.5 ml-1" /> : <Eye className="h-3.5 w-3.5 ml-1" />}
                    {hw.isPublished ? "إخفاء" : "نشر"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void deleteQuiz(hw)}
                    className="h-8 px-2 rounded-xl text-[11px] font-bold text-rose-600 hover:bg-rose-500/10 mr-auto cursor-pointer"
                    title="حذف الواجب"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Views Tracking Modal */}
      {viewsModal && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3"
          onClick={(e) => e.target === e.currentTarget && setViewsModal(null)}
        >
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-muted/20">
              <div>
                <h4 className="text-sm font-black text-foreground">الطلاب الذين فتحوا الواجب</h4>
                <p className="text-[11px] font-bold text-muted-foreground">{viewsModal.quiz.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewsModal(null)}
                className="p-1.5 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {viewsModal.loading ? (
                <div className="py-12 grid place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : viewsModal.students.length === 0 ? (
                <div className="py-12 text-center text-xs font-bold text-muted-foreground">
                  لم يفتح أي طالب هذا الواجب بعد.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {viewsModal.students.map((st) => (
                    <div key={st.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-black text-foreground">{st.studentName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {st.studentPhone} · {st.studentGrade}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-mono text-[11px] font-bold">
                        فتح {st.viewCount} مرة
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeworkAdminTab;
