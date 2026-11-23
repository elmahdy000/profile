import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { BookOpen, Layers, Sparkles, UploadCloud, Plus, Trash2, Edit, CheckCircle2, FileText, Search, Filter, RefreshCw, Eye, HelpCircle, Check, FolderOpen, GraduationCap, Video, Lock, Bot, ClipboardCheck, Download, Printer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GlobalExamsMasterToggle } from "./GlobalExamsMasterToggle";
import { CurriculumUnitModal } from "./curriculum/CurriculumUnitModal";
import { CurriculumLessonModal } from "./curriculum/CurriculumLessonModal";
import { CurriculumQuestionModal } from "./curriculum/CurriculumQuestionModal";
import { CurriculumQuickExamModal } from "./curriculum/CurriculumQuickExamModal";
import { CurriculumExportModal } from "./curriculum/CurriculumExportModal";
import { CurriculumExamsView } from "./curriculum/CurriculumExamsView";
import { CurriculumEssaysView } from "./curriculum/CurriculumEssaysView";
import { ExamStepBuilder } from "./builder/ExamStepBuilder";
import { EditQuestionModal } from "./test-bank/EditQuestionModal";
import {
  StageNode,
  TreeResponse,
  UploadPreset,
  getOptionLabel,
  isEnglishQuestion,
  parseLessonSortOrder,
  parseUnitSortOrder,
} from "./test-bank/types";

export {
  getOptionLabel,
  isEnglishQuestion,
  parseLessonSortOrder,
  parseUnitSortOrder,
} from "./test-bank/types";

const UploadQuestionsTab = lazy(() => import("./test-bank/UploadQuestionsTab"));
const AutoDailyTab = lazy(() => import("./test-bank/AutoDailyTab"));
const QuizReviewModal = lazy(() => import("./test-bank/QuizReviewModal"));
const ExpressExamModal = lazy(() => import("./test-bank/ExpressExamModal"));

export function TestBankTab({
  adminApi,
  onNavigateToQuizzes,
  onNavigateToMemoStudio,
  initialTab = "explorer",
}: {
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onNavigateToQuizzes?: () => void;
  onNavigateToMemoStudio?: () => void;
  initialTab?: "explorer" | "upload" | "generate" | "auto_daily";
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"explorer" | "upload" | "generate" | "auto_daily">(() => {
    if (typeof window !== "undefined") {
      const mode = new URLSearchParams(window.location.search).get("mode");
      if (mode === "generate" || mode === "upload" || mode === "auto_daily" || mode === "explorer") {
        return mode;
      }
    }
    return initialTab;
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const handleUrl = () => {
      if (typeof window !== "undefined") {
        const mode = new URLSearchParams(window.location.search).get("mode");
        if (mode === "generate" || mode === "upload" || mode === "auto_daily" || mode === "explorer") {
          setActiveTab(mode);
        }
      }
    };
    window.addEventListener("popstate", handleUrl);
    return () => window.removeEventListener("popstate", handleUrl);
  }, []);

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
  const [onlyAssessmentFilter, setOnlyAssessmentFilter] = useState<boolean>(false);
  const [onlyWithImageFilter, setOnlyWithImageFilter] = useState<boolean>(false);
  const [questionsPage, setQuestionsPage] = useState<number>(1);
  const [treeCollapsed, setTreeCollapsed] = useState<boolean>(false);

  // Question Edit/Create Modal
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState<boolean>(false);
  const [savingQuestion, setSavingQuestion] = useState<boolean>(false);

  // Curriculum Modals & Workspace State
  const [showUnitModal, setShowUnitModal] = useState<boolean>(false);
  const [unitModalMode, setUnitModalMode] = useState<"add" | "rename">("add");
  const [targetUnitName, setTargetUnitName] = useState<string>("");

  const [showLessonModal, setShowLessonModal] = useState<boolean>(false);
  const [lessonModalMode, setLessonModalMode] = useState<"add" | "rename">("add");
  const [targetLessonData, setTargetLessonData] = useState<{ unit: string; lesson: string; videoId?: number | null } | null>(null);

  const [showCurriculumQuestionModal, setShowCurriculumQuestionModal] = useState<boolean>(false);
  const [curriculumQuestionMode, setCurriculumQuestionMode] = useState<"add" | "edit">("add");
  const [curriculumQuestionData, setCurriculumQuestionData] = useState<any | null>(null);

  const [showQuickExamModal, setShowQuickExamModal] = useState<boolean>(false);
  const [quickExamModalMode, setQuickExamModalMode] = useState<"exam" | "homework">("exam");
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportModalTarget, setExportModalTarget] = useState<{ unit: string; lesson: string }>({ unit: "", lesson: "" });
  const [typeFilter, setTypeFilter] = useState<"all" | "mcq" | "true_false">("all");
  const [lessonWorkspaceTab, setLessonWorkspaceTab] = useState<"mcq" | "essays" | "quizzes">("mcq");


  // Preset passed to UploadQuestionsTab when triggered from Explorer
  const [uploadPreset, setUploadPreset] = useState<UploadPreset | null>(null);
  const [showExpressExamModal, setShowExpressExamModal] = useState<boolean>(false);

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
  const [isTitleCustomized, setIsTitleCustomized] = useState<boolean>(false);
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
  const [genPublishMode, setGenPublishMode] = useState<"draft" | "publish">("draft");
  const [reviewingQuiz, setReviewingQuiz] = useState<any | null>(null);

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
      if (!genStage || !availableStages.includes(genStage)) {
        setGenStage(availableStages[0]);
      }
    }
  }, [availableStages]);

  // Current Stage Object in Explorer
  const currentStageNode = useMemo(() => {
    return treeData.find((s) => s.stage === selectedStage) || null;
  }, [treeData, selectedStage]);

  // Load questions for selected lesson or entire unit
  const loadQuestions = async (stage: string, unit: string, lesson: string) => {
    if (!stage || !unit) return;
    setLoadingQuestions(true);
    try {
      const params = new URLSearchParams({ stage, unit });
      if (lesson && lesson !== "all") {
        params.append("lesson", lesson);
      }
      const res = await adminApi<any[]>(`/api/admin/learning/test-bank/questions?${params.toString()}`);
      // Exclude essay rows from the MCQ/True-False list (essays have their own dedicated tab)
      const mcqOnly = (res || []).filter(
        (r) => !String(r?.id ?? "").startsWith("essay-") && String(r?.type || "").toUpperCase() !== "ESSAY",
      );
      setLessonQuestions(mcqOnly);
      setQuestionsPage(1);
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

  const handleDeleteUnit = async (stage: string, unit: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الوحدة (${unit}) بالكامل؟ سيتم حذف جميع أسئلتها ودروسها التابعة.`)) return;
    try {
      await adminApi("/api/admin/learning/curriculum/delete-unit", {
        method: "DELETE",
        body: JSON.stringify({ stage, unit }),
      });
      toast({ title: `تم حذف الوحدة (${unit}) بنجاح 🗑️` });
      if (selectedUnit === unit) {
        setSelectedUnit("");
        setSelectedLesson("");
        setLessonQuestions([]);
      }
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر حذف الوحدة" });
    }
  };

  const handleDeleteLesson = async (stage: string, unit: string, lesson: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الدرس (${lesson})؟ سيتم حذف جميع أسئلته التابعة.`)) return;
    try {
      await adminApi("/api/admin/learning/curriculum/delete-lesson", {
        method: "DELETE",
        body: JSON.stringify({ stage, unit, lesson }),
      });
      toast({ title: `تم حذف الدرس (${lesson}) بنجاح 🗑️` });
      if (selectedLesson === lesson) {
        setSelectedLesson("");
        setLessonQuestions([]);
      }
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", title: "حصلت مشكلة", description: err.message || "تعذر حذف الدرس" });
    }
  };

  // Filtered questions in explorer
  const filteredQuestions = useMemo(() => {
    return lessonQuestions.filter((q) => {
      const qData = q.question || {};
      // Type Filter (All, MCQ, True/False)
      if (typeFilter !== "all") {
        const isTf =
          q.questionType === "true_false" ||
          qData.questionType === "true_false" ||
          (Array.isArray(qData.options) && qData.options.length === 2);
        if (typeFilter === "true_false" && !isTf) return false;
        if (typeFilter === "mcq" && isTf) return false;
      }
      if (diffFilter !== "all" && q.difficulty !== diffFilter) return false;
      if (onlyAssessmentFilter) {
        const tagsArr: string[] = Array.isArray(q.tags) ? q.tags : Array.isArray(qData.tags) ? qData.tags : [];
        const isAssessment = Boolean(
          q.isAssessment ||
            qData.isAssessment ||
            tagsArr.some((t) => String(t).includes("تقييم") || String(t).toLowerCase().includes("assessment") || String(t).includes("وزارة")),
        );
        if (!isAssessment) return false;
      }
      if (onlyWithImageFilter) {
        const hasImg = Boolean(q.imageUrl || qData.imageUrl);
        if (!hasImg) return false;
      }
      if (searchQuery.trim()) {
        const p = (qData.prompt || "").toLowerCase();
        const o = (qData.options || []).join(" ").toLowerCase();
        const s = searchQuery.toLowerCase();
        return p.includes(s) || o.includes(s);
      }
      return true;
    });
  }, [lessonQuestions, typeFilter, diffFilter, onlyAssessmentFilter, onlyWithImageFilter, searchQuery]);

  const QUESTIONS_PER_PAGE = 25;
  const totalQuestionPages = Math.max(1, Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE));
  const safeQuestionsPage = Math.min(questionsPage, totalQuestionPages);
  const paginatedQuestions = useMemo(() => {
    const start = (safeQuestionsPage - 1) * QUESTIONS_PER_PAGE;
    return filteredQuestions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [filteredQuestions, safeQuestionsPage]);

  useEffect(() => {
    setQuestionsPage(1);
  }, [searchQuery, diffFilter, typeFilter, onlyAssessmentFilter, onlyWithImageFilter, selectedUnit, selectedLesson]);

  // Clear entire lesson questions or entire unit
  const handleClearLesson = async () => {
    if (!selectedStage || !selectedUnit || !selectedLesson) return;
    const isAll = selectedLesson === "all";
    const confirmMsg = isAll
      ? `هل أنت متأكد من تفريغ وحذف جميع أسئلة الوحدة بالكامل (${selectedUnit})؟ لا يمكن التراجع.`
      : `هل أنت متأكد من تفريغ وحذف جميع أسئلة (${selectedLesson})؟ لا يمكن التراجع.`;
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
      toast({ title: isAll ? `تم تفريغ جميع أسئلة الوحدة (${selectedUnit}) بنجاح` : `تم تفريغ أسئلة (${selectedLesson}) بنجاح` });
      setLessonQuestions([]);
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حذف أسئلة الدرس" });
    }
  };

  // Export questions as JSON for Unit or Lesson
  const [exportingTarget, setExportingTarget] = useState<string | null>(null);

  const handleExportQuestionsJson = async (unit: string, lesson?: string) => {
    if (!selectedStage || !unit) return;
    const targetKey = `${unit}_${lesson || "all"}`;
    setExportingTarget(targetKey);
    try {
      const params = new URLSearchParams({
        stage: selectedStage,
        unit,
      });
      if (lesson && lesson !== "all") {
        params.set("lesson", lesson);
      }
      const data = await adminApi<any>(`/api/admin/learning/curriculum/export-json?${params.toString()}`);

      const cleanUnitName = unit.replace(/[\\/:*?"<>|]/g, "_");
      const cleanLessonName = lesson && lesson !== "all" ? lesson.replace(/[\\/:*?"<>|]/g, "_") : "";
      const fileName = cleanLessonName
        ? `questions_${cleanLessonName}.json`
        : `questions_${cleanUnitName}.json`;

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const count = data.summary?.totalQuestions ?? data.allQuestions?.length ?? 0;
      toast({
        title: "تم تصدير الأسئلة بنجاح 📥",
        description: `تم حفظ ${count} سؤال بصيغة JSON لملف: ${fileName}`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err.message || "تعذر تصدير الأسئلة بصيغة JSON",
      });
    } finally {
      setExportingTarget(null);
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
        isPublished: genPublishMode === "publish",
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
      if (genPublishMode === "publish") {
        toast({ title: `تم توليد ونشر الاختبار (${created.title}) للطلاب بنجاح! 🚀` });
      } else {
        toast({ title: `تم توليد الاختبار (${created.title}) كمسودة للمراجعة (غير ظاهر للطلاب)! 📝` });
      }
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر توليد الاختبار من البنك" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Publish / Unpublish a Quiz
  const handlePublishQuiz = async (quizId: number, publish: boolean) => {
    try {
      const updated = await adminApi<any>(`/api/admin/learning/quizzes/${quizId}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: publish }),
      });
      toast({
        title: publish
          ? `تم نشر الاختبار للطلاب بنجاح! 🚀`
          : `تم حفظ الاختبار كمسودة وإخفاؤه عن الطلاب 🔒`,
      });
      if (generatedQuizSuccess && generatedQuizSuccess.id === quizId) {
        setGeneratedQuizSuccess({ ...generatedQuizSuccess, isPublished: publish });
      }
      if (reviewingQuiz && reviewingQuiz.id === quizId) {
        setReviewingQuiz({ ...reviewingQuiz, isPublished: publish });
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر تحديث حالة الاختبار" });
    }
  };

  // Lessons list for currently selected course in Generator Tab
  const genCourseLessons = useMemo(() => {
    if (!genCourseId) return [];
    return videos.filter((v) => String(v.courseId) === String(genCourseId));
  }, [videos, genCourseId]);

  // Units list for currently selected generator stage
  const generatorUnits = useMemo(() => {
    const st = treeData.find((s) => s.stage === genStage);
    return st
      ? st.units.slice().sort((a, b) => parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit))
      : [];
  }, [treeData, genStage]);

  // Lessons list for currently selected generator unit
  const generatorLessons = useMemo(() => {
    if (genUnit === "all") return [];
    const u = generatorUnits.find((unit) => unit.unit === genUnit);
    return u
      ? u.lessons.slice().sort((a, b) => parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson))
      : [];
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
    const sortedUnits = st.units.slice().sort((a, b) => parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit));
    for (const u of sortedUnits) {
      if (genUnit !== "all" && u.unit !== genUnit) continue;
      const sortedLessons = u.lessons.slice().sort((a, b) => parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson));
      for (const l of sortedLessons) {
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
      {/* Compact Modern Header Banner (Flat Solid Surface) */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 dark:bg-[#0D1626] p-4 sm:p-5 text-white shadow-sm border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>بنك الأسئلة والمولد الذكي</span>
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-black text-emerald-300 border border-emerald-500/30 font-mono tabular-nums">
                {totalQuestions.toLocaleString("en-US")} سؤال
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-300 border border-sky-500/30 font-mono tabular-nums">
                {treeData.length} مراحل
              </span>
            </div>
            <p className="text-xs text-slate-300/85 max-w-2xl">
              استعراض وتعديل الأسئلة حسب المرحلة والوحدة والدرس، استيراد الملفات، وتوليد الامتحانات الذكية.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => setShowExpressExamModal(true)}
              size="sm"
              className="h-9 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shadow-sm cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5 ml-1.5 fill-slate-950" />
              امتحان سريع
            </Button>
            <Button
              type="button"
              onClick={loadTree}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ml-1.5 ${loadingTree ? "animate-spin" : ""}`} />
              تحديث البنك
            </Button>
          </div>
        </div>
      </div>

      {/* GLOBAL MASTER EXAMS TOGGLE */}
      <GlobalExamsMasterToggle adminApi={adminApi} />

      {/* Clean Segmented Sub-Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-border bg-card rounded-2xl p-1 shadow-2xs gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("explorer")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "explorer"
              ? "bg-primary text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4 shrink-0" />
          <span className="truncate">استعراض البنك</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "upload"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <UploadCloud className="h-4 w-4 shrink-0" />
          <span className="truncate">رفع واستيراد أسئلة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("generate")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "generate"
              ? "bg-violet-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="truncate">مولد الامتحانات الذكي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("auto_daily")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "auto_daily"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <Bot className="h-4 w-4 shrink-0" />
          <span className="truncate">التوليد اليومي الآلي</span>
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
          <div className="grid gap-5 lg:grid-cols-12 items-start">
            {/* Right/Sidebar (RTL): Collapsible Units & Lessons Tree */}
            {!treeCollapsed && (
              <div className="lg:col-span-4 space-y-3 lg:sticky lg:top-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <span>الوحدات والدروس ({currentStageNode?.units.length || 0})</span>
                </h3>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setUnitModalMode("add");
                      setTargetUnitName("");
                      setShowUnitModal(true);
                    }}
                    className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> وحدة جديدة
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLessonModalMode("add");
                      setTargetLessonData(null);
                      setShowLessonModal(true);
                    }}
                    className="h-8 text-xs font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50 cursor-pointer gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> درس جديد
                  </Button>
                </div>
              </div>

              {!currentStageNode || currentStageNode.units.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-3">
                  <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="text-xs font-bold text-muted-foreground">
                    لا توجد وحدات أو دروس مضافة حتى الآن في ({selectedStage})
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setUnitModalMode("add");
                        setTargetUnitName("");
                        setShowUnitModal(true);
                      }}
                      className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-9 cursor-pointer gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> إنشاء أول وحدة الآن
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setUploadPreset({ stage: selectedStage, nonce: Date.now() });
                        setActiveTab("upload");
                      }}
                      className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs font-bold h-9 cursor-pointer"
                    >
                      <UploadCloud className="h-3.5 w-3.5 ml-1.5" /> رفع من ملف
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {(currentStageNode.units || []).slice().sort((a, b) => parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit)).map((unitObj, uIdx) => (
                    <div
                      key={uIdx}
                      className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs"
                    >
                      <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-black">
                            {uIdx + 1}
                          </span>
                          <span className="text-xs font-black text-foreground truncate">{unitObj.unit}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {unitObj.totalQuestions} سؤال
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLessonModalMode("add");
                              setTargetLessonData({ unit: unitObj.unit, lesson: "" });
                              setShowLessonModal(true);
                            }}
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            title="إضافة درس لهذه الوحدة"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUnitModalMode("rename");
                              setTargetUnitName(unitObj.unit);
                              setShowUnitModal(true);
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="تعديل اسم الوحدة"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExportModalTarget({ unit: unitObj.unit, lesson: "all" });
                              setShowExportModal(true);
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer"
                            title="تصدير جميع أسئلة الوحدة"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUnit(selectedStage, unitObj.unit);
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="حذف الوحدة"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2 space-y-1">
                        {/* Unit-wide all questions button */}
                        <button
                          type="button"
                          onClick={() => handleSelectLesson(unitObj.unit, "all")}
                          className={`w-full text-right p-2.5 rounded-xl text-xs font-black flex items-center justify-between transition-all cursor-pointer border mb-1.5 ${
                            selectedUnit === unitObj.unit && selectedLesson === "all"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FolderOpen className="h-4 w-4 shrink-0 text-current" />
                            <span className="truncate">شامل الوحدة (جميع الأسئلة)</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              selectedUnit === unitObj.unit && selectedLesson === "all"
                                ? "bg-white/20 text-white"
                                : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold"
                            }`}
                          >
                            {unitObj.totalQuestions} سؤال
                          </span>
                        </button>

                        {(unitObj.lessons || []).slice().sort((a, b) => parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson)).map((lessonObj, lIdx) => {
                          const isSelected =
                            selectedUnit === unitObj.unit && selectedLesson === lessonObj.lesson;
                          return (
                            <div
                              key={lIdx}
                              className={`group w-full p-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all border ${
                                isSelected
                                  ? "bg-primary text-white border-primary shadow-xs"
                                  : "border-transparent hover:bg-muted/70 text-foreground"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSelectLesson(unitObj.unit, lessonObj.lesson)}
                                className="flex items-center gap-2 min-w-0 flex-1 text-right cursor-pointer py-1 px-1.5"
                              >
                                <span className="truncate">{lessonObj.lesson}</span>
                              </button>
                              <div className="flex items-center gap-1 shrink-0 text-[10px]">
                                {lessonObj.lessonId && (
                                  <span title="مرتبط بفيديو" className="inline-flex items-center">
                                    <Video className={`h-3 w-3 ${isSelected ? "text-white" : "text-primary"}`} />
                                  </span>
                                )}
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-muted text-muted-foreground font-extrabold"
                                  }`}
                                >
                                  {lessonObj.totalQuestions}
                                </span>
                                <div className="hidden group-hover:flex group-focus-within:flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLessonModalMode("rename");
                                      setTargetLessonData({
                                        unit: unitObj.unit,
                                        lesson: lessonObj.lesson,
                                        videoId: lessonObj.lessonId,
                                      });
                                      setShowLessonModal(true);
                                    }}
                                    className={`p-1 rounded hover:bg-black/10 transition-colors cursor-pointer ${
                                      isSelected ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title="تعديل الدرس"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExportModalTarget({ unit: unitObj.unit, lesson: lessonObj.lesson });
                                      setShowExportModal(true);
                                    }}
                                    className={`p-1 rounded hover:bg-blue-500/10 transition-colors cursor-pointer ${
                                      isSelected ? "text-white/85 hover:text-blue-200" : "text-muted-foreground hover:text-blue-600"
                                    }`}
                                    title="تصدير أسئلة هذا الدرس"
                                  >
                                    <Download className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteLesson(selectedStage, unitObj.unit, lessonObj.lesson);
                                    }}
                                    className={`p-1 rounded hover:bg-rose-500/20 transition-colors cursor-pointer ${
                                      isSelected ? "text-white/85 hover:text-rose-200" : "text-muted-foreground hover:text-rose-500"
                                    }`}
                                    title="حذف الدرس"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}

            {/* Left (RTL): Selected Lesson Questions Viewer (Expands to 12 cols when tree collapsed) */}
            <div className={`${treeCollapsed ? "lg:col-span-12" : "lg:col-span-8"} space-y-4 transition-all`}>
              {selectedLesson ? (
                <>
                  {/* Lesson Header Actions */}
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-bold">
                          <button
                            type="button"
                            onClick={() => setTreeCollapsed((c) => !c)}
                            className="hidden lg:inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-black text-foreground hover:bg-muted transition cursor-pointer"
                            title={treeCollapsed ? "إظهار شجرة الدروس" : "توسيع مساحة الأسئلة"}
                          >
                            <Layers className="h-3 w-3 text-primary" />
                            <span>{treeCollapsed ? "إظهار الشجرة" : "توسيع العرض"}</span>
                          </button>
                          <span className="truncate">{selectedStage} • {selectedUnit}</span>
                        </div>
                        <h4 className="text-base font-black text-foreground flex items-center gap-2 mt-1">
                          {selectedLesson === "all" ? (
                            <>
                              <FolderOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="truncate">كل أسئلة الوحدة: {selectedUnit}</span>
                            </>
                          ) : (
                            <>
                              <Video className="h-4 w-4 text-primary shrink-0" />
                              <span className="truncate">{selectedLesson}</span>
                            </>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground font-semibold">
                          <span>الإجمالي: <strong className="font-mono text-foreground">{lessonQuestions.length}</strong> سؤال</span>
                          {filteredQuestions.length !== lessonQuestions.length && (
                            <>
                              <span>•</span>
                              <span className="text-primary">المطابق للفلتر: <strong className="font-mono">{filteredQuestions.length}</strong></span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <Button
                        type="button"
                        onClick={() => {
                          setCurriculumQuestionMode("add");
                          setCurriculumQuestionData(null);
                          setShowCurriculumQuestionModal(true);
                        }}
                        className="bg-primary hover:bg-primary/90 text-white text-xs font-bold h-9 cursor-pointer gap-1 shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> إضافة سؤال يدوي
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setQuickExamModalMode("exam");
                          setShowQuickExamModal(true);
                        }}
                        className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold h-9 cursor-pointer gap-1 shadow-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> عمل امتحان منه
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setQuickExamModalMode("homework");
                          setShowQuickExamModal(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 cursor-pointer gap-1 shadow-xs"
                      >
                        <BookOpen className="h-3.5 w-3.5" /> إسناد واجب منه 📚
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const v = selectedLesson !== "all"
                            ? videos.find((vid) => vid.title.trim() === selectedLesson.trim())
                            : undefined;
                          setUploadPreset({
                            stage: selectedStage,
                            unit: selectedUnit,
                            scope: selectedLesson === "all" ? "unit" : "lesson",
                            lesson: selectedLesson === "all" ? "شامل الوحدة" : selectedLesson,
                            courseId: v ? String(v.courseId) : "",
                            lessonId: v ? String(v.id) : "",
                            nonce: Date.now(),
                          });
                          setActiveTab("upload");
                        }}
                        title={selectedLesson === "all" ? "رفع المزيد من الأسئلة لهذه الوحدة" : "رفع المزيد من الأسئلة لهذا الدرس"}
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-9 px-2.5 text-xs font-bold cursor-pointer"
                      >
                        <UploadCloud className="h-4 w-4 ml-1" /> رفع المزيد
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setExportModalTarget({ unit: selectedUnit, lesson: selectedLesson });
                          setShowExportModal(true);
                        }}
                        title={selectedLesson === "all" ? "تصدير جميع أسئلة الوحدة (نماذج وورد / طلاب / JSON)" : "تصدير جميع أسئلة هذا الدرس (نماذج وورد / طلاب / JSON)"}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 h-9 px-2.5 text-xs font-bold cursor-pointer gap-1"
                      >
                        <Download className="h-4 w-4" />
                        <span>تصدير الأسئلة</span>
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
                  </div>

                  {/* Workspace Tabs: MCQ, Essays, Quizzes */}
                  <div className="flex items-center gap-2 border-b border-border/80 pb-2">
                    <button
                      type="button"
                      onClick={() => setLessonWorkspaceTab("mcq")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        lessonWorkspaceTab === "mcq"
                          ? "bg-primary text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>الأسئلة الاختيارية والصح/خطأ ({lessonQuestions.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLessonWorkspaceTab("essays")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        lessonWorkspaceTab === "essays"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>الأسئلة المقالية</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLessonWorkspaceTab("quizzes")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        lessonWorkspaceTab === "quizzes"
                          ? "bg-violet-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      <span>الامتحانات المرتبطة بهذا الدرس</span>
                    </button>
                  </div>

                  {lessonWorkspaceTab === "essays" ? (
                    <CurriculumEssaysView
                      stage={selectedStage}
                      unit={selectedUnit}
                      lesson={selectedLesson}
                      adminApi={adminApi}
                      onAddEssayClick={() => {
                        setCurriculumQuestionMode("add");
                        setCurriculumQuestionData({ modelAnswer: "" });
                        setShowCurriculumQuestionModal(true);
                      }}
                      onEditEssayClick={(essay) => {
                        setCurriculumQuestionMode("edit");
                        setCurriculumQuestionData(essay);
                        setShowCurriculumQuestionModal(true);
                      }}
                    />
                  ) : lessonWorkspaceTab === "quizzes" ? (
                    <CurriculumExamsView
                      stage={selectedStage}
                      unit={selectedUnit}
                      lesson={selectedLesson}
                      adminApi={adminApi}
                      onCreateExamClick={() => setShowQuickExamModal(true)}
                      onReviewQuiz={(quiz) => setReviewingQuiz(quiz)}
                    />
                  ) : (
                    <>
                  {/* Filters & Search Bar */}
                  <div className="space-y-2.5 rounded-2xl border border-border bg-card p-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="ابحث في نص السؤال أو الخيارات..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full h-9 pr-9 pl-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="all">كل الأنواع</option>
                        <option value="mcq">اختيار من متعدد (MCQ)</option>
                        <option value="true_false">صواب وخطأ (T/F)</option>
                      </select>

                      <select
                        value={diffFilter}
                        onChange={(e) => setDiffFilter(e.target.value)}
                        className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="all">كل الصعوبات</option>
                        <option value="easy">سهل</option>
                        <option value="medium">متوسط</option>
                        <option value="hard">صعب</option>
                      </select>
                    </div>

                    {/* Quick Toggle Filter Chips + Pagination Summary */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOnlyAssessmentFilter((v) => !v)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                            onlyAssessmentFilter
                              ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          أسئلة التقييمات فقط
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnlyWithImageFilter((v) => !v)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                            onlyWithImageFilter
                              ? "border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          الأسئلة المصورة فقط
                        </button>
                        {(searchQuery || typeFilter !== "all" || diffFilter !== "all" || onlyAssessmentFilter || onlyWithImageFilter) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setTypeFilter("all");
                              setDiffFilter("all");
                              setOnlyAssessmentFilter(false);
                              setOnlyWithImageFilter(false);
                            }}
                            className="rounded-lg px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            مسح الفلاتر
                          </button>
                        )}
                      </div>

                      {filteredQuestions.length > 0 && (
                        <span className="text-[11px] font-bold text-muted-foreground font-mono">
                          عرض {(safeQuestionsPage - 1) * QUESTIONS_PER_PAGE + 1}–{Math.min(safeQuestionsPage * QUESTIONS_PER_PAGE, filteredQuestions.length)} من {filteredQuestions.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Questions List (Natural Page Scroll + Paginated 25/page for silky speed) */}
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
                    <>
                    <div className="space-y-3">
                      {paginatedQuestions.map((q, pageIdx) => {
                        const qIndex = (safeQuestionsPage - 1) * QUESTIONS_PER_PAGE + pageIdx;
                        const questionData = q.question || {};
                        const isEnglish = isEnglishQuestion(questionData.prompt, questionData.options);
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
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                    isEnglish
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  }`}
                                >
                                  {isEnglish ? "EN (LTR)" : "عربي (RTL)"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold">
                                  {q.points || 1} درجة
                                </span>
                                {Boolean(
                                  q.questionType === "true_false" ||
                                  questionData.questionType === "true_false" ||
                                  (Array.isArray(questionData.options) && questionData.options.length === 2)
                                ) ? (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                                    صواب / خطأ
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                                    اختيار من متعدد
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurriculumQuestionMode("edit");
                                    setCurriculumQuestionData(q);
                                    setShowCurriculumQuestionModal(true);
                                  }}
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

                            <p
                              dir={isEnglish ? "ltr" : "rtl"}
                              className={`text-xs font-bold text-foreground leading-relaxed whitespace-pre-line ${
                                isEnglish ? "text-left font-sans" : "text-right font-sans"
                              }`}
                            >
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1" dir={isEnglish ? "ltr" : "rtl"}>
                              {(questionData.options || []).map((opt: string, optIdx: number) => {
                                const isCorrect = optIdx === questionData.correctIndex;
                                const letter = getOptionLabel(optIdx, isEnglish);
                                return (
                                  <div
                                    key={optIdx}
                                    dir={isEnglish ? "ltr" : "rtl"}
                                    className={`p-2 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                                      isCorrect
                                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold"
                                        : "bg-muted/40 border-border text-foreground"
                                    }`}
                                  >
                                    <span
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black mt-0.5 ${
                                        isCorrect
                                          ? "bg-emerald-600 text-white"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {letter}
                                    </span>
                                    <span className={`flex-1 whitespace-normal break-words leading-relaxed ${isEnglish ? "text-left font-sans font-medium" : "text-right font-medium"}`}>
                                      {opt}
                                    </span>
                                    {isCorrect && (
                                      <Check className={`h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5 ${isEnglish ? "ml-auto" : "mr-auto"}`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation / Notes */}
                            {questionData.explanation && (
                              <div
                                dir={isEnglish ? "ltr" : "rtl"}
                                className={`p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-primary space-y-0.5 ${
                                  isEnglish ? "text-left font-sans" : "text-right font-sans"
                                }`}
                              >
                                <span className="font-bold block">
                                  {isEnglish ? "Explanation / Steps:" : "التفسير / خطوات الإجابة:"}
                                </span>
                                <p className="text-foreground">{questionData.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Clean Pagination Controls */}
                    {totalQuestionPages > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-xs shadow-2xs">
                        <span className="font-bold text-muted-foreground">
                          صفحة <strong className="font-mono text-foreground">{safeQuestionsPage}</strong> من <strong className="font-mono text-foreground">{totalQuestionPages}</strong> ({filteredQuestions.length} سؤال)
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={safeQuestionsPage <= 1}
                            onClick={() => {
                              setQuestionsPage((p) => Math.max(1, p - 1));
                              window.scrollTo({ top: 180, behavior: "smooth" });
                            }}
                            className="h-8 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            السابق
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={safeQuestionsPage >= totalQuestionPages}
                            onClick={() => {
                              setQuestionsPage((p) => Math.min(totalQuestionPages, p + 1));
                              window.scrollTo({ top: 180, behavior: "smooth" });
                            }}
                            className="h-8 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            التالي
                          </Button>
                        </div>
                      </div>
                    )}
                    </>
                  )}
                  </>
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
      {/* TAB 2: UPLOAD TEST BANK QUESTIONS TO A LESSON (Lazy)         */}
      {/* ============================================================ */}
      {activeTab === "upload" && (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-xs font-bold text-muted-foreground">
              جارٍ تحميل معالج استيراد الأسئلة...
            </div>
          }
        >
          <UploadQuestionsTab
            adminApi={adminApi}
            treeData={treeData}
            availableStages={availableStages}
            courses={courses}
            videos={videos}
            selectedStage={selectedStage}
            uploadPreset={uploadPreset}
            loadTree={loadTree}
            onQuizCreated={(quiz) => setGeneratedQuizSuccess(quiz)}
            onOpenGeneratorForLesson={(target) => {
              setGenStage(target.stage);
              setGenUnit(target.unit);
              setGenLesson(target.lesson);
              setIsTitleCustomized(false);
              setGenTitle(`اختبار على درس ${target.lesson}`);
              setGenScope("lesson");
              if (target.lessonId) {
                setGenVideoId(target.lessonId);
              }
              setActiveTab("generate");
            }}
          />
        </Suspense>
      )}

      {/* ============================================================ */}
      {/* TAB 3: EXAM GENERATOR FROM TEST BANK                         */}
      {/* ============================================================ */}
      {activeTab === "generate" && (
        <div className="space-y-6">
          {generatedQuizSuccess ? (
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 text-center space-y-5 shadow-sm animate-in fade-in">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600">
                <Sparkles className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border">
                  {generatedQuizSuccess.isPublished ? (
                    <span className="text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      منشور وظاهر للطلاب حالياً 🟢
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-300 font-extrabold flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      محفوظ كمسودة 🔒 (غير ظاهر للطلاب - بانتظار مراجعتك)
                    </span>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-black text-foreground">
                  تم إنشاء الاختبار: {generatedQuizSuccess.title}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {generatedQuizSuccess.isPublished
                    ? `تم توليد ${generatedQuizSuccess.questions?.length || generatedQuizSuccess.actualCount} سؤالاً، والاختبار متاح للطلاب الآن.`
                    : `تم سحب ${generatedQuizSuccess.questions?.length || generatedQuizSuccess.actualCount} سؤالاً بنجاح وحفظها كمسودة. يمكنك الآن مراجعة وتعديل الأسئلة بدقة قبل نشرها للطلاب.`}
                </p>
                {generatedQuizSuccess.note && (
                  <p className="text-xs text-amber-600 font-bold mt-1">
                    ℹ️ {generatedQuizSuccess.note}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setReviewingQuiz(generatedQuizSuccess)}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold h-11 px-5 shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" /> مراجعة وتعديل أسئلة الاختبار 🔍
                </Button>

                {!generatedQuizSuccess.isPublished ? (
                  <Button
                    type="button"
                    onClick={() => handlePublishQuiz(generatedQuizSuccess.id, true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-11 px-5 shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> نشر الاختبار للطلاب الآن 🚀
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePublishQuiz(generatedQuizSuccess.id, false)}
                    className="text-xs font-bold h-11 px-5 cursor-pointer flex items-center gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                  >
                    <Lock className="h-3.5 w-3.5" /> تحويل لمسودة (إخفاء عن الطلاب) 🔒
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("memo_studio_import_quiz", JSON.stringify(generatedQuizSuccess));
                      if (onNavigateToMemoStudio) {
                        onNavigateToMemoStudio();
                      } else {
                        window.location.href = "/admin/memo-studio";
                      }
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold h-11 px-5 shadow-md cursor-pointer flex items-center gap-2 border border-slate-700"
                >
                  <Printer className="h-4 w-4 text-emerald-400" /> طباعة ورقة امتحان A4 للسنتر (طالب ومعلم) 🖨️
                </Button>

                {onNavigateToQuizzes && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onNavigateToQuizzes}
                    className="text-xs font-bold h-11 px-5 cursor-pointer"
                  >
                    الانتقال لقائمة الاختبارات 📋
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setGeneratedQuizSuccess(null)}
                  className="text-xs font-bold h-11 px-4 cursor-pointer text-muted-foreground"
                >
                  <Plus className="h-4 w-4 ml-1" /> توليد اختبار آخر
                </Button>
              </div>
            </div>
          ) : (
            <ExamStepBuilder
              adminApi={adminApi}
              treeData={treeData}
              initialStage={selectedStage}
              onExamCreated={(quiz) => {
                setGeneratedQuizSuccess(quiz);
                loadTree();
              }}
              onNavigateToQuizzes={onNavigateToQuizzes}
            />
          )}
        </div>
      )}


      {/* ============================================================ */}
      {/* TAB 4: MULTI-SCHEDULE DAILY AUTO-EXAM (Lazy)                 */}
      {/* ============================================================ */}
      {activeTab === "auto_daily" && (
        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-xs font-bold text-muted-foreground">
              جارٍ تحميل جداول الامتحانات اليومية...
            </div>
          }
        >
          <AutoDailyTab
            adminApi={adminApi}
            treeData={treeData}
            availableStages={availableStages}
            loadTree={loadTree}
            onReviewQuiz={(quiz) => setReviewingQuiz(quiz)}
          />
        </Suspense>
      )}

      {/* ============================================================ */}
      {/* EDIT / CREATE QUESTION MODAL                                 */}
      {/* ============================================================ */}
      <EditQuestionModal
        isOpen={showQuestionModal}
        editingQuestion={editingQuestion}
        setEditingQuestion={setEditingQuestion}
        savingQuestion={savingQuestion}
        onClose={() => setShowQuestionModal(false)}
        onSave={handleSaveQuestion}
      />

      {/* ============================================================ */}
      {/* REVIEW QUIZ & CANDIDATE PICKER MODALS (Lazy)                 */}
      {/* ============================================================ */}
      {reviewingQuiz && (
        <Suspense fallback={null}>
          <QuizReviewModal
            adminApi={adminApi}
            reviewingQuiz={reviewingQuiz}
            setReviewingQuiz={setReviewingQuiz}
            onPublishQuiz={handlePublishQuiz}
            onQuizUpdated={(updated) => {
              if (generatedQuizSuccess && generatedQuizSuccess.id === updated.id) {
                setGeneratedQuizSuccess(updated);
              }
            }}
          />
        </Suspense>
      )}

      {/* ── Express Instant Exam Modal (Lazy) ── */}
      {showExpressExamModal && (
        <Suspense fallback={null}>
          <ExpressExamModal
            isOpen={showExpressExamModal}
            onClose={() => setShowExpressExamModal(false)}
            adminApi={adminApi}
            treeData={treeData}
            initialStage={selectedStage}
            initialUnit={selectedUnit || undefined}
            initialLesson={selectedLesson || undefined}
            onCreated={(quiz) => {
              setGeneratedQuizSuccess(quiz);
              loadTree();
            }}
          />
        </Suspense>
      )}

      {/* ── Curriculum Studio Modals ── */}
      <CurriculumUnitModal
        isOpen={showUnitModal}
        onClose={() => setShowUnitModal(false)}
        mode={unitModalMode}
        initialStage={selectedStage || availableStages[0]}
        initialUnit={targetUnitName}
        availableStages={availableStages}
        adminApi={adminApi}
        onSuccess={(u) => {
          setSelectedUnit(u);
          loadTree();
        }}
      />

      <CurriculumLessonModal
        isOpen={showLessonModal}
        onClose={() => setShowLessonModal(false)}
        mode={lessonModalMode}
        initialStage={selectedStage || availableStages[0]}
        initialUnit={targetLessonData?.unit || selectedUnit || (currentStageNode?.units[0]?.unit || "")}
        initialLesson={targetLessonData?.lesson || ""}
        initialVideoId={targetLessonData?.videoId}
        availableStages={availableStages}
        availableUnits={(currentStageNode?.units || []).map((u) => u.unit)}
        videos={videos}
        adminApi={adminApi}
        onSuccess={(l, u) => {
          setSelectedUnit(u);
          setSelectedLesson(l);
          loadTree();
          loadQuestions(selectedStage, u, l);
        }}
      />

      <CurriculumQuestionModal
        isOpen={showCurriculumQuestionModal}
        onClose={() => setShowCurriculumQuestionModal(false)}
        mode={curriculumQuestionMode}
        initialStage={selectedStage}
        initialUnit={selectedUnit}
        initialLesson={selectedLesson}
        initialData={curriculumQuestionData}
        adminApi={adminApi}
        onSuccess={() => {
          loadTree();
          loadQuestions(selectedStage, selectedUnit, selectedLesson);
        }}
      />

      <CurriculumQuickExamModal
        isOpen={showQuickExamModal}
        onClose={() => setShowQuickExamModal(false)}
        initialMode={quickExamModalMode}
        stage={selectedStage}
        unit={selectedUnit}
        lesson={selectedLesson}
        totalAvailableQuestions={lessonQuestions.length}
        availableUnitLessons={
          currentStageNode?.units.find((u) => (u.unit || "").trim() === (selectedUnit || "").trim())?.lessons.map((l) => ({
            lesson: l.lesson,
            totalQuestions: l.totalQuestions,
            mcqCount: l.mcqCount ?? l.totalQuestions,
            tfCount: l.tfCount ?? 0,
            totalEssays: l.totalEssays ?? 0,
          })) || []
        }
        adminApi={adminApi}
        onSuccess={(createdQuiz) => {
          loadTree();
          setLessonWorkspaceTab("quizzes");
          if (createdQuiz && createdQuiz.id) {
            setGeneratedQuizSuccess(createdQuiz);
            setReviewingQuiz(createdQuiz);
          }
        }}
      />

      <CurriculumExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        stage={selectedStage}
        unit={exportModalTarget.unit}
        lesson={exportModalTarget.lesson}
        totalQuestions={exportModalTarget.lesson === selectedLesson ? filteredQuestions.length : 0}
        adminApi={adminApi}
      />
    </div>
  );
}
