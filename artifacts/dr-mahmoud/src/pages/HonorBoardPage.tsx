import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Crown,
  MapPin,
  Medal,
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
  avg_score: number;
  first_try_avg?: number;
  avg_time_seconds?: number | null;
  total_attempts_used?: number;
  first_try_mastered_count?: number;
  last_quiz_date: string;
  overall_grade: string;
  track_rank: number;
  overall_rank: number;
  quizzes_details: QuizDetail[];
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

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-700 dark:text-amber-300 font-black text-xs">
          <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>المركز الأول</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-500/15 border border-slate-400/35 text-slate-700 dark:text-slate-200 font-black text-xs">
          <Medal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
          <span>المركز الثاني</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/15 border border-orange-500/35 text-orange-800 dark:text-orange-300 font-black text-xs">
          <Medal className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          <span>المركز الثالث</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center min-w-8 h-7 px-2 rounded-lg bg-muted text-foreground font-mono font-black text-xs border border-border">
        #{rank}
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

      {/* Hero & Track Switcher (Flat Crisp Surface — Zero Gradients) */}
      <section className="bg-card border-b border-border py-8 sm:py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-700 dark:text-blue-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>الترتيب العادل: الدرجة الأعلى · دقة أول محاولة · سرعة الإنجاز</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
              لوحة شرف أوائل الاختبارات
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
              يُرتّب الأوائل تلقائياً فور تسليم كل اختبار بناءً على أعلى درجة، التفوق من المحاولة الأولى، وأسرع وقت حل فعلي لتمييز المجتهدين بدقة.
            </p>
          </div>

          {/* Segmented Track Switcher */}
          <div className="flex items-center justify-center pt-1">
            <div className="inline-flex p-1 rounded-2xl bg-muted border border-border">
              <button
                type="button"
                onClick={() => setActiveTrack("general")}
                className={`px-6 sm:px-8 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-colors cursor-pointer ${
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
                className={`px-6 sm:px-8 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-colors cursor-pointer ${
                  activeTrack === "languages"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                قسم اللغات (Languages)
              </button>
            </div>
          </div>

          {/* Per-Exam Filter Pills */}
          {availableExams.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedQuizId("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  selectedQuizId === "all"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                الترتيب العام ({availableExams.length} {availableExams.length === 1 ? "امتحان" : "امتحانات"})
              </button>
              {availableExams.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setSelectedQuizId(String(ex.id))}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer max-w-[260px] truncate ${
                    selectedQuizId === String(ex.id)
                      ? "bg-amber-500 text-slate-950 border-amber-500 font-black"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                  title={ex.title}
                >
                  {ex.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Leaderboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Search & Criteria Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs sm:text-sm font-bold text-muted-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary shrink-0" />
            <span>
              أوائل{" "}
              <strong className="text-foreground">
                {activeTrack === "general" ? "المدارس العربي (عام)" : "مدارس اللغات (Languages)"}
              </strong>
              {students.length > 0 ? ` — ${students.length} طالب متفوق` : ""}
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث باسم الطالب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-card border border-border text-xs sm:text-sm font-semibold placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse border border-border" />
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
                : "أول ما ينزل امتحان النهارده ويبدأ الطلاب يسلموا إجاباتهم، هيظهر ترتيب الأوائل هنا تلقائياً حسب الدرجة، دقة أول محاولة، وسرعة الحل."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {students.map((student) => {
              const rank = Number(student.track_rank);
              const avgScore = Number(student.avg_score || 0);
              const firstTryAvg = Number(student.first_try_avg ?? avgScore);
              const isFirstTryAce = firstTryAvg >= avgScore && (student.first_try_mastered_count || 0) >= student.quizzes_taken;
              const timeLabel = formatDurationArabic(student.avg_time_seconds);
              const isTop3 = rank <= 3;

              return (
                <article
                  key={student.student_id}
                  className={`rounded-2xl border bg-card p-5 flex flex-col justify-between gap-4 transition-colors shadow-2xs ${
                    rank === 1
                      ? "border-amber-500/60"
                      : isTop3
                        ? "border-blue-500/40"
                        : "border-border hover:border-blue-500/40"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row: Rank + Score Pill */}
                    <div className="flex items-center justify-between gap-2">
                      {renderRankBadge(rank)}
                      <span
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 font-mono text-sm font-black border ${
                          avgScore >= 95
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : avgScore >= 85
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              : "bg-muted text-foreground border-border"
                        }`}
                      >
                        {avgScore}%
                      </span>
                    </div>

                    {/* Student Identity: Photo + Name + Center */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {renderAvatar(student, "w-14 h-14 text-lg")}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h2
                          className="text-base font-black text-foreground truncate"
                          title={student.student_name}
                        >
                          {student.student_name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                          <span className="text-blue-600 dark:text-blue-400">{student.overall_grade}</span>
                          {student.center_name && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {formatCenterName(student.center_name)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Distinction Metrics Strip (Shows WHY this student ranked higher!) */}
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/45 border border-border p-2.5 text-center">
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold text-muted-foreground">أول محاولة</span>
                        <strong className="block text-xs font-mono font-black text-foreground">
                          {firstTryAvg}%
                        </strong>
                      </div>
                      <div className="space-y-0.5 border-x border-border px-1">
                        <span className="block text-[10px] font-bold text-muted-foreground">متوسط الزمن</span>
                        <strong className="block text-xs font-black text-foreground truncate">
                          {timeLabel || "—"}
                        </strong>
                      </div>
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold text-muted-foreground">الامتحانات</span>
                        <strong className="block text-xs font-mono font-black text-foreground">
                          {student.quizzes_taken}
                        </strong>
                      </div>
                    </div>

                    {/* Distinction Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {avgScore === 100 && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300">
                          <Award className="w-3 h-3" />
                          <span>علامة كاملة</span>
                        </span>
                      )}
                      {isFirstTryAce && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 dark:text-amber-300">
                          <Zap className="w-3 h-3" />
                          <span>تفوق من أول محاولة</span>
                        </span>
                      )}
                      {timeLabel && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 dark:text-blue-300">
                          <Clock className="w-3 h-3" />
                          <span>حل في {timeLabel}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForModal(student)}
                    className="w-full py-2.5 px-3 rounded-xl bg-muted hover:bg-muted/75 border border-border text-foreground font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <span>تفاصيل درجات الامتحانات ({student.quizzes_details.length})</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}
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
                    المركز #{selectedStudentForModal.track_rank} · متوسط{" "}
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
          يُحتسب الترتيب آلياً للاختبارات الجديدة وفقاً لأعلى درجة، دقة أول محاولة، وأسرع زمن حل فعلي.
        </p>
      </footer>
    </div>
  );
}
