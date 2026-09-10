import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Phone,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Award,
  Clock,
  LogOut,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  FileText,
  Bell,
  BellRing,
  Volume2,
  Share2,
  CalendarCheck,
  XCircle,
  MapPin,
  CreditCard,
  MessageSquareQuote,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function normalizeArabicDigits(str: string): string {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const easternDigits = "۰۱۲۳۴۵۶۷۸۹";
  return str
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(easternDigits.indexOf(d)));
}

type ParentReportData = {
  parent: {
    name: string;
    phone: string;
    parentCode: string;
  };
  student: {
    id: number;
    name: string;
    phone: string;
    grade?: string | null;
    centerName?: string | null;
    appointmentSlot?: string | null;
    learningMode: string;
    paymentStatus: string;
    notes?: string | null;
    lastLoginAt?: string | null;
    lastActiveAt?: string | null;
    createdAt: string;
    daysInactive: number;
    isInactive: boolean;
    watchedCount?: number;
    completedCount?: number;
    quizzesCount: number;
    passedQuizzesCount: number;
  };
  paymentNotice?: {
    isDue: boolean;
    status: "paid" | "due" | "upcoming" | "pending_review";
    title: string;
    message: string;
    dueDateText?: string;
  };
  watchHistory?: Array<{
    videoId: number;
    videoTitle: string;
    category: string;
    stage: string;
    progress: number;
    currentTimeSeconds: number;
    durationSeconds: number;
    completed: boolean;
    updatedAt: string;
  }>;
  quizHistory: Array<{
    id: number;
    quizId: number;
    quizTitle?: string;
    score: number;
    totalQuestions?: number;
    percentage?: number;
    passed: boolean;
    timeSpentSeconds: number;
    createdAt: string;
  }>;
  notifications: Array<{
    id: number;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
  }>;
  attendanceHistory?: Array<{
    id: number;
    date: string;
    status: "present" | "absent" | "late";
    checkInTime?: string | null;
    center?: string | null;
    appointmentSlot?: string | null;
    notes?: string | null;
    recordedBy?: string | null;
    createdAt: string;
  }>;
};

// Web Audio API synthesized chime for crisp audio alert without external assets
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.error("Audio playback error:", err);
  }
}

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

export function ParentPortal() {
  const { toast } = useToast();
  const [activeMode, setActiveMode] = useState<"login" | "register" | "recover" | "report">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevNotificationCountRef = useRef<number | null>(null);
  const prevLatestAttemptIdRef = useRef<number | null>(null);
  const [browserNotifPermission, setBrowserNotifPermission] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserNotifPermission(Notification.permission);
    }
  }, []);

  const requestBrowserNotification = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setBrowserNotifPermission(perm);
      if (perm === "granted") {
        toast({
          title: "تم تفعيل إشعارات المتصفح بنجاح! 🔔",
          description: "ستصلك التنبيهات الفورية بدرجات ابنك في الاختبارات حتى لو كان المتصفح في الخلفية.",
        });
        try {
          new Notification("أكاديمية د. محمود المهدي", {
            body: "تم تفعيل التنبيهات الفورية بنجاح لولي الأمر!",
            icon: "/favicon.ico",
          });
        } catch {}
      }
    } catch (e) {
      console.error("Failed to request notification permission:", e);
    }
  };

  // Register form state
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regStudentQuery, setRegStudentQuery] = useState("");

  // Recover form state
  const [recoverPhone, setRecoverPhone] = useState("");
  const [recoverStudentQuery, setRecoverStudentQuery] = useState("");
  const [recoveredCode, setRecoveredCode] = useState<string | null>(null);

  // Login form state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginCode, setLoginCode] = useState("");

  // Report state
  const [reportData, setReportData] = useState<ParentReportData | null>(null);

  const fetchReport = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/parent/report", { credentials: "include" });
      if (res.ok) {
        const json: ParentReportData = await res.json();

        // 1. Detect newly completed quiz in real-time
        if (json.quizHistory && json.quizHistory.length > 0) {
          const latestQuiz = json.quizHistory[0];
          if (
            prevLatestAttemptIdRef.current !== null &&
            latestQuiz.id !== prevLatestAttemptIdRef.current
          ) {
            if (soundEnabled) playNotificationChime();
            const scoreText = latestQuiz.totalQuestions
              ? `${latestQuiz.score} من ${latestQuiz.totalQuestions} (${latestQuiz.percentage ?? latestQuiz.score}%)`
              : `${latestQuiz.percentage ?? latestQuiz.score}%`;
            const statusText = latestQuiz.passed ? "اجتاز الاختبار بنجاح ✓" : "لم يجتز الاختبار ✕";
            const qTitle = latestQuiz.quizTitle || `اختبار تقييمي #${latestQuiz.quizId}`;

            toast({
              title: `🎯 إشعار فوري: أنهى الطالب ${qTitle}`,
              description: `النتيجة: ${scoreText} - ${statusText}`,
            });

            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(`🎯 نتيجة اختبار: ${qTitle}`, {
                  body: `أنهى الطالب الاختبار بنتيجة: ${scoreText} (${statusText})`,
                  icon: "/favicon.ico",
                });
              } catch (e) {
                console.error("Browser notification error:", e);
              }
            }
          }
          prevLatestAttemptIdRef.current = latestQuiz.id;
        }

        // 2. Detect new admin & system notifications
        if (json.notifications && json.notifications.length > 0) {
          const currentCount = json.notifications.length;
          if (prevNotificationCountRef.current !== null && currentCount > prevNotificationCountRef.current) {
            const latest = json.notifications[0];
            if (soundEnabled) playNotificationChime();
            toast({
              title: latest.title,
              description: latest.message,
            });

            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(latest.title, {
                  body: latest.message,
                  icon: "/favicon.ico",
                });
              } catch (e) {
                console.error("Browser notification error:", e);
              }
            }
          }
          prevNotificationCountRef.current = currentCount;
        }

        setReportData(json);
        setActiveMode("report");
      } else {
        if (!silent) setActiveMode("login");
      }
    } catch {
      if (!silent) setActiveMode("login");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // On mount: check if already logged in (silent - don't touch login/register tab)
  useEffect(() => {
    fetchReport(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 8 seconds ONLY while on report screen
  useEffect(() => {
    if (activeMode !== "report") return;
    const interval = setInterval(() => {
      fetchReport(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [activeMode, soundEnabled]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizeArabicDigits(regPhone).trim();
    const cleanQuery = normalizeArabicDigits(regStudentQuery).trim();
    if (!regName.trim() || !cleanPhone || !cleanQuery) {
      toast({ title: "بيانات غير مكتملة", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/parent/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: regName.trim(),
          phone: cleanPhone,
          studentIdentifier: cleanQuery,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التسجيل");

      toast({
        title: "تم التسجيل والتوثيق بنجاح",
        description: `كود ولي الأمر الخاص بك هو: ${data.parentCode}`,
      });

      fetchReport();
    } catch (err: any) {
      toast({ title: "خطأ في التسجيل", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizeArabicDigits(loginPhone).trim();
    const cleanCode = normalizeArabicDigits(loginCode).trim();

    if (!cleanPhone || !cleanCode) {
      toast({ title: "بيانات غير مكتملة", description: "يرجى إدخال رقم الهاتف وكود ولي الأمر أو كود الطالب", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/parent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: cleanPhone,
          parentCode: cleanCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الدخول");

      toast({ title: "مرحباً بك", description: `أهلاً بك يا ${data.parentName}` });
      fetchReport();
    } catch (err: any) {
      toast({ title: "فشل الدخول", description: err.message || "كود ولي الأمر أو كود الطالب ورقم الهاتف غير صحيح", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizeArabicDigits(recoverPhone).trim();
    const cleanQuery = normalizeArabicDigits(recoverStudentQuery).trim();

    if (!cleanPhone || !cleanQuery) {
      toast({ title: "بيانات غير مكتملة", description: "يرجى كتابة رقم هاتفك ورقم هاتف الطالب/كوده", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setRecoveredCode(null);
    try {
      const res = await fetch("/api/parent/recover-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPhone: cleanPhone,
          studentPhone: cleanQuery,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل استرداد الكود");

      setRecoveredCode(data.parentCode);
      setLoginCode(data.parentCode);
      setLoginPhone(cleanPhone);
      toast({
        title: "تم استرداد الكود بنجاح! 🎉",
        description: `كود تتبع ولي الأمر الخاص بك هو: ${data.parentCode}`,
      });
    } catch (err: any) {
      toast({ title: "تعذر الاسترداد", description: err.message || "لم نجد حساب ولي أمر بهذه البيانات", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/parent/logout", { method: "POST", credentials: "include" });
    setReportData(null);
    setActiveMode("login");
    toast({ title: "تم خروج ولي الأمر" });
  };

  return (
    <div className="theme-adaptive min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-right" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Portal Header */}
        <div className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-600 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>بوابة ولي الأمر الرسمية لمتابعة الطالب</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">أكاديمية د. محمود المهدي للبرمجة</h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            متابعة مباشرة لنتائج اختبارات الطالب، سجل الحضور والغياب، ملاحظات السلوك من المشرفين، وحالة المصاريف الشهرية.
          </p>
        </div>

        {/* Dynamic Mode Content */}
        {activeMode === "report" && reportData ? (
          <div className="space-y-6">
            
            {/* Parent & Student Overview Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-black flex items-center justify-center text-xl shadow-md shadow-blue-500/20 shrink-0">
                    {reportData.student.name.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900">{reportData.student.name}</h2>
                      {reportData.student.grade && (
                        <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                          {reportData.student.grade}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5">
                      <span>مرحبا ولي الأمر: <strong className="text-slate-900 font-bold">{reportData.parent.name}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        كود التتبع: 
                        <strong className="font-mono bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 rounded-lg font-bold text-xs">
                          {reportData.parent.parentCode}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                  {typeof window !== "undefined" && "Notification" in window && browserNotifPermission !== "granted" && (
                    <button
                      type="button"
                      onClick={requestBrowserNotification}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs bg-white text-blue-600 border-slate-200 hover:bg-blue-50 hover:border-blue-200"
                      title="استلام إشعارات الاختبارات على الهاتف أو المتصفح"
                    >
                      <BellRing className="w-4 h-4 text-blue-600" />
                      <span>تفعيل إشعارات الهاتف / المتصفح</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundEnabled;
                      setSoundEnabled(next);
                      if (next) playNotificationChime();
                      toast({ title: next ? "تم تفعيل التنبيهات الصوتية 🔔" : "تم كتم التنبيهات الصوتية 🔕" });
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs ${
                      soundEnabled
                        ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {soundEnabled ? <BellRing className="w-4 h-4 text-blue-600 animate-pulse" /> : <Bell className="w-4 h-4" />}
                    <span>{soundEnabled ? "التنبيهات مفعّلة" : "التنبيهات مكتومة"}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-600 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <LogOut className="w-4 h-4 text-slate-400" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>

              {/* Status Banner Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">حضور المحاضرات</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-emerald-700">
                      {reportData.attendanceHistory?.filter((a) => a.status === "present").length || 0}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">حصة تم حضورها</span>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${
                  (reportData.attendanceHistory?.filter((a) => a.status === "absent").length || 0) > 0
                    ? "bg-rose-50/80 border-rose-200 text-rose-900"
                    : "bg-slate-50/80 border-slate-200/80 text-slate-700"
                }`}>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">غياب المحاضرات</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-black ${
                      (reportData.attendanceHistory?.filter((a) => a.status === "absent").length || 0) > 0
                        ? "text-rose-700"
                        : "text-slate-900"
                    }`}>
                      {reportData.attendanceHistory?.filter((a) => a.status === "absent").length || 0}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">حصة غياب</span>
                  </div>
                </div>

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">الاختبارات والكويزات</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-blue-600">{reportData.student.passedQuizzesCount}</span>
                    <span className="text-xs text-slate-500 font-semibold">من {reportData.student.quizzesCount} كويز</span>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border transition-all ${
                  reportData.paymentNotice?.isDue || reportData.student.paymentStatus === "unpaid"
                    ? "bg-rose-50/80 border-rose-200 text-rose-900"
                    : reportData.student.paymentStatus === "pending_review"
                    ? "bg-amber-50/80 border-amber-200 text-amber-900"
                    : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                }`}>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">حالة الشهرية</span>
                  <span className="text-xs font-bold block truncate">
                    {reportData.student.paymentStatus === "paid" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> مسددة بالكامل ✓
                      </span>
                    ) : reportData.student.paymentStatus === "pending_review" ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                        <Clock className="w-3.5 h-3.5" /> قيد المراجعة ⏳
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" /> مستحقة السداد ⚠️
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Tuition & Payment Notice */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4.5 h-4.5 text-blue-600" />
                  <span>حالة المصاريف الشهرية والاشتراك</span>
                </h3>
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-2xs ${
                  reportData.student.paymentStatus === "paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : reportData.student.paymentStatus === "pending_review"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {reportData.student.paymentStatus === "paid"
                    ? "مسددة بالكامل ✓"
                    : reportData.student.paymentStatus === "pending_review"
                    ? "قيد المراجعة والتأكيد ⏳"
                    : "مستحقة السداد ⚠️"}
                </span>
              </div>

              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                reportData.paymentNotice?.isDue || reportData.student.paymentStatus === "unpaid"
                  ? "bg-rose-50/80 border-rose-200 text-rose-950"
                  : reportData.paymentNotice?.status === "upcoming"
                  ? "bg-blue-50/80 border-blue-200 text-blue-950"
                  : reportData.student.paymentStatus === "pending_review"
                  ? "bg-amber-50/80 border-amber-200 text-amber-950"
                  : "bg-emerald-50/60 border-emerald-200 text-emerald-950"
              }`}>
                <div className="space-y-1">
                  <strong className="block font-bold text-sm">
                    {reportData.paymentNotice?.title || (reportData.student.paymentStatus === "paid" ? "تم سداد المصاريف للشهر الحالي بنجاح" : "تنبيه سداد المصاريف الشهرية")}
                  </strong>
                  <p className="text-xs leading-relaxed opacity-90">
                    {reportData.paymentNotice?.message || "نحيطكم علماً بأن اشتراك ومصاريف الشهر مسجلة بالإدارة."}
                  </p>
                </div>

                {(reportData.paymentNotice?.isDue || reportData.student.paymentStatus === "unpaid") && (
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-rose-800 bg-white px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs">
                      يُرجى السداد بالسنتر أو عبر الإدارة
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Notifications Alert Box */}
            {reportData.notifications && reportData.notifications.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Bell className="w-4.5 h-4.5 text-blue-600" />
                    <span>إشعارات وتنبيهات المحاضر والإدارة ({reportData.notifications.length})</span>
                  </h3>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full shadow-2xs">
                    🔔 التنبيهات مفعّلة
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {reportData.notifications.map((notif) => {
                    const isAbsent = notif.type === "attendance_absent" || notif.title.includes("غياب");
                    const isLate = notif.title.includes("متأخر");
                    return (
                      <div
                        key={notif.id}
                        className={`p-4 rounded-2xl border space-y-1.5 text-xs shadow-2xs transition-all ${
                          isAbsent
                            ? "bg-rose-50/80 border-rose-200 text-rose-950"
                            : isLate
                            ? "bg-amber-50/80 border-amber-200 text-amber-950"
                            : "bg-slate-50/80 border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {isAbsent ? (
                              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                            ) : isLate ? (
                              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                            ) : (
                              <Bell className="h-4 w-4 text-blue-600 shrink-0" />
                            )}
                            <strong className={`font-bold text-sm ${isAbsent ? "text-rose-900" : isLate ? "text-amber-900" : "text-slate-900"}`}>
                              {notif.title}
                            </strong>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">{formatDate(notif.createdAt)}</span>
                        </div>
                        <p className={`text-xs leading-relaxed font-medium ${isAbsent ? "text-rose-800" : isLate ? "text-amber-800" : "text-slate-600"}`}>
                          {notif.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Attendance & Absence Record */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="w-4.5 h-4.5 text-blue-600" />
                  <span>سجل الحضور والغياب في السناتر والمحاضرات ({reportData.attendanceHistory?.length || 0})</span>
                </h3>
                {reportData.attendanceHistory && reportData.attendanceHistory.length > 0 && (
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      حاضر: {reportData.attendanceHistory.filter((a) => a.status === "present").length}
                    </span>
                    <span className="text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                      غائب: {reportData.attendanceHistory.filter((a) => a.status === "absent").length}
                    </span>
                  </div>
                )}
              </div>

              {!reportData.attendanceHistory || reportData.attendanceHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500 font-medium">
                  لم يتم تسجيل أي حضور أو غياب بعد. سيتم تحديث هذا الجدول فوراً عند مسح كود الطالب بالسنتر بواسطة المشرفين.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {reportData.attendanceHistory.map((att) => (
                    <div
                      key={att.id}
                      className={`p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                        att.status === "present"
                          ? "bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/80"
                          : att.status === "absent"
                          ? "bg-rose-50/40 hover:bg-rose-50/70 border-rose-200/80"
                          : "bg-amber-50/40 hover:bg-amber-50/70 border-amber-200/80"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 font-bold text-sm">
                            حصة يوم {att.date}
                          </strong>
                          {att.center && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-semibold">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {att.center}
                            </span>
                          )}
                        </div>
                        {att.notes && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 font-medium">
                            <MessageSquareQuote className="w-3 h-3 text-blue-600" />
                            <span>ملاحظة المشرف: {att.notes}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {att.checkInTime && (
                          <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200">
                            وقت المسح: {att.checkInTime}
                          </span>
                        )}
                        {att.status === "present" && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> حاضر ✓
                          </span>
                        )}
                        {att.status === "absent" && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-50 text-rose-700 font-bold border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" /> غائب ✕
                          </span>
                        )}
                        {att.status === "late" && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> متأخر ⏳
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subadmin Behavior & Observations */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <MessageSquareQuote className="w-4.5 h-4.5 text-blue-600" />
                  <span>ملاحظات المشرفين (Subadmin) وسلوك الطالب</span>
                </h3>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full shadow-2xs">
                  تقييم ومتابعة الحصص
                </span>
              </div>

              {(() => {
                const sessionNotes = (reportData.attendanceHistory || []).filter((a) => a.notes && a.notes.trim() !== "");
                const studentGeneralNotes = reportData.student.notes && reportData.student.notes.trim() !== "";
                const behavioralNotifs = (reportData.notifications || []).filter(
                  (n) => n.type === "warning" || n.title.includes("سلوك") || n.title.includes("تنبيه") || n.title.includes("ملاحظة")
                );

                const hasAnyNotes = sessionNotes.length > 0 || studentGeneralNotes || behavioralNotifs.length > 0;

                if (!hasAnyNotes) {
                  return (
                    <div className="p-6 text-center bg-slate-50/80 rounded-2xl text-xs text-slate-600 font-medium space-y-1">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-slate-800">سلوك الطالب ممتاز ومنتظم ✓</p>
                      <p className="text-[11px] text-slate-500">
                        لا توجد أية ملاحظات سلبية أو تنبيهات سلوكية مسجلة من المشرفين حتى الآن.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {sessionNotes.map((att) => (
                      <div key={att.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">حصة {att.date}</span>
                            {att.center && (
                              <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                                {att.center}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {att.recordedBy ? `المشرف: ${att.recordedBy}` : "مشرف السنتر"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-2.5 rounded-xl border border-slate-100">
                          "{att.notes}"
                        </p>
                      </div>
                    ))}

                    {behavioralNotifs.map((notif) => (
                      <div key={notif.id} className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <strong className="text-amber-950 font-bold">{notif.title}</strong>
                          <span className="text-[10px] text-amber-800 font-semibold">{formatDate(notif.createdAt)}</span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed font-medium">
                          {notif.message}
                        </p>
                      </div>
                    ))}

                    {studentGeneralNotes && (
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
                        <span className="text-[10px] font-bold text-slate-500 block">ملاحظة عامة من الإدارة:</span>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {reportData.student.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Quiz History */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-4.5 h-4.5 text-blue-600" />
                  <span>نتائج وتقييمات الكويزات والاختبارات ({reportData.quizHistory.length})</span>
                </h3>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full self-start sm:self-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span>متابعة وتحديث فوري للدرجات</span>
                </span>
              </div>

              {reportData.quizHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500 font-medium">
                  لم يؤدِّ الطالب أية اختبارات حتى الآن. سيصلك إشعار فوري هنا وتنبيه صوتي بمجرد انتهاء الطالب من أول اختبار.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {reportData.quizHistory.map((quiz, idx) => {
                    const title = quiz.quizTitle || `اختبار تقييمي #${quiz.quizId}`;
                    const pct = quiz.percentage !== undefined ? quiz.percentage : quiz.score;
                    const scoreOutOfTotal = quiz.totalQuestions ? `${quiz.score} من ${quiz.totalQuestions}` : null;
                    return (
                      <div key={idx} className="p-4 bg-slate-50/80 hover:bg-slate-100/80 transition-colors rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{title}</span>
                            {idx === 0 && (
                              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200">
                                أحدث اختبار
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span>تاريخ الاختبار: {formatDate(quiz.createdAt)}</span>
                            {quiz.timeSpentSeconds > 0 && (
                              <span>• المدة: {formatSeconds(quiz.timeSpentSeconds)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {scoreOutOfTotal && (
                            <span className="px-2.5 py-1 bg-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs">
                              {scoreOutOfTotal}
                            </span>
                          )}
                          <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs ${quiz.passed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                            {pct}% ({quiz.passed ? "ناجح ومجتاز ✓" : "لم يجتز ✕"})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const scoreStr = quiz.totalQuestions ? `${quiz.score} من ${quiz.totalQuestions}` : `${quiz.score}%`;
                              const text = `📊 تقرير اختبار - أكاديمية د. محمود المهدي للبرمجة:\nالطالب: ${reportData.student.name}\nالاختبار: ${title}\nالنتيجة: ${scoreStr} (${pct}%)\nالحالة: ${quiz.passed ? "اجتاز الاختبار بنجاح ✓" : "يحتاج لمراجعة ✕"}\nالتاريخ: ${formatDate(quiz.createdAt)}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                            }}
                            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all shadow-2xs"
                            title="مشاركة النتيجة عبر واتساب"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Login / Register / Recover Toggle Card */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-lg mx-auto space-y-6">
            
            {/* Form Mode Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => { setActiveMode("login"); setRecoveredCode(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeMode === "login" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => { setActiveMode("register"); setRecoveredCode(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeMode === "register" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                تسجيل جديد
              </button>
              <button
                type="button"
                onClick={() => { setActiveMode("recover"); setRecoveredCode(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeMode === "recover" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                نسيت الكود؟
              </button>
            </div>

            {activeMode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="p-3.5 bg-blue-50/60 border border-blue-200/70 rounded-2xl text-xs text-blue-900 space-y-0.5">
                  <span className="font-bold block text-[12px]">💡 مرونة في تسجيل الدخول:</span>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    يمكنك الدخول مباشرةً بـ <strong>كود ولي الأمر (PAR-...)</strong> أو بـ <strong>كود الطالب</strong> مع رقم هاتف ولي الأمر.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">رقم هاتف ولي الأمر:</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقم هاتفك المسجل..."
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(normalizeArabicDigits(e.target.value))}
                      className="w-full pr-10 pl-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">كود الدخول (كود ولي الأمر أو كود الطالب):</label>
                    <button
                      type="button"
                      onClick={() => setActiveMode("recover")}
                      className="text-[11px] text-blue-600 hover:underline font-bold"
                    >
                      نسيت كودك؟
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: PAR-839201 أو كود الطالب"
                      value={loginCode}
                      onChange={(e) => setLoginCode(normalizeArabicDigits(e.target.value))}
                      className="w-full pr-10 pl-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-wider transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>الدخول لبوابة المتابعة</span>}
                </button>
              </form>
            ) : activeMode === "recover" ? (
              <form onSubmit={handleRecoverCode} className="space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
                  <strong className="font-bold block text-slate-900">استرداد كود ولي الأمر المفقود:</strong>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    اكتب رقم هاتفك ورقم هاتف ابنك المسجل في المنصة وسيقوم النظام باستعادة الكود لك فوراً.
                  </p>
                </div>

                {recoveredCode ? (
                  <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl text-center space-y-2">
                    <span className="text-xs font-bold text-blue-900 block">تم استرداد الكود الخاص بك بنجاح:</span>
                    <strong className="font-mono text-xl text-blue-700 bg-white border border-blue-200 px-4 py-1.5 rounded-xl inline-block shadow-2xs font-extrabold">
                      {recoveredCode}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setActiveMode("login")}
                      className="w-full py-2.5 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs block cursor-pointer"
                    >
                      الانتقال والدخول للبوابة الآن ✓
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800">رقم هاتف ولي الأمر:</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="أدخل رقم هاتفك..."
                          value={recoverPhone}
                          onChange={(e) => setRecoverPhone(normalizeArabicDigits(e.target.value))}
                          className="w-full pr-10 pl-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800">رقم هاتف الطالب أو كود الطالب المسجل:</label>
                      <div className="relative">
                        <Users className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="أدخل رقم هاتف أو كود الطالب..."
                          value={recoverStudentQuery}
                          onChange={(e) => setRecoverStudentQuery(normalizeArabicDigits(e.target.value))}
                          className="w-full pr-10 pl-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>استرداد الكود الخاص بي 🔑</span>}
                    </button>
                  </>
                )}
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">اسم ولي الأمر الكامل:</label>
                  <input
                    type="text"
                    required
                    placeholder="أدخل اسمك الكامل..."
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">رقم هاتف ولي الأمر:</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقم هاتفك..."
                      value={regPhone}
                      onChange={(e) => setRegPhone(normalizeArabicDigits(e.target.value))}
                      className="w-full pr-10 pl-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">رقم هاتف الطالب أو كود الطالب المسجل بالمنصة:</label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقم هاتف أو كود ابنك المسجل في المنصة..."
                      value={regStudentQuery}
                      onChange={(e) => setRegStudentQuery(normalizeArabicDigits(e.target.value))}
                      className="w-full pr-10 pl-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>تسجيل وتوليد كود ولي الأمر</span>}
                </button>
              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default ParentPortal;
