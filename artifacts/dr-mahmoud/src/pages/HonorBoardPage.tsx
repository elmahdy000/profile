import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Medal,
  Search,
  Sparkles,
  TrendingUp,
  User,
  Users,
  ArrowRight,
  Filter,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface QuizDetail {
  quiz_id: number;
  quiz_title: string;
  quiz_stage?: string;
  score: number;
  passed: boolean;
  date: string;
  grade_label: string;
}

interface RankedStudent {
  student_id: number;
  student_name: string;
  grade: string;
  learning_mode?: string;
  center_name?: string;
  avatar_url?: string;
  track_group: "general" | "languages";
  quizzes_taken: number;
  avg_score: number;
  last_quiz_date: string;
  overall_grade: string;
  rank: number;
  track_rank: number;
  overall_rank: number;
  quizzes_details: QuizDetail[];
}

interface HonorBoardStats {
  totalStudents: number;
  generalStudents: number;
  languagesStudents: number;
  totalAttempts: number;
  overallAvgScore: number;
}

export default function HonorBoardPage() {
  const [activeTrack, setActiveTrack] = useState<"all" | "general" | "languages">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minQuizzes, setMinQuizzes] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<RankedStudent[]>([]);
  const [stats, setStats] = useState<HonorBoardStats>({
    totalStudents: 0,
    generalStudents: 0,
    languagesStudents: 0,
    totalAttempts: 0,
    overallAvgScore: 0,
  });
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);

  useEffect(() => {
    document.title = "لوحة الشرف | د. محمود المهدي";
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const queryParams = new URLSearchParams();
        if (activeTrack !== "all") queryParams.set("track", activeTrack);
        if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());

        const res = await fetch(`/api/learning/honor-board?${queryParams.toString()}`);
        if (!res.ok) throw new Error("تعذر تحميل بيانات لوحة الشرف");
        const data = await res.json();
        if (isMounted) {
          setStudents(data.students || []);
          if (data.stats) setStats(data.stats);
        }
      } catch (err) {
        if (isMounted) setError((err as Error).message || "حدث خطأ أثناء جلب البيانات");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(fetchData, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeTrack, searchQuery]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => s.quizzes_taken >= minQuizzes);
  }, [students, minQuizzes]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold text-sm shadow-xs">
          <Medal className="w-4 h-4 text-amber-500" />
          <span>المركز الأول</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold text-sm shadow-xs">
          <Medal className="w-4 h-4 text-slate-400" />
          <span>المركز الثاني</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/10 border border-amber-700/20 text-amber-900 font-bold text-sm shadow-xs">
          <Medal className="w-4 h-4 text-amber-700" />
          <span>المركز الثالث</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm border border-slate-200">
        #{rank}
      </div>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 85) return "text-blue-700 bg-blue-50 border-blue-200";
    if (score >= 75) return "text-indigo-700 bg-indigo-50 border-indigo-200";
    if (score >= 65) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-slate-700 bg-slate-50 border-slate-200";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 95) return "bg-emerald-600 text-white";
    if (score >= 85) return "bg-blue-600 text-white";
    if (score >= 75) return "bg-indigo-600 text-white";
    return "bg-slate-600 text-white";
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-slate-900 selection:text-white" dir="rtl">
      {/* Top Professional Academic Header */}
      <header className="border-b border-slate-200/80 bg-white shadow-xs sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/platform"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للمنصة</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
              <Award className="w-5 h-5 text-slate-700" />
              <span>لوحة الشرف والتميز الأكاديمي</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-medium text-slate-500 hover:text-slate-800 hidden sm:inline-block transition-colors"
            >
              الصفحة الرئيسية
            </Link>
            <ThemeToggle className="relative static bottom-0 left-0" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-[#F8FAFC] border-b border-slate-200/60 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold mb-4">
            <GraduationCap className="w-4 h-4 text-slate-600" />
            <span>نظام التقييم والترتيب التلقائي المعتمد</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            لوحة الشرف والتميز الأكاديمي
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            تكريم وترتيب الطلاب المتميزين وفقاً لمتوسط الدرجات المحققة في جميع الاختبارات والواجبات المنجزة على المنصة.
          </p>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mt-8">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalStudents}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">إجمالي المتفوقين</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.generalStudents}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">طلاب المدارس العام (عربي)</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.languagesStudents}</div>
              <div className="text-xs text-slate-500 font-medium mt-1">طلاب مدارس اللغات</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{stats.overallAvgScore}%</div>
              <div className="text-xs text-slate-500 font-medium mt-1">متوسط درجات الطلاب العام</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Track Partitioning Segmented Tabs (عام ولغات) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="inline-flex p-1 rounded-xl bg-slate-200/70 border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setActiveTrack("all")}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTrack === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الترتيب العام ({stats.totalStudents})
            </button>
            <button
              onClick={() => setActiveTrack("general")}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTrack === "general"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              قسم العام / عربي ({stats.generalStudents})
            </button>
            <button
              onClick={() => setActiveTrack("languages")}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTrack === "languages"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              قسم اللغات / Languages ({stats.languagesStudents})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم الطالب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-2 rounded-xl bg-white border border-slate-200 text-sm placeholder:text-slate-400 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-xs"
            />
          </div>
        </div>

        {/* Optional Min Quizzes Filter Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-6 bg-white px-4 py-2.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">تصفية حسب عدد الاختبارات المنجزة:</span>
            <div className="flex items-center gap-1 mr-2">
              {[1, 3, 5, 8].map((num) => (
                <button
                  key={num}
                  onClick={() => setMinQuizzes(num)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    minQuizzes === num
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {num}+ اختبار
                </button>
              ))}
            </div>
          </div>

          <div>
            <span>المعروض: </span>
            <strong className="text-slate-800">{filteredStudents.length} طالب</strong>
          </div>
        </div>

        {/* Content State: Loading / Error / List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-3 border-slate-300 border-t-slate-800 rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-500">جاري جلب ترتيب لوحة الشرف المحدثة...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800">
            <p className="font-bold mb-1">حدث خطأ</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد نتائج مطابقة</h3>
            <p className="text-xs text-slate-500">جرب تغيير شروط البحث أو اختيار قسم دراسي آخر.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((student) => {
              const currentRank = activeTrack === "all" ? student.overall_rank : student.track_rank;
              const isExpanded = expandedStudentId === student.student_id;
              const isTop3 = currentRank <= 3;

              return (
                /* Pure White Card with Distinct Elevation Shadow */
                <article
                  key={student.student_id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.11)] transition-all duration-300 overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Right: Student Identity */}
                      <div className="flex items-center gap-3.5">
                        {/* Rank Badge */}
                        <div className="shrink-0">{getRankBadge(currentRank)}</div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                              {student.student_name}
                            </h2>

                            {/* Track Badge */}
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                                student.track_group === "languages"
                                  ? "bg-sky-50 text-sky-800 border-sky-200"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                              }`}
                            >
                              {student.track_group === "languages" ? "لغات · Languages" : "عربي · عام"}
                            </span>

                            {/* Center Name if present */}
                            {student.center_name && (
                              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {student.center_name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                              <span>{student.quizzes_taken} اختبارات منجزة</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>آخر اختبار: {String(student.last_quiz_date || "").substring(0, 10)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Left: Prominent Average Score Card Indicator */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-left">
                          <div className="text-xs text-slate-500 font-semibold mb-0.5">متوسط الدرجات</div>
                          <span
                            className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md border ${getScoreColor(
                              student.avg_score,
                            )}`}
                          >
                            {student.overall_grade}
                          </span>
                        </div>

                        <div
                          className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-black text-lg sm:text-xl shadow-xs border ${
                            student.avg_score >= 95
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20"
                              : student.avg_score >= 85
                              ? "bg-blue-600 text-white border-blue-500 shadow-blue-600/20"
                              : "bg-slate-800 text-white border-slate-700"
                          }`}
                        >
                          {student.avg_score}%
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-slate-100 my-4" />

                    {/* Solved Exams Preview Header */}
                    <div className="flex items-center justify-between text-xs mb-2.5">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>سجل درجات الاختبارات المؤداة:</span>
                      </span>

                      {student.quizzes_details.length > 3 && (
                        <button
                          onClick={() => setExpandedStudentId(isExpanded ? null : student.student_id)}
                          className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? "طي السجل" : `عرض باقي الاختبارات (${student.quizzes_details.length - 3})`}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Exams Chips Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {(isExpanded ? student.quizzes_details : student.quizzes_details.slice(0, 3)).map((quiz, qIdx) => (
                        <div
                          key={`${quiz.quiz_id}-${qIdx}`}
                          className="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/90 border border-slate-100 rounded-xl px-3 py-2 text-xs transition-colors"
                        >
                          <div className="truncate pl-2">
                            <div className="font-semibold text-slate-800 truncate" title={quiz.quiz_title}>
                              {quiz.quiz_title}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {String(quiz.date || "").substring(0, 10)}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            <span className="font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                              {quiz.score}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Note */}
      <footer className="border-t border-slate-200/80 bg-white py-8 mt-16 text-center text-xs text-slate-500">
        <p className="font-medium">منصة د. محمود المهدي للتعليم الإلكتروني والتميز الأكاديمي</p>
        <p className="text-[11px] text-slate-400 mt-1">يتم تحديث الترتيب ولوحة الشرف آلياً فور انتهاء الطالب من الاختبار.</p>
      </footer>
    </div>
  );
}
