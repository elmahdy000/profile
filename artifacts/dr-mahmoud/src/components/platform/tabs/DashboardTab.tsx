import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Award,
  BookCheck,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileCode,
  FileEdit,
  FileText,
  FolderDown,
  FolderOpen,
  Layers,
  MapPin,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrackForStage } from "@/data/academic";
import type {
  LearningFile,
  ProgressRow,
  Quiz,
  Student,
  VideoSummary,
} from "@/types/platform";
import {
  buildStudentDashboardModel,
  type ContinueLearningModel,
  type LearningPlanTask,
  type UnifiedProgressModel,
} from "@/lib/studentDashboardEngine";
import { EmptyState } from "../StudentDashboardUI";
import { PaymentBanner } from "./PaymentBanner";
import { DailyChallengeCard } from "@/components/kholasa/DailyChallengeCard";

export type StudentNavTab =
  | "lessons"
  | "kholasa"
  | "mistakes"
  | "essay-exams"
  | "files"
  | "quizzes"
  | "homework"
  | "summaries"
  | "self-assessment"
  | "offline-vault"
  | "profile";

function getFirstName(fullName?: string | null): string {
  const clean = String(fullName || "").trim();
  if (!clean) return "بطل";
  return clean.split(/\s+/)[0] || clean;
}

function getFileIcon(fileType: string) {
  if (fileType === "PDF") return FileText;
  if (["CPP", "C", "JS", "TS", "PY", "HTML", "CSS"].includes(fileType)) return FileCode;
  if (fileType === "ARCHIVE") return FileArchive;
  return FileText;
}

// ── A. Compact Student Header ──
function CompactStudentHeader({
  student,
  academicTrackTitle,
  state,
  onOpenSearch,
}: {
  student: Student;
  academicTrackTitle?: string;
  state: "new" | "active" | "needs_revision" | "completed_all";
  onOpenSearch?: () => void;
}) {
  const firstName = getFirstName(student.name);
  const subtitle =
    state === "new"
      ? "ابدأ أول درس ليك دلوقتي وخلي مذاكرتك ماشية بنظام."
      : state === "needs_revision"
        ? "راجع غلطاتك الأول وكمّل مذاكرتك من آخر نقطة وقفت عندها."
        : state === "completed_all"
          ? "خلصت كل المحتوى المتاح دلوقتي، تقدر تراجع أو تتدرب من بنك الأسئلة."
          : "كمّل مذاكرتك من آخر نقطة وقفت عندها.";

  return (
    <header
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4"
      dir="rtl"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            أهلاً يا {firstName}
          </h1>
          {academicTrackTitle && (
            <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground border border-border">
              {academicTrackTitle}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      </div>

      {onOpenSearch && (
        <button
          type="button"
          onClick={onOpenSearch}
          className="inline-flex items-center justify-between gap-3 h-10 px-3.5 rounded-xl border border-border bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground text-xs font-bold transition-colors shrink-0 self-start sm:self-auto min-w-[190px] cursor-pointer"
          aria-label="ابحث في الدروس والملفات والاختبارات"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary shrink-0" />
            <span>ابحث في المنهج...</span>
          </span>
          <kbd
            dir="ltr"
            className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground"
          >
            Ctrl K
          </kbd>
        </button>
      )}
    </header>
  );
}

// ── B. Intelligent Learning Continuation Hero ──
function ContinueLearningHero({
  model,
  fallbackImage,
  onExecuteCta,
  onOpenLessons,
}: {
  model: ContinueLearningModel;
  fallbackImage?: string;
  onExecuteCta: () => void;
  onOpenLessons: () => void;
}) {
  const { video, progressPct, lastPositionLabel, remainingLabel, isCompleted, unitLabel, cta } = model;
  const thumbnail = video?.thumbnailUrl || fallbackImage || "/university-cs-path.webp";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group rounded-2xl border border-border bg-card shadow-2xs overflow-hidden grid grid-cols-1 md:grid-cols-[minmax(240px,360px)_1fr]"
      dir="rtl"
    >
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onExecuteCta}
        className="relative aspect-video md:aspect-auto md:min-h-[210px] w-full overflow-hidden bg-slate-900 text-right cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={cta.label}
      >
        <img
          src={thumbnail}
          alt={video?.title || "صورة الدرس الحالي"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-slate-950/45 group-hover:bg-slate-950/30 transition-colors" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-600 text-white shadow-md transition-transform duration-200 group-hover:scale-105">
            <Play className="h-5 w-5 fill-white mr-0.5" />
          </span>
        </div>
        {(lastPositionLabel || video?.durationText) && (
          <span
            dir="ltr"
            className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-lg bg-slate-950/85 px-2.5 py-1 text-[11px] font-mono font-bold text-white"
          >
            <Clock className="h-3 w-3 text-blue-400" />
            {lastPositionLabel ? `وقفت عند ${lastPositionLabel}` : video?.durationText}
          </span>
        )}
      </button>

      {/* Content & Primary Action */}
      <div className="p-5 sm:p-6 flex flex-col justify-between gap-4 min-w-0">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-[11px] font-bold border ${
                isCompleted
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3 w-3 fill-current" />
              )}
              <span>
                {isCompleted
                  ? "خلصت الدرس ده"
                  : progressPct > 0
                    ? "كمّل من آخر نقطة"
                    : "الدرس الحالي في منهجك"}
              </span>
            </span>

            {unitLabel && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground min-w-0">
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[260px]">{unitLabel}</span>
              </span>
            )}
          </div>

          <h2
            dir="auto"
            style={{ unicodeBidi: "isolate" }}
            className="text-lg sm:text-xl font-black text-foreground leading-snug break-words"
          >
            {video?.title || "محتوى منهجك هيظهر هنا بمجرد التفعيل"}
          </h2>

          {remainingLabel && !isCompleted && (
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>متبقي حوالي</span>
              <span dir="ltr" className="font-mono font-bold text-foreground">
                {remainingLabel}
              </span>
              <span>لإكمال الدرس</span>
            </p>
          )}
        </div>

        {/* Lesson Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">تقدّمك في الدرس ده</span>
            <span className="font-mono text-foreground tabular-nums">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isCompleted ? "bg-emerald-600 dark:bg-emerald-500" : "bg-blue-600 dark:bg-blue-500"
              }`}
            />
          </div>
        </div>

        {/* Single Clear Primary CTA + Secondary Link */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <Button
            type="button"
            onClick={onExecuteCta}
            className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>{cta.label}</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onOpenLessons}
            className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
          >
            كل دروس المنهج
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

// ── C. Today's Learning Plan (خطة مذاكرتك النهارده) ──
function TodayLearningPlanSection({
  tasks,
  onRunTask,
}: {
  tasks: LearningPlanTask[];
  onRunTask: (task: LearningPlanTask) => void;
}) {
  return (
    <section
      aria-label="خطة مذاكرتك النهارده"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3.5"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-black text-foreground">خطة مذاكرتك النهارده</h2>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            أهم الخطوات المطلوبة منك دلوقتي بالترتيب حسب منهجك.
          </p>
        </div>
        <span className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-mono font-bold text-muted-foreground border border-border shrink-0">
          {tasks.length} مهام
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center space-y-1.5">
          <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <p className="text-sm font-bold text-foreground">ممتاز، مفيش مهام متأخرة عليك دلوقتي</p>
          <p className="text-xs text-muted-foreground">
            تقدر تراجع دروسك أو تتدرب على أسئلة جديدة من التقييم الذاتي.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {tasks.map((task) => {
            const Icon =
              task.kind === "mistakes"
                ? Target
                : task.kind === "homework"
                  ? BookCheck
                  : task.kind === "quiz"
                    ? ClipboardCheck
                    : BookOpen;

            const iconTone =
              task.kind === "mistakes"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : task.kind === "homework"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : task.kind === "quiz"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";

            return (
              <div
                key={task.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card hover:bg-muted/40 p-3.5 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${iconTone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                      <span className="text-muted-foreground">{task.typeLabel}</span>
                      <span className="text-border">•</span>
                      <span
                        className={
                          task.priority === "urgent"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground/80"
                        }
                      >
                        {task.statusLabel}
                      </span>
                      {task.durationLabel && (
                        <>
                          <span className="text-border">•</span>
                          <span
                            dir="ltr"
                            className="font-mono text-muted-foreground"
                          >
                            {task.durationLabel}
                          </span>
                        </>
                      )}
                    </div>
                    <strong
                      dir="auto"
                      style={{ unicodeBidi: "isolate" }}
                      className="block text-xs sm:text-[13px] font-extrabold text-foreground leading-snug break-words"
                    >
                      {task.title}
                    </strong>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={task.priority === "urgent" ? "default" : "outline"}
                  onClick={() => onRunTask(task)}
                  className={`h-8.5 px-3.5 rounded-lg text-xs font-bold shrink-0 self-end sm:self-center cursor-pointer ${
                    task.priority === "urgent"
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : ""
                  }`}
                >
                  {task.actionLabel}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── D. Unified Student Progress (Single Source of Truth — Zero Duplication) ──
function UnifiedProgressOverview({
  progress,
  onOpenQuizzes,
}: {
  progress: UnifiedProgressModel;
  onOpenQuizzes: () => void;
}) {
  return (
    <section
      aria-label="تقدّمك في المنهج"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-4"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-black text-foreground">تقدّمك في المنهج</h2>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            ملخص حقيقي لإنجازك في الدروس والاختبارات.
          </p>
        </div>
        <span className="font-mono text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">
          {progress.overallCompletionPct}%
        </span>
      </div>

      {/* Overall Completion Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress.overallCompletionPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
        />
      </div>

      {/* Clean 3-Metric Breakdown */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
          <span className="block text-[11px] font-bold text-muted-foreground">الدروس</span>
          <strong className="block text-base sm:text-lg font-black font-mono text-foreground tabular-nums">
            {progress.completedLessons}
            <span className="text-xs font-bold text-muted-foreground"> / {progress.totalLessons}</span>
          </strong>
          <span className="block text-[10.5px] font-medium text-muted-foreground">
            {progress.startedLessons > 0 ? `${progress.startedLessons} شغّال فيهم` : "مكتمل"}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
          <span className="block text-[11px] font-bold text-muted-foreground">الاختبارات</span>
          <strong className="block text-base sm:text-lg font-black font-mono text-foreground tabular-nums">
            {progress.attemptedExams}
            <span className="text-xs font-bold text-muted-foreground"> / {progress.availableExams}</span>
          </strong>
          <span className="block text-[10.5px] font-medium text-muted-foreground">
            {progress.passedExams > 0 ? `${progress.passedExams} ناجح` : "متاح للحل"}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
          <span className="block text-[11px] font-bold text-muted-foreground">متوسط الدرجات</span>
          <strong className="block text-base sm:text-lg font-black font-mono text-foreground tabular-nums">
            {progress.averageExamScore !== null ? `${progress.averageExamScore}%` : "—"}
          </strong>
          <span className="block text-[10.5px] font-medium text-muted-foreground">
            {progress.averageExamScore !== null
              ? progress.averageExamScore >= 85
                ? "مستوى ممتاز"
                : progress.averageExamScore >= 65
                  ? "مستوى جيد"
                  : "محتاج مراجعة"
              : "لسه مفيش نتائج"}
          </span>
        </div>
      </div>

      {/* Empty Exam Results State or Recent Scores */}
      {progress.recentAttemptedExams.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <strong className="block text-xs font-extrabold text-foreground">لسه مفيش نتائج</strong>
            <span className="block text-[11px] text-muted-foreground">
              حل أول اختبار علشان تقدر تتابع مستواك.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenQuizzes}
            className="h-8 px-3 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
          >
            الاختبارات
          </Button>
        </div>
      ) : (
        <div className="space-y-2 pt-1 border-t border-border">
          <span className="block text-[11px] font-bold text-muted-foreground">آخر اختباراتك</span>
          <div className="space-y-1.5">
            {progress.recentAttemptedExams.slice(0, 3).map((qz) => {
              const score = Math.round(Number(qz.bestScore || 0));
              const passed = score >= (qz.passingScore || 60);
              return (
                <div
                  key={qz.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/35 px-3 py-2 text-xs"
                >
                  <span
                    dir="auto"
                    style={{ unicodeBidi: "isolate" }}
                    className="font-bold text-foreground truncate"
                  >
                    {qz.title}
                  </span>
                  <span
                    className={`font-mono font-black shrink-0 ${
                      passed
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {score}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ── E. Smart Mistakes Center (ركن غلطاتي) ──
function SmartMistakesWidget({
  unresolvedCount,
  attemptedExams,
  onOpenMistakes,
  onOpenSelfAssessment,
}: {
  unresolvedCount: number;
  attemptedExams: number;
  onOpenMistakes: () => void;
  onOpenSelfAssessment: () => void;
}) {
  const hasAttempted = attemptedExams > 0 || unresolvedCount > 0;

  return (
    <section
      aria-label="ركن غلطاتي"
      className={`rounded-2xl border p-4 sm:p-5 shadow-2xs space-y-3 ${
        unresolvedCount > 0
          ? "border-rose-500/35 bg-card"
          : "border-border bg-card"
      }`}
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
              unresolvedCount > 0
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <Target className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-black text-foreground">ركن غلطاتي</h2>
            <p className="text-xs text-muted-foreground">
              {unresolvedCount > 0
                ? `عندك ${unresolvedCount} ${unresolvedCount === 1 ? "سؤال محتاج" : "أسئلة محتاجة"} مراجعة وإعادة حل.`
                : !hasAttempted
                  ? "لسه مفيش أسئلة اتحلت."
                  : "مفيش أخطاء متراكمة عليك دلوقتي."}
            </p>
          </div>
        </div>

        {unresolvedCount > 0 && (
          <span className="rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25 px-2.5 py-0.5 text-xs font-mono font-black shrink-0">
            {unresolvedCount}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {unresolvedCount > 0 ? (
          <Button
            type="button"
            onClick={onOpenMistakes}
            className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>راجع غلطاتك</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onOpenSelfAssessment}
            className="h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
            <span>اختبر نفسك</span>
          </Button>
        )}
      </div>
    </section>
  );
}

// ── F. Learning Tools Grid (أدوات المذاكرة — Complete Readable Labels) ──
function LearningToolsGrid({
  counts,
  onOpen,
}: {
  counts: {
    lessons: number;
    homeworks: number;
    files: number;
    exams: number;
    mistakes: number;
  };
  onOpen: (tab: StudentNavTab) => void;
}) {
  const tools: Array<{
    id: string;
    title: string;
    icon: typeof BookOpen;
    tone: string;
    count?: number;
    tab?: StudentNavTab;
    href?: string;
  }> = [
    { id: "lessons", title: "فيديوهات الشرح", icon: BookOpen, tone: "text-blue-600 dark:text-blue-400 bg-blue-500/10", count: counts.lessons, tab: "lessons" },
    { id: "kholasa", title: "الخلاصة والخرائط", icon: Sparkles, tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10", tab: "kholasa" },
    { id: "homework", title: "الواجب المنزلي", icon: BookCheck, tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10", count: counts.homeworks, tab: "homework" },
    { id: "files", title: "الملازم والملفات", icon: FolderOpen, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10", count: counts.files, tab: "files" },
    { id: "quizzes", title: "الاختبارات", icon: ClipboardCheck, tone: "text-blue-600 dark:text-blue-400 bg-blue-500/10", count: counts.exams, tab: "quizzes" },
    { id: "essay-exams", title: "الامتحانات المقالية", icon: FileEdit, tone: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10", tab: "essay-exams" },
    { id: "mistakes", title: "ركن غلطاتي", icon: Target, tone: "text-rose-600 dark:text-rose-400 bg-rose-500/10", count: counts.mistakes || undefined, tab: "mistakes" },
    { id: "summaries", title: "مذكراتي وتلخيصاتي", icon: FileText, tone: "text-slate-700 dark:text-slate-300 bg-muted", tab: "summaries" },
    { id: "offline-vault", title: "محفظة الأوفلاين", icon: FolderDown, tone: "text-slate-700 dark:text-slate-300 bg-muted", tab: "offline-vault" },
    { id: "self-assessment", title: "التقييم الذاتي", icon: Award, tone: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10", tab: "self-assessment" },
    { id: "honor-board", title: "لوحة الشرف", icon: Trophy, tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10", href: "/honor-board" },
  ];

  return (
    <section aria-label="أدوات المذاكرة" className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-foreground">أدوات المذاكرة</h2>
        <span className="text-xs font-medium text-muted-foreground">وصول مباشر لكل أقسام المنصة</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const cardClass =
            "group flex items-center gap-3 rounded-xl border border-border bg-card hover:border-blue-500/50 hover:bg-muted/40 p-3 text-right transition-colors cursor-pointer min-w-0";

          const inner = (
            <>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tool.tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                <span className="text-xs sm:text-[13px] font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {tool.title}
                </span>
                {typeof tool.count === "number" && tool.count > 0 && (
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-mono font-bold text-muted-foreground">
                    {tool.count}
                  </span>
                )}
                {tool.href && (
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </div>
            </>
          );

          if (tool.href) {
            return (
              <a key={tool.id} href={tool.href} className={cardClass}>
                {inner}
              </a>
            );
          }

          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => tool.tab && onOpen(tool.tab)}
              className={cardClass}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── H. Latest Educational Resources (Compact List — Meaningful Titles) ──
function RecentResourcesSection({
  resources,
  totalCount,
  onOpenFiles,
  onPreviewFile,
}: {
  resources: ReturnType<typeof buildStudentDashboardModel>["latestResources"];
  totalCount: number;
  onOpenFiles: () => void;
  onPreviewFile?: (file: LearningFile) => void;
}) {
  return (
    <section
      aria-label="أحدث الملازم والملفات"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3.5"
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black text-foreground">أحدث الملازم والملفات</h2>
          <span className="rounded-lg bg-muted px-2 py-0.5 text-[11px] font-mono font-bold text-muted-foreground border border-border">
            {totalCount}
          </span>
        </div>
        {totalCount > 0 && (
          <button
            type="button"
            onClick={onOpenFiles}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            <span>عرض الكل</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="لسه مفيش ملازم مرفوعة"
          description="أول ما ينزل ملزمة أو ملف جديد لمنهجك هيظهر هنا مباشرة."
        />
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {resources.map(({ file, displayTitle, subtitle, fileType, sizeLabel, dateLabel }) => {
            const Icon = getFileIcon(fileType);
            return (
              <div
                key={file.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card hover:bg-muted/40 px-3.5 py-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong
                      dir="auto"
                      style={{ unicodeBidi: "isolate" }}
                      className="block text-xs sm:text-[13px] font-extrabold text-foreground leading-snug break-words"
                    >
                      {displayTitle}
                    </strong>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground mt-0.5">
                      <span className="truncate max-w-[220px]">{subtitle}</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-foreground/80">{fileType}</span>
                      <span>•</span>
                      <span dir="ltr" className="font-mono">
                        {sizeLabel}
                      </span>
                      {dateLabel && (
                        <>
                          <span>•</span>
                          <span>{dateLabel}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => (onPreviewFile ? onPreviewFile(file) : onOpenFiles())}
                    className="h-8 px-3 rounded-lg text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span>معاينة</span>
                  </Button>
                  <a
                    href={`/api/learning/files/${file.id}/download`}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="تحميل الملف"
                    aria-label={`تحميل ${displayTitle}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Main Redesigned DashboardTab ──
export function DashboardTab({
  student,
  files,
  quizzes,
  videos,
  progress,
  dataLoading,
  dataError,
  onRetry,
  onOpen,
  onPlayLesson,
  onStartQuiz,
  onPreviewFile,
  onOpenSearch,
  unresolvedMistakesCount = 0,
}: {
  student: Student;
  files: LearningFile[];
  quizzes: Quiz[];
  videos: VideoSummary[];
  progress: ProgressRow[];
  dataLoading: boolean;
  dataError: string;
  onRetry: () => void;
  onOpen: (tab: StudentNavTab) => void;
  onPlayLesson?: (videoId: number) => void;
  onStartQuiz?: (quiz: Quiz) => void;
  onPreviewFile?: (file: LearningFile) => void;
  onOpenSearch?: () => void;
  unresolvedMistakesCount?: number;
}) {
  const academicTrack = getTrackForStage(student.grade);

  const model = useMemo(
    () =>
      buildStudentDashboardModel({
        student,
        videos,
        quizzes,
        files,
        progressRows: progress,
        unresolvedMistakesCount,
      }),
    [student, videos, quizzes, files, progress, unresolvedMistakesCount],
  );

  const handlePrimaryCta = () => {
    const { cta } = model.continueLearning;
    if (cta.kind === "play_video" && cta.videoId && onPlayLesson) {
      onPlayLesson(cta.videoId);
      return;
    }
    if (cta.kind === "start_quiz" && cta.quiz && onStartQuiz) {
      onStartQuiz(cta.quiz);
      return;
    }
    onOpen("lessons");
  };

  const handleRunTask = (task: LearningPlanTask) => {
    if (task.kind === "mistakes") {
      onOpen("mistakes");
      return;
    }
    if (task.kind === "video" && task.videoId && onPlayLesson) {
      onPlayLesson(task.videoId);
      return;
    }
    if (task.kind === "homework") {
      if (task.quiz && onStartQuiz) onStartQuiz(task.quiz);
      else onOpen("homework");
      return;
    }
    if (task.kind === "quiz") {
      if (task.quiz && onStartQuiz) onStartQuiz(task.quiz);
      else onOpen("quizzes");
      return;
    }
    onOpen("lessons");
  };

  if (dataLoading) {
    return (
      <div className="space-y-5 max-w-[1320px] w-full" dir="rtl" aria-busy="true">
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-4">
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-right max-w-[1320px] w-full" dir="rtl">
      {/* A. Compact Personalized Student Header */}
      <CompactStudentHeader
        student={student}
        academicTrackTitle={academicTrack?.title || student.grade || undefined}
        state={model.state}
        onOpenSearch={onOpenSearch}
      />

      {/* Conditional Actionable Alerts */}
      {student.learningMode === "offline" && !student.centerConfirmed && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
              <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>تأكيد السنتر والميعاد مطلوب لتثبيت مقعدك</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
              ادخل على صفحة حسابي واختار السنتر والميعاد المناسب ليك علشان نثبت قيدك.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => onOpen("profile")}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl shrink-0 cursor-pointer"
          >
            تأكيد السنتر
          </Button>
        </div>
      )}

      {dataError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{dataError}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="font-bold cursor-pointer">
            حاول مرة تانية
          </Button>
        </div>
      )}

      {student.paymentStatus !== "paid" && (
        <PaymentBanner
          paymentStatus={student.paymentStatus || "unpaid"}
          onUploaded={() => {
            void onRetry();
          }}
        />
      )}

      {/* B. Intelligent Learning Continuation Hero */}
      <ContinueLearningHero
        model={model.continueLearning}
        fallbackImage={academicTrack?.image}
        onExecuteCta={handlePrimaryCta}
        onOpenLessons={() => onOpen("lessons")}
      />

      {/* C + D + E + G: Focused 2-Column Learning Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <TodayLearningPlanSection tasks={model.todayPlan} onRunTask={handleRunTask} />
          <DailyChallengeCard isPaid={student.status === "approved" && student.paymentStatus === "paid"} />
        </div>

        <div className="space-y-5 min-w-0">
          <UnifiedProgressOverview
            progress={model.progress}
            onOpenQuizzes={() => onOpen("quizzes")}
          />
          <SmartMistakesWidget
            unresolvedCount={model.progress.unresolvedMistakesCount}
            attemptedExams={model.progress.attemptedExams}
            onOpenMistakes={() => onOpen("mistakes")}
            onOpenSelfAssessment={() => onOpen("self-assessment")}
          />
        </div>
      </div>

      {/* F. Learning Tools Grid */}
      <LearningToolsGrid
        counts={{
          lessons: model.progress.totalLessons,
          homeworks: model.progress.totalHomeworks,
          files: Array.isArray(files) ? files.length : 0,
          exams: model.progress.availableExams,
          mistakes: model.progress.unresolvedMistakesCount,
        }}
        onOpen={onOpen}
      />

      {/* H. Latest Educational Resources */}
      <RecentResourcesSection
        resources={model.latestResources}
        totalCount={Array.isArray(files) ? files.length : 0}
        onOpenFiles={() => onOpen("files")}
        onPreviewFile={onPreviewFile}
      />
    </div>
  );
}
