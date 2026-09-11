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
  GraduationCap,
  Video,
  PlaySquare,
  CheckSquare,
  ArrowRight
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
  lessonId?: number | null;
  courseId?: number | null;
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
  videos: Array<{ id: number; title: string; courseId: number; stage?: string; quizId?: number | null }>;
  stages?: string[];
};

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
  const [courses, setCourses] = useState<Array<{ id: number; title: string; stages: string[] }>>([]);
  const [videos, setVideos] = useState<Array<{ id: number; title: string; courseId: number; stage?: string; quizId?: number | null }>>([]);
  const [systemStages, setSystemStages] = useState<string[]>([]);
  const [loadingTree, setLoadingTree] = useState<boolean>(false);

  // Available stages computed dynamically from server data
  const availableStages = useMemo(() => {
    const set = new Set<string>();
    for (const s of systemStages) if (s && s.trim()) set.add(s.trim());
    for (const t of treeData) if (t.stage && t.stage.trim()) set.add(t.stage.trim());
    for (const c of courses) {
      if (Array.isArray(c.stages)) {
        for (const st of c.stages) if (st && st.trim()) set.add(st.trim());
      }
    }
    for (const v of videos) {
      if (v.stage && v.stage.trim()) set.add(v.stage.trim());
    }

    if (set.size === 0) {
      return [
        "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي",
        "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس لغات (Languages)",
        "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس عربي",
        "البكالوريا · الصف الثاني (تانية بكالوريا) · مدارس لغات (Languages)",
        "المرحلة الجامعية · الفرقة الأولى / إعدادي · كلية حاسبات ومعلومات",
        "المرحلة الجامعية · الفرقة الثانية · كلية حاسبات ومعلومات",
        "الثانوية العامة · الصف الأول الثانوي · مدارس عربي",
        "عام",
      ];
    }
    return Array.from(set);
  }, [systemStages, treeData, courses, videos]);

  // Explorer Selection
  const [selectedStage, setSelectedStage] = useState<string>("");
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

  // Upload Tab State
  const [uploadMode, setUploadMode] = useState<"from_course" | "manual">("from_course");
  const [uploadStage, setUploadStage] = useState<string>("");
  const [uploadCourseId, setUploadCourseId] = useState<string>("");
  const [uploadLessonId, setUploadLessonId] = useState<string>("");
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
  const [recentSavedLesson, setRecentSavedLesson] = useState<{
    stage: string;
    unit: string;
    lesson: string;
    lessonId?: string;
    count: number;
  } | null>(null);

  // Generator Tab State
  const [genScope, setGenScope] = useState<"lesson" | "multi_lessons" | "unit" | "stage">("lesson");
  const [genSelectedLessons, setGenSelectedLessons] = useState<string[]>([]);
  const [genLessonMode, setGenLessonMode] = useState<"video" | "bank">("video");
  const [genStage, setGenStage] = useState<string>("");
  const [genCourseId, setGenCourseId] = useState<string>("");
  const [genVideoId, setGenVideoId] = useState<string>("");
  const [genUnit, setGenUnit] = useState<string>("all");
  const [genLesson, setGenLesson] = useState<string>("all");
  const [genTitle, setGenTitle] = useState<string>("");
  const [genCount, setGenCount] = useState<number>(10);
  const [genDuration, setGenDuration] = useState<number>(30);
  const [genPassingScore, setGenPassingScore] = useState<number>(60);
  const [genMaxAttempts, setGenMaxAttempts] = useState<number>(2);
  const [genShuffle, setGenShuffle] = useState<boolean>(true);
  const [genRequiredProgress, setGenRequiredProgress] = useState<number>(80);
  const [genDifficultyMode, setGenDifficultyMode] = useState<"random" | "custom">("random");
  const [easyCount, setEasyCount] = useState<number>(3);
  const [mediumCount, setMediumCount] = useState<number>(5);
  const [hardCount, setHardCount] = useState<number>(2);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedQuizSuccess, setGeneratedQuizSuccess] = useState<any | null>(null);

  // Load Tree Data from Backend
  const loadTree = async () => {
    setLoadingTree(true);
    try {
      const res = await adminApi<TreeResponse>("/api/admin/learning/test-bank/tree");
      setTreeData(res.tree || []);
      setTotalQuestions(res.totalQuestions || 0);
      setCourses(res.courses || []);
      setVideos(res.videos || []);
      if (res.stages && res.stages.length > 0) {
        setSystemStages(res.stages);
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

  // Ensure selectedStage, uploadStage, genStage default to a valid available stage
  useEffect(() => {
    if (availableStages.length > 0) {
      if (!selectedStage || !availableStages.includes(selectedStage)) {
        setSelectedStage(availableStages[0]);
      }
      if (!uploadStage || !availableStages.includes(uploadStage)) {
        setUploadStage(availableStages[0]);
      }
      if (!genStage || !availableStages.includes(genStage)) {
        setGenStage(availableStages[0]);
      }
    }
  }, [availableStages]);

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
        const p = (q.question?.prompt || "").toLowerCase();
        const o = (q.question?.options || []).join(" ").toLowerCase();
        const s = searchQuery.toLowerCase();
        return p.includes(s) || o.includes(s);
      }
      return true;
    });
  }, [lessonQuestions, diffFilter, searchQuery]);

  // Clear entire lesson questions
  const handleClearLesson = async () => {
    if (!selectedStage || !selectedUnit || !selectedLesson) return;
    const confirmMsg = `هل أنت متأكد من تفريغ وحذف جميع أسئلة (${selectedLesson})؟ لا يمكن التراجع.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminApi("/api/admin/learning/test-bank/clear-lesson", {
        method: "DELETE",
        body: JSON.stringify({
          stage: selectedStage,
          unit: selectedUnit,
          lesson: selectedLesson,
        }),
      });
      toast({ title: `تم تفريغ أسئلة (${selectedLesson}) بنجاح` });
      setLessonQuestions([]);
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حذف أسئلة الدرس" });
    }
  };

  // Delete single question
  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm("هل تريد بالتأكيد حذف هذا السؤال من البنك؟")) return;
    try {
      await adminApi(`/api/admin/learning/question-bank/${id}`, { method: "DELETE" });
      toast({ title: "تم حذف السؤال بنجاح" });
      setLessonQuestions((prev) => prev.filter((q) => q.id !== id));
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حذف السؤال" });
    }
  };

  // Open Edit Modal
  const handleOpenEditQuestion = (q: any) => {
    setEditingQuestion({
      id: q.id,
      prompt: q.question?.prompt || "",
      options: [...(q.question?.options || ["", ""])],
      correctIndex: q.question?.correctIndex ?? 0,
      explanation: q.question?.explanation || "",
      imageUrl: q.question?.imageUrl || "",
      points: q.points || q.question?.points || 1,
      difficulty: q.difficulty || "medium",
      stage: q.stage || selectedStage,
      unit: q.unit || selectedUnit,
      lesson: q.lesson || selectedLesson,
    });
    setShowQuestionModal(true);
  };

  // Open Add Question Modal
  const handleOpenAddQuestion = () => {
    setEditingQuestion({
      prompt: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
      imageUrl: "",
      points: 1,
      difficulty: "medium",
      stage: selectedStage || availableStages[0] || "عام",
      unit: selectedUnit || "الوحدة الأولى",
      lesson: selectedLesson || "الدرس الأول",
    });
    setShowQuestionModal(true);
  };

  // Save (Create or Update) Question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    if (!editingQuestion.prompt.trim()) {
      toast({ variant: "destructive", description: "يرجى كتابة نص السؤال" });
      return;
    }
    const filteredOpts = editingQuestion.options.filter((o: string) => o.trim().length > 0);
    if (filteredOpts.length < 2) {
      toast({ variant: "destructive", description: "يجب إدخال خيارين على الأقل للسؤال" });
      return;
    }

    setSavingQuestion(true);
    try {
      const isEdit = Boolean(editingQuestion.id);
      const url = isEdit
        ? `/api/admin/learning/question-bank/${editingQuestion.id}`
        : "/api/admin/learning/question-bank";
      const method = isEdit ? "PUT" : "POST";

      await adminApi(url, {
        method,
        body: JSON.stringify({
          prompt: editingQuestion.prompt.trim(),
          options: filteredOpts,
          correctIndex: Math.min(editingQuestion.correctIndex, filteredOpts.length - 1),
          explanation: editingQuestion.explanation?.trim() || null,
          imageUrl: editingQuestion.imageUrl?.trim() || null,
          points: Number(editingQuestion.points) || 1,
          difficulty: editingQuestion.difficulty || "medium",
          stage: editingQuestion.stage,
          stages: [editingQuestion.stage],
          unit: editingQuestion.unit,
          lesson: editingQuestion.lesson,
        }),
      });

      toast({ title: isEdit ? "تم تحديث السؤال بنجاح" : "تمت إضافة السؤال بنجاح إلى البنك" });
      setShowQuestionModal(false);
      setEditingQuestion(null);
      if (selectedStage && selectedUnit && selectedLesson) {
        loadQuestions(selectedStage, selectedUnit, selectedLesson);
      }
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حفظ السؤال" });
    } finally {
      setSavingQuestion(false);
    }
  };

  // Analyze Uploaded File or Text (Preview)
  const handleAnalyzeUpload = async () => {
    if (!uploadFile && !rawText.trim()) {
      toast({ variant: "destructive", description: "يرجى اختيار ملف أو إدخال نص الأسئلة أولاً" });
      return;
    }

    setIsAnalyzing(true);
    setPreviewQuestions([]);
    setPreviewWarnings([]);

    try {
      let res: any;
      if (uploadFile) {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("previewOnly", "true");
        formData.append("stage", uploadStage);
        formData.append("unit", uploadUnit);
        formData.append("lesson", uploadLesson);
        formData.append("difficulty", uploadDifficulty);
        formData.append("points", String(uploadPoints));
        if (uploadMode === "from_course") {
          if (uploadCourseId) formData.append("courseId", uploadCourseId);
          if (uploadLessonId) formData.append("lessonId", uploadLessonId);
        }

        res = await adminApi<any>("/api/admin/learning/test-bank/upload", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await adminApi<any>("/api/admin/learning/test-bank/batch-import", {
          method: "POST",
          body: JSON.stringify({
            text: rawText,
            previewOnly: true,
            stage: uploadStage,
            unit: uploadUnit,
            lesson: uploadLesson,
            difficulty: uploadDifficulty,
            points: uploadPoints,
            courseId: uploadMode === "from_course" && uploadCourseId ? Number(uploadCourseId) : undefined,
            lessonId: uploadMode === "from_course" && uploadLessonId ? Number(uploadLessonId) : undefined,
          }),
        });
      }

      setPreviewQuestions(res.questions || []);
      setPreviewWarnings(res.warnings || []);
      if ((res.questions || []).length === 0) {
        if (res.extractedText && res.extractedText.trim()) {
          setRawText(res.extractedText);
          setUploadFile(null);
          toast({
            title: "تم استخراج النص من الملف بنجاح",
            description: "لم نتمكن من تحديد بنية الأسئلة آلياً. تم وضع النص المستخرج في محرر 'نص مباشر' لتعديل تنسيقه وفحصه بسهولة.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "لم يتم التعرف على أسئلة",
            description: res.warnings?.[0] || "تأكد من تنسيق الملف أو كتابة كل سؤال بخياراته وإجابته الصريحة.",
          });
        }
      } else {
        if (res.extractedText && !rawText) {
          setRawText(res.extractedText);
        }
        toast({
          title: `تم التعرف على ${res.questions.length} سؤالاً بنجاح!`,
          description: "راجع الأسئلة أدناه ثم اضغط 'حفظ في البنك'.",
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر فحص وتحليل الملف" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Final Commit of Uploaded Questions to Bank
  const handleConfirmImport = async () => {
    if (previewQuestions.length === 0) {
      toast({ variant: "destructive", description: "لا توجد أسئلة جاهزة للحفظ" });
      return;
    }

    if (!uploadStage.trim() || !uploadUnit.trim() || !uploadLesson.trim()) {
      toast({ variant: "destructive", description: "يرجى التأكد من تحديد المرحلة والوحدة والدرس" });
      return;
    }

    setIsImporting(true);
    try {
      const res = await adminApi<any>("/api/admin/learning/test-bank/batch-import", {
        method: "POST",
        body: JSON.stringify({
          rawQuestions: previewQuestions,
          stage: uploadStage,
          unit: uploadUnit,
          lesson: uploadLesson,
          difficulty: uploadDifficulty,
          points: uploadPoints,
          courseId: uploadMode === "from_course" && uploadCourseId ? Number(uploadCourseId) : undefined,
          lessonId: uploadMode === "from_course" && uploadLessonId ? Number(uploadLessonId) : undefined,
        }),
      });

      toast({
        title: `تم حفظ ${res.count} سؤالاً في بنك درس (${uploadLesson}) بنجاح! 🎉`,
      });

      setRecentSavedLesson({
        stage: uploadStage,
        unit: uploadUnit,
        lesson: uploadLesson,
        lessonId: uploadMode === "from_course" ? uploadLessonId : undefined,
        count: res.count,
      });

      setPreviewQuestions([]);
      setPreviewWarnings([]);
      setUploadFile(null);
      setRawText("");
      loadTree();
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
    if (genScope === "multi_lessons" && genSelectedLessons.length === 0) {
      toast({ variant: "destructive", description: "يرجى تحديد درس واحد على الأقل من القائمة لتوليد الاختبار" });
      return;
    }
    if (availableCountInfo.total === 0) {
      toast({ variant: "destructive", description: "لا توجد أسئلة متوفرة في بنك الأسئلة لهذا النطاق المختار. يرجى رفع أسئلة أولاً." });
      return;
    }
    setIsGenerating(true);
    setGeneratedQuizSuccess(null);

    try {
      const isVideoLesson = genScope === "lesson" && genLessonMode === "video" && Boolean(genVideoId);
      const isMulti = genScope === "multi_lessons";
      const targetCount = Math.min(genCount, availableCountInfo.total);

      const bodyPayload: any = {
        title: genTitle.trim(),
        stage: genStage,
        unit: genScope === "stage" ? undefined : (genUnit === "all" ? undefined : genUnit),
        lesson: (genScope === "stage" || genScope === "unit" || isMulti) ? undefined : (genLesson === "all" ? undefined : genLesson),
        lessons: isMulti ? genSelectedLessons : undefined,
        courseId: genCourseId ? Number(genCourseId) : undefined,
        scope: isVideoLesson ? "lesson" : "course",
        videoId: isVideoLesson ? Number(genVideoId) : undefined,
        count: targetCount,
        durationMinutes: genDuration || null,
        passingScore: genPassingScore,
        maxAttempts: genMaxAttempts,
        shuffleQuestions: genShuffle,
        requiredProgress: isVideoLesson ? genRequiredProgress : 0,
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
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر توليد الاختبار من البنك" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Suggested units & lessons for upload tab based on uploadStage
  const suggestedUnits = useMemo(() => {
    const st = treeData.find((s) => s.stage === uploadStage);
    return st ? st.units.map((u) => u.unit) : [];
  }, [treeData, uploadStage]);

  const suggestedLessons = useMemo(() => {
    const st = treeData.find((s) => s.stage === uploadStage);
    if (!st) return [];
    const u = st.units.find((unit) => unit.unit === uploadUnit);
    return u ? u.lessons.map((l) => l.lesson) : [];
  }, [treeData, uploadStage, uploadUnit]);

  // Lessons list for currently selected course in Upload Tab
  const uploadCourseLessons = useMemo(() => {
    if (!uploadCourseId) return [];
    return videos.filter((v) => String(v.courseId) === String(uploadCourseId));
  }, [videos, uploadCourseId]);

  // Lessons list for currently selected course in Generator Tab
  const genCourseLessons = useMemo(() => {
    if (!genCourseId) return [];
    return videos.filter((v) => String(v.courseId) === String(genCourseId));
  }, [videos, genCourseId]);

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

  // Lessons list for multi-lesson selection in Generator
  const multiLessonList = useMemo(() => {
    const st = treeData.find((s) => s.stage === genStage);
    if (!st) return [];
    const list: {
      lesson: string;
      unit: string;
      totalQuestions: number;
      difficulty: { easy: number; medium: number; hard: number };
    }[] = [];
    for (const u of st.units) {
      if (genUnit !== "all" && u.unit !== genUnit) continue;
      for (const l of u.lessons) {
        list.push({
          lesson: l.lesson,
          unit: u.unit,
          totalQuestions: l.totalQuestions,
          difficulty: l.difficulty,
        });
      }
    }
    return list;
  }, [treeData, genStage, genUnit]);

  // Count available questions for selected generator scope
  const availableCountInfo = useMemo(() => {
    if (genScope === "multi_lessons") {
      const selectedSet = new Set(genSelectedLessons);
      let total = 0, easy = 0, medium = 0, hard = 0;
      const st = treeData.find((s) => s.stage === genStage);
      if (st) {
        for (const u of st.units) {
          for (const l of u.lessons) {
            if (selectedSet.has(l.lesson)) {
              total += l.totalQuestions;
              easy += l.difficulty?.easy || 0;
              medium += l.difficulty?.medium || 0;
              hard += l.difficulty?.hard || 0;
            }
          }
        }
      }
      return { total, easy, medium, hard };
    }

    if (genScope === "lesson") {
      // 1. Try finding within genStage and genUnit first
      const currentStage = treeData.find((s) => s.stage === genStage);
      if (currentStage) {
        if (genUnit && genUnit !== "all") {
          const u = currentStage.units.find((unit) => unit.unit === genUnit);
          const l = u?.lessons.find((les) => les.lesson === genLesson || (genVideoId && les.lessonId === Number(genVideoId)));
          if (l) return { total: l.totalQuestions, ...l.difficulty };
        } else {
          for (const u of currentStage.units) {
            const l = u.lessons.find((les) => les.lesson === genLesson || (genVideoId && les.lessonId === Number(genVideoId)));
            if (l) return { total: l.totalQuestions, ...l.difficulty };
          }
        }
      }

      // 2. If video is selected, try finding across any stage by lessonId or title
      if (genVideoId) {
        for (const s of treeData) {
          for (const u of s.units) {
            const l = u.lessons.find((les) => les.lessonId === Number(genVideoId) || les.lesson === genLesson);
            if (l) return { total: l.totalQuestions, ...l.difficulty };
          }
        }
      }

      // 3. Fallback across all stages by lesson title
      if (genLesson && genLesson !== "all") {
        for (const s of treeData) {
          for (const u of s.units) {
            const l = u.lessons.find((les) => les.lesson === genLesson);
            if (l) return { total: l.totalQuestions, ...l.difficulty };
          }
        }
      }
      return { total: 0, easy: 0, medium: 0, hard: 0 };
    }

    const st = treeData.find((s) => s.stage === genStage);
    if (!st) return { total: 0, easy: 0, medium: 0, hard: 0 };
    if (genScope === "stage" || genUnit === "all") {
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
  }, [treeData, genScope, genStage, genUnit, genLesson, genSelectedLessons]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
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
              className="h-12 rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-xs cursor-pointer"
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
          <span>٢. رفع واستيراد بنك أسئلة درس</span>
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
              {availableStages.map((st) => {
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
                  className="h-8 text-xs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 cursor-pointer"
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

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        onClick={handleOpenAddQuestion}
                        className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-9 cursor-pointer"
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
                          const v = videos.find((vid) => vid.title.trim() === selectedLesson.trim());
                          if (v) {
                            setGenScope("lesson");
                            setGenLessonMode("video");
                            setGenVideoId(String(v.id));
                            if (v.courseId) setGenCourseId(String(v.courseId));
                          } else {
                            setGenScope("lesson");
                            setGenLessonMode("bank");
                            setGenVideoId("");
                          }
                          setActiveTab("generate");
                        }}
                        className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold h-9 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 ml-1" /> عمل امتحان منه
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setUploadStage(selectedStage);
                          setUploadUnit(selectedUnit);
                          setUploadLesson(selectedLesson);
                          const v = videos.find((vid) => vid.title.trim() === selectedLesson.trim());
                          if (v) {
                            setUploadCourseId(String(v.courseId));
                            setUploadLessonId(String(v.id));
                          }
                          setActiveTab("upload");
                        }}
                        title="رفع المزيد من الأسئلة لهذا الدرس"
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-9 px-2.5 text-xs font-bold cursor-pointer"
                      >
                        <UploadCloud className="h-4 w-4 ml-1" /> رفع المزيد
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClearLesson}
                        title="تفريغ جميع أسئلة هذا الدرس"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 h-9 px-2.5 cursor-pointer"
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
                                  className="p-1 text-slate-400 hover:text-primary rounded-lg hover:bg-muted cursor-pointer"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  title="حذف السؤال"
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-muted cursor-pointer"
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
                  <h4 className="text-sm font-black text-foreground">اختر درساً من القائمة لمعاينة وتعديل أسئلته</h4>
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
          {/* Post-save Celebration Action Card */}
          {recentSavedLesson && (
            <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>تم حفظ {recentSavedLesson.count} سؤال بنجاح في بنك ({recentSavedLesson.lesson})!</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  الأسئلة جاهزة الآن. هل ترغب في توليد امتحان للطلاب من بنك هذا الدرس الآن؟
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  onClick={() => {
                    setGenStage(recentSavedLesson.stage);
                    setGenUnit(recentSavedLesson.unit);
                    setGenLesson(recentSavedLesson.lesson);
                    setGenTitle(`اختبار على درس ${recentSavedLesson.lesson}`);
                    if (recentSavedLesson.lessonId) {
                      setGenScope("lesson");
                      setGenVideoId(recentSavedLesson.lessonId);
                    } else {
                      setGenScope("lesson");
                    }
                    setActiveTab("generate");
                  }}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-black h-10 px-5 shadow-md cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 ml-1.5" />
                  توليد امتحان لهذا الدرس فوراً 🚀
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRecentSavedLesson(null)}
                  className="h-10 text-xs font-bold cursor-pointer"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="border-b border-border pb-4">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-emerald-600" />
                <span>رفع بنك أسئلة للدرس (Word / PDF / JSON / نص)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                اختر طريقة تحديد الدرس (من الكورسات المسجلة أو إدخال يدوي)، ثم ارفع الملف أو الصق الأسئلة.
              </p>
            </div>

            {/* Mode Selector */}
            <div className="flex gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border/70 max-w-md">
              <button
                type="button"
                onClick={() => setUploadMode("from_course")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  uploadMode === "from_course"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PlaySquare className="h-3.5 w-3.5 text-primary" />
                <span>اختيار من دروس الكورسات (مباشر)</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("manual")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  uploadMode === "manual"
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
                <span>إدخال يدوي (مرحلة ⬅️ وحدة ⬅️ درس)</span>
              </button>
            </div>

            {/* Mode 1: From Existing Course & Lesson */}
            {uploadMode === "from_course" && (
              <div className="p-4 bg-muted/20 rounded-2xl border border-border space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-foreground">اختر الكورس / المادة *</label>
                    <select
                      value={uploadCourseId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setUploadCourseId(cid);
                        setUploadLessonId("");
                        const crs = courses.find((c) => String(c.id) === cid);
                        if (crs) {
                          setUploadUnit(crs.title);
                          if (crs.stages?.length) setUploadStage(crs.stages[0]);
                        }
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="">-- اختر الكورس --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-foreground">اختر الدرس (الفيديو) المطلوب *</label>
                    <select
                      value={uploadLessonId}
                      disabled={!uploadCourseId}
                      onChange={(e) => {
                        const lid = e.target.value;
                        setUploadLessonId(lid);
                        const vid = videos.find((v) => String(v.id) === lid);
                        if (vid) {
                          setUploadLesson(vid.title);
                          if (vid.stage) setUploadStage(vid.stage);
                        }
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50"
                    >
                      <option value="">-- اختر درس الفيديو --</option>
                      {uploadCourseLessons.map((v) => (
                        <option key={v.id} value={v.id}>
                          🎥 {v.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {uploadLessonId && (
                  <div className="grid gap-3 sm:grid-cols-3 pt-1 border-t border-border/60">
                    <div className="text-xs">
                      <span className="text-muted-foreground block text-[11px]">المرحلة التابعة لها:</span>
                      <span className="font-bold text-foreground">{uploadStage || "عام"}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground block text-[11px]">اسم الوحدة التقديري:</span>
                      <input
                        type="text"
                        value={uploadUnit}
                        onChange={(e) => setUploadUnit(e.target.value)}
                        className="h-8 px-2 rounded-lg border border-border bg-background text-xs font-bold w-full"
                      />
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground block text-[11px]">اسم الدرس المسجل:</span>
                      <span className="font-bold text-primary truncate block">{uploadLesson}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Manual Stage / Unit / Lesson */}
            {uploadMode === "manual" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-foreground">المرحلة الدراسية *</label>
                  <select
                    value={uploadStage}
                    onChange={(e) => setUploadStage(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    {availableStages.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-foreground">الوحدة (Unit) *</label>
                  <input
                    type="text"
                    list="upload-unit-suggestions"
                    placeholder="مثال: الوحدة الأولى: بنية الحاسب"
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

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-foreground">الدرس (Lesson) *</label>
                  <input
                    type="text"
                    list="upload-lesson-suggestions"
                    placeholder="مثال: الدرس الأول: التحويلات العددية"
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
            )}

            {/* File Upload Zone */}
            <div className="space-y-3">
              <label className="text-xs font-black text-foreground">
                ملف الأسئلة أو نص الأسئلة (يدعم Word و PDF و TXT و JSON):
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
                        اسحب ملف الأسئلة هنا أو اضغط للاختيار من جهازك
                      </p>
                      <p className="text-xs text-muted-foreground">
                        يدعم ملفات Word (.docx) • ملفات PDF • ملفات JSON • نصوص عادية (.txt)
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
                  placeholder={`مثال:\n1- ما هي وحدة قياس كمية المادة في النظام الدولي؟\nأ) الكيلوجرام\nب) المول\nج) المتر\nد) الثانية\nالإجابة الصحيحة: ب\nالتوضيح: المول هو الوحدة الأساسية في SI.`}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    if (e.target.value) setUploadFile(null);
                  }}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Default Difficulty & Points for Imported Questions */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  الصعوبة الافتراضية (للأسئلة غير المحددة):
                </label>
                <select
                  value={uploadDifficulty}
                  onChange={(e) => setUploadDifficulty(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground cursor-pointer"
                >
                  <option value="easy">سهل 🟢</option>
                  <option value="medium">متوسط 🟡</option>
                  <option value="hard">صعب 🔴</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">
                  درجة السؤال الافتراضية:
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={uploadPoints}
                  onChange={(e) => setUploadPoints(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                />
              </div>
            </div>

            {/* Action Analyze Button */}
            <Button
              type="button"
              disabled={isAnalyzing || (!uploadFile && !rawText.trim())}
              onClick={handleAnalyzeUpload}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جارٍ فك التشفير واستخراج الأسئلة من الملف...</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span>تحليل واستخراج الأسئلة للمعاينة قبل الحفظ 🔍</span>
                </>
              )}
            </Button>
          </div>

          {/* Questions Preview & Confirmation Zone */}
          {previewQuestions.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h4 className="text-base font-black text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>تم التعرف على ({previewQuestions.length}) سؤال بنجاح!</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    راجع الأسئلة والاختيارات والإجابة الصحيحة المحددة لكل سؤال. يمكنك تغيير الإجابة بالضغط على أي خيار.
                  </p>
                </div>

                <Button
                  type="button"
                  disabled={isImporting}
                  onClick={handleConfirmImport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-11 px-6 shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>جارٍ الحفظ في بنك الأسئلة...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>تأكيد وحفظ كل الأسئلة في بنك الدرس ({uploadLesson}) 💾</span>
                    </>
                  )}
                </Button>
              </div>

              {previewWarnings.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 text-xs text-amber-700 dark:text-amber-300">
                  <span className="font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> ملاحظات أثناء التحليل:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {previewWarnings.slice(0, 5).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Cards */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {previewQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-black">
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={q.difficulty || "medium"}
                          onChange={(e) => {
                            const val = e.target.value as "easy" | "medium" | "hard";
                            setPreviewQuestions((prev) => {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], difficulty: val };
                              return updated;
                            });
                          }}
                          className="h-7 px-2 rounded-lg border border-border bg-card text-[11px] font-bold cursor-pointer"
                        >
                          <option value="easy">سهل 🟢</option>
                          <option value="medium">متوسط 🟡</option>
                          <option value="hard">صعب 🔴</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewQuestions((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          title="استبعاد هذا السؤال من الاستيراد"
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-foreground whitespace-pre-line">{q.prompt}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
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
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-4 shadow-sm animate-in fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-foreground">تم توليد الاختبار ونشره بنجاح! 🎉</h3>
                <p className="text-xs font-bold text-muted-foreground">
                  العنوان: {generatedQuizSuccess.title} ({generatedQuizSuccess.questions?.length || generatedQuizSuccess.actualCount} سؤال)
                </p>
                {generatedQuizSuccess.note && (
                  <p className="text-xs text-amber-600 font-bold mt-1">
                    ℹ️ {generatedQuizSuccess.note}
                  </p>
                )}
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setGeneratedQuizSuccess(null)}
                  className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-10 px-5 cursor-pointer"
                >
                  <Plus className="h-4 w-4 ml-1.5" /> توليد اختبار آخر
                </Button>
                {onNavigateToQuizzes && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onNavigateToQuizzes}
                    className="text-xs font-bold h-10 px-5 cursor-pointer"
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
                  <span>مولد الامتحانات الذكي من بنك الأسئلة</span>
                </div>
                <h3 className="text-lg font-black text-foreground">توليد اختبار فوري وموزع الصعوبة</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  حدد نطاق الأسئلة (درس محدد، وحدة، أو مرحلة كاملة) ليقوم النظام بسحب الأسئلة عشوائياً وتوليد الاختبار فوراً.
                </p>
              </div>

              {/* Scope Selection */}
              <div className="space-y-4 bg-muted/30 p-4 rounded-2xl border border-border">
                <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span>١. تحديد نوع ونطاق الامتحان:</span>
                </h4>

                {/* Scope Radio Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenScope("lesson")}
                    className={`p-3 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                      genScope === "lesson"
                        ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                        : "bg-card border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <Video className="h-4 w-4 mx-auto mb-1 text-current" />
                    <span>درس محدد 🎥</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenScope("multi_lessons")}
                    className={`p-3 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                      genScope === "multi_lessons"
                        ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                        : "bg-card border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <CheckSquare className="h-4 w-4 mx-auto mb-1 text-current" />
                    <span>عدة دروس محددة 📑</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenScope("unit")}
                    className={`p-3 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                      genScope === "unit"
                        ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                        : "bg-card border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <FolderOpen className="h-4 w-4 mx-auto mb-1 text-current" />
                    <span>شامل للوحدة 📚</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenScope("stage")}
                    className={`p-3 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                      genScope === "stage"
                        ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                        : "bg-card border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <GraduationCap className="h-4 w-4 mx-auto mb-1 text-current" />
                    <span>شامل للمرحلة 🎓</span>
                  </button>
                </div>

                {/* If Lesson Scope: Course & Lesson selection */}
                {genScope === "lesson" && (
                  <div className="p-3.5 bg-card rounded-xl border border-border/80 space-y-3">
                    <div className="flex gap-2 p-1 bg-muted/40 rounded-xl border border-border/70 max-w-sm mb-1">
                      <button
                        type="button"
                        onClick={() => setGenLessonMode("video")}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          genLessonMode === "video"
                            ? "bg-card text-foreground shadow-xs border border-border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Video className="h-3.5 w-3.5 text-primary" />
                        <span>درس فيديو لكورس</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGenLessonMode("bank");
                          setGenVideoId("");
                        }}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          genLessonMode === "bank"
                            ? "bg-card text-foreground shadow-xs border border-border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
                        <span>من شجرة البنك</span>
                      </button>
                    </div>

                    {genLessonMode === "video" ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground">الكورس / المادة</label>
                            <select
                              value={genCourseId}
                              onChange={(e) => {
                                setGenCourseId(e.target.value);
                                setGenVideoId("");
                                const crs = courses.find((c) => String(c.id) === e.target.value);
                                if (crs?.stages?.length) setGenStage(crs.stages[0]);
                              }}
                              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                            >
                              <option value="">-- كل الكورسات --</option>
                              {courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-primary">الدرس المطلوب ربط الاختبار به *</label>
                            <select
                              value={genVideoId}
                              onChange={(e) => {
                                const vid = e.target.value;
                                setGenVideoId(vid);
                                const v = videos.find((vObj) => String(vObj.id) === vid);
                                if (v) {
                                  setGenLesson(v.title);
                                  setGenTitle(`اختبار على درس ${v.title}`);
                                  if (v.courseId) setGenCourseId(String(v.courseId));
                                  if (v.stage) setGenStage(v.stage);
                                }
                              }}
                              className="w-full h-10 px-3 rounded-xl border border-primary/40 bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                            >
                              <option value="">-- اختر درس الفيديو --</option>
                              {(genCourseId ? genCourseLessons : videos).map((v) => (
                                <option key={v.id} value={v.id}>
                                  🎥 {v.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Required Video Watch Progress Slider */}
                        <div className="space-y-1 pt-2 border-t border-border/60">
                          <div className="flex justify-between text-xs font-bold">
                            <label className="text-foreground">نسبة مشاهدة الدرس المطلوبة لفتح الاختبار:</label>
                            <span className="text-primary font-black">{genRequiredProgress}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={genRequiredProgress}
                            onChange={(e) => setGenRequiredProgress(Number(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <span className="text-[10px] text-muted-foreground block">
                            {genRequiredProgress === 0
                              ? "يفتح الاختبار للطالب فوراً بدون اشتراط مشاهدة الفيديو"
                              : `يجب على الطالب مشاهدة ${genRequiredProgress}% من مدة الفيديو ليتاح له الدخول على الاختبار`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-muted-foreground">المرحلة *</label>
                          <select
                            value={genStage}
                            onChange={(e) => {
                              setGenStage(e.target.value);
                              setGenUnit("all");
                              setGenLesson("all");
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                          >
                            {availableStages.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-muted-foreground">الوحدة *</label>
                          <select
                            value={genUnit}
                            onChange={(e) => {
                              setGenUnit(e.target.value);
                              setGenLesson("all");
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                          >
                            <option value="all">-- كل الوحدات --</option>
                            {generatorUnits.map((u, i) => (
                              <option key={i} value={u.unit}>
                                {u.unit} ({u.totalQuestions} س)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-primary">الدرس *</label>
                          <select
                            value={genLesson}
                            onChange={(e) => {
                              const les = e.target.value;
                              setGenLesson(les);
                              if (les !== "all") {
                                setGenTitle(`اختبار على (${les})`);
                              }
                            }}
                            className="w-full h-10 px-3 rounded-xl border border-primary/40 bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
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
                    )}
                  </div>
                )}

                {/* If Unit or Stage Scope */}
                {(genScope === "unit" || genScope === "stage") && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">المرحلة الدراسية *</label>
                      <select
                        value={genStage}
                        onChange={(e) => {
                          setGenStage(e.target.value);
                          setGenUnit("all");
                          setGenLesson("all");
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        {availableStages.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    {genScope === "unit" && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">الوحدة المطلوب الامتحان فيها *</label>
                        <select
                          value={genUnit}
                          onChange={(e) => setGenUnit(e.target.value)}
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
                    )}
                  </div>
                )}

                {/* If Multi Lessons Scope */}
                {genScope === "multi_lessons" && (
                  <div className="p-4 bg-card rounded-2xl border border-border/80 space-y-4 shadow-sm">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">المرحلة الدراسية *</label>
                        <select
                          value={genStage}
                          onChange={(e) => {
                            setGenStage(e.target.value);
                            setGenUnit("all");
                            setGenSelectedLessons([]);
                          }}
                          className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                        >
                          {availableStages.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">تصفية حسب الوحدة</label>
                        <select
                          value={genUnit}
                          onChange={(e) => setGenUnit(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                        >
                          <option value="all">-- كل الوحدات في هذه المرحلة --</option>
                          {generatorUnits.map((u, i) => (
                            <option key={i} value={u.unit}>
                              {u.unit} ({u.totalQuestions} س)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground">ربط بكورس (اختياري)</label>
                        <select
                          value={genCourseId}
                          onChange={(e) => setGenCourseId(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                        >
                          <option value="">-- اختبار عام للمرحلة (بدون كورس محدد) --</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Lessons Selection Checkboxes */}
                    <div className="space-y-2 pt-2 border-t border-border/70">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                          <CheckSquare className="h-4 w-4 text-primary" />
                          <span>اختر الدروس التي تريد اشتقاق الامتحان منها (توزيع متوازن):</span>
                          <span className="text-xs font-bold text-primary mr-1">
                            ({genSelectedLessons.length} درس مختار)
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const allLessonsWithQuestions = multiLessonList
                                .filter((l) => l.totalQuestions > 0)
                                .map((l) => l.lesson);
                              setGenSelectedLessons(allLessonsWithQuestions);
                              if (allLessonsWithQuestions.length > 0) {
                                setGenTitle(`اختبار مراجعة على ${allLessonsWithQuestions.length} دروس`);
                              }
                            }}
                            className="text-[11px] font-bold text-primary hover:underline cursor-pointer bg-primary/10 px-2.5 py-1 rounded-lg"
                          >
                            تحديد الدروس المتوفرة
                          </button>
                          <button
                            type="button"
                            onClick={() => setGenSelectedLessons([])}
                            className="text-[11px] font-bold text-muted-foreground hover:underline cursor-pointer bg-muted px-2.5 py-1 rounded-lg"
                          >
                            إلغاء التحديد
                          </button>
                        </div>
                      </div>

                      {multiLessonList.length === 0 ? (
                        <div className="p-4 rounded-xl bg-muted/40 text-center text-xs text-muted-foreground border border-dashed border-border">
                          لا توجد دروس أو أسئلة مسجلة في هذا النطاق
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1">
                          {multiLessonList.map((item, idx) => {
                            const isSelected = genSelectedLessons.includes(item.lesson);
                            const hasQuestions = item.totalQuestions > 0;
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (!hasQuestions) return;
                                  let next: string[];
                                  if (isSelected) {
                                    next = genSelectedLessons.filter((l) => l !== item.lesson);
                                  } else {
                                    next = [...genSelectedLessons, item.lesson];
                                  }
                                  setGenSelectedLessons(next);
                                  if (next.length > 0) {
                                    setGenTitle(`اختبار مراجعة على: ${next.slice(0, 3).join("، ")}${next.length > 3 ? "..." : ""}`);
                                  }
                                }}
                                className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                  !hasQuestions
                                    ? "opacity-50 bg-muted/20 border-border cursor-not-allowed"
                                    : isSelected
                                    ? "bg-primary/10 border-primary shadow-xs font-bold"
                                    : "bg-background border-border/80 hover:bg-muted/50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={!hasQuestions}
                                  readOnly
                                  className="mt-0.5 h-4 w-4 rounded accent-primary pointer-events-none"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold truncate text-foreground text-xs">{item.lesson}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">{item.unit}</div>
                                </div>
                                <div className="text-left shrink-0">
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                                      hasQuestions
                                        ? "bg-primary/15 text-primary"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {item.totalQuestions} س
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>
                          سيتم توليد أسئلة الاختبار بشكل متوازن وعادل من الدروس المختارة دون التقيد بمشاهدة فيديو ودون التأثير على كويزات الدروس الفردية.
                        </span>
                      </p>
                    </div>
                  </div>
                )}

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
                  <span>٢. إعدادات درجات وتوقيت الاختبار:</span>
                </h4>

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
                    <label className="text-xs font-bold text-muted-foreground">عدد الأسئلة المطلوب</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={genCount}
                      onChange={(e) => setGenCount(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                    />
                    <div className="flex gap-1 justify-center pt-1">
                      {[5, 10, 15, 20].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setGenCount(n)}
                          className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-bold hover:bg-muted/80 cursor-pointer"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">الوقت (بالدقائق)</label>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      placeholder="0 = مفتوح"
                      value={genDuration}
                      onChange={(e) => setGenDuration(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                    />
                    <span className="text-[10px] text-muted-foreground block text-center">0 = بدون مؤقت</span>
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
                      min={0}
                      max={20}
                      value={genMaxAttempts}
                      onChange={(e) => setGenMaxAttempts(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                    />
                    <span className="text-[10px] text-muted-foreground block text-center">0 = محاولات مفتوحة</span>
                  </div>
                </div>

                {/* Difficulty Distribution Selector */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-foreground">طريقة اختيار الأسئلة من البنك:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGenDifficultyMode("random")}
                        className={`text-xs px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          genDifficultyMode === "random"
                            ? "bg-violet-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        عشوائي متوازن 🎲
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenDifficultyMode("custom")}
                        className={`text-xs px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          genDifficultyMode === "custom"
                            ? "bg-violet-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        توزيع مخصص بالعدد ⚖️
                      </button>
                    </div>
                  </div>

                  {genDifficultyMode === "custom" && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-2xl border border-border text-center animate-in fade-in">
                      <div>
                        <label className="text-[11px] font-bold text-emerald-600 block mb-1">
                          سهل 🟢 (المتاح: {availableCountInfo.easy})
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
                          متوسط 🟡 (المتاح: {availableCountInfo.medium})
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
                          صعب 🔴 (المتاح: {availableCountInfo.hard})
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
                disabled={isGenerating || !genTitle.trim() || availableCountInfo.total === 0}
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جارٍ سحب الأسئلة وتوليد الاختبار...</span>
                  </>
                ) : availableCountInfo.total === 0 ? (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span>لا توجد أسئلة متوفرة في البنك لهذا النطاق (ارفع أسئلة أولاً)</span>
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
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
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
                  className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer"
                >
                  {savingQuestion ? "جارٍ الحفظ..." : "حفظ السؤال في البنك 💾"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuestionModal(false)}
                  className="h-11 rounded-xl text-xs cursor-pointer"
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
