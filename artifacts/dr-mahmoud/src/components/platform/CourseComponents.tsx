import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  Award,
  ChevronLeft,
  ChevronDown,
  Search,
  Filter,
  Bookmark,
  Share2,
  FileText,
  Paperclip,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowUpDown,
  Lock,
  Eye,
  SlidersHorizontal,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type VideoItem, getVideoThumbnail } from "@/lib/video";

// Helper for attached files extraction
function getAttachedFiles(item: VideoItem, files: any[]) {
  if (item.attachments?.length) return item.attachments;
  const legacy = item.pdfFileId ? files.find((file) => file.id === item.pdfFileId) : null;
  return legacy ? [legacy] : [];
}

export function CourseOverviewCard({
  courseName,
  academicLevel,
  totalLessons,
  completedLessons,
  totalWatchTimeHours,
  overallProgress,
  onPrimaryAction,
}: {
  courseName: string;
  academicLevel?: string;
  totalLessons: number;
  completedLessons: number;
  totalWatchTimeHours: number;
  overallProgress: number;
  onPrimaryAction: () => void;
}) {
  const isCompleted = overallProgress >= 100 || (totalLessons > 0 && completedLessons === totalLessons);
  const hasProgress = overallProgress > 0;

  let buttonText = "ابدأ الكورس";
  let ButtonIcon = Play;
  if (isCompleted) {
    buttonText = "مراجعة الكورس";
    ButtonIcon = RotateCcw;
  } else if (hasProgress) {
    buttonText = "استكمال التعلم";
    ButtonIcon = Play;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 md:p-6 shadow-2xs before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/25 before:to-transparent">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Course Main Details */}
        <div className="space-y-2 max-w-2xl text-right">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-2xs">
              <BookOpen className="h-3.5 w-3.5" />
              {academicLevel || "المنهج الدراسي والبرمجة"}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                مكتمل بالكامل
              </span>
            )}
          </div>

          <h1
            className="text-xl md:text-2xl font-black text-foreground tracking-tight leading-tight dir-ltr text-right"
            style={{ unicodeBidi: "isolate" }}
          >
            {courseName}
          </h1>

          <p className="text-xs md:text-sm font-medium text-muted-foreground">
            أنجزت <strong className="font-mono font-bold text-foreground tabular-nums">{completedLessons}</strong> من{" "}
            <strong className="font-mono font-bold text-foreground tabular-nums">{totalLessons}</strong> دروس
          </p>

          {/* Progress Bar & Percentage */}
          <div className="pt-1 space-y-1.5 max-w-lg">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground">نسبة التقدم الإجمالية</span>
              <span className="font-mono tabular-nums text-primary font-black">{overallProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#121E31] p-0.5">
              <div
                className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-500 ease-out shadow-xs"
                style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Primary Action Button & Quick Stats */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
          <Button
            type="button"
            onClick={onPrimaryAction}
            className="h-11 px-6 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ButtonIcon className="h-4 w-4 fill-current" />
            <span>{buttonText}</span>
          </Button>

          {/* Compact Stats Pill Row */}
          <div className="flex items-center justify-between sm:justify-end gap-3.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2 text-xs font-semibold text-muted-foreground font-mono tabular-nums dark:border-[#1E2E48] dark:bg-[#0E1626]">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-blue-500" />
              <span>{totalLessons} دروس</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>~{totalWatchTimeHours} ساعة</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>{completedLessons} تم</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CourseSwitcher({
  courses,
  activeCategory,
  onSelectCourse,
  overallProgressPercentage,
  totalVisibleLessons,
}: {
  courses: Array<{ name: string; lessonsCount: number; progressPct: number }>;
  activeCategory: string;
  onSelectCourse: (category: string) => void;
  overallProgressPercentage: number;
  totalVisibleLessons: number;
}) {
  const [filterType, setFilterType] = useState<"all" | "academic" | "programming">("all");

  const isAcademic = (name: string) => {
    const norm = name.toLowerCase();
    return (
      norm.includes("بكالوريا") ||
      norm.includes("ثانوي") ||
      norm.includes("منهج") ||
      norm.includes("الصف") ||
      norm.includes("تانية") ||
      norm.includes("أولى")
    );
  };

  const hasAcademic = courses.some((c) => isAcademic(c.name));
  const hasProgramming = courses.some((c) => !isAcademic(c.name));
  const showFilterTabs = hasAcademic && hasProgramming && courses.length > 2;

  const filteredCourses = courses.filter((c) => {
    if (filterType === "academic") return isAcademic(c.name);
    if (filterType === "programming") return !isAcademic(c.name);
    return true;
  });

  return (
    <div className="space-y-3" dir="rtl">
      {/* Category Segment Tabs */}
      {showFilterTabs && (
        <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-2.5 dark:border-[#1E2E48]/60">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filterType === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800/60"
            }`}
          >
            جميع المسارات ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("academic")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === "academic"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800/60"
            }`}
          >
            <span>🎓 المناهج الأساسية</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType("programming")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === "programming"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800/60"
            }`}
          >
            <span>💻 المسارات البرمجية</span>
          </button>
        </div>
      )}

      {/* Horizontal Scrollable Course Cards */}
      <div className="flex gap-3 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none" dir="rtl">
        {/* All Courses Master Card */}
        <button
          type="button"
          onClick={() => onSelectCourse("all")}
          className={`flex min-w-[210px] sm:min-w-[230px] shrink-0 flex-col justify-between rounded-2xl border p-3.5 text-right transition-all cursor-pointer ${
            activeCategory === "all"
              ? "border-blue-500/90 bg-blue-500/10 text-foreground ring-1 ring-blue-500/30 shadow-2xs"
              : "border-slate-200/80 bg-card text-muted-foreground hover:border-slate-300 dark:border-[#1E2E48] dark:bg-[#0A101D] dark:text-slate-300 dark:hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Layers className="h-3 w-3" /> شامل
            </span>
            <span className="font-mono text-xs font-black tabular-nums text-foreground">
              {overallProgressPercentage}%
            </span>
          </div>

          <div className="my-2 min-w-0">
            <strong className="block text-xs font-extrabold text-foreground truncate">
              كل الكورسات والمسارات
            </strong>
            <span className="text-[11px] font-medium text-muted-foreground font-mono tabular-nums">
              {totalVisibleLessons} درس متاح
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#121E31]">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.max(2, overallProgressPercentage)}%` }}
            />
          </div>
        </button>

        {/* Individual Course Cards */}
        {filteredCourses.map((course) => {
          const isSelected = activeCategory === course.name;
          const academic = isAcademic(course.name);

          return (
            <button
              key={course.name}
              type="button"
              onClick={() => onSelectCourse(course.name)}
              className={`flex min-w-[220px] sm:min-w-[240px] shrink-0 flex-col justify-between rounded-2xl border p-3.5 text-right transition-all cursor-pointer ${
                isSelected
                  ? "border-blue-500/90 bg-blue-500/10 text-foreground ring-1 ring-blue-500/30 shadow-2xs"
                  : "border-slate-200/80 bg-card text-muted-foreground hover:border-slate-300 dark:border-[#1E2E48] dark:bg-[#0A101D] dark:text-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                    academic
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  {academic ? "🎓 منهج دراسي" : "💻 مسار برمجي"}
                </span>
                <span className="font-mono text-xs font-black tabular-nums text-foreground">
                  {course.progressPct}%
                </span>
              </div>

              <div className="my-2 min-w-0 dir-ltr text-right" style={{ unicodeBidi: "isolate" }}>
                <strong className="block text-xs font-extrabold text-foreground truncate">
                  {course.name}
                </strong>
                <span className="text-[11px] font-medium text-muted-foreground font-mono tabular-nums">
                  {course.lessonsCount} درس
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#121E31]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    academic ? "bg-purple-600 dark:bg-purple-500" : "bg-emerald-600 dark:bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(2, course.progressPct)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ContinueLearningCard({
  item,
  secondaryItem,
  onPlayClick,
}: {
  item: any;
  secondaryItem?: any;
  onPlayClick: (item: VideoItem) => void;
}) {
  return (
    <div className="space-y-2 text-right">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          استكمال التعلم
        </h3>
        <span className="text-xs font-medium text-muted-foreground">تابع من حيث توقفت</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        {/* Main Large Continuation Card */}
        <div
          onClick={() => onPlayClick(item)}
          className="group relative flex flex-col sm:flex-row items-stretch gap-4 rounded-2xl border border-slate-200/80 bg-card p-4 shadow-2xs hover:border-blue-500/40 hover:shadow-xs transition-all cursor-pointer dark:border-[#1E2E48] dark:bg-[#0A101D] overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/15 before:to-transparent"
        >
          {/* 16:9 Aspect Ratio Thumbnail */}
          <div className="relative aspect-video w-full sm:w-56 shrink-0 overflow-hidden rounded-xl bg-slate-900">
            <img
              src={getVideoThumbnail(item)}
              alt={item.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                <Play className="h-5 w-5 fill-white" />
              </span>
            </div>
            <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-mono font-bold text-white backdrop-blur-xs">
              {item.order ? `الدرس ${item.order}` : "درس جاري"}
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-between min-w-0 flex-1 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 border border-blue-500/20 dir-ltr text-right" style={{ unicodeBidi: "isolate" }}>
                  {item.category}
                </span>
                <span className="text-muted-foreground font-mono tabular-nums">· قيد التقدم ({item.progress || 0}%)</span>
              </div>

              <h4
                className="text-sm md:text-base font-bold text-foreground line-clamp-2 leading-snug dir-ltr text-right"
                style={{ unicodeBidi: "isolate" }}
              >
                {item.title}
              </h4>
            </div>

            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#121E31]">
                <div
                  className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                  style={{ width: `${item.progress || 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-4 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  استكمال الدرس
                </Button>
                {item.durationText && (
                  <span className="text-xs font-semibold text-muted-foreground font-mono tabular-nums flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    {item.durationText}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Smaller Continuation Card */}
        {secondaryItem ? (
          <div
            onClick={() => onPlayClick(secondaryItem)}
            className="group hidden lg:flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-card p-3.5 shadow-2xs hover:border-blue-500/40 hover:shadow-xs transition-all cursor-pointer dark:border-[#1E2E48] dark:bg-[#0A101D]"
          >
            <div className="flex items-center gap-3">
              <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                <img src={getVideoThumbnail(secondaryItem)} alt={secondaryItem.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <Play className="h-4 w-4 fill-white text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block truncate dir-ltr text-right" style={{ unicodeBidi: "isolate" }}>
                  {secondaryItem.category}
                </span>
                <h5 className="text-xs font-bold text-foreground line-clamp-2 dir-ltr text-right" style={{ unicodeBidi: "isolate" }}>
                  {secondaryItem.title}
                </h5>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-muted-foreground border-t border-slate-200/60 pt-2 dark:border-[#1E2E48]/60">
              <span className="font-mono tabular-nums">التقدم: {secondaryItem.progress}%</span>
              <span className="text-primary font-bold hover:underline">متابعة ←</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LessonToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  displayMode,
  onDisplayModeChange,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: "all" | "not_started" | "in_progress" | "completed";
  onStatusFilterChange: (s: "all" | "not_started" | "in_progress" | "completed") => void;
  sortBy: "order" | "recent" | "least_completed" | "completed_first";
  onSortByChange: (s: "order" | "recent" | "least_completed" | "completed_first") => void;
  displayMode?: "grid" | "list";
  onDisplayModeChange?: (m: "grid" | "list") => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-card p-3 md:p-4 shadow-2xs dark:border-[#1E2E48] dark:bg-[#0A101D]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث في الدروس والمحاضرات..."
            className="h-9 w-full rounded-xl border border-slate-200/80 bg-slate-50/80 pr-9 pl-3 text-xs font-medium text-foreground focus:border-blue-500 focus:outline-none dark:border-[#1E2E48] dark:bg-[#0E1626] transition-colors"
          />
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 h-9 text-xs font-bold text-foreground dark:border-[#1E2E48] dark:bg-[#0E1626]">
            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e: any) => onSortByChange(e.target.value)}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-foreground"
            >
              <option value="order" className="dark:bg-[#0A101D]">ترتيب المنهج</option>
              <option value="recent" className="dark:bg-[#0A101D]">الأحدث</option>
              <option value="least_completed" className="dark:bg-[#0A101D]">الأقل تقدماً</option>
              <option value="completed_first" className="dark:bg-[#0A101D]">الأكثر تقدماً</option>
            </select>
          </div>
        </div>
      </div>

      {/* Status Filters Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-200/60 dark:border-[#1E2E48]/60">
        {(
          [
            ["all", "الكل"],
            ["not_started", "لم يبدأ"],
            ["in_progress", "قيد التقدم"],
            ["completed", "مكتمل"],
          ] as const
        ).map(([val, label]) => {
          const isActive = statusFilter === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onStatusFilterChange(val)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100/80 text-muted-foreground hover:bg-slate-200/80 dark:bg-[#0E1626] dark:text-slate-400 dark:hover:bg-[#152033]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RedesignedLessonCard({
  item,
  files,
  quizzes,
  bookmarks,
  expandedAttachments,
  onToggleExpandAttachment,
  onPlayClick,
  onToggleBookmark,
  onStartQuiz,
}: {
  item: any;
  files: any[];
  quizzes: any[];
  bookmarks: number[];
  expandedAttachments: Record<number, boolean>;
  onToggleExpandAttachment: (id: number) => void;
  onPlayClick: (item: VideoItem) => void;
  onToggleBookmark: (id?: number) => void;
  onStartQuiz?: (quiz: any) => void;
}) {
  const attachedFiles = getAttachedFiles(item, files);
  const quiz = item.quizId ? quizzes.find((q) => q.id === item.quizId) : null;
  const isAttachmentsExpanded = expandedAttachments[item.id || 0];

  const isCompleted = item.progress >= 95;
  const isInProgress = item.progress > 0 && !isCompleted;
  const isNotStarted = !isCompleted && !isInProgress;

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-card p-4 shadow-2xs hover:border-blue-500/40 hover:shadow-xs transition-all duration-200 dark:border-[#1E2E48] dark:bg-[#0A101D] relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/15 before:to-transparent">
      <div className="space-y-3">
        {/* Thumbnail area (16:9 aspect ratio) */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
          <img
            src={getVideoThumbnail(item)}
            alt={item.title}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onPlayClick(item)}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors cursor-pointer"
            aria-label={`شغّل ${item.title}`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-600 text-white shadow-lg hover:scale-105 transition-transform">
              {item.youtubeUrl === "locked" ? <Lock className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
            </span>
          </button>

          {/* Lesson Number & Status Badges */}
          <div className="absolute top-2.5 right-2.5 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-mono font-bold text-white backdrop-blur-xs">
              الدرس {item.order || 1}
            </span>

            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="h-3 w-3" />
                مكتمل
              </span>
            )}
            {isInProgress && (
              <span className="rounded-md bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                قيد التقدم ({item.progress}%)
              </span>
            )}
            {isNotStarted && (
              <span className="rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                لم يبدأ
              </span>
            )}
          </div>

          {/* Bookmark Action */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleBookmark(item.id)}
              className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            >
              <Bookmark className={`h-3.5 w-3.5 ${bookmarks.includes(item.id || 0) ? "fill-blue-500 text-blue-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="space-y-1.5 text-right">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-blue-600 dark:text-blue-400 border border-blue-500/20 dir-ltr text-right" style={{ unicodeBidi: "isolate" }}>
              {item.category}
            </span>
            {item.meta?.duration && (
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <Clock className="h-3 w-3 text-amber-500" /> {item.meta.duration}
              </span>
            )}
          </div>

          <h3
            className="line-clamp-2 text-sm font-bold text-foreground leading-snug dir-ltr text-right"
            style={{ unicodeBidi: "isolate" }}
          >
            {item.title}
          </h3>

          {item.description && (
            <p className="line-clamp-2 text-xs font-normal text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Progress Bar for in-progress or completed */}
        {item.progress > 0 && (
          <div className="space-y-1 pt-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#121E31]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${isCompleted ? "bg-emerald-500" : "bg-blue-600"}`}
                style={{ width: `${Math.min(100, item.progress)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Area & Actions */}
      <div className="mt-4 border-t border-slate-200/60 pt-3 space-y-3 dark:border-[#1E2E48]/60">
        {/* Attachments & exercises drawer button */}
        {(attachedFiles.length > 0 || quiz) && (
          <div>
            <button
              type="button"
              onClick={() => onToggleExpandAttachment(item.id || 0)}
              className="flex w-full items-center justify-between text-[11px] font-bold text-muted-foreground hover:text-primary py-1 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <Paperclip className="h-3.5 w-3.5" />
                المرفقات والتمارين ({attachedFiles.length + (quiz ? 1 : 0)})
              </span>
              <span className="text-[10px]">{isAttachmentsExpanded ? "▲ إخفاء" : "▼ عرض"}</span>
            </button>

            {isAttachmentsExpanded && (
              <div className="mt-2 space-y-1.5 rounded-xl bg-slate-50 dark:bg-[#0E1626] border border-slate-200/60 dark:border-[#1E2E48]/60 p-2 text-xs">
                {attachedFiles.map((file) => (
                  <a
                    key={file.id}
                    href={`/api/learning/files/${file.id}/preview?deviceId=${encodeURIComponent(localStorage.getItem("dr_mahmoud_device_id") || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg bg-card p-2 font-bold text-primary border border-slate-200/80 dark:border-[#1E2E48] hover:bg-primary/5 transition-colors"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      {file.title}
                    </span>
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ))}

                {quiz && (
                  <button
                    type="button"
                    disabled={quiz.locked}
                    onClick={() => !quiz.locked && onStartQuiz?.(quiz)}
                    className="flex w-full items-center justify-between rounded-lg bg-amber-500/10 p-2 font-bold text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/15 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5" />
                      {quiz.title}
                    </span>
                    <Award className="h-3.5 w-3.5 shrink-0" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Footer Button */}
        {isCompleted ? (
          <Button
            type="button"
            onClick={() => onPlayClick(item)}
            className="w-full font-bold h-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Check className="h-4 w-4" />
            <span>مراجعة الدرس</span>
          </Button>
        ) : isInProgress ? (
          <Button
            type="button"
            onClick={() => onPlayClick(item)}
            className="w-full font-bold h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>استكمال الدرس</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => onPlayClick(item)}
            className="w-full font-bold h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>ابدأ الدرس</span>
          </Button>
        )}
      </div>
    </article>
  );
}
