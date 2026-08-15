import {
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Trophy,
  Play,
  ChevronLeft,
  FileText,
  CheckCircle2,
  FolderOpen,
  Award,
  ArrowRight,
  Layers,
  Eye,
  FileCode,
  FileArchive,
  Clock,
  Sparkles,
  AlertCircle,
  RotateCcw,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrackForStage } from "@/data/academic";
import type { Student, LearningFile, Quiz, VideoSummary, ProgressRow } from "@/types/platform";
import { EmptyState } from "../StudentDashboardUI";
import { PaymentBanner } from "./PaymentBanner";

// ── Helper for File Icons ──
function getFileTypeDetails(mimeType?: string | null, originalName: string = "") {
  const ext = originalName.split(".").pop()?.toLowerCase() || "";
  if (mimeType === "application/pdf" || ext === "pdf") {
    return {
      icon: FileText,
      badgeText: "PDF",
      bgClass: "bg-red-500/10 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40",
      iconColorClass: "text-red-600 dark:text-red-400",
    };
  }
  if (ext === "cpp" || ext === "c" || ext === "js" || ext === "ts" || ext === "py" || ext === "html" || ext === "css") {
    return {
      icon: FileCode,
      badgeText: ext.toUpperCase(),
      bgClass: "bg-purple-500/10 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/40",
      iconColorClass: "text-purple-600 dark:text-purple-400",
    };
  }
  if (ext === "zip" || ext === "rar" || ext === "7z") {
    return {
      icon: FileArchive,
      badgeText: ext.toUpperCase(),
      bgClass: "bg-amber-500/10 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40",
      iconColorClass: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    icon: FileText,
    badgeText: ext ? ext.toUpperCase() : "DOC",
    bgClass: "bg-blue-500/10 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40",
    iconColorClass: "text-blue-600 dark:text-blue-400",
  };
}

// ── 1. Dashboard Page Header ──
export function DashboardHeader({
  student,
  academicTrackTitle,
  onContinue,
}: {
  student: Student;
  academicTrackTitle?: string;
  onContinue: () => void;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-[#26364D] pb-4" dir="rtl">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            مرحبًا، {student.name}
          </h1>
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-bold ${
              student.learningMode === "offline"
                ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40"
                : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"
            }`}
          >
            {student.learningMode === "offline" ? "نظامك: أوفلاين (السنتر)" : "نظامك: أونلاين"}
          </span>

          {student.centerName && (
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
              <MapPin className="h-3 w-3" /> {student.centerName}
            </span>
          )}

          {student.appointmentSlot && (
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
              <Clock className="h-3 w-3" /> {student.appointmentSlot}
            </span>
          )}
        </div>
        <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-[#B1C0D4]">
          {academicTrackTitle
            ? `${academicTrackTitle} — تابع تقدمك وابدأ من آخر نقطة وصلت إليها.`
            : "تابع تقدمك وابدأ من آخر نقطة وصلت إليها."}
        </p>
      </div>

      <Button
        type="button"
        onClick={onContinue}
        className="h-10 px-5 rounded-xl bg-[#2583F7] hover:bg-[#1470DB] text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
      >
        <span>متابعة التعلم</span>
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </header>
  );
}

// ── 2. Meaningful Statistics Cards ──
export function StudentStatistics({
  completedLessonsCount,
  availableQuizzesCount,
  newFilesCount,
  hasQuizResults,
  averageResult,
}: {
  completedLessonsCount: number;
  availableQuizzesCount: number;
  newFilesCount: number;
  hasQuizResults: boolean;
  averageResult: number;
}) {
  return (
    <section aria-label="إحصائيات الطالب" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5" dir="rtl">
      <div className="rounded-2xl border border-slate-200 dark:border-[#26364D] bg-white dark:bg-[#111D2F] p-4 flex items-center gap-3.5 shadow-2xs">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-[#2583F7] border border-blue-100 dark:border-blue-900/40">
          <BookOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[12px] font-bold text-slate-500 dark:text-[#B1C0D4] truncate">الدروس المكتملة</span>
          <strong className="text-[24px] font-black text-slate-900 dark:text-white leading-none mt-1 block">{completedLessonsCount}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#26364D] bg-white dark:bg-[#111D2F] p-4 flex items-center gap-3.5 shadow-2xs">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-[#22C58B] border border-emerald-100 dark:border-emerald-900/40">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[12px] font-bold text-slate-500 dark:text-[#B1C0D4] truncate">الاختبارات المتاحة</span>
          <strong className="text-[24px] font-black text-slate-900 dark:text-white leading-none mt-1 block">{availableQuizzesCount}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#26364D] bg-white dark:bg-[#111D2F] p-4 flex items-center gap-3.5 shadow-2xs">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
          <FolderOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[12px] font-bold text-slate-500 dark:text-[#B1C0D4] truncate">الملفات والملازم</span>
          <strong className="text-[24px] font-black text-slate-900 dark:text-white leading-none mt-1 block">{newFilesCount}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#26364D] bg-white dark:bg-[#111D2F] p-4 flex items-center gap-3.5 shadow-2xs">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-[#E4A11B] border border-amber-100 dark:border-amber-900/40">
          <Award className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[12px] font-bold text-slate-500 dark:text-[#B1C0D4] truncate">متوسط النتائج</span>
          <strong className="text-[24px] font-black text-slate-900 dark:text-white leading-none mt-1 block">
            {hasQuizResults ? `${averageResult}%` : "—"}
          </strong>
        </div>
      </div>
    </section>
  );
}

// ── 3. Overall Progress Summary Card ──
export function StudentProgressSummary({
  overallProgress,
  completedLessons,
  totalLessons,
  completedQuizzes,
  totalQuizzes,
}: {
  overallProgress: number;
  completedLessons: number;
  totalLessons: number;
  completedQuizzes: number;
  totalQuizzes: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#26364D] bg-white dark:bg-[#111D2F] p-4 sm:p-5 shadow-2xs space-y-3" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white">
            نسبة إكمال الكورس العامة
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#B1C0D4]">
            {overallProgress === 0
              ? "ابدأ أول درس لتبدأ رحلة التعلم."
              : `أنجزت ${overallProgress}% من إجمالي المحتوى المطلوب لمرحلتك.`}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-200">
          <span>الدروس: {completedLessons}/{totalLessons}</span>
          <span>•</span>
          <span>الاختبارات: {completedQuizzes}/{totalQuizzes}</span>
        </div>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#172844]">
        <div
          className="h-full bg-[#2583F7] rounded-full transition-all duration-500"
          style={{ width: `${Math.max(2, overallProgress)}%` }}
        />
      </div>
    </div>
  );
}

// ── 4. Continue Learning Card ──
export function ContinueLearningCard({
  continueVideo,
  continueProgress,
  overallProgress,
  academicTrackImage,
  onOpenLessons,
}: {
  continueVideo?: VideoSummary;
  continueProgress: number;
  overallProgress: number;
  academicTrackImage?: string;
  onOpenLessons: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#26364D] bg-white dark:bg-[#111D2F] shadow-2xs flex flex-col sm:flex-row" dir="rtl">
      <div className="relative sm:w-[40%] min-h-48 bg-slate-100 dark:bg-[#172844]">
        <img
          src={academicTrackImage || "/university-cs-path.webp"}
          alt="صورة الكورس"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/20" />
      </div>

      <div className="flex-1 p-5 text-right flex flex-col justify-between space-y-3">
        <div>
          <span className="inline-block rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
            {continueProgress > 0 ? "تابع من حيث توقفت" : "الكورس الحالي"}
          </span>

          <h2
            dir="ltr"
            className="mt-2 text-base md:text-lg font-black text-slate-900 dark:text-white leading-snug text-right"
            style={{ unicodeBidi: "isolate" }}
          >
            {continueVideo?.title || "محتواك هيظهر هنا قريب"}
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-[#B1C0D4]">
            {continueVideo
              ? `${continueVideo.subject || continueVideo.category} — يتطلب تركيز ومتابعة مستمرة.`
              : "لا يوجد درس متاح حالياً للتكملة."}
          </p>
        </div>

        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
            <span>تقدم الدرس الحالي: {continueProgress}%</span>
            <span>الإجمالي: {overallProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#172844]">
            <div
              className="h-full rounded-full bg-[#2583F7] transition-all duration-500"
              style={{ width: `${Math.max(2, continueProgress)}%` }}
            />
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2">
          <Button
            type="button"
            onClick={onOpenLessons}
            className="h-9 px-4 rounded-xl bg-[#2583F7] hover:bg-[#1470DB] text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>{continueProgress > 0 ? "أكمل الدرس" : "ابدأ أول درس"}</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={onOpenLessons}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-[#26364D] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#172844] transition-colors"
          >
            عرض تفاصيل الكورس
          </button>
        </div>
      </div>
    </article>
  );
}

// ── 5. Next Steps List ──
export function NextStepsList({
  quizzes,
  files,
  videos,
  onOpen,
}: {
  quizzes: Quiz[];
  files: LearningFile[];
  videos: VideoSummary[];
  onOpen: (tab: "lessons" | "files" | "quizzes") => void;
}) {
  const nextQuiz = quizzes[0];
  const nextFile = files[0];
  const nextVideo = videos[0];

  return (
    <article className="rounded-2xl border border-slate-200 dark:border-[#26364D] bg-white dark:bg-[#111D2F] p-5 shadow-2xs space-y-4" dir="rtl">
      <div>
        <h2 className="text-base font-black text-slate-900 dark:text-white">الخطوات القادمة</h2>
        <p className="text-xs font-medium text-slate-500 dark:text-[#B1C0D4]">
          مهام مخصصة لمتابعة التحصيل الدراسي بالترتيب.
        </p>
      </div>

      <div className="space-y-3">
        {/* Task 1: Lesson */}
        {nextVideo && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#26364D] bg-slate-50 dark:bg-[#172844] p-3 text-right">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-[#2583F7] border border-blue-100 dark:border-blue-900/40">
                <BookOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <strong
                  dir="ltr"
                  className="block text-xs font-extrabold text-slate-900 dark:text-white truncate text-right"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {nextVideo.title}
                </strong>
                <span className="block text-[11px] font-medium text-slate-500 dark:text-[#B1C0D4]">الدرس التالي بالخطة</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpen("lessons")}
              className="h-8 px-3 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors shrink-0"
            >
              افتح الدرس
            </button>
          </div>
        )}

        {/* Task 2: File */}
        {nextFile && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#26364D] bg-slate-50 dark:bg-[#172844] p-3 text-right">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <strong
                  dir="ltr"
                  className="block text-xs font-extrabold text-slate-900 dark:text-white truncate text-right"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {nextFile.title}
                </strong>
                <span className="block text-[11px] font-medium text-slate-500 dark:text-[#B1C0D4]">مذكرة / كود مساعد</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpen("files")}
              className="h-8 px-3 rounded-lg border border-slate-200 dark:border-[#26364D] bg-white dark:bg-[#111D2F] text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-[#172844] transition-colors shrink-0"
            >
              معاينة
            </button>
          </div>
        )}

        {/* Task 3: Quiz */}
        {nextQuiz && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#26364D] bg-slate-50 dark:bg-[#172844] p-3 text-right">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-[#E4A11B] border border-amber-100 dark:border-amber-900/40">
                <ClipboardCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <strong
                  dir="ltr"
                  className="block text-xs font-extrabold text-slate-900 dark:text-white truncate text-right"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {nextQuiz.title}
                </strong>
                <span className="block text-[11px] font-medium text-slate-500 dark:text-[#B1C0D4]">
                  {nextQuiz.locked ? "يفتح بعد الشروط" : "متاح الآن للحل"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpen("quizzes")}
              className="h-8 px-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[11px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900/80 transition-colors shrink-0"
            >
              {nextQuiz.locked ? "عرض الشروط" : "حل الاختبار"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

// ── 6. Latest Files Section Component ──
export function LatestFilesSection({
  files,
  onOpenFiles,
}: {
  files: LearningFile[];
  onOpenFiles: () => void;
}) {
  return (
    <section className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-900 dark:text-white">أحدث الملفات والملازم</h2>
        <button
          type="button"
          onClick={onOpenFiles}
          className="text-xs font-bold text-blue-600 dark:text-[#2583F7] hover:underline"
        >
          عرض الكل ({files.length})
        </button>
      </div>

      {files.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {files.slice(0, 3).map((file) => {
            const typeDetails = getFileTypeDetails(file.mimeType, file.originalName);
            const IconComponent = typeDetails.icon;
            const fileSizeMb = (file.sizeBytes / 1024 / 1024).toFixed(1);

            return (
              <article key={file.id} className="rounded-2xl border border-slate-200 dark:border-[#26364D] bg-white dark:bg-[#111D2F] p-4 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${typeDetails.bgClass}`}>
                      <IconComponent className={`h-4 w-4 ${typeDetails.iconColorClass}`} />
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-[#B1C0D4]">{fileSizeMb} MB</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {file.title}
                  </h3>

                  <p
                    dir="ltr"
                    className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate text-right"
                    style={{ unicodeBidi: "isolate" }}
                  >
                    {file.originalName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenFiles}
                  className="w-full h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>معاينة الملف</span>
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={FolderOpen} title="لا توجد ملفات مرفوعة" description="ستظهر مذكرات وأكواد الكورسات هنا فور نشرها لحسابك." />
      )}
    </section>
  );
}

// ── Main Refactored DashboardTab ──
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
}: {
  student: Student;
  files: LearningFile[];
  quizzes: Quiz[];
  videos: VideoSummary[];
  progress: ProgressRow[];
  dataLoading: boolean;
  dataError: string;
  onRetry: () => void;
  onOpen: (tab: "lessons" | "compiler" | "files" | "quizzes") => void;
}) {
  const academicTrack = getTrackForStage(student.grade);
  const safeFiles = Array.isArray(files) ? files : [];
  const safeQuizzes = Array.isArray(quizzes) ? quizzes : [];
  const safeVideos = Array.isArray(videos) ? videos : [];
  const safeProgress = Array.isArray(progress) ? progress : [];
  const progressByVideo = new Map(safeProgress.map((row) => [row.videoId, row]));

  // Progress Calculations
  const completedLessonsCount = safeVideos.filter(
    (v) => (progressByVideo.get(v.id)?.progress || 0) >= 90
  ).length;

  const availableQuizzesCount = safeQuizzes.filter((q) => !q.locked).length;
  const completedQuizzesCount = safeQuizzes.filter((q) => (q.attemptsUsed || 0) > 0).length;

  const averageProgress = safeVideos.length
    ? Math.round(
        safeVideos.reduce(
          (sum, video) => sum + (progressByVideo.get(video.id)?.progress || 0),
          0,
        ) / safeVideos.length,
      )
    : 0;

  const continueRow = [...safeProgress]
    .filter(
      (row) =>
        row.progress > 0 &&
        row.progress < 100 &&
        safeVideos.some((video) => video.id === row.videoId),
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    )[0];

  const continueVideo =
    safeVideos.find((video) => video.id === continueRow?.videoId) || safeVideos[0];
  const continueProgress = continueVideo
    ? progressByVideo.get(continueVideo.id)?.progress || 0
    : 0;

  if (dataLoading) {
    return (
      <div className="space-y-4 max-w-[1400px] w-full" dir="rtl">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-[#111D2F]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-[#111D2F]" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-[#111D2F]" />
      </div>
    );
  }

  const attemptedQuizzes = safeQuizzes.filter((q) => (q.bestScore !== undefined && q.bestScore !== null));
  const realAverageResult = attemptedQuizzes.length
    ? Math.round(attemptedQuizzes.reduce((acc, curr) => acc + (curr.bestScore || 0), 0) / attemptedQuizzes.length)
    : 0;

  return (
    <section className="space-y-4 text-right max-w-[1400px] w-full" dir="rtl">
      {/* 1. Header */}
      <DashboardHeader
        student={student}
        academicTrackTitle={academicTrack?.title}
        onContinue={() => onOpen("lessons")}
      />

      {/* Error Retry Alert */}
      {dataError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{dataError}</span>
          <Button type="button" variant="outline" onClick={onRetry} className="font-bold">
            حاول مرة أخرى
          </Button>
        </div>
      )}

      {/* Payment Warning */}
      {student.paymentStatus !== "paid" && (
        <PaymentBanner
          paymentStatus={student.paymentStatus || "unpaid"}
          onUploaded={() => {
            void onRetry();
          }}
        />
      )}

      {/* 2. Meaningful Statistics Cards */}
      <StudentStatistics
        completedLessonsCount={completedLessonsCount}
        availableQuizzesCount={availableQuizzesCount}
        newFilesCount={safeFiles.length}
        hasQuizResults={attemptedQuizzes.length > 0}
        averageResult={realAverageResult}
      />

      {/* 3. Overall Progress Summary */}
      <StudentProgressSummary
        overallProgress={averageProgress}
        completedLessons={completedLessonsCount}
        totalLessons={safeVideos.length}
        completedQuizzes={completedQuizzesCount}
        totalQuizzes={safeQuizzes.length}
      />

      {/* 4 & 5. Continue Learning & Next Steps Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <ContinueLearningCard
          continueVideo={continueVideo}
          continueProgress={continueProgress}
          overallProgress={averageProgress}
          academicTrackImage={academicTrack?.image}
          onOpenLessons={() => onOpen("lessons")}
        />

        <NextStepsList
          quizzes={safeQuizzes}
          files={safeFiles}
          videos={safeVideos}
          onOpen={onOpen}
        />
      </div>

      {/* 6. Latest Files Section */}
      <LatestFilesSection files={safeFiles} onOpenFiles={() => onOpen("files")} />
    </section>
  );
}
