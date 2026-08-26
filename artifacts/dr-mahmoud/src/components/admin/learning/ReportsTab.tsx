import React, { useState, useEffect } from "react";
import {
  Download,
  Activity,
  GraduationCap,
  BarChart3,
  ClipboardCheck,
  MessageCircle,
  Check,
  Calendar,
  UserCheck,
  Clock,
  Search,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecoveryRequest {
  id: number;
  studentName: string;
  phone: string;
  accessCode?: string | null;
  status: string;
}

interface LearningAnalytics {
  summary: {
    totalStudents: number;
    approvedStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    completedLessons: number;
    averageProgress: number;
    quizPassRate: number;
    paidStudents?: number;
    pendingReviewPayments?: number;
  };
}

interface TodayActiveStudent {
  id: number;
  name: string;
  phone: string;
  grade: string;
  accessCode: string | null;
  lastActiveAt: string | null;
}

interface DailyActivityData {
  summary: {
    todayActiveCount: number;
    yesterdayActiveCount: number;
    totalApprovedStudents: number;
  };
  dailyHistory: Array<{ date: string; count: number }>;
  todayActiveStudents: TodayActiveStudent[];
}

export interface ReportsTabProps {
  analytics: LearningAnalytics | null;
  recoveryRequests: RecoveryRequest[];
  resolveRecoveryRequest: (id: number) => Promise<void>;
}

function formatExactTime(dateStr?: string | null): string {
  if (!dateStr) return "غير محدد";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  analytics,
  recoveryRequests,
  resolveRecoveryRequest,
}) => {
  const [dailyData, setDailyData] = useState<DailyActivityData | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [searchToday, setSearchToday] = useState("");

  const loadDailyActivity = async () => {
    setLoadingDaily(true);
    try {
      const res = await fetch("/api/admin/learning/daily-activity", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDailyData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDaily(false);
    }
  };

  useEffect(() => {
    void loadDailyActivity();
  }, []);

  if (!analytics) return null;

  const filteredTodayStudents = (dailyData?.todayActiveStudents || []).filter((s) => {
    if (!searchToday.trim()) return true;
    const q = searchToday.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.phone.includes(q);
  });

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-black text-slate-900">التقارير وحركة الدخول اليومية</h2>
          <p className="text-xs text-slate-500 mt-0.5">متابعة نشطة لأعداد وأسماء الطلاب المتواجدين على المنصة اليوم ومؤشرات الأداء</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDailyActivity()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> تحديث التقرير
          </Button>
          <a
            href="/api/admin/learning/analytics/export"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" /> تصدير بيانات الطلاب CSV
          </a>
        </div>
      </div>

      {/* Daily Activity Stats Bar */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong className="text-3xl font-black text-emerald-700">
                {dailyData?.summary.todayActiveCount ?? 0}
              </strong>
              <p className="mt-1 text-xs font-bold text-emerald-800">
                طالب دخل المنصة اليوم 🟢
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <UserCheck className="h-6 w-6" />
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong className="text-3xl font-black text-blue-700">
                {dailyData?.summary.yesterdayActiveCount ?? 0}
              </strong>
              <p className="mt-1 text-xs font-bold text-blue-800">
                طالب دخل المنصة أمس 🔵
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500 text-white shadow-md shadow-blue-500/20">
              <Calendar className="h-6 w-6" />
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong className="text-3xl font-black text-violet-700">
                {analytics.summary.activeStudents}
              </strong>
              <p className="mt-1 text-xs font-bold text-violet-800">
                نشطين آخر 14 يوماً ⚡
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500 text-white shadow-md shadow-violet-500/20">
              <Activity className="h-6 w-6" />
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong className="text-3xl font-black text-amber-700">
                {analytics.summary.averageProgress}%
              </strong>
              <p className="mt-1 text-xs font-bold text-amber-800">
                متوسط تقدم ومشاهدات الدروس 📈
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <TrendingUp className="h-6 w-6" />
            </span>
          </div>
        </article>
      </div>

      {/* Today's Active Students Directory */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              قائمة الطلاب الذين دخلوا المنصة اليوم ({filteredTodayStudents.length} طالب) 🟢
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">أسماء وأوقات وتفاصيل تصفح الطلاب المتواجدين اليوم</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث باسم الطالب أو الهاتف..."
              value={searchToday}
              onChange={(e) => setSearchToday(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
        </div>

        {loadingDaily ? (
          <div className="flex items-center justify-center p-8 text-xs font-bold text-slate-400">
            جاري تحميل كشف الدخول اليومي...
          </div>
        ) : filteredTodayStudents.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl">
            لم يقم أي طالب بتسجيل الدخول بعد اليوم حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">اسم الطالب</th>
                  <th className="px-4 py-3">رقم الهاتف</th>
                  <th className="px-4 py-3">المرحلة</th>
                  <th className="px-4 py-3">وقت الدخول اليوم</th>
                  <th className="px-4 py-3 text-center">تواصل مباشر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTodayStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                        <span>{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dir-ltr text-right">
                      {student.phone}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate" title={student.grade}>
                      {student.grade || "غير محدد"}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <Clock className="h-3 w-3" /> {formatExactTime(student.lastActiveAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={`https://wa.me/${(student.phone.replace(/[^\d+]/g, "").startsWith("0") ? "2" + student.phone.replace(/[^\d+]/g, "") : student.phone.replace(/[^\d+]/g, ""))}?text=${encodeURIComponent(`مرحباً ${student.name} 👋، تواصل من د. محمود المهدي`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 border border-[#A7F3D0] bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#10B981] text-xs font-semibold h-7 px-3 rounded-xl transition-all"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-[#10B981]" /> واتساب
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 30-Day Daily Logins History Table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-900">سجل الدخول اليومي آخر 30 يوماً 📊</h3>
          <p className="text-xs text-slate-500 mt-0.5">تتبع إجمالي أعداد الطلاب المتواجدين يومياً عبر الشهر</p>
        </div>

        {dailyData?.dailyHistory && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
            {dailyData.dailyHistory.slice(0, 18).map(({ date, count }) => (
              <div key={date} className={`p-3 rounded-xl border text-center transition-all ${count > 0 ? "bg-slate-50 border-slate-200" : "bg-slate-50/50 border-slate-100 opacity-60"}`}>
                <span className="text-[11px] font-bold text-slate-500 block font-mono">{date}</span>
                <strong className={`text-xl font-black block mt-1 ${count > 0 ? "text-blue-600" : "text-slate-400"}`}>{count}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">طالب نشط</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Code Recovery Requests */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="text-base font-black text-slate-900">طلبات استرجاع الكود</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            راجع بيانات الطالب وأرسل له الكود على رقم الواتساب المسجل.
          </p>
        </div>
        <div className="space-y-2">
          {recoveryRequests.filter((request) => request.status === "pending").length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-5 text-center text-xs font-bold text-slate-500">
              لا توجد طلبات استرجاع معلقة حتى الآن.
            </p>
          ) : (
            recoveryRequests
              .filter((request) => request.status === "pending")
              .map((request) => {
                const message = `أهلًا ${request.studentName}، كود دخول منصة د. محمود المهدي الخاص بك هو: ${
                  request.accessCode || ""
                }`;
                return (
                  <article
                    key={request.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <strong className="text-sm font-bold">{request.studentName}</strong>
                      <p className="text-xs text-slate-500 font-mono" dir="ltr">
                        {request.phone}
                      </p>
                      <span className="mt-1 block font-mono text-xs font-bold text-blue-600">
                        {request.accessCode}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`https://wa.me/${request.phone.replace(/^0/, "20")}?text=${encodeURIComponent(message)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#25D366] px-4 text-xs font-bold text-white shadow-xs"
                      >
                        <MessageCircle className="h-4 w-4" /> إرسال الكود
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveRecoveryRequest(request.id)}
                        className="h-9 rounded-xl text-xs"
                      >
                        <Check className="h-4 w-4 ml-1" /> تم التواصل
                      </Button>
                    </div>
                  </article>
                );
              })
          )}
        </div>
      </section>
    </div>
  );
};
