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
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0B63CE]/10 text-[#0B63CE] font-black flex items-center justify-center text-xl border border-[#0B63CE]/20">
                    {reportData.student.name.substring(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{reportData.student.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>ولي الأمر: <strong className="text-slate-800 font-bold">{reportData.parent.name}</strong></span>
                      <span>•</span>
                      <span>كود التتبع الخاص بك: <strong className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold">{reportData.parent.parentCode}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundEnabled;
                      setSoundEnabled(next);
                      if (next) playNotificationChime();
                      toast({ title: next ? "تم تفعيل التنبيهات الصوتية 🔔" : "تم كتم التنبيهات الصوتية 🔕" });
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      soundEnabled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {soundEnabled ? <BellRing className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> : <Bell className="w-3.5 h-3.5" />}
                    <span>{soundEnabled ? "التنبيهات الصوتية مفعّلة" : "التنبيهات الصوتية مكتومة"}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-slate-500" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">حالة النشاط والمتابعة</span>
                  {reportData.student.isInactive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600">
                      <AlertCircle className="w-4 h-4" />
                      منقطع ({reportData.student.daysInactive} أيام)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      متابع ونشط
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">الدروس المسموعة</span>
                  <span className="text-base font-black text-slate-900">
                    {reportData.student.completedCount} من أصل {reportData.student.watchedCount} درس
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">الاختبارات المجتازة</span>
                  <span className="text-base font-black text-slate-900">
                    {reportData.student.passedQuizzesCount} من أصل {reportData.student.quizzesCount} اختبار
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">آخر موعد دخول</span>
                  <span className="text-xs font-bold text-slate-800">{formatDate(reportData.student.lastLoginAt)}</span>
                </div>
              </div>
            </div>

            {/* Admin Notifications Alert Box */}
            {reportData.notifications && reportData.notifications.length > 0 && (
              <div className="bg-[#0B63CE]/5 border border-[#0B63CE]/20 rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#0B63CE]" />
                    <span>تنبيهات وإشعارات الإدارة الموجهة للطالب ({reportData.notifications.length})</span>
                  </h3>
                  <span className="text-[11px] font-bold text-[#0B63CE] bg-[#0B63CE]/10 px-2.5 py-0.5 rounded-full">
                    مصحوبة بتنبيه صوتي 🔔
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {reportData.notifications.map((notif) => (
                    <div key={notif.id} className="p-3.5 bg-white rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <strong className="font-bold text-slate-900">{notif.title}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">{formatDate(notif.createdAt)}</span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed">{notif.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Watch History */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#0B63CE]" />
                  <span>سجل استماع ومشاهدة الدروس بالتفصيل ({reportData.watchHistory.length})</span>
                </h3>
              </div>

              {reportData.watchHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500">
                  لم يقم الطالب بمشاهدة أية دروس بعد.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {reportData.watchHistory.map((watch, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <strong className="block font-bold text-slate-900 text-sm mb-1">{watch.videoTitle}</strong>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">{watch.category}</span>
                          <span>تاريخ المشاهدة: {formatDate(watch.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="text-left flex-shrink-0">
                        <div className="flex items-center gap-2 justify-end mb-1">
                          <span className="font-bold text-emerald-600">{watch.progress}%</span>
                          <span className="text-[11px] text-slate-500 font-mono">({formatSeconds(watch.currentTimeSeconds)})</span>
                        </div>
                        <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${watch.progress}%` }} />
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
                <Award className="w-4 h-4 text-purple-600" />
                <span>نتائج وتقييمات الاختبارات ({reportData.quizHistory.length})</span>
              </h3>

              {reportData.quizHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500">
                  لم يؤدِّ الطالب أية اختبارات حتى الآن.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {reportData.quizHistory.map((quiz, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block mb-1">اختبار رقم #{quiz.quizId}</span>
                        <span className="text-[11px] text-slate-500">{formatDate(quiz.createdAt)}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold ${quiz.passed ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-rose-100 text-rose-700 border border-rose-200"}`}>
                        الدرجة: {quiz.score}% ({quiz.passed ? "ناجح ومجتاز" : "لم يجتز"})
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
