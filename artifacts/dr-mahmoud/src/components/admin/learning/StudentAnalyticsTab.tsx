import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Phone,
  MessageCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Activity,
  Award,
  Video,
  FileSpreadsheet,
  X,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type WatchDetail = {
  videoId: number;
  videoTitle: string;
  category: string;
  stage: string;
  progress: number;
  currentTimeSeconds: number;
  durationSeconds: number;
  completed: boolean;
  updatedAt: string;
};

export type QuizDetail = {
  id: number;
  quizId: number;
  score: number;
  passed: boolean;
  timeSpentSeconds: number;
  createdAt: string;
};

export type StudentAnalyticsItem = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  accessCode?: string | null;
  status: string;
  grade?: string | null;
  learningMode: string;
  paymentStatus: string;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  createdAt: string;
  daysInactive: number;
  isInactive: boolean;
  watchedVideosCount: number;
  completedVideosCount: number;
  quizzesCount: number;
  passedQuizzesCount: number;
  watchDetails: WatchDetail[];
  quizDetails: QuizDetail[];
};

function formatSeconds(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "لم يدخل بعد";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "غير معروف";
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true
  }).format(date);
}

export function StudentAnalyticsTab() {
  const [data, setData] = useState<StudentAnalyticsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "active" | "inactive" | "no_achievement" | "paid">("all");
  const [selectedStudent, setSelectedStudent] = useState<StudentAnalyticsItem | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [motivationTemplate, setMotivationTemplate] = useState("reminder");

  const fetchAnalytics = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/students/analytics", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (selectedStudent) {
          const updated = json.find((s: StudentAnalyticsItem) => s.id === selectedStudent.id);
          if (updated) setSelectedStudent(updated);
        }
      }
    } catch (err) {
      console.error("Failed to fetch student analytics:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Auto-refresh in Realtime every 10 seconds
  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchAnalytics(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.phone.includes(searchQuery) ||
        (item.accessCode && item.accessCode.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === "active") return !item.isInactive;
      if (filterType === "inactive") return item.isInactive;
      if (filterType === "no_achievement") return item.completedVideosCount === 0 && item.passedQuizzesCount === 0;
      if (filterType === "paid") return item.paymentStatus === "paid";

      return true;
    });
  }, [data, searchQuery, filterType]);

  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter((d) => !d.isInactive).length;
    const inactive = data.filter((d) => d.isInactive).length;
    const noAchievement = data.filter((d) => d.completedVideosCount === 0 && d.passedQuizzesCount === 0).length;
    const totalWatched = data.reduce((acc, d) => acc + d.watchedVideosCount, 0);
    return { total, active, inactive, noAchievement, totalWatched };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground">📊 تقرير نشاط الطلاب والمتابعة الدقيقة</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> ميزة اللحظي (Realtime)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            متابعة حية لمواعيد دخول الطلاب، تفاصيل ما يستمعون إليه بدقة، والطلاب المنقطعين.
          </p>
        </div>

        <button
          onClick={() => fetchAnalytics(true)}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-border self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          <span>تحديث البيانات الآن</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground block">إجمالي الطلاب</span>
            <span className="text-lg font-black text-foreground">{stats.total} طالب</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground block">طلاب نشطون مؤخراً</span>
            <span className="text-lg font-black text-emerald-600">{stats.active} طالب</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground block">بدون إنجاز تذكر</span>
            <span className="text-lg font-black text-amber-600">{stats.noAchievement} طالب</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground block">طلاب منقطعون (+3 أيام)</span>
            <span className="text-lg font-black text-rose-600">{stats.inactive} طالب</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground block">إجمالي مشاهدات الدروس</span>
            <span className="text-lg font-black text-purple-600">{stats.totalWatched} درساً</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم الطالب، الهاتف، أو الكود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 text-xs bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === "all" ? "bg-primary text-white" : "bg-slate-100 text-muted-foreground hover:bg-slate-200"
            }`}
          >
            الكل ({data.length})
          </button>
          <button
            onClick={() => setFilterType("no_achievement")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === "no_achievement" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            بدون إنجاز ({stats.noAchievement})
          </button>
          <button
            onClick={() => setFilterType("inactive")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === "inactive" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            المنقطعون فقط ({stats.inactive})
          </button>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            رسالة تحفيز جماعية عبر الواتساب 🚀
          </button>
          <button
            onClick={() => setFilterType("paid")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === "paid" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            المشتركون المدفوعون
          </button>
        </div>
      </div>

      {/* Main Students Analytics Table */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-border text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted-foreground">جاري تحميل تقارير حركة الطلاب...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-border text-center space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">لا يوجد طلاب يطابقون الفلتر الحالي</h3>
          <p className="text-xs text-muted-foreground">جرب البحث بكلمات أخرى أو تغيير نوع الفلتر</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-muted/80 border-b border-border text-[11px] font-black text-muted-foreground">
                  <th className="py-3.5 px-4">اسم الطالب / الكود</th>
                  <th className="py-3.5 px-4">حالة النشاط والتواجد</th>
                  <th className="py-3.5 px-4">آخر وقت دخول بالدقيقة</th>
                  <th className="py-3.5 px-4">آخر استماع لدرس</th>
                  <th className="py-3.5 px-4 text-center">دروس مسموعة</th>
                  <th className="py-3.5 px-4 text-center">إجراء المتابعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredData.map((student) => {
                  const latestWatch = student.watchDetails[0];
                  return (
                    <tr key={student.id} className="hover:bg-muted/60 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-black flex items-center justify-center text-xs border border-border">
                            {student.name.substring(0, 2)}
                          </div>
                          <div>
                            <strong className="block font-bold text-foreground text-xs">{student.name}</strong>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                                {student.accessCode || "بدون كود"}
                              </span>
                              <span>{student.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Activity Status */}
                      <td className="py-3.5 px-4">
                        {student.isInactive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            منقطع ({student.daysInactive} أيام)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            نشط مؤخراً
                          </span>
                        )}
                      </td>

                      {/* Last Login Time */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-foreground block">{formatDate(student.lastLoginAt)}</span>
                        <span className="text-[10px] text-slate-400">آخر دخول للنظام</span>
                      </td>

                      {/* Latest Watched Lesson */}
                      <td className="py-3.5 px-4">
                        {latestWatch ? (
                          <div className="max-w-[200px]">
                            <span className="block font-bold text-foreground truncate text-[11px]" title={latestWatch.videoTitle}>
                              {latestWatch.videoTitle}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              <span className="text-emerald-600 font-bold">{latestWatch.progress}% إتمام</span>
                              <span>({formatSeconds(latestWatch.currentTimeSeconds)})</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">لم يشاهد دروس بعد</span>
                        )}
                      </td>

                      {/* Stats */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-50 text-primary font-bold text-xs">
                          {student.watchedVideosCount} فيديو
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="px-3 py-1.5 rounded-xl bg-primary hover:bg-[#0952AC] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>تقرير شامل</span>
                          </button>

                          <a
                            href={`https://wa.me/2${student.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200"
                            title="تواصل واتساب"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Student Report Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setSelectedStudent(null)} />
          <div className="bg-white border border-border w-full max-w-3xl rounded-3xl p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 text-right">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-base border border-[#0B63CE]/20">
                  {selectedStudent.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">{selectedStudent.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>الهاتف: {selectedStudent.phone}</span>
                    <span>•</span>
                    <span>الكود: {selectedStudent.accessCode || "غير معين"}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted p-3 rounded-xl border border-border/80">
                <span className="text-[10px] font-bold text-muted-foreground block">حالة الحساب</span>
                <span className={`text-xs font-bold ${selectedStudent.isInactive ? "text-rose-600" : "text-emerald-600"}`}>
                  {selectedStudent.isInactive ? `منقطع (${selectedStudent.daysInactive} أيام)` : "نشط ومتابع"}
                </span>
              </div>
              <div className="bg-muted p-3 rounded-xl border border-border/80">
                <span className="text-[10px] font-bold text-muted-foreground block">تاريخ التسجيل</span>
                <span className="text-xs font-bold text-foreground">{formatDate(selectedStudent.createdAt)}</span>
              </div>
              <div className="bg-muted p-3 rounded-xl border border-border/80">
                <span className="text-[10px] font-bold text-muted-foreground block">آخر دخول للنظام</span>
                <span className="text-xs font-bold text-foreground">{formatDate(selectedStudent.lastLoginAt)}</span>
              </div>
              <div className="bg-muted p-3 rounded-xl border border-border/80">
                <span className="text-[10px] font-bold text-muted-foreground block">آخر نشاط ومشاهدة</span>
                <span className="text-xs font-bold text-foreground">{formatDate(selectedStudent.lastActiveAt)}</span>
              </div>
            </div>

            {/* Detailed Watch History */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                <Video className="w-4 h-4 text-primary" />
                <span>سجل استماع ومشاهدة الدروس التفصيلي ({selectedStudent.watchDetails.length})</span>
              </h4>

              {selectedStudent.watchDetails.length === 0 ? (
                <div className="p-6 text-center bg-muted rounded-2xl border border-border text-xs text-muted-foreground">
                  لم يقم الطالب بمشاهدة أي درس أو فيديو بعد.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedStudent.watchDetails.map((watch, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-xl border border-border/80 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <strong className="block font-bold text-foreground truncate">{watch.videoTitle}</strong>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">{watch.category}</span>
                          <span>تمت المتابعة في: {formatDate(watch.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="text-left flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600">{watch.progress}%</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({formatSeconds(watch.currentTimeSeconds)})</span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${watch.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quiz Attempts History */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-600" />
                <span>سجل الاختبارات والتقييمات ({selectedStudent.quizDetails.length})</span>
              </h4>

              {selectedStudent.quizDetails.length === 0 ? (
                <div className="p-4 text-center bg-muted rounded-2xl border border-border text-xs text-muted-foreground">
                  لم يؤدِّ الطالب أي اختبارات حتى الآن.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedStudent.quizDetails.map((quiz, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-xl border border-border/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-foreground">اختبار رقم #{quiz.quizId}</span>
                        <span className="text-[10px] text-muted-foreground block">{formatDate(quiz.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${quiz.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          الدرجة: {quiz.score}% ({quiz.passed ? "ناجح" : "لم يجتز"})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <a
                href={`https://wa.me/2${selectedStudent.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`أهلاً بك يا ${selectedStudent.name}، نود الاطمئنان عليك في منصة د. محمود المهدي للبرمجة.`)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>تواصل مع الطالب عبر الواتساب</span>
              </a>
            </div>

          </div>
        </div>
      )}

      {/* Bulk WhatsApp Motivation Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsBulkModalOpen(false)} />
          <div className="bg-white border border-border w-full max-w-2xl rounded-3xl p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 text-right">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">إرسال وتجهيز رسائل التحفيز عبر الواتساب 🚀</h3>
                  <p className="text-xs text-muted-foreground">تجميع الطلاب وتجهيز رسالة المراسلة الفردية بنقرة زر واحدة لكل طالب</p>
                </div>
              </div>

              <button onClick={() => setIsBulkModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-foreground">اختر قالب الرسالة التحفيزية:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMotivationTemplate("no_achievement")}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    motivationTemplate === "no_achievement" ? "border-amber-500 bg-amber-50/50 text-amber-900 font-bold" : "border-border hover:bg-muted text-slate-700 text-xs"
                  }`}
                >
                  <span className="block font-bold text-xs">🎯 للطلاب بدون إنجاز</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">تذكير الطالب بالبدء وتشجيعه على استغلال الوقت.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMotivationTemplate("inactive")}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    motivationTemplate === "inactive" ? "border-rose-500 bg-rose-50/50 text-rose-900 font-bold" : "border-border hover:bg-muted text-slate-700 text-xs"
                  }`}
                >
                  <span className="block font-bold text-xs">⚠️ للطلاب المنقطعين</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">رسالة تنبيهية بالدخول للدروس الجديدة والمتابعة.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMotivationTemplate("reminder")}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    motivationTemplate === "reminder" ? "border-blue-500 bg-blue-50/50 text-blue-900 font-bold" : "border-border hover:bg-muted text-slate-700 text-xs"
                  }`}
                >
                  <span className="block font-bold text-xs">⭐ تحفيز عام</span>
                  <span className="text-[10px] text-muted-foreground block mt-1">رسالة تشجيعية عامة للتقدم في المحتوى.</span>
                </button>
              </div>
            </div>

            {/* Targeted Students List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  قائمة الطلاب المستهدفين (
                  {motivationTemplate === "no_achievement"
                    ? data.filter((d) => d.completedVideosCount === 0 && d.passedQuizzesCount === 0).length
                    : motivationTemplate === "inactive"
                    ? data.filter((d) => d.isInactive).length
                    : data.length}
                  )
                </span>
                <span className="text-[11px] text-muted-foreground">اضغط على زر الواتساب بجانب الطالب لمراسلته مباشرة:</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(motivationTemplate === "no_achievement"
                  ? data.filter((d) => d.completedVideosCount === 0 && d.passedQuizzesCount === 0)
                  : motivationTemplate === "inactive"
                  ? data.filter((d) => d.isInactive)
                  : data
                ).map((st) => {
                  const messageText =
                    motivationTemplate === "no_achievement"
                      ? `أهلاً بك يا ${st.name} 👋، لاحظنا أنك لم تستكمل مشاهدة أية دروس أو اختبارات بعد في منصة د. محمود المهدي. البداية دائماً هي أهم خطوة، نحن هنا لمساعدتك والتأكد من وصولك للقمة 🚀!`
                      : motivationTemplate === "inactive"
                      ? `أهلاً بك يا ${st.name} 👋، افتقدناك في المنصة طوال الفترة الماضية! هناك محتوى جديد وتحديثات هامة بانتظارك، نتمنى لك كل التوفيق والعودة بقوة 💪.`
                      : `أهلاً بك يا ${st.name} ⭐، نود تشجيعك على الاستمرار والتفوق في منصة د. محمود المهدي البرمجية. واصل الاجتهاد!`;

                  return (
                    <div key={st.id} className="p-3 bg-muted rounded-xl border border-border/80 flex items-center justify-between text-xs">
                      <div>
                        <strong className="block font-bold text-foreground">{st.name}</strong>
                        <span className="text-[10px] text-muted-foreground">{st.phone} • الكود: {st.accessCode || "بدون كود"}</span>
                      </div>

                      <a
                        href={`https://wa.me/2${st.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(messageText)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>مراسلة الآن</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Close */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button onClick={() => setIsBulkModalOpen(false)} className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200">
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
