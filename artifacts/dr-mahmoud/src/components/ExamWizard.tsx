import { useState, useRef, useMemo } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Upload,
  BookOpen,
  HelpCircle,
  FileText,
  Clock,
  Sparkles,
  Award,
  Layers,
  Settings,
  ListCheck,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  X,
  Search,
  Eye,
  RefreshCw,
  Edit2,
  Users,
  GraduationCap,
  Filter,
  Calendar,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ACADEMIC_TRACKS, getStagesForTrack, getTrack } from "@/data/academic";
import { isEnglishQuestion, getOptionLabel } from "./admin/learning/TestBankTab";

export type Question = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  imageUrl?: string;
  questionType?: "mcq" | "true_false" | "short_answer" | "essay";
  points?: number;
};

export type QuizFormState = {
  title: string;
  courseId: string;
  videoId: string;
  scope: "course" | "lesson";
  category: string;
  stage: string;
  stages: string[];
  description: string;
  durationMinutes: string | number;
  passingScore: number;
  maxAttempts: number;
  requiredProgress: number;
  questionsToShow?: number | null;
  shuffleQuestions: boolean;
  showExplanations: boolean;
  isPublished: boolean;
  questions: Question[];
};

export type QuizItem = {
  id: number;
  title: string;
  courseId?: number | null;
  videoId?: number | null;
  scope: "course" | "lesson";
  category: string;
  stage?: string | null;
  stages?: string[];
  description?: string | null;
  passingScore: number;
  durationMinutes?: number | null;
  questionsToShow?: number | null;
  shuffleQuestions?: boolean;
  showExplanations?: boolean;
  maxAttempts?: number | null;
  isPublished: boolean;
  questions: Question[];
  createdAt?: string;
  attemptsCount?: number;
  uniqueStudentsCount?: number;
};

type ExamWizardProps = {
  quizForm: QuizFormState;
  setQuizForm: React.Dispatch<React.SetStateAction<any>>;
  editingQuizId: number | null;
  resetQuizForm: () => void;
  createQuiz: (e: React.FormEvent) => Promise<void>;
  learningCourses: Array<{ id: number; title: string; category: string; stages?: string[] }>;
  videoOptions: Array<{ id: number; title: string; category: string; courseId?: number | null; stage?: string | null; stages?: string[] }>;
  adminApi: <T>(url: string, init?: RequestInit) => Promise<T>;
  quizzes: QuizItem[];
  editQuiz: (q: QuizItem) => void;
  toggleQuiz: (q: QuizItem) => Promise<void>;
  deleteQuiz: (id: number) => Promise<void>;
  onNavigateToTestBank?: () => void;
};

export function ExamWizard({
  quizForm,
  setQuizForm,
  editingQuizId,
  resetQuizForm,
  createQuiz,
  learningCourses,
  videoOptions,
  adminApi,
  quizzes,
  editQuiz,
  toggleQuiz,
  deleteQuiz,
  onNavigateToTestBank,
}: ExamWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [questionSource, setQuestionSource] = useState<"manual" | "file" | "bank">("manual");
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<number>>(new Set());
  const [quizStageSearch, setQuizStageSearch] = useState("");
  const [isImportingQuestions, setIsImportingQuestions] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const quizImportInputRef = useRef<HTMLInputElement>(null);
  const [previewQuiz, setPreviewQuiz] = useState<QuizItem | null>(null);

  // Filter states for Quizzes list section
  const [quizListStageFilter, setQuizListStageFilter] = useState<string>("all");
  const [quizListStatusFilter, setQuizListStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [quizListSearch, setQuizListSearch] = useState<string>("");

  // Extract all distinct stages across quizzes
  const allStagesInQuizzes = useMemo(() => {
    const stageCounts = new Map<string, number>();
    let noStageCount = 0;

    quizzes.forEach((q) => {
      const qStages: string[] = Array.isArray(q.stages) && q.stages.length > 0
        ? q.stages.filter(Boolean)
        : q.stage && q.stage.trim() ? [q.stage.trim()] : [];

      if (qStages.length === 0) {
        noStageCount++;
      } else {
        qStages.forEach((s) => {
          const trimmed = s.trim();
          if (trimmed) {
            stageCounts.set(trimmed, (stageCounts.get(trimmed) || 0) + 1);
          }
        });
      }
    });

    return {
      stages: Array.from(stageCounts.entries()).map(([stage, count]) => ({ stage, count })),
      noStageCount,
    };
  }, [quizzes]);

  // Filtered quizzes list
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      // 1. Stage filter
      if (quizListStageFilter !== "all") {
        if (quizListStageFilter === "no_stage") {
          const hasAny = (Array.isArray(q.stages) && q.stages.length > 0) || Boolean(q.stage && q.stage.trim());
          if (hasAny) return false;
        } else {
          const qStages: string[] = Array.isArray(q.stages) && q.stages.length > 0
            ? q.stages
            : q.stage ? [q.stage] : [];
          if (!qStages.some((s) => s === quizListStageFilter || s.includes(quizListStageFilter))) {
            return false;
          }
        }
      }

      // 2. Status filter
      if (quizListStatusFilter === "published" && !q.isPublished) return false;
      if (quizListStatusFilter === "draft" && q.isPublished) return false;

      // 3. Search query
      if (quizListSearch.trim()) {
        const query = quizListSearch.toLowerCase().trim();
        const matchesTitle = q.title?.toLowerCase().includes(query);
        const matchesDesc = q.description?.toLowerCase().includes(query);
        const matchesCat = q.category?.toLowerCase().includes(query);
        const matchesStage = q.stage?.toLowerCase().includes(query) || (Array.isArray(q.stages) && q.stages.some((s) => s.toLowerCase().includes(query)));
        if (!matchesTitle && !matchesDesc && !matchesCat && !matchesStage) return false;
      }

      return true;
    });
  }, [quizzes, quizListStageFilter, quizListStatusFilter, quizListSearch]);

  // Unlimited toggles state
  const isTimeUnlimited = !quizForm.durationMinutes || quizForm.durationMinutes === "0";
  const isAttemptsUnlimited = !quizForm.maxAttempts || quizForm.maxAttempts === 0;

  // Selected Quiz Course & Track
  const selectedQuizCourse = learningCourses.find(
    (course) => String(course.id) === quizForm.courseId
  );
  const selectedQuizTrack = getTrack(selectedQuizCourse?.category || selectedQuizCourse?.title);

  // Available Stages (Use course stages if restricted, otherwise include all stages from all tracks)
  const availableQuizStages = useMemo(() => {
    if (selectedQuizCourse?.stages?.length) {
      return selectedQuizCourse.stages;
    }
    return ACADEMIC_TRACKS.flatMap((track) => track.stages);
  }, [selectedQuizCourse]);

  // Group stages logically by Track - Always display all academic tracks so instructors can target any grade/track
  const quizStageGroups = useMemo(() => {
    // If course explicitly defines specific allowed stages, prioritize showing them first
    if (selectedQuizCourse?.stages?.length) {
      return [{ title: `مراحل الكورس المحددة (${selectedQuizCourse.title})`, stages: selectedQuizCourse.stages }];
    }

    // Always show all academic tracks (Baccalaureate/Secondary, CS, Engineering)
    return ACADEMIC_TRACKS.map((track) => ({
      title: track.title,
      stages: track.stages,
    }));
  }, [selectedQuizCourse]);

  const visibleQuizStageGroups = quizStageGroups
    .map((group) => ({
      ...group,
      stages: group.stages.filter((stage) =>
        stage.toLocaleLowerCase("ar").includes(quizStageSearch.trim().toLocaleLowerCase("ar"))
      ),
    }))
    .filter((group) => group.stages.length > 0);

  // Filtered Lessons
  const filteredLessons = useMemo(() => {
    if (!quizForm.courseId) return videoOptions;
    return videoOptions.filter(
      (video) => String(video.courseId || "") === quizForm.courseId
    );
  }, [videoOptions, quizForm.courseId]);

  // Validation Warnings
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!quizForm.title.trim()) warnings.push("اسم الاختبار غير مدخل");
    if (!quizForm.courseId) warnings.push("لم يتم اختيار الكورس المرتبط");
    if (quizForm.stages.length === 0) warnings.push("لم يتم تحدد أي مرحلة أو مجموعة");
    if (quizForm.questions.length === 0) warnings.push("الاختبار لا يحتوي على أسئلة");
    
    quizForm.questions.forEach((q, i) => {
      if (!q.prompt.trim()) warnings.push(`السؤال ${i + 1}: النص فارغ`);
      if (q.options.filter((o) => o.trim()).length < 2) warnings.push(`السؤال ${i + 1}: يحتاج اختيارين على الأقل`);
    });

    return warnings;
  }, [quizForm]);

  // Question manipulation helpers
  const setQuestion = (index: number, patch: Partial<Question>) => {
    setQuizForm((current: QuizFormState) => ({
      ...current,
      questions: current.questions.map((q: Question, i: number) => (i === index ? { ...q, ...patch } : q)),
    }));
  };

  const duplicateQuestion = (index: number) => {
    const target = quizForm.questions[index];
    if (!target) return;
    setQuizForm((current: QuizFormState) => ({
      ...current,
      questions: [
        ...current.questions.slice(0, index + 1),
        { ...target, prompt: `${target.prompt} (نسخة)` },
        ...current.questions.slice(index + 1),
      ],
    }));
    toast({ title: "تم تكرار السؤال بنجاح" });
  };

  const toggleQuestion = (index: number) => {
    setCollapsedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const importQuizQuestions = async (file: File) => {
    setIsImportingQuestions(true);
    setImportWarnings([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await adminApi<{ questions: Question[]; warnings: string[] }>(
        "/api/admin/learning/quizzes/import",
        { method: "POST", body: formData }
      );
      if (Array.isArray(result.questions) && result.questions.length > 0) {
        setQuizForm((prev: QuizFormState) => {
          const hasManualQuestion = prev.questions.some(
            (q) => q.prompt.trim() || q.options.some((o) => o.trim())
          );
          return {
            ...prev,
            questions: hasManualQuestion ? [...prev.questions, ...result.questions] : result.questions,
          };
        });
        setImportWarnings(result.warnings || []);
        toast({ title: `تم استيراد ${result.questions.length} سؤال بنجاح 🎉` });
        setQuestionSource("manual");
      } else {
        toast({ variant: "destructive", title: "لم يتم العثور على أسئلة داخل الملف" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "تعذر استيراد الأسئلة", description: (error as Error).message });
    } finally {
      setIsImportingQuestions(false);
      if (quizImportInputRef.current) quizImportInputRef.current.value = "";
    }
  };

  const steps = [
    { id: 1, label: "البيانات الأساسية", icon: Layers, desc: "الاسم والكورس والمجموعات" },
    { id: 2, label: "إعدادات الاختبار", icon: Settings, desc: "الدرجات والوقت والمحاولات" },
    { id: 3, label: "إضافة الأسئلة", icon: ListCheck, desc: "إنشاء واستيراد الأسئلة" },
    { id: 4, label: "المراجعة والنشر", icon: CheckCircle2, desc: "مراجعة وتأكيد الإنشاء" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 pb-24 font-sans text-slate-900" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              {editingQuizId ? "تعديل الاختبار" : "إنشاء اختبار جديد"}
            </h1>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {quizForm.isPublished ? "منشور 🟢" : "مسودة 📝"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            أضف بيانات الاختبار وحدد إعداداته ثم أنشئ الأسئلة بكل سهولة.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <Check className="h-3.5 w-3.5" /> تم الحفظ تلقائيًا
          </span>
          {onNavigateToTestBank && (
            <Button
              type="button"
              onClick={onNavigateToTestBank}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold h-9 px-3.5 rounded-xl cursor-pointer shadow-xs"
            >
              <Sparkles className="h-4 w-4 ml-1.5" />
              توليد من بنك الأسئلة 📚
            </Button>
          )}
          {editingQuizId && (
            <Button variant="ghost" size="sm" onClick={resetQuizForm}>
              إلغاء التعديل
            </Button>
          )}
        </div>
      </div>

      {/* Stepper (Desktop Horizontal Stepper) */}
      <div className="hidden grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm md:grid">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStep(step.id as any)}
              className={`flex items-center gap-3 rounded-xl p-3 text-right transition ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : isDone
                  ? "bg-slate-50 text-slate-800 hover:bg-slate-100"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <div
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-black text-xs ${
                  isActive
                    ? "bg-white/20 text-white"
                    : isDone
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {isDone ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <div className="min-w-0">
                <strong className="block truncate text-sm font-bold">{step.label}</strong>
                <span className={`block truncate text-[11px] ${isActive ? "text-white/80" : "text-slate-400"}`}>
                  {step.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile Stepper */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-xs font-black text-white">
            {currentStep}
          </span>
          <span className="font-extrabold text-sm text-slate-800">
            {steps.find((s) => s.id === currentStep)?.label}
          </span>
        </div>
        <span className="text-xs text-slate-400 font-bold">الخطوة {currentStep} من 4</span>
      </div>

      <form onSubmit={createQuiz}>
        {/* STEP 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">1. البيانات الأساسية</h2>
              <p className="text-xs text-slate-500">حدد اسم الاختبار والكورس المرتبط والمراحل المستهدفة.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-extrabold text-slate-700">اسم الاختبار <span className="text-red-500">*</span></label>
                <input
                  required
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="مثال: اختبار الشهر - الوحدة الأولى (أساسيات الـ C++)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">الكورس المرتبط بالاختبار <span className="text-red-500">*</span></label>
                <select
                  required
                  value={quizForm.courseId}
                  onChange={(e) => {
                    const course = learningCourses.find((item) => String(item.id) === e.target.value);
                    setQuizForm({
                      ...quizForm,
                      courseId: e.target.value,
                      category: course?.title || "",
                      stage: "",
                      stages: [],
                      videoId: "",
                    });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold transition focus:border-primary focus:bg-white focus:outline-none"
                >
                  <option value="">اختر الكورس...</option>
                  {learningCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} ({course.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">نوع نطاق الاختبار</label>
                <select
                  value={quizForm.scope}
                  onChange={(e) => setQuizForm({ ...quizForm, scope: e.target.value as "course" | "lesson", videoId: "" })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold transition focus:border-primary focus:bg-white focus:outline-none"
                >
                  <option value="course">اختبار شامل للكورس</option>
                  <option value="lesson">اختبار مرتبط بدرس محدد</option>
                </select>
              </div>

              {quizForm.scope === "lesson" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-extrabold text-slate-700">حدد الدرس المرتبط</label>
                  <select
                    value={quizForm.videoId}
                    onChange={(e) => setQuizForm({ ...quizForm, videoId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold transition focus:border-primary focus:bg-white focus:outline-none"
                  >
                    <option value="">اختر الدرس...</option>
                    {filteredLessons.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700">المراحل والصفوف المتاحة للاختبار</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuizForm({ ...quizForm, stages: availableQuizStages, stage: availableQuizStages[0] || "" })}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      تحديد الكل
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setQuizForm({ ...quizForm, stages: [], stage: "" })}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      value={quizStageSearch}
                      onChange={(e) => setQuizStageSearch(e.target.value)}
                      placeholder="ابحث داخل المراحل (مثال: بكالوريا، ثانوية عامة)..."
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 pr-9 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  {quizForm.stages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
                      <span className="ml-1 text-xs font-bold text-slate-500">المحدد ({quizForm.stages.length}):</span>
                      {quizForm.stages.map((st) => (
                        <span key={st} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                          {st}
                          <button
                            type="button"
                            onClick={() => setQuizForm({ ...quizForm, stages: quizForm.stages.filter((s) => s !== st) })}
                            className="hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
                    {visibleQuizStageGroups.map((group, gi) => (
                      <div key={gi} className="space-y-1.5">
                        <strong className="block text-[11px] font-black text-slate-500">{group.title}</strong>
                        <div className="flex flex-wrap gap-2">
                          {group.stages.map((stage) => {
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
                                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                                  selected
                                    ? "border-primary bg-primary text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {stage}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Exam Settings */}
        {currentStep === 2 && (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">2. إعدادات درجات ووقت الاختبار</h2>
              <p className="text-xs text-slate-500">حدد نسبة النجاح، مدة الاختبار، وعدد محاولات الطالب.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" /> نسبة النجاح (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quizForm.passingScore}
                  onChange={(e) => setQuizForm({ ...quizForm, passingScore: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-bold text-center focus:outline-none"
                />
                <p className="text-[11px] text-slate-400">الحد الأدنى لاجتياز الاختبار (الافتراضي 60%).</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-500" /> مدة الاختبار (بالدقائق)
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTimeUnlimited}
                      onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: e.target.checked ? "" : "30" })}
                      className="rounded"
                    />
                    بدون وقت
                  </label>
                </div>
                <input
                  type="number"
                  disabled={isTimeUnlimited}
                  placeholder={isTimeUnlimited ? "مفتوح بدون وقت" : "مثال: 30"}
                  value={quizForm.durationMinutes}
                  onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-bold text-center disabled:bg-slate-100 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400">يظهر مؤقت تنازلي للطالب أثناء الامتحان.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <RefreshCw className="h-4 w-4 text-emerald-500" /> عدد المحاولات
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAttemptsUnlimited}
                      onChange={(e) => setQuizForm({ ...quizForm, maxAttempts: e.target.checked ? 0 : 3 })}
                      className="rounded"
                    />
                    غير محدود
                  </label>
                </div>
                <input
                  type="number"
                  disabled={isAttemptsUnlimited}
                  value={isAttemptsUnlimited ? "" : quizForm.maxAttempts}
                  placeholder={isAttemptsUnlimited ? "محاولات لا نهائية" : "مثال: 3"}
                  onChange={(e) => setQuizForm({ ...quizForm, maxAttempts: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-bold text-center disabled:bg-slate-100 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400">الحد الأقصى لإعادة دخول الامتحان للطالب.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 sm:col-span-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <ListCheck className="h-4 w-4 text-purple-500" /> عدد الأسئلة التي تظهر للطالب (من إجمالي {quizForm.questions.length} سؤال)
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!quizForm.questionsToShow}
                      onChange={(e) => setQuizForm({ ...quizForm, questionsToShow: e.target.checked ? null : quizForm.questions.length })}
                      className="rounded"
                    />
                    عرض جميع الأسئلة
                  </label>
                </div>
                <input
                  type="number"
                  min={1}
                  max={quizForm.questions.length || 1}
                  disabled={!quizForm.questionsToShow}
                  value={quizForm.questionsToShow ?? ""}
                  placeholder={!quizForm.questionsToShow ? `سيتم عرض الإجمالي كامل (${quizForm.questions.length} سؤال)` : "مثال: 10"}
                  onChange={(e) => setQuizForm({ ...quizForm, questionsToShow: e.target.value ? Number(e.target.value) : null })}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-bold text-center disabled:bg-slate-100 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400">إذا حددت عدداً أقل، سيتم اختيار أسئلة عشوائية لكل طالب من إجمالي بنك الأسئلة المضاف للاختبار.</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-4">
              <h3 className="text-sm font-black text-slate-800">خيارات وسلوكيات الامتحان</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/30 p-3.5 hover:bg-slate-50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizForm.shuffleQuestions}
                    onChange={(e) => setQuizForm({ ...quizForm, shuffleQuestions: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <strong className="block text-xs font-extrabold text-slate-800">خلط الأسئلة عشوائياً لكل طالب (Randomize)</strong>
                    <span className="text-[11px] text-slate-400">تغيير ترتيب الأسئلة لمنع الغش بين الطلاب.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/30 p-3.5 hover:bg-slate-50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quizForm.showExplanations}
                    onChange={(e) => setQuizForm({ ...quizForm, showExplanations: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <strong className="block text-xs font-extrabold text-slate-800">عرض التفسير والشرح بعد الانتهاء</strong>
                    <span className="text-[11px] text-slate-400">إظهار الإجابات النموذجية وتفسير السؤال بعد التسليم.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Question Creation */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Segmented Selector */}
            <div className="grid grid-cols-3 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setQuestionSource("manual")}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition sm:text-sm ${
                  questionSource === "manual" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Plus className="h-4 w-4" /> إضافة يدويًا
              </button>
              <button
                type="button"
                onClick={() => setQuestionSource("file")}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition sm:text-sm ${
                  questionSource === "file" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Upload className="h-4 w-4" /> استيراد من ملف (Word/PDF)
              </button>
              <button
                type="button"
                onClick={() => setQuestionSource("bank")}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition sm:text-sm ${
                  questionSource === "bank" ? "bg-primary text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <BookOpen className="h-4 w-4" /> اختيار من بنك الأسئلة
              </button>
            </div>

            {/* MANUAL MODE */}
            {questionSource === "manual" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-black text-slate-800">أسئلة الاختبار</h3>
                    <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold text-blue-800">
                      {quizForm.questions.length} سؤال
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCollapsedQuestions(new Set(quizForm.questions.map((_, i) => i)))}
                      className="text-xs"
                    >
                      طي الكل
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCollapsedQuestions(new Set())}
                      className="text-xs"
                    >
                      فتح الكل
                    </Button>
                  </div>
                </div>

                {quizForm.questions.map((q, qi) => (
                  <div key={qi} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-xs font-black text-white">
                          {qi + 1}
                        </span>
                        <strong className="truncate text-sm font-bold text-slate-800" dir="auto">
                          {q.prompt ? q.prompt.split("\n")[0] : `السؤال ${qi + 1}`}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!q.prompt || !q.options.filter(Boolean).length) {
                              toast({ variant: "destructive", description: "اكتب نص السؤال والاختيارات أولاً" });
                              return;
                            }
                            try {
                              await adminApi("/api/admin/learning/question-bank", {
                                method: "POST",
                                body: JSON.stringify({
                                  prompt: q.prompt,
                                  options: q.options,
                                  correctIndex: q.correctIndex,
                                  explanation: q.explanation,
                                  imageUrl: q.imageUrl,
                                  courseId: quizForm.courseId,
                                  category: quizForm.category || "عام",
                                  stage: quizForm.stage,
                                  stages: quizForm.stages,
                                }),
                              });
                              toast({ title: "تم حفظ السؤال في بنك الأسئلة 📚" });
                            } catch (e) {
                              toast({ variant: "destructive", description: (e as Error).message });
                            }
                          }}
                          title="حفظ السؤال في بنك الأسئلة"
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold transition"
                        >
                          <BookOpen className="h-3.5 w-3.5" /> حفظ بالبنك
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateQuestion(qi)}
                          title="تكرار السؤال"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-primary transition"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleQuestion(qi)}
                          title={collapsedQuestions.has(qi) ? "فتح السؤال" : "طي السؤال"}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 transition"
                        >
                          {collapsedQuestions.has(qi) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </button>
                        {quizForm.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setQuizForm({
                                ...quizForm,
                                questions: quizForm.questions.filter((_, i) => i !== qi),
                              })
                            }
                            title="حذف السؤال"
                            className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={collapsedQuestions.has(qi) ? "hidden" : "space-y-4 p-5"}>
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-slate-700">نص السؤال <span className="text-red-500">*</span></label>
                        <textarea
                          required
                          dir="auto"
                          rows={3}
                          placeholder="اكتب نص السؤال هنا..."
                          value={q.prompt}
                          onChange={(e) => setQuestion(qi, { prompt: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold whitespace-pre-wrap leading-relaxed focus:border-primary focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">رابط صورة السؤال (اختياري)</label>
                          <input
                            dir="ltr"
                            placeholder="https://..."
                            value={q.imageUrl || ""}
                            onChange={(e) => setQuestion(qi, { imageUrl: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium focus:outline-none text-left"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">الشرح والتفسير (اختياري)</label>
                          <input
                            dir="auto"
                            placeholder="توضيح الإجابة النموذجية..."
                            value={q.explanation || ""}
                            onChange={(e) => setQuestion(qi, { explanation: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-extrabold text-slate-700">الاختيارات (حدد الإجابة الصحيحة)</label>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {q.options.map((option, oi) => {
                            const isCorrect = q.correctIndex === oi;
                            return (
                              <div
                                key={oi}
                                onClick={() => setQuestion(qi, { correctIndex: oi })}
                                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition ${
                                  isCorrect
                                    ? "border-emerald-500 bg-emerald-50/80 shadow-sm"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                }`}
                              >
                                <div
                                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                                    isCorrect
                                      ? "border-emerald-600 bg-emerald-600 text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isCorrect && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                </div>
                                <input
                                  required
                                  dir="auto"
                                  placeholder={`الاختيار ${String.fromCharCode(65 + oi)}`}
                                  value={option}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    setQuestion(qi, {
                                      options: q.options.map((o, i) => (i === oi ? e.target.value : o)),
                                    })
                                  }
                                  className="w-full bg-transparent text-sm font-semibold focus:outline-none"
                                />
                                {isCorrect && (
                                  <span className="shrink-0 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    الإجابة الصحيحة
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setQuizForm({
                      ...quizForm,
                      questions: [
                        ...quizForm.questions,
                        { prompt: "", options: ["", "", "", ""], correctIndex: 0 },
                      ],
                    })
                  }
                  className="w-full border-dashed border-slate-300 py-6 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" /> إضافة سؤال جديد
                </Button>
              </div>
            )}

            {/* FILE IMPORT MODE */}
            {questionSource === "file" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-800">استيراد الأسئلة من ملف جاهز</h3>
                  <p className="text-xs text-slate-500">يدعم ملفات Word (DOCX) و PDF و TXT النقر المباشر.</p>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-4">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <strong className="block text-sm font-extrabold text-slate-800">اختر أو اسحب ملف الأسئلة هنا</strong>
                    <span className="text-xs text-slate-400">PDF, Word (.docx), أو TXT (بحد أقصى 20 ميجابايت)</span>
                  </div>
                  <input
                    ref={quizImportInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        importQuizQuestions(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      type="button"
                      disabled={isImportingQuestions}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        quizImportInputRef.current?.click();
                      }}
                      className="font-bold text-xs"
                    >
                      {isImportingQuestions ? "جارٍ قراءة الأسئلة..." : "استيراد ملف للاختبار الحالي"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isImportingQuestions}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!quizImportInputRef.current?.files?.[0]) {
                          quizImportInputRef.current?.click();
                          return;
                        }
                        const file = quizImportInputRef.current.files[0];
                        setIsImportingQuestions(true);
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          const result = await adminApi<{ questions: Question[] }>(
                            "/api/admin/learning/quizzes/import",
                            { method: "POST", body: formData }
                          );
                          if (result.questions?.length) {
                            const batchRes = await adminApi<{ count: number }>(
                              "/api/admin/learning/question-bank/batch-import",
                              {
                                method: "POST",
                                body: JSON.stringify({
                                  questions: result.questions,
                                  courseId: quizForm.courseId,
                                  category: quizForm.category,
                                  stage: quizForm.stage,
                                  stages: quizForm.stages,
                                }),
                              }
                            );
                            toast({ title: `تمت إضافة ${batchRes.count} سؤال بنجاح إلى بنك الأسئلة الشامل 📚` });
                          }
                        } catch (err) {
                          toast({ variant: "destructive", description: (err as Error).message });
                        } finally {
                          setIsImportingQuestions(false);
                        }
                      }}
                      className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold text-xs"
                    >
                      <BookOpen className="h-4 w-4 ml-1" /> استيراد وحفظ في بنك الأسئلة فوراً
                    </Button>
                  </div>
                </div>

                {importWarnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
                    <strong className="flex items-center gap-1.5 font-bold"><AlertCircle className="h-4 w-4 text-amber-600" /> تنبيهات المراجعة:</strong>
                    <ul className="list-disc pr-5 space-y-1 text-amber-800">
                      {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* QUESTION BANK MODE */}
            {questionSource === "bank" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm space-y-5">
                <div className="border-b border-emerald-100 pb-3">
                  <h3 className="text-base font-black text-emerald-950 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-600" /> السحب التلقائي والمخصص من بنك الأسئلة
                  </h3>
                  <p className="text-xs text-emerald-700 mt-0.5">تحديد عدد الأسئلة المطلوبة وسحبها عشوائياً من الأسئلة المحفوظة لديك.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 items-end bg-white p-4 rounded-xl border border-emerald-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">عدد الأسئلة المطلوب اختيارها للاختبار:</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      defaultValue={10}
                      id="bankQuestionCountInput"
                      placeholder="مثال: 15"
                      className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-bold text-center"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Button
                      type="button"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-11"
                      onClick={async () => {
                        const countInput = (document.getElementById("bankQuestionCountInput") as HTMLInputElement)?.value;
                        const count = Number(countInput) || 10;
                        try {
                          const res = await adminApi<{ title: string; questions: Question[] }>(
                            "/api/admin/learning/question-bank/generate-quiz",
                            {
                              method: "POST",
                              body: JSON.stringify({
                                courseId: quizForm.courseId,
                                category: quizForm.category,
                                count,
                              }),
                            }
                          );
                          setQuizForm({ ...quizForm, questions: res.questions });
                          toast({ title: `تم سحب ${res.questions.length} سؤال من البنك بنجاح 🎉` });
                          setQuestionSource("manual");
                        } catch (e) {
                          toast({ variant: "destructive", description: (e as Error).message });
                        }
                      }}
                    >
                      <Sparkles className="h-4 w-4 ml-1" /> سحب الأسئلة المحددة وإضافتها للاختبار
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Review and Publish */}
        {currentStep === 4 && (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900">4. مراجعة وتأكيد إنشاء الاختبار</h2>
              <p className="text-xs text-slate-500">راجع جميع البيانات والتنبيهات قبل الحفظ والنشر.</p>
            </div>

            {/* Validation Alerts */}
            {validationWarnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <strong className="flex items-center gap-2 text-xs font-extrabold text-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600" /> توجد بعض الخانات بحاجة لمراجعة:
                </strong>
                <ul className="list-disc pr-5 text-xs text-amber-800 space-y-1">
                  {validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {/* Summary Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <strong className="block text-xs font-black text-slate-500 uppercase">بيانات الكورس والمراحل</strong>
                <h4 className="font-extrabold text-sm text-slate-900">{quizForm.title || "بدون عنوان"}</h4>
                <p className="text-xs text-slate-600">
                  الكورس: <b>{selectedQuizCourse?.title || "غير محدد"}</b>
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {quizForm.stages.map((st) => (
                    <span key={st} className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      {st}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <strong className="block text-xs font-black text-slate-500 uppercase">الأسئلة والدرجات</strong>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                  <div>إجمالي الأسئلة: <b className="text-primary">{quizForm.questions.length}</b></div>
                  <div>الأسئلة للطالب: <b className="text-purple-600">{quizForm.questionsToShow ? `${quizForm.questionsToShow} من ${quizForm.questions.length}` : "الكل"}</b></div>
                  <div>درجة النجاح: <b>{quizForm.passingScore}%</b></div>
                  <div>المدة: <b>{isTimeUnlimited ? "مفتوح" : `${quizForm.durationMinutes} دقيقة`}</b></div>
                  <div>المحاولات: <b>{isAttemptsUnlimited ? "غير محدود" : quizForm.maxAttempts}</b></div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quizForm.isPublished}
                  onChange={(e) => setQuizForm({ ...quizForm, isPublished: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <div>
                  <strong className="block text-sm font-extrabold text-slate-900">نشر الاختبار للطلاب فور الحفظ 🚀</strong>
                  <span className="text-xs text-slate-400">سيكون الاختبار متاحاً فوراً لطلاب المراحل المحددة.</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STICKY BOTTOM ACTION BAR */}
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep((s) => (s - 1) as any)}
                  className="font-bold text-xs gap-1.5"
                >
                  <ChevronRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" /> السابق
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="outline"
                className="font-bold text-xs"
              >
                حفظ كمسودة 📝
              </Button>

              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep((s) => (s + 1) as any)}
                  className="font-bold text-xs px-6 gap-1.5"
                >
                  التالي <ChevronLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="font-black text-xs px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                >
                  {editingQuizId ? "حفظ التعديلات" : quizForm.isPublished ? "حفظ ونشر فوراً 🚀" : "حفظ الاختبار"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* QUIZZES LIST SIDE PANEL / SECTION */}
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        {/* Section Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  الاختبارات المنشورة والمسودات
                </h3>
                <span className="text-xs font-black bg-violet-100 text-violet-800 px-2.5 py-0.5 rounded-full border border-violet-200">
                  {quizzes.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تصفية الاختبارات بالمرحلة الدراسية، متابعة إحصائيات المختبرين، والتحكم بالنشر والتعديل.
              </p>
            </div>
          </div>

          {/* Search Box & Reset Button */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="بحث باسم الاختبار أو الكورس..."
                value={quizListSearch}
                onChange={(e) => setQuizListSearch(e.target.value)}
                className="w-full pl-8 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              />
              {quizListSearch && (
                <button
                  type="button"
                  onClick={() => setQuizListSearch("")}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {(quizListStageFilter !== "all" || quizListStatusFilter !== "all" || quizListSearch) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuizListStageFilter("all");
                  setQuizListStatusFilter("all");
                  setQuizListSearch("");
                }}
                className="h-9 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                title="إعادة ضبط الفلاتر"
              >
                <RotateCcw className="h-3.5 w-3.5 ml-1" /> مسح
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls: Stage Filter + Status Filter */}
        <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
          {/* Stage Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            <span className="text-xs font-black text-slate-700 shrink-0 flex items-center gap-1.5 ml-1">
              <GraduationCap className="h-4 w-4 text-violet-600" /> فلترة بالمرحلة:
            </span>

            <button
              type="button"
              onClick={() => setQuizListStageFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                quizListStageFilter === "all"
                  ? "bg-violet-600 text-white shadow-sm ring-2 ring-violet-600/30"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              جميع المراحل ({quizzes.length})
            </button>

            {allStagesInQuizzes.stages.map(({ stage, count }) => (
              <button
                key={stage}
                type="button"
                onClick={() => setQuizListStageFilter(stage)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  quizListStageFilter === stage
                    ? "bg-violet-600 text-white shadow-sm ring-2 ring-violet-600/30"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="truncate max-w-[200px]">{stage}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    quizListStageFilter === stage
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}

            {allStagesInQuizzes.noStageCount > 0 && (
              <button
                type="button"
                onClick={() => setQuizListStageFilter("no_stage")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  quizListStageFilter === "no_stage"
                    ? "bg-violet-600 text-white shadow-sm ring-2 ring-violet-600/30"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>بدون مرحلة محددة</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                  {allStagesInQuizzes.noStageCount}
                </span>
              </button>
            )}
          </div>

          {/* Status & Results Summary Bar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-slate-200/70 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold ml-1">حالة النشر:</span>
              <button
                type="button"
                onClick={() => setQuizListStatusFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  quizListStatusFilter === "all"
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                الكل ({quizzes.length})
              </button>
              <button
                type="button"
                onClick={() => setQuizListStatusFilter("published")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  quizListStatusFilter === "published"
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                المنشورة ({quizzes.filter((q) => q.isPublished).length})
              </button>
              <button
                type="button"
                onClick={() => setQuizListStatusFilter("draft")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  quizListStatusFilter === "draft"
                    ? "bg-amber-700 text-white"
                    : "text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                المسودات ({quizzes.filter((q) => !q.isPublished).length})
              </button>
            </div>

            <div className="text-slate-500 text-[11px] font-semibold">
              عرض <strong className="text-violet-700 font-extrabold">{filteredQuizzes.length}</strong> من أصل{" "}
              <strong className="text-slate-800 font-extrabold">{quizzes.length}</strong> اختبار
            </div>
          </div>
        </div>

        {/* Quizzes Grid or Empty State */}
        {filteredQuizzes.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-800">لا توجد اختبارات تطابق الفلترة المحددة</p>
              <p className="text-xs text-slate-500">
                جرب اختيار مرحلة دراسية أخرى أو مسح نص البحث للاطلاع على الاختبارات.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuizListStageFilter("all");
                setQuizListStatusFilter("all");
                setQuizListSearch("");
              }}
              className="mt-2 text-xs font-bold text-violet-700 hover:bg-violet-50"
            >
              عرض جميع الاختبارات ({quizzes.length})
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredQuizzes.map((q) => {
              const quizStages = Array.isArray(q.stages) && q.stages.length > 0
                ? q.stages.filter(Boolean)
                : q.stage && q.stage.trim() ? [q.stage.trim()] : [];
              const stagesLabel = quizStages.join(" · ") || "بدون مرحلة محددة";
              const uniqueTested = q.uniqueStudentsCount || 0;
              const totalAttempts = q.attemptsCount || uniqueTested;

              return (
                <article
                  key={q.id}
                  className={`rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between space-y-3.5 ${
                    q.isPublished
                      ? "border-slate-200 bg-white hover:border-violet-300 hover:shadow-md"
                      : "border-dashed border-slate-300 bg-slate-50/70 hover:border-slate-400"
                  }`}
                >
                  {/* Top Badges: Stage & Published Status */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 max-w-[65%] truncate"
                        title={stagesLabel}
                      >
                        <GraduationCap className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                        <span className="truncate">{stagesLabel}</span>
                      </span>

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5 ${
                          q.isPublished
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-slate-200 text-slate-700 border border-slate-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            q.isPublished ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
                          }`}
                        />
                        {q.isPublished ? "منشور للطلاب" : "مسودة مؤقتة"}
                      </span>
                    </div>

                    {/* Quiz Title & Scope */}
                    <div>
                      <h4
                        className="font-black text-sm text-slate-900 leading-snug line-clamp-2"
                        title={q.title}
                      >
                        {q.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-600">
                          {q.scope === "lesson" ? "اختبار درس" : "اختبار كورس / شامل"}
                        </span>
                        {q.category && (
                          <>
                            <span>·</span>
                            <span className="truncate text-slate-500">{q.category}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Prominent Student Tester Count Badge (بشكل مميز) */}
                    {uniqueTested > 0 ? (
                      <div className="flex items-center justify-between bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white p-2.5 rounded-xl shadow-xs border border-violet-400/40">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-xs font-black tracking-tight">
                              {uniqueTested} {uniqueTested === 1 ? "طالب اختبر" : "طلاب اختبروا"}
                            </div>
                            <div className="text-[10px] text-violet-100 font-medium">
                              تم خوض الاختبار {totalAttempts} {totalAttempts === 1 ? "مرة" : "مرات"}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-black bg-white text-indigo-700 px-2.5 py-1 rounded-lg shadow-2xs">
                          {uniqueTested}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-slate-100/90 text-slate-500 px-3 py-2 rounded-xl border border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className="text-xs font-semibold">لم يختبره طلاب بعد</span>
                        </div>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-md text-slate-400 font-bold border border-slate-200">
                          0 مختبر
                        </span>
                      </div>
                    )}

                    {/* Optional Description */}
                    {q.description && (
                      <p
                        className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 line-clamp-2"
                        title={q.description}
                      >
                        {q.description}
                      </p>
                    )}

                    {/* Complete Quiz Metadata Details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/60">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          <strong>{q.questions.length}</strong> أسئلة
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{q.durationMinutes ? `${q.durationMinutes} دقيقة` : "بدون حد وقت"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        <span>
                          نجاح <strong>{q.passingScore}%</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {q.maxAttempts === 0 ? "محاولات مفتوحة" : `${q.maxAttempts || 3} محاولات`}
                        </span>
                      </div>
                      {q.createdAt && (
                        <div className="col-span-2 flex items-center gap-1.5 text-slate-400 text-[10px] pt-1.5 border-t border-slate-200/60">
                          <Calendar className="h-3 w-3" />
                          <span>
                            تاريخ الإنشاء:{" "}
                            {new Date(q.createdAt).toLocaleDateString("ar-EG", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 border-t border-slate-200/70 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewQuiz(q)}
                      className="h-8 flex-1 text-xs font-bold text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                      title="معاينة أسئلة الاختبار"
                    >
                      <Eye className="h-3.5 w-3.5 ml-1" /> معاينة
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        editQuiz(q);
                        setCurrentStep(1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="h-8 flex-1 text-xs font-bold"
                      title="تعديل الاختبار"
                    >
                      <Edit2 className="h-3.5 w-3.5 ml-1" /> تعديل
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleQuiz(q)}
                      className={`h-8 text-xs font-bold ${
                        q.isPublished
                          ? "hover:bg-amber-50 hover:text-amber-700"
                          : "hover:bg-emerald-50 hover:text-emerald-700"
                      }`}
                      title={q.isPublished ? "إخفاء الاختبار ونقله للمسودات" : "نشر الاختبار للطلاب"}
                    >
                      {q.isPublished ? "إخفاء" : "نشر"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteQuiz(q.id)}
                      className="h-8 px-2.5 text-xs"
                      title="حذف الاختبار نهائياً"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK PREVIEW QUIZ MODAL */}
      {previewQuiz && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5"
          onClick={(e) => e.target === e.currentTarget && setPreviewQuiz(null)}
        >
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 text-right max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="shrink-0 flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{previewQuiz.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${previewQuiz.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {previewQuiz.isPublished ? "منشور للطلاب 🟢" : "مسودة غير منشورة 🔒"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-[11px] text-slate-500">
                      {previewQuiz.questions?.length || 0} أسئلة · درجة النجاح {previewQuiz.passingScore}% · {previewQuiz.durationMinutes ? `${previewQuiz.durationMinutes} دقيقة` : "بدون وقت"}
                    </p>
                    {(previewQuiz.uniqueStudentsCount || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full border border-violet-200">
                        <Users className="h-3 w-3" />
                        {previewQuiz.uniqueStudentsCount} طالب اختبر ({previewQuiz.attemptsCount || previewQuiz.uniqueStudentsCount} محاولة)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await toggleQuiz(previewQuiz);
                    setPreviewQuiz({ ...previewQuiz, isPublished: !previewQuiz.isPublished });
                  }}
                  className="h-8 text-xs font-bold"
                >
                  {previewQuiz.isPublished ? "تحويل لمسودة 🔒" : "نشر للطلاب الآن 🚀"}
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewQuiz(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {(previewQuiz.questions || []).map((q, qIdx) => {
                const isEnglish = isEnglishQuestion(q.prompt, q.options);
                return (
                  <div key={qIdx} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-white text-[10px] font-black">
                          {qIdx + 1}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          isEnglish ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {isEnglish ? "EN (LTR)" : "عربي (RTL)"}
                        </span>
                        <span className="text-[11px] text-slate-500 font-bold">
                          {q.points || 1} درجة
                        </span>
                      </div>
                    </div>

                    <p
                      dir={isEnglish ? "ltr" : "rtl"}
                      className={`text-xs font-bold text-slate-900 leading-relaxed whitespace-pre-line ${
                        isEnglish ? "text-left font-sans" : "text-right font-sans"
                      }`}
                    >
                      {q.prompt}
                    </p>

                    {q.imageUrl && (
                      <div className="max-w-xs rounded-xl overflow-hidden border border-slate-200">
                        <img src={q.imageUrl} alt="صورة السؤال" className="h-32 w-full object-cover" />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1" dir={isEnglish ? "ltr" : "rtl"}>
                      {(q.options || []).map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correctIndex;
                        const letter = getOptionLabel(oIdx, isEnglish);
                        return (
                          <div
                            key={oIdx}
                            dir={isEnglish ? "ltr" : "rtl"}
                            className={`p-2 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                              isCorrect
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                                : "bg-white border-slate-200 text-slate-800"
                            }`}
                          >
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black mt-0.5 ${
                              isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                              {letter}
                            </span>
                            <span className={`flex-1 whitespace-normal break-words leading-relaxed ${isEnglish ? "text-left font-sans" : "text-right"}`}>
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
                      <div dir={isEnglish ? "ltr" : "rtl"} className={`p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-900 ${isEnglish ? "text-left font-sans" : "text-right font-sans"}`}>
                        <span className="font-bold block">{isEnglish ? "Explanation / Steps:" : "التفسير:"}</span>
                        <p className="text-slate-700">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  editQuiz(previewQuiz);
                  setPreviewQuiz(null);
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-xs font-bold gap-1.5"
              >
                <Edit2 className="h-3.5 w-3.5" /> فتح الاختبار في المحرر الكامل
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreviewQuiz(null)} className="text-xs font-bold">
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
