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
    <div className="relative overflow-hidden rounded-2xl border border-[#E4EAF2] bg-white p-5 md:p-6 shadow-xs dark:border-[#26364D] dark:bg-[#111C2E]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Course Main Details */}
        <div className="space-y-2 max-w-2xl text-right">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#E8EEFA] px-2.5 py-1 text-xs font-bold text-[#1769FF] dark:bg-[#172337] dark:text-[#3B82F6]">
              <BookOpen className="h-3.5 w-3.5" />
              {academicLevel || "المنهج الدراسي والبرمجة"}
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] px-2.5 py-1 text-xs font-bold text-[#12A66A]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                مكتمل بالكامل
              </span>
            )}
          </div>

          <h1
            className="text-xl md:text-2xl font-black text-[#111827] dark:text-[#F8FAFC] leading-tight dir-ltr text-right"
            style={{ unicodeBidi: "isolate" }}
          >
            {courseName}
          </h1>

          <p className="text-xs md:text-sm font-medium text-[#667085] dark:text-[#A9B5C7]">
            أنجزت <strong className="font-bold text-[#111827] dark:text-white">{completedLessons}</strong> من{" "}
            <strong className="font-bold text-[#111827] dark:text-white">{totalLessons}</strong> دروس
          </p>

          {/* Progress Bar & Percentage */}
          <div className="pt-1 space-y-1.5 max-w-lg">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#667085] dark:text-[#A9B5C7]">نسبة التقدم الإجمالية</span>
              <span className="text-[#1769FF] dark:text-[#3B82F6]">{overallProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E8EEFA] dark:bg-[#172337]">
              <div
                className="h-full bg-[#1769FF] transition-all duration-500 ease-out dark:bg-[#1769FF]"
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
            className="h-11 px-6 text-sm font-bold bg-[#1769FF] hover:bg-[#0F55DB] text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <ButtonIcon className="h-4 w-4 fill-white" />
            <span>{buttonText}</span>
          </Button>

          {/* Compact Stats Pill Row */}
          <div className="flex items-center justify-between sm:justify-end gap-4 rounded-xl border border-[#E4EAF2] bg-[#F6F8FC] px-3.5 py-2 text-xs font-medium text-[#667085] dark:border-[#26364D] dark:bg-[#172337] dark:text-[#A9B5C7]">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-[#1769FF]" />
              <span>{totalLessons} دروس</span>
            </div>
            <span className="text-[#E4EAF2] dark:text-[#26364D]">|</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#E89A16]" />
              <span>~{totalWatchTimeHours} ساعة</span>
            </div>
            <span className="text-[#E4EAF2] dark:text-[#26364D]">|</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#12A66A]" />
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
  const isMany = courses.length > 3;

  if (isMany) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#E4EAF2] bg-white p-3 shadow-xs dark:border-[#26364D] dark:bg-[#111C2E]">
        <label className="text-xs font-bold text-[#667085] dark:text-[#A9B5C7] shrink-0">اختر الكورس:</label>
        <select
          value={activeCategory}
          onChange={(e) => onSelectCourse(e.target.value)}
          className="h-10 w-full rounded-lg border border-[#E4EAF2] bg-[#F6F8FC] px-3 text-xs font-bold text-[#111827] focus:border-[#1769FF] focus:outline-none dark:border-[#26364D] dark:bg-[#172337] dark:text-[#F8FAFC]"
        >
          <option value="all">كل الكورسات ({totalVisibleLessons} درس) — {overallProgressPercentage}%</option>
          {courses.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.lessonsCount} درس) — {c.progressPct}%
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" dir="rtl">
      <button
        type="button"
        onClick={() => onSelectCourse("all")}
        className={`flex min-w-[180px] shrink-0 items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-right transition-all cursor-pointer ${
          activeCategory === "all"
            ? "border-[#1769FF] bg-[#E8EEFA] text-[#1769FF] font-bold dark:border-[#3B82F6] dark:bg-[#1E293B] dark:text-white"
            : "border-[#E4EAF2] bg-white text-[#667085] hover:border-[#CBD5E1] dark:border-[#26364D] dark:bg-[#111C2E] dark:text-[#F8FAFC] dark:hover:border-[#3B82F6]"
        }`}
      >
        <div className="min-w-0">
          <strong className="block text-xs truncate">كل الكورسات</strong>
          <span className="text-[10px] opacity-80">{totalVisibleLessons} درس</span>
        </div>
        <span className="text-xs font-extrabold shrink-0">{overallProgressPercentage}%</span>
      </button>

      {courses.map((course) => {
        const isSelected = activeCategory === course.name;
        return (
          <button
            key={course.name}
            type="button"
            onClick={() => onSelectCourse(course.name)}
            className={`flex min-w-[200px] shrink-0 items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-right transition-all cursor-pointer ${
              isSelected
                ? "border-[#1769FF] bg-[#E8EEFA] text-[#1769FF] font-bold dark:border-[#3B82F6] dark:bg-[#1E293B] dark:text-white"
                : "border-[#E4EAF2] bg-white text-[#667085] hover:border-[#CBD5E1] dark:border-[#26364D] dark:bg-[#111C2E] dark:text-[#F8FAFC] dark:hover:border-[#3B82F6]"
            }`}
          >
            <div className="min-w-0 text-right dir-ltr" style={{ unicodeBidi: "isolate" }}>
              <strong className="block text-xs truncate">{course.name}</strong>
              <span className="text-[10px] opacity-80">{course.lessonsCount} درس</span>
            </div>
            <span className="text-xs font-extrabold shrink-0">{course.progressPct}%</span>
          </button>
        );
      })}
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
        <h3 className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#E89A16]" />
          استكمال التعلم
        </h3>
        <span className="text-xs font-medium text-[#667085] dark:text-[#A9B5C7]">تابع من حيث توقفت</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        {/* Main Large Continuation Card */}
        <div
          onClick={() => onPlayClick(item)}
          className="group relative flex flex-col sm:flex-row items-stretch gap-4 rounded-2xl border border-[#E4EAF2] bg-white p-4 shadow-xs hover:border-[#1769FF]/50 hover:shadow-md transition-all cursor-pointer dark:border-[#26364D] dark:bg-[#111C2E]"
        >
          {/* 16:9 Aspect Ratio Thumbnail */}
          <div className="relative aspect-video w-full sm:w-56 shrink-0 overflow-hidden rounded-xl bg-[#F6F8FC] dark:bg-[#172337]">
            <img
              src={getVideoThumbnail(item)}
              alt={item.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#1769FF] text-white shadow-lg group-hover:scale-110 transition-transform">
                <Play className="h-5 w-5 fill-white" />
              </span>
            </div>
            <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">
              {item.order ? `الدرس ${item.order}` : "درس جاري"}
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-col justify-between min-w-0 flex-1 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1769FF] dark:text-[#3B82F6]">
                <span className="rounded-md bg-[#E8EEFA] px-2 py-0.5 dark:bg-[#172337] dir-ltr text-right" style={{ unicodeBidi: "isolate" }}>
                  {item.category}
                </span>
                <span className="text-[#667085] dark:text-[#A9B5C7]">· قيد التقدم ({item.progress || 0}%)</span>
              </div>

              <h4
                className="text-sm md:text-base font-bold text-[#111827] dark:text-[#F8FAFC] line-clamp-2 leading-snug dir-ltr text-right"
                style={{ unicodeBidi: "isolate" }}
              >
                {item.title}
              </h4>
            </div>

            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8EEFA] dark:bg-[#172337]">
                <div
                  className="h-full bg-[#E89A16] transition-all duration-300"
                  style={{ width: `${item.progress || 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-4 font-bold bg-[#1769FF] hover:bg-[#0F55DB] text-white rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  استكمال الدرس
                </Button>
                {item.durationText && (
                  <span className="text-xs font-semibold text-[#667085] dark:text-[#A9B5C7] flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#E89A16]" />
                    {item.durationText}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Smaller Continuation Card (If Available on Wide Screens) */}
        {secondaryItem ? (
          <div
            onClick={() => onPlayClick(secondaryItem)}
            className="group hidden lg:flex flex-col justify-between rounded-2xl border border-[#E4EAF2] bg-white p-3.5 shadow-xs hover:border-[#1769FF]/50 hover:shadow-md transition-all cursor-pointer dark:border-[#26364D] dark:bg-[#111C2E]"
          >
            <div className="flex items-center gap-3">
              <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-[#F6F8FC] dark:bg-[#172337]">
                <img src={getVideoThumbnail(secondaryItem)} alt={secondaryItem.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <Play className="h-4 w-4 fill-white text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <span className="text-[10px] font-bold text-[#1769FF] dark:text-[#3B82F6] block truncate dir-ltr text-right" style={{ unicodeBidi: "isolate" }}>
                  {secondaryItem.category}
                </span>
                <h5 className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] line-clamp-2 dir-ltr text-right" style={{ unicodeBidi: "isolate" }}>
                  {secondaryItem.title}
                </h5>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[#667085] dark:text-[#A9B5C7] border-t border-[#E4EAF2] pt-2 dark:border-[#26364D]">
              <span>التقدم: {secondaryItem.progress}%</span>
              <span className="text-[#1769FF] dark:text-[#3B82F6] hover:underline">متابعة ←</span>
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
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E4EAF2] bg-white p-3 md:p-4 shadow-xs dark:border-[#26364D] dark:bg-[#111C2E]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#667085] dark:text-[#A9B5C7]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث في الدروس..."
            className="h-9 w-full rounded-xl border border-[#E4EAF2] bg-[#F6F8FC] pr-9 pl-3 text-xs font-medium text-[#111827] focus:border-[#1769FF] focus:outline-none dark:border-[#26364D] dark:bg-[#172337] dark:text-[#F8FAFC]"
          />
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center rounded-xl border border-[#E4EAF2] bg-[#F6F8FC] px-3 h-9 text-xs font-bold text-[#111827] dark:border-[#26364D] dark:bg-[#172337] dark:text-[#F8FAFC]">
            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-[#667085] dark:text-[#A9B5C7]" />
            <select
              value={sortBy}
              onChange={(e: any) => onSortByChange(e.target.value)}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-[#111827] dark:text-[#F8FAFC]"
            >
              <option value="order" className="dark:bg-[#172337]">ترتيب المنهج</option>
              <option value="recent" className="dark:bg-[#172337]">الأحدث</option>
              <option value="least_completed" className="dark:bg-[#172337]">الأقل تقدمًا</option>
              <option value="completed_first" className="dark:bg-[#172337]">الأكثر تقدمًا</option>
            </select>
          </div>
        </div>
      </div>

      {/* Status Filters Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-[#E4EAF2] dark:border-[#26364D]">
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
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-[#1769FF] text-white shadow-2xs"
                  : "bg-[#F6F8FC] text-[#667085] hover:bg-[#E8EEFA] hover:text-[#1769FF] dark:bg-[#172337] dark:text-[#A9B5C7] dark:hover:bg-[#26364D]"
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
    <article className="flex flex-col justify-between rounded-2xl border border-[#E4EAF2] bg-white p-4 shadow-xs hover:border-[#1769FF]/40 hover:shadow-md transition-all dark:border-[#26364D] dark:bg-[#111C2E]">
      <div className="space-y-3">
        {/* Thumbnail area (16:9 aspect ratio) */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#F6F8FC] dark:bg-[#172337]">
          <img
            src={getVideoThumbnail(item)}
            alt={item.title}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => onPlayClick(item)}
            className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors"
            aria-label={`شغّل ${item.title}`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#1769FF] text-white shadow-lg hover:scale-105 transition-transform">
              {item.youtubeUrl === "locked" ? <Lock className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
            </span>
          </button>

          {/* Lesson Number & Status Badges */}
          <div className="absolute top-2.5 right-2.5 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
              الدرس {item.order || 1}
            </span>

            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF3] border border-[#12A66A]/20 px-2 py-0.5 text-[10px] font-bold text-[#12A66A]">
                <Check className="h-3 w-3" />
                مكتمل
              </span>
            )}
            {isInProgress && (
              <span className="rounded-md bg-[#FFFBEB] border border-[#E89A16]/20 px-2 py-0.5 text-[10px] font-bold text-[#E89A16]">
                قيد التقدم ({item.progress}%)
              </span>
            )}
            {isNotStarted && (
              <span className="rounded-md bg-[#F6F8FC] border border-[#E4EAF2] px-2 py-0.5 text-[10px] font-bold text-[#667085] dark:bg-[#172337] dark:border-[#26364D] dark:text-[#A9B5C7]">
                لم يبدأ
              </span>
            )}
          </div>

          {/* Bookmark Action */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleBookmark(item.id)}
              className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <Bookmark className={`h-3.5 w-3.5 ${bookmarks.includes(item.id || 0) ? "fill-[#1769FF] text-[#1769FF]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="space-y-1.5 text-right">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#667085] dark:text-[#A9B5C7]">
            <span className="rounded-md bg-[#E8EEFA] px-2 py-0.5 text-[#1769FF] dark:bg-[#172337] dark:text-[#3B82F6] dir-ltr text-right" style={{ unicodeBidi: "isolate" }}>
              {item.category}
            </span>
            {item.meta?.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.meta.duration}</span>}
          </div>

          <h3
            className="line-clamp-2 text-sm font-bold text-[#111827] dark:text-[#F8FAFC] leading-snug dir-ltr text-right"
            style={{ unicodeBidi: "isolate" }}
          >
            {item.title}
          </h3>

          {item.description && (
            <p className="line-clamp-2 text-xs font-normal text-[#667085] dark:text-[#A9B5C7] leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Progress Bar for in-progress or completed */}
        {item.progress > 0 && (
          <div className="space-y-1 pt-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8EEFA] dark:bg-[#172337]">
              <div
                className={`h-full transition-all duration-300 ${isCompleted ? "bg-[#12A66A]" : "bg-[#E89A16]"}`}
                style={{ width: `${Math.min(100, item.progress)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Area & Actions */}
      <div className="mt-4 border-t border-[#E4EAF2] pt-3 space-y-3 dark:border-[#26364D]">
        {/* Attachments & exercises drawer button */}
        {(attachedFiles.length > 0 || quiz) && (
          <div>
            <button
              type="button"
              onClick={() => onToggleExpandAttachment(item.id || 0)}
              className="flex w-full items-center justify-between text-[11px] font-bold text-[#667085] hover:text-[#1769FF] py-1 dark:text-[#A9B5C7]"
            >
              <span className="flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" />
                المرفقات والتمارين ({attachedFiles.length + (quiz ? 1 : 0)})
              </span>
              <span>{isAttachmentsExpanded ? "▲ إخفاء" : "▼ عرض"}</span>
            </button>

            {isAttachmentsExpanded && (
              <div className="mt-2 space-y-1.5 rounded-xl bg-[#F6F8FC] p-2 text-xs dark:bg-[#172337]">
                {attachedFiles.map((file) => (
                  <a
                    key={file.id}
                    href={`/api/learning/files/${file.id}/preview?deviceId=${encodeURIComponent(localStorage.getItem("dr_mahmoud_device_id") || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg bg-white p-2 font-bold text-[#1769FF] border border-[#E4EAF2] hover:bg-[#E8EEFA] dark:bg-[#111C2E] dark:border-[#26364D]"
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
                    className="flex w-full items-center justify-between rounded-lg bg-[#FFFBEB] p-2 font-bold text-[#E89A16] border border-[#E89A16]/20 hover:bg-[#FEF3C7] disabled:opacity-50"
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
            className="w-full font-bold h-10 bg-[#ECFDF3] text-[#12A66A] hover:bg-[#D1FADF] border border-[#12A66A]/30 rounded-xl flex items-center justify-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span>مراجعة الدرس</span>
          </Button>
        ) : isInProgress ? (
          <Button
            type="button"
            onClick={() => onPlayClick(item)}
            className="w-full font-bold h-10 bg-[#1769FF] hover:bg-[#0F55DB] text-white rounded-xl flex items-center justify-center gap-1.5"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>استكمال الدرس</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => onPlayClick(item)}
            className="w-full font-bold h-10 bg-[#1769FF] hover:bg-[#0F55DB] text-white rounded-xl flex items-center justify-center gap-1.5"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>ابدأ الدرس</span>
          </Button>
        )}
      </div>
    </article>
  );
}
