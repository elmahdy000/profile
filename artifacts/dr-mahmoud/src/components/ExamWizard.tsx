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
  Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ACADEMIC_TRACKS, getStagesForTrack, getTrack } from "@/data/academic";

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
  passingScore: number;
  durationMinutes?: number | null;
  shuffleQuestions?: boolean;
  showExplanations?: boolean;
  maxAttempts?: number | null;
  isPublished: boolean;
  questions: Question[];
  createdAt?: string;
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
}: ExamWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [questionSource, setQuestionSource] = useState<"manual" | "file" | "bank">("manual");
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<number>>(new Set());
  const [quizStageSearch, setQuizStageSearch] = useState("");
  const [isImportingQuestions, setIsImportingQuestions] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const quizImportInputRef = useRef<HTMLInputElement>(null);

  // Unlimited toggles state
  const isTimeUnlimited = !quizForm.durationMinutes || quizForm.durationMinutes === "0";
  const isAttemptsUnlimited = !quizForm.maxAttempts || quizForm.maxAttempts === 0;

  // Selected Quiz Course & Track
  const selectedQuizCourse = learningCourses.find(
    (course) => String(course.id) === quizForm.courseId
  );
  const selectedQuizTrack = getTrack(selectedQuizCourse?.category || selectedQuizCourse?.title);

  // Available Stages (Use course stages if restricted, or track stages, or all tracks if course isn't restricted)
  const availableQuizStages = useMemo(() => {
    if (selectedQuizCourse?.stages?.length) {
      return selectedQuizCourse.stages;
    }
    if (selectedQuizTrack) {
      return getStagesForTrack(selectedQuizTrack.id);
    }
    return ACADEMIC_TRACKS.flatMap((track) => track.stages);
  }, [selectedQuizCourse, selectedQuizTrack]);

  // Group stages logically by Track
  const quizStageGroups = useMemo(() => {
    if (selectedQuizCourse?.stages?.length) {
      return [{ title: selectedQuizCourse.title, stages: selectedQuizCourse.stages }];
    }

    if (selectedQuizTrack) {
      return [{ title: selectedQuizTrack.title, stages: availableQuizStages }];
    }

    // Default: Show all academic tracks
    return ACADEMIC_TRACKS.map((track) => ({
      title: track.title,
      stages: track.stages,
    }));
  }, [selectedQuizCourse, selectedQuizTrack, availableQuizStages]);

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
      const hasManualQuestion = quizForm.questions.some(
        (q) => q.prompt.trim() || q.options.some((o) => o.trim())
      );
      setQuizForm((current: QuizFormState) => ({
        ...current,
        questions: hasManualQuestion ? [...current.questions, ...result.questions] : result.questions,
      }));
      setImportWarnings(result.warnings || []);
      toast({ title: `تم استيراد ${result.questions.length} سؤال بنجاح 🎉` });
      setQuestionSource("manual");
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
                        <strong className="truncate text-sm font-bold text-slate-800">
                          {q.prompt || `السؤال ${qi + 1}`}
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
                        <input
                          required
                          placeholder="اكتب نص السؤال هنا..."
                          value={q.prompt}
                          onChange={(e) => setQuestion(qi, { prompt: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold focus:border-primary focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">رابط صورة السؤال (اختياري)</label>
                          <input
                            placeholder="https://..."
                            value={q.imageUrl || ""}
                            onChange={(e) => setQuestion(qi, { imageUrl: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-medium focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">الشرح والتفسير (اختياري)</label>
                          <input
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
                    onChange={(e) => e.target.files?.[0] && importQuizQuestions(e.target.files[0])}
                  />
                  <Button
                    type="button"
                    disabled={isImportingQuestions}
                    onClick={() => quizImportInputRef.current?.click()}
                    className="font-bold text-xs"
                  >
                    {isImportingQuestions ? "جارٍ قراءة الأسئلة..." : "تصفح واختيار الملف"}
                  </Button>
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
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-emerald-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-emerald-950 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-emerald-600" /> السحب التلقائي من بنك الأسئلة
                    </h3>
                    <p className="text-xs text-emerald-700 mt-0.5">اختر عشوائياً أسئلة محفوظة سلفاً في بنك الأسئلة.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs"
                    onClick={async () => {
                      try {
                        const res = await adminApi<{ title: string; questions: Question[] }>(
                          "/api/admin/learning/question-bank/generate-quiz",
                          {
                            method: "POST",
                            body: JSON.stringify({
                              courseId: quizForm.courseId,
                              category: quizForm.category,
                              count: 10,
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
                    سحب 10 أسئلة عشوائية من البنك
                  </Button>
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
                  <div>عدد الأسئلة: <b className="text-primary">{quizForm.questions.length}</b></div>
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
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900">الاختبارات المنشورة والمسودات ({quizzes.length})</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => (
            <article key={q.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 truncate">{q.title}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                    {q.isPublished ? "منشور" : "مسودة"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {q.questions.length} سؤال · نجاح {q.passingScore}% · {q.durationMinutes ? `${q.durationMinutes} دقيقة` : "بدون وقت"}
                </p>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-200/60 pt-3">
                <Button variant="outline" size="sm" onClick={() => editQuiz(q)} className="h-8 text-xs font-bold">
                  <Edit2 className="h-3.5 w-3.5" /> تعديل
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleQuiz(q)} className="h-8 text-xs font-bold">
                  {q.isPublished ? "إخفاء" : "نشر"}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deleteQuiz(q.id)} className="h-8 text-xs">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
