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
  ArrowRight,
  Lock,
  Globe,
  Bot,
  Send,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info
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

export const isEnglishQuestion = (prompt?: string, options?: string[]): boolean => {
  const allText = ((prompt || "") + " " + (options || []).join(" ")).trim();
  const arabicMatches = allText.match(/[\u0600-\u06FF]/g) || [];
  const latinMatches = allText.match(/[a-zA-Z]/g) || [];
  return latinMatches.length > arabicMatches.length;
};

export const getOptionLabel = (index: number, isEnglish: boolean): string => {
  if (isEnglish) {
    return ["A", "B", "C", "D", "E", "F"][index] || String.fromCharCode(65 + index);
  }
  return ["أ", "ب", "ج", "د", "هـ", "و"][index] || String(index + 1);
};

export function parseUnitSortOrder(unitName: string): number {
  if (!unitName) return 999;
  const s = unitName.toLowerCase();
  if (/(\b1\b|الأولى|الاولى|unit\s*1|first)/i.test(s)) return 1;
  if (/(\b2\b|الثانية|التانية|unit\s*2|second)/i.test(s)) return 2;
  if (/(\b3\b|الثالثة|التالتة|unit\s*3|third)/i.test(s)) return 3;
  if (/(\b4\b|الرابعة|الرابعه|unit\s*4|fourth)/i.test(s)) return 4;
  if (/(\b5\b|الخامسة|الخامسه|unit\s*5|fifth)/i.test(s)) return 5;
  const m = s.match(/\b(\d+)\b/);
  if (m) return parseInt(m[1], 10);
  return 99;
}

export function parseLessonSortOrder(lessonName: string): number {
  if (!lessonName) return 999;
  const s = lessonName.toLowerCase();
  const matchDash = s.match(/(\d+)\s*[-_.]\s*(\d+)/);
  if (matchDash) {
    return parseInt(matchDash[1], 10) * 100 + parseInt(matchDash[2], 10);
  }
  if (s.includes("شامل")) return 9999;
  if (/(\b1\b|الأول|الاول\b|first)/i.test(s)) return 10;
  if (/(\b2\b|الثاني|الثانى\b|second)/i.test(s)) return 20;
  if (/(\b3\b|الثالث\b|third)/i.test(s)) return 30;
  if (/(\b4\b|الرابع\b|fourth)/i.test(s)) return 40;
  if (/(\b5\b|الخامس\b|fifth)/i.test(s)) return 50;
  const m = s.match(/\b(\d+)\b/);
  if (m) return parseInt(m[1], 10) * 10;
  return 100;
}

export function TestBankTab({
  adminApi,
  onNavigateToQuizzes,
}: {
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  onNavigateToQuizzes?: () => void;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"explorer" | "upload" | "generate" | "auto_daily">("explorer");

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

  // Upload Tab State (Unified Step-by-Step Wizard)
  const [uploadScope, setUploadScope] = useState<"unit" | "lesson">("unit");
  const [uploadStage, setUploadStage] = useState<string>("");
  const [uploadCourseId, setUploadCourseId] = useState<string>("");
  const [uploadLessonId, setUploadLessonId] = useState<string>("");
  const [uploadUnit, setUploadUnit] = useState<string>("");
  const [uploadLesson, setUploadLesson] = useState<string>("");
  const [isCustomUnit, setIsCustomUnit] = useState<boolean>(false);
  const [isCustomLesson, setIsCustomLesson] = useState<boolean>(false);
  const [customUnitInput, setCustomUnitInput] = useState<string>("");
  const [customLessonInput, setCustomLessonInput] = useState<string>("");
  const [uploadDifficulty, setUploadDifficulty] = useState<string>("medium");
  const [uploadPoints, setUploadPoints] = useState<number>(1);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Direct Quiz Settings on Upload
  const [createQuizDirectly, setCreateQuizDirectly] = useState<boolean>(true);
  const [quizTitleInput, setQuizTitleInput] = useState<string>("");
  const [isQuizTitleCustom, setIsQuizTitleCustom] = useState<boolean>(false);
  const [quizDurationInput, setQuizDurationInput] = useState<number>(30);
  const [quizPassingScoreInput, setQuizPassingScoreInput] = useState<number>(60);
  const [quizMaxAttemptsInput, setQuizMaxAttemptsInput] = useState<number>(3);
  const [quizIsPublished, setQuizIsPublished] = useState<boolean>(true);

  const [recentSavedLesson, setRecentSavedLesson] = useState<{
    stage: string;
    unit: string;
    lesson: string;
    lessonId?: string;
    count: number;
    quiz?: any;
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
  const [isSavingQuizQuestions, setIsSavingQuizQuestions] = useState<boolean>(false);
  const [editingQuizQuestionIdx, setEditingQuizQuestionIdx] = useState<number | null>(null);
  const [replacingQuestionIdx, setReplacingQuestionIdx] = useState<number | null>(null);
  const [candidatePickerModal, setCandidatePickerModal] = useState<{ open: boolean; questionIndex: number } | null>(null);
  const [candidateQuestions, setCandidateQuestions] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [candidateSearch, setCandidateSearch] = useState<string>("");

  // Multi-Schedule Auto-Exam State
  const [channelsConfig, setChannelsConfig] = useState<{
    telegram: { enabled: boolean; botToken: string; chatId: string };
    whatsapp: { enabled: boolean; phoneNumber: string; webhookUrl: string };
  }>({
    telegram: { enabled: false, botToken: "", chatId: "" },
    whatsapp: { enabled: false, phoneNumber: "", webhookUrl: "" },
  });

  const [schedules, setSchedules] = useState<Array<{
    id: string;
    title: string;
    enabled: boolean;
    timeOfDay: string;
    stage: string;
    unit?: string;
    lesson?: string;
    courseId?: number | null;
    questionsCount: number;
    durationMinutes: number;
    passingScore: number;
    difficultyDistribution: { easy: number; medium: number; hard: number };
    lastRunDate?: string;
    lastGeneratedQuizId?: number;
  }>>([]);

  const [loadingConfig, setLoadingConfig] = useState<boolean>(false);
  const [savingChannels, setSavingChannels] = useState<boolean>(false);
  const [triggeringScheduleId, setTriggeringScheduleId] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<any | null>(null);

  // Modal State for Adding/Editing a Schedule
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<{
    id?: string;
    title: string;
    enabled: boolean;
    timeOfDay: string;
    stage: string;
    unit: string;
    lesson: string;
    courseId?: number | null;
    questionsCount: number;
    durationMinutes: number;
    passingScore: number;
    difficultyDistribution: { easy: number; medium: number; hard: number };
  } | null>(null);
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);

  // Modal State for Channels Setup (Telegram Bot & WhatsApp)
  const [channelsModalOpen, setChannelsModalOpen] = useState<boolean>(false);

  const loadAutoExamConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await adminApi<any>("/api/admin/learning/auto-exam/config");
      if (res) {
        if (res.channels) setChannelsConfig(res.channels);
        if (Array.isArray(res.schedules)) setSchedules(res.schedules);
      }
    } catch (err: any) {
      // silently handle
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveChannels = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingChannels(true);
    try {
      const res = await adminApi<any>("/api/admin/learning/auto-exam/channels", {
        method: "PUT",
        body: JSON.stringify(channelsConfig),
      });
      if (res.channels) setChannelsConfig(res.channels);
      setChannelsModalOpen(false);
      toast({ title: "تم حفظ وتحديث إعدادات قنوات الإشعار (تليجرام/واتساب) بنجاح! 💾" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message || "تعذر حفظ القنوات" });
    } finally {
      setSavingChannels(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    if (!editingSchedule.title.trim()) {
      toast({ variant: "destructive", description: "يرجى كتابة اسم للجدول" });
      return;
    }
    setSavingSchedule(true);
    try {
      if (editingSchedule.id) {
        // Update existing schedule
        const res = await adminApi<any>(`/api/admin/learning/auto-exam/schedules/${editingSchedule.id}`, {
          method: "PUT",
          body: JSON.stringify(editingSchedule),
        });
        if (Array.isArray(res.schedules)) setSchedules(res.schedules);
        toast({ title: "تم تحديث بيانات الجدول بنجاح! 💾" });
      } else {
        // Create new schedule
        const res = await adminApi<any>("/api/admin/learning/auto-exam/schedules", {
          method: "POST",
          body: JSON.stringify(editingSchedule),
        });
        if (Array.isArray(res.schedules)) setSchedules(res.schedules);
        toast({ title: "تمت إضافة الجدول اليومي الجديد بنجاح! 🎉" });
      }
      setScheduleModalOpen(false);
      setEditingSchedule(null);
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حفظ الجدول" });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleToggleSchedule = async (schedule: any) => {
    try {
      const updated = { ...schedule, enabled: !schedule.enabled };
      const res = await adminApi<any>(`/api/admin/learning/auto-exam/schedules/${schedule.id}`, {
        method: "PUT",
        body: JSON.stringify(updated),
      });
      if (Array.isArray(res.schedules)) setSchedules(res.schedules);
      toast({
        title: updated.enabled
          ? `تم تفعيل جدول (${schedule.title}) بنجاح 🟢`
          : `تم إيقاف جدول (${schedule.title}) مؤقتاً ⚪`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر تغيير حالة الجدول" });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف جدول (${title})؟`)) return;
    try {
      const res = await adminApi<any>(`/api/admin/learning/auto-exam/schedules/${scheduleId}`, {
        method: "DELETE",
      });
      if (Array.isArray(res.schedules)) setSchedules(res.schedules);
      toast({ title: `تم حذف الجدول (${title}) بنجاح 🗑️` });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حذف الجدول" });
    }
  };

  const handleTriggerSchedule = async (schedule: any) => {
    setTriggeringScheduleId(schedule.id);
    setTriggerResult(null);
    try {
      const res = await adminApi<any>(`/api/admin/learning/auto-exam/schedules/${schedule.id}/trigger`, {
        method: "POST",
      });
      setTriggerResult(res);
      toast({
        title: `تم توليد اختبار تجريبي لـ (${schedule.title}) بنجاح! 🚀`,
        description: `تم إرسال نموذج الاختبار للمراجعة على البوت.`,
      });
      loadAutoExamConfig();
      loadTree();
    } catch (err: any) {
      toast({ variant: "destructive", title: "تعذر توليد الاختبار", description: err.message || "فشل التوليد" });
    } finally {
      setTriggeringScheduleId(null);
    }
  };

  useEffect(() => {
    if (activeTab === "auto_daily") {
      loadAutoExamConfig();
    }
  }, [activeTab]);

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

    if (!uploadStage.trim() || !uploadUnit.trim()) {
      toast({ variant: "destructive", description: "يرجى تحديد المرحلة والوحدة أولاً" });
      return;
    }

    const targetLesson = uploadScope === "unit"
      ? (uploadLesson.trim() || "شامل الوحدة")
      : uploadLesson.trim();

    if (uploadScope === "lesson" && !targetLesson) {
      toast({ variant: "destructive", description: "يرجى اختيار أو كتابة اسم الدرس" });
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
        formData.append("lesson", targetLesson);
        formData.append("difficulty", uploadDifficulty);
        formData.append("points", String(uploadPoints));
        if (uploadCourseId) formData.append("courseId", uploadCourseId);
        if (uploadScope === "lesson" && uploadLessonId) formData.append("lessonId", uploadLessonId);

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
            lesson: targetLesson,
            difficulty: uploadDifficulty,
            points: uploadPoints,
            courseId: uploadCourseId ? Number(uploadCourseId) : undefined,
            lessonId: uploadScope === "lesson" && uploadLessonId ? Number(uploadLessonId) : undefined,
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
          description: "راجع الأسئلة أدناه ثم اختر 'حفظ في البنك' أو 'إنشاء ونشر الاختبار فوراً'.",
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر فحص وتحليل الملف" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Final Commit of Uploaded Questions to Bank (with optional direct quiz creation)
  const handleConfirmImport = async (shouldCreateQuiz: boolean = false) => {
    if (previewQuestions.length === 0) {
      toast({ variant: "destructive", description: "لا توجد أسئلة جاهزة للحفظ" });
      return;
    }

    if (!uploadStage.trim() || !uploadUnit.trim()) {
      toast({ variant: "destructive", description: "يرجى التأكد من تحديد المرحلة والوحدة" });
      return;
    }

    const targetLesson = uploadScope === "unit"
      ? (uploadLesson.trim() || "شامل الوحدة")
      : uploadLesson.trim();

    if (uploadScope === "lesson" && !targetLesson) {
      toast({ variant: "destructive", description: "يرجى التأكد من تحديد اسم الدرس" });
      return;
    }

    setIsImporting(true);
    try {
      const isLang = uploadStage.includes("لغات") || uploadStage.toLowerCase().includes("languages");
      const defaultQuizTitle = uploadScope === "unit"
        ? (isLang ? `Exam: Comprehensive on ${uploadUnit}` : `اختبار شامل على ${uploadUnit}`)
        : (isLang ? `Exam: ${targetLesson}` : `اختبار على ${targetLesson}`);

      const res = await adminApi<any>("/api/admin/learning/test-bank/batch-import", {
        method: "POST",
        body: JSON.stringify({
          rawQuestions: previewQuestions,
          stage: uploadStage,
          unit: uploadUnit,
          lesson: targetLesson,
          difficulty: uploadDifficulty,
          points: uploadPoints,
          courseId: uploadCourseId ? Number(uploadCourseId) : undefined,
          lessonId: uploadScope === "lesson" && uploadLessonId ? Number(uploadLessonId) : undefined,
          createQuiz: shouldCreateQuiz,
          quizTitle: quizTitleInput.trim() || defaultQuizTitle,
          durationMinutes: quizDurationInput || 30,
          passingScore: quizPassingScoreInput || 60,
          maxAttempts: quizMaxAttemptsInput || 3,
          isPublished: quizIsPublished,
        }),
      });

      if (res.quiz) {
        toast({
          title: `تم إنشاء ونشر الاختبار "${res.quiz.title}" وحفظ الأسئلة في البنك بنجاح! 🚀`,
        });
        setGeneratedQuizSuccess(res.quiz);
      } else {
        toast({
          title: uploadScope === "unit"
            ? `تم حفظ ${res.count} سؤالاً في بنك الوحدة (${uploadUnit}) بنجاح! 🎉`
            : `تم حفظ ${res.count} سؤالاً في بنك درس (${targetLesson}) بنجاح! 🎉`,
        });
      }

      setRecentSavedLesson({
        stage: uploadStage,
        unit: uploadUnit,
        lesson: targetLesson,
        lessonId: uploadScope === "lesson" ? uploadLessonId : undefined,
        count: res.count,
        quiz: res.quiz,
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

  // Save changes to Quiz Questions from Review Modal
  const handleSaveReviewedQuizQuestions = async () => {
    if (!reviewingQuiz) return;
    setIsSavingQuizQuestions(true);
    try {
      const updated = await adminApi<any>(`/api/admin/learning/quizzes/${reviewingQuiz.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: reviewingQuiz.title,
          questions: reviewingQuiz.questions,
          isPublished: reviewingQuiz.isPublished,
        }),
      });
      toast({ title: "تم حفظ كافة تعديلات أسئلة الاختبار بنجاح! 💾" });
      setReviewingQuiz(updated);
      setEditingQuizQuestionIdx(null);
      if (generatedQuizSuccess && generatedQuizSuccess.id === reviewingQuiz.id) {
        setGeneratedQuizSuccess(updated);
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حفظ التعديلات على الاختبار" });
    } finally {
      setIsSavingQuizQuestions(false);
    }
  };

  // Delete Question from Quiz in Review Modal with confirmation and auto-save
  const handleDeleteQuizQuestion = async (qIdx: number) => {
    if (!reviewingQuiz) return;
    const targetQ = reviewingQuiz.questions[qIdx];
    const confirmMsg = `هل أنت متأكد من حذف هذا السؤال من الاختبار؟\n\n«${targetQ?.prompt?.slice(0, 60)}...»`;
    if (!window.confirm(confirmMsg)) return;

    const nextQuestions = reviewingQuiz.questions.filter((_: any, i: number) => i !== qIdx);
    if (nextQuestions.length === 0) {
      toast({ variant: "destructive", description: "لا يمكن حذف جميع الأسئلة. يجب أن يحتوي الاختبار على سؤال واحد على الأقل." });
      return;
    }

    try {
      const updated = await adminApi<any>(`/api/admin/learning/quizzes/${reviewingQuiz.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: reviewingQuiz.title,
          questions: nextQuestions,
          isPublished: reviewingQuiz.isPublished,
        }),
      });
      setReviewingQuiz(updated);
      if (editingQuizQuestionIdx === qIdx) setEditingQuizQuestionIdx(null);
      if (generatedQuizSuccess && generatedQuizSuccess.id === reviewingQuiz.id) {
        setGeneratedQuizSuccess(updated);
      }
      toast({ title: `تم حذف السؤال بنجاح 🗑️ (المتبقي: ${nextQuestions.length} سؤال)` });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر حذف السؤال" });
    }
  };

  // Instant 1-Click Replace Question with a clean random question from the bank
  const handleAutoReplaceQuizQuestion = async (qIdx: number) => {
    if (!reviewingQuiz) return;
    setReplacingQuestionIdx(qIdx);
    try {
      const res = await adminApi<any>(`/api/admin/learning/quizzes/${reviewingQuiz.id}/replace-question`, {
        method: "POST",
        body: JSON.stringify({ questionIndex: qIdx }),
      });
      if (res.quiz) {
        setReviewingQuiz(res.quiz);
        if (generatedQuizSuccess && generatedQuizSuccess.id === reviewingQuiz.id) {
          setGeneratedQuizSuccess(res.quiz);
        }
        toast({
          title: "تم استبدال السؤال بنجاح! 🔄",
          description: `السؤال الجديد: «${res.newQuestion?.prompt?.slice(0, 50)}...»`,
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر استبدال السؤال من البنك" });
    } finally {
      setReplacingQuestionIdx(null);
    }
  };

  // Open Candidate Picker to choose a specific replacement question manually
  const handleOpenCandidatePicker = async (qIdx: number) => {
    if (!reviewingQuiz) return;
    setCandidatePickerModal({ open: true, questionIndex: qIdx });
    setLoadingCandidates(true);
    setCandidateSearch("");
    try {
      const res = await adminApi<any>(`/api/admin/learning/quizzes/${reviewingQuiz.id}/replacement-candidates`);
      setCandidateQuestions(res.candidates || []);
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر جلب الأسئلة البديلة" });
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Pick a specific candidate question
  const handlePickCandidateQuestion = async (candidate: any) => {
    if (!reviewingQuiz || !candidatePickerModal) return;
    const qIdx = candidatePickerModal.questionIndex;
    try {
      const res = await adminApi<any>(`/api/admin/learning/quizzes/${reviewingQuiz.id}/replace-question`, {
        method: "POST",
        body: JSON.stringify({
          questionIndex: qIdx,
          replacementQuestionId: candidate.id,
          replacementQuestion: candidate.question,
        }),
      });
      if (res.quiz) {
        setReviewingQuiz(res.quiz);
        if (generatedQuizSuccess && generatedQuizSuccess.id === reviewingQuiz.id) {
          setGeneratedQuizSuccess(res.quiz);
        }
        setCandidatePickerModal(null);
        toast({
          title: "تم استبدال السؤال بالسؤال المختار بنجاح! 🎯",
          description: `السؤال الجديد: «${candidate.question?.prompt?.slice(0, 50)}...»`,
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر استبدال السؤال" });
    }
  };

  // Suggested units & lessons for upload tab based on uploadStage
  const suggestedUnits = useMemo(() => {
    if (!uploadStage) return [];
    const unitSet = new Set<string>();

    // 1. From treeData
    const st = treeData.find((s) => s.stage === uploadStage);
    if (st) {
      for (const u of st.units) {
        if (u.unit && u.unit.trim()) unitSet.add(u.unit.trim());
      }
    }

    // 2. Pre-defined curriculum standards by stage
    const isLang = uploadStage.includes("لغات") || uploadStage.toLowerCase().includes("languages");
    if (isLang) {
      unitSet.add("الوحدة الأولى: الذكاء الاصطناعي (Unit 1: Artificial Intelligence)");
      unitSet.add("الوحدة الثانية: الأمن السيبراني والتشفير (Unit 2: Cybersecurity & Encryption)");
    } else if (uploadStage.includes("عربي")) {
      unitSet.add("الوحدة الأولى: الذكاء الاصطناعي والمجتمع");
      unitSet.add("الوحدة الثانية: الأمن السيبراني والتشفير");
    }

    // 3. From courses/videos matching this stage
    const matchingCourses = courses.filter((c) => Array.isArray(c.stages) && c.stages.includes(uploadStage));
    for (const c of matchingCourses) {
      const crsVideos = videos.filter((v) => v.courseId === c.id);
      for (const v of crsVideos) {
        if (v.title.includes("الوحدة الاولى") || v.title.includes("Unit 1") || v.title.includes("1-")) {
          unitSet.add(isLang ? "الوحدة الأولى: الذكاء الاصطناعي (Unit 1: Artificial Intelligence)" : "الوحدة الأولى: الذكاء الاصطناعي والمجتمع");
        } else if (v.title.includes("الوحدة الثانية") || v.title.includes("الوحدة التانية") || v.title.includes("Unit 2") || v.title.includes("2-")) {
          unitSet.add(isLang ? "الوحدة الثانية: الأمن السيبراني والتشفير (Unit 2: Cybersecurity & Encryption)" : "الوحدة الثانية: الأمن السيبراني والتشفير");
        }
      }
    }

    return Array.from(unitSet).sort((a, b) => parseUnitSortOrder(a) - parseUnitSortOrder(b));
  }, [treeData, uploadStage, courses, videos]);

  const suggestedLessons = useMemo(() => {
    if (!uploadStage || !uploadUnit) return [];
    const lessonSet = new Set<string>();

    // 1. From treeData
    const st = treeData.find((s) => s.stage === uploadStage);
    if (st) {
      const u = st.units.find((unit) => unit.unit === uploadUnit);
      if (u) {
        for (const l of u.lessons) {
          if (l.lesson && l.lesson.trim() && l.lesson.trim() !== "شامل الوحدة") {
            lessonSet.add(l.lesson.trim());
          }
        }
      }
    }

    // 2. Curriculum standards by stage & unit
    const isLang = uploadStage.includes("لغات") || uploadStage.toLowerCase().includes("languages");
    const isUnit1 = uploadUnit.includes("الأولى") || uploadUnit.includes("1") || uploadUnit.toLowerCase().includes("artificial");
    const isUnit2 = uploadUnit.includes("الثانية") || uploadUnit.includes("2") || uploadUnit.toLowerCase().includes("cybersecurity") || uploadUnit.includes("الأمن");

    if (isLang) {
      if (isUnit1) {
        lessonSet.add("Lesson 1-1: Information Technology");
        lessonSet.add("Lesson 1-2: How AI Works");
        lessonSet.add("Lesson 1-3: AI in Our Daily Life");
        lessonSet.add("Lesson 1-4: AI Ethics");
      } else if (isUnit2) {
        lessonSet.add("Lesson 2-1: Cryptographic and Authentications");
        lessonSet.add("Lesson 2-2: Network Encryption Technologies");
        lessonSet.add("Lesson 2-3: Security Incident (التعامل مع الحوادث الأمنية)");
      }
    } else {
      if (isUnit1) {
        lessonSet.add("الدرس الأول: تطور تكنولوجيا المعلومات والتحول الاجتماعي");
        lessonSet.add("الدرس الثاني: كيف يعمل الذكاء الاصطناعي");
        lessonSet.add("الدرس الثالث: الذكاء الاصطناعي في حياتنا اليومية");
        lessonSet.add("الدرس الرابع: القضايا الأخلاقية المتعلقة بالذكاء الاصطناعي");
      } else if (isUnit2) {
        lessonSet.add("الدرس الأول: التشفير والمصادقة");
        lessonSet.add("الدرس الثاني: حماية البيانات والمعلومات");
        lessonSet.add("الدرس الثالث: التعامل مع الحوادث الأمنية وإدارة المخاطر");
      }
    }

    // 3. From videos matching stage and unit
    const matchingCourses = courses.filter((c) => Array.isArray(c.stages) && c.stages.includes(uploadStage));
    for (const c of matchingCourses) {
      const crsVideos = videos.filter((v) => v.courseId === c.id);
      for (const v of crsVideos) {
        const vTitle = v.title.trim();
        if (isUnit1 && (vTitle.includes("الوحدة الاولى") || vTitle.includes("Unit 1") || vTitle.includes("1-"))) {
          lessonSet.add(vTitle);
        } else if (isUnit2 && (vTitle.includes("الوحدة الثانية") || vTitle.includes("الوحدة التانية") || vTitle.includes("Unit 2") || vTitle.includes("2-"))) {
          lessonSet.add(vTitle);
        }
      }
    }

    return Array.from(lessonSet).sort((a, b) => parseLessonSortOrder(a) - parseLessonSortOrder(b));
  }, [treeData, uploadStage, uploadUnit, courses, videos]);

  // Auto-fill defaults and auto-link videos
  useEffect(() => {
    if (!uploadStage && availableStages.length > 0) {
      setUploadStage(selectedStage || availableStages[0]);
    }
  }, [availableStages, uploadStage, selectedStage]);

  useEffect(() => {
    if (uploadStage && !uploadUnit && suggestedUnits.length > 0) {
      setUploadUnit(suggestedUnits[0]);
    }
  }, [uploadStage, suggestedUnits, uploadUnit]);

  useEffect(() => {
    if (uploadScope === "unit") {
      setUploadLesson("شامل الوحدة");
      setUploadLessonId("");
    } else if (uploadScope === "lesson") {
      if (uploadLesson === "شامل الوحدة" || !uploadLesson) {
        if (suggestedLessons.length > 0) setUploadLesson(suggestedLessons[0]);
      }
    }
  }, [uploadScope, suggestedLessons, uploadLesson]);

  // Match video when uploadLesson or uploadStage changes
  useEffect(() => {
    if (!uploadLesson || uploadScope === "unit") {
      setUploadLessonId("");
      return;
    }
    const lLower = uploadLesson.toLowerCase();
    const matchedVideo = videos.find((v) => {
      const vLower = v.title.toLowerCase();
      if (vLower === lLower) return true;
      const m1 = lLower.match(/\b(\d+)\s*[-_.]\s*(\d+)\b/);
      const m2 = vLower.match(/\b(\d+)\s*[-_.]\s*(\d+)\b/);
      if (m1 && m2 && m1[1] === m2[1] && m1[2] === m2[2]) {
        if (uploadStage && v.stage && v.stage !== uploadStage) return false;
        return true;
      }
      return false;
    });
    if (matchedVideo) {
      setUploadLessonId(String(matchedVideo.id));
      if (matchedVideo.courseId) setUploadCourseId(String(matchedVideo.courseId));
    }
  }, [uploadLesson, uploadScope, uploadStage, videos]);

  // Auto-fill Quiz Title Input
  useEffect(() => {
    if (isQuizTitleCustom) return;
    const isLang = uploadStage.includes("لغات") || uploadStage.toLowerCase().includes("languages");
    if (uploadScope === "unit") {
      setQuizTitleInput(isLang ? `Exam: Unit Review (${uploadUnit || "Unit"})` : `اختبار شامل على ${uploadUnit || "الوحدة"}`);
    } else {
      if (uploadLesson && uploadLesson !== "شامل الوحدة") {
        setQuizTitleInput(isLang ? `Exam: ${uploadLesson}` : `اختبار على ${uploadLesson}`);
      } else {
        setQuizTitleInput("");
      }
    }
  }, [uploadScope, uploadUnit, uploadLesson, uploadStage, isQuizTitleCustom]);

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

  // Dynamic units and lessons for Schedule Add/Edit Modal
  const scheduleModalUnits = useMemo(() => {
    if (!editingSchedule || !editingSchedule.stage || editingSchedule.stage === "all") return [];
    const st = treeData.find((s) => s.stage === editingSchedule.stage);
    return st ? st.units : [];
  }, [treeData, editingSchedule?.stage]);

  const scheduleModalLessons = useMemo(() => {
    if (!editingSchedule || !editingSchedule.unit || editingSchedule.unit === "all") return [];
    const u = scheduleModalUnits.find((unit) => unit.unit === editingSchedule.unit);
    return u ? u.lessons : [];
  }, [scheduleModalUnits, editingSchedule?.unit]);

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

        <button
          type="button"
          onClick={() => setActiveTab("auto_daily")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === "auto_daily"
              ? "bg-amber-600 text-white shadow-md"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>٤. التوليد اليومي والإشعار الذكي 🤖</span>
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
                  {(currentStageNode.units || []).slice().sort((a, b) => parseUnitSortOrder(a.unit) - parseUnitSortOrder(b.unit)).map((unitObj, uIdx) => (
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
                      <h4 className="text-base font-black text-foreground flex items-center gap-2">
                        {selectedLesson === "all" ? (
                          <>
                            <FolderOpen className="h-4 w-4 text-emerald-600" />
                            <span>كل أسئلة الوحدة: {selectedUnit}</span>
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4 text-primary" />
                            <span>{selectedLesson}</span>
                          </>
                        )}
                      </h4>
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
                          setIsTitleCustomized(false);
                          if (selectedLesson === "all") {
                            setGenScope("unit");
                            setGenLesson("");
                            setGenTitle(`اختبار شامل على (${selectedUnit})`);
                          } else {
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
                          if (selectedLesson === "all") {
                            setUploadScope("unit");
                            setUploadLesson("شامل الوحدة");
                            setUploadLessonId("");
                          } else {
                            setUploadScope("lesson");
                            setUploadLesson(selectedLesson);
                            const v = videos.find((vid) => vid.title.trim() === selectedLesson.trim());
                            if (v) {
                              setUploadCourseId(String(v.courseId));
                              setUploadLessonId(String(v.id));
                            }
                          }
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
                    setIsTitleCustomized(false);
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
            <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-emerald-600" />
                  <span>رفع وتعيين اختبار (وحدة كاملة أو درس محدد)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  اختر المرحلة ثم الوحدة ثم حدد إن كان الاختبار لدرس معين أو شاملاً للوحدة كاملة، ثم ارفع الملف لحفظه في البنك أو نشره فوراً للطلاب.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {uploadScope === "unit" ? "نطاق: وحدة كاملة 📚" : "نطاق: درس محدد 🎥"}
                </span>
              </div>
            </div>

            {/* الخطوة ١: اختيار المرحلة الدراسية */}
            <div className="space-y-2">
              <label className="text-xs font-black text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">١</span>
                <span>اختر المرحلة الدراسية / المسار:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableStages.map((st) => {
                  const isSelected = uploadStage === st;
                  const count = treeData.find((s) => s.stage === st)?.totalQuestions || 0;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setUploadStage(st);
                        setIsCustomUnit(false);
                        setIsCustomLesson(false);
                      }}
                      className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-between gap-2 transition-all cursor-pointer text-right ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <GraduationCap className="h-4 w-4 shrink-0" />
                        <span className="truncate">{st}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                        {count} س
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* الخطوة ٢: اختيار الوحدة الدراسية */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-foreground flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">٢</span>
                  <span>اختر الوحدة الدراسية (Unit):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomUnit(!isCustomUnit)}
                  className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  {isCustomUnit ? "← العودة لاختيار من الوحدات المتاحة" : "➕ كتابة اسم وحدة جديدة"}
                </button>
              </div>

              {isCustomUnit ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="اكتب اسم الوحدة الجديدة (مثال: الوحدة الثالثة: البرمجة المتقدمة)"
                    value={customUnitInput}
                    onChange={(e) => {
                      setCustomUnitInput(e.target.value);
                      setUploadUnit(e.target.value);
                    }}
                    className="w-full h-11 px-3 rounded-xl border border-emerald-500 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-muted-foreground">سيتم إنشاء هذه الوحدة تلقائياً وإضافتها لبنك المرحلة.</p>
                </div>
              ) : (
                <select
                  value={uploadUnit}
                  onChange={(e) => {
                    setUploadUnit(e.target.value);
                    setIsCustomLesson(false);
                  }}
                  className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- اختر الوحدة الدراسية --</option>
                  {suggestedUnits.map((u, i) => (
                    <option key={i} value={u}>
                      📚 {u}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* الخطوة ٣: تحديد النطاق (وحدة كاملة أم درس محدد) */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <label className="text-xs font-black text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">٣</span>
                <span>تحديد نطاق الاختبار:</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                <button
                  type="button"
                  onClick={() => {
                    setUploadScope("unit");
                    setUploadLesson("شامل الوحدة");
                    setUploadLessonId("");
                  }}
                  className={`p-4 rounded-2xl border text-xs font-black flex items-start gap-3 transition-all cursor-pointer text-right ${
                    uploadScope === "unit"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <FolderOpen className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-sm">اختبار شامل للوحدة كاملة 📚</div>
                    <div className={`text-[11px] font-medium mt-0.5 ${uploadScope === "unit" ? "text-emerald-100" : "text-muted-foreground"}`}>
                      يشمل كافة موضوعات ودروس ({uploadUnit || "الوحدة"})
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadScope("lesson");
                    if (uploadLesson === "شامل الوحدة" || !uploadLesson) {
                      if (suggestedLessons.length > 0) setUploadLesson(suggestedLessons[0]);
                    }
                  }}
                  className={`p-4 rounded-2xl border text-xs font-black flex items-start gap-3 transition-all cursor-pointer text-right ${
                    uploadScope === "lesson"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <Video className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-black text-sm">اختبار لدرس محدد داخل الوحدة 🎥</div>
                    <div className={`text-[11px] font-medium mt-0.5 ${uploadScope === "lesson" ? "text-emerald-100" : "text-muted-foreground"}`}>
                      مرتبط بدرس معين داخل الوحدة وفيديو الشرح
                    </div>
                  </div>
                </button>
              </div>

              {/* في حالة اختيار درس محدد: إظهار قائمة الدروس مع الربط بالفيديو */}
              {uploadScope === "lesson" && (
                <div className="p-4 bg-muted/30 rounded-2xl border border-border/80 space-y-3 mt-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <Video className="h-4 w-4 text-emerald-600" />
                      <span>اختر الدرس من قائمة دروس الوحدة:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomLesson(!isCustomLesson)}
                      className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {isCustomLesson ? "← اختيار من الدروس المتاحة" : "➕ كتابة اسم درس جديد يدوياً"}
                    </button>
                  </div>

                  {isCustomLesson ? (
                    <input
                      type="text"
                      placeholder="اكتب اسم الدرس الجديد (مثال: Lesson 2-1: Cryptographic and Authentications)"
                      value={customLessonInput}
                      onChange={(e) => {
                        setCustomLessonInput(e.target.value);
                        setUploadLesson(e.target.value);
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-emerald-500 bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ) : (
                    <select
                      value={uploadLesson}
                      onChange={(e) => setUploadLesson(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- اختر درس الوحدة --</option>
                      {suggestedLessons.map((l, i) => (
                        <option key={i} value={l}>
                          🎥 {l}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* معلومات ربط الدرس بالفيديو في المنصة */}
                  {uploadLessonId ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>مرتبط تلقائياً بدرس الفيديو: «{videos.find((v) => String(v.id) === uploadLessonId)?.title || uploadLesson}» (معرف فيديو: {uploadLessonId})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-muted-foreground text-[11px] font-medium">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>الدرس غير مرتبط بفيديو معين حتى الآن (سيتم حفظه كدرس مستقل في بنك أسئلة الوحدة).</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* الخطوة ٤: ملف الأسئلة أو نص الأسئلة */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <label className="text-xs font-black text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black">٤</span>
                <span>ملف الأسئلة أو نص الأسئلة (يدعم Word و PDF و TXT و JSON):</span>
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

              {/* أو لصق النص يدوياً */}
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

            {/* إعدادات الصعوبة والدرجات الافتراضية */}
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

            {/* زر فحص وتحليل الأسئلة */}
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
                  <span>استخراج وفحص الأسئلة للمعاينة قبل الحفظ 🔍</span>
                </>
              )}
            </Button>
          </div>

          {/* الخطوة ٥: معاينة الأسئلة وخيارات الحفظ ونشر الاختبار الفوري */}
          {previewQuestions.length > 0 && (
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h4 className="text-base font-black text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>تم استخراج ({previewQuestions.length}) سؤالاً بنجاح!</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    راجع الأسئلة أدناه، واضغط على أي خيار لتغيير الإجابة الصحيحة إن لزم.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    disabled={isImporting}
                    variant="outline"
                    onClick={() => handleConfirmImport(false)}
                    className="font-bold text-xs h-11 px-4 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <Check className="h-4 w-4 ml-1.5" />
                    <span>حفظ في البنك فقط 💾</span>
                  </Button>

                  <Button
                    type="button"
                    disabled={isImporting}
                    onClick={() => handleConfirmImport(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-black text-xs h-11 px-5 shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>جارٍ الحفظ والإنشاء...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>حفظ في البنك + إنشاء الاختبار للطلاب فوراً 🚀</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* بطاقة إعدادات الاختبار المباشر للطلاب */}
              <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <span className="text-xs font-black text-foreground">
                      إعدادات الاختبار المباشر للطلاب (عند الضغط على "إنشاء الاختبار للطلاب فوراً")
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-violet-600 bg-violet-500/15 px-2.5 py-0.5 rounded-full">
                    سيتم نشره مباشرةً في المنصة
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t border-violet-500/20">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-foreground">عنوان الاختبار المعروض للطلاب:</label>
                    <input
                      type="text"
                      value={quizTitleInput}
                      onChange={(e) => {
                        setQuizTitleInput(e.target.value);
                        setIsQuizTitleCustom(true);
                      }}
                      placeholder="عنوان الاختبار..."
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">مدة الاختبار (بالدقائق):</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={quizDurationInput}
                      onChange={(e) => setQuizDurationInput(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">درجة النجاح (%):</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={quizPassingScoreInput}
                      onChange={(e) => setQuizPassingScoreInput(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">أقصى عدد محاولات للطالب:</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={quizMaxAttemptsInput}
                      onChange={(e) => setQuizMaxAttemptsInput(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                    />
                  </div>
                </div>
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
                {previewQuestions.map((q, idx) => {
                  const isEnglish = isEnglishQuestion(q.prompt, q.options);
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-black">
                          {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              isEnglish
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {isEnglish ? "EN (LTR)" : "عربي (RTL)"}
                          </span>
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

                      <p
                        dir={isEnglish ? "ltr" : "rtl"}
                        className={`text-xs font-bold text-foreground whitespace-pre-line leading-relaxed ${
                          isEnglish ? "text-left font-sans" : "text-right font-sans"
                        }`}
                      >
                        {q.prompt}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" dir={isEnglish ? "ltr" : "rtl"}>
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctIndex;
                          const letter = getOptionLabel(oIdx, isEnglish);
                          return (
                            <div
                              key={oIdx}
                              dir={isEnglish ? "ltr" : "rtl"}
                              onClick={() => {
                                setPreviewQuestions((prev) => {
                                  const updated = [...prev];
                                  updated[idx] = { ...updated[idx], correctIndex: oIdx };
                                  return updated;
                                });
                              }}
                              className={`p-2 rounded-xl flex items-start gap-2 border cursor-pointer transition-all ${
                                isCorrect
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/20 shadow-xs"
                                  : "bg-background border-border text-foreground hover:border-emerald-500/40 hover:bg-muted/40"
                              }`}
                              title="اضغط لتحديد هذا الخيار كإجابة صحيحة لهذا السؤال"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black bg-muted mt-0.5">
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

                      {q.explanation && (
                        <p
                          dir={isEnglish ? "ltr" : "rtl"}
                          className={`text-[11px] text-muted-foreground pt-1 ${isEnglish ? "text-left font-sans" : "text-right"}`}
                        >
                          <strong className="text-primary font-bold">
                            {isEnglish ? "Explanation:" : "التفسير:"}
                          </strong>{" "}
                          <span>{q.explanation}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
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
                                  if (!isTitleCustomized) {
                                    setGenTitle(`اختبار على درس ${v.title}`);
                                  }
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
                              if (les !== "all" && !isTitleCustomized) {
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
                              if (!isTitleCustomized && (!genTitle || genTitle.startsWith("اختبار مراجعة"))) {
                                if (allLessonsWithQuestions.length > 0) {
                                  setGenTitle(`اختبار مراجعة على ${allLessonsWithQuestions.length} دروس`);
                                }
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
                                  if (!isTitleCustomized && (!genTitle || genTitle.startsWith("اختبار مراجعة"))) {
                                    if (next.length > 0) {
                                      setGenTitle(`اختبار مراجعة على: ${next.slice(0, 3).join("، ")}${next.length > 3 ? "..." : ""}`);
                                    }
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

                      {/* Dedicated Custom Exam Title Input for Multi-Lessons */}
                      <div className="mt-2 p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>حدد اسم / عنوان الاختبار من هذه الدروس: *</span>
                            {isTitleCustomized && (
                              <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full">
                                اسم مخصص
                              </span>
                            )}
                          </label>
                          {isTitleCustomized && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsTitleCustomized(false);
                                if (genSelectedLessons.length > 0) {
                                  setGenTitle(`اختبار مراجعة على: ${genSelectedLessons.slice(0, 3).join("، ")}${genSelectedLessons.length > 3 ? "..." : ""}`);
                                } else {
                                  setGenTitle("");
                                }
                              }}
                              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer font-bold"
                              title="استعادة الاقتراح التلقائي"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>اقتراح اسم تلقائي</span>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="اكتب هنا اسم الاختبار (مثال: اختبار شامل على الفصل الأول والثاني...)"
                          value={genTitle}
                          onChange={(e) => {
                            setGenTitle(e.target.value);
                            setIsTitleCustomized(true);
                          }}
                          className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          💡 هذا هو الاسم الذي سيظهر للطلاب في صفحة الاختبارات. يمكنك كتابة أي اسم تريده ولن يتم تغييره عند تحديد الدروس.
                        </p>
                      </div>

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
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-foreground">عنوان الاختبار *</label>
                    {isTitleCustomized && (
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                        اسم مخصص
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="مثال: اختبار شامل على الوحدة الأولى"
                    value={genTitle}
                    onChange={(e) => {
                      setGenTitle(e.target.value);
                      setIsTitleCustomized(true);
                    }}
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

                {/* Publishing Mode Selection: Draft vs Publish */}
                <div className="p-4 rounded-2xl border border-border bg-card/80 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-foreground flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <span>حالة ظهور الاختبار للطلاب:</span>
                    </label>
                    <span className="text-[10px] text-muted-foreground font-bold">
                      {genPublishMode === "draft" ? "🔒 مسودة للمراجعة أولاً" : "🚀 نشر فوري للطلاب"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGenPublishMode("draft")}
                      className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                        genPublishMode === "draft"
                          ? "bg-amber-500/10 border-amber-500/50 text-foreground ring-2 ring-amber-500/20 shadow-xs"
                          : "bg-muted/30 border-border hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="genPublishMode"
                        checked={genPublishMode === "draft"}
                        onChange={() => setGenPublishMode("draft")}
                        className="mt-0.5 h-4 w-4 accent-amber-600 pointer-events-none shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="block text-xs font-black text-foreground flex items-center gap-1.5">
                          <span>حفظ كمسودة للمراجعة أولاً</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded font-black">
                            مستحسن 🔒
                          </span>
                        </strong>
                        <span className="text-[11px] text-muted-foreground block leading-relaxed mt-1">
                          لن يظهر الاختبار للطلاب حتى تراجع الأسئلة وتتأكد من صحتها ثم تضغط "نشر".
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGenPublishMode("publish")}
                      className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-3 ${
                        genPublishMode === "publish"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-foreground ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-muted/30 border-border hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="genPublishMode"
                        checked={genPublishMode === "publish"}
                        onChange={() => setGenPublishMode("publish")}
                        className="mt-0.5 h-4 w-4 accent-emerald-600 pointer-events-none shrink-0"
                      />
                      <div className="min-w-0">
                        <strong className="block text-xs font-black text-foreground">
                          نشر فوري ومباشر للطلاب 🚀
                        </strong>
                        <span className="text-[11px] text-muted-foreground block leading-relaxed mt-1">
                          يظهر الاختبار في حسابات الطلاب فوراً وتصلهم إشعارات ببدء الاختبار.
                        </span>
                      </div>
                    </button>
                  </div>
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
                ) : genPublishMode === "draft" ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>توليد الاختبار وحفظه كمسودة للمراجعة 📝</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>توليد ونشر الاختبار فوراً للطلاب 🚀</span>
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: MULTI-SCHEDULE DAILY AUTO-EXAM & SMART NOTIFICATIONS */}
      {/* ============================================================ */}
      {activeTab === "auto_daily" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background p-6 sm:p-8 shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <Bot className="h-4 w-4" />
                  <span>نظام الجداول المتعددة والامتحانات الآلية</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-foreground">
                  جداول الاختبارات اليومية الذكية لكل مرحلة ودرس 🤖📚
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                  أنشئ جداول مستقلة لكل مرحلة دراسية، وحدة، أو درس محدد بمواعيد وتوزيع صعوبة مخصص. يقوم النظام في كل موعد بسحب الأسئلة دون تكرار للأسئلة الحديثة، ثم ينشئ الاختبار <strong className="text-foreground">كمسودة خاصة سرية</strong>، ويرسله فوراً لمراجعتك على <strong className="text-sky-600">تليجرام أو واتساب</strong> مع زر للاعتماد والنشر بضغطة واحدة.
                </p>
              </div>

              {/* Bot Status Pill & Actions */}
              <div className="shrink-0 flex flex-col items-end gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                      channelsConfig.telegram.enabled && channelsConfig.telegram.botToken
                        ? "bg-sky-500/15 text-sky-600 border border-sky-500/30"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {channelsConfig.telegram.enabled && channelsConfig.telegram.botToken
                        ? "تليجرام مربوط بنجاح (@DrElmahdy_Quiz_Bot) 🟢"
                        : "تليجرام غير مضبوط"}
                    </span>
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setChannelsModalOpen(true)}
                    className="h-8 px-3 rounded-xl border-border text-xs font-bold gap-1 cursor-pointer"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>إعدادات البوت والقنوات</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    setEditingSchedule({
                      title: "اختبار يومي جديد",
                      enabled: true,
                      timeOfDay: "08:00",
                      stage: availableStages[0] || "all",
                      unit: "all",
                      lesson: "all",
                      courseId: null,
                      questionsCount: 10,
                      durationMinutes: 20,
                      passingScore: 60,
                      difficultyDistribution: { easy: 3, medium: 5, hard: 2 },
                    });
                    setScheduleModalOpen(true);
                  }}
                  className="w-full h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-md gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة جدول يومي جديد لمرحلة / درس ➕</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Schedules List Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <h4 className="text-base font-black text-foreground">
                الجداول اليومية المجدولة ({schedules.length} جدول)
              </h4>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadAutoExamConfig}
              className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingConfig ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </Button>
          </div>

          {/* Schedules Cards Grid */}
          {schedules.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center space-y-4">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <div className="space-y-1">
                <h5 className="text-sm font-black text-foreground">لا توجد جداول يومية مضافة حتى الآن</h5>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  يمكنك إضافة جدول لكل مرحلة دراسية أو درس لمراجعة وتوليد اختبارات يومية تلقائية مستمرة.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setEditingSchedule({
                    title: "اختبار يومي جديد",
                    enabled: true,
                    timeOfDay: "08:00",
                    stage: availableStages[0] || "all",
                    unit: "all",
                    lesson: "all",
                    courseId: null,
                    questionsCount: 10,
                    durationMinutes: 20,
                    passingScore: 60,
                    difficultyDistribution: { easy: 3, medium: 5, hard: 2 },
                  });
                  setScheduleModalOpen(true);
                }}
                className="h-10 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-md gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>إنشاء أول جدول يومي الآن</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`rounded-3xl border bg-card p-5 sm:p-6 shadow-sm transition-all space-y-4 ${
                    schedule.enabled
                      ? "border-amber-500/30 hover:border-amber-500/60 ring-1 ring-amber-500/10"
                      : "border-border opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black ${
                            schedule.enabled
                              ? "bg-emerald-500/15 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${schedule.enabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                          {schedule.enabled ? "مفعّل 🟢" : "متوقف مؤقتاً ⚪"}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-bold">
                          <Clock className="h-3 w-3 text-amber-600" />
                          <span>الساعة {schedule.timeOfDay} (القاهرة)</span>
                        </span>
                      </div>

                      <h4 className="text-base font-black text-foreground pt-1">{schedule.title}</h4>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleSchedule(schedule)}
                      className={`h-7 px-3 rounded-full text-xs font-black cursor-pointer transition-colors ${
                        schedule.enabled
                          ? "bg-rose-500/15 text-rose-600 hover:bg-rose-500/25"
                          : "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                      }`}
                      title={schedule.enabled ? "إيقاف مؤقت لهذا الجدول" : "تفعيل هذا الجدول"}
                    >
                      {schedule.enabled ? "إيقاف" : "تفعيل"}
                    </button>
                  </div>

                  {/* Scope Details Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/60 flex items-center justify-between">
                      <span className="text-muted-foreground font-bold">المرحلة الدراسية:</span>
                      <strong className="text-foreground font-extrabold truncate max-w-[150px]">
                        {schedule.stage === "all" ? "كل المراحل" : schedule.stage}
                      </strong>
                    </div>

                    <div className="bg-muted/40 p-2.5 rounded-xl border border-border/60 flex items-center justify-between">
                      <span className="text-muted-foreground font-bold">الوحدة / الدرس:</span>
                      <strong className="text-foreground font-extrabold truncate max-w-[150px]">
                        {schedule.unit === "all" || !schedule.unit ? "شامل المنهج" : schedule.unit}
                        {schedule.lesson && schedule.lesson !== "all" ? ` · ${schedule.lesson}` : ""}
                      </strong>
                    </div>
                  </div>

                  {/* Exam Specs Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-background rounded-xl p-2 border border-border">
                      <span className="block text-[10px] text-muted-foreground font-bold">عدد الأسئلة</span>
                      <strong className="text-foreground font-black text-sm">{schedule.questionsCount}</strong>
                    </div>

                    <div className="bg-background rounded-xl p-2 border border-border">
                      <span className="block text-[10px] text-muted-foreground font-bold">المدة</span>
                      <strong className="text-foreground font-black text-sm">{schedule.durationMinutes} دقيقة</strong>
                    </div>

                    <div className="bg-background rounded-xl p-2 border border-border">
                      <span className="block text-[10px] text-muted-foreground font-bold">درجة النجاح</span>
                      <strong className="text-emerald-600 font-black text-sm">{schedule.passingScore}%</strong>
                    </div>
                  </div>

                  {/* Difficulty Breakdown Pill */}
                  <div className="flex items-center justify-between text-[11px] bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50 text-muted-foreground">
                    <span>توزيع الصعوبة:</span>
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-emerald-600">سهل: {schedule.difficultyDistribution?.easy || 0}</span>
                      <span>·</span>
                      <span className="text-amber-600">متوسط: {schedule.difficultyDistribution?.medium || 0}</span>
                      <span>·</span>
                      <span className="text-rose-600">صعب: {schedule.difficultyDistribution?.hard || 0}</span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleTriggerSchedule(schedule)}
                      disabled={triggeringScheduleId === schedule.id}
                      className="h-9 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs cursor-pointer shadow-xs gap-1.5"
                    >
                      <Sparkles className={`h-3.5 w-3.5 ${triggeringScheduleId === schedule.id ? "animate-spin" : ""}`} />
                      <span>{triggeringScheduleId === schedule.id ? "جارٍ الإرسال..." : "إرسال تجريبي الآن للبوت 🚀"}</span>
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingSchedule({
                            id: schedule.id,
                            title: schedule.title,
                            enabled: schedule.enabled,
                            timeOfDay: schedule.timeOfDay,
                            stage: schedule.stage,
                            unit: schedule.unit || "all",
                            lesson: schedule.lesson || "all",
                            courseId: schedule.courseId || null,
                            questionsCount: schedule.questionsCount,
                            durationMinutes: schedule.durationMinutes,
                            passingScore: schedule.passingScore,
                            difficultyDistribution: schedule.difficultyDistribution || { easy: 3, medium: 5, hard: 2 },
                          });
                          setScheduleModalOpen(true);
                        }}
                        className="h-9 px-3 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-bold cursor-pointer gap-1"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>تعديل</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSchedule(schedule.id, schedule.title)}
                        className="h-9 px-3 rounded-xl text-rose-600 hover:bg-rose-500/10 text-xs font-bold cursor-pointer gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trigger Result Banner */}
          {triggerResult && (
            <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <h4 className="text-sm font-black text-foreground">
                      تم توليد الاختبار التجريبي لـ ({triggerResult.scheduleTitle}) بنجاح! (#{triggerResult.quiz?.id}: {triggerResult.quiz?.title})
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      المرحلة: {triggerResult.stageName} · النطاق: {triggerResult.unitName} · الحالة: مسودة غير منشورة 🔒
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setReviewingQuiz(triggerResult.quiz);
                    }}
                    className="h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black cursor-pointer shadow-xs gap-1.5"
                  >
                    <Eye className="h-4 w-4" />
                    <span>مراجعة وتعديل الأسئلة هنا</span>
                  </Button>

                  <a
                    href={triggerResult.approvalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>فتح رابط الاعتماد والنشر المباشر 🚀</span>
                  </a>
                </div>
              </div>

              {/* Delivery Status details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-emerald-500/20">
                <div className="bg-card/80 rounded-xl p-3 border border-border flex items-center justify-between">
                  <span className="font-bold text-foreground">حالة إرسال Telegram:</span>
                  <span className="font-extrabold text-sky-600">
                    {triggerResult.telegramResult?.success ? "تم الإرسال بنجاح بنقرة زر الاعتماد ✅" : (triggerResult.telegramResult?.error || "غير مفعل")}
                  </span>
                </div>

                <div className="bg-card/80 rounded-xl p-3 border border-border flex items-center justify-between">
                  <span className="font-bold text-foreground">حالة إرسال WhatsApp:</span>
                  <span className="font-extrabold text-emerald-600">
                    {triggerResult.whatsappResult?.success ? "تم الإرسال بنجاح ✅" : (triggerResult.whatsappResult?.error || "غير مفعل")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SCHEDULE ADD / EDIT MODAL                                    */}
          {/* ============================================================ */}
          {scheduleModalOpen && editingSchedule && (
            <div
              className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
              onClick={(e) => e.target === e.currentTarget && setScheduleModalOpen(false)}
            >
              <div className="w-full max-w-2xl bg-card rounded-3xl shadow-2xl border border-border text-right max-h-[92vh] flex flex-col overflow-hidden">
                <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/20">
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>{editingSchedule.id ? "تعديل الجدول اليومي" : "إضافة جدول يومي جديد"}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setScheduleModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveSchedule} className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Schedule Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">اسم أو عنوان الجدول *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: اختبار يومي - تانية ثانوي - التنفس الخلوي"
                      value={editingSchedule.title}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, title: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Stage, Unit, Lesson Pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Stage */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">المرحلة الدراسية:</label>
                      <select
                        value={editingSchedule.stage}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            stage: e.target.value,
                            unit: "all",
                            lesson: "all",
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                      >
                        <option value="all">كل المراحل (تدوير ذكي)</option>
                        {availableStages.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Unit */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">الوحدة الدراسية:</label>
                      <select
                        value={editingSchedule.unit}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            unit: e.target.value,
                            lesson: "all",
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                      >
                        <option value="all">شامل كل الوحدات</option>
                        {scheduleModalUnits.map((u) => (
                          <option key={u.unit} value={u.unit}>
                            {u.unit} ({u.totalQuestions} سؤال)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lesson */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">الدرس المحدد:</label>
                      <select
                        value={editingSchedule.lesson}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            lesson: e.target.value,
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
                      >
                        <option value="all">شامل كامل دروس الوحدة</option>
                        {scheduleModalLessons.map((l) => (
                          <option key={l.lesson} value={l.lesson}>
                            {l.lesson} ({l.totalQuestions} سؤال)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Timing & Exam Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">موعد التوليد (القاهرة):</label>
                      <input
                        type="time"
                        required
                        value={editingSchedule.timeOfDay}
                        onChange={(e) => setEditingSchedule({ ...editingSchedule, timeOfDay: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">عدد الأسئلة:</label>
                      <input
                        type="number"
                        min={3}
                        max={50}
                        required
                        value={editingSchedule.questionsCount}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            questionsCount: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">المدة (دقيقة):</label>
                      <input
                        type="number"
                        min={0}
                        max={180}
                        required
                        value={editingSchedule.durationMinutes}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            durationMinutes: Number(e.target.value),
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">درجة النجاح %:</label>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        required
                        value={editingSchedule.passingScore}
                        onChange={(e) =>
                          setEditingSchedule({
                            ...editingSchedule,
                            passingScore: Number(e.target.value),
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* Difficulty Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-xs font-bold text-foreground">توزيع الصعوبة داخل الاختبار:</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                        <span className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400">سهل</span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={editingSchedule.difficultyDistribution.easy}
                          onChange={(e) =>
                            setEditingSchedule({
                              ...editingSchedule,
                              difficultyDistribution: {
                                ...editingSchedule.difficultyDistribution,
                                easy: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full h-8 mt-1 text-center bg-background rounded-lg border border-border text-xs font-bold"
                        />
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                        <span className="block text-[11px] font-bold text-amber-700 dark:text-amber-400">متوسط</span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={editingSchedule.difficultyDistribution.medium}
                          onChange={(e) =>
                            setEditingSchedule({
                              ...editingSchedule,
                              difficultyDistribution: {
                                ...editingSchedule.difficultyDistribution,
                                medium: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full h-8 mt-1 text-center bg-background rounded-lg border border-border text-xs font-bold"
                        />
                      </div>

                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 text-center">
                        <span className="block text-[11px] font-bold text-rose-700 dark:text-rose-400">صعب</span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={editingSchedule.difficultyDistribution.hard}
                          onChange={(e) =>
                            setEditingSchedule({
                              ...editingSchedule,
                              difficultyDistribution: {
                                ...editingSchedule.difficultyDistribution,
                                hard: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full h-8 mt-1 text-center bg-background rounded-lg border border-border text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Enable Switch */}
                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={editingSchedule.enabled}
                      onChange={(e) => setEditingSchedule({ ...editingSchedule, enabled: e.target.checked })}
                      className="h-4 w-4 accent-amber-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-foreground">تفعيل هذا الجدول للعمل يومياً فور الحفظ</span>
                  </label>

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setScheduleModalOpen(false)}
                      className="h-10 px-4 rounded-xl text-xs font-bold"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingSchedule}
                      className="h-10 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md"
                    >
                      {savingSchedule ? "جارٍ الحفظ..." : "حفظ الجدول 💾"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* CHANNELS SETTINGS MODAL (Telegram Bot & WhatsApp)            */}
          {/* ============================================================ */}
          {channelsModalOpen && (
            <div
              className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
              onClick={(e) => e.target === e.currentTarget && setChannelsModalOpen(false)}
            >
              <div className="w-full max-w-xl bg-card rounded-3xl shadow-2xl border border-border text-right max-h-[90vh] flex flex-col overflow-hidden">
                <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/20">
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                    <Send className="h-4 w-4 text-sky-500" />
                    <span>إعدادات قنوات الإشعار والمراجعة (تليجرام / واتساب)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setChannelsModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveChannels} className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Telegram Setup Card */}
                  <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-sky-500/20">
                      <span className="text-xs font-black text-foreground flex items-center gap-2">
                        <Send className="h-4 w-4 text-sky-500" />
                        <span>قناة Telegram (موصى بها ومجانية)</span>
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channelsConfig.telegram.enabled}
                          onChange={(e) =>
                            setChannelsConfig({
                              ...channelsConfig,
                              telegram: { ...channelsConfig.telegram, enabled: e.target.checked },
                            })
                          }
                          className="h-4 w-4 accent-sky-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">تفعيل إرسال تليجرام</span>
                      </label>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Telegram Bot Token:</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={channelsConfig.telegram.botToken}
                        onChange={(e) =>
                          setChannelsConfig({
                            ...channelsConfig,
                            telegram: { ...channelsConfig.telegram, botToken: e.target.value.trim() },
                          })
                        }
                        placeholder="8821235319:AAFdp8sj..."
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-left"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Telegram Chat ID الخاص بك:</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={channelsConfig.telegram.chatId}
                        onChange={(e) =>
                          setChannelsConfig({
                            ...channelsConfig,
                            telegram: { ...channelsConfig.telegram, chatId: e.target.value.trim() },
                          })
                        }
                        placeholder="مثال: 744591440"
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-left"
                      />
                    </div>
                  </div>

                  {/* WhatsApp Setup Card */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                      <span className="text-xs font-black text-foreground flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                        <span>قناة WhatsApp (عبر Webhook / Gateway)</span>
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channelsConfig.whatsapp.enabled}
                          onChange={(e) =>
                            setChannelsConfig({
                              ...channelsConfig,
                              whatsapp: { ...channelsConfig.whatsapp, enabled: e.target.checked },
                            })
                          }
                          className="h-4 w-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">تفعيل إرسال واتساب</span>
                      </label>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">رقم الهاتف لاستقبال الرسالة:</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={channelsConfig.whatsapp.phoneNumber}
                        onChange={(e) =>
                          setChannelsConfig({
                            ...channelsConfig,
                            whatsapp: { ...channelsConfig.whatsapp, phoneNumber: e.target.value.trim() },
                          })
                        }
                        placeholder="01012345678"
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-left"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">رابط WhatsApp API Gateway / Webhook URL:</label>
                      <input
                        type="url"
                        dir="ltr"
                        value={channelsConfig.whatsapp.webhookUrl}
                        onChange={(e) =>
                          setChannelsConfig({
                            ...channelsConfig,
                            whatsapp: { ...channelsConfig.whatsapp, webhookUrl: e.target.value.trim() },
                          })
                        }
                        placeholder="https://api.ultramsg.com/..."
                        className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-left"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setChannelsModalOpen(false)}
                      className="h-10 px-4 rounded-xl text-xs font-bold"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingChannels}
                      className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-md"
                    >
                      {savingChannels ? "جارٍ الحفظ..." : "حفظ إعدادات القنوات 💾"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
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

            {(() => {
              const isEnglish = isEnglishQuestion(editingQuestion.prompt, editingQuestion.options);
              return (
                <form onSubmit={handleSaveQuestion} className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">نص السؤال *</label>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          isEnglish
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {isEnglish ? "EN (LTR)" : "عربي (RTL)"}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      required
                      dir={isEnglish ? "ltr" : "rtl"}
                      value={editingQuestion.prompt}
                      onChange={(e) =>
                        setEditingQuestion({ ...editingQuestion, prompt: e.target.value })
                      }
                      placeholder={isEnglish ? "Type question prompt here..." : "اكتب نص السؤال هنا..."}
                      className={`w-full rounded-xl border border-border bg-background p-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                        isEnglish ? "text-left font-sans" : "text-right font-sans"
                      }`}
                    />
                  </div>

                  {/* Choices */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">
                      الاختيارات (حدد الدائرة بجانب الإجابة الصحيحة):
                    </label>
                    {editingQuestion.options.map((opt: string, i: number) => {
                      const letter = getOptionLabel(i, isEnglish);
                      const isChecked = editingQuestion.correctIndex === i;
                      return (
                        <div key={i} dir={isEnglish ? "ltr" : "rtl"} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctIndex"
                            checked={isChecked}
                            onChange={() =>
                              setEditingQuestion({ ...editingQuestion, correctIndex: i })
                            }
                            className="h-4 w-4 accent-emerald-600 cursor-pointer shrink-0"
                          />
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-[11px] font-black shrink-0">
                            {letter}
                          </span>
                          <input
                            type="text"
                            required
                            dir={isEnglish ? "ltr" : "rtl"}
                            value={opt}
                            onChange={(e) => {
                              const next = [...editingQuestion.options];
                              next[i] = e.target.value;
                              setEditingQuestion({ ...editingQuestion, options: next });
                            }}
                            placeholder={isEnglish ? `Option (${letter})` : `الاختيار (${letter})`}
                            className={`flex-1 h-9 px-3 rounded-xl border text-xs font-bold text-foreground focus:outline-none ${
                              isChecked
                                ? "border-emerald-500/50 bg-emerald-500/5"
                                : "border-border bg-background"
                            } ${isEnglish ? "text-left font-sans" : "text-right font-sans"}`}
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
                      {isEnglish ? "Explanation / Steps (Optional)" : "التفسير وخطوات الإجابة (اختياري)"}
                    </label>
                    <textarea
                      rows={2}
                      dir={isEnglish ? "ltr" : "rtl"}
                      value={editingQuestion.explanation || ""}
                      onChange={(e) =>
                        setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                      }
                      placeholder={isEnglish ? "Explain why this answer is correct..." : "شرح سبب صحة هذا الاختيار..."}
                      className={`w-full rounded-xl border border-border bg-background p-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                        isEnglish ? "text-left font-sans" : "text-right font-sans"
                      }`}
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
              );
            })()}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* REVIEW QUIZ MODAL (مراجعة أسئلة الاختبار قبل النشر)          */}
      {/* ============================================================ */}
      {reviewingQuiz && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5"
          onClick={(e) => e.target === e.currentTarget && setReviewingQuiz(null)}
        >
          <div className="w-full max-w-4xl bg-card rounded-3xl shadow-2xl border border-border text-right max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-foreground">
                      مراجعة أسئلة الاختبار: {reviewingQuiz.title}
                    </h3>
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        reviewingQuiz.isPublished
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {reviewingQuiz.isPublished ? "منشور للطلاب 🟢" : "مسودة غير منشورة 🔒"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {reviewingQuiz.questions?.length || 0} أسئلة · درجة النجاح: {reviewingQuiz.passingScore}% · المدة: {reviewingQuiz.durationMinutes ? `${reviewingQuiz.durationMinutes} دقيقة` : "مفتوح"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Publish / Unpublish direct toggle button */}
                {!reviewingQuiz.isPublished ? (
                  <Button
                    type="button"
                    onClick={() => handlePublishQuiz(reviewingQuiz.id, true)}
                    className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" /> نشر الاختبار للطلاب الآن 🚀
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePublishQuiz(reviewingQuiz.id, false)}
                    className="h-9 px-3.5 rounded-xl text-xs font-bold border-amber-500/40 text-amber-600 hover:bg-amber-500/10 cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock className="h-3.5 w-3.5" /> تحويل لمسودة (إخفاء عن الطلاب) 🔒
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setReviewingQuiz(null)}
                  className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Notice Bar */}
            <div className="px-5 py-2.5 bg-muted/40 border-b border-border/80 flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {reviewingQuiz.isPublished
                    ? "الاختبار منشور وظاهر للطلاب حالياً. يمكنك تعديل أي سؤال وحفظ التغييرات فوراً."
                    : "الاختبار محفوظ كمسودة ولن يظهر للطلاب حتى تضغط على زر «نشر الاختبار للطلاب الآن». راجع الأسئلة وتأكد منها بحرية."}
                </span>
              </span>
              <span className="font-bold text-foreground shrink-0 pr-2">
                إجمالي الأسئلة: {reviewingQuiz.questions?.length || 0}
              </span>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(reviewingQuiz.questions || []).length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-xs font-bold border border-dashed border-border rounded-2xl">
                  لا توجد أسئلة داخل هذا الاختبار
                </div>
              ) : (
                (reviewingQuiz.questions || []).map((q: any, qIdx: number) => {
                  const isEnglish = isEnglishQuestion(q.prompt, q.options);
                  const isEditingThis = editingQuizQuestionIdx === qIdx;

                  return (
                    <div
                      key={qIdx}
                      className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-primary/40 transition-colors"
                    >
                      {/* Question Top Bar */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white text-xs font-black">
                            {qIdx + 1}
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
                          <span className="text-[11px] text-muted-foreground font-bold">
                            {q.points || 1} {q.points === 1 ? "درجة" : "درجات"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingQuizQuestionIdx(isEditingThis ? null : qIdx)}
                            className="h-7 text-[11px] font-bold gap-1 text-slate-600 dark:text-slate-300 hover:text-primary cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span>{isEditingThis ? "إغلاق التعديل" : "تعديل السؤال"}</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={replacingQuestionIdx === qIdx}
                            onClick={() => handleAutoReplaceQuizQuestion(qIdx)}
                            className="h-7 text-[11px] font-bold gap-1 text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 cursor-pointer"
                            title="استبدال السؤال بسؤال بديل عشوائي من البنك"
                          >
                            <RefreshCw className={`h-3 w-3 ${replacingQuestionIdx === qIdx ? "animate-spin" : ""}`} />
                            <span>{replacingQuestionIdx === qIdx ? "جارٍ الاستبدال..." : "استبدال السؤال 🔄"}</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCandidatePicker(qIdx)}
                            className="h-7 text-[11px] font-bold gap-1 text-blue-700 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 cursor-pointer"
                            title="تصفح بنك الأسئلة واختيار سؤال بديل محدد"
                          >
                            <Search className="h-3 w-3" />
                            <span>اختر بديلاً...</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuizQuestion(qIdx)}
                            className="h-7 text-[11px] font-bold gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 cursor-pointer"
                            title="حذف هذا السؤال من الاختبار نهائياً"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>حذف السؤال</span>
                          </Button>
                        </div>
                      </div>

                      {/* Inline Editor or Display */}
                      {isEditingThis ? (
                        <div className="space-y-3 pt-1 bg-muted/20 p-3 rounded-xl border border-primary/20">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-foreground">نص السؤال:</label>
                            <textarea
                              rows={2}
                              dir={isEnglish ? "ltr" : "rtl"}
                              value={q.prompt}
                              onChange={(e) => {
                                const nextQuestions = [...reviewingQuiz.questions];
                                nextQuestions[qIdx] = { ...nextQuestions[qIdx], prompt: e.target.value };
                                setReviewingQuiz({ ...reviewingQuiz, questions: nextQuestions });
                              }}
                              className={`w-full rounded-xl border border-border bg-background p-2.5 text-xs font-bold ${
                                isEnglish ? "text-left font-sans" : "text-right font-sans"
                              }`}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground">
                              الاختيارات (اختر الدائرة للإجابة الصحيحة):
                            </label>
                            {(q.options || []).map((opt: string, oIdx: number) => {
                              const letter = getOptionLabel(oIdx, isEnglish);
                              const isChecked = q.correctIndex === oIdx;
                              return (
                                <div key={oIdx} dir={isEnglish ? "ltr" : "rtl"} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`review-correct-${qIdx}`}
                                    checked={isChecked}
                                    onChange={() => {
                                      const nextQuestions = [...reviewingQuiz.questions];
                                      nextQuestions[qIdx] = { ...nextQuestions[qIdx], correctIndex: oIdx };
                                      setReviewingQuiz({ ...reviewingQuiz, questions: nextQuestions });
                                    }}
                                    className="h-4 w-4 accent-emerald-600 cursor-pointer shrink-0"
                                  />
                                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-[11px] font-black shrink-0">
                                    {letter}
                                  </span>
                                  <input
                                    type="text"
                                    dir={isEnglish ? "ltr" : "rtl"}
                                    value={opt}
                                    onChange={(e) => {
                                      const nextQuestions = [...reviewingQuiz.questions];
                                      const nextOpts = [...nextQuestions[qIdx].options];
                                      nextOpts[oIdx] = e.target.value;
                                      nextQuestions[qIdx] = { ...nextQuestions[qIdx], options: nextOpts };
                                      setReviewingQuiz({ ...reviewingQuiz, questions: nextQuestions });
                                    }}
                                    className={`flex-1 h-8 px-3 rounded-xl border text-xs font-bold bg-background ${
                                      isChecked ? "border-emerald-500/50 bg-emerald-500/5" : "border-border"
                                    } ${isEnglish ? "text-left font-sans" : "text-right font-sans"}`}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-muted-foreground">الدرجة:</label>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={q.points || 1}
                                onChange={(e) => {
                                  const nextQuestions = [...reviewingQuiz.questions];
                                  nextQuestions[qIdx] = { ...nextQuestions[qIdx], points: Number(e.target.value) };
                                  setReviewingQuiz({ ...reviewingQuiz, questions: nextQuestions });
                                }}
                                className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-bold text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-muted-foreground">التفسير:</label>
                              <input
                                type="text"
                                dir={isEnglish ? "ltr" : "rtl"}
                                value={q.explanation || ""}
                                onChange={(e) => {
                                  const nextQuestions = [...reviewingQuiz.questions];
                                  nextQuestions[qIdx] = { ...nextQuestions[qIdx], explanation: e.target.value };
                                  setReviewingQuiz({ ...reviewingQuiz, questions: nextQuestions });
                                }}
                                placeholder="خطوات الإجابة النموذجية..."
                                className={`w-full h-8 px-2 rounded-lg border border-border bg-background text-xs ${
                                  isEnglish ? "text-left font-sans" : "text-right font-sans"
                                }`}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setEditingQuizQuestionIdx(null)}
                              className="h-7 text-xs bg-primary text-white font-bold"
                            >
                              تم تعديل السؤال ✓
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p
                            dir={isEnglish ? "ltr" : "rtl"}
                            className={`text-xs font-bold text-foreground leading-relaxed whitespace-pre-line ${
                              isEnglish ? "text-left font-sans" : "text-right font-sans"
                            }`}
                          >
                            {q.prompt}
                          </p>

                          {q.imageUrl && (
                            <div className="max-w-xs rounded-xl overflow-hidden border border-border">
                              <img src={q.imageUrl} alt="صورة السؤال" className="h-32 w-full object-cover" />
                            </div>
                          )}

                          {/* Choices */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1" dir={isEnglish ? "ltr" : "rtl"}>
                            {(q.options || []).map((opt: string, oIdx: number) => {
                              const isCorrect = oIdx === q.correctIndex;
                              const letter = getOptionLabel(oIdx, isEnglish);
                              return (
                                <div
                                  key={oIdx}
                                  dir={isEnglish ? "ltr" : "rtl"}
                                  className={`p-2 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                                    isCorrect
                                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold"
                                      : "bg-muted/40 border-border text-foreground"
                                  }`}
                                >
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black mt-0.5 ${
                                      isCorrect ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
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

                          {/* Explanation */}
                          {q.explanation && (
                            <div
                              dir={isEnglish ? "ltr" : "rtl"}
                              className={`p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-primary space-y-0.5 ${
                                isEnglish ? "text-left font-sans" : "text-right font-sans"
                              }`}
                            >
                              <span className="font-bold block">
                                {isEnglish ? "Explanation / Steps:" : "التفسير / خطوات الإجابة:"}
                              </span>
                              <p className="text-foreground">{q.explanation}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 flex items-center justify-between p-4 border-t border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  disabled={isSavingQuizQuestions}
                  onClick={handleSaveReviewedQuizQuestions}
                  className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  {isSavingQuizQuestions ? "جارٍ حفظ التعديلات..." : "حفظ التعديلات على الاختبار 💾"}
                </Button>

                {!reviewingQuiz.isPublished && (
                  <Button
                    type="button"
                    onClick={async () => {
                      await handleSaveReviewedQuizQuestions();
                      await handlePublishQuiz(reviewingQuiz.id, true);
                    }}
                    className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm"
                  >
                    حفظ ونشر للطلاب الآن 🚀
                  </Button>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewingQuiz(null)}
                className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء وإغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CANDIDATE QUESTION PICKER MODAL                              */}
      {/* ============================================================ */}
      {candidatePickerModal && candidatePickerModal.open && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-5"
          onClick={(e) => e.target === e.currentTarget && setCandidatePickerModal(null)}
        >
          <div className="w-full max-w-3xl bg-card rounded-3xl shadow-2xl border border-border text-right max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    اختيار سؤال بديل من بنك الأسئلة
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    اختر السؤال البديل المناسب لاستبداله بالسؤال رقم {(candidatePickerModal.questionIndex ?? 0) + 1}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCandidatePickerModal(null)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-border bg-card">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث في نص الأسئلة أو الاختيارات البديلة..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full h-10 pr-9 pl-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Candidates List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loadingCandidates ? (
                <div className="p-12 text-center text-muted-foreground text-xs font-bold flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span>جارٍ جلب الأسئلة البديلة المتوفرة في البنك...</span>
                </div>
              ) : (() => {
                const filtered = candidateQuestions.filter((c: any) => {
                  if (!candidateSearch.trim()) return true;
                  const s = candidateSearch.trim().toLowerCase();
                  const inPrompt = String(c.question?.prompt || "").toLowerCase().includes(s);
                  const inOpts = (c.question?.options || []).some((o: string) => String(o).toLowerCase().includes(s));
                  const inLesson = String(c.lesson || "").toLowerCase().includes(s);
                  return inPrompt || inOpts || inLesson;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-12 text-center text-muted-foreground text-xs font-bold border border-dashed border-border rounded-2xl">
                      {candidateQuestions.length === 0
                        ? "لا توجد أسئلة بديلة إضافية غير مستخدمة في بنك الأسئلة لهذا النطاق."
                        : "لا توجد نتائج مطابقة لبحثك."}
                    </div>
                  );
                }

                return filtered.map((c: any) => {
                  const isEng = isEnglishQuestion(c.question?.prompt, c.question?.options);
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-border bg-muted/20 hover:border-primary/50 hover:bg-card transition-all p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/40 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                            {c.lesson || c.stage || "عام"}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            c.difficulty === "easy"
                              ? "bg-emerald-500/15 text-emerald-600"
                              : c.difficulty === "hard"
                              ? "bg-rose-500/15 text-rose-600"
                              : "bg-amber-500/15 text-amber-600"
                          }`}>
                            {c.difficulty === "easy" ? "سهل" : c.difficulty === "hard" ? "صعب" : "متوسط"}
                          </span>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handlePickCandidateQuestion(c)}
                          className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs cursor-pointer shadow-xs gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>اختيار هذا السؤال كبديل 🎯</span>
                        </Button>
                      </div>

                      <p
                        dir={isEng ? "ltr" : "rtl"}
                        className={`text-xs font-bold text-foreground leading-relaxed ${
                          isEng ? "text-left font-sans" : "text-right font-sans"
                        }`}
                      >
                        {c.question?.prompt}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1" dir={isEng ? "ltr" : "rtl"}>
                        {(c.question?.options || []).map((opt: string, optIdx: number) => {
                          const isCorr = optIdx === c.question?.correctIndex;
                          const lbl = getOptionLabel(optIdx, isEng);
                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                                isCorr
                                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold"
                                  : "bg-background border-border text-foreground"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black mt-0.5 ${
                                  isCorr ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {lbl}
                              </span>
                              <span className={`flex-1 whitespace-normal break-words leading-relaxed ${isEng ? "text-left font-sans" : "text-right"}`}>
                                {opt}
                              </span>
                              {isCorr && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
