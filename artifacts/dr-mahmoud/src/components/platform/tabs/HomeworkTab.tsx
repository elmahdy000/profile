import React, { useState, useMemo } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Search,
  Sparkles,
  TrendingUp,
  RotateCcw,
  BookCheck,
  Check,
  Calendar,
  AlertCircle,
  Award,
  Layers,
  Eye,
} from "lucide-react";
import type { Quiz } from "@/types/platform";

interface HomeworkTabProps {
  homework: Quiz[];
  onStartHomework: (quiz: Quiz) => void;
  onReviewHomework?: (quiz: Quiz) => void;
}

export function HomeworkTab({ homework, onStartHomework, onReviewHomework }: HomeworkTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [sortBy, setSortBy] = useState<"latest" | "score">("latest");

  // Statistics
  const totalCount = homework.length;
  const completedCount = homework.filter((hw) => hw.attemptsUsed && hw.attemptsUsed > 0).length;
  const pendingCount = homework.filter((hw) => !hw.attemptsUsed || hw.attemptsUsed === 0).length;

  const averageScore = useMemo(() => {
    const scores = homework
      .map((hw) => hw.bestScore)
      .filter((s): s is number => typeof s === "number" && !isNaN(s));
    if (scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }, [homework]);

  // Filtered list
  const filteredHomework = useMemo(() => {
    return homework
      .filter((hw) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesTitle = hw.title.toLowerCase().includes(q);
          const matchesCategory = hw.category?.toLowerCase().includes(q);
          const matchesLesson = hw.lesson?.toLowerCase().includes(q);
          const matchesUnit = hw.unit?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesCategory && !matchesLesson && !matchesUnit) return false;
        }

        // Status filter
        const isCompleted = (hw.attemptsUsed || 0) > 0;
        if (statusFilter === "pending" && isCompleted) return false;
        if (statusFilter === "completed" && !isCompleted) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "score") {
          return (b.bestScore ?? -1) - (a.bestScore ?? -1);
        }
        return b.id - a.id;
      });
  }, [homework, searchQuery, statusFilter, sortBy]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 w-full animate-in fade-in duration-200" dir="rtl">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
              <BookCheck className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  الواجبات والمهام المنزلية
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-xs font-black">
                  {totalCount} واجب مسند
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                حل الواجبات المنزلية المخصصة لمرحلتك لتثبيت ما تم شرحه والتأكد من فهم جميع الأفكار.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Statistics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-3 sm:p-4 shadow-2xs flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <span className="block text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الواجبات</span>
            <strong className="text-lg sm:text-xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
              {totalCount}
            </strong>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-3 sm:p-4 shadow-2xs flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <span className="block text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">تم تسليمها بنجاح</span>
            <strong className="text-lg sm:text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {completedCount}
            </strong>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-3 sm:p-4 shadow-2xs flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <span className="block text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">واجبات مطلوبة</span>
            <strong className="text-lg sm:text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {pendingCount}
            </strong>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-3 sm:p-4 shadow-2xs flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <span className="block text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">متوسط الدرجات</span>
            <strong className="text-lg sm:text-xl font-black font-mono tabular-nums text-purple-600 dark:text-purple-400">
              {averageScore !== null ? `${averageScore}%` : "—"}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الواجب أو الدرس..."
              className="h-9 w-full rounded-xl border border-slate-200/80 dark:border-[#1E2E48] bg-slate-50/70 dark:bg-[#0F172A] pr-9 pl-3 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-500 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0F172A] rounded-xl border border-slate-200/60 dark:border-[#1E2E48]">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-amber-600 text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              الكل ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              مطلوب ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "completed"
                  ? "bg-amber-600 text-white shadow-xs font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              تم التسليم ({completedCount})
            </button>
          </div>
        </div>
      </div>

      {/* 4. Homework Cards Grid */}
      {filteredHomework.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
          {filteredHomework.map((hw) => {
            const isCompleted = (hw.attemptsUsed || 0) > 0;
            const isLocked = Boolean(hw.locked);
            const questionsCount = hw.questionsToShow && hw.questionsToShow > 0 ? hw.questionsToShow : hw.questions.length;
            const passed = hw.bestScore !== null && hw.bestScore !== undefined && hw.bestScore >= (hw.passingScore || 60);

            return (
              <article
                key={hw.id}
                className={`group relative flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition-all duration-200 overflow-hidden ${
                  isLocked
                    ? "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 opacity-75"
                    : isCompleted
                    ? "border-emerald-300/70 dark:border-emerald-700/60 bg-card dark:bg-[#0A101D] hover:border-emerald-500"
                    : "border-slate-200/90 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] hover:border-amber-500/50"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Status & Questions Count */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                        isLocked
                          ? "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200/80"
                          : isCompleted
                          ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200/80"
                          : "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200/80"
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <Lock className="h-3 w-3" />
                          <span>مغلق</span>
                        </>
                      ) : isCompleted ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>تم التسليم بنجاح ✓</span>
                        </>
                      ) : (
                        <>
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-600" />
                          </span>
                          <span>مطلوب حله 📝</span>
                        </>
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                      <span>{questionsCount} سؤال</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 text-right group-hover:text-amber-600 transition-colors"
                    dir="auto"
                  >
                    {hw.title}
                  </h3>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {hw.unit && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 dark:text-amber-300">
                        <Layers className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{hw.unit}</span>
                      </span>
                    )}
                    {hw.lesson && (
                      <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                        • {hw.lesson}
                      </span>
                    )}
                  </div>

                  {/* Score / Status Details */}
                  {isCompleted && hw.bestScore !== null && hw.bestScore !== undefined && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-300">درجة التسليم:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-300">
                          {hw.bestScore}%
                        </span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          passed
                            ? "bg-emerald-600 text-white"
                            : "bg-rose-500 text-white"
                        }`}>
                          {passed ? "ناجح" : "يحتاج مراجعة"}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isCompleted && !isLocked && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200/60">
                      ⚡ مطلوب تسليم هذا الواجب قبل موعد الحصة القادمة.
                    </div>
                  )}
                </div>

                {/* Card Action Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-[#1E2E48] mt-3">
                  {isLocked ? (
                    <div className="text-center py-1.5 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200">
                      {hw.lockedReason || "الواجب مغلق حالياً"}
                    </div>
                  ) : isCompleted ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => (onReviewHomework ? onReviewHomework(hw) : onStartHomework(hw))}
                        className="flex-1 h-9 rounded-xl text-xs font-black shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>مراجعة الإجابات 👁️</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartHomework(hw)}
                        className="h-9 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                        title="إعادة المحاولة"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">إعادة</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartHomework(hw)}
                      className="w-full h-9 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <BookCheck className="h-4 w-4" />
                      <span>بدء حل الواجب الآن 🚀</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 sm:p-12 text-center space-y-3 bg-card dark:bg-[#0A101D]">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mx-auto">
            <BookCheck className="h-7 w-7" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {searchQuery || statusFilter !== "all" ? "لا توجد واجبات تطابق البحث" : "لا توجد واجبات مسندة حالياً 📚"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery || statusFilter !== "all"
              ? "جرّب تغيير كلمات البحث أو إعادة ضبط خيارات التصفية لعرض الواجبات."
              : "ستظهر هنا جميع الواجبات والمهام المنزلية فور نشرها من قبل المعلم لمرحلتك الدراسية."}
          </p>
        </div>
      )}
    </div>
  );
}
