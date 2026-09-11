import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Layers,
  Sparkles,
  UploadCloud,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  Copy,
  Clock,
  Award,
  HelpCircle,
  Sliders,
  Check,
  FolderOpen,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Question = {
  id?: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  imageUrl?: string;
  points?: number;
  difficulty?: "easy" | "medium" | "hard";
  stage?: string;
  unit?: string;
  lesson?: string;
};

type LessonNode = {
  lesson: string;
  totalQuestions: number;
  difficulty: { easy: number; medium: number; hard: number };
};

type UnitNode = {
  unit: string;
  totalQuestions: number;
  difficulty: { easy: number; medium: number; hard: number };
  lessons: LessonNode[];
};

type StageNode = {
  stage: string;
  totalQuestions: number;
  units: UnitNode[];
};

type TreeResponse = {
  tree: StageNode[];
  totalQuestions: number;
  courses: Array<{ id: number; title: string; stages: string[] }>;
  videos: Array<{ id: number; title: string; courseId: number; stage?: string }>;
};

const DEFAULT_STAGES = [
  "الصف الأول الثانوي",
  "الصف الثاني الثانوي",
  "الصف الثالث الثانوي",
  "المرحلة الجامعية",
  "عام"
];

export function TestBankTab({
  adminApi,
  onNavigateToQuizzes,
}: {
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onNavigateToQuizzes?: () => void;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"explorer" | "upload" | "generate">("explorer");

  // Tree & Statistics
  const [treeData, setTreeData] = useState<StageNode[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [courses, setCourses] = useState<Array<{ id: number; title: string }>>([]);
  const [videos, setVideos] = useState<Array<{ id: number; title: string; courseId: number; stage?: string }>>([]);
  const [loadingTree, setLoadingTree] = useState<boolean>(false);

  // Explorer Selection
  const [selectedStage, setSelectedStage] = useState<string>("الصف الأول الثانوي");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [lessonQuestions, setLessonQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [diffFilter, setDiffFilter] = useState<string>("all");

  // Question Edit/Create Modal
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState<boolean>(false);
  const [savingQuestion, setSavingQuestion] = useState<boolean>(false);

  // Upload Tab Form
  const [uploadStage, setUploadStage] = useState<string>("الصف الأول الثانوي");
  const [uploadUnit, setUploadUnit] = useState<string>("");
  const [uploadLesson, setUploadLesson] = useState<string>("");
  const [uploadDifficulty, setUploadDifficulty] = useState<string>("medium");
  const [uploadPoints, setUploadPoints] = useState<number>(1);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Generator Tab Form
  const [genStage, setGenStage] = useState<string>("الصف الأول الثانوي");
  const [genUnit, setGenUnit] = useState<string>("all");
  const [genLesson, setGenLesson] = useState<string>("all");
  const [genScope, setGenScope] = useState<"course" | "lesson">("course");
  const [genVideoId, setGenVideoId] = useState<string>("");
  const [genCourseId, setGenCourseId] = useState<string>("");
  const [genTitle, setGenTitle] = useState<string>("");
  const [genCount, setGenCount] = useState<number>(15);
  const [genDuration, setGenDuration] = useState<number>(30);
  const [genPassingScore, setGenPassingScore] = useState<number>(60);
  const [genMaxAttempts, setGenMaxAttempts] = useState<number>(2);
  const [genShuffle, setGenShuffle] = useState<boolean>(true);
  const [genDifficultyMode, setGenDifficultyMode] = useState<"random" | "custom">("random");
  const [easyCount, setEasyCount] = useState<number>(5);
  const [mediumCount, setMediumCount] = useState<number>(7);
  const [hardCount, setHardCount] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedQuizSuccess, setGeneratedQuizSuccess] = useState<any | null>(null);

  // Load Tree Data
  const loadTree = async () => {
    setLoadingTree(true);
    try {
      const res = await adminApi<TreeResponse>("/api/admin/learning/test-bank/tree");
      setTreeData(res.tree || []);
      setTotalQuestions(res.totalQuestions || 0);
      setCourses(res.courses || []);
      setVideos(res.videos || []);

      // Auto-select first stage if none selected or empty
      if (res.tree?.length > 0 && !res.tree.some((s) => s.stage === selectedStage)) {
        setSelectedStage(res.tree[0].stage);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "تعذر تحميل بنك الأسئلة" });
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  // Current Stage Object in Explorer
  const currentStageNode = useMemo(() => {
    return treeData.find((s) => s.stage === selectedStage) || null;
  }, [treeData, selectedStage]);

  // Load questions for selected lesson
  const loadQuestions = async (stage: string, unit: string, lesson: string) => {
    if (!stage || !unit || !lesson) return;
    setLoadingQuestions(true);
    try {
      const params = new URLSearchParams({ stage, unit, lesson });
      const res = await adminApi<any[]>(`/api/admin/learning/test-bank/questions?${params.toString()}`);
      setLessonQuestions(res || []);
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر تحميل الأسئلة" });
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSelectLesson = (unitTitle: string, lessonTitle: string) => {
    setSelectedUnit(unitTitle);
    setSelectedLesson(lessonTitle);
    loadQuestions(selectedStage, unitTitle, lessonTitle);
  };

  // Filtered questions in explorer
  const filteredQuestions = useMemo(() => {
    return lessonQuestions.filter((q) => {
      if (diffFilter !== "all" && q.difficulty !== diffFilter) return false;
      if (searchQuery.trim()) {
        const s = searchQuery.trim().toLowerCase();
        const prompt = (q.question?.prompt || "").toLowerCase();
        const opts = (q.question?.options || []).join(" ").toLowerCase();
        return prompt.includes(s) || opts.includes(s);
      }
      return true;
    });
  }, [lessonQuestions, diffFilter, searchQuery]);

  // Handle Question Save (New or Edit)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion.prompt?.trim() || !editingQuestion.options?.filter(Boolean).length) {
      toast({ variant: "destructive", description: "يرجى كتابة نص السؤال والخيارات" });
      return;
    }
    setSavingQuestion(true);
    try {
      if (editingQuestion.id) {
        // Edit existing
        await adminApi(`/api/admin/learning/question-bank/${editingQuestion.id}`, {
          method: "PUT",
          body: JSON.stringify({
            prompt: editingQuestion.prompt,
            options: editingQuestion.options,
            correctIndex: editingQuestion.correctIndex,
            explanation: editingQuestion.explanation,
            imageUrl: editingQuestion.imageUrl,
            difficulty: editingQuestion.difficulty,
            points: editingQuestion.points,
            unit: editingQuestion.unit,
            lesson: editingQuestion.lesson,
          }),
        });
        toast({ title: "تم تحديث السؤال بنجاح ✏️" });
      } else {
        // Create new
        await adminApi("/api/admin/learning/question-bank", {
          method: "POST",
          body: JSON.stringify({
            prompt: editingQuestion.prompt,
            options: editingQuestion.options,
            correctIndex: editingQuestion.correctIndex,
            explanation: editingQuestion.explanation,
            imageUrl: editingQuestion.imageUrl,
            difficulty: editingQuestion.difficulty || "medium",
            points: editingQuestion.points || 1,
            stage: selectedStage,
            unit: selectedUnit,
            lesson: selectedLesson,
          }),
        });
        toast({ title: "تمت إضافة السؤال لبنك الدرس بنجاح 📚" });
      }
      setShowQuestionModal(false);
      loadQuestions(selectedStage, selectedUnit, selectedLesson);
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "حدث خطأ أثناء حفظ السؤال" });
    } finally {
      setSavingQuestion(false);
    }
  };

  // Delete single question
  const handleDeleteQuestion = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال من بنك الأسئلة؟")) return;
    try {
      await adminApi(`/api/admin/learning/question-bank/${id}`, { method: "DELETE" });
      toast({ title: "تم حذف السؤال" });
      setLessonQuestions((prev) => prev.filter((q) => q.id !== id));
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  // Clear all questions in current lesson
  const handleClearLesson = async () => {
    if (!confirm(`تحذير: هل أنت متأكد من حذف جميع أسئلة (${selectedLesson})؟ لا يمكن التراجع.`)) return;
    try {
      await adminApi("/api/admin/learning/test-bank/clear-lesson", {
        method: "DELETE",
        body: JSON.stringify({ stage: selectedStage, unit: selectedUnit, lesson: selectedLesson }),
      });
      toast({ title: "تم حذف جميع أسئلة الدرس بنجاح" });
      setLessonQuestions([]);
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message });
    }
  };

  // Open create modal for new question
  const handleOpenCreateQuestion = () => {
    setEditingQuestion({
      prompt: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
      imageUrl: "",
      difficulty: "medium",
      points: 1,
      unit: selectedUnit,
      lesson: selectedLesson,
    });
    setShowQuestionModal(true);
  };

  // Open edit modal
  const handleOpenEditQuestion = (q: any) => {
    setEditingQuestion({
      id: q.id,
      prompt: q.question.prompt,
      options: [...q.question.options],
      correctIndex: q.question.correctIndex,
      explanation: q.question.explanation || "",
      imageUrl: q.question.imageUrl || "",
      difficulty: q.difficulty || "medium",
      points: q.points || 1,
      unit: q.unit || selectedUnit,
      lesson: q.lesson || selectedLesson,
    });
    setShowQuestionModal(true);
  };

  // Analyze File or Raw Text for Upload Preview
  const handleAnalyzeUpload = async () => {
    if (!uploadStage || !uploadUnit.trim() || !uploadLesson.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى تحديد المرحلة وكتابة اسم الوحدة واسم الدرس أولاً." });
      return;
    }
    if (!uploadFile && !rawText.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى اختيار ملف أسئلة (Word/PDF/JSON/TXT) أو لصق نص الأسئلة." });
      return;
    }

    setIsAnalyzing(true);
    setPreviewQuestions([]);
    setPreviewWarnings([]);

    try {
      const formData = new FormData();
      if (uploadFile) formData.append("file", uploadFile);
      if (rawText.trim()) formData.append("text", rawText.trim());
      formData.append("stage", uploadStage);
      formData.append("unit", uploadUnit.trim());
      formData.append("lesson", uploadLesson.trim());
      formData.append("difficulty", uploadDifficulty);
      formData.append("points", String(uploadPoints));
      formData.append("previewOnly", "true");

      const res = await adminApi<{
        preview: boolean;
        totalDetected: number;
        warnings: string[];
        questions: Question[];
      }>("/api/admin/learning/test-bank/upload", {
        method: "POST",
        body: formData,
      });

      if (res.questions && res.questions.length > 0) {
        setPreviewQuestions(res.questions);
        setPreviewWarnings(res.warnings || []);
        toast({ title: `تم استخراج ${res.questions.length} سؤال بنجاح! راجعها بالأسفل ثم اضغط حفظ.` });
      } else {
        toast({ variant: "destructive", description: "لم يتم العثور على أسئلة متعددة الاختيارات في الملف." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "حدث خطأ أثناء قراءة وتحليل الملف" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirm and Save Uploaded Questions to DB
  const handleConfirmImport = async () => {
    if (!previewQuestions.length) return;
    setIsImporting(true);
    try {
      const res = await adminApi<{ count: number }>(
        "/api/admin/learning/question-bank/batch-import",
        {
          method: "POST",
          body: JSON.stringify({
            questions: previewQuestions,
            stage: uploadStage,
            unit: uploadUnit.trim(),
            lesson: uploadLesson.trim(),
            difficulty: uploadDifficulty,
          }),
        }
      );

      toast({ title: `تم حفظ ${res.count} سؤال بنجاح في بنك أسئلة (${uploadLesson})! 🎉` });
      setPreviewQuestions([]);
      setPreviewWarnings([]);
      setUploadFile(null);
      setRawText("");
      loadTree();
      // Switch to explorer view on the imported lesson
      setSelectedStage(uploadStage);
      setSelectedUnit(uploadUnit.trim());
      setSelectedLesson(uploadLesson.trim());
      loadQuestions(uploadStage, uploadUnit.trim(), uploadLesson.trim());
      setActiveTab("explorer");
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حفظ الأسئلة" });
    } finally {
      setIsImporting(false);
    }
  };

  // Generate Exam Action
  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTitle.trim()) {
      toast({ variant: "destructive", description: "يرجى كتابة عنوان الاختبار" });
      return;
    }
    setIsGenerating(true);
    setGeneratedQuizSuccess(null);

    try {
      const bodyPayload: any = {
        title: genTitle.trim(),
        stage: genStage,
        unit: genUnit === "all" ? undefined : genUnit,
        lesson: genLesson === "all" ? undefined : genLesson,
        courseId: genCourseId ? Number(genCourseId) : undefined,
        scope: genScope,
        videoId: genScope === "lesson" && genVideoId ? Number(genVideoId) : undefined,
        count: genCount,
        durationMinutes: genDuration || null,
        passingScore: genPassingScore,
        maxAttempts: genMaxAttempts,
        shuffleQuestions: genShuffle,
        isPublished: true,
      };

      if (genDifficultyMode === "custom") {
        bodyPayload.difficultyDistribution = {
          easy: easyCount,
          medium: mediumCount,
          hard: hardCount,
        };
      }

      const created = await adminApi<any>("/api/admin/learning/test-bank/generate-exam", {
        method: "POST",
        body: JSON.stringify(bodyPayload),
      });

      setGeneratedQuizSuccess(created);
      toast({ title: `تم توليد ونشر الاختبار (${created.title}) بنجاح! 🚀` });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر توليد الاختبار من البنك" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Units suggestions for upload tab based on uploadStage
  const suggestedUnits = useMemo(() => {
    const st = treeData.find((s) => s.stage === uploadStage);
    return st ? st.units.map((u) => u.unit) : [];
  }, [treeData, uploadStage]);

  // Lessons suggestions for upload tab based on uploadUnit
  const suggestedLessons = useMemo(() => {
    const st = treeData.find((s) => s.stage === uploadStage);
    if (!st) return [];
    const u = st.units.find((unit) => unit.unit === uploadUnit);
    return u ? u.lessons.map((l) => l.lesson) : [];
  }, [treeData, uploadStage, uploadUnit]);

  // Units list for currently selected generator stage
  const generatorUnits = useMemo(() => {
    const st = treeData.find((s) => s.stage === genStage);
    return st ? st.units : [];
  }, [treeData, genStage]);

  // Lessons list for currently selected generator unit
  const generatorLessons = useMemo(() => {
    if (genUnit === "all") return [];
    const u = generatorUnits.find((unit) => unit.unit === genUnit);
    return u ? u.lessons : [];
  }, [generatorUnits, genUnit]);

  // Count available questions for selected generator scope
  const availableCountInfo = useMemo(() => {
    const st = treeData.find((s) => s.stage === genStage);
    if (!st) return { total: 0, easy: 0, medium: 0, hard: 0 };
    if (genUnit === "all") {
      let easy = 0, medium = 0, hard = 0;
      for (const u of st.units) {
        easy += u.difficulty?.easy || 0;
        medium += u.difficulty?.medium || 0;
        hard += u.difficulty?.hard || 0;
      }
      return { total: st.totalQuestions, easy, medium, hard };
    }
    const u = st.units.find((unit) => unit.unit === genUnit);
    if (!u) return { total: 0, easy: 0, medium: 0, hard: 0 };
    if (genLesson === "all") {
      return { total: u.totalQuestions, ...u.difficulty };
    }
    const l = u.lessons.find((les) => les.lesson === genLesson);
    if (!l) return { total: 0, easy: 0, medium: 0, hard: 0 };
    return { total: l.totalQuestions, ...l.difficulty };
  }, [treeData, genStage, genUnit, genLesson]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
              <BookOpen className="h-3.5 w-3.5" />
              <span>نظام بنك الأسئلة الشامل والامتحانات الذكية</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              بنك أسئلة المراحل والدروس (Test Bank)
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              ارفع مذكراتك وبنوك أسئلتك لكل درس مقسماً حسب المرحلة والوحدة، ثم ولّد امتحانات جاهزة للطلاب بضغطة زر وتوزيع صعوبة عشوائي أو مخصص.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 px-5 border border-white/15 text-center">
              <span className="block text-2xl font-black text-emerald-400">{totalQuestions}</span>
              <span className="text-[11px] font-bold text-slate-300">سؤال في البنك</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 px-5 border border-white/15 text-center">
              <span className="block text-2xl font-black text-sky-400">{treeData.length}</span>
              <span className="text-[11px] font-bold text-slate-300">مراحل دراسية</span>
            </div>
            <Button
              type="button"
              onClick={loadTree}
              variant="outline"
              className="h-12 rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-xs"
            >
              <RefreshCw className={`h-4 w-4 ml-1.5 ${loadingTree ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-border bg-card rounded-2xl p-1 shadow-sm gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("explorer")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === "explorer"
              ? "bg-primary text-white shadow-md"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>١. استعراض وإدارة بنك الأسئلة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === "upload"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          <span>٢. رفع بنك أسئلة درس (Word / PDF / نص)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("generate")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === "generate"
              ? "bg-violet-600 text-white shadow-md"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>٣. توليد اختبار ذكي من البنك 🚀</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: EXPLORER & QUESTION MANAGEMENT                        */}
      {/* ============================================================ */}
      {activeTab === "explorer" && (
        <div className="space-y-6">
          {/* Stage Selector Pills */}
          <div className="space-y-2">
            <label className="text-xs font-black text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>اختر المرحلة الدراسية:</span>
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {DEFAULT_STAGES.map((st) => {
                const count = treeData.find((s) => s.stage === st)?.totalQuestions || 0;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setSelectedStage(st);
                      setSelectedUnit("");
                      setSelectedLesson("");
                      setLessonQuestions([]);
                    }}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      selectedStage === st
                        ? "bg-primary text-white shadow-md"
                        : "bg-card border border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{st}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        selectedStage === st ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Units & Lessons Grid for Selected Stage */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left/Sidebar: Units & Lessons List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <span>الوحدات والدروس ({currentStageNode?.units.length || 0})</span>
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUploadStage(selectedStage);
                    setActiveTab("upload");
                  }}
                  className="h-8 text-xs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                >
                  <Plus className="h-3.5 w-3.5 ml-1" /> رفع درس جديد
                </Button>
              </div>

              {!currentStageNode || currentStageNode.units.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-3">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="text-xs font-bold text-muted-foreground">
                    لا توجد بنوك أسئلة مضافة حتى الآن في ({selectedStage})
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      setUploadStage(selectedStage);
                      setActiveTab("upload");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9"
                  >
                    <UploadCloud className="h-3.5 w-3.5 ml-1.5" /> رفع أسئلة درس جديد الآن
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {currentStageNode.units.map((unitObj, uIdx) => (
                    <div
                      key={uIdx}
                      className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs"
                    >
                      <div className="p-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-black">
                            {uIdx + 1}
                          </span>
                          <span className="text-xs font-black text-foreground">{unitObj.unit}</span>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {unitObj.totalQuestions} سؤال
                        </span>
                      </div>

                      <div className="p-2 space-y-1">
                        {unitObj.lessons.map((lessonObj, lIdx) => {
                          const isSelected =
                            selectedUnit === unitObj.unit && selectedLesson === lessonObj.lesson;
                          return (
                            <button
                              key={lIdx}
                              type="button"
                              onClick={() => handleSelectLesson(unitObj.unit, lessonObj.lesson)}
                              className={`w-full text-right p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-white shadow-sm"
                                  : "hover:bg-muted/70 text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="truncate">{lessonObj.lesson}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-muted text-muted-foreground font-extrabold"
                                  }`}
                                >
                                  {lessonObj.totalQuestions} س
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Selected Lesson Questions Viewer */}
            <div className="lg:col-span-7 space-y-4">
              {selectedLesson ? (
                <>
                  {/* Lesson Header Actions */}
                  <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="text-[11px] text-muted-foreground font-bold">
                        {selectedStage} • {selectedUnit}
                      </div>
                      <h4 className="text-base font-black text-foreground">{selectedLesson}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span>إجمالي الأسئلة: {lessonQuestions.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleOpenCreateQuestion}
                        className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-9"
                      >
                        <Plus className="h-3.5 w-3.5 ml-1" /> إضافة سؤال يدوي
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setGenStage(selectedStage);
                          setGenUnit(selectedUnit);
                          setGenLesson(selectedLesson);
                          setGenTitle(`اختبار على (${selectedLesson})`);
                          setActiveTab("generate");
                        }}
                        className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold h-9"
                      >
                        <Sparkles className="h-3.5 w-3.5 ml-1" /> عمل امتحان منه
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearLesson}
                        title="حذف جميع أسئلة هذا الدرس"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 h-9 px-2.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Filters & Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="ابحث في نص السؤال أو الخيارات..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pr-9 pl-3 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <select
                      value={diffFilter}
                      onChange={(e) => setDiffFilter(e.target.value)}
                      className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="all">كل الصعوبات</option>
                      <option value="easy">سهل 🟢</option>
                      <option value="medium">متوسط 🟡</option>
                      <option value="hard">صعب 🔴</option>
                    </select>
                  </div>

                  {/* Questions List */}
                  {loadingQuestions ? (
                    <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
                      جارٍ تحميل أسئلة الدرس...
                    </div>
                  ) : filteredQuestions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-2">
                      <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground/50" />
                      <p className="text-xs font-bold text-muted-foreground">
                        لا توجد أسئلة تطابق الفلترة الحالية في هذا الدرس
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      {filteredQuestions.map((q, qIndex) => {
                        const questionData = q.question || {};
                        const diffBadge =
                          q.difficulty === "easy"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : q.difficulty === "hard"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20";
                        const diffLabel =
                          q.difficulty === "easy" ? "سهل" : q.difficulty === "hard" ? "صعب" : "متوسط";

                        return (
                          <div
                            key={q.id || qIndex}
                            className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white text-xs font-black">
                                  {qIndex + 1}
                                </span>
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${diffBadge}`}
                                >
                                  {diffLabel}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold">
                                  {q.points || 1} درجة
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditQuestion(q)}
                                  title="تعديل السؤال"
                                  className="p-1 text-slate-400 hover:text-primary rounded-lg hover:bg-muted"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  title="حذف السؤال"
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-muted"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs font-bold text-foreground leading-relaxed whitespace-pre-line">
                              {questionData.prompt}
                            </p>

                            {questionData.imageUrl && (
                              <div className="max-w-xs rounded-xl overflow-hidden border border-border">
                                <img
                                  src={questionData.imageUrl}
                                  alt="صورة السؤال"
                                  className="h-32 w-full object-cover"
                                />
                              </div>
                            )}

                            {/* Choices Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {(questionData.options || []).map((opt: string, optIdx: number) => {
                                const isCorrect = optIdx === questionData.correctIndex;
                                const letter = ["أ", "ب", "ج", "د", "هـ"][optIdx] || String(optIdx + 1);
                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                                      isCorrect
                                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold"
                                        : "bg-muted/40 border-border text-foreground"
                                    }`}
                                  >
                                    <span
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${
                                        isCorrect
                                          ? "bg-emerald-600 text-white"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {letter}
                                    </span>
                                    <span className="truncate">{opt}</span>
                                    {isCorrect && (
                                      <Check className="h-3.5 w-3.5 text-emerald-600 mr-auto shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation / Notes */}
                            {questionData.explanation && (
                              <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-primary space-y-0.5">
                                <span className="font-bold block">التفسير / خطوات الإجابة:</span>
                                <p className="text-foreground">{questionData.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center space-y-3">
                  <BookOpen className="mx-auto h-12 w-12 text-primary/40" />
                  <h4 className="text-sm font-black text-foreground">اختر درساً من القائمة لمعاينة أسئلته</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    اضغط على أي درس في القائمة على اليمين لعرض وتعديل أسئلته، أو اضغط "رفع درس جديد" لإضافة أسئلة من ملف.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: UPLOAD TEST BANK QUESTIONS TO A LESSON                */}
      {/* ============================================================ */}
      {activeTab === "upload" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="border-b border-border pb-4">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-emerald-600" />
                <span>رفع بنك أسئلة للدرس (Word / PDF / JSON / نص)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                حدد المرحلة والوحدة والدرس، ثم اختر الملف ليتم استخراج الأسئلة وتخزينها تلقائياً في بنك أسئلة هذا الدرس.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Stage Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-foreground">المرحلة الدراسية *</label>
                <select
                  value={uploadStage}
                  onChange={(e) => setUploadStage(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {DEFAULT_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Input with Suggestions */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-foreground">الوحدة (Unit) *</label>
                <input
                  type="text"
                  list="upload-unit-suggestions"
                  placeholder="مثال: الوحدة الأولى: الكيمياء والقياس"
                  value={uploadUnit}
                  onChange={(e) => setUploadUnit(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <datalist id="upload-unit-suggestions">
                  {suggestedUnits.map((u, i) => (
                    <option key={i} value={u} />
                  ))}
                </datalist>
              </div>

              {/* Lesson Input with Suggestions */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-foreground">الدرس (Lesson) *</label>
                <input
                  type="text"
                  list="upload-lesson-suggestions"
                  placeholder="مثال: الدرس الأول: أدوات القياس"
                  value={uploadLesson}
                  onChange={(e) => setUploadLesson(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <datalist id="upload-lesson-suggestions">
                  {suggestedLessons.map((l, i) => (
                    <option key={i} value={l} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Quick Pick From Platform Videos */}
            {videos.filter((v) => !v.stage || v.stage === uploadStage).length > 0 && (
              <div className="p-3 bg-muted/40 rounded-2xl border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-foreground">💡 اختصار سريع: </span>
                  <span className="text-muted-foreground">يمكنك اختيار درس فيديو موجود بالفعل على المنصة لتعبئة الوحدة والدرس تلقائياً:</span>
                </div>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const vid = videos.find((v) => String(v.id) === e.target.value);
                    if (vid) {
                      setUploadLesson(vid.title);
                      if (vid.courseId) {
                        const crs = courses.find((c) => c.id === vid.courseId);
                        if (crs) setUploadUnit(crs.title);
                      }
                    }
                  }}
                  className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-primary focus:outline-none cursor-pointer shrink-0"
                >
                  <option value="">-- اختر درساً من دروس المنصة --</option>
                  {videos
                    .filter((v) => !v.stage || v.stage === uploadStage)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        🎥 {v.title}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* File Upload Zone */}
            <div className="space-y-3">
              <label className="text-xs font-black text-foreground">
                اختر ملف الأسئلة أو الصق الأسئلة نصياً
              </label>

              <div className="relative rounded-2xl border-2 border-dashed border-border bg-muted/20 p-8 text-center hover:border-emerald-500 transition-colors">
                <input
                  type="file"
                  accept=".docx,.doc,.pdf,.txt,.json,.csv"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setUploadFile(e.target.files[0]);
                      setRawText("");
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2 pointer-events-none">
                  <FileText className="mx-auto h-10 w-10 text-emerald-600" />
                  {uploadFile ? (
                    <div className="text-xs font-black text-emerald-600">
                      📄 الملف المحدد: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-black text-foreground">
                        اسحب ملف الأسئلة هنا أو اضغط للاختيار
                      </p>
                      <p className="text-xs text-muted-foreground">
                        يدعم ملفات Word (.docx) • ملفات PDF • ملفات JSON • مذكرات نصية (.txt)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Or Paste Raw Text */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-muted-foreground">
                  أو الصق نص الأسئلة مباشرة هنا:
                </label>
                <textarea
                  rows={4}
                  placeholder={`مثال:\n1- ما هي وحدة قياس كمية المادة في النظام الدولي؟\nأ) الكيلوجرام\nب) المول\nج) المتر\nد) الثانية\nالإجابة الصحيحة: ب`}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    if (e.target.value) setUploadFile(null);
                  }}
                  className="w-full rounded-2xl border border-border bg-background p-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono"
                />
              </div>
            </div>

            {/* Analyze Button */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleAnalyzeUpload}
                disabled={isAnalyzing || (!uploadFile && !rawText.trim())}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                    <span>جارٍ تحليل وقراءة الأسئلة...</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 ml-2" />
                    <span>معاينة وتحليل الأسئلة قبل الحفظ 🔍</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Upload Warnings */}
          {previewWarnings.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs space-y-1">
              <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>ملاحظات تحليل الملف:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400">
                {previewWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Detected Questions */}
          {previewQuestions.length > 0 && (
            <div className="rounded-3xl border border-emerald-500/30 bg-card p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h4 className="text-base font-black text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>الأسئلة المستخرجة بنجاح ({previewQuestions.length} سؤال)</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    سيتم حفظ هذه الأسئلة في: {uploadStage} ⬅️ {uploadUnit} ⬅️ {uploadLesson}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                      <span>جارٍ الحفظ في بنك الأسئلة...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 ml-2" />
                      <span>تأكيد وحفظ الكل في بنك الدرس ({previewQuestions.length} سؤال) 📚</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {previewQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-white text-[10px] font-black">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">
                        الإجابة الصحيحة: الاختيار ({["أ", "ب", "ج", "د", "هـ"][q.correctIndex] || q.correctIndex + 1})
                      </span>
                    </div>

                    <p className="font-bold text-foreground leading-relaxed whitespace-pre-line">
                      {q.prompt}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          onClick={() => {
                            setPreviewQuestions((prev) => {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], correctIndex: oIdx };
                              return updated;
                            });
                          }}
                          className={`p-2 rounded-xl flex items-center gap-2 border cursor-pointer transition-all ${
                            oIdx === q.correctIndex
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/20 shadow-xs"
                              : "bg-background border-border text-foreground hover:border-emerald-500/40 hover:bg-muted/40"
                          }`}
                          title="اضغط لتحديد هذا الخيار كإجابة صحيحة لهذا السؤال"
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-black bg-muted">
                            {["أ", "ب", "ج", "د", "هـ"][oIdx] || oIdx + 1}
                          </span>
                          <span className="truncate flex-1">{opt}</span>
                          {oIdx === q.correctIndex && (
                            <Check className="h-3.5 w-3.5 text-emerald-600 mr-auto shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p className="text-[11px] text-muted-foreground pt-1">
                        <strong className="text-primary">التفسير:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: EXAM GENERATOR FROM TEST BANK                         */}
      {/* ============================================================ */}
      {activeTab === "generate" && (
        <div className="max-w-3xl mx-auto space-y-6">
          {generatedQuizSuccess ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-foreground">تم توليد الاختبار ونشره بنجاح! 🎉</h3>
                <p className="text-xs font-bold text-muted-foreground">
                  العنوان: {generatedQuizSuccess.title} ({generatedQuizSuccess.questions?.length} سؤال)
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setGeneratedQuizSuccess(null)}
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-10 px-5"
                >
                  <Plus className="h-4 w-4 ml-1.5" /> توليد اختبار آخر
                </Button>
                {onNavigateToQuizzes && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onNavigateToQuizzes}
                    className="text-xs font-bold h-10 px-5"
                  >
                    الانتقال لقائمة الاختبارات 📋
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleGenerateExam}
              className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm"
            >
              <div className="border-b border-border pb-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-400 mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>مولد الامتحانات الذكي</span>
                </div>
                <h3 className="text-lg font-black text-foreground">توليد اختبار فوري من بنك الأسئلة</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  حدد نطاق الأسئلة (مرحلة / وحدة / درس) ليقوم النظام بسحب الأسئلة عشوائياً وتوليد الامتحان فوراً.
                </p>
              </div>

              {/* Scope Selection */}
              <div className="space-y-4 bg-muted/30 p-4 rounded-2xl border border-border">
                <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span>١. تحديد نطاق الأسئلة في البنك:</span>
                </h4>

                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Stage */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">المرحلة *</label>
                    <select
                      value={genStage}
                      onChange={(e) => {
                        setGenStage(e.target.value);
                        setGenUnit("all");
                        setGenLesson("all");
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                    >
                      {DEFAULT_STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">الوحدة</label>
                    <select
                      value={genUnit}
                      onChange={(e) => {
                        setGenUnit(e.target.value);
                        setGenLesson("all");
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="all">-- كل وحدات المرحلة --</option>
                      {generatorUnits.map((u, i) => (
                        <option key={i} value={u.unit}>
                          {u.unit} ({u.totalQuestions} س)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lesson */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">الدرس</label>
                    <select
                      value={genLesson}
                      onChange={(e) => setGenLesson(e.target.value)}
                      disabled={genUnit === "all"}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="all">-- كل دروس الوحدة --</option>
                      {generatorLessons.map((l, i) => (
                        <option key={i} value={l.lesson}>
                          {l.lesson} ({l.totalQuestions} س)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Available Questions Live Breakdown Badge */}
                <div className="p-3 bg-card rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-foreground">
                    📊 رصيد الأسئلة المتوفرة في هذا النطاق:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg">
                      {availableCountInfo.total} سؤال
                    </span>
                    <span className="text-[11px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md font-bold">
                      سهل: {availableCountInfo.easy}
                    </span>
                    <span className="text-[11px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md font-bold">
                      متوسط: {availableCountInfo.medium}
                    </span>
                    <span className="text-[11px] text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md font-bold">
                      صعب: {availableCountInfo.hard}
                    </span>
                  </div>
                </div>
              </div>

              {/* Exam Metadata */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span>٢. بيانات وإعدادات الاختبار:</span>
                </h4>

                {/* Exam Scope & Video Linking */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">نطاق ظهور الاختبار</label>
                    <select
                      value={genScope}
                      onChange={(e) => setGenScope(e.target.value as "course" | "lesson")}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="course">امتحان عام للمرحلة والكورس 🌐</option>
                      <option value="lesson">اختبار مرتبط بدرس فيديو محدد 🎥</option>
                    </select>
                  </div>

                  {genScope === "lesson" && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-primary">اختر درس الفيديو لربط الاختبار به *</label>
                      <select
                        value={genVideoId}
                        onChange={(e) => {
                          setGenVideoId(e.target.value);
                          const v = videos.find((vid) => String(vid.id) === e.target.value);
                          if (v && !genTitle.trim()) {
                            setGenTitle(`اختبار ${v.title}`);
                          }
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-primary/40 bg-card text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="">-- اختر درس الفيديو --</option>
                        {videos
                          .filter((v) => !v.stage || v.stage === genStage)
                          .map((v) => (
                            <option key={v.id} value={v.id}>
                              🎥 {v.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">عنوان الاختبار *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: اختبار شامل على الوحدة الأولى"
                    value={genTitle}
                    onChange={(e) => setGenTitle(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">عدد الأسئلة</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={genCount}
                      onChange={(e) => setGenCount(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">الوقت (بالدقائق)</label>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      placeholder="مفتوح"
                      value={genDuration}
                      onChange={(e) => setGenDuration(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">درجة النجاح %</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={genPassingScore}
                      onChange={(e) => setGenPassingScore(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">المحاولات المسموحة</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={genMaxAttempts}
                      onChange={(e) => setGenMaxAttempts(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                    />
                  </div>
                </div>

                {/* Difficulty Distribution Selector */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-foreground">طريقة اختيار الأسئلة:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGenDifficultyMode("random")}
                        className={`text-xs px-3 py-1 rounded-lg font-bold transition-colors ${
                          genDifficultyMode === "random"
                            ? "bg-violet-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        عشوائي بالكامل 🎲
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenDifficultyMode("custom")}
                        className={`text-xs px-3 py-1 rounded-lg font-bold transition-colors ${
                          genDifficultyMode === "custom"
                            ? "bg-violet-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        توزيع مخصص للصعوبة ⚖️
                      </button>
                    </div>
                  </div>

                  {genDifficultyMode === "custom" && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-2xl border border-border text-center">
                      <div>
                        <label className="text-[11px] font-bold text-emerald-600 block mb-1">
                          سهل 🟢
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={easyCount}
                          onChange={(e) => setEasyCount(Number(e.target.value))}
                          className="w-full h-9 rounded-lg border border-border bg-background text-xs font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-amber-600 block mb-1">
                          متوسط 🟡
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={mediumCount}
                          onChange={(e) => setMediumCount(Number(e.target.value))}
                          className="w-full h-9 rounded-lg border border-border bg-background text-xs font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-rose-600 block mb-1">
                          صعب 🔴
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={hardCount}
                          onChange={(e) => setHardCount(Number(e.target.value))}
                          className="w-full h-9 rounded-lg border border-border bg-background text-xs font-bold text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="shuffleCheck"
                    checked={genShuffle}
                    onChange={(e) => setGenShuffle(e.target.checked)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                  <label htmlFor="shuffleCheck" className="text-xs font-bold text-foreground cursor-pointer">
                    تبديل ترتيب الأسئلة والخيارات عشوائياً لكل طالب لمنع الغش
                  </label>
                </div>
              </div>

              {/* Submit Generate */}
              <Button
                type="submit"
                disabled={isGenerating || !genTitle.trim()}
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جارٍ سحب الأسئلة وتوليد الاختبار...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>توليد ونشر الاختبار الآن 🚀</span>
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT / CREATE QUESTION MODAL                                 */}
      {/* ============================================================ */}
      {showQuestionModal && editingQuestion && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          onClick={(e) => e.target === e.currentTarget && setShowQuestionModal(false)}
        >
          <div className="w-full max-w-xl bg-card rounded-3xl shadow-2xl border border-border text-right max-h-[90vh] flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>{editingQuestion.id ? "تعديل السؤال في البنك" : "إضافة سؤال جديد للدرس"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">نص السؤال *</label>
                <textarea
                  rows={3}
                  required
                  value={editingQuestion.prompt}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, prompt: e.target.value })
                  }
                  placeholder="اكتب نص السؤال هنا..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Choices */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">
                  الاختيارات (حدد الدائرة بجانب الإجابة الصحيحة):
                </label>
                {editingQuestion.options.map((opt: string, i: number) => {
                  const letter = ["أ", "ب", "ج", "د", "هـ"][i] || String(i + 1);
                  const isChecked = editingQuestion.correctIndex === i;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctIndex"
                        checked={isChecked}
                        onChange={() =>
                          setEditingQuestion({ ...editingQuestion, correctIndex: i })
                        }
                        className="h-4 w-4 accent-emerald-600 cursor-pointer"
                      />
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-[11px] font-black">
                        {letter}
                      </span>
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const next = [...editingQuestion.options];
                          next[i] = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: next });
                        }}
                        placeholder={`الاختيار (${letter})`}
                        className={`flex-1 h-9 px-3 rounded-xl border text-xs font-bold text-foreground focus:outline-none ${
                          isChecked
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : "border-border bg-background"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">مستوى الصعوبة</label>
                  <select
                    value={editingQuestion.difficulty || "medium"}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })
                    }
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold cursor-pointer"
                  >
                    <option value="easy">سهل 🟢</option>
                    <option value="medium">متوسط 🟡</option>
                    <option value="hard">صعب 🔴</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">درجة السؤال</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editingQuestion.points || 1}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, points: Number(e.target.value) })
                    }
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">
                  التفسير وخطوات الإجابة (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation || ""}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                  }
                  placeholder="شرح سبب صحة هذا الاختيار..."
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">
                  رابط صورة السؤال (اختياري)
                </label>
                <input
                  type="text"
                  value={editingQuestion.imageUrl || ""}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })
                  }
                  placeholder="https://... أو /api/..."
                  className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Button
                  type="submit"
                  disabled={savingQuestion}
                  className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs"
                >
                  {savingQuestion ? "جارٍ الحفظ..." : "حفظ السؤال في البنك 💾"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuestionModal(false)}
                  className="h-11 rounded-xl text-xs"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
