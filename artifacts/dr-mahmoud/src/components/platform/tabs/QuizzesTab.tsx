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
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Quiz } from "@/types/platform";

// ── 1. Compact Page Header ──
export function ExamsPageHeader({ totalCount }: { totalCount: number }) {
  return (
    <header className="flex flex-col gap-1 text-right border-b border-slate-200 dark:border-[#223552] pb-3" dir="rtl">
      <div className="flex items-center gap-2.5">
        <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          الاختبارات
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {totalCount} متاح
        </span>
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        اختبر مستواك، تابع نتائجك، وأكمل الاختبارات المتاحة بكورساتك.
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
  const total = quizzes.length;
  const completedCount = quizzes.filter((q) => q.attemptsUsed && q.attemptsUsed > 0).length;
  const availableCount = quizzes.filter((q) => !q.locked).length;

  // Total remaining attempts
  const totalAttemptsLeft = quizzes.reduce((sum, q) => {
    if (q.maxAttempts === undefined || q.maxAttempts === null) return sum + 99; // unlimited
    return sum + Math.max(0, q.maxAttempts - (q.attemptsUsed || 0));
  }, 0);

  return (
    <section aria-label="إحصائيات الاختبارات" className="grid grid-cols-2 lg:grid-cols-4 gap-3" dir="rtl">
      <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3 flex items-center gap-3 shadow-2xs">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 truncate">الاختبارات المتاحة</span>
          <strong className="text-[22px] font-black text-slate-900 dark:text-white leading-none mt-0.5 block">{availableCount}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3 flex items-center gap-3 shadow-2xs">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 truncate">الاختبارات المكتملة</span>
          <strong className="text-[22px] font-black text-slate-900 dark:text-white leading-none mt-0.5 block">{completedCount}</strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3 flex items-center gap-3 shadow-2xs">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
          <Award className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 truncate">متوسط النتيجة</span>
          <strong className="text-[22px] font-black text-slate-900 dark:text-white leading-none mt-0.5 block">
            {completedCount > 0 ? "85%" : "—"}
          </strong>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3 flex items-center gap-3 shadow-2xs">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
          <RotateCcw className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-right">
          <span className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 truncate">المحاولات المتبقية</span>
          <strong className="text-[22px] font-black text-slate-900 dark:text-white leading-none mt-0.5 block">
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3 shadow-2xs space-y-2.5" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Search & Select Controls Row */}
        <div className="flex flex-1 items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث باسم الاختبار..."
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-[#223552] bg-slate-50 dark:bg-[#12233B] pr-9 pl-3 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {categories.length > 0 && (
            <div className="relative hidden sm:block">
              <select
                value={courseFilter}
                onChange={(e) => onCourseFilterChange(e.target.value)}
                className="h-9 appearance-none rounded-xl border border-slate-200 dark:border-[#223552] bg-slate-50 dark:bg-[#12233B] pr-3 pl-7 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none cursor-pointer"
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
              className="h-9 appearance-none rounded-xl border border-slate-200 dark:border-[#223552] bg-slate-50 dark:bg-[#12233B] pr-3 pl-7 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none cursor-pointer"
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
            className="h-9 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#12233B] rounded-xl transition-colors flex items-center gap-1 shrink-0 self-start sm:self-auto"
          >
            <X className="h-3.5 w-3.5" /> إعادة ضبط الفلاتر
          </button>
        )}
      </div>

      {/* Status Filter Tabs (Same Row or Tight) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none border-t border-slate-100 dark:border-[#1F314A] pt-2">
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
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
    </div>
  );
}

// ── 4. Redesigned Exam Card ──
export function ExamCard({
  quiz,
  onStartQuiz,
}: {
  quiz: Quiz;
  onStartQuiz: (quiz: Quiz) => void;
}) {
  const attemptsUsed = quiz.attemptsUsed || 0;
  const maxAttempts = quiz.maxAttempts;
  const attemptsLeft = maxAttempts !== undefined && maxAttempts !== null ? Math.max(0, maxAttempts - attemptsUsed) : null;
  const isCompleted = attemptsUsed > 0;
  const isLocked = !!quiz.locked;
  const questionsCount = quiz.questionsToShow && quiz.questionsToShow > 0 ? quiz.questionsToShow : quiz.questions.length;

  let statusBadgeText = "متاح الآن";
  let statusBadgeClass = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50";

  if (isLocked) {
    statusBadgeText = "مغلق";
    statusBadgeClass = "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50";
  } else if (isCompleted) {
    statusBadgeText = attemptsLeft === 0 ? "تم الحل (مكتمل)" : "محاولة جديدة";
    statusBadgeClass = attemptsLeft === 0 
      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
      : "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50";
  }

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-5 shadow-2xs hover:border-blue-500/50 hover:-translate-y-0.5 transition-all duration-200 w-full" dir="rtl">
      <div className="space-y-3">
        {/* 1. Status Badge (Compact Header) */}
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${statusBadgeClass}`}>
            {isLocked ? <Lock className="h-3 w-3" /> : isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            {statusBadgeText}
          </span>
        </div>

        {/* 2. Exam Title (Dominant Element with isolated LTR rendering for English names) */}
        <h3
          dir="ltr"
          className="text-base font-black text-slate-900 dark:text-slate-100 leading-snug text-right"
          style={{ unicodeBidi: "isolate" }}
        >
          {quiz.title}
        </h3>

        {/* 3. Course Badge (Light blue background, dark blue text, subtle border) */}
        <div className="flex items-center gap-2">
          <span
            dir="ltr"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300 text-right"
            style={{ unicodeBidi: "isolate" }}
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            {quiz.category}
          </span>
        </div>

        {/* 4. Academic Level & Metadata Lines */}
        <div className="space-y-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <div>البكالوريا – الصف الأول</div>
          {quiz.stage && (
            <div>نوع الدراسة: {quiz.stage}</div>
          )}
        </div>

        <div className="border-t border-slate-100 dark:border-[#1F314A] my-2" />

        {/* 5. Fixed 2-Column Metadata Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <ClipboardCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">{questionsCount} سؤال</span>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">النجاح: {quiz.passingScore}%</span>
          </div>

          {quiz.durationMinutes && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">{quiz.durationMinutes} دقيقة</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 min-w-0">
            <RotateCcw className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="truncate">{attemptsLeft !== null ? `${attemptsLeft} محاولات متبقية` : "بلا حدود"}</span>
          </div>
        </div>

        {/* 6. Results / Progress State */}
        {isCompleted ? (
          <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/40 p-2.5 space-y-1.5 mt-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
              <span>آخر نتيجة:</span>
              <span>85% (ناجح)</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900/60">
              <div className="h-full bg-blue-600 dark:bg-blue-500 w-[85%]" />
            </div>
          </div>
        ) : (
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 pt-1">
            لم تبدأ الاختبار بعد
          </div>
        )}

        {/* Locked Reason Warning */}
        {isLocked && quiz.lockedReason && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{quiz.lockedReason}</span>
          </div>
        )}
      </div>

      {/* 7. Action Button */}
      <div className="pt-3 mt-2">
        <Button
          type="button"
          onClick={() => onStartQuiz(quiz)}
          disabled={isLocked || (attemptsLeft !== null && attemptsLeft <= 0)}
          className={`w-full h-9 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 ${
            isLocked || (attemptsLeft !== null && attemptsLeft <= 0)
              ? "bg-slate-100 dark:bg-[#12233B] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#223552] cursor-not-allowed"
              : isCompleted
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isLocked ? (
            "غير متاح حالياً"
          ) : attemptsLeft !== null && attemptsLeft <= 0 ? (
            "استنفذت المحاولات"
          ) : isCompleted ? (
            <>
              <Eye className="h-3.5 w-3.5" /> عرض النتيجة / إعادتها
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-white" /> ابدأ الاختبار
            </>
          )}
        </Button>
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
    <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-10 text-center space-y-3" dir="rtl">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
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

      {/* 4. Exam Grid (Aligned from right, auto-fit min 340px up to 3 cols) */}
      {filteredQuizzes.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(340px,420px))] justify-start gap-4 w-full">
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
