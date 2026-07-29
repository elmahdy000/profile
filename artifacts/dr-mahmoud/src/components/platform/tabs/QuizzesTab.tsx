import { useState, useMemo } from "react";
import {
  Clock,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  User,
  Sparkles,
  Lock,
  Layers,
  Check,
  X,
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Quiz } from "@/types/platform";

// ── Components Architecture ──

// 1. Page Header
export function ExamsPageHeader({ totalCount }: { totalCount: number }) {
  return (
    <header className="flex flex-col gap-1 text-right" dir="rtl">
      <div className="flex items-center gap-3">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          الاختبارات
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-300">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {totalCount} متاح
        </span>
      </div>
      <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
        اختبر مستواك، تابع نتائجك، وأكمل الاختبارات المتاحة بكورساتك.
      </p>
    </header>
  );
}

// 2. Statistics Cards
export function ExamStatistics({
  quizzes,
}: {
  quizzes: Quiz[];
}) {
  const total = quizzes.length;
  const completed = quizzes.filter(
    (q) => q.attemptsUsed && q.attemptsUsed > 0
  ).length;

  const available = quizzes.filter((q) => !q.locked).length;

  return (
    <section aria-label="إحصائيات الاختبارات" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3.5 flex items-center gap-3 shadow-2xs">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">الاختبارات المتاحة</span>
          <strong className="text-base font-black text-slate-900 dark:text-white">{available}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3.5 flex items-center gap-3 shadow-2xs">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">الاختبارات المكتملة</span>
          <strong className="text-base font-black text-slate-900 dark:text-white">{completed}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3.5 flex items-center gap-3 shadow-2xs">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">إجمالي الاختبارات</span>
          <strong className="text-base font-black text-slate-900 dark:text-white">{total}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3.5 flex items-center gap-3 shadow-2xs">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
          <RotateCcw className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">محاولات غير مستغلة</span>
          <strong className="text-base font-black text-slate-900 dark:text-white">
            {quizzes.filter(q => !q.maxAttempts || (q.attemptsUsed || 0) < q.maxAttempts).length}
          </strong>
        </div>
      </div>
    </section>
  );
}

// 3. Filter and Control Bar
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3 md:p-4 shadow-2xs">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث باسم الاختبار..."
            className="h-9 w-full rounded-xl border border-slate-200 dark:border-[#223552] bg-slate-50 dark:bg-[#12233B] pr-9 pl-3 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Desktop Controls */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
          {/* Course Selector */}
          {categories.length > 0 && (
            <div className="relative">
              <select
                value={courseFilter}
                onChange={(e) => onCourseFilterChange(e.target.value)}
                className="h-9 appearance-none rounded-xl border border-slate-200 dark:border-[#223552] bg-slate-50 dark:bg-[#12233B] pr-3 pl-8 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="all">كل الكورسات</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="h-9 appearance-none rounded-xl border border-slate-200 dark:border-[#223552] bg-slate-50 dark:bg-[#12233B] pr-8 pl-8 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="recent">الأحدث</option>
              <option value="title">حسب الاسم</option>
              <option value="attempts">حسب المحاولات المتبقية</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <ChevronDown className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Clear Filters */}
          {isFiltered && (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-9 px-3 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" /> إعادة ضبط
            </button>
          )}
        </div>

        {/* Mobile Filter Toggle */}
        <div className="flex sm:hidden items-center justify-between gap-2 border-t border-slate-100 dark:border-[#223552] pt-2">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-[#223552] bg-slate-50 dark:bg-[#12233B] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> الفلاتر والتصنيف
          </button>

          {isFiltered && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-bold text-red-500"
            >
              إلغاء الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 dark:border-[#223552] pt-2.5">
        {[
          ["all", "الكل"],
          ["available", "متاح الآن"],
          ["completed", "مكتمل / تم الحل"],
          ["locked", "مغلق"],
        ].map(([val, label]) => {
          const isActive = statusFilter === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onStatusFilterChange(val)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-[#12233B] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1A3050]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Mobile Drawer Panel */}
      {mobileDrawerOpen && (
        <div className="sm:hidden space-y-3 pt-3 border-t border-slate-100 dark:border-[#223552]">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">الكورس:</label>
            <select
              value={courseFilter}
              onChange={(e) => onCourseFilterChange(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#223552] bg-slate-50 dark:bg-[#12233B] px-3 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <option value="all">كل الكورسات</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">التصنيف حسب:</label>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#223552] bg-slate-50 dark:bg-[#12233B] px-3 text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              <option value="recent">الأحدث</option>
              <option value="title">حسب الاسم</option>
              <option value="attempts">حسب المحاولات المتبقية</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// 4. Redesigned Exam Card
export function ExamCard({
  quiz,
  onStartQuiz,
}: {
  quiz: Quiz;
  onStartQuiz: (quiz: Quiz) => void;
}) {
  const attemptsUsed = quiz.attemptsUsed || 0;
  const maxAttempts = quiz.maxAttempts;
  const attemptsLeft = maxAttempts !== undefined ? Math.max(0, maxAttempts - attemptsUsed) : null;
  const isCompleted = attemptsUsed > 0;
  const isLocked = !!quiz.locked;
  const questionsCount = quiz.questionsToShow && quiz.questionsToShow > 0 ? quiz.questionsToShow : quiz.questions.length;

  let statusBadgeText = "متاح الآن";
  let statusBadgeClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";

  if (isLocked) {
    statusBadgeText = "مغلق";
    statusBadgeClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
  } else if (isCompleted) {
    statusBadgeText = attemptsLeft === 0 ? "تم الحل (مكتمل)" : "محاولة جديدة متاحة";
    statusBadgeClass = attemptsLeft === 0 
      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
      : "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
  }

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-5 shadow-2xs hover:border-blue-500/50 hover:-translate-y-0.5 transition-all duration-200">
      <div className="space-y-3.5">
        {/* Top Row: Status badge & Stage */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${statusBadgeClass}`}>
            {isLocked ? <Lock className="h-3 w-3" /> : isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {statusBadgeText}
          </span>

          {quiz.stage && (
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
              {quiz.stage}
            </span>
          )}
        </div>

        {/* Metadata Badges: Course name with LTR isolation */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/25 px-2.5 py-1 text-xs font-bold text-white border border-blue-500/30 dir-ltr text-right"
            style={{ unicodeBidi: "isolate" }}
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-400" />
            {quiz.category}
          </span>
        </div>

        {/* Title */}
        <h3
          className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-snug dir-ltr text-right"
          style={{ unicodeBidi: "isolate" }}
        >
          {quiz.title}
        </h3>

        {/* Icon-based Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-[#1C2C42]">
          <div className="flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span>{questionsCount} سؤال</span>
          </div>

          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>النجاح: {quiz.passingScore}%</span>
          </div>

          {quiz.durationMinutes && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{quiz.durationMinutes} دقيقة</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            <span>{attemptsLeft !== null ? `${attemptsLeft} محاولات متبقية` : "بلا حدود"}</span>
          </div>
        </div>

        {/* Locked Reason Warning */}
        {isLocked && quiz.lockedReason && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{quiz.lockedReason}</span>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-4 mt-2">
        <Button
          type="button"
          onClick={() => onStartQuiz(quiz)}
          disabled={isLocked || (attemptsLeft !== null && attemptsLeft <= 0)}
          className={`w-full h-10 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 ${
            isLocked || (attemptsLeft !== null && attemptsLeft <= 0)
              ? "bg-slate-100 dark:bg-[#12233B] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#223552] cursor-not-allowed"
              : isCompleted
              ? "bg-purple-600 hover:bg-purple-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isLocked
            ? quiz.lockedReason || "غير متاح حالياً"
            : attemptsLeft !== null && attemptsLeft <= 0
            ? "استنفذت المحاولات"
            : isCompleted
            ? "إعادة المحاولة"
            : "ابدأ الاختبار"}
        </Button>
      </div>
    </article>
  );
}

// 5. Empty State
export function EmptyExamsState({
  isFiltered,
  onClearFilters,
}: {
  isFiltered: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-10 text-center space-y-3">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
        <ClipboardCheck className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        {isFiltered ? "لا توجد نتائج تطابق بحثك" : "لا توجد اختبارات متاحة حالياً"}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        {isFiltered
          ? "جرب تغيير كلمات البحث أو تصفير الفلاتر لعرض كافة الاختبارات."
          : "ستظهر أي اختبارات جديدة تم نشرها لمرحلتك الدراسية هنا فور توفرها."}
      </p>
      {isFiltered && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
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
}: {
  quizzes: Quiz[];
  onStartQuiz: (quiz: Quiz) => void;
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
        // Recent / ID Default
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
    <section className="space-y-6 text-right max-w-[1400px] mx-auto" dir="rtl">
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

      {/* 4. Exam Grid (3 cols desktop, 2 cols tablet, 1 col mobile) */}
      {filteredQuizzes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <ExamCard key={quiz.id} quiz={quiz} onStartQuiz={onStartQuiz} />
          ))}
        </div>
      ) : (
        <EmptyExamsState isFiltered={isFiltered} onClearFilters={handleClearFilters} />
      )}
    </section>
  );
}
