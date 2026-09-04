import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Users,
  GraduationCap,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type ExtendedAttempt = {
  id: number;
  quizId: number;
  studentId: number;
  studentName: string;
  studentPhone: string;
  parentPhone: string;
  studentCode: string;
  studentGrade: string;
  studentCenter?: string;
  quizTitle: string;
  quizStage: string;
  score: number;
  totalQuestions: number;
  passingScore: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  extraAttemptsGranted?: number;
  createdAt: string;
};

interface StudentQuizGradesSheetProps {
  attempts: ExtendedAttempt[];
  stages?: string[];
  quizzes?: Array<{ id: number; title: string }>;
  onRefresh?: () => void;
}

export const StudentQuizGradesSheet: React.FC<StudentQuizGradesSheetProps> = ({
  attempts,
  stages = [],
  quizzes = [],
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all"); // all, passed, failed
  const [sortBy, setSortBy] = useState<"latest" | "scoreDesc" | "scoreAsc" | "name">("latest");
  const [grantingStudentId, setGrantingStudentId] = useState<number | null>(null);

  const handleGrantExtraAttempt = async (attempt: ExtendedAttempt) => {
    try {
      setGrantingStudentId(attempt.studentId);
      const res = await fetch(`/api/admin/learning/quizzes/${attempt.quizId}/extra-attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: attempt.studentId, extraAttempts: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل منح المحاولة الإضافية");
      alert(`تم منح الطالب (${attempt.studentName}) محاولة إضافية بنجاح 🎓`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setGrantingStudentId(null);
    }
  };

  const handleBulkGrantFailed = async () => {
    const failedStudents = filteredAttempts.filter((a) => !a.passed);
    if (failedStudents.length === 0) {
      alert("لا يوجد طلاب راسبين في نتائج الفلتر الحالية.");
      return;
    }

    if (!confirm(`هل أنت محقق من منح محاولة إضافية لعدد ${failedStudents.length} طالب راسب؟`)) return;

    try {
      let count = 0;
      for (const attempt of failedStudents) {
        await fetch(`/api/admin/learning/quizzes/${attempt.quizId}/extra-attempts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: attempt.studentId, extraAttempts: 1 }),
        });
        count++;
      }
      alert(`تم منح محاولة إضافية لعدد ${count} طالب راسب بنجاح 🎓`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // Extract unique stages & quizzes from attempts if not provided
  const availableStages = useMemo(() => {
    const set = new Set<string>();
    if (stages && stages.length > 0) {
      stages.forEach((s) => set.add(s));
    }
    attempts.forEach((a) => {
      if (a.studentGrade) set.add(a.studentGrade);
      if (a.quizStage) set.add(a.quizStage);
    });
    return Array.from(set).filter(Boolean);
  }, [attempts, stages]);

  const availableQuizzes = useMemo(() => {
    const map = new Map<string, string>();
    quizzes.forEach((q) => map.set(q.title, q.title));
    attempts.forEach((a) => {
      if (a.quizTitle) map.set(a.quizTitle, a.quizTitle);
    });
    return Array.from(map.values());
  }, [attempts, quizzes]);

  // Filtered & Sorted Attempts
  const filteredAttempts = useMemo(() => {
    return attempts.filter((item) => {
      // Stage Filter
      if (selectedStage !== "all") {
        const matchesStudentStage = item.studentGrade === selectedStage;
        const matchesQuizStage = item.quizStage === selectedStage;
        if (!matchesStudentStage && !matchesQuizStage) return false;
      }

      // Quiz Filter
      if (selectedQuiz !== "all" && item.quizTitle !== selectedQuiz) {
        return false;
      }

      // Status Filter
      if (selectedStatus === "passed" && !item.passed) return false;
      if (selectedStatus === "failed" && item.passed) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.studentName.toLowerCase().includes(q);
        const codeMatch = item.studentCode.toLowerCase().includes(q);
        const phoneMatch = item.studentPhone.includes(q);
        const parentPhoneMatch = item.parentPhone.includes(q);
        const quizMatch = item.quizTitle.toLowerCase().includes(q);

        if (!nameMatch && !codeMatch && !phoneMatch && !parentPhoneMatch && !quizMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "latest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "scoreDesc") {
        return b.percentage - a.percentage;
      }
      if (sortBy === "scoreAsc") {
        return a.percentage - b.percentage;
      }
      if (sortBy === "name") {
        return a.studentName.localeCompare(b.studentName, "ar");
      }
      return 0;
    });
  }, [attempts, selectedStage, selectedQuiz, selectedStatus, searchQuery, sortBy]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = filteredAttempts.length;
    if (total === 0) {
      return { totalAttempts: 0, passRate: 0, avgScore: 0, uniqueStudents: 0 };
    }
    const passedCount = filteredAttempts.filter((a) => a.passed).length;
    const passRate = Math.round((passedCount / total) * 100);
    const sumPercentage = filteredAttempts.reduce((acc, a) => {
      const pct = Math.min(100, Math.max(0, a.percentage ?? 0));
      return acc + pct;
    }, 0);
    const avgScore = Math.round(sumPercentage / total);
    const uniqueStudents = new Set(filteredAttempts.map((a) => a.studentId)).size;

    return {
      totalAttempts: total,
      passRate,
      avgScore,
      uniqueStudents,
    };
  }, [filteredAttempts]);

  // Format time spent helper
  const formatTimeSpent = (seconds: number) => {
    if (!seconds || seconds <= 0) return "أقل من دقيقة";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} ثانية`;
    return `${mins}د و ${secs}ث`;
  };

  // Format Date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Export to CSV / Excel
  const exportToCSV = () => {
    if (filteredAttempts.length === 0) return;

    const headers = [
      "اسم الطالب",
      "كود الطالب",
      "رقم الموبايل",
      "رقم ولي الأمر",
      "المرحلة الدراسية",
      "عنوان الاختبار",
      "الدرجة",
      "من إجمالي",
      "النسبة المئوية",
      "نتيجة الاختبار",
      "الوقت المستغرق",
      "تاريخ الإجراء",
    ];

    const rows = filteredAttempts.map((item) => {
      const safePct = Math.min(100, Math.max(0, item.percentage ?? 0));
      const safeScore =
        item.score > item.totalQuestions && item.totalQuestions > 0
          ? Math.round(((item.score || 0) / 100) * item.totalQuestions)
          : item.score;
      return [
        `"${item.studentName.replace(/"/g, '""')}"`,
        `"${item.studentCode || "-"}"`,
        `"${item.studentPhone || "-"}"`,
        `"${item.parentPhone || "-"}"`,
        `"${item.studentGrade || "-"}"`,
        `"${item.quizTitle.replace(/"/g, '""')}"`,
        safeScore,
        item.totalQuestions,
        `"${safePct}%"`,
        item.passed ? "ناجح" : "راسب",
        `"${formatTimeSpent(item.timeSpentSeconds)}"`,
        `"${formatDate(item.createdAt)}"`,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `شيت_درجات_الطلاب_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 text-xs px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1 font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> شيت تفاعلي شامل
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">شيت درجات وقوائم اختبارات الطلاب 📊</h2>
            <p className="text-emerald-100 text-sm mt-1 max-w-xl">
              عرض وتحليل نتائج كل الطلاب في الاختبارات مع إمكانية الفلترة الحية حسب المرحلة، والتصدير المباشر لملفات Excel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={exportToCSV}
              disabled={filteredAttempts.length === 0}
              className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold shadow-md gap-2"
            >
              <Download className="w-4 h-4" /> تصدير شيت Excel (.csv)
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 font-medium gap-2"
            >
              <Printer className="w-4 h-4" /> طباعة الشيت
            </Button>
          </div>
        </div>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>إجمالي المحاولات</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{metrics.totalAttempts}</div>
          <div className="text-xs text-slate-400 mt-1">محاولة مكتملة</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>الطلاب المشاركون</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{metrics.uniqueStudents}</div>
          <div className="text-xs text-slate-400 mt-1">طالب فريد</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>نسبة النجاح العامة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.passRate}%</div>
          <div className="text-xs text-slate-400 mt-1">اجتازوا الاختبار بنجاح</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>متوسط الدرجات</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.avgScore}%</div>
          <div className="text-xs text-slate-400 mt-1">متوسط أداء الطلاب</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="ابحث باسم الطالب، رقم التليفون، كود الطالب، أو عنوان الاختبار..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 bg-white dark:bg-slate-800 text-sm"
            />
          </div>

          {/* Filter Stage */}
          <div className="w-full lg:w-48 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
            <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="all">كل المراحل الدراسية</option>
              {availableStages.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Quiz */}
          <div className="w-full lg:w-56 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedQuiz}
              onChange={(e) => setSelectedQuiz(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none text-slate-800 dark:text-slate-200 truncate"
            >
              <option value="all">كل الاختبارات</option>
              {availableQuizzes.map((qz) => (
                <option key={qz} value={qz}>
                  {qz}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Pass/Fail */}
          <div className="w-full lg:w-40 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="all">كل الحالات (الكل)</option>
              <option value="passed">الناجحين فقط 🟢</option>
              <option value="failed">الراسبين فقط 🔴</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="w-full lg:w-44 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-transparent text-sm focus:outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="latest">الأحدث تاريخاً</option>
              <option value="scoreDesc">أعلى درجة</option>
              <option value="scoreAsc">أقل درجة</option>
              <option value="name">أبجدياً بالاسم</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display & Count */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <div>
            عرض <span className="font-bold text-slate-900 dark:text-white">{filteredAttempts.length}</span> من إجمالي{" "}
            <span className="font-bold">{attempts.length}</span> محاولة
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkGrantFailed}
              className="h-8 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
            >
              🎓 منح محاولة إضافية للطلاب الراسبين
            </Button>
            {(selectedStage !== "all" || selectedQuiz !== "all" || selectedStatus !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedStage("all");
                  setSelectedQuiz("all");
                  setSelectedStatus("all");
                  setSearchQuery("");
                }}
                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold text-xs"
              >
                إلغاء كل الفلاتر
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Interactive Grades Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredAttempts.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">لا توجد درجات مطابقة مع الفلاتر المحددة</p>
            <p className="text-xs text-slate-400 mt-1">جرب تغيير كلمة البحث أو إعادة تعيين الفلاتر من الأعلى.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">اسم الطالب</th>
                  <th className="py-3.5 px-4">الكود والمهاتف</th>
                  <th className="py-3.5 px-4">المرحلة الدراسية</th>
                  <th className="py-3.5 px-4">اسم الاختبار</th>
                  <th className="py-3.5 px-4 text-center">الدرجة النهائية</th>
                  <th className="py-3.5 px-4 text-center">النسبة / إعادة الاختبار</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الوقت المستغرق</th>
                  <th className="py-3.5 px-4">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAttempts.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors text-slate-800 dark:text-slate-200"
                  >
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {item.studentName}
                      {item.studentCenter && (
                        <span className="block text-[11px] font-normal text-slate-400">سنتر: {item.studentCenter}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">{item.studentCode || "-"}</div>
                      <div className="text-slate-500 font-mono dir-ltr text-right">{item.studentPhone || "-"}</div>
                      {item.parentPhone && (
                        <div className="text-[11px] text-slate-400 font-mono dir-ltr text-right">
                          ولي أمر: {item.parentPhone}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {item.studentGrade || item.quizStage || "عام"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-medium max-w-xs truncate" title={item.quizTitle}>
                      {item.quizTitle}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-base">
                      {item.score > item.totalQuestions && item.totalQuestions > 0
                        ? Math.round(((item.score || 0) / 100) * item.totalQuestions)
                        : item.score}{" "}
                      <span className="text-xs font-normal text-slate-400">/ {item.totalQuestions}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {(() => {
                          const displayPct = Math.min(100, Math.max(0, item.percentage ?? 0));
                          return (
                            <span
                              className={`inline-block font-extrabold text-sm px-2.5 py-0.5 rounded-full ${
                                displayPct >= 85
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : displayPct >= 60
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              }`}
                            >
                              {displayPct}%
                            </span>
                          );
                        })()}
                        <Button size="sm" variant="outline" disabled={grantingStudentId === item.studentId} onClick={() => handleGrantExtraAttempt(item)} className="h-6 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-400 dark:border-amber-700/50 whitespace-nowrap px-2 rounded-lg">
                          {grantingStudentId === item.studentId ? "⏳ جاري..." : "↺ إعادة الاختبار"}
                        </Button>
                        {Boolean(item.extraAttemptsGranted && item.extraAttemptsGranted > 0) && (
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                            +{item.extraAttemptsGranted} 🟢
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {item.passed ? (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 gap-1 inline-flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ناجح
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 inline-flex items-center">
                          <XCircle className="w-3.5 h-3.5" /> راسب
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatTimeSpent(item.timeSpentSeconds)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dir-ltr text-right">{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
