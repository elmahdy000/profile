import React, { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  Layers,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Clock,
  Award,
  Lock,
  Shuffle,
  Eye,
  Search,
  Filter,
  Check,
  RotateCcw,
  FileQuestion,
  HelpCircle,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type LessonNode = {
  lesson: string;
  lessonId?: number | null;
  courseId?: number | null;
  totalQuestions: number;
  totalEssays?: number;
  mcqCount?: number;
  tfCount?: number;
  difficulty?: { easy: number; medium: number; hard: number };
};

export type UnitNode = {
  unit: string;
  totalQuestions: number;
  totalEssays?: number;
  mcqCount?: number;
  tfCount?: number;
  difficulty?: { easy: number; medium: number; hard: number };
  lessons: LessonNode[];
};

export type StageNode = {
  stage: string;
  totalQuestions: number;
  totalEssays?: number;
  mcqCount?: number;
  tfCount?: number;
  units: UnitNode[];
};

export interface ExamStepBuilderProps {
  adminApi: <T>(url: string, options?: RequestInit) => Promise<T>;
  treeData: StageNode[];
  initialStage?: string;
  onExamCreated: (quiz: any) => void;
  onNavigateToQuizzes?: () => void;
  onCancel?: () => void;
}

export function ExamStepBuilder({
  adminApi,
  treeData,
  initialStage,
  onExamCreated,
  onNavigateToQuizzes,
  onCancel,
}: ExamStepBuilderProps) {
  const { toast } = useToast();

  // ── Step Navigation ──
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // ── Stage & Isolation ──
  const availableStages = useMemo(() => {
    return treeData.map((s) => s.stage).filter(Boolean);
  }, [treeData]);

  const [selectedStage, setSelectedStage] = useState<string>(() => {
    if (initialStage && treeData.some((s) => s.stage === initialStage)) return initialStage;
    return availableStages[0] || "البكالوريا · الصف الأول (أولى بكالوريا) · مدارس عربي";
  });

  // Keep selected stage synced if initialStage changes
  useEffect(() => {
    if (initialStage && treeData.some((s) => s.stage === initialStage)) {
      setSelectedStage(initialStage);
    }
  }, [initialStage, treeData]);

  // Current stage data
  const currentStageNode = useMemo(() => {
    return treeData.find((s) => s.stage === selectedStage) || null;
  }, [treeData, selectedStage]);

  // Units for current stage
  const units = useMemo(() => {
    return currentStageNode?.units || [];
  }, [currentStageNode]);

  // ── STEP 1: Lesson Selection ──
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [lessonSearch, setLessonSearch] = useState<string>("");

  // Auto-expand all units initially
  useEffect(() => {
    if (units.length > 0) {
      const exp: Record<string, boolean> = {};
      units.forEach((u) => {
        exp[u.unit] = true;
      });
      setExpandedUnits(exp);
    }
  }, [units]);

  // Toggle single unit accordion
  const toggleUnitExpand = (unitName: string) => {
    setExpandedUnits((prev) => ({ ...prev, [unitName]: !prev[unitName] }));
  };

  // Fast map of all lessons in current stage
  const allLessonsMap = useMemo(() => {
    const map = new Map<string, { lesson: LessonNode; unit: string }>();
    units.forEach((u) => {
      u.lessons.forEach((l) => {
        map.set(l.lesson, { lesson: l, unit: u.unit });
      });
    });
    return map;
  }, [units]);

  // Selection state per unit: "all" | "some" | "none"
  const getUnitSelectState = (u: UnitNode): "all" | "some" | "none" => {
    const lessonNames = u.lessons.map((l) => l.lesson);
    if (lessonNames.length === 0) return "none";
    const selectedCount = lessonNames.filter((name) => selectedLessons.includes(name)).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === lessonNames.length) return "all";
    return "some";
  };

  // Toggle selection for an entire unit
  const handleToggleUnit = (u: UnitNode) => {
    const lessonNames = u.lessons.map((l) => l.lesson);
    const state = getUnitSelectState(u);
    if (state === "all") {
      // Deselect all in this unit
      setSelectedLessons((prev) => prev.filter((name) => !lessonNames.includes(name)));
    } else {
      // Select all in this unit
      setSelectedLessons((prev) => Array.from(new Set([...prev, ...lessonNames])));
    }
  };

  // Select / Deselect All in the stage
  const handleSelectAllStage = () => {
    const allLessonNames: string[] = [];
    units.forEach((u) => u.lessons.forEach((l) => allLessonNames.push(l.lesson)));
    setSelectedLessons(allLessonNames);
  };

  const handleDeselectAllStage = () => {
    setSelectedLessons([]);
  };

  // Toggle individual lesson
  const handleToggleLesson = (lessonName: string) => {
    setSelectedLessons((prev) =>
      prev.includes(lessonName) ? prev.filter((l) => l !== lessonName) : [...prev, lessonName]
    );
  };

  // ── STEP 2: Pool Calculation & Exam Metadata ──
  const selectedLessonStats = useMemo(() => {
    return selectedLessons.map((lName) => {
      const data = allLessonsMap.get(lName);
      const l = data?.lesson;
      const unit = data?.unit || "";
      const mcq = l?.mcqCount || 0;
      const tf = l?.tfCount || 0;
      const essay = l?.totalEssays || 0;
      const total = l?.totalQuestions || mcq + tf + essay;
      return {
        lesson: lName,
        unit,
        mcq,
        tf,
        essay,
        total,
      };
    });
  }, [selectedLessons, allLessonsMap]);

  // Total capacity available across selected lessons
  const poolCapacity = useMemo(() => {
    let mcq = 0;
    let tf = 0;
    let essay = 0;
    let total = 0;
    selectedLessonStats.forEach((s) => {
      mcq += s.mcq;
      tf += s.tf;
      essay += s.essay;
      total += s.total;
    });
    return { mcq, tf, essay, total };
  }, [selectedLessonStats]);

  // Exam Settings
  const [totalQuestions, setTotalQuestions] = useState<number>(20);
  const [examTitle, setExamTitle] = useState<string>("");
  const [isTitleCustom, setIsTitleCustom] = useState<boolean>(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [passingScore, setPassingScore] = useState<number>(60);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [showExplanations, setShowExplanations] = useState<boolean>(true);
  const [publishMode, setPublishMode] = useState<"draft" | "publish">("publish");

  // Keep total questions within capacity if capacity is smaller than default
  useEffect(() => {
    if (poolCapacity.total > 0 && totalQuestions > poolCapacity.total) {
      setTotalQuestions(poolCapacity.total);
    } else if (poolCapacity.total > 0 && totalQuestions <= 0) {
      setTotalQuestions(Math.min(20, poolCapacity.total));
    }
  }, [poolCapacity.total]);

  // Auto-suggest title when lessons change unless user customized it
  useEffect(() => {
    if (!isTitleCustom) {
      if (selectedLessons.length === 0) {
        setExamTitle("");
      } else if (selectedLessons.length === 1) {
        setExamTitle(`اختبار تقييمي: ${selectedLessons[0]}`);
      } else if (selectedLessons.length <= 3) {
        setExamTitle(`اختبار مراجعة على: ${selectedLessons.join("، ")}`);
      } else {
        setExamTitle(`اختبار شامل على ${selectedLessons.length} دروس مختارة`);
      }
    }
  }, [selectedLessons, isTitleCustom]);

  // ── STEP 3: Distribution Modes & State ──
  const [distributionMode, setDistributionMode] = useState<"by_type" | "by_lesson" | "advanced">("by_type");

  // Mode 1: By Question Type
  const [typeDist, setTypeDist] = useState<{ mcq: number; true_false: number; essay: number }>({
    mcq: 15,
    true_false: 5,
    essay: 0,
  });

  // Mode 2: By Lesson
  const [lessonDist, setLessonDist] = useState<Record<string, number>>({});

  // Mode 3: Advanced Matrix
  const [matrixDist, setMatrixDist] = useState<
    Record<string, { mcq: number; true_false: number; essay: number }>
  >({});

  // Initialize or re-balance distributions when navigating to Step 3
  const autoBalanceByType = (targetTotal: number = totalQuestions) => {
    const { mcq: availMcq, tf: availTf, essay: availEssay, total: availTotal } = poolCapacity;
    if (availTotal === 0 || targetTotal <= 0) {
      setTypeDist({ mcq: 0, true_false: 0, essay: 0 });
      return;
    }

    // Try to fill MCQ first or proportionally
    const target = Math.min(targetTotal, availTotal);
    let rem = target;

    // Allocate MCQ
    const mcqPick = Math.min(rem, availMcq);
    rem -= mcqPick;

    // Allocate True/False
    const tfPick = Math.min(rem, availTf);
    rem -= tfPick;

    // Allocate Essay
    const essayPick = Math.min(rem, availEssay);
    rem -= essayPick;

    setTypeDist({ mcq: mcqPick, true_false: tfPick, essay: essayPick });
  };

  const autoBalanceByLesson = (targetTotal: number = totalQuestions) => {
    if (selectedLessons.length === 0 || targetTotal <= 0) {
      setLessonDist({});
      return;
    }

    const nextDist: Record<string, number> = {};
    selectedLessons.forEach((l) => (nextDist[l] = 0));

    let remaining = Math.min(targetTotal, poolCapacity.total);
    const lessonCaps = new Map(selectedLessonStats.map((s) => [s.lesson, s.total]));

    // Round-robin allocation across lessons respecting individual capacities
    let round = 0;
    while (remaining > 0 && round < targetTotal + 10) {
      let allocatedInRound = 0;
      for (const lName of selectedLessons) {
        if (remaining <= 0) break;
        const cap = lessonCaps.get(lName) || 0;
        const current = nextDist[lName] || 0;
        if (current < cap) {
          nextDist[lName] = current + 1;
          remaining--;
          allocatedInRound++;
        }
      }
      if (allocatedInRound === 0) break;
      round++;
    }

    setLessonDist(nextDist);
  };

  const autoBalanceMatrix = (targetTotal: number = totalQuestions) => {
    if (selectedLessons.length === 0 || targetTotal <= 0) {
      setMatrixDist({});
      return;
    }

    const nextMatrix: Record<string, { mcq: number; true_false: number; essay: number }> = {};
    selectedLessons.forEach((l) => {
      nextMatrix[l] = { mcq: 0, true_false: 0, essay: 0 };
    });

    let remaining = Math.min(targetTotal, poolCapacity.total);

    // Prefer MCQs, then T/F, then Essay evenly across lessons
    const types: Array<"mcq" | "true_false" | "essay"> = ["mcq", "true_false", "essay"];
    for (const t of types) {
      if (remaining <= 0) break;
      for (const s of selectedLessonStats) {
        if (remaining <= 0) break;
        const cap = t === "mcq" ? s.mcq : t === "true_false" ? s.tf : s.essay;
        const current = nextMatrix[s.lesson][t];
        const canTake = Math.min(remaining, Math.max(0, cap - current));
        if (canTake > 0) {
          nextMatrix[s.lesson][t] += canTake;
          remaining -= canTake;
        }
      }
    }

    setMatrixDist(nextMatrix);
  };

  // Sync distributions on transition to step 3 if uninitialized
  useEffect(() => {
    if (currentStep === 3) {
      // Auto-balance whichever distribution mode is active if empty or sum is 0
      const typeSum = typeDist.mcq + typeDist.true_false + typeDist.essay;
      if (typeSum === 0 || typeSum !== totalQuestions) {
        autoBalanceByType(totalQuestions);
      }

      const lessonSum = Object.values(lessonDist).reduce((a, b) => a + b, 0);
      if (lessonSum === 0 || lessonSum !== totalQuestions) {
        autoBalanceByLesson(totalQuestions);
      }

      const matrixSum = Object.values(matrixDist).reduce(
        (acc, row) => acc + (row.mcq || 0) + (row.true_false || 0) + (row.essay || 0),
        0
      );
      if (matrixSum === 0 || matrixSum !== totalQuestions) {
        autoBalanceMatrix(totalQuestions);
      }
    }
  }, [currentStep]);

  // ── Real-time Distribution Totals & Validations ──
  const distributionSummary = useMemo(() => {
    if (distributionMode === "by_type") {
      const sum = typeDist.mcq + typeDist.true_false + typeDist.essay;
      const mcqShortage = Math.max(0, typeDist.mcq - poolCapacity.mcq);
      const tfShortage = Math.max(0, typeDist.true_false - poolCapacity.tf);
      const essayShortage = Math.max(0, typeDist.essay - poolCapacity.essay);
      const hasCapacityShortage = mcqShortage > 0 || tfShortage > 0 || essayShortage > 0;
      const isSumMatching = sum === totalQuestions;
      const isValid = isSumMatching && !hasCapacityShortage && sum > 0;

      const shortages: string[] = [];
      if (mcqShortage > 0) shortages.push(`عجز في الاختيار من متعدد (+${mcqShortage} عن المتاح)`);
      if (tfShortage > 0) shortages.push(`عجز في الصواب والخطأ (+${tfShortage} عن المتاح)`);
      if (essayShortage > 0) shortages.push(`عجز في المقالي (+${essayShortage} عن المتاح)`);

      return {
        allocatedSum: sum,
        targetTotal: totalQuestions,
        isSumMatching,
        hasCapacityShortage,
        shortages,
        isValid,
      };
    }

    if (distributionMode === "by_lesson") {
      let sum = 0;
      const shortages: string[] = [];
      selectedLessonStats.forEach((s) => {
        const allocated = lessonDist[s.lesson] || 0;
        sum += allocated;
        if (allocated > s.total) {
          shortages.push(`الدرس "${s.lesson}" مخصص له ${allocated} بينما المتاح ${s.total}`);
        }
      });

      const hasCapacityShortage = shortages.length > 0;
      const isSumMatching = sum === totalQuestions;
      const isValid = isSumMatching && !hasCapacityShortage && sum > 0;

      return {
        allocatedSum: sum,
        targetTotal: totalQuestions,
        isSumMatching,
        hasCapacityShortage,
        shortages,
        isValid,
      };
    }

    // Mode: advanced
    let sum = 0;
    let colMcq = 0;
    let colTf = 0;
    let colEssay = 0;
    const shortages: string[] = [];

    selectedLessonStats.forEach((s) => {
      const row = matrixDist[s.lesson] || { mcq: 0, true_false: 0, essay: 0 };
      const m = row.mcq || 0;
      const t = row.true_false || 0;
      const e = row.essay || 0;
      sum += m + t + e;
      colMcq += m;
      colTf += t;
      colEssay += e;

      if (m > s.mcq) shortages.push(`درس "${s.lesson}": اخترت ${m} MCQ والمتاح ${s.mcq}`);
      if (t > s.tf) shortages.push(`درس "${s.lesson}": اخترت ${t} صواب/خطأ والمتاح ${s.tf}`);
      if (e > s.essay) shortages.push(`درس "${s.lesson}": اخترت ${e} مقالي والمتاح ${s.essay}`);
    });

    const hasCapacityShortage = shortages.length > 0;
    const isSumMatching = sum === totalQuestions;
    const isValid = isSumMatching && !hasCapacityShortage && sum > 0;

    return {
      allocatedSum: sum,
      targetTotal: totalQuestions,
      colMcq,
      colTf,
      colEssay,
      isSumMatching,
      hasCapacityShortage,
      shortages,
      isValid,
    };
  }, [
    distributionMode,
    typeDist,
    lessonDist,
    matrixDist,
    totalQuestions,
    poolCapacity,
    selectedLessonStats,
  ]);

  // ── GENERATE EXAM ACTION ──
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerateExam = async () => {
    if (!distributionSummary.isValid) {
      toast({
        variant: "destructive",
        title: "تنبيه في توزيع الأسئلة",
        description: !distributionSummary.isSumMatching
          ? `مجموع الأسئلة الموزعة (${distributionSummary.allocatedSum}) لا يطابق الإجمالي المطلوب (${totalQuestions})`
          : distributionSummary.shortages[0] || "يرجى التحقق من أعداد الأسئلة الموزعة",
      });
      return;
    }

    if (!examTitle.trim()) {
      toast({ variant: "destructive", description: "يرجى كتابة عنوان للاختبار" });
      return;
    }

    setIsGenerating(true);
    try {
      const payload: any = {
        title: examTitle.trim(),
        stage: selectedStage,
        stages: [selectedStage],
        lessons: selectedLessons,
        count: totalQuestions,
        durationMinutes: durationMinutes > 0 ? durationMinutes : null,
        passingScore,
        maxAttempts,
        shuffleQuestions,
        showExplanations,
        isPublished: publishMode === "publish",
        distributionMode,
      };

      if (distributionMode === "by_type") {
        payload.typeDistribution = {
          mcq: typeDist.mcq,
          true_false: typeDist.true_false,
          essay: typeDist.essay,
        };
      } else if (distributionMode === "by_lesson") {
        payload.lessonDistribution = lessonDist;
      } else if (distributionMode === "advanced") {
        payload.advancedDistribution = matrixDist;
      }

      const res = await adminApi<any>("/api/admin/learning/test-bank/generate-exam", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast({
        title: "تم إنشاء الاختبار بنجاح! 🎯",
        description: `تم توليد ${res.questions?.length || totalQuestions} سؤالاً وفق التوزيع الدقيق.`,
      });

      onExamCreated(res.quiz || res);
    } catch (err: any) {
      console.error("[GENERATE_EXAM_ERROR]", err);
      toast({
        variant: "destructive",
        title: "فشل توليد الاختبار",
        description: err.message || "حدث خطأ أثناء سحب الأسئلة وتوليد الاختبار",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter lessons in step 1
  const filteredUnits = useMemo(() => {
    if (!lessonSearch.trim()) return units;
    const term = lessonSearch.trim().toLowerCase();
    return units
      .map((u) => {
        const matchedLessons = u.lessons.filter((l) =>
          l.lesson.toLowerCase().includes(term) || u.unit.toLowerCase().includes(term)
        );
        return { ...u, lessons: matchedLessons };
      })
      .filter((u) => u.lessons.length > 0);
  }, [units, lessonSearch]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
      {/* ── TOP STEPPER HEADER ── */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-400 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>منشئ الامتحانات الذكي والاحترافي</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground">
              بناء وتوزيع اختبار مخصص بدقة
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              تحكم كامل في اختيار الدروس، إجمالي الأسئلة، وتوزيع الأنواع بنظام الخطوات الدقيقة دون أي تسريب.
            </p>
          </div>

          {/* Stepper Progress Badges */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted/60 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                currentStep === 1
                  ? "bg-violet-600 text-white shadow-xs"
                  : selectedLessons.length > 0
                  ? "bg-background text-foreground hover:bg-muted"
                  : "text-muted-foreground"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-[11px]">
                {selectedLessons.length > 0 ? "✓" : "١"}
              </span>
              <span>تحديد الدروس</span>
            </button>

            <button
              type="button"
              disabled={selectedLessons.length === 0}
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 2
                  ? "bg-violet-600 text-white shadow-xs"
                  : currentStep > 2
                  ? "bg-background text-foreground hover:bg-muted"
                  : "text-muted-foreground"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-[11px]">
                {currentStep > 2 ? "✓" : "٢"}
              </span>
              <span>إجمالي الأسئلة</span>
            </button>

            <button
              type="button"
              disabled={selectedLessons.length === 0}
              onClick={() => setCurrentStep(3)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 3
                  ? "bg-violet-600 text-white shadow-xs"
                  : "text-muted-foreground"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/20 text-[11px]">
                ٣
              </span>
              <span>التوزيع والتوليد</span>
            </button>
          </div>
        </div>

        {/* Live Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-muted-foreground block">الدروس المختارة</span>
              <strong className="text-foreground font-black text-xs">
                {selectedLessons.length} درس مختار
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border">
            <Layers className="h-4 w-4 text-violet-500 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-muted-foreground block">الوعاء المتاح</span>
              <strong className="text-foreground font-black text-xs">
                {poolCapacity.total} سؤال متوفر
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border">
            <Sliders className="h-4 w-4 text-sky-500 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-muted-foreground block">إجمالي الاختبار المطلوب</span>
              <strong className="text-foreground font-black text-xs">
                {totalQuestions} سؤال
              </strong>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
              currentStep === 3
                ? distributionSummary.isValid
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                : "bg-muted/40 border-border text-foreground"
            }`}
          >
            {currentStep === 3 && distributionSummary.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className="truncate">
              <span className="text-[10px] opacity-75 block">حالة التطابق</span>
              <strong className="font-black text-xs">
                {currentStep === 3
                  ? distributionSummary.isValid
                    ? `متطابق (${distributionSummary.allocatedSum}/${totalQuestions})`
                    : `موزع ${distributionSummary.allocatedSum} من ${totalQuestions}`
                  : `الخطوة ${currentStep} من ٣`}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* STEP 1: SELECT LESSONS                                        */}
      {/* ============================================================ */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-in fade-in">
          {/* Stage / Curriculum Selector (Strict Isolation) */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black text-foreground flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-primary" />
                <span>المسار التعليمي والمرحلة (عزل تام للمناهج):</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                المناهج العربية ومناهج اللغات منفصلة كلياً
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableStages.map((st) => {
                const isSelected = selectedStage === st;
                const stageQuestions = treeData.find((s) => s.stage === st)?.totalQuestions || 0;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      if (selectedStage !== st) {
                        setSelectedStage(st);
                        setSelectedLessons([]); // Clear selections when changing stage
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{st}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {stageQuestions} س
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unit & Lesson Browser Card */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            {/* Header controls: Search + Global Select/Deselect */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  placeholder="بحث سريع في أسماء الوحدات أو الدروس..."
                  className="w-full h-9 pr-9 pl-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllStage}
                  className="text-xs font-bold h-9 px-3 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-primary" />
                  <span>تحديد جميع دروس المرحلة</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAllStage}
                  disabled={selectedLessons.length === 0}
                  className="text-xs font-bold h-9 px-3 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>إلغاء التحديد</span>
                </Button>
              </div>
            </div>

            {/* Units & Lessons List */}
            {filteredUnits.length === 0 ? (
              <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-xl space-y-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs font-bold text-foreground">لا توجد دروس مطابقة في هذا المسار</p>
                <p className="text-[11px] text-muted-foreground">
                  تأكد من اختيار المرحلة الصحيحة أو إضافة دروس إلى هذا المنهج.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUnits.map((u) => {
                  const unitState = getUnitSelectState(u);
                  const isExpanded = expandedUnits[u.unit] !== false;
                  const unitLessonsCount = u.lessons.length;
                  const selectedInUnit = u.lessons.filter((l) =>
                    selectedLessons.includes(l.lesson)
                  ).length;

                  // Unit stats
                  let unitMcq = 0;
                  let unitTf = 0;
                  let unitEssay = 0;
                  u.lessons.forEach((l) => {
                    unitMcq += l.mcqCount || 0;
                    unitTf += l.tfCount || 0;
                    unitEssay += l.totalEssays || 0;
                  });
                  const unitTotal = u.totalQuestions || unitMcq + unitTf + unitEssay;

                  return (
                    <div
                      key={u.unit}
                      className="rounded-xl border border-border bg-background/50 overflow-hidden shadow-2xs"
                    >
                      {/* Unit Header Accordion Bar */}
                      <div className="flex items-center justify-between p-3 sm:px-4 bg-muted/30 border-b border-border/60 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Unit Checkbox with 3-state icon */}
                          <button
                            type="button"
                            onClick={() => handleToggleUnit(u)}
                            className="text-primary hover:opacity-80 transition cursor-pointer shrink-0"
                            title={
                              unitState === "all"
                                ? "إلغاء تحديد الوحدة"
                                : "تحديد كافة دروس الوحدة"
                            }
                          >
                            {unitState === "all" ? (
                              <CheckSquare className="h-5 w-5 text-violet-600 fill-violet-600/15" />
                            ) : unitState === "some" ? (
                              <MinusSquare className="h-5 w-5 text-violet-600 fill-violet-600/15" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>

                          <div
                            onClick={() => toggleUnitExpand(u.unit)}
                            className="cursor-pointer min-w-0"
                          >
                            <div className="flex items-center gap-2">
                              <h3
                                dir="auto"
                                className="font-black text-xs sm:text-sm text-foreground truncate"
                              >
                                {u.unit}
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                                {selectedInUnit} / {unitLessonsCount} درس
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                              <span>المتاح بالوحدة: {unitTotal} سؤالاً</span>
                              <span>•</span>
                              <span>MCQ: {unitMcq}</span>
                              <span>•</span>
                              <span>صح/خطأ: {unitTf}</span>
                              <span>•</span>
                              <span>مقالي: {unitEssay}</span>
                            </div>
                          </div>
                        </div>

                        {/* Expand / Collapse Button */}
                        <button
                          type="button"
                          onClick={() => toggleUnitExpand(u.unit)}
                          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* Lessons Grid inside Unit */}
                      {isExpanded && (
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-card/60">
                          {u.lessons.map((l) => {
                            const isSelected = selectedLessons.includes(l.lesson);
                            const mcq = l.mcqCount || 0;
                            const tf = l.tfCount || 0;
                            const essay = l.totalEssays || 0;
                            const total = l.totalQuestions || mcq + tf + essay;
                            const hasQuestions = total > 0;

                            return (
                              <div
                                key={l.lesson}
                                onClick={() => handleToggleLesson(l.lesson)}
                                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                                  !hasQuestions
                                    ? "opacity-60 bg-muted/20 border-border hover:bg-muted/40"
                                    : isSelected
                                    ? "bg-violet-600/10 border-violet-600 shadow-xs ring-1 ring-violet-600/20"
                                    : "bg-background border-border hover:bg-muted/50"
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-violet-600" />
                                  ) : (
                                    <Square className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div
                                    dir="auto"
                                    className="font-bold text-foreground text-xs leading-snug line-clamp-2"
                                  >
                                    {l.lesson}
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-muted text-foreground">
                                      {total} س
                                    </span>
                                    <span className="text-[10px] px-1 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                                      MCQ: {mcq}
                                    </span>
                                    <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                                      صح/خطأ: {tf}
                                    </span>
                                    {essay > 0 && (
                                      <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
                                        مقالي: {essay}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 1 Footer Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-bold text-muted-foreground">
              {selectedLessons.length === 0
                ? "حدد درساً واحداً على الأقل للمتابعة"
                : `تم تحديد ${selectedLessons.length} دروس (بإجمالي ${poolCapacity.total} سؤال متاح)`}
            </span>

            <Button
              type="button"
              disabled={selectedLessons.length === 0}
              onClick={() => setCurrentStep(2)}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-black h-11 px-6 rounded-xl shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-40"
            >
              <span>المتابعة للخطوة ٢: إجمالي الأسئلة</span>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2: DEFINE TOTAL QUESTIONS & EXAM METADATA               */}
      {/* ============================================================ */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-in fade-in">
          {/* Capacity Pool Card */}
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <h3 className="text-sm font-black text-foreground">
                  وعاء الأسئلة المتاح من الدروس المحددة ({selectedLessons.length} دروس)
                </h3>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-violet-600 text-white">
                {poolCapacity.total} سؤالاً مؤهلاً
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-background/80 border border-border text-center">
                <span className="text-[10px] text-muted-foreground block">اختيار من متعدد (MCQ)</span>
                <strong className="text-sm font-black text-sky-600 dark:text-sky-400">
                  {poolCapacity.mcq}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-background/80 border border-border text-center">
                <span className="text-[10px] text-muted-foreground block">صواب أم خطأ (T/F)</span>
                <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {poolCapacity.tf}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-background/80 border border-border text-center">
                <span className="text-[10px] text-muted-foreground block">أسئلة مقالية (Essay)</span>
                <strong className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {poolCapacity.essay}
                </strong>
              </div>
            </div>
          </div>

          {/* Total Question Count Input (Free positive integer, no forced 20 limit) */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-foreground flex items-center gap-2">
                <FileQuestion className="h-4 w-4 text-primary" />
                <span>العدد الإجمالي المطلوب لأسئلة الاختبار:</span>
              </label>
              <p className="text-[11px] text-muted-foreground">
                يمكنك إدخال أي رقم تريده بحرية (من 1 وحتى الحد الأقصى المتوفر {poolCapacity.total} سؤال).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative max-w-xs">
                <input
                  type="number"
                  min={1}
                  max={poolCapacity.total}
                  value={totalQuestions}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTotalQuestions(val);
                  }}
                  className={`w-full h-12 px-4 rounded-xl border bg-background text-base font-black text-center ${
                    totalQuestions > poolCapacity.total || totalQuestions <= 0
                      ? "border-destructive text-destructive"
                      : "border-border text-foreground"
                  }`}
                />
              </div>

              {/* Quick Fill Preset Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10, 15, 20, 30, 40, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={preset > poolCapacity.total}
                    onClick={() => setTotalQuestions(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                      totalQuestions === preset
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 border-border"
                    }`}
                  >
                    {preset} سؤال
                  </button>
                ))}

                {poolCapacity.total > 0 && (
                  <button
                    type="button"
                    onClick={() => setTotalQuestions(poolCapacity.total)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 border border-violet-500/30 cursor-pointer"
                  >
                    كامل الوعاء ({poolCapacity.total})
                  </button>
                )}
              </div>
            </div>

            {totalQuestions > poolCapacity.total && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  العدد المطلوب ({totalQuestions}) يتجاوز الحد الأقصى المتوفر في الدروس المحددة ({poolCapacity.total}).
                </span>
              </div>
            )}
          </div>

          {/* Exam Details & Metadata Card */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-foreground flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <span>بيانات وإعدادات الاختبار:</span>
            </h3>

            {/* Exam Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">عنوان الاختبار *</label>
                <button
                  type="button"
                  onClick={() => setIsTitleCustom(false)}
                  className="text-[11px] font-bold text-violet-600 hover:underline cursor-pointer"
                >
                  إعادة التوليد التلقائي للاسم ↺
                </button>
              </div>
              <input
                type="text"
                dir="auto"
                value={examTitle}
                onChange={(e) => {
                  setExamTitle(e.target.value);
                  setIsTitleCustom(true);
                }}
                placeholder="مثال: اختبار شامل على الفصل الأول والثاني"
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground"
              />
            </div>

            {/* Duration, Passing Score, Max Attempts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>المدة الزمنية (بالدقائق)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                />
                <span className="text-[10px] text-muted-foreground block text-center">0 = اختبار مفتوح بدون وقت</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-emerald-500" />
                  <span>نسبة النجاح %</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Shuffle className="h-3.5 w-3.5 text-sky-500" />
                  <span>المحاولات المسموحة</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-bold text-center"
                />
                <span className="text-[10px] text-muted-foreground block text-center">0 = محاولات مفتوحة</span>
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-muted/20 text-xs font-bold cursor-pointer hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="h-4 w-4 rounded accent-violet-600"
                />
                <span>خلط ترتيب الأسئلة عشوائياً لكل طالب 🔀</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-muted/20 text-xs font-bold cursor-pointer hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={showExplanations}
                  onChange={(e) => setShowExplanations(e.target.checked)}
                  className="h-4 w-4 rounded accent-violet-600"
                />
                <span>إظهار الإجابات النموذجية والتفسيرات بعد التسليم 💡</span>
              </label>
            </div>

            {/* Publish Mode (Draft vs Publish) */}
            <div className="pt-2 space-y-2">
              <label className="text-xs font-bold text-foreground">حالة نشر الاختبار للطلاب:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPublishMode("draft")}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                    publishMode === "draft"
                      ? "bg-amber-500/10 border-amber-500/40 text-foreground ring-1 ring-amber-500/20"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="block text-xs font-black text-foreground">
                      حفظ كمسودة للمراجعة أولاً (مستحسن 🔒)
                    </strong>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      لن يظهر للطلاب حتى تراجع الأسئلة ثم تعتمد نشرها.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishMode("publish")}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                    publishMode === "publish"
                      ? "bg-emerald-500/10 border-emerald-500/40 text-foreground ring-1 ring-emerald-500/20"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="block text-xs font-black text-foreground">
                      نشر فوري ومباشر للطلاب 🚀
                    </strong>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      يظهر الاختبار فوراً في حسابات الطلاب المؤهلين.
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Step 2 Footer Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="text-xs font-bold h-11 px-5 rounded-xl cursor-pointer flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              <span>الرجوع: تعديل الدروس</span>
            </Button>

            <Button
              type="button"
              disabled={
                totalQuestions <= 0 ||
                totalQuestions > poolCapacity.total ||
                !examTitle.trim()
              }
              onClick={() => setCurrentStep(3)}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-black h-11 px-6 rounded-xl shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-40"
            >
              <span>المتابعة للخطوة ٣: توزيع الأسئلة والتوليد</span>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 3: CUSTOM DISTRIBUTION & GENERATE ACTION                */}
      {/* ============================================================ */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-in fade-in">
          {/* Distribution Mode Tab Selector */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="text-xs font-black text-foreground flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span>طريقة توزيع الأسئلة ({totalQuestions} سؤالاً مطلوباً):</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  اختر النمط المناسب لتوزيع الأسئلة على الأنواع أو الدروس بدقة تامة.
                </p>
              </div>

              {/* Mode Selector Tabs */}
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setDistributionMode("by_type")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    distributionMode === "by_type"
                      ? "bg-violet-600 text-white shadow-xs font-black"
                      : "text-muted-foreground hover:bg-background"
                  }`}
                >
                  حسب نوع السؤال 📊
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionMode("by_lesson")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    distributionMode === "by_lesson"
                      ? "bg-violet-600 text-white shadow-xs font-black"
                      : "text-muted-foreground hover:bg-background"
                  }`}
                >
                  حسب الدرس 📑
                </button>

                <button
                  type="button"
                  onClick={() => setDistributionMode("advanced")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    distributionMode === "advanced"
                      ? "bg-violet-600 text-white shadow-xs font-black"
                      : "text-muted-foreground hover:bg-background"
                  }`}
                >
                  التوزيع المتقدم (مصفوفة) 🧮
                </button>
              </div>
            </div>

            {/* ── MODE 1: BY QUESTION TYPE ── */}
            {distributionMode === "by_type" && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    حدد عدد الأسئلة المطلوبة من كل نوع:
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => autoBalanceByType(totalQuestions)}
                    className="text-xs font-bold h-8 px-3 cursor-pointer text-violet-600 border-violet-500/30 hover:bg-violet-500/10"
                  >
                    <Sparkles className="h-3.5 w-3.5 ml-1" />
                    <span>توزيع تلقائي متوازن 🪄</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* MCQ */}
                  <div className="p-4 rounded-xl border border-border bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-sky-600 dark:text-sky-400">
                        اختيار من متعدد (MCQ)
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600">
                        متاح: {poolCapacity.mcq}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={poolCapacity.mcq}
                      value={typeDist.mcq}
                      onChange={(e) =>
                        setTypeDist((prev) => ({ ...prev, mcq: Math.max(0, Number(e.target.value)) }))
                      }
                      className={`w-full h-11 px-3 rounded-lg border text-base font-black text-center ${
                        typeDist.mcq > poolCapacity.mcq
                          ? "border-destructive text-destructive bg-destructive/5"
                          : "border-border bg-background text-foreground"
                      }`}
                    />
                    {typeDist.mcq > poolCapacity.mcq && (
                      <span className="text-[10px] text-destructive font-bold block text-center">
                        عجز: مطلوب {typeDist.mcq} والمتاح {poolCapacity.mcq} فقط!
                      </span>
                    )}
                  </div>

                  {/* True/False */}
                  <div className="p-4 rounded-xl border border-border bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        صواب أم خطأ (T/F)
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                        متاح: {poolCapacity.tf}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={poolCapacity.tf}
                      value={typeDist.true_false}
                      onChange={(e) =>
                        setTypeDist((prev) => ({
                          ...prev,
                          true_false: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className={`w-full h-11 px-3 rounded-lg border text-base font-black text-center ${
                        typeDist.true_false > poolCapacity.tf
                          ? "border-destructive text-destructive bg-destructive/5"
                          : "border-border bg-background text-foreground"
                      }`}
                    />
                    {typeDist.true_false > poolCapacity.tf && (
                      <span className="text-[10px] text-destructive font-bold block text-center">
                        عجز: مطلوب {typeDist.true_false} والمتاح {poolCapacity.tf} فقط!
                      </span>
                    )}
                  </div>

                  {/* Essay */}
                  <div className="p-4 rounded-xl border border-border bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-amber-600 dark:text-amber-400">
                        أسئلة مقالية (Essay)
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        متاح: {poolCapacity.essay}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={poolCapacity.essay}
                      value={typeDist.essay}
                      onChange={(e) =>
                        setTypeDist((prev) => ({
                          ...prev,
                          essay: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className={`w-full h-11 px-3 rounded-lg border text-base font-black text-center ${
                        typeDist.essay > poolCapacity.essay
                          ? "border-destructive text-destructive bg-destructive/5"
                          : "border-border bg-background text-foreground"
                      }`}
                    />
                    {typeDist.essay > poolCapacity.essay && (
                      <span className="text-[10px] text-destructive font-bold block text-center">
                        عجز: مطلوب {typeDist.essay} والمتاح {poolCapacity.essay} فقط!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── MODE 2: BY LESSON ── */}
            {distributionMode === "by_lesson" && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    حدد عدد الأسئلة المطلوبة بالضبط من كل درس:
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => autoBalanceByLesson(totalQuestions)}
                    className="text-xs font-bold h-8 px-3 cursor-pointer text-violet-600 border-violet-500/30 hover:bg-violet-500/10"
                  >
                    <Sparkles className="h-3.5 w-3.5 ml-1" />
                    <span>توزيع متساوٍ على الدروس 🪄</span>
                  </Button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {selectedLessonStats.map((s) => {
                    const count = lessonDist[s.lesson] || 0;
                    const isOver = count > s.total;
                    return (
                      <div
                        key={s.lesson}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isOver
                            ? "border-destructive bg-destructive/5"
                            : count > 0
                            ? "border-violet-500/40 bg-violet-500/5"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div dir="auto" className="font-black text-xs text-foreground truncate">
                            {s.lesson}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{s.unit}</span>
                            <span>•</span>
                            <span className="font-bold text-foreground">المتاح: {s.total} سؤال</span>
                            <span>(MCQ: {s.mcq}، صح/خطأ: {s.tf}، مقالي: {s.essay})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={s.total}
                            value={count}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setLessonDist((prev) => ({ ...prev, [s.lesson]: val }));
                            }}
                            className={`w-20 h-10 px-2 rounded-lg border text-sm font-black text-center ${
                              isOver
                                ? "border-destructive text-destructive bg-background"
                                : "border-border bg-background text-foreground"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── MODE 3: ADVANCED DISTRIBUTION MATRIX ── */}
            {distributionMode === "advanced" && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-foreground block">
                      مصفوفة التوزيع التفصيلية (الدرس × نوع السؤال):
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      حدد بالضبط كم سؤال اختيار من متعدد، صواب/خطأ، ومقالي من كل درس على حدة.
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => autoBalanceMatrix(totalQuestions)}
                    className="text-xs font-bold h-8 px-3 cursor-pointer text-violet-600 border-violet-500/30 hover:bg-violet-500/10"
                  >
                    <Sparkles className="h-3.5 w-3.5 ml-1" />
                    <span>ملء تلقائي متوازن للمصفوفة 🪄</span>
                  </Button>
                </div>

                {/* Matrix Table */}
                <div className="rounded-xl border border-border overflow-x-auto shadow-2xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-muted/60 text-muted-foreground font-black border-b border-border">
                      <tr>
                        <th className="p-3">الدرس</th>
                        <th className="p-3 text-center">اختيار من متعدد (MCQ)</th>
                        <th className="p-3 text-center">صواب أم خطأ (T/F)</th>
                        <th className="p-3 text-center">مقالي (Essay)</th>
                        <th className="p-3 text-center">إجمالي الدرس</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedLessonStats.map((s) => {
                        const row = matrixDist[s.lesson] || {
                          mcq: 0,
                          true_false: 0,
                          essay: 0,
                        };
                        const rowSum = (row.mcq || 0) + (row.true_false || 0) + (row.essay || 0);

                        return (
                          <tr key={s.lesson} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 max-w-xs">
                              <div dir="auto" className="font-bold text-foreground truncate">
                                {s.lesson}
                              </div>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {s.unit} • متاح {s.total} س
                              </span>
                            </td>

                            {/* Cell: MCQ */}
                            <td className="p-3 text-center">
                              <div className="inline-flex flex-col items-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={s.mcq}
                                  value={row.mcq || 0}
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value));
                                    setMatrixDist((prev) => ({
                                      ...prev,
                                      [s.lesson]: {
                                        ...(prev[s.lesson] || {
                                          mcq: 0,
                                          true_false: 0,
                                          essay: 0,
                                        }),
                                        mcq: val,
                                      },
                                    }));
                                  }}
                                  className={`w-16 h-8 rounded-lg border text-xs font-bold text-center ${
                                    (row.mcq || 0) > s.mcq
                                      ? "border-destructive text-destructive bg-destructive/10"
                                      : "border-border bg-background text-foreground"
                                  }`}
                                />
                                <span className="text-[9px] text-muted-foreground mt-0.5">
                                  متاح: {s.mcq}
                                </span>
                              </div>
                            </td>

                            {/* Cell: True/False */}
                            <td className="p-3 text-center">
                              <div className="inline-flex flex-col items-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={s.tf}
                                  value={row.true_false || 0}
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value));
                                    setMatrixDist((prev) => ({
                                      ...prev,
                                      [s.lesson]: {
                                        ...(prev[s.lesson] || {
                                          mcq: 0,
                                          true_false: 0,
                                          essay: 0,
                                        }),
                                        true_false: val,
                                      },
                                    }));
                                  }}
                                  className={`w-16 h-8 rounded-lg border text-xs font-bold text-center ${
                                    (row.true_false || 0) > s.tf
                                      ? "border-destructive text-destructive bg-destructive/10"
                                      : "border-border bg-background text-foreground"
                                  }`}
                                />
                                <span className="text-[9px] text-muted-foreground mt-0.5">
                                  متاح: {s.tf}
                                </span>
                              </div>
                            </td>

                            {/* Cell: Essay */}
                            <td className="p-3 text-center">
                              <div className="inline-flex flex-col items-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={s.essay}
                                  value={row.essay || 0}
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value));
                                    setMatrixDist((prev) => ({
                                      ...prev,
                                      [s.lesson]: {
                                        ...(prev[s.lesson] || {
                                          mcq: 0,
                                          true_false: 0,
                                          essay: 0,
                                        }),
                                        essay: val,
                                      },
                                    }));
                                  }}
                                  className={`w-16 h-8 rounded-lg border text-xs font-bold text-center ${
                                    (row.essay || 0) > s.essay
                                      ? "border-destructive text-destructive bg-destructive/10"
                                      : "border-border bg-background text-foreground"
                                  }`}
                                />
                                <span className="text-[9px] text-muted-foreground mt-0.5">
                                  متاح: {s.essay}
                                </span>
                              </div>
                            </td>

                            {/* Cell: Row Total */}
                            <td className="p-3 text-center font-black">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs ${
                                  rowSum > s.total
                                    ? "bg-destructive/10 text-destructive"
                                    : rowSum > 0
                                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {rowSum}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Column & Grand Totals Footer */}
                    <tfoot className="bg-muted/40 font-black border-t-2 border-border text-foreground">
                      <tr>
                        <td className="p-3">الإجمالي العام للأعمدة:</td>
                        <td className="p-3 text-center text-sky-600 dark:text-sky-400">
                          {distributionSummary.colMcq ?? 0} سؤال
                        </td>
                        <td className="p-3 text-center text-emerald-600 dark:text-emerald-400">
                          {distributionSummary.colTf ?? 0} سؤال
                        </td>
                        <td className="p-3 text-center text-amber-600 dark:text-amber-400">
                          {distributionSummary.colEssay ?? 0} سؤال
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black ${
                              distributionSummary.isSumMatching
                                ? "bg-emerald-600 text-white"
                                : "bg-destructive text-white"
                            }`}
                          >
                            {distributionSummary.allocatedSum} / {totalQuestions}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Validation Banner */}
          {!distributionSummary.isValid && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-black text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>يرجى استيفاء شروط التوزيع قبل توليد الاختبار:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-foreground pr-2 font-bold">
                {!distributionSummary.isSumMatching && (
                  <li>
                    مجموع الأسئلة الموزعة ({distributionSummary.allocatedSum}) لا يطابق الإجمالي
                    المحدد في الخطوة السابقة ({totalQuestions}).{" "}
                    {distributionSummary.allocatedSum < totalQuestions
                      ? `(متبقي توزيع ${totalQuestions - distributionSummary.allocatedSum} سؤالاً)`
                      : `(زيادة ${distributionSummary.allocatedSum - totalQuestions} عن المطلوب)`}
                  </li>
                )}
                {distributionSummary.shortages.map((msg, i) => (
                  <li key={i} className="text-destructive font-black">
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 3 Footer Navigation & Generate Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="text-xs font-bold h-11 px-5 rounded-xl cursor-pointer flex items-center gap-2 self-start sm:self-auto"
            >
              <ArrowRight className="h-4 w-4" />
              <span>الرجوع: تعديل إجمالي الأسئلة والإعدادات</span>
            </Button>

            <Button
              type="button"
              disabled={isGenerating || !distributionSummary.isValid || !examTitle.trim()}
              onClick={handleGenerateExam}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-black h-12 px-8 rounded-xl shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-40"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جارٍ سحب وتوزيع الأسئلة وتوليد الاختبار...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>توليد الاختبار ({totalQuestions} سؤال) 🚀</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
