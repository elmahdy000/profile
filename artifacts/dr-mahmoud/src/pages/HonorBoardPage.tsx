import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Medal,
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
  X,
  SlidersHorizontal,
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

export default function HonorBoardPage() {
  // Default to General (عربي) as primary track, with clean toggle to Languages
  const [activeTrack, setActiveTrack] = useState<"general" | "languages">("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<RankedStudent[]>([]);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<RankedStudent | null>(null);

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
        queryParams.set("track", activeTrack);
        if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());

        const res = await fetch(`/api/learning/honor-board?${queryParams.toString()}`);
        if (!res.ok) throw new Error("تعذر تحميل بيانات لوحة الشرف");
        const data = await res.json();
        if (isMounted) {
          setStudents(data.students || []);
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

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs shadow-xs">
          <Medal className="w-3.5 h-3.5 text-amber-600" />
          <span>المركز الأول</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs shadow-xs">
          <Medal className="w-3.5 h-3.5 text-slate-500" />
          <span>المركز الثاني</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/10 border border-amber-800/30 text-amber-950 font-bold text-xs shadow-xs">
          <Medal className="w-3.5 h-3.5 text-amber-800" />
          <span>المركز الثالث</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
        #{rank}
      </div>
    );
  };

  const getScoreTheme = (score: number) => {
    if (score >= 95) {
      return {
        badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
        ring: "text-emerald-600 border-emerald-500 bg-emerald-50/50 shadow-emerald-500/10",
        text: "text-emerald-700",
      };
    }
    if (score >= 85) {
      return {
        badge: "bg-blue-50 text-blue-800 border-blue-200",
        ring: "text-blue-600 border-blue-500 bg-blue-50/50 shadow-blue-500/10",
        text: "text-blue-700",
      };
    }
    if (score >= 75) {
      return {
        badge: "bg-indigo-50 text-indigo-800 border-indigo-200",
        ring: "text-indigo-600 border-indigo-500 bg-indigo-50/50 shadow-indigo-500/10",
        text: "text-indigo-700",
      };
    }
    return {
      badge: "bg-slate-100 text-slate-800 border-slate-200",
      ring: "text-slate-700 border-slate-400 bg-slate-50",
      text: "text-slate-700",
    };
  };

  const formatCenterName = (centerName?: string | null) => {
    if (!centerName) return "";
    return centerName
      .replace(/\s*-\s*عربي/gi, "")
      .replace(/\s*-\s*لغات/gi, "")
      .replace(/\s*-\s*arabic/gi, "")
      .replace(/\s*-\s*languages/gi, "")
      .trim();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-slate-900 selection:text-white" dir="rtl">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/platform"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للمنصة</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
              <Award className="w-5 h-5 text-slate-800" />
              <span>لوحة الشرف</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 hidden sm:inline-block transition-colors"
            >
              الصفحة الرئيسية
            </Link>
            <ThemeToggle className="relative static bottom-0 left-0" />
          </div>
        </div>
      </header>

      {/* Hero Section Without Total Counts */}
      <section className="bg-gradient-to-b from-white to-[#F8FAFC] border-b border-slate-200/60 pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold mb-4">
            <GraduationCap className="w-4 h-4 text-slate-700" />
            <span>ترتيب الطلاب حسب عدد الاختبارات المنجزة ومتوسط الدرجات</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
            لوحة الشرف والتميز
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            تكريم الطلاب الأكثر التزاماً وإنجازاً للاختبارات بأعلى متوسط درجات على مستوى المنصة.
          </p>

          {/* Clean Segmented Track Switcher (عام ولغات) */}
          <div className="flex items-center justify-center mt-8">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-200/80 border border-slate-200 shadow-inner">
              <button
                onClick={() => setActiveTrack("general")}
                className={`px-8 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
                  activeTrack === "general"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                قسم العام (عربي)
              </button>
              <button
                onClick={() => setActiveTrack("languages")}
                className={`px-8 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
                  activeTrack === "languages"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                قسم اللغات (Languages)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid Section (3 Cards Per Row) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search & Info Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>
              عرض نتائج:{" "}
              <strong className="text-slate-900">
                {activeTrack === "general" ? "طلاب المدارس العام" : "طلاب مدارس اللغات"}
              </strong>
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم الطالب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-white border border-slate-200 text-sm placeholder:text-slate-400 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-400 shadow-xs"
            />
          </div>
        </div>

        {/* Content State */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-slate-300 border-t-slate-800 rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-500">جاري تحديث وترتيب الكروت...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800 max-w-lg mx-auto">
            <p className="font-bold mb-1">حدث خطأ</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs max-w-md mx-auto">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">لا توجد نتائج مطابقة</h3>
            <p className="text-xs text-slate-500">جرب البحث باسم آخر.</p>
          </div>
        ) : (
          /* 3 Cards Per Row Grid - Elegant Square-proportioned White Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => {
              const theme = getScoreTheme(student.avg_score);
              const rank = student.track_rank;

              return (
                <article
                  key={student.student_id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between p-6 relative group"
                >
                  {/* Card Header: Rank & Track */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      {getRankBadge(rank)}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          student.track_group === "languages"
                            ? "bg-sky-50 text-sky-800 border-sky-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        {student.track_group === "languages" ? "لغات · Languages" : "عربي · عام"}
                      </span>
                    </div>

                    {/* Center Circular Score Gauge & Name */}
                    <div className="text-center my-3">
                      {/* White Elevated Circular Metric */}
                      <div className="inline-flex flex-col items-center justify-center w-24 h-24 rounded-full bg-white border-2 border-slate-100 shadow-md mx-auto mb-3.5 relative">
                        <span className={`text-2xl font-black ${theme.text} tracking-tight`}>
                          {student.avg_score}%
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">متوسط الدرجات</span>
                      </div>

                      {/* Student Name */}
                      <h2
                        className="text-lg font-black text-slate-900 tracking-tight line-clamp-1 group-hover:text-blue-600 transition-colors"
                        title={student.student_name}
                      >
                        {student.student_name}
                      </h2>

                      {/* Rating Label */}
                      <div className="mt-1.5">
                        <span
                          className={`inline-block text-xs font-extrabold px-3 py-0.5 rounded-full border ${theme.badge}`}
                        >
                          {student.overall_grade}
                        </span>
                      </div>

                      {/* Center or School */}
                      {student.center_name && (
                        <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                          {formatCenterName(student.center_name)}
                        </p>
                      )}
                    </div>

                    {/* Compact Stats Strip */}
                    <div className="flex items-center justify-center gap-4 bg-slate-50/80 border border-slate-100/90 rounded-2xl py-2 px-3 my-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 font-bold">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>{student.quizzes_taken} اختبارات منجزة</span>
                      </div>
                      <div className="h-3 w-px bg-slate-200" />
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{String(student.last_quiz_date || "").substring(0, 10)}</span>
                      </div>
                    </div>

                    {/* Quick Preview: 2 Solved Exams */}
                    <div className="space-y-1.5 mb-2">
                      <div className="text-[11px] font-bold text-slate-500 px-1">نماذج من درجاته:</div>
                      {student.quizzes_details.slice(0, 2).map((quiz, qIdx) => (
                        <div
                          key={`${quiz.quiz_id}-${qIdx}`}
                          className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs"
                        >
                          <span className="truncate text-slate-700 font-medium max-w-[170px]" title={quiz.quiz_title}>
                            {quiz.quiz_title}
                          </span>
                          <span className="font-extrabold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                            {quiz.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom Button: Opens Full Exams Breakdown Modal */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForModal(student)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>عرض درجات كل الامتحانات ({student.quizzes_details.length})</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Elegant Modal for Student Exam History Breakdown */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-800 shadow-xs">
                  #{selectedStudentForModal.track_rank}
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {selectedStudentForModal.student_name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    {selectedStudentForModal.center_name && (
                      <>
                        <span className="font-medium text-slate-600">
                          {formatCenterName(selectedStudentForModal.center_name)}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span>
                      متوسط الدرجات:{" "}
                      <strong className="text-emerald-600 font-extrabold">
                        {selectedStudentForModal.avg_score}%
                      </strong>{" "}
                      ({selectedStudentForModal.overall_grade})
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-800 grid place-items-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Solved Quizzes List */}
            <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
              <div className="text-xs font-bold text-slate-600 mb-2">
                سجل كافة الاختبارات المؤداة ({selectedStudentForModal.quizzes_details.length} اختبار):
              </div>

              {selectedStudentForModal.quizzes_details.map((q, idx) => (
                <div
                  key={`${q.quiz_id}-${idx}`}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="max-w-[70%]">
                    <div className="font-bold text-slate-800">{q.quiz_title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      تاريخ الحل: {String(q.date || "").substring(0, 10)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                      {q.grade_label}
                    </span>
                    <span
                      className={`font-black text-xs px-2.5 py-1 rounded-lg text-white ${
                        q.score >= 90
                          ? "bg-emerald-600"
                          : q.score >= 80
                          ? "bg-blue-600"
                          : q.score >= 70
                          ? "bg-indigo-600"
                          : "bg-slate-600"
                      }`}
                    >
                      {q.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 mt-16 text-center text-xs text-slate-500">
        <p className="font-bold">منصة د. محمود المهدي للتعليم الإلكتروني والتميز الأكاديمي</p>
        <p className="text-[11px] text-slate-400 mt-1">
          يتم احتساب الترتيب آلياً بناءً على متوسط أعلى درجات الاختبارات المنجزة.
        </p>
      </footer>
    </div>
  );
}
