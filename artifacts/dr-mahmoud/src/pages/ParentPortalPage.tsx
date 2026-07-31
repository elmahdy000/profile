import React, { useState, useEffect, useRef } from "react";
import { Users, Phone, KeyRound, ArrowRight, ShieldCheck, CheckCircle2, Video, Award, Clock, LogOut, RefreshCw, AlertCircle, FileText, Bell, BellRing, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    learningMode: string;
    paymentStatus: string;
    lastLoginAt?: string | null;
    lastActiveAt?: string | null;
    createdAt: string;
    daysInactive: number;
    isInactive: boolean;
    watchedCount: number;
    completedCount: number;
    quizzesCount: number;
    passedQuizzesCount: number;
  };
  watchHistory: Array<{
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
    score: number;
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
  const [activeMode, setActiveMode] = useState<"login" | "register" | "report">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevNotificationCountRef = useRef<number | null>(null);

  // Register form state
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regStudentQuery, setRegStudentQuery] = useState("");

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

        // Detect new admin notifications & trigger sound chime + toast
        if (json.notifications && json.notifications.length > 0) {
          const currentCount = json.notifications.length;
          if (prevNotificationCountRef.current !== null && currentCount > prevNotificationCountRef.current) {
            const latest = json.notifications[0];
            if (soundEnabled) playNotificationChime();
            toast({
              title: `تنبيه جديد من الإدارة: ${latest.title}`,
              description: latest.message,
            });
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
    if (!regName.trim() || !regPhone.trim() || !regStudentQuery.trim()) {
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
          name: regName,
          phone: regPhone,
          studentIdentifier: regStudentQuery,
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
    if (!loginPhone.trim() || !loginCode.trim()) {
      toast({ title: "بيانات غير مكتملة", description: "يرجى إدخال رقم الهاتف وكود ولي الأمر", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/parent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: loginPhone,
          parentCode: loginCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الدخول");

      toast({ title: "مرحباً بك", description: `أهلاً بك يا ${data.parentName}` });
      fetchReport();
    } catch (err: any) {
      toast({ title: "خطأ في الدخول", description: err.message, variant: "destructive" });
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
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-right" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Portal Header */}
        <div className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#0B63CE] text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>بوابة ولي الأمر الرسمية لمتابعة الطالب</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">أكاديمية د. محمود المهدي للبرمجة</h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            متابعة دقيقة ومستمرة لنسبة إنجاز ابنك، الدروس المسموعة بالدقيقة والتاريخ، وتنبيهات صوتية فورية للإدارة.
          </p>
        </div>

        {/* Dynamic Mode Content */}
        {activeMode === "report" && reportData ? (
          <div className="space-y-6">
            
            {/* Parent & Student Overview Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-xl shadow-lg shadow-blue-500/20 shrink-0">
                    {reportData.student.name.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900">{reportData.student.name}</h2>
                      {reportData.student.grade && (
                        <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
                          {reportData.student.grade}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5">
                      <span>مرحبا ولي الأمر: <strong className="text-slate-900 font-bold">{reportData.parent.name}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        كود التتبع: 
                        <strong className="font-mono bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded-lg font-bold text-xs">
                          {reportData.parent.parentCode}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
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
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {soundEnabled ? <BellRing className="w-4 h-4 text-emerald-600 animate-pulse" /> : <Bell className="w-4 h-4" />}
                    <span>{soundEnabled ? "التنبيهات مفعّلة" : "التنبيهات مكتومة"}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                  >
                    <LogOut className="w-4 h-4 text-slate-500" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>

              {/* Status Banner Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className={`p-4 rounded-2xl border transition-all ${
                  reportData.student.isInactive 
                    ? "bg-rose-50/80 border-rose-200 text-rose-900" 
                    : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                }`}>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">حالة نشاط الطالب</span>
                  {reportData.student.isInactive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      منقطع ({reportData.student.daysInactive} أيام)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      نشاط طبيعي ومتابع
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">الدروس المكتملة والمشاهدة</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-slate-900">{reportData.student.completedCount}</span>
                    <span className="text-xs text-slate-500 font-semibold">من {reportData.student.watchedCount} درس</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">اختبارات تم اجتيازها</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-purple-700">{reportData.student.passedQuizzesCount}</span>
                    <span className="text-xs text-slate-500 font-semibold">من {reportData.student.quizzesCount} كويز</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">آخر موعد لتواجد الطالب</span>
                  <span className="text-xs font-bold text-slate-900 block truncate">{formatDate(reportData.student.lastLoginAt)}</span>
                </div>
              </div>
            </div>

            {/* Admin Notifications Alert Box */}
            {reportData.notifications && reportData.notifications.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Bell className="w-4.5 h-4.5 text-[#0B63CE]" />
                    <span>إشعارات وتنبيهات المحاضر والإدارة ({reportData.notifications.length})</span>
                  </h3>
                  <span className="text-[11px] font-bold text-[#0B63CE] bg-white border border-blue-200 px-3 py-1 rounded-full shadow-2xs">
                    🔔 جرس التنبيه مفعل
                  </span>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {reportData.notifications.map((notif) => (
                    <div key={notif.id} className="p-4 bg-white rounded-2xl border border-slate-200/80 space-y-1.5 text-xs shadow-2xs">
                      <div className="flex items-center justify-between">
                        <strong className="font-bold text-slate-900 text-sm">{notif.title}</strong>
                        <span className="text-[10px] text-slate-400 font-semibold">{formatDate(notif.createdAt)}</span>
                      </div>
                      <p className="text-slate-700 text-xs leading-relaxed font-medium">{notif.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Watch History */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Video className="w-4.5 h-4.5 text-[#0B63CE]" />
                  <span>سجل مشاهدة واستماع المحاضرات بالتفصيل ({reportData.watchHistory.length})</span>
                </h3>
              </div>

              {reportData.watchHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500 font-medium">
                  لم يقم الطالب بمشاهدة أية دروس حتى الآن.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {reportData.watchHistory.map((watch, idx) => (
                    <div key={idx} className="p-4 bg-slate-50/80 hover:bg-slate-100/80 transition-colors rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <strong className="block font-bold text-slate-900 text-sm">{watch.videoTitle}</strong>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md font-bold">{watch.category}</span>
                          {watch.stage && <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">{watch.stage}</span>}
                          <span>تاريخ المشاهدة: {formatDate(watch.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="sm:text-left flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                        <div className="flex items-center gap-2 justify-between sm:justify-end mb-1.5">
                          <span className="text-[11px] text-slate-500 font-mono">التقدم:</span>
                          <span className="font-extrabold text-emerald-600 text-xs">{watch.progress}%</span>
                          <span className="text-[11px] text-slate-400 font-mono">({formatSeconds(watch.currentTimeSeconds)})</span>
                        </div>
                        <div className="w-full sm:w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${watch.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quiz History */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-purple-600" />
                <span>نتائج وتقييمات الكويزات والاختبارات ({reportData.quizHistory.length})</span>
              </h3>

              {reportData.quizHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500 font-medium">
                  لم يؤدِّ الطالب أية اختبارات حتى الآن.
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {reportData.quizHistory.map((quiz, idx) => (
                    <div key={idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block mb-1">اختبار كويز #{quiz.quizId}</span>
                        <span className="text-[11px] text-slate-500">{formatDate(quiz.createdAt)}</span>
                      </div>
                      <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs ${quiz.passed ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-100 text-rose-800 border border-rose-300"}`}>
                        النتيجة: {quiz.score}% ({quiz.passed ? "ناجح ومجتاز ✓" : "لم يجتز ✕"})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Login / Register Toggle Card */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-lg mx-auto space-y-6">
            
            {/* Form Mode Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveMode("login")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeMode === "login" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                تسجيل الدخول بكود ولي الأمر
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("register")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeMode === "register" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                تسجيل جديد وإصدار كود
              </button>
            </div>

            {activeMode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">رقم هاتف ولي الأمر:</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="أدخل رقم هاتفك المسجل..."
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">كود ولي الأمر (Parent Code):</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: PAR-839201"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B63CE] font-mono tracking-wider"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-[#0B63CE] hover:bg-[#0952AC] text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>الدخول لبوابة المتابعة</span>}
                </button>
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
                    className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
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
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
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
                      placeholder="أدخل رقم هاتف ابنك المسجل في المنصة..."
                      value={regStudentQuery}
                      onChange={(e) => setRegStudentQuery(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-[#0B63CE] hover:bg-[#0952AC] text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2"
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
