import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  Layers,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Shuffle,
  Sparkles,
  Trash2,
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
} from "./types";

const LAST_STAGE_STORAGE_KEY = "dr_mahmoud_express_exam_last_stage";

type PresetId = "quiz" | "homework" | "unit_exam" | "comprehensive";
type SingleQuestionType = "mcq" | "true_false" | "essay";

interface PresetConfig {
  id: PresetId;
  label: string;
  subtitle: string;
  count: number;
  durationMinutes: number;
  maxAttempts: number;
  passingScore: number;
  isHomework: boolean;
  shuffleQuestions: boolean;
  isPublished: boolean;
  preferUnitScope: boolean;
}

const PRESETS: PresetConfig[] = [
  {
    id: "quiz",
    label: "⚡ كويز درس",
    subtitle: "10 أسئلة · 15 دقيقة",
    count: 10,
    durationMinutes: 15,
    maxAttempts: 2,
    passingScore: 60,
    isHomework: false,
    shuffleQuestions: true,
    isPublished: true,
    preferUnitScope: false,
  },
  {
    id: "homework",
    label: "📝 واجب منزلي",
    subtitle: "15 سؤال · 30 دقيقة",
    count: 15,
    durationMinutes: 30,
    maxAttempts: 3,
    passingScore: 50,
    isHomework: true,
    shuffleQuestions: true,
    isPublished: true,
    preferUnitScope: false,
  },
  {
    id: "unit_exam",
    label: "🎯 امتحان وحدة",
    subtitle: "25 سؤال · 30 دقيقة",
    count: 25,
    durationMinutes: 30,
    maxAttempts: 1,
    passingScore: 60,
    isHomework: false,
    shuffleQuestions: true,
    isPublished: true,
    preferUnitScope: true,
  },
  {
    id: "comprehensive",
    label: "🏆 مراجعة شاملة",
    subtitle: "40 سؤال · 60 دقيقة",
    count: 40,
    durationMinutes: 60,
    maxAttempts: 1,
    passingScore: 60,
    isHomework: false,
    shuffleQuestions: true,
    isPublished: true,
    preferUnitScope: true,
  },
];

const QUICK_COUNTS = [5, 10, 15, 20, 25, 30, 40];

async function defaultAdminApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الطلب");
  return data;
}

export interface ExpressExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminApi?: AdminApiFn;
  treeData?: StageNode[];
  initialStage?: string;
  initialUnit?: string;
  initialLesson?: string;
  onCreated?: (quiz: any) => void;
}

export function ExpressExamModal({
  isOpen,
  onClose,
  adminApi = defaultAdminApi,
  treeData: externalTreeData,
  initialStage,
  initialUnit,
  initialLesson,
  onCreated,
}: ExpressExamModalProps) {
  const { toast } = useToast();

  // Tree state (uses externalTreeData if provided, otherwise fetches on open)
  const [internalTree, setInternalTree] = useState<StageNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);

  const treeData = useMemo(() => {
    return externalTreeData && externalTreeData.length > 0 ? externalTreeData : internalTree;
  }, [externalTreeData, internalTree]);

  useEffect(() => {
    if (!isOpen) return;
    if (externalTreeData && externalTreeData.length > 0) return;
    let cancelled = false;
    setLoadingTree(true);
    adminApi<TreeResponse>("/api/admin/learning/test-bank/tree")
      .then((res) => {
        if (!cancelled) setInternalTree(res.tree || []);
      })
      .catch((err: any) => {
        if (!cancelled) {
          toast({ variant: "destructive", description: err.message || "تعذر تحميل شجرة بنك الأسئلة" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTree(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, externalTreeData]);

  // Modal view state: "builder" | "preview" | "done"
  const [view, setView] = useState<"builder" | "preview" | "done">("builder");

  // Active preset & fields
  const [activePreset, setActivePreset] = useState<PresetId>("quiz");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedLessons, setSelectedLessons] = useState<Array<{ unit: string; lesson: string }>>([]);
  const [selectedTypes, setSelectedTypes] = useState<SingleQuestionType[]>([]);
  const [questionsCount, setQuestionsCount] = useState<number>(10);
  const [title, setTitle] = useState<string>("");
  const [isTitleCustomized, setIsTitleCustomized] = useState<boolean>(false);

  const isLessonSelected = (unitName: string, lessonName: string) =>
    selectedLessons.some((s) => s.unit === unitName && s.lesson === lessonName);

  // Advanced settings (collapsed by default)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isHomework, setIsHomework] = useState<boolean>(false);
  const [useTimer, setUseTimer] = useState<boolean>(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [openHours, setOpenHours] = useState<number | null>(24);
  const [passingScore, setPassingScore] = useState<number>(60);
  const [maxAttempts, setMaxAttempts] = useState<number>(2);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [isPublished, setIsPublished] = useState<boolean>(true);

  // Action states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [createdQuiz, setCreatedQuiz] = useState<any | null>(null);
  const [notifyingStudents, setNotifyingStudents] = useState<boolean>(false);
  const [notifiedCount, setNotifiedCount] = useState<number | null>(null);

  // Initialize stage / unit / lesson when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setView("builder");
    setCreatedQuiz(null);
    setNotifiedCount(null);
    setPreviewQuestions([]);
    setIsTitleCustomized(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || treeData.length === 0) return;

    const savedStage =
      typeof window !== "undefined" ? window.localStorage.getItem(LAST_STAGE_STORAGE_KEY) : null;
    const targetStage =
      (initialStage && treeData.some((s) => s.stage === initialStage) ? initialStage : "") ||
      (savedStage && treeData.some((s) => s.stage === savedStage) ? savedStage : "") ||
      treeData[0]?.stage ||
      "";

    setSelectedStage((prev) => (prev && treeData.some((s) => s.stage === prev) ? prev : targetStage));
  }, [isOpen, treeData, initialStage]);

  // Apply initial unit & lesson if passed from Explorer
  useEffect(() => {
    if (!isOpen || !selectedStage) return;
    const st = treeData.find((s) => s.stage === selectedStage);
    if (!st) return;

    if (initialUnit && st.units.some((u) => u.unit === initialUnit)) {
      setSelectedUnit(initialUnit);
      if (initialLesson && initialLesson !== "all") {
        setSelectedLessons([{ unit: initialUnit, lesson: initialLesson }]);
      } else {
        setSelectedLessons([]);
      }
    } else if (st.units.length > 0 && selectedUnit !== "all" && !st.units.some((u) => u.unit === selectedUnit)) {
      setSelectedUnit("all");
      setSelectedLessons([]);
    }
  }, [isOpen, selectedStage, initialUnit, initialLesson, treeData]);

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

  const selectedCountByUnit = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of selectedLessons) {
      counts.set(s.unit, (counts.get(s.unit) || 0) + 1);
    }
    return counts;
  }, [selectedLessons]);

  // Active lessons pool: if specific lessons are selected across ANY units, use them; otherwise whole current unit or whole stage
  const activeLessonsPool = useMemo<LessonNode[]>(() => {
    if (!currentStageNode) return [];
    if (selectedLessons.length > 0) {
      const keySet = new Set(selectedLessons.map((s) => `${s.unit}:::${s.lesson}`));
      const matched: LessonNode[] = [];
      for (const u of sortedUnits) {
        for (const l of u.lessons) {
          if (keySet.has(`${u.unit}:::${l.lesson}`)) {
            matched.push(l);
          }
        }
      }
      return matched;
    }
    if (selectedUnit === "all") {
      return sortedUnits.flatMap((u) => u.lessons);
    }
    if (!currentUnitNode) return [];
    return sortedLessons;
  }, [currentStageNode, selectedUnit, sortedUnits, currentUnitNode, selectedLessons, sortedLessons]);

  const typeCounts = useMemo(() => {
    let mcq = 0;
    let tf = 0;
    let essay = 0;
    let totalObj = 0;
    for (const l of activeLessonsPool) {
      const m = l.mcqCount ?? l.totalQuestions ?? 0;
      const t = l.tfCount ?? 0;
      const e = l.totalEssays ?? 0;
      mcq += m;
      tf += t;
      essay += e;
      totalObj += l.totalQuestions || 0;
    }
    return {
      all: totalObj + essay,
      mcq,
      true_false: tf,
      essay,
    };
  }, [activeLessonsPool]);

  const availableForSelectedType = useMemo(() => {
    if (selectedTypes.length === 0) return typeCounts.all;
    return selectedTypes.reduce((sum, t) => sum + (typeCounts[t] || 0), 0);
  }, [selectedTypes, typeCounts]);

  const handleToggleQuestionType = (t: SingleQuestionType) => {
    setSelectedTypes((prev) => {
      const exists = prev.includes(t);
      const next = exists ? prev.filter((x) => x !== t) : [...prev, t];
      return next;
    });
  };

  // Auto-generate smart title whenever selection changes (supports cross-unit lessons!)
  useEffect(() => {
    if (isTitleCustomized) return;
    const prefix = isHomework ? "واجب منزلي" : activePreset === "quiz" ? "كويز سريع" : "امتحان";
    if (selectedLessons.length > 0) {
      const distinctUnits = Array.from(new Set(selectedLessons.map((s) => s.unit)));
      if (selectedLessons.length === 1) {
        setTitle(`${prefix}: ${selectedLessons[0].lesson}`);
      } else if (distinctUnits.length === 1) {
        setTitle(`${prefix} على ${selectedLessons.length} دروس (${distinctUnits[0]})`);
      } else {
        setTitle(`${prefix} مجمّع على ${selectedLessons.length} دروس (${distinctUnits.length} وحدات)`);
      }
      return;
    }
    if (selectedUnit === "all") {
      setTitle(`${prefix} شامل على المرحلة`);
      return;
    }
    setTitle(`${prefix} شامل: ${selectedUnit}`);
  }, [isHomework, activePreset, selectedUnit, selectedLessons, isTitleCustomized]);

  const handleApplyPreset = (preset: PresetConfig) => {
    setActivePreset(preset.id);
    setQuestionsCount(preset.count);
    setDurationMinutes(preset.durationMinutes);
    setMaxAttempts(preset.maxAttempts);
    setPassingScore(preset.passingScore);
    setIsHomework(preset.isHomework);
    setShuffleQuestions(preset.shuffleQuestions);
    setIsPublished(preset.isPublished);
    if (preset.id === "comprehensive") {
      setSelectedUnit("all");
      setSelectedLessons([]);
    } else if (preset.preferUnitScope) {
      setSelectedLessons([]);
    }
  };

  const handleStageChange = (stage: string) => {
    setSelectedStage(stage);
    setSelectedUnit("all");
    setSelectedLessons([]);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_STAGE_STORAGE_KEY, stage);
    }
  };

  const handleToggleLesson = (unitName: string, lessonName: string) => {
    setSelectedLessons((prev) =>
      prev.some((s) => s.unit === unitName && s.lesson === lessonName)
        ? prev.filter((s) => !(s.unit === unitName && s.lesson === lessonName))
        : [...prev, { unit: unitName, lesson: lessonName }]
    );
  };

  const handleSelectAllInUnit = (unitName: string, unitLessons: LessonNode[]) => {
    setSelectedLessons((prev) => {
      const next = [...prev];
      for (const l of unitLessons) {
        if (!next.some((s) => s.unit === unitName && s.lesson === l.lesson)) {
          next.push({ unit: unitName, lesson: l.lesson });
        }
      }
      return next;
    });
  };

  const handleClearUnitLessons = (unitName: string) => {
    setSelectedLessons((prev) => prev.filter((s) => s.unit !== unitName));
  };

  const buildRequestPayload = (customQuestions?: any[]) => {
    const hasCustomLessons = selectedLessons.length > 0;
    const distinctUnits = Array.from(new Set(selectedLessons.map((s) => s.unit)));
    const isWholeStage = !hasCustomLessons && selectedUnit === "all";
    const isWholeUnit = !hasCustomLessons && selectedUnit !== "all";
    const isSingleLesson = selectedLessons.length === 1;
    const isMultiLesson = selectedLessons.length > 1;
    const resolvedUnit = hasCustomLessons
      ? (distinctUnits.length === 1 ? distinctUnits[0] : undefined)
      : (selectedUnit !== "all" ? selectedUnit : undefined);

    const scope = isHomework
      ? "homework"
      : isWholeStage || distinctUnits.length > 1
      ? "stage"
      : isWholeUnit
      ? "unit"
      : "lesson";

    return {
      title: title.trim() || "امتحان سريع",
      stage: selectedStage,
      unit: resolvedUnit,
      scope,
      lesson: isSingleLesson ? selectedLessons[0].lesson : undefined,
      lessons: isMultiLesson ? selectedLessons.map((s) => s.lesson) : undefined,
      lessonScopes: hasCustomLessons ? selectedLessons : undefined,
      count: customQuestions ? customQuestions.length : Math.max(1, Number(questionsCount) || 10),
      questionType: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
      questionTypes: selectedTypes.length > 0 && selectedTypes.length < 3 ? selectedTypes : undefined,
      durationMinutes: useTimer ? Math.max(5, Number(durationMinutes) || 30) : null,
      openHours: isHomework ? null : openHours,
      passingScore: Math.max(10, Math.min(100, Number(passingScore) || 60)),
      maxAttempts: Math.max(1, Number(maxAttempts) || 1),
      shuffleQuestions,
      isPublished,
      isHomework,
      ...(customQuestions ? { customQuestions } : {}),
    };
  };

  // Instant 1-click generate & publish
  const handleInstantCreate = async () => {
    if (!selectedStage) {
      toast({ variant: "destructive", description: "اختر المرحلة الدراسية أولاً" });
      return;
    }
    if (availableForSelectedType === 0) {
      toast({
        variant: "destructive",
        title: "لا توجد أسئلة متاحة",
        description: "لا توجد أسئلة من النوع المختار في هذا النطاق. جرّب تغيير النوع أو اختيار دروس أخرى.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildRequestPayload();
      const res = await adminApi<any>("/api/admin/learning/test-bank/generate-exam", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const quiz = res.quiz || res;
      setCreatedQuiz(quiz);
      setView("done");
      toast({
        title: isPublished ? "تم إنشاء ونشر الامتحان بنجاح 🚀" : "تم حفظ الامتحان كمسودة بنجاح 📝",
        description: `"${quiz.title}" — ${quiz.questions?.length || res.actualCount || questionsCount} سؤال`,
      });
      onCreated?.(quiz);
    } catch (err: any) {
      toast({ variant: "destructive", title: "تعذر إنشاء الامتحان", description: err.message || "حاول مرة أخرى" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch preview questions
  const handleOpenPreview = async () => {
    if (!selectedStage) {
      toast({ variant: "destructive", description: "اختر المرحلة الدراسية أولاً" });
      return;
    }
    if (availableForSelectedType === 0) {
      toast({ variant: "destructive", description: "لا توجد أسئلة متاحة من النوع المختار في هذا النطاق" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildRequestPayload();
      const res = await adminApi<{ questions: any[] }>("/api/admin/learning/test-bank/preview-exam", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.questions || res.questions.length === 0) {
        throw new Error("لم يتم العثور على أسئلة تطابق اختيارك");
      }
      setPreviewQuestions(res.questions);
      setView("preview");
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر جلب المعاينة" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm & publish from preview
  const handlePublishPreview = async () => {
    if (previewQuestions.length === 0) {
      toast({ variant: "destructive", description: "لا توجد أسئلة متبقية للنشر" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = buildRequestPayload(previewQuestions);
      const res = await adminApi<any>("/api/admin/learning/test-bank/generate-exam", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const quiz = res.quiz || res;
      setCreatedQuiz(quiz);
      setView("done");
      toast({
        title: isPublished ? "تم نشر الامتحان للطلاب بنجاح 🚀" : "تم حفظ الامتحان كمسودة 📝",
        description: `"${quiz.title}" — ${previewQuestions.length} سؤال`,
      });
      onCreated?.(quiz);
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر نشر الامتحان" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Notify stage students inside the platform (1-click)
  const handleNotifyStageStudents = async () => {
    if (!createdQuiz || !selectedStage) return;
    setNotifyingStudents(true);
    try {
      const qCount = createdQuiz.questions?.length || questionsCount;
      const res = await adminApi<{ count?: number }>("/api/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title: isHomework ? `واجب جديد: ${createdQuiz.title}` : `امتحان جديد: ${createdQuiz.title}`,
          message: `نزل ليك دلوقتي "${createdQuiz.title}" (${qCount} سؤال). ادخل على تبويب الامتحانات وحلّه!`,
          type: "info",
          targetGrade: selectedStage,
        }),
      });
      setNotifiedCount(res.count ?? 0);
      toast({
        title: "تم إرسال الإشعار للطلاب بنجاح 🔔",
        description: `وصل الإشعار لـ ${res.count ?? 0} طالب في المرحلة.`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", description: err.message || "تعذر إرسال الإشعار" });
    } finally {
      setNotifyingStudents(false);
    }
  };

  const handleCopyAnnouncement = () => {
    if (!createdQuiz) return;
    const qCount = createdQuiz.questions?.length || questionsCount;
    const text = [
      isHomework ? `📝 واجب جديد على المنصة:` : `⚡ امتحان جديد نزل على المنصة:`,
      `📌 ${createdQuiz.title}`,
      `🎓 المرحلة: ${selectedStage}`,
      `📊 عدد الأسئلة: ${qCount} سؤال${!isHomework ? (openHours ? ` · متاح لمدة ${openHours} ساعة (بدون مؤقت)` : " · مفتوح بدون مؤقت") : ""}`,
      `🔗 ادخل دلوقتي وحلّه: https://drelmahdy.com/platform`,
    ].join("\n");
    navigator.clipboard?.writeText(text);
    toast({ title: "تم نسخ إعلان الامتحان 📋" });
  };

  const handleResetForAnother = () => {
    setCreatedQuiz(null);
    setNotifiedCount(null);
    setPreviewQuestions([]);
    setIsTitleCustomized(false);
    setView("builder");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-xs p-2.5 sm:p-4 animate-in fade-in duration-150"
      dir="rtl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl max-h-[93vh] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-card shadow-2xl overflow-hidden text-right">
        {/* Top Header (Flat Solid Surface) */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-slate-900 dark:bg-[#0D1626] text-white">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-300">
              <Zap className="h-5 w-5 fill-amber-400" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                <span>المنشئ السريع للامتحانات</span>
                {view === "preview" && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-amber-200">
                    معاينة ({previewQuestions.length} سؤال)
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-300 truncate">
                اختر الوحدة والدرس ونوع وعدد الأسئلة بحريتك — وانشر في ضغطة واحدة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            title="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loadingTree ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
              <p className="text-xs font-bold">جارٍ تجهيز بنك الأسئلة...</p>
            </div>
          ) : view === "builder" ? (
            <>
              {/* 1. Quick Presets Row */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-muted-foreground">
                  1) قالب سريع (اختياري — وتقدر تعدّل أي رقم براحتك):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESETS.map((p) => {
                    const active = activePreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className={`text-right rounded-2xl border px-3 py-2.5 transition-all cursor-pointer ${
                          active
                            ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-xs"
                            : "border-border bg-background hover:border-amber-400/50 hover:bg-muted/30"
                        }`}
                      >
                        <div className="text-xs font-black text-foreground">{p.label}</div>
                        <div className="text-[10px] font-bold text-muted-foreground mt-0.5">{p.subtitle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Stage + Unit + Lessons Selector */}
              <div className="rounded-2xl border border-border bg-muted/20 p-3.5 sm:p-4 space-y-3.5">
                {/* Stage */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-xs font-black text-foreground shrink-0 sm:w-20">المرحلة:</label>
                  <select
                    value={selectedStage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {treeData.map((s) => (
                      <option key={s.stage} value={s.stage}>
                        {s.stage} ({s.totalQuestions + (s.totalEssays || 0)} سؤال)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Units Pills */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-amber-600" />
                      <span>الوحدة (تقدر تتنقل بين الوحدات وتجمع دروس من أي وحدة):</span>
                    </label>
                    {selectedLessons.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedLessons([])}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        مسح الدروس المختارة ({selectedLessons.length})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedUnit("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        selectedUnit === "all"
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      كل الوحدات ({(currentStageNode?.totalQuestions || 0) + (currentStageNode?.totalEssays || 0)})
                    </button>
                    {sortedUnits.map((u) => {
                      const active = selectedUnit === u.unit;
                      const uCount = (u.totalQuestions || 0) + (u.totalEssays || 0);
                      const pickedInUnit = selectedCountByUnit.get(u.unit) || 0;
                      return (
                        <button
                          key={u.unit}
                          type="button"
                          onClick={() => setSelectedUnit(u.unit)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            active
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500"
                              : pickedInUnit > 0
                              ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                              : "bg-background border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          <span>{u.unit}</span>
                          <span className="opacity-75 font-mono">({uCount})</span>
                          {pickedInUnit > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black font-mono">
                              ✓ {pickedInUnit}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Cross-Unit Lessons Summary Strip */}
                {selectedLessons.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                        الدروس المختارة للامتحان ({selectedLessons.length} درس من {selectedCountByUnit.size} {selectedCountByUnit.size === 1 ? "وحدة" : "وحدات"}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedLessons([])}
                        className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        مسح الكل
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-0.5">
                      {selectedLessons.map((s) => (
                        <button
                          key={`${s.unit}:::${s.lesson}`}
                          type="button"
                          onClick={() => handleToggleLesson(s.unit, s.lesson)}
                          title={`${s.unit} — اضغط لإزالة هذا الدرس`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-[10.5px] font-bold hover:bg-rose-500/15 hover:border-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition cursor-pointer"
                        >
                          <span>{s.lesson}</span>
                          {selectedCountByUnit.size > 1 && (
                            <span className="opacity-70 text-[9.5px]">({s.unit.split(":")[0]})</span>
                          )}
                          <X className="h-3 w-3 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lessons Multi-Select Chips (Single Unit OR All Units Grouped) */}
                {currentUnitNode && sortedLessons.length > 0 ? (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                        <span>دروس {currentUnitNode.unit} (اضغط لإضافة أو إزالة):</span>
                      </label>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleSelectAllInUnit(currentUnitNode.unit, sortedLessons)}
                          className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                        >
                          تحديد كل دروس هذه الوحدة
                        </button>
                        {(selectedCountByUnit.get(currentUnitNode.unit) || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearUnitLessons(currentUnitNode.unit)}
                            className="text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
                          >
                            إلغاء دروس هذه الوحدة
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto py-0.5">
                      {sortedLessons.map((l) => {
                        const checked = isLessonSelected(currentUnitNode.unit, l.lesson);
                        const lCount = (l.totalQuestions || 0) + (l.totalEssays || 0);
                        return (
                          <button
                            key={l.lesson}
                            type="button"
                            onClick={() => handleToggleLesson(currentUnitNode.unit, l.lesson)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                              checked
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-background border-border text-foreground hover:border-emerald-400"
                            }`}
                          >
                            {checked && <Check className="h-3 w-3 shrink-0" />}
                            <span>{l.lesson}</span>
                            <span className={`font-mono text-[10px] ${checked ? "text-emerald-100" : "text-muted-foreground"}`}>
                              ({lCount})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : selectedUnit === "all" && sortedUnits.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                        <span>أو اختر دروسًا محددة مباشرة من جميع الوحدات:</span>
                      </label>
                      {selectedLessons.length === 0 && (
                        <span className="text-[10px] font-bold text-emerald-600">
                          الوضع الحالي: شامل كل دروس المرحلة ({sortedUnits.reduce((acc, u) => acc + u.lessons.length, 0)} درس)
                        </span>
                      )}
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-2 pr-0.5">
                      {sortedUnits.map((u) => {
                        const uLessons = [...u.lessons].sort(
                          (a, b) => parseLessonSortOrder(a.lesson) - parseLessonSortOrder(b.lesson),
                        );
                        return (
                          <div key={u.unit} className="space-y-1">
                            <div className="flex items-center justify-between text-[10.5px] font-black text-muted-foreground">
                              <span>{u.unit}</span>
                              <button
                                type="button"
                                onClick={() => handleSelectAllInUnit(u.unit, uLessons)}
                                className="text-emerald-600 hover:underline cursor-pointer"
                              >
                                + تحديد الوحدة
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {uLessons.map((l) => {
                                const checked = isLessonSelected(u.unit, l.lesson);
                                const lCount = (l.totalQuestions || 0) + (l.totalEssays || 0);
                                return (
                                  <button
                                    key={`${u.unit}:::${l.lesson}`}
                                    type="button"
                                    onClick={() => handleToggleLesson(u.unit, l.lesson)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                                      checked
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                        : "bg-background border-border text-foreground hover:border-emerald-400"
                                    }`}
                                  >
                                    {checked && <Check className="h-3 w-3 shrink-0" />}
                                    <span>{l.lesson}</span>
                                    <span className={`font-mono text-[10px] ${checked ? "text-emerald-100" : "text-muted-foreground"}`}>
                                      ({lCount})
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Question Type & Count (Full Freedom Side-by-Side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Question Type (Multi-Select) */}
                <div className="rounded-2xl border border-border bg-background p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-black text-foreground">نوع الأسئلة (تقدر تختار أكتر من نوع):</label>
                    {selectedTypes.length > 0 && (
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300">
                        محدد {selectedTypes.length}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={typeCounts.all === 0}
                      onClick={() => setSelectedTypes([])}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs font-bold transition ${
                        typeCounts.all === 0
                          ? "opacity-40 cursor-not-allowed bg-muted/40 border-border"
                          : selectedTypes.length === 0
                          ? "border-violet-600 bg-violet-600/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/30 cursor-pointer"
                          : "border-border bg-card hover:bg-muted/40 text-foreground cursor-pointer"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {selectedTypes.length === 0 && <Check className="h-3 w-3 shrink-0" />}
                        <span>الكل (مختلط)</span>
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                        {typeCounts.all}
                      </span>
                    </button>
                    {(
                      [
                        { id: "mcq", label: "اختيار من متعدد", count: typeCounts.mcq },
                        { id: "true_false", label: "صح / خطأ", count: typeCounts.true_false },
                        { id: "essay", label: "مقالي", count: typeCounts.essay },
                      ] as const
                    ).map((opt) => {
                      const active = selectedTypes.includes(opt.id);
                      const disabled = opt.count === 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleToggleQuestionType(opt.id)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-xs font-bold transition ${
                            disabled
                              ? "opacity-40 cursor-not-allowed bg-muted/40 border-border"
                              : active
                              ? "border-violet-600 bg-violet-600/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/30 cursor-pointer"
                              : "border-border bg-card hover:bg-muted/40 text-foreground cursor-pointer"
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {active && <Check className="h-3 w-3 shrink-0" />}
                            <span>{opt.label}</span>
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {opt.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question Count */}
                <div className="rounded-2xl border border-border bg-background p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-foreground">عدد الأسئلة:</label>
                    <span
                      className={`text-[11px] font-black font-mono ${
                        availableForSelectedType === 0
                          ? "text-rose-600"
                          : questionsCount > availableForSelectedType
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      المتاح: {availableForSelectedType} سؤال
                    </span>
                  </div>

                  {/* Quick number chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_COUNTS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQuestionsCount(n)}
                        className={`h-8 min-w-[38px] px-2 rounded-lg text-xs font-black font-mono border transition cursor-pointer ${
                          questionsCount === n
                            ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                            : "bg-card border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    {availableForSelectedType > 0 && (
                      <button
                        type="button"
                        onClick={() => setQuestionsCount(availableForSelectedType)}
                        className={`h-8 px-2.5 rounded-lg text-[11px] font-black border transition cursor-pointer ${
                          questionsCount === availableForSelectedType
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-card border-border text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        الكل ({availableForSelectedType})
                      </button>
                    )}
                  </div>

                  {/* Custom stepper input */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setQuestionsCount((c) => Math.max(1, c - 1))}
                      className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted grid place-items-center cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(200, availableForSelectedType)}
                      value={questionsCount}
                      onChange={(e) => setQuestionsCount(Math.max(1, Number(e.target.value) || 1))}
                      className="flex-1 h-9 rounded-xl border border-border bg-card text-center text-sm font-black font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setQuestionsCount((c) => c + 1)}
                      className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted grid place-items-center cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {questionsCount > availableForSelectedType && availableForSelectedType > 0 && (
                    <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>هيتم سحب كل المتاح ({availableForSelectedType} سؤال).</span>
                    </p>
                  )}
                </div>
              </div>

              {/* 4. Smart Title + Collapsible Advanced Settings */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-xs font-black text-foreground shrink-0 sm:w-24">عنوان الامتحان:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setIsTitleCustomized(true);
                    }}
                    placeholder="اكتب عنوان الامتحان..."
                    className="flex-1 h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="rounded-2xl border border-border bg-muted/15 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2 flex-wrap">
                      <span>إعدادات متقدمة:</span>
                      <span className="text-[11px] font-mono text-foreground">
                        {isHomework
                          ? `واجب (${useTimer ? `${durationMinutes}د` : "بدون مؤقت"})`
                          : `${openHours ? `مفتوح ${openHours}س` : "مفتوح دائماً"} · ${useTimer ? `مؤقت ${durationMinutes}د` : "بدون مؤقت"}`}
                        {" · "}نجاح {passingScore}% · {maxAttempts} محاولة · {isPublished ? "نشر فوري" : "مسودة"}
                      </span>
                    </span>
                    {showAdvanced ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                  </button>

                  {showAdvanced && (
                    <div className="px-3.5 pb-3.5 pt-2 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> ساعات الإتاحة (0=دائماً)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={720}
                          disabled={isHomework}
                          value={isHomework ? "" : (openHours ?? 0)}
                          placeholder={isHomework ? "دائماً" : "24"}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setOpenHours(v > 0 ? Math.min(720, v) : null);
                          }}
                          className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-center disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">درجة النجاح %</label>
                        <input
                          type="number"
                          min={10}
                          max={100}
                          value={passingScore}
                          onChange={(e) => setPassingScore(Number(e.target.value) || 60)}
                          className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">عدد المحاولات</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={maxAttempts}
                          onChange={(e) => setMaxAttempts(Number(e.target.value) || 1)}
                          className="w-full h-9 px-2.5 rounded-xl border border-border bg-background text-xs font-bold text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground">حالة النشر</label>
                        <select
                          value={isPublished ? "publish" : "draft"}
                          onChange={(e) => setIsPublished(e.target.value === "publish")}
                          className="w-full h-9 px-2 rounded-xl border border-border bg-background text-xs font-bold cursor-pointer"
                        >
                          <option value="publish">نشر فوراً 🚀</option>
                          <option value="draft">حفظ كمسودة 🔒</option>
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-4 flex flex-wrap items-center gap-4 pt-1">
                        <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!useTimer}
                            onChange={(e) => setUseTimer(!e.target.checked)}
                            className="h-4 w-4 accent-emerald-600 rounded cursor-pointer"
                          />
                          <span>بدون مؤقت زمني أثناء الحل (موصى به)</span>
                        </label>
                        {useTimer && (
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold">
                            <span>مؤقت المحاولة:</span>
                            <input
                              type="number"
                              min={5}
                              max={240}
                              value={durationMinutes}
                              onChange={(e) => setDurationMinutes(Number(e.target.value) || 30)}
                              className="w-16 h-7 px-2 rounded-lg border border-border bg-background text-xs font-bold text-center"
                            />
                            <span>دقيقة</span>
                          </div>
                        )}
                        <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={shuffleQuestions}
                            onChange={(e) => setShuffleQuestions(e.target.checked)}
                            className="h-4 w-4 accent-amber-500 rounded cursor-pointer"
                          />
                          <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>خلط ترتيب الأسئلة لكل طالب</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isHomework}
                            onChange={(e) => setIsHomework(e.target.checked)}
                            className="h-4 w-4 accent-amber-500 rounded cursor-pointer"
                          />
                          <span>تعيين كواجب منزلي (بدون عداد وقت ضاغط)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : view === "preview" ? (
            /* Preview View */
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/20 px-4 py-2.5">
                <div className="text-xs font-black text-foreground">
                  {title} · <span className="text-emerald-600 font-mono">{previewQuestions.length} سؤال</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={handleOpenPreview}
                    className="h-8 text-xs font-bold cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ml-1 ${isSubmitting ? "animate-spin" : ""}`} />
                    تبديل الأسئلة عشوائياً
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setView("builder")}
                    className="h-8 text-xs font-bold cursor-pointer"
                  >
                    تعديل الاختيارات
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                {previewQuestions.map((q, idx) => {
                  const isEn = isEnglishQuestion(q.prompt, q.options);
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-border bg-background p-3.5 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start gap-2" dir={isEn ? "ltr" : "rtl"}>
                          <span className="h-6 w-6 rounded-lg bg-slate-900 text-white text-[11px] font-black grid place-items-center shrink-0">
                            {idx + 1}
                          </span>
                          <p className={`text-xs font-bold text-foreground leading-relaxed ${isEn ? "text-left" : "text-right"}`}>
                            {q.prompt}
                          </p>
                        </div>
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-8" dir={isEn ? "ltr" : "rtl"}>
                            {q.options.map((opt: string, oi: number) => {
                              const isCorrect = q.correctIndex === oi;
                              return (
                                <div
                                  key={oi}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                    isCorrect
                                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                      : "border-border/60 bg-muted/20 text-muted-foreground"
                                  }`}
                                >
                                  <span className="font-black ml-1">{getOptionLabel(oi, isEn)})</span> {opt}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewQuestions((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        title="حذف هذا السؤال من الامتحان"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Done / Success View */
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 grid place-items-center">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-lg font-black text-foreground">
                  {isPublished ? "الامتحان جاهز ونُشر للطلاب! 🚀" : "تم حفظ الامتحان كمسودة! 📝"}
                </h4>
                <p className="text-xs font-bold text-muted-foreground">
                  {createdQuiz?.title} · {createdQuiz?.questions?.length || questionsCount} سؤال · {selectedStage}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                {isPublished && (
                  <Button
                    type="button"
                    disabled={notifyingStudents || notifiedCount !== null}
                    onClick={handleNotifyStageStudents}
                    className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer"
                  >
                    {notifyingStudents ? (
                      <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
                    ) : (
                      <Bell className="h-4 w-4 ml-1.5" />
                    )}
                    {notifiedCount !== null
                      ? `تم إرسال الإشعار لـ ${notifiedCount} طالب ✓`
                      : "إبلاغ طلاب المرحلة داخل المنصة"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyAnnouncement}
                  className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Copy className="h-4 w-4 ml-1.5" />
                  نسخ إعلان الامتحان
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetForAnother}
                  className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 ml-1.5 text-amber-500" />
                  عمل امتحان تاني
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!loadingTree && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-border bg-muted/20">
            {view === "builder" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting || availableForSelectedType === 0}
                  onClick={handleOpenPreview}
                  className="h-11 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Eye className="h-4 w-4 ml-1.5" />
                  معاينة الأسئلة أولاً
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting || availableForSelectedType === 0}
                  onClick={handleInstantCreate}
                  className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 ml-1.5 fill-slate-950" />
                  )}
                  {isPublished ? "إنشاء ونشر الامتحان فوراً" : "حفظ الامتحان كمسودة"}
                </Button>
              </>
            ) : view === "preview" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setView("builder")}
                  className="h-11 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  رجوع للتعديل
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting || previewQuestions.length === 0}
                  onClick={handlePublishPreview}
                  className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 ml-1.5" />
                  )}
                  تأكيد ونشر ({previewQuestions.length} سؤال)
                </Button>
              </>
            ) : (
              <div className="w-full flex justify-end">
                <Button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-6 rounded-xl bg-slate-900 text-white text-xs font-black cursor-pointer"
                >
                  إغلاق
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpressExamModal;
