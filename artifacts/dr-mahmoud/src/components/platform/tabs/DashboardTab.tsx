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
  onOpenSummaries,
}: {
  student: Student;
  academicTrackTitle?: string;
  onContinue: () => void;
  onOpenSummaries?: () => void;
}) {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "صباح الخير" : currentHour < 17 ? "مساء الخير" : "مساء الهمة والتركيز";

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5" dir="rtl">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            {greeting}، {student.name} 👋
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border shadow-2xs ${
              student.learningMode === "offline"
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${student.learningMode === "offline" ? "bg-purple-500" : "bg-blue-500 animate-pulse"}`} />
            {student.learningMode === "offline" ? "نظامك: أوفلاين (السنتر)" : "نظامك: أونلاين"}
          </span>

          {student.centerName && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-2xs">
              <MapPin className="h-3 w-3" /> {student.centerName}
            </span>
          )}

          {student.appointmentSlot && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-2xs">
              <Clock className="h-3 w-3" /> {student.appointmentSlot}
            </span>
          )}
        </div>
        <p className="text-xs md:text-[13px] font-medium text-muted-foreground">
          {academicTrackTitle
            ? `${academicTrackTitle} — تابع تقدمك وابدأ من آخر نقطة وصلت إليها.`
            : "تابع تقدمك وابدأ من آخر نقطة وصلت إليها."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-auto">
        {onOpenSummaries && (
          <Button
            type="button"
            onClick={onOpenSummaries}
            variant="outline"
            className="h-10 px-4 rounded-xl border-border/80 hover:border-primary/40 text-foreground text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText className="h-4 w-4 text-primary" />
            <span>رفع ملخص كشكول 📝</span>
          </Button>
        )}
        <Button
          type="button"
          onClick={onContinue}
          className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
        >
          <span>متابعة التعلم</span>
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        </Button>
      </div>
    </header>
  );
}

// ── 2. Meaningful Statistics Cards (Vercel Precision Style) ──
export function StudentStatistics({
  completedLessonsCount,
  totalLessonsCount,
  availableQuizzesCount,
  completedQuizzesCount,
  newFilesCount,
  hasQuizResults,
  averageResult,
}: {
  completedLessonsCount: number;
  totalLessonsCount: number;
  availableQuizzesCount: number;
  completedQuizzesCount: number;
  newFilesCount: number;
  hasQuizResults: boolean;
  averageResult: number;
}) {
  return (
    <section aria-label="إحصائيات الطالب" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5" dir="rtl">
      {/* 1. الدروس المكتملة */}
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs transition-all hover:border-blue-500/40 hover:-translate-y-0.5 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/20 before:to-transparent">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-2xs transition-transform group-hover:scale-105">
          <BookOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[12px] font-bold text-muted-foreground truncate">الدروس المكتملة</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <strong className="text-[22px] font-mono font-black text-foreground dark:text-white leading-none tabular-nums">
              {completedLessonsCount}
            </strong>
            <span className="text-[11px] font-medium text-muted-foreground font-mono tabular-nums">
              / {totalLessonsCount}
            </span>
          </div>
        </div>
      </div>

      {/* 2. الاختبارات المتاحة */}
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs transition-all hover:border-emerald-500/40 hover:-translate-y-0.5 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-emerald-500/20 before:to-transparent">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs transition-transform group-hover:scale-105">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[12px] font-bold text-muted-foreground truncate">الاختبارات</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <strong className="text-[22px] font-mono font-black text-foreground dark:text-white leading-none tabular-nums">
              {availableQuizzesCount}
            </strong>
            <span className="text-[11px] font-medium text-muted-foreground">
              متاح للحل
            </span>
          </div>
        </div>
      </div>

      {/* 3. الملفات والملازم */}
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs transition-all hover:border-indigo-500/40 hover:-translate-y-0.5 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-indigo-500/20 before:to-transparent">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-2xs transition-transform group-hover:scale-105">
          <FolderOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[12px] font-bold text-muted-foreground truncate">الملازم والملفات</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <strong className="text-[22px] font-mono font-black text-foreground dark:text-white leading-none tabular-nums">
              {newFilesCount}
            </strong>
            <span className="text-[11px] font-medium text-muted-foreground">
              مذكرة وشيت
            </span>
          </div>
        </div>
      </div>

      {/* 4. متوسط النتائج */}
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs transition-all hover:border-amber-500/40 hover:-translate-y-0.5 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-500/20 before:to-transparent">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs transition-transform group-hover:scale-105">
          <Award className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[12px] font-bold text-muted-foreground truncate">متوسط النتائج</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <strong className="text-[22px] font-mono font-black text-foreground dark:text-white leading-none tabular-nums">
              {hasQuizResults ? `${averageResult}%` : "—"}
            </strong>
            <span className="text-[11px] font-medium text-muted-foreground truncate">
              {hasQuizResults ? (averageResult >= 85 ? "مستوى ممتاز ⭐" : averageResult >= 65 ? "مستوى جيد" : "يحتاج مراجعة") : "لا توجد نتائج"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Quick Actions Dock (Clean Vercel Tool Shelf) ──
export function QuickActionsDock({
  onOpen,
}: {
  onOpen: (tab: "lessons" | "compiler" | "files" | "quizzes" | "summaries" | "self-assessment") => void;
}) {
  const actions = [
    {
      id: "lessons",
      title: "محاضرات المنهج",
      desc: "متابعة شرح الفيديوهات",
      icon: BookOpen,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10",
      tab: "lessons" as const,
    },
    {
      id: "compiler",
      title: "محرر أكواد C++",
      desc: "كتابة وتشغيل البرامج",
      icon: FileCode,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-500/10",
      tab: "compiler" as const,
    },
    {
      id: "self-assessment",
      title: "التقييم الذاتي",
      desc: "اختبار فوري من بنك الأسئلة",
      icon: Sparkles,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
      tab: "self-assessment" as const,
    },
    {
      id: "files",
      title: "الملازم والشيتات",
      desc: "تحميل الملفات والمذكرات",
      icon: FolderOpen,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
      tab: "files" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" dir="rtl">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <button
            key={act.id}
            type="button"
            onClick={() => onOpen(act.tab)}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-3.5 text-right transition-all hover:border-blue-500/40 hover:bg-slate-50/80 dark:hover:bg-[#0E1626] cursor-pointer flex items-center gap-3 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/15 before:to-transparent"
          >
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${act.iconBg} ${act.iconColor} border border-border/40 transition-transform group-hover:scale-105`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-xs font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                {act.title}
              </strong>
              <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
                {act.desc}
              </span>
            </div>
          </button>
        );
      })}
    </div>
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-4 sm:p-5 shadow-2xs space-y-3 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/20 before:to-transparent" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm md:text-base font-extrabold text-foreground">
              نسبة إكمال المنهج العام
            </h2>
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20 tabular-nums">
              {overallProgress}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {overallProgress === 0
              ? "ابدأ أول درس لتبدأ رحلة التعلم المنظمة وتفعيل شريط التقدم."
              : `أنجزت ${overallProgress}% من إجمالي المحتوى المطلوب لمرحلتك.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-semibold text-muted-foreground font-mono tabular-nums">
          <span className="bg-muted/40 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-border/40">الدروس: {completedLessons}/{totalLessons}</span>
          <span className="bg-muted/40 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-border/40">الاختبارات: {completedQuizzes}/{totalQuizzes}</span>
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/80 p-0.5">
        <div
          className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-700 ease-out shadow-xs"
          style={{ width: `${Math.max(2, overallProgress)}%` }}
        />
      </div>
    </div>
  );
}

// ── 4. Continue Learning Card (Vercel Media Card Style) ──
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
    <article className="group relative overflow-hidden rounded-2xl border border-border/70 dark:border-slate-800/80 bg-gradient-to-b from-card to-card/90 dark:from-slate-900/90 dark:to-[#0B1322] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row" dir="rtl">
      <div className="relative sm:w-[42%] min-h-48 overflow-hidden bg-slate-900">
        <img
          src={academicTrackImage || "/university-cs-path.webp"}
          alt="صورة الكورس"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-slate-950/60" />
        
        {/* Play Icon Badge */}
        <div className="absolute inset-0 grid place-items-center opacity-80 group-hover:opacity-100 transition-opacity">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/25 backdrop-blur-md text-white border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
            <Play className="h-5 w-5 fill-white mr-0.5" />
          </span>
        </div>
      </div>

      <div className="flex-1 p-5 text-right flex flex-col justify-between space-y-3.5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            {continueProgress > 0 ? "تابع من حيث توقفت" : "الكورس الحالي"}
          </span>

          <h2
            dir="ltr"
            className="mt-2 text-base md:text-lg font-black text-foreground dark:text-white leading-snug text-right line-clamp-2"
            style={{ unicodeBidi: "isolate" }}
          >
            {continueVideo?.title || "محتواك سيظهر هنا فور التسجيل"}
          </h2>

          <p className="mt-1 text-xs font-medium text-muted-foreground truncate">
            {continueVideo
              ? `${continueVideo.subject || continueVideo.category} — يتطلب تركيز ومتابعة مستمرة.`
              : "لا يوجد درس متاح حالياً للتكملة."}
          </p>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-bold text-muted-foreground font-mono">
            <span>تقدم الدرس: {continueProgress}%</span>
            <span>الإجمالي: {overallProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/80 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-700 ease-out shadow-xs"
              style={{ width: `${Math.max(2, continueProgress)}%` }}
            />
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onOpenLessons}
            className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer group/btn"
          >
            <span>{continueProgress > 0 ? "أكمل الدرس" : "ابدأ أول درس"}</span>
            <ChevronLeft className="h-4 w-4 transition-transform group-hover/btn:-translate-x-1" />
          </Button>

          <button
            type="button"
            onClick={onOpenLessons}
            className="h-9 px-3 rounded-xl border border-border/80 text-xs font-bold text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            عرض تفاصيل الكورس
          </button>
        </div>
      </div>
    </article>
  );
}

// ── 5. Next Steps List (Vercel Interactive Checklist) ──
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
    <article className="rounded-2xl border border-border/70 dark:border-slate-800/80 bg-gradient-to-b from-card to-card/90 dark:from-slate-900/90 dark:to-[#0B1322] p-5 shadow-xs space-y-3.5 flex flex-col justify-between" dir="rtl">
      <div>
        <h2 className="text-base font-black text-foreground">الخطوات القادمة 🎯</h2>
        <p className="text-xs font-medium text-muted-foreground">
          مهام مخصصة لمتابعة التحصيل الدراسي بالترتيب.
        </p>
      </div>

      <div className="space-y-2.5">
        {/* Task 1: Lesson */}
        {nextVideo && (
          <div className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 dark:bg-slate-800/40 p-3 text-right hover:border-primary/40 hover:bg-primary/5 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono text-xs font-bold">
                1
              </span>
              <div className="min-w-0">
                <strong
                  dir="ltr"
                  className="block text-xs font-black text-foreground truncate text-right"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {nextVideo.title}
                </strong>
                <span className="block text-[11px] font-medium text-muted-foreground">الدرس التالي بالخطة</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpen("lessons")}
              className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-all shadow-2xs shrink-0 cursor-pointer"
            >
              افتح الدرس
            </button>
          </div>
        )}

        {/* Task 2: File */}
        {nextFile && (
          <div className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 dark:bg-slate-800/40 p-3 text-right hover:border-purple-500/40 hover:bg-purple-500/5 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono text-xs font-bold">
                2
              </span>
              <div className="min-w-0">
                <strong
                  dir="ltr"
                  className="block text-xs font-black text-foreground truncate text-right"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {nextFile.title}
                </strong>
                <span className="block text-[11px] font-medium text-muted-foreground">مذكرة / كود مساعد</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpen("files")}
              className="h-7 px-3 rounded-lg border border-border bg-card text-foreground text-[11px] font-bold hover:bg-muted transition-colors shrink-0 cursor-pointer"
            >
              معاينة
            </button>
          </div>
        )}

        {/* Task 3: Quiz */}
        {nextQuiz && (
          <div className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 dark:bg-slate-800/40 p-3 text-right hover:border-amber-500/40 hover:bg-amber-500/5 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono text-xs font-bold">
                3
              </span>
              <div className="min-w-0">
                <strong
                  dir="ltr"
                  className="block text-xs font-black text-foreground truncate text-right"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {nextQuiz.title}
                </strong>
                <span className="block text-[11px] font-medium text-muted-foreground">
                  {nextQuiz.locked ? "يفتح بعد الشروط" : "متاح الآن للحل"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpen("quizzes")}
              className="h-7 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold hover:bg-amber-500/20 transition-colors shrink-0 cursor-pointer"
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
    <section className="space-y-3.5" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black text-foreground">أحدث الملفات والملازم</h2>
          <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/40">
            {files.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenFiles}
          className="text-xs font-bold text-primary hover:underline cursor-pointer"
        >
          عرض الكل ({files.length}) ←
        </button>
      </div>

      {files.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {files.slice(0, 3).map((file) => {
            const typeDetails = getFileTypeDetails(file.mimeType, file.originalName);
            const IconComponent = typeDetails.icon;
            const fileSizeMb = (file.sizeBytes / 1024 / 1024).toFixed(1);

            return (
              <article key={file.id} className="group relative overflow-hidden rounded-2xl border border-border/70 dark:border-slate-800/80 bg-gradient-to-b from-card to-card/90 dark:from-slate-900/90 dark:to-[#0B1322] p-4 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-300 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${typeDetails.bgClass} shadow-2xs`}>
                      <IconComponent className={`h-4 w-4 ${typeDetails.iconColorClass}`} />
                    </span>
                    <span className="font-mono text-[11px] font-bold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">{fileSizeMb} MB</span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {file.title}
                  </h3>

                  <p
                    dir="ltr"
                    className="font-mono text-[11px] font-medium text-muted-foreground/80 truncate text-right"
                    style={{ unicodeBidi: "isolate" }}
                  >
                    {file.originalName}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenFiles}
                  className="w-full h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye className="h-3.5 w-3.5" />
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
  onOpen: (tab: "lessons" | "compiler" | "files" | "quizzes" | "summaries" | "self-assessment") => void;
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
        onOpenSummaries={() => onOpen("summaries")}
      />

      {/* Offline Center Confirmation Warning Banner */}
      {student.learningMode === "offline" && !student.centerConfirmed && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 dark:border-amber-500/50 dark:bg-amber-950/40 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-right">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
              <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
              <span>تنبيه إلزامي لتثبيت مقعدك واعتماد قيدك بالسنتر:</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
              لم تقم بتأكيد السنتر والميعاد الحضوري حتى الآن. يرجى التوجه لصفحة "حسابي" لاختيار السنتر والميعاد المناسب لمسارك لمرة واحدة فقط لتثبيت مقعدك ولتتمكن الإدارة من تجهيز وطباعة كارنيه السنتر الخاص بك.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => onOpen("profile" as any)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <MapPin className="h-3.5 w-3.5" /> تأكيد السنتر الآن
          </Button>
        </div>
      )}

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
        totalLessonsCount={safeVideos.length}
        availableQuizzesCount={availableQuizzesCount}
        completedQuizzesCount={completedQuizzesCount}
        newFilesCount={safeFiles.length}
        hasQuizResults={attemptedQuizzes.length > 0}
        averageResult={realAverageResult}
      />

      {/* 3. Quick Actions Dock */}
      <QuickActionsDock onOpen={onOpen} />

      {/* 4. Overall Progress Summary */}
      <StudentProgressSummary
        overallProgress={averageProgress}
        completedLessons={completedLessonsCount}
        totalLessons={safeVideos.length}
        completedQuizzes={completedQuizzesCount}
        totalQuizzes={safeQuizzes.length}
      />

      {/* 5. Self-Assessment Precision Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-blue-500/30 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/20 before:to-transparent">
        <div className="flex items-center gap-3.5 text-right">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-2xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                التقييم الذاتي المخصص (Self-Assessment)
              </h3>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                بنك الأسئلة الشامل
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              اختر أي وحدة أو دروس معينة، واختبر نفسك فورياً مع تصحيح لحظي وشرح تفصيلي لكل خطأ.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => onOpen("self-assessment")}
          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shrink-0 shadow-xs cursor-pointer gap-1.5"
        >
          <span>ابدأ اختبارك الآن</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

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
