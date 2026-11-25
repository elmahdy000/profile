import { useState, useMemo } from "react";
import {
  Clock,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  BookOpen,
  Sparkles,
  Lock,
  X,
  SlidersHorizontal,
  ChevronDown,
  Play,
  Eye,
  Award,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Quiz } from "@/types/platform";
import { formatExamDayAndTime, formatQuizDurationAr, getEffectiveQuizDurationMinutes } from "@/lib/motivationMessages";

// ── 1. Compact Page Header ──
export function ExamsPageHeader({ totalCount }: { totalCount: number }) {
  return (
    <header className="flex flex-col gap-1.5 text-right border-b border-slate-200/80 dark:border-[#1E2E48] pb-3.5" dir="rtl">
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          الاختبارات
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50/80 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/60 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300 shadow-2xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
          </span>
          <span className="font-mono tabular-nums">{totalCount}</span> متاح
        </span>
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        اختبر مستواك، تابع نتائجك أولاً بأول، وتدرّب على أسئلة الامتحانات الإلكترونية بكورساتك.
      </p>
    </header>
  );
}

// ── 2. Statistics Section ──
export function ExamStatistics({
  quizzes,
}: {
  quizzes: Quiz[];
}) {
  const completedCount = quizzes.filter((q) => q.attemptsUsed && q.attemptsUsed > 0).length;
  const availableCount = quizzes.filter((q) => !q.locked).length;

  // Total remaining attempts
  const totalAttemptsLeft = quizzes.reduce((sum, q) => {
    if (q.maxAttempts === undefined || q.maxAttempts === null) return sum + 99; // unlimited
    return sum + Math.max(0, q.maxAttempts - (q.attemptsUsed || 0));
  }, 0);

  return (
    <section aria-label="إحصائيات الاختبارات" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3" dir="rtl">
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs hover:border-blue-500/40 hover:shadow-xs transition-all duration-200">
        <span className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 group-hover:scale-105 transition-transform duration-200">
          <ClipboardCheck className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[11px] sm:text-[11.5px] font-bold text-slate-500 dark:text-slate-400 truncate">الاختبارات المتاحة</span>
          <strong className="text-lg sm:text-[20px] font-black font-mono tabular-nums text-slate-900 dark:text-white leading-none mt-0.5 block">{availableCount}</strong>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs hover:border-emerald-500/40 hover:shadow-xs transition-all duration-200">
        <span className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 group-hover:scale-105 transition-transform duration-200">
          <CheckCircle2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[11px] sm:text-[11.5px] font-bold text-slate-500 dark:text-slate-400 truncate">الاختبارات المكتملة</span>
          <strong className="text-lg sm:text-[20px] font-black font-mono tabular-nums text-slate-900 dark:text-white leading-none mt-0.5 block">{completedCount}</strong>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs hover:border-amber-500/40 hover:shadow-xs transition-all duration-200">
        <span className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 group-hover:scale-105 transition-transform duration-200">
          <Award className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[11px] sm:text-[11.5px] font-bold text-slate-500 dark:text-slate-400 truncate">متوسط النتيجة</span>
          <strong className="text-lg sm:text-[20px] font-black font-mono tabular-nums text-slate-900 dark:text-white leading-none mt-0.5 block">
            {(() => {
              const scores = quizzes
                .map((q) => q.bestScore)
                .filter((s): s is number => typeof s === "number" && !isNaN(s));
              if (scores.length === 0) return "—";
              const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
              return `${avg}%`;
            })()}
          </strong>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-2.5 sm:p-3 flex items-center gap-2.5 shadow-2xs hover:border-purple-500/40 hover:shadow-xs transition-all duration-200">
        <span className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 group-hover:scale-105 transition-transform duration-200">
          <RotateCcw className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[11px] sm:text-[11.5px] font-bold text-slate-500 dark:text-slate-400 truncate">المحاولات المتبقية</span>
          <strong className="text-lg sm:text-[20px] font-black font-mono tabular-nums text-slate-900 dark:text-white leading-none mt-0.5 block">
            {totalAttemptsLeft > 50 ? "بلا حدود" : totalAttemptsLeft}
          </strong>
        </div>
      </div>
    </section>
  );
}

// ── 3. Compact Filter Bar ──
export function ExamFilters({
  searchQuery,
  onSearchChange,
  courseFilter,
  onCourseFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  categories,
  onClearFilters,
  isFiltered,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  courseFilter: string;
  onCourseFilterChange: (c: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  sortBy: string;
  onSortByChange: (s: string) => void;
  categories: string[];
  onClearFilters: () => void;
  isFiltered: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-3 shadow-2xs space-y-2.5" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Search & Select Controls Row */}
        <div className="flex flex-1 items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث باسم الاختبار..."
              className="h-9 w-full rounded-xl border border-slate-200/80 dark:border-[#1E2E48] bg-slate-50/70 dark:bg-[#0F172A] pr-9 pl-3 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-[#0B132B] focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
            />
          </div>

          {categories.length > 0 && (
            <div className="relative hidden sm:block">
              <select
                value={courseFilter}
                onChange={(e) => onCourseFilterChange(e.target.value)}
                className="h-9 appearance-none rounded-xl border border-slate-200/80 dark:border-[#1E2E48] bg-slate-50/70 dark:bg-[#0F172A] pr-3 pl-7 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer transition-colors"
              >
                <option value="all">كل الكورسات</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute left-2 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          )}

          <div className="relative hidden sm:block">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="h-9 appearance-none rounded-xl border border-slate-200/80 dark:border-[#1E2E48] bg-slate-50/70 dark:bg-[#0F172A] pr-3 pl-7 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer transition-colors"
            >
              <option value="recent">الأحدث</option>
              <option value="title">حسب الاسم</option>
              <option value="attempts">المحاولات المتبقية</option>
            </select>
            <ChevronDown className="absolute left-2 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Clear Filters (Only visible when filters are active) */}
        {isFiltered && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-9 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0F172A] rounded-xl transition-colors flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <X className="h-3.5 w-3.5" /> إعادة ضبط الفلاتر
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none border-t border-slate-100 dark:border-[#1E2E48] pt-2">
        {[
          ["all", "الكل"],
          ["available", "متاح الآن"],
          ["completed", "تم الحل"],
          ["locked", "مغلق"],
        ].map(([val, label]) => {
          const isActive = statusFilter === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onStatusFilterChange(val)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-2xs ring-1 ring-blue-500/20"
                  : "bg-slate-100/80 dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-[#1A2642]"
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

// ── 4. Compact & Refined Exam Card ──
export function ExamCard({
  quiz,
  onStartQuiz,
  onReviewQuiz,
}: {
  quiz: Quiz;
  onStartQuiz: (quiz: Quiz) => void;
  onReviewQuiz?: (quiz: Quiz) => void;
}) {
  const attemptsUsed = quiz.attemptsUsed || 0;
  const maxAttempts = quiz.maxAttempts;
  const attemptsLeft = maxAttempts !== undefined && maxAttempts !== null ? Math.max(0, maxAttempts - attemptsUsed) : null;
  const isCompleted = attemptsUsed > 0;
  const isLocked = !!quiz.locked;
  const questionsCount = quiz.questionsToShow && quiz.questionsToShow > 0 ? quiz.questionsToShow : quiz.questions.length;
  const effectiveDuration = getEffectiveQuizDurationMinutes(quiz);
  const examDateInfo = formatExamDayAndTime(quiz.createdAt);

  let statusBadgeText = "جديد — لم يتم حله";
  let statusBadgeClass = "bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60";
  let cardBorderBg = "border border-slate-200/90 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] hover:border-blue-500/50";
  let showPulsingDot = true;

  if (isLocked) {
    statusBadgeText = "مغلق 🔒";
    statusBadgeClass = "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60";
    cardBorderBg = "border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 opacity-75";
    showPulsingDot = false;
  } else if (isCompleted) {
    showPulsingDot = false;
    statusBadgeText = "تم الاختبار بنجاح ✓";
    statusBadgeClass = "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60";
    cardBorderBg = "border border-emerald-300/70 dark:border-emerald-700/60 bg-card dark:bg-[#0A101D] hover:border-emerald-500";
  }

  return (
    <article className={`group relative flex flex-col justify-between rounded-2xl ${cardBorderBg} p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all duration-200 w-full overflow-hidden`} dir="rtl">
      <div className="space-y-2.5">
        {/* 1. Status Badge & Duration */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10.5px] font-bold border ${statusBadgeClass}`}>
            {showPulsingDot && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600" />
              </span>
            )}
            {isLocked ? <Lock className="h-3 w-3" /> : isCompleted ? <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : null}
            {statusBadgeText}
          </span>

          {effectiveDuration && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 px-2 py-0.5 rounded-lg">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>{formatQuizDurationAr(effectiveDuration)}</span>
            </span>
          )}
        </div>

        {/* 1.5. Day & Time of Exam / Homework */}
        {examDateInfo && (
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{examDateInfo.fullLabel}</span>
          </div>
        )}

        {/* 2. Exam Title */}
        <h3
          dir="ltr"
          className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug text-right group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2"
          style={{ unicodeBidi: "isolate" }}
        >
          {quiz.title}
        </h3>

        {/* 3. Course and Stage metadata */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span
            dir="auto"
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/60 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 dark:text-blue-300"
          >
            <BookOpen className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            {quiz.category}
          </span>
          {quiz.stage && (
            <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-[220px]">
              • {quiz.stage}
            </span>
          )}
        </div>

        {/* 4. Compact Stats Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-[#1E2E48]">
          <span className="inline-flex items-center gap-1">
            <ClipboardCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span><span className="font-mono tabular-nums">{questionsCount}</span> سؤال</span>
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>النجاح <span className="font-mono tabular-nums">{quiz.passingScore}%</span></span>
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <RotateCcw className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>
              {attemptsLeft !== null ? (
                <><span className="font-mono tabular-nums">{attemptsLeft}</span> محاولات</>
              ) : (
                "بلا حدود"
              )}
            </span>
          </span>
        </div>

        {/* 5. Results / Progress State (if completed) */}
        {isCompleted && typeof quiz.bestScore === "number" && (() => {
          const best = Math.max(0, Math.min(100, Math.round(quiz.bestScore as number)));
          const passed = best >= quiz.passingScore;
          return (
            <div
              className={`rounded-xl border p-2 space-y-1 mt-1 ${
                passed
                  ? "border-emerald-300/80 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40"
                  : "border-red-300/80 dark:border-red-800 bg-red-50/70 dark:bg-red-950/40"
              }`}
            >
              <div
                className={`flex items-center justify-between text-[11px] font-bold ${
                  passed
                    ? "text-emerald-800 dark:text-emerald-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                <span>أفضل نتيجة لك:</span>
                <span className="font-mono font-black tabular-nums">{best}% ({passed ? "ناجح ✓" : "محتاج مراجعة"})</span>
              </div>
              <div
                className={`h-1.5 w-full overflow-hidden rounded-full ${
                  passed ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-red-100 dark:bg-red-900/50"
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    passed ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                  style={{ width: `${best}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Locked Reason Warning */}
        {isLocked && quiz.lockedReason && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 p-2 text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{quiz.lockedReason}</span>
          </div>
        )}
      </div>

      {/* 6. Clean Action Button */}
      <div className="pt-2.5 mt-2">
        {isCompleted ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => (onReviewQuiz ? onReviewQuiz(quiz) : onStartQuiz(quiz))}
              className="flex-1 h-9 rounded-xl text-xs font-black shadow-2xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>مراجعة الإجابات 👁️</span>
            </Button>
            {attemptsLeft === null || attemptsLeft > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onStartQuiz(quiz)}
                className="h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                title="إعادة المحاولة"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">إعادة</span>
              </Button>
            ) : null}
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => onStartQuiz(quiz)}
            disabled={isLocked || (attemptsLeft !== null && attemptsLeft <= 0)}
            className={`w-full h-9 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer ${
              isLocked || (attemptsLeft !== null && attemptsLeft <= 0)
                ? "bg-slate-100 dark:bg-[#0F172A] text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-[#1E2E48] cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
            }`}
          >
            {isLocked ? "غير متاح حالياً" : attemptsLeft !== null && attemptsLeft <= 0 ? "خلصت كل محاولاتك" : "ابدأ الاختبار 🚀"}
          </Button>
        )}
      </div>
    </article>
  );
}

// ── 5. Empty State ──
export function EmptyExamsState({
  isFiltered,
  onClearFilters,
}: {
  isFiltered: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-10 text-center space-y-3.5" dir="rtl">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shadow-xs">
        <ClipboardCheck className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        {isFiltered ? "لا توجد نتائج تطابق بحثك" : "لا توجد اختبارات متاحة حالياً"}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        {isFiltered
          ? "جرب تغيير كلمات البحث أو إعادة ضبط الفلاتر لعرض كافة الاختبارات."
          : "ستظهر أي اختبارات جديدة تم نشرها لمرحلتك الدراسية هنا فور توفرها."}
      </p>
      {isFiltered && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" /> إلغاء كل الفلاتر
        </button>
      )}
    </div>
  );
}

// ── Main Redesigned Quizzes Tab ──
export function QuizzesTab({
  quizzes,
  onStartQuiz,
  onReviewQuiz,
}: {
  quizzes: Quiz[];
  onStartQuiz: (quiz: Quiz) => void;
  onReviewQuiz?: (quiz: Quiz) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  // Extract Categories
  const categories = useMemo(() => {
    return Array.from(new Set(quizzes.map((q) => q.category).filter(Boolean)));
  }, [quizzes]);

  // Filter & Sort Logic
  const filteredQuizzes = useMemo(() => {
    return quizzes
      .filter((q) => {
        // Search Filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchesTitle = q.title.toLowerCase().includes(query);
          const matchesCategory = q.category.toLowerCase().includes(query);
          if (!matchesTitle && !matchesCategory) return false;
        }

        // Course Filter
        if (courseFilter !== "all" && q.category !== courseFilter) {
          return false;
        }

        // Status Filter
        if (statusFilter === "available" && q.locked) return false;
        if (statusFilter === "completed" && (!q.attemptsUsed || q.attemptsUsed === 0)) return false;
        if (statusFilter === "locked" && !q.locked) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") {
          return a.title.localeCompare(b.title, "ar");
        }
        if (sortBy === "attempts") {
          const leftA = a.maxAttempts ? a.maxAttempts - (a.attemptsUsed || 0) : 99;
          const leftB = b.maxAttempts ? b.maxAttempts - (b.attemptsUsed || 0) : 99;
          return leftA - leftB;
        }
        return b.id - a.id;
      });
  }, [quizzes, searchQuery, courseFilter, statusFilter, sortBy]);

  const isFiltered = searchQuery.trim() !== "" || courseFilter !== "all" || statusFilter !== "all";

  const handleClearFilters = () => {
    setSearchQuery("");
    setCourseFilter("all");
    setStatusFilter("all");
    setSortBy("recent");
  };

  return (
    <section className="space-y-4 text-right max-w-[1400px] w-full" dir="rtl">
      {/* 1. Header */}
      <ExamsPageHeader totalCount={quizzes.length} />

      {/* 2. Statistics Section */}
      <ExamStatistics quizzes={quizzes} />

      {/* 3. Filter & Controls Bar */}
      <ExamFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        courseFilter={courseFilter}
        onCourseFilterChange={setCourseFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        categories={categories}
        onClearFilters={handleClearFilters}
        isFiltered={isFiltered}
      />

      {/* 4. Exam Grid (Aligned from right, 1/2/3 cols responsive grid) */}
      {filteredQuizzes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
          {filteredQuizzes.map((quiz) => (
            <ExamCard
              key={quiz.id}
              quiz={quiz}
              onStartQuiz={onStartQuiz}
              onReviewQuiz={onReviewQuiz}
            />
          ))}
        </div>
      ) : (
        <EmptyExamsState isFiltered={isFiltered} onClearFilters={handleClearFilters} />
      )}
    </section>
  );
}
