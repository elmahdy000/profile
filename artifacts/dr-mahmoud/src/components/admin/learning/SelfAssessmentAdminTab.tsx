import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Search,
  Plus,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  ShieldCheck,
  History,
  Zap,
  BookOpen,
  TrendingUp,
  X,
  Eye,
  Award,
  Clock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface EntitlementItem {
  id: number;
  phone: string;
  studentName: string;
  freeAttemptUsed: boolean;
  paidAttemptsBalance: number;
  totalPurchasedAttempts: number;
  lastGrantedBy?: string | null;
  lastGrantedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExamReviewItem {
  questionId: number;
  prompt: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  options?: string[];
}

interface ExamSessionItem {
  id: number;
  sessionId: string;
  studentId?: number | null;
  phone: string;
  studentName: string;
  isEnrolledStudent: boolean;
  stage: string;
  unit: string;
  lessons: string[] | string;
  totalQuestions: number;
  questionsCount: number;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  durationMinutes: number;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  reviewCount: number;
  details?: ExamReviewItem[];
}

interface SessionStats {
  totalCompleted: number;
  uniqueStudents: number;
  averageScore: number;
  passRate: number;
}

export function SelfAssessmentAdminTab({ role = "superadmin" }: { role?: "superadmin" | "subadmin" }) {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"results" | "entitlements">("results");

  // ── Results & Sessions State ──
  const [sessions, setSessions] = useState<ExamSessionItem[]>([]);
  const [sessionsStats, setSessionsStats] = useState<SessionStats>({
    totalCompleted: 0,
    uniqueStudents: 0,
    averageScore: 0,
    passRate: 0,
  });
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedSessionForReview, setSelectedSessionForReview] = useState<ExamSessionItem | null>(null);

  // ── Entitlements State ──
  const [entitlements, setEntitlements] = useState<EntitlementItem[]>([]);
  const [loadingEntitlements, setLoadingEntitlements] = useState(false);
  const [entitlementSearch, setEntitlementSearch] = useState("");
  const [activatingPhone, setActivatingPhone] = useState<string | null>(null);

  // Manual top-up form
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCount, setManualCount] = useState<number>(3);
  const [submittingManual, setSubmittingManual] = useState(false);

  // ── 1. Fetch Sessions & Exam Results ──
  const fetchSessions = async (silent = false) => {
    if (!silent) setLoadingSessions(true);
    try {
      const res = await fetch(
        `/api/admin/learning/self-assessment/sessions${sessionSearch ? `?search=${encodeURIComponent(sessionSearch)}` : ""}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر جلب سجل الاختبارات");
      setSessions(data.sessions || []);
      if (data.stats) {
        setSessionsStats(data.stats);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: (err as Error).message,
      });
    } finally {
      if (!silent) setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeSubTab !== "results") return;
    const timer = setTimeout(() => {
      void fetchSessions(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [sessionSearch, activeSubTab]);

  useEffect(() => {
    if (activeSubTab === "results") {
      void fetchSessions();
    } else {
      void fetchEntitlements();
    }
  }, [activeSubTab]);

  // ── 2. Fetch Entitlements ──
  const fetchEntitlements = async (silent = false) => {
    if (!silent) setLoadingEntitlements(true);
    try {
      const res = await fetch(
        `/api/admin/learning/self-assessment/entitlements${entitlementSearch ? `?search=${encodeURIComponent(entitlementSearch)}` : ""}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر جلب باقات التقييم الذاتي");
      setEntitlements(data.entitlements || []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: (err as Error).message,
      });
    } finally {
      if (!silent) setLoadingEntitlements(false);
    }
  };

  useEffect(() => {
    if (activeSubTab !== "entitlements") return;
    const timer = setTimeout(() => {
      void fetchEntitlements(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [entitlementSearch, activeSubTab]);

  const handleGrantAttempts = async (phone: string, studentName: string, attemptsCount = 3) => {
    setActivatingPhone(phone);
    try {
      const res = await fetch("/api/admin/learning/self-assessment/grant-attempts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          studentName,
          attemptsCount,
          notes: "تفعيل باقة 3 محاولات (50 ج.م)",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تفعيل الباقة");

      toast({
        title: "تم التفعيل بنجاح! 🚀",
        description: data.message || `تم إضافة ${attemptsCount} محاولات لرقم ${phone}`,
      });

      if (manualPhone === phone) {
        setManualPhone("");
        setManualName("");
      }

      await fetchEntitlements(true);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "فشل التفعيل",
        description: (err as Error).message,
      });
    } finally {
      setActivatingPhone(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim()) {
      toast({ variant: "destructive", description: "يرجى كتابة رقم الهاتف" });
      return;
    }
    setSubmittingManual(true);
    await handleGrantAttempts(manualPhone, manualName, manualCount);
    setSubmittingManual(false);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} ثانية`;
    return `${mins} د و ${secs} ث`;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Sub Navigation Tabs ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("results")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeSubTab === "results"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="h-4 w-4 text-blue-600" />
            نتائج وسجل الاختبارات
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700">
              {sessionsStats.totalCompleted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("entitlements")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeSubTab === "entitlements"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Coins className="h-4 w-4 text-indigo-600" />
            إدارة الباقات والرصيد
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700">
              {entitlements.length}
            </span>
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (activeSubTab === "results") void fetchSessions(false);
            else void fetchEntitlements(false);
          }}
          className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold self-end sm:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ml-1.5 ${
              (activeSubTab === "results" ? loadingSessions : loadingEntitlements) ? "animate-spin text-blue-600" : "text-slate-500"
            }`}
          />
          تحديث البيانات
        </Button>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: EXAM RESULTS & COMPLETED SESSIONS ────────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === "results" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-blue-700 mb-2">
                <span className="text-xs font-bold">إجمالي الاختبارات المكتملة</span>
                <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{sessionsStats.totalCompleted}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">محاولة اختبار تم تسليمها بنجاح</span>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-indigo-700 mb-2">
                <span className="text-xs font-bold">عدد الطلاب الممتحنين</span>
                <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{sessionsStats.uniqueStudents}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">طالب فريد أجرى الاختبارات</span>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-purple-700 mb-2">
                <span className="text-xs font-bold">متوسط الدرجات العام</span>
                <div className="h-8 w-8 rounded-xl bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{sessionsStats.averageScore}%</div>
              <span className="text-[11px] text-slate-500 mt-1 block">معدل تحصيل الطلاب العام</span>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 mb-2">
                <span className="text-xs font-bold">نسبة النجاح العامة</span>
                <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Award className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700">{sessionsStats.passRate}%</div>
              <span className="text-[11px] text-emerald-600 mt-1 block">نسبة الطلاب الحاصلين على ≥ 50%</span>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative w-full sm:w-80">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="بحث باسم الطالب أو رقم الهاتف..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="pr-9 rounded-xl text-xs h-9 bg-white border-slate-200"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                عرض <strong className="text-slate-800">{sessions.length}</strong> اختبار تم إجراؤه
              </span>
            </div>

            {loadingSessions ? (
              <div className="py-16 text-center text-slate-500">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-2" />
                <p className="text-xs">جاري تحميل سجل نتائج الاختبارات...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <BookOpen className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">لا توجد اختبارات مسجلة حتى الآن</p>
                <p className="text-xs text-slate-400 mt-1">
                  عندما يقوم أي طالب بإجراء اختبار ذاتي وتسليمه ستظهر نتيجته وتفاصيل إجاباته هنا فوراً.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">الطالب</th>
                      <th className="p-3">رقم الهاتف</th>
                      <th className="p-3">المرحلة والوحدة</th>
                      <th className="p-3 text-center">عدد الأسئلة</th>
                      <th className="p-3 text-center">الدرجة والنسبة</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-center">الوقت المستغرق</th>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {sessions.map((sess) => (
                      <tr key={sess.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{sess.studentName || "طالب"}</span>
                            {sess.isEnrolledStudent || (sess.studentId && sess.studentId > 0) ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                طالب بالمنصة
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                زائر
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-700" dir="ltr">
                          {sess.phone}
                        </td>
                        <td className="p-3">
                          <div className="max-w-[200px]">
                            <span className="font-bold text-slate-800 block truncate">{sess.unit}</span>
                            <span className="text-[11px] text-slate-400 block truncate">{sess.stage}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">
                            {sess.questionsCount || sess.totalQuestions} س
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-black text-xs text-slate-900">
                              {sess.score} / {sess.totalPoints}
                            </span>
                            <span
                              className={`text-[11px] font-bold ${
                                sess.percentage >= 85
                                  ? "text-emerald-600"
                                  : sess.percentage >= 65
                                  ? "text-blue-600"
                                  : sess.percentage >= 50
                                  ? "text-amber-600"
                                  : "text-red-600"
                              }`}
                            >
                              ({sess.percentage}%)
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {sess.passed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> ناجح
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="h-3 w-3" /> يحتاج تحسين
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                          {formatDuration(sess.timeSpentSeconds)}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500">
                          {sess.completedAt
                            ? new Date(sess.completedAt).toLocaleString("ar-EG", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : new Date(sess.createdAt).toLocaleString("ar-EG", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSessionForReview(sess)}
                            className="h-8 px-2.5 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-[11px]"
                          >
                            <Eye className="h-3.5 w-3.5 ml-1" />
                            تفاصيل الإجابات ({sess.reviewCount || sess.details?.length || sess.questionsCount || 0})
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: ENTITLEMENTS & RECHARGES ─────────────────────── */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeSubTab === "entitlements" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  إدارة باقات التقييم الذاتي المخصص (3 محاولات بـ 50 ج.م)
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  تفعيل محاولات الاختبار الذاتي للطلاب والزوار من خارج المنصة بمجرد تأكيد استلام المبلغ.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Grant Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              شحن فوري لباقة جديدة أو رقم طالب:
            </h3>
            <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs font-medium text-slate-700">رقم هاتف الطالب / الزائر *</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="مثال: 01012345678"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="pr-9 rounded-xl text-xs h-10 border-slate-200"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs font-medium text-slate-700">اسم الطالب (اختياري)</label>
                <div className="relative">
                  <User className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="اسم الطالب"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="pr-9 rounded-xl text-xs h-10 border-slate-200"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-700">عدد المحاولات</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={manualCount}
                  onChange={(e) => setManualCount(Number(e.target.value) || 3)}
                  className="rounded-xl text-xs h-10 text-center border-slate-200 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={submittingManual || !manualPhone.trim()}
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  {submittingManual ? "جاري التفعيل..." : "+ تفعيل الباقة (50 ج.م)"}
                </Button>
              </div>
            </form>
          </div>

          {/* Entitlements Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative w-full sm:w-80">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="بحث برقم الهاتف أو الاسم..."
                  value={entitlementSearch}
                  onChange={(e) => setEntitlementSearch(e.target.value)}
                  className="pr-9 rounded-xl text-xs h-9 bg-white border-slate-200"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                إجمالي الحسابات المسجلة: <strong className="text-slate-800">{entitlements.length}</strong>
              </span>
            </div>

            {loadingEntitlements ? (
              <div className="py-16 text-center text-slate-500">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-2" />
                <p className="text-xs">جاري تحميل سجل الباقات والمحاولات...</p>
              </div>
            ) : entitlements.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <Sparkles className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-600">لا توجد طلبات أو أرقام مسجلة حتى الآن</p>
                <p className="text-xs text-slate-400 mt-1">
                  سيظهر هنا تلقائياً أي طالب أو زائر يستخدم التقييم الذاتي من الموقع.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">الطالب / الزائر</th>
                      <th className="p-3">رقم الهاتف</th>
                      <th className="p-3 text-center">المحاولة المجانية</th>
                      <th className="p-3 text-center">الرصيد المتبقي</th>
                      <th className="p-3 text-center">إجمالي المشترى</th>
                      <th className="p-3">آخر تفعيل بواسطة</th>
                      <th className="p-3 text-center">إجراء سريع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {entitlements.map((item) => (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 font-semibold text-slate-900">
                          {item.studentName || "طالب زائر"}
                        </td>
                        <td className="p-3 font-mono text-slate-700" dir="ltr">
                          {item.phone}
                        </td>
                        <td className="p-3 text-center">
                          {item.freeAttemptUsed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              تم استهلاكها
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> متاحة مجاناً
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs ${
                              item.paidAttemptsBalance > 0
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            <Coins className="h-3.5 w-3.5" />
                            {item.paidAttemptsBalance} محاولات
                          </span>
                        </td>
                        <td className="p-3 text-center font-medium text-slate-700">
                          {item.totalPurchasedAttempts || 0}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500">
                          {item.lastGrantedBy ? (
                            <div>
                              <span className="font-semibold text-slate-700">{item.lastGrantedBy}</span>
                              {item.lastGrantedAt && (
                                <span className="block text-[10px] text-slate-400">
                                  {new Date(item.lastGrantedAt).toLocaleDateString("ar-EG")}
                                </span>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            disabled={activatingPhone === item.phone}
                            onClick={() => handleGrantAttempts(item.phone, item.studentName, 3)}
                            className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs"
                          >
                            {activatingPhone === item.phone ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5 ml-1" />
                                +3 محاولات (50 ج)
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: EXAM DETAILS & ANSWERS REVIEW ── */}
      {selectedSessionForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-base">
                    تقرير إجابات الطالب: {selectedSessionForReview.studentName || "طالب"}
                  </span>
                  <span className="font-mono text-xs text-slate-500" dir="ltr">
                    ({selectedSessionForReview.phone})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>الوحدة: <strong>{selectedSessionForReview.unit}</strong></span>
                  <span>•</span>
                  <span>
                    الدرجة:{" "}
                    <strong className="text-blue-600 font-bold">
                      {selectedSessionForReview.score} من {selectedSessionForReview.totalPoints} ({selectedSessionForReview.percentage}%)
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    المدة: <strong>{formatDuration(selectedSessionForReview.timeSpentSeconds)}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSessionForReview(null)}
                className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {!selectedSessionForReview.details || selectedSessionForReview.details.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <AlertCircle className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs">لا تتوفر تفاصيل تفصيلية لهذه الجلسة.</p>
                </div>
              ) : (
                selectedSessionForReview.details.map((q, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-all ${
                      q.isCorrect
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-red-200 bg-red-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px]">
                          {idx + 1}
                        </span>
                        <span>{q.prompt}</span>
                      </div>
                      {q.isCorrect ? (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="h-3 w-3" /> صحيحة (+1)
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          <X className="h-3 w-3" /> خاطئة
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <div className="p-2 rounded-xl bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 block mb-0.5">إجابة الطالب:</span>
                        <span
                          className={`font-semibold ${
                            q.isCorrect ? "text-emerald-700" : "text-red-600 line-through"
                          }`}
                        >
                          {q.studentAnswer || "لم يجب الطالب"}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-white border border-slate-100">
                        <span className="text-[10px] text-slate-400 block mb-0.5">الإجابة النموذجية:</span>
                        <span className="font-semibold text-emerald-700">
                          {q.correctAnswer}
                        </span>
                      </div>
                    </div>

                    {q.explanation && (
                      <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 text-[11px] leading-relaxed">
                        <strong className="font-bold block mb-0.5 text-blue-700">الشرح والتوضيح:</strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSessionForReview(null)}
                className="rounded-xl px-5 text-xs font-semibold"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
