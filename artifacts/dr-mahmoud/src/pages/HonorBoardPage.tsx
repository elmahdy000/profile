import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Award,
  BookOpen,
  ChevronDown,
  Clock,
  Crown,
  MapPin,
  Medal,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface QuizDetail {
  quiz_id: number;
  quiz_title: string;
  quiz_stage?: string;
  score: number;
  best_score?: number;
  first_attempt_score?: number;
  time_seconds?: number | null;
  attempts_count?: number;
  passed: boolean;
  date: string;
  grade_label: string;
}

interface HonorExamOption {
  id: number;
  title: string;
  stage?: string | null;
  created_at: string;
}

interface RankedStudent {
  student_id: number;
  student_name: string;
  grade: string;
  learning_mode?: string;
  center_name?: string;
  avatar_url?: string | null;
  track_group: "general" | "languages";
  quizzes_taken: number;
  total_points?: number;
  avg_score: number;
  first_try_avg?: number;
  best_avg_score?: number;
  avg_time_seconds?: number | null;
  total_attempts_used?: number;
  first_try_mastered_count?: number;
  last_quiz_date: string;
  overall_grade: string;
  track_rank: number;
  track_tie_order?: number;
  track_tie_count?: number;
  overall_rank: number;
  quizzes_details: QuizDetail[];
}

function formatRankLabel(rank: number, isRepeated = false): string {
  const suffix = isRepeated ? " مكرر" : "";
  if (rank === 1) return `المركز الأول${suffix}`;
  if (rank === 2) return `المركز الثاني${suffix}`;
  if (rank === 3) return `المركز الثالث${suffix}`;
  return `المركز #${rank}${suffix}`;
}

function formatDurationArabic(seconds?: number | null): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) return `${secs} ث`;
  if (secs === 0) return `${mins} د`;
  return `${mins} د و ${secs} ث`;
}

function formatCenterName(centerName?: string | null): string {
  if (!centerName) return "";
  return centerName
    .replace(/\s*-\s*عربي/gi, "")
    .replace(/\s*-\s*لغات/gi, "")
    .replace(/\s*-\s*arabic/gi, "")
    .replace(/\s*-\s*languages/gi, "")
    .trim();
}

export default function HonorBoardPage() {
  const [activeTrack, setActiveTrack] = useState<"general" | "languages">("general");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<RankedStudent[]>([]);
  const [availableExams, setAvailableExams] = useState<HonorExamOption[]>([]);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<RankedStudent | null>(null);
  const [brokenAvatarIds, setBrokenAvatarIds] = useState<Set<number>>(() => new Set());

  const markAvatarBroken = useCallback((id: number) => {
    setBrokenAvatarIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    document.title = "لوحة الشرف والتميز | د. محمود المهدي";
  }, []);

  // Reset exam filter when switching tracks so we don't filter by another track's quiz
  useEffect(() => {
    setSelectedQuizId("all");
  }, [activeTrack]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("track", activeTrack);
        if (selectedQuizId !== "all") queryParams.set("quiz_id", selectedQuizId);
        if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());

        const res = await fetch(`/api/learning/honor-board?${queryParams.toString()}`);
        if (!res.ok) throw new Error("تعذر تحميل بيانات لوحة الشرف");
        const data = await res.json();
        if (isMounted) {
          setStudents(Array.isArray(data.students) ? data.students : []);
          setAvailableExams(Array.isArray(data.exams) ? data.exams : []);
        }
      } catch (err) {
        if (isMounted) setError((err as Error).message || "حدث خطأ أثناء جلب البيانات");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(fetchData, 180);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeTrack, selectedQuizId, searchQuery]);

  const renderRankBadge = (rank: number, isRepeated = false) => {
    const label = formatRankLabel(rank, isRepeated);
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-700 dark:text-amber-300 font-black text-xs">
          <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{label}</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-500/15 border border-slate-400/35 text-slate-700 dark:text-slate-200 font-black text-xs">
          <Medal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
          <span>{label}</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/15 border border-orange-500/35 text-orange-800 dark:text-orange-300 font-black text-xs">
          <Medal className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center min-w-8 h-7 px-2.5 rounded-lg bg-muted text-foreground font-mono font-black text-xs border border-border">
        #{rank}{isRepeated ? " مكرر" : ""}
      </span>
    );
  };

  const renderAvatar = (student: RankedStudent, sizeClass = "w-16 h-16 text-xl") => {
    const hasValidPhoto = Boolean(
      student.avatar_url &&
        student.avatar_url.trim() &&
        student.avatar_url !== "null" &&
        !brokenAvatarIds.has(student.student_id),
    );
    if (hasValidPhoto) {
      return (
        <img
          src={student.avatar_url!}
          alt={student.student_name}
          loading="lazy"
          decoding="async"
          onError={() => markAvatarBroken(student.student_id)}
          className={`${sizeClass} rounded-2xl object-cover border-2 border-border shrink-0`}
        />
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 font-black grid place-items-center shrink-0`}
      >
        {student.student_name?.trim()?.charAt(0) || "ط"}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* Top Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/platform"
              className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 border border-border px-3 py-1.5 rounded-xl transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>بوابة الطالب</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 font-black text-sm sm:text-base">
              <Trophy className="w-4.5 h-4.5 text-amber-500" />
              <span>لوحة الشرف والتميز</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="text-xs font-bold text-muted-foreground hover:text-foreground hidden sm:inline-block transition-colors"
            >
              الرئيسية
            </Link>
            <ThemeToggle className="relative static bottom-0 left-0" />
          </div>
        </div>
      </header>

      {/* Hero & Track Switcher (Crisp, Compact, Readable) */}
      <section className="bg-card border-b border-border py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-[11px] sm:text-xs font-bold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>الترتيب العادل: مجموع درجات أول محاولة · الأول والأول مكرر · سرعة الإنجاز</span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              لوحة شرف أوائل الاختبارات
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
              يُحتسب الترتيب العام بمجموع درجات أول محاولة عبر جميع اختبارات القسم حتى يتقدم من أتمّ كل الامتحانات، ويتشارك أصحاب المجموع الواحد نفس المركز (الأول، الأول مكرر...).
            </p>
          </div>

          {/* Segmented Track Switcher */}
          <div className="flex items-center justify-center pt-1">
            <div className="inline-flex p-1 rounded-2xl bg-muted border border-border">
              <button
                type="button"
                onClick={() => setActiveTrack("general")}
                className={`px-6 sm:px-8 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  activeTrack === "general"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                قسم العام (عربي)
              </button>
              <button
                type="button"
                onClick={() => setActiveTrack("languages")}
                className={`px-6 sm:px-8 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  activeTrack === "languages"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                قسم اللغات (Languages)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Leaderboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Clean Unified Control Bar (Full Exam Title Selector + Search) */}
        <div className="bg-card border border-border rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            {/* Full-Width Exam Selector (No Truncated Exam Titles!) */}
            <div className="lg:col-span-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <select
                  aria-label="تصفية حسب الاختبار"
                  value={selectedQuizId}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                  className="w-full appearance-none pl-9 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">
                    الترتيب العام — جميع الاختبارات ({availableExams.length} {availableExams.length === 1 ? "امتحان" : "امتحانات"})
                  </option>
                  {availableExams.map((ex) => (
                    <option key={ex.id} value={String(ex.id)}>
                      {ex.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {selectedQuizId !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedQuizId("all")}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-xs font-bold text-foreground shrink-0 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>الترتيب العام</span>
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="lg:col-span-5 relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث باسم الطالب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-background border border-border text-xs sm:text-sm font-semibold placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="مسح البحث"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-muted text-muted-foreground grid place-items-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Context Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/70 text-xs font-bold text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="leading-relaxed">
                أوائل{" "}
                <strong className="text-foreground">
                  {activeTrack === "general" ? "المدارس العربي (عام)" : "مدارس اللغات (Languages)"}
                </strong>
                {selectedQuizId !== "all" && (
                  <>
                    {" · "}
                    <span className="text-blue-600 dark:text-blue-400">
                      {availableExams.find((e) => String(e.id) === selectedQuizId)?.title || "امتحان محدد"}
                    </span>
                  </>
                )}
              </span>
            </div>

            {students.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-lg bg-muted text-foreground font-mono text-[11px]">
                {students.length} {students.length === 1 ? "طالب" : "طالب متفوق"}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-60 rounded-2xl bg-muted animate-pulse border border-border" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 text-center text-destructive max-w-lg mx-auto">
            <p className="font-bold mb-1">تعذر تحميل لوحة الشرف</p>
            <p className="text-xs">{error}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 sm:p-16 text-center shadow-2xs max-w-lg mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 grid place-items-center mx-auto">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-foreground">
              {searchQuery.trim()
                ? "مفيش طالب مطابق للاسم ده"
                : "لوحة الشرف جاهزة لأول امتحان النهارده"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {searchQuery.trim()
                ? "جرّب تكتب الاسم بشكل مختلف أو امسح البحث."
                : "أول ما ينزل امتحان النهارده ويبدأ الطلاب يسلموا إجاباتهم، هيظهر ترتيب الأوائل هنا تلقائياً حسب درجة أول محاولة وسرعة الحل."}
            </p>
          </div>
        ) : (() => {
          const isSearching = Boolean(searchQuery.trim());
          const isOverallMultiExam = selectedQuizId === "all" && availableExams.length > 1;
          const maxPossiblePoints = Math.max(100, availableExams.length * 100);
          const podiumStudents = isSearching
            ? []
            : students.filter((s) => Number(s.track_rank) <= 3);
          const remainingStudents = isSearching
            ? students
            : students.filter((s) => Number(s.track_rank) > 3);

          const renderPodiumCard = (student: RankedStudent) => {
            const rank = Number(student.track_rank);
            const isRepeated = Number(student.track_tie_order ?? 1) > 1;
            const avgScore = Number(student.first_try_avg ?? student.avg_score ?? 0);
            const firstTryAvg = Number(student.first_try_avg ?? avgScore);
            const bestAvgScore = Number(student.best_avg_score ?? avgScore);
            const totalPoints = Number(student.total_points ?? firstTryAvg * student.quizzes_taken);
            const completedAll = isOverallMultiExam && student.quizzes_taken >= availableExams.length;
            const isFirstTryAce =
              firstTryAvg >= bestAvgScore &&
              (student.first_try_mastered_count || 0) >= student.quizzes_taken;
            const timeLabel = formatDurationArabic(student.avg_time_seconds);

            const accentTopClass =
              rank === 1
                ? "border-t-4 border-t-amber-500 border-amber-500/45"
                : rank === 2
                  ? "border-t-4 border-t-slate-400 border-slate-400/45"
                  : "border-t-4 border-t-orange-500 border-orange-500/45";

            return (
              <article
                key={student.student_id}
                className={`rounded-2xl border bg-card p-5 flex flex-col justify-between gap-4 transition-colors shadow-2xs ${accentTopClass}`}
              >
                <div className="space-y-4">
                  {/* Top Row: Rank Badge + Cumulative Points (General) or % (Single Exam) */}
                  <div className="flex items-center justify-between gap-2">
                    {renderRankBadge(rank, isRepeated)}
                    <div
                      className={`inline-flex items-baseline gap-1 rounded-xl px-3 py-1 font-mono font-black border ${
                        avgScore >= 95
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : avgScore >= 85
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                            : "bg-muted text-foreground border-border"
                      }`}
                    >
                      {isOverallMultiExam ? (
                        <>
                          <span className="text-base">{Number(totalPoints.toFixed(1))}</span>
                          <span className="text-[11px] opacity-75">/ {maxPossiblePoints}</span>
                        </>
                      ) : (
                        <span className="text-base">{avgScore}%</span>
                      )}
                    </div>
                  </div>

                  {/* Student Identity: Photo + Full Name + Grade + Center */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    {renderAvatar(student, "w-14 h-14 text-lg")}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h2
                        className="text-[15px] sm:text-base font-black text-foreground leading-snug line-clamp-2"
                        title={student.student_name}
                      >
                        {student.student_name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold text-muted-foreground">
                        <span className="text-blue-600 dark:text-blue-400">{student.overall_grade}</span>
                        {student.center_name && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{formatCenterName(student.center_name)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Clean 3-Metric Strip */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/45 border border-border p-2.5 text-center">
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-bold text-muted-foreground">أول محاولة</span>
                      <strong className="block text-xs font-mono font-black text-foreground">
                        {firstTryAvg}%
                      </strong>
                    </div>
                    <div className="space-y-0.5 border-x border-border px-1">
                      <span className="block text-[10px] font-bold text-muted-foreground">الزمن</span>
                      <strong className="block text-xs font-black text-foreground truncate">
                        {timeLabel || "—"}
                      </strong>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-bold text-muted-foreground">الامتحانات</span>
                      <strong className="block text-xs font-mono font-black text-foreground">
                        {isOverallMultiExam
                          ? `${student.quizzes_taken}/${availableExams.length}`
                          : student.quizzes_taken}
                      </strong>
                    </div>
                  </div>

                  {/* Non-redundant Distinction Tags */}
                  {(completedAll || firstTryAvg === 100 || isFirstTryAce || bestAvgScore > firstTryAvg) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {completedAll && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 border border-blue-500/25 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-700 dark:text-blue-300">
                          <span>أتمّ جميع الاختبارات</span>
                        </span>
                      )}
                      {firstTryAvg === 100 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300">
                          <Award className="w-3 h-3" />
                          <span>علامة كاملة</span>
                        </span>
                      )}
                      {isFirstTryAce && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-700 dark:text-amber-300">
                          <Zap className="w-3 h-3" />
                          <span>تفوق من أول محاولة</span>
                        </span>
                      )}
                      {bestAvgScore > firstTryAvg && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-muted border border-border px-2.5 py-0.5 text-[10.5px] font-bold text-muted-foreground">
                          <span>تحسين بالإعادة: {bestAvgScore}%</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStudentForModal(student)}
                  className="w-full py-2.5 px-3 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>تفاصيل درجات الامتحانات ({student.quizzes_details.length})</span>
                </button>
              </article>
            );
          };

          return (
            <div className="space-y-8">
              {/* Top 3 Podium Section */}
              {podiumStudents.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-black text-foreground">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span>منصة الأوائل (المراكز الثلاثة الأولى)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {podiumStudents.map(renderPodiumCard)}
                  </div>
                </section>
              )}

              {/* Remaining Honor Roll (Crisp Scannable Rows for Ranks 4+ or Search Results) */}
              {remainingStudents.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-black text-foreground">
                      <Trophy className="w-4 h-4 text-blue-500" />
                      <span>
                        {isSearching
                          ? `نتائج البحث (${remainingStudents.length})`
                          : `قائمة الشرف (${remainingStudents.length} طالب)`}
                      </span>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs divide-y divide-border">
                    {remainingStudents.map((student) => {
                      const rank = Number(student.track_rank);
                      const isRepeated = Number(student.track_tie_order ?? 1) > 1;
                      const avgScore = Number(student.first_try_avg ?? student.avg_score ?? 0);
                      const bestAvgScore = Number(student.best_avg_score ?? avgScore);
                      const totalPoints = Number(student.total_points ?? avgScore * student.quizzes_taken);
                      const timeLabel = formatDurationArabic(student.avg_time_seconds);

                      return (
                        <div
                          key={student.student_id}
                          className="p-3.5 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/35 transition-colors"
                        >
                          {/* Rank + Avatar + Name */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="shrink-0">{renderRankBadge(rank, isRepeated)}</div>
                            {renderAvatar(student, "w-10 h-10 text-sm")}
                            <div className="min-w-0 flex-1">
                              <div className="font-black text-sm text-foreground leading-snug truncate">
                                {student.student_name}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold text-muted-foreground">
                                <span className="text-blue-600 dark:text-blue-400">{student.overall_grade}</span>
                                {student.center_name && (
                                  <span className="inline-flex items-center gap-1">
                                    <span>•</span>
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span>{formatCenterName(student.center_name)}</span>
                                  </span>
                                )}
                                {bestAvgScore > avgScore && (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    • تحسين بالإعادة: {bestAvgScore}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Metrics + Action */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground font-bold">
                              <span>
                                {isOverallMultiExam
                                  ? `${student.quizzes_taken}/${availableExams.length} امتحان (${avgScore}%)`
                                  : `${student.quizzes_taken} امتحان`}
                              </span>
                              {timeLabel && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {timeLabel}
                                </span>
                              )}
                            </div>

                            <span
                              className={`inline-flex items-baseline gap-0.5 rounded-xl px-2.5 py-1 font-mono text-xs sm:text-sm font-black border ${
                                avgScore >= 95
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : avgScore >= 85
                                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                    : "bg-muted text-foreground border-border"
                              }`}
                            >
                              {isOverallMultiExam ? (
                                <>
                                  <span>{Number(totalPoints.toFixed(1))}</span>
                                  <span className="text-[10px] opacity-75">/{maxPossiblePoints}</span>
                                </>
                              ) : (
                                `${avgScore}%`
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() => setSelectedStudentForModal(student)}
                              className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground font-bold text-xs cursor-pointer transition-colors"
                            >
                              التفاصيل
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          );
        })()}
      </main>

      {/* Student Exam Details Modal */}
      {selectedStudentForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setSelectedStudentForModal(null)}
        >
          <div
            className="bg-card text-foreground w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-3 min-w-0">
                {renderAvatar(selectedStudentForModal, "w-11 h-11 text-sm")}
                <div className="min-w-0">
                  <h3 className="font-black text-sm sm:text-base text-foreground truncate">
                    {selectedStudentForModal.student_name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatRankLabel(
                      Number(selectedStudentForModal.track_rank),
                      Number(selectedStudentForModal.track_tie_order ?? 1) > 1,
                    )}{" "}
                    · متوسط{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {selectedStudentForModal.avg_score}%
                    </strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="w-8 h-8 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground grid place-items-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1">
              {selectedStudentForModal.quizzes_details.map((q, idx) => {
                const qTime = formatDurationArabic(q.time_seconds);
                return (
                  <div
                    key={`${q.quiz_id}-${idx}`}
                    className="p-3 rounded-xl bg-muted/35 border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="font-extrabold text-foreground truncate">{q.quiz_title}</div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>أول محاولة: {q.first_attempt_score ?? q.score}%</span>
                        {q.best_score != null && q.best_score > (q.first_attempt_score ?? q.score) && (
                          <span className="text-emerald-600 dark:text-emerald-400">· تحسين بالإعادة: {q.best_score}%</span>
                        )}
                        {qTime && <span>· الزمن: {qTime}</span>}
                        {q.attempts_count && <span>· المحاولات: {q.attempts_count}</span>}
                      </div>
                    </div>

                    <span
                      className={`font-mono font-black text-xs px-2.5 py-1 rounded-lg shrink-0 ${
                        q.score >= 85
                          ? "bg-emerald-600 text-white"
                          : q.score >= 65
                            ? "bg-blue-600 text-white"
                            : "bg-slate-600 text-white"
                      }`}
                    >
                      {q.score}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 border-t border-border bg-muted/30 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-border bg-card py-6 mt-12 text-center text-xs text-muted-foreground">
        <p className="font-bold text-foreground">منصة د. محمود المهدي</p>
        <p className="text-[11px] mt-1">
          يُحتسب الترتيب آلياً للاختبارات الجديدة: الأول، الأول مكرر لأصحاب النسبة نفسها، مع مراعاة دقة أول محاولة وسرعة الحل.
        </p>
      </footer>
    </div>
  );
}
