import { motion } from "framer-motion";
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
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrackForStage } from "@/data/academic";
import type { Student, LearningFile, Quiz, VideoSummary, ProgressRow } from "@/types/platform";
import { EmptyState } from "../StudentDashboardUI";
import { PaymentBanner } from "./PaymentBanner";
import { DailyChallengeCard } from "@/components/kholasa/DailyChallengeCard";
import { StudentAvatar } from "../StudentDashboardUI";
import { getNextMotivationMessage } from "@/lib/motivationMessages";
import { useMemo } from "react";

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
  const stats = [
    {
      label: "الدروس المكتملة",
      value: completedLessonsCount,
      sub: `/ ${totalLessonsCount}`,
      icon: BookOpen,
      iconStyle: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      hoverBorder: "hover:border-blue-500/40",
    },
    {
      label: "الاختبارات",
      value: availableQuizzesCount,
      sub: `متاح (${completedQuizzesCount} منجز)`,
      icon: ClipboardCheck,
      iconStyle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      hoverBorder: "hover:border-emerald-500/40",
    },
    {
      label: "الملازم والملفات",
      value: newFilesCount,
      sub: "ملف متاح للمعاينة",
      icon: FolderOpen,
      iconStyle: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      hoverBorder: "hover:border-indigo-500/40",
    },
    {
      label: "متوسط النتائج",
      value: hasQuizResults ? `${averageResult}%` : "—",
      sub: hasQuizResults
        ? averageResult >= 85
          ? "مستوى ممتاز"
          : averageResult >= 65
            ? "مستوى جيد"
            : "يحتاج مراجعة"
        : "لا توجد نتائج بعد",
      icon: Award,
      iconStyle: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      hoverBorder: "hover:border-amber-500/40",
    },
  ];

  return (
    <section aria-label="إحصائيات الطالب" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5" dir="rtl">
      {stats.map((st, idx) => {
        const Icon = st.icon;
        return (
          <motion.div
            key={st.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.05 }}
            whileHover={{ y: -2 }}
            className={`group rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs transition-colors ${st.hoverBorder}`}
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border shadow-2xs transition-transform group-hover:scale-105 ${st.iconStyle}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 text-right">
              <span className="block text-[12px] font-bold text-muted-foreground truncate">{st.label}</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <strong className="text-[22px] font-mono font-black text-foreground dark:text-white leading-none tabular-nums">
                  {st.value}
                </strong>
                <span className="text-[11px] font-medium text-muted-foreground truncate tabular-nums">
                  {st.sub}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}

// ── Quick Actions Dock (Clean Vercel Tool Shelf) ──
export function QuickActionsDock({
  onOpen,
  unresolvedMistakesCount = 0,
}: {
  onOpen: (tab: "lessons" | "kholasa" | "mistakes" | "essay-exams" | "files" | "quizzes" | "summaries" | "self-assessment") => void;
  unresolvedMistakesCount?: number;
}) {
  const actions = [
    {
      id: "kholasa",
      title: "الخلاصة",
      desc: "دروس، تعريفات، خرائط، وتسميع",
      icon: Sparkles,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
      tab: "kholasa" as const,
      badge: undefined as string | undefined,
    },
    {
      id: "mistakes",
      title: "ركن غلطاتي",
      desc: "راجع أخطاءك وتدرب عليها فوراً",
      icon: Target,
      iconColor: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/10",
      tab: "mistakes" as const,
      badge: unresolvedMistakesCount > 0 ? `${unresolvedMistakesCount} للمراجعة` : undefined,
    },
    {
      id: "lessons",
      title: "فيديوهات المنصة",
      desc: "متابعة شرح الفيديوهات",
      icon: BookOpen,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10",
      tab: "lessons" as const,
      badge: undefined as string | undefined,
    },
    {
      id: "essay-exams",
      title: "الامتحانات المقالية",
      desc: "تدرب على الحل ومقارنة النموذج",
      icon: FileText,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      iconBg: "bg-indigo-500/10",
      tab: "essay-exams" as const,
      badge: undefined as string | undefined,
    },
    {
      id: "self-assessment",
      title: "التقييم الذاتي",
      desc: "اختبار فوري من بنك الأسئلة",
      icon: ClipboardCheck,
      iconColor: "text-cyan-600 dark:text-cyan-400",
      iconBg: "bg-cyan-500/10",
      tab: "self-assessment" as const,
      badge: undefined as string | undefined,
    },
    {
      id: "files",
      title: "الملازم والشيتات",
      desc: "معاينة الملفات والملازم",
      icon: FolderOpen,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
      tab: "files" as const,
      badge: undefined as string | undefined,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-4 shadow-2xs space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-foreground">اختصارات سريعة</h2>
        <span className="text-[11px] font-bold text-muted-foreground">وصول مباشر للأقسام</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {actions.map((act, idx) => {
          const Icon = act.icon;
          return (
            <motion.button
              key={act.id}
              type="button"
              onClick={() => onOpen(act.tab)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: idx * 0.035 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group rounded-xl border border-border/70 bg-muted/20 dark:bg-slate-900/50 p-3 text-right transition-colors hover:border-blue-500/40 hover:bg-muted/50 cursor-pointer flex items-center gap-2.5"
            >
              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${act.iconBg} ${act.iconColor} border border-border/40 transition-transform group-hover:scale-105`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <strong className="block text-xs font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                    {act.title}
                  </strong>
                  {act.badge && (
                    <span className="shrink-0 rounded-full bg-rose-500/15 text-rose-500 px-1.5 py-0.5 text-[9px] font-black">
                      {act.badge}
                    </span>
                  )}
                </div>
                <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
                  {act.desc}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-4 sm:p-5 shadow-2xs space-y-3"
      dir="rtl"
    >
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

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/80 p-0.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, overallProgress)}%` }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
        />
      </div>
    </motion.div>
  );
}

// ── 4. Continue Learning Card (Vercel Media Card Style) ──
export function ContinueLearningCard({
  continueVideo,
  continueProgress,
  overallProgress,
  academicTrackImage,
  onOpenLessons,
  onPlayLesson,
}: {
  continueVideo?: VideoSummary;
  continueProgress: number;
  overallProgress: number;
  academicTrackImage?: string;
  onOpenLessons: () => void;
  onPlayLesson?: (videoId: number) => void;
}) {
  const handlePrimaryClick = () => {
    if (continueVideo && onPlayLesson) {
      onPlayLesson(continueVideo.id);
    } else {
      onOpenLessons();
    }
  };

  const thumbnail = continueVideo?.thumbnailUrl || academicTrackImage || "/university-cs-path.webp";

  return (
    <article className="group rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] shadow-2xs hover:border-blue-500/40 transition-colors duration-300 flex flex-col sm:flex-row overflow-hidden" dir="rtl">
      <div 
        onClick={handlePrimaryClick}
        className="relative sm:w-[42%] min-h-48 overflow-hidden bg-slate-900 cursor-pointer"
      >
        <img
          src={thumbnail}
          alt={continueVideo?.title || "صورة الدرس"}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/25 transition-colors" />
        
        {/* Play Icon Badge */}
        <div className="absolute inset-0 grid place-items-center opacity-85 group-hover:opacity-100 transition-opacity">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-600/90 backdrop-blur-md text-white shadow-lg group-hover:scale-110 transition-transform">
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
            onClick={handlePrimaryClick}
            className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer group/btn"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{continueProgress > 0 ? "أكمل الدرس الآن" : "ابدأ أول درس"}</span>
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
  onPlayLesson,
}: {
  quizzes: Quiz[];
  files: LearningFile[];
  videos: VideoSummary[];
  onOpen: (tab: "lessons" | "files" | "quizzes") => void;
  onPlayLesson?: (videoId: number) => void;
}) {
  const nextQuiz = quizzes[0];
  const nextFile = files[0];
  const nextVideo = videos[0];

  return (
    <article className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 shadow-2xs space-y-3.5 flex flex-col justify-between" dir="rtl">
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
              onClick={() => (onPlayLesson ? onPlayLesson(nextVideo.id) : onOpen("lessons"))}
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
              <motion.article
                key={file.id}
                whileHover={{ y: -2 }}
                className="group rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-4 shadow-2xs hover:border-blue-500/40 transition-colors duration-200 flex flex-col justify-between space-y-3"
              >
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
              </motion.article>
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
  onPlayLesson,
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
  onOpen: (tab: "lessons" | "kholasa" | "mistakes" | "essay-exams" | "files" | "quizzes" | "summaries" | "self-assessment") => void;
  onPlayLesson?: (videoId: number) => void;
  unresolvedMistakesCount?: number;
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

  const dashMotivation = useMemo(() => getNextMotivationMessage("start"), [student.id]);

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
              لسه مأكدتش السنتر والميعاد بتاعك! ادخل على صفحة "حسابي" واختار السنتر والميعاد المناسب ليك عشان نثبت مقعدك وتقدر تغيّره في أي وقت.
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

      {/* 1.5. Motivational Student Activity & Achievement Hero Card */}
      {(() => {
        const recentAttempted = safeQuizzes
          .filter((q) => (q.attemptsUsed || 0) > 0 && typeof q.bestScore === "number")
          .slice(0, 4);
        const rankBadge =
          realAverageResult >= 90 && completedQuizzesCount >= 1
            ? { label: "بطل متفوق 🏆", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" }
            : realAverageResult >= 75 && completedQuizzesCount >= 1
            ? { label: "نجم صاعد ⭐", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
            : completedQuizzesCount >= 1 || completedLessonsCount >= 1
            ? { label: "ماشي في الطريق الصح 🚀", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" }
            : { label: "بداية قوية 💪", cls: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" };

        return (
          <div
            className="rounded-3xl border border-border bg-card dark:bg-[#0D1626] text-foreground p-5 sm:p-6 shadow-sm space-y-4"
            dir="rtl"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="shrink-0 ring-2 ring-blue-500/40 rounded-full p-0.5">
                  <StudentAvatar name={student.name} src={student.avatarUrl} size="md" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black border ${rankBadge.cls}`}>
                      {rankBadge.label}
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      ملخص شغلك على المنصة
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-black text-foreground leading-relaxed flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>{dashMotivation}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href="/honor-board"
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition shadow-2xs"
                >
                  <Trophy className="h-4 w-4" />
                  <span>لوحة الشرف 🏆</span>
                </a>
                {unresolvedMistakesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpen("mistakes")}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-black transition cursor-pointer"
                  >
                    <Target className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span>راجع أخطاءك ({unresolvedMistakesCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Activity Breakdown Tiles (Flat Solid Colors — Clean Light & Dark Mode) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-2xl bg-muted/40 dark:bg-[#132036] border border-border p-3 text-right">
                <span className="block text-[10.5px] font-bold text-muted-foreground">إنجاز الدروس</span>
                <strong className="text-lg font-black font-mono text-foreground">
                  {completedLessonsCount} <span className="text-xs text-muted-foreground">/ {safeVideos.length}</span>
                </strong>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500" style={{ width: `${Math.min(100, averageProgress)}%` }} />
                </div>
              </div>

              <div className="rounded-2xl bg-muted/40 dark:bg-[#132036] border border-border p-3 text-right">
                <span className="block text-[10.5px] font-bold text-muted-foreground">امتحانات حلّيتها</span>
                <strong className="text-lg font-black font-mono text-foreground">
                  {completedQuizzesCount} <span className="text-xs text-muted-foreground">/ {safeQuizzes.length}</span>
                </strong>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                    style={{ width: `${safeQuizzes.length > 0 ? Math.min(100, Math.round((completedQuizzesCount / safeQuizzes.length) * 100)) : 0}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-muted/40 dark:bg-[#132036] border border-border p-3 text-right">
                <span className="block text-[10.5px] font-bold text-muted-foreground">متوسط درجاتك</span>
                <strong className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                  {attemptedQuizzes.length > 0 ? `${realAverageResult}%` : "ابدأ أول امتحان"}
                </strong>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${attemptedQuizzes.length > 0 ? Math.min(100, realAverageResult) : 0}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-muted/40 dark:bg-[#132036] border border-border p-3 text-right">
                <span className="block text-[10.5px] font-bold text-muted-foreground">بنك الأخطاء</span>
                <strong className="text-lg font-black font-mono text-foreground">
                  {unresolvedMistakesCount === 0 ? "0 ✓" : `${unresolvedMistakesCount} سؤال`}
                </strong>
                <span className="block text-[10px] font-bold text-muted-foreground mt-0.5">
                  {unresolvedMistakesCount === 0 ? "ممتاز! مفيش أخطاء متراكمة" : "اضغط فوق وراجعهم"}
                </span>
              </div>
            </div>

            {/* Latest Exam Scores Strip */}
            {recentAttempted.length > 0 && (
              <div className="pt-2.5 border-t border-border space-y-2">
                <div className="text-[11px] font-black text-muted-foreground">آخر امتحاناتك ودرجاتك:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {recentAttempted.map((qz) => {
                    const sc = Math.round(Number(qz.bestScore || 0));
                    return (
                      <div key={qz.id} className="rounded-xl bg-muted/40 dark:bg-[#132036] border border-border px-3 py-2 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-bold text-foreground truncate">{qz.title}</span>
                          <span className={`font-mono font-black shrink-0 ${sc >= qz.passingScore ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                            {sc}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${sc >= qz.passingScore ? "bg-emerald-600 dark:bg-emerald-500" : "bg-rose-600 dark:bg-rose-500"}`}
                            style={{ width: `${Math.min(100, sc)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 2. KPI Statistics Cards */}
      <StudentStatistics
        completedLessonsCount={completedLessonsCount}
        totalLessonsCount={safeVideos.length}
        availableQuizzesCount={availableQuizzesCount}
        completedQuizzesCount={completedQuizzesCount}
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

      {/* 4. Organized 2-Column Main Workspace */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
        className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4 items-start"
      >
        <div className="space-y-4">
          <ContinueLearningCard
            continueVideo={continueVideo}
            continueProgress={continueProgress}
            overallProgress={averageProgress}
            academicTrackImage={academicTrack?.image}
            onOpenLessons={() => onOpen("lessons")}
            onPlayLesson={onPlayLesson}
          />

          <DailyChallengeCard isPaid={student.status === "approved" && student.paymentStatus === "paid"} />
        </div>

        <div className="space-y-4">
          <QuickActionsDock onOpen={onOpen} unresolvedMistakesCount={unresolvedMistakesCount} />

          <NextStepsList
            quizzes={safeQuizzes}
            files={safeFiles}
            videos={safeVideos}
            onOpen={onOpen}
            onPlayLesson={onPlayLesson}
          />
        </div>
      </motion.div>

      {/* 5. Latest Files Section */}
      <LatestFilesSection files={safeFiles} onOpenFiles={() => onOpen("files")} />
    </section>
  );
}
