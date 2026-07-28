import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  BookOpen,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { SearchableCombobox, EGYPT_GOVERNORATES } from "@/components/ui/SearchableCombobox";
import {
  RegistrationStageSelector,
  createDefaultRegistrationStage,
} from "@/components/ui/RegistrationStageSelector";
import type { Student } from "@/types/platform";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(deviceId ? { "X-Device-Id": deviceId } : {}),
      ...(options?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || "حدث خطأ في الاتصال بالسيرفر");
  }
  return data as T;
}

function getOrCreateDeviceId(): string {
  const key = "dr_mahmoud_device_id";
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    const raw = `${navigator.userAgent}_${screen.width}x${screen.height}_${Math.random()}`;
    deviceId = "dev_" + btoa(raw).replace(/[^a-zA-Z0-9]/g, "").substring(0, 32);
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}

export function AccessScreen({
  onLogin,
}: {
  onLogin: (student: Student) => void;
}) {
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [regStep, setRegStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [rememberCode, setRememberCode] = useState(false);
  const [registeredCode, setRegisteredCode] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [recoveryForm, setRecoveryForm] = useState({ name: "", phone: "" });

  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const shouldStartRegistration = urlParams.get("action") === "register";
  const requestedTrack = urlParams.get("track");

  const [form, setForm] = useState(() => ({
    name: "",
    phone: "",
    email: "",
    governorate: "",
    city: "",
    ...createDefaultRegistrationStage(),
    ...(shouldStartRegistration && {
      educationSystem: "university" as const,
      schoolType: "none" as const,
      academicTrack: requestedTrack === "engineering" ? "engineering" as const : "computer_science" as const,
    }),
    otherGradeDetail: "",
    learningMode: "online" as "online" | "offline",
  }));

  useEffect(() => {
    if (shouldStartRegistration) {
      setMode("register");
    }
  }, [shouldStartRegistration]);

  useEffect(() => {
    const remembered = localStorage.getItem("dr_mahmoud_student_code");
    if (remembered) {
      setAccessCode(remembered);
      setRememberCode(true);
    }
  }, []);

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const deviceId = getOrCreateDeviceId();
      const result = await api<{ student: Student }>("/api/student/login", {
        method: "POST",
        body: JSON.stringify({ accessCode, deviceId }),
      });
      if (rememberCode)
        localStorage.setItem("dr_mahmoud_student_code", accessCode.trim().toUpperCase());
      else localStorage.removeItem("dr_mahmoud_student_code");
      onLogin(result.student);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submitRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setRegisteredCode("");
    try {
      const result = await api<{ status: string; accessCode?: string; message: string }>("/api/student/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (result.accessCode) {
        setRegisteredCode(result.accessCode);
        setMessage("✅ تم تفعيل حسابك!");
      } else {
        setMessage(result.message);
      }
      setForm({
        name: "",
        phone: "",
        email: "",
        governorate: "",
        city: "",
        ...createDefaultRegistrationStage(),
        otherGradeDetail: "",
        learningMode: "online",
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submitRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ message: string }>("/api/student/recovery-requests", {
        method: "POST",
        body: JSON.stringify(recoveryForm),
      });
      setMessage(result.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const normalizedPhone = form.phone.replace(/\s+/g, "");
  const nameValid = form.name.trim().length >= 2;
  const phoneValid = /^\+?\d{10,15}$/.test(normalizedPhone);
  const emailValid = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const educationValid = Boolean(
    form.educationSystem &&
      form.educationGrade &&
      form.academicTrack &&
      (form.educationSystem === "university" || form.schoolType) &&
      form.grade,
  );
  const step1Valid = Boolean(nameValid && phoneValid && emailValid && form.governorate && form.city);
  const registrationValid = Boolean(step1Valid && educationValid && form.learningMode);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("app-theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<"dark" | "light">) => {
      setTheme(e.detail);
    };
    window.addEventListener("app-theme-changed", handleThemeChange as EventListener);
    return () => window.removeEventListener("app-theme-changed", handleThemeChange as EventListener);
  }, []);

  const isLight = theme === "light";

  return (
    <main
      className={`relative min-h-[calc(100vh-4rem)] w-full overflow-x-hidden px-3 sm:px-6 py-3 sm:py-5 lg:py-7 dir-rtl font-sans transition-colors duration-300 ${
        isLight ? "bg-[#F8FAFC] text-slate-900" : "bg-[#07111F] text-[#F8FAFC]"
      }`}
      dir="rtl"
    >
      <div className={`absolute top-0 right-1/4 h-[300px] sm:h-[500px] w-[300px] sm:w-[500px] rounded-full blur-[100px] sm:blur-[140px] pointer-events-none ${isLight ? "bg-blue-200/40" : "bg-[#3B82F6]/10"}`} />
      <div className={`absolute bottom-0 left-1/4 h-[300px] sm:h-[500px] w-[300px] sm:w-[500px] rounded-full blur-[120px] sm:blur-[160px] pointer-events-none ${isLight ? "bg-sky-200/40" : "bg-[#1E3A5F]/20"}`} />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <div className="relative mx-auto grid max-w-[1440px] items-start gap-5 sm:gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 xl:gap-14">
        {/* Introductory Content Column */}
        <div className="space-y-6 text-right order-2 lg:order-1">
          <div className={`inline-flex h-[36px] items-center gap-2 rounded-full border px-3.5 text-xs font-semibold backdrop-blur-md ${
            isLight ? "border-blue-300 bg-blue-50 text-blue-800" : "border-[rgba(96,165,250,0.24)] bg-[rgba(59,130,246,0.10)] text-[#BFDBFE]"
          }`}>
            <ShieldCheck className={`h-4 w-4 ${isLight ? "text-blue-600" : "text-[#60A5FA]"}`} />
            <span>منصة تعليمية آمنة ومخصصة للطلاب وأولياء الأمور</span>
          </div>

          <h1 className="tracking-tight leading-[1.2]">
            <span className={`block text-[30px] sm:text-[38px] lg:text-[45px] font-black ${isLight ? "text-slate-900" : "text-[#F8FAFC]"}`}>
              منصتك التعليمية
            </span>
            <span className="block text-[24px] sm:text-[30px] lg:text-[36px] font-extrabold text-[#3B82F6] mt-1">
              مع د. محمود المهدي
            </span>
          </h1>

          <p className={`text-sm sm:text-base leading-[1.8] max-w-[650px] font-normal ${isLight ? "text-slate-600" : "text-[#CBD5E1]"}`}>
            بوابتك الذكية للتأسيس العملي، مشاهدة الدروس، معاينة المذكرات، وحل الاختبارات التفاعلية. سجّل حسابك واطلع على محتوى مرحلتك فور تفعيل كود الدخول.
          </p>

          <div className="space-y-2.5">
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>خطوات الانضمام للمنصة:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative" aria-label="خطوات الانضمام للمنصة">
              {[
                ["1", "سجّل بياناتك", "أدخل اسمك ومرحلتك الدراسية"],
                ["2", "موافقة الأدمن", "استلم كود التفعيل المخصص"],
                ["3", "ابدأ التعلّم", "دروس ومذكرات واختبارات حية"],
              ].map(([number, label, desc], index) => (
                <div
                  key={number}
                  className={`relative flex flex-col justify-between rounded-[16px] border p-3.5 text-right transition-all duration-200 ${
                    isLight
                      ? "border-slate-200 bg-white shadow-xs hover:border-blue-400"
                      : "border-[rgba(148,163,184,0.18)] bg-[#101D31]/80 hover:border-[#3B82F6]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#3B82F6] text-xs font-extrabold text-white shadow-md shadow-blue-500/20">
                      {number}
                    </span>
                    {index < 2 && (
                      <div className="hidden sm:flex items-center gap-1 text-[#3B82F6]/60">
                        <span className="h-[2px] w-6 bg-gradient-to-l from-[#3B82F6]/50 to-transparent rounded-full" />
                        <span className="text-xs font-bold font-sans">←</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2.5">
                    <strong className={`block text-xs sm:text-sm font-bold ${isLight ? "text-slate-900" : "text-[#F8FAFC]"}`}>
                      {label}
                    </strong>
                    <span className={`mt-1 block text-xs font-medium leading-relaxed ${isLight ? "text-slate-600" : "text-[#CBD5E1]"}`}>
                      {desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0.5">
            {[
              ["دروس شرح منظمة", BookOpen, "مباشرة وأونلاين"],
              ["مذكرات وقوالب PDF", FileText, "معاينة داخل المنصة"],
              ["اختبارات وتقييم آلي", ClipboardCheck, "تصحيح ونتائج فورية"],
            ].map(([label, Icon, sub]) => (
              <div
                key={label as string}
                className={`rounded-[16px] border p-3 flex items-center gap-3 transition-all duration-200 ${
                  isLight
                    ? "border-slate-200 bg-white shadow-xs hover:border-blue-400"
                    : "border-[rgba(148,163,184,0.16)] bg-[#101D31]/72 hover:border-[#3B82F6]/35"
                }`}
              >
                <div className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] ${
                  isLight ? "bg-blue-50 text-blue-600" : "bg-[rgba(59,130,246,0.12)] text-[#60A5FA]"
                }`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <strong className={`block text-xs sm:text-sm font-bold truncate ${isLight ? "text-slate-900" : "text-[#F8FAFC]"}`}>{label as string}</strong>
                  <span className={`text-[11px] leading-tight block truncate mt-0.5 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>{sub as string}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Column */}
        <div className={`w-full rounded-[24px] border p-4 sm:p-6 transition-all order-1 lg:order-2 ${
          isLight
            ? "border-[#E2E8F0] bg-white shadow-md text-[#0F172A]"
            : "border-[rgba(148,163,184,0.20)] bg-[#101D31] shadow-[0_20px_60px_rgba(0,0,0,0.30)] text-[#F8FAFC]"
        }`}>
          <div className={`grid grid-cols-2 rounded-[14px] p-1 mb-4 border h-[46px] ${
            isLight ? "bg-[#F1F5F9] border-[#E2E8F0]" : "bg-[#091426] border-[rgba(148,163,184,0.15)]"
          }`}>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`rounded-[10px] h-full font-bold text-xs sm:text-sm transition-all duration-200 ${
                mode === "login"
                  ? isLight
                    ? "bg-white text-[#0866D9] shadow-xs border border-[#E2E8F0]"
                    : "bg-[rgba(59,130,246,0.20)] text-[#F8FAFC] border border-[#3B82F6]/40 shadow-xs"
                  : isLight
                  ? "text-[#475569] hover:text-[#0F172A]"
                  : "text-[#94A3B8] hover:text-[#CBD5E1]"
              }`}
            >
              دخول الطالب
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`rounded-[10px] h-full font-bold text-xs sm:text-sm transition-all duration-200 ${
                mode === "register"
                  ? isLight
                    ? "bg-white text-[#0866D9] shadow-xs border border-[#E2E8F0]"
                    : "bg-[rgba(59,130,246,0.20)] text-[#F8FAFC] border border-[#3B82F6]/40 shadow-xs"
                  : isLight
                  ? "text-[#475569] hover:text-[#0F172A]"
                  : "text-[#94A3B8] hover:text-[#CBD5E1]"
              }`}
            >
              تسجيل طالب جديد
            </button>
          </div>

          {mode === "register" && (registeredCode || message) ? (
            <div className="py-2 text-center" role="status">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#22C55E]/15 text-[#22C55E]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="mt-3 text-xl font-bold text-[#0F172A]">تم إنشاء حسابك وتفعيله فوراً 🎉</h2>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#64748B]">
                كود الدخول الخاص بك جاهز. احفظه جيداً واستخدمه للدخول إلى المنصة.
              </p>

              {registeredCode && (
                <div className="mt-4 rounded-[16px] border border-[#3B82F6]/40 bg-[#F8FAFC] p-4 text-center shadow-xs">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">كود الدخول الخاص بك</span>
                  <strong className="mt-1.5 block font-mono text-2xl font-bold text-[#0866D9] tracking-widest dir-ltr select-all">
                    {registeredCode}
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(registeredCode);
                      toast({ title: "تم نسخ الكود!" });
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#E8F1FF] px-3 py-1 text-xs font-bold text-[#0866D9] hover:bg-blue-100 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" /> نسخ الكود
                  </button>
                </div>
              )}

              <div className="mt-4 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-right text-xs space-y-1.5 leading-relaxed">
                <div className="flex items-start gap-2 text-[#16A34A] font-bold">
                  <span className="shrink-0 font-bold">1.</span>
                  <span><strong>أول فيديوهين مجانًا:</strong> يمكنك الدخول فوراً بالكود ومشاهدة أول درسين في كورساتك.</span>
                </div>
                <div className="flex items-start gap-2 text-[#0866D9] font-bold">
                  <span className="shrink-0 font-black">2.</span>
                  <span><strong>تأكيد الحجز:</strong> لفتح باقي فيديوهات المنصة والاختبارات، يرجى رفع إيصال الدفع من داخل حسابك، وسيقوم الأدمن بمراجعته وتأكيد الحجز لك.</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => {
                  if (registeredCode) setAccessCode(registeredCode);
                  setMode("login");
                  setMessage("");
                  setRegisteredCode("");
                }}
                className="mt-4 h-[48px] w-full rounded-[12px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-sm shadow-md transition-all duration-200"
              >
                الدخول للمنصة بالكود الآن 🚀
              </Button>
              <a
                href="https://wa.me/201044348610"
                className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-[12px] border border-[#CBD5E1] font-bold text-xs text-[#0866D9] hover:bg-blue-50 transition-colors"
              >
                محتاج مساعدة؟ كلمنا واتساب
              </a>
            </div>
          ) : mode === "recover" ? (
            <form onSubmit={submitRecovery} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[#F8FAFC]">استرجاع كود الدخول</h2>
                <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                  اكتب نفس الاسم ورقم الموبايل اللي سجلت بيهم، والأدمن هيراجع الطلب ويتواصل معاك بأمان.
                </p>
              </div>
              {message ? (
                <div className="rounded-[12px] border border-[#22C55E]/30 bg-[#22C55E]/10 p-3.5 text-xs font-bold leading-relaxed text-[#22C55E]" role="status">
                  {message}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 text-right">
                    <label htmlFor="recovery-name" className="block text-xs font-semibold text-[#E2E8F0]">اسم الطالب</label>
                    <input
                      id="recovery-name"
                      required
                      value={recoveryForm.name}
                      onChange={(event) => setRecoveryForm({ ...recoveryForm, name: event.target.value })}
                      className="h-[48px] w-full rounded-[12px] border border-[rgba(148,163,184,0.20)] bg-[#091426] px-3.5 text-[#F8FAFC] placeholder-[#64748B] text-xs focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.14)]"
                    />
                  </div>
                  <div className="space-y-1.5 text-right">
                    <label htmlFor="recovery-phone" className="block text-xs font-semibold text-[#E2E8F0]">رقم الموبايل المسجل</label>
                    <input
                      id="recovery-phone"
                      type="tel"
                      required
                      value={recoveryForm.phone}
                      onChange={(event) => setRecoveryForm({ ...recoveryForm, phone: event.target.value })}
                      className="h-[48px] w-full rounded-[12px] border border-[rgba(148,163,184,0.20)] bg-[#091426] px-3.5 text-left text-[#F8FAFC] placeholder-[#64748B] text-xs focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.14)]"
                      dir="ltr"
                    />
                  </div>
                  {error && <p role="alert" className="rounded-[12px] border border-[#F87171]/30 bg-[#F87171]/10 p-2.5 text-xs font-medium text-[#F87171]">{error}</p>}
                  <Button disabled={loading} className="h-[48px] w-full rounded-[12px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-sm shadow-md transition-all duration-200">
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <ShieldCheck className="h-4.5 w-4.5" />}
                    إرسال طلب الاسترجاع
                  </Button>
                </>
              )}
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setMessage(""); }}
                className="w-full text-center text-xs font-bold text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
              >
                رجوع لتسجيل الدخول
              </button>
            </form>
          ) : mode === "login" ? (
            <form onSubmit={submitLogin} className="space-y-4">
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold ${isLight ? "text-slate-900" : "text-[#F8FAFC]"}`}>دخول الطلاب</h2>
                <p className={`text-xs mt-1 leading-relaxed ${isLight ? "text-slate-600" : "text-[#94A3B8]"}`}>
                  اكتب كود الدخول المكوّن من 6 خانات المخصص لحسابك.
                </p>
              </div>
              <div className="space-y-1.5 text-right">
                <label htmlFor="student-code" className={`block text-xs font-semibold ${isLight ? "text-slate-700" : "text-[#E2E8F0]"}`}>
                  كود الدخول الشخصي
                </label>
                <div className="relative flex items-center">
                  <input
                    id="student-code"
                    type={showAccessCode ? "text" : "password"}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    required
                    autoComplete="one-time-code"
                    placeholder="A7K9P2"
                    className={`h-[48px] w-full rounded-[12px] border pl-11 pr-4 text-center font-mono text-lg sm:text-xl font-black tracking-widest focus:outline-none focus:ring-2 ${
                      isLight
                        ? "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                        : "border-[rgba(148,163,184,0.20)] bg-[#091426] text-[#FFFFFF] placeholder-[#475569] focus:border-[#3B82F6] focus:ring-[rgba(59,130,246,0.14)]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessCode((visible) => !visible)}
                    aria-label={showAccessCode ? "إخفاء كود الدخول" : "إظهار كود الدخول"}
                    aria-pressed={showAccessCode}
                    className={`absolute left-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      isLight ? "text-slate-500 hover:bg-slate-200 hover:text-slate-800" : "text-[#94A3B8] hover:bg-[rgba(59,130,246,0.15)] hover:text-[#60A5FA]"
                    }`}
                  >
                    {showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <label className={`flex cursor-pointer items-center gap-2.5 rounded-[12px] border p-2.5 transition-all ${
                isLight
                  ? "border-slate-200 bg-slate-50 hover:border-blue-300"
                  : "border-[rgba(148,163,184,0.18)] bg-[#091426] hover:border-[rgba(96,165,250,0.45)]"
              }`}>
                <input
                  type="checkbox"
                  checked={rememberCode}
                  onChange={(e) => setRememberCode(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 bg-white text-[#3B82F6] focus:ring-[#3B82F6]"
                />
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <strong className={`text-xs font-semibold ${isLight ? "text-slate-900" : "text-[#F8FAFC]"}`}>
                    افتكر الكود على هذا الجهاز
                  </strong>
                  <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
                    (تجنّب التفعيل على أجهزة عامة)
                  </span>
                </div>
              </label>
              {error && (
                <p role="alert" className="rounded-[12px] border border-[#F87171]/30 bg-[#F87171]/10 p-2.5 text-xs font-medium text-[#F87171]">
                  {error}
                </p>
              )}
              <Button disabled={loading} className="h-[48px] w-full rounded-[12px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-sm shadow-md transition-all duration-200">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <ShieldCheck className="h-4.5 w-4.5 ml-1.5" />} الدخول للمنصة
              </Button>
              <div className="pt-0.5 flex flex-col items-center gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => { setMode("recover"); setError(""); setMessage(""); }}
                  className="text-xs font-semibold text-[#3B82F6] hover:underline transition-colors"
                >
                  نسيت كود الدخول؟
                </button>
                <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
                  ليس لديك كود؟ اختر <strong>«تسجيل طالب جديد»</strong> لأخذ كودك مجاناً.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={submitRegistration} className="space-y-5" noValidate dir="rtl">
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold ${isLight ? "text-[#0F172A]" : "text-[#F8FAFC]"}`}>تسجيل طالب جديد</h2>
                <p className={`mt-1 text-xs leading-relaxed ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>
                  اكتب بيانات الطالب بدقة، وتأكد من موافقة ولي الأمر قبل تفعيل الحساب.
                </p>
              </div>

              <div className={`rounded-[16px] border p-2 ${
                isLight ? "border-[#E2E8F0] bg-[#F8FAFC]" : "border-[rgba(148,163,184,0.14)] bg-[#091426]"
              }`}>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {[
                    [1, "البيانات الأساسية"],
                    [2, "الدراسة"],
                    [3, "التأكيد"],
                  ].map(([stepNum, stepTitle]) => {
                    const isActive = regStep === stepNum;
                    const isCompleted = regStep > (stepNum as number);
                    return (
                      <button
                        key={stepNum as number}
                        type="button"
                        onClick={() => {
                          if (stepNum === 1 || (stepNum === 2 && step1Valid) || (stepNum === 3 && step1Valid && educationValid)) {
                            setRegStep(stepNum as number);
                          }
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-[12px] py-2 px-2 transition-all duration-200 text-xs font-bold ${
                          isActive
                            ? "bg-[#0866D9] text-white shadow-xs"
                            : isCompleted
                            ? isLight ? "bg-[#E8F1FF] text-[#0866D9]" : "bg-[rgba(59,130,246,0.15)] text-[#60A5FA]"
                            : isLight ? "bg-transparent text-[#64748B]" : "bg-transparent text-[#94A3B8]"
                        }`}
                      >
                        <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-extrabold ${
                          isActive
                            ? "bg-white text-[#0866D9]"
                            : isCompleted
                            ? "bg-[#0866D9] text-white"
                            : isLight ? "bg-slate-200 text-[#64748B]" : "bg-slate-800 text-[#94A3B8]"
                        }`}>
                          {isCompleted ? "✓" : (stepNum as number)}
                        </span>
                        <span className="truncate">{stepTitle as string}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {regStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className={`rounded-[18px] border p-5 space-y-4 shadow-xs ${
                    isLight ? "border-[#E2E8F0] bg-white" : "border-[rgba(148,163,184,0.14)] bg-[#091426]/60"
                  }`}>
                    <div className={`flex items-center gap-2.5 border-b pb-3 ${isLight ? "border-[#E2E8F0]" : "border-[rgba(148,163,184,0.14)]"}`}>
                      <span className={`grid h-[30px] w-[30px] place-items-center rounded-full text-xs font-bold ${
                        isLight ? "bg-[#E8F1FF] text-[#0866D9]" : "bg-[#3B82F6]/20 text-[#60A5FA]"
                      }`}>
                        01
                      </span>
                      <div>
                        <h3 className={`text-sm font-bold ${isLight ? "text-[#0F172A]" : "text-[#F8FAFC]"}`}>البيانات الأساسية</h3>
                        <p className={`text-xs ${isLight ? "text-[#64748B]" : "text-[#94A3B8]"}`}>بيانات التواصل والموقع الخاصة بالطالب</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col text-xs font-semibold">
                        <label htmlFor="student-name" className={`mb-1.5 block text-xs font-semibold ${isLight ? "text-[#334155]" : "text-[#E2E8F0]"}`}>
                          اسم الطالب <span className="text-[#EF4444]">*</span>
                        </label>
                        <input
                          id="student-name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                          placeholder="الاسم ثلاثي أو رباعي"
                          aria-invalid={Boolean(form.name) && !nameValid}
                          className={`h-[56px] w-full rounded-[12px] border px-4 text-sm font-medium outline-none transition focus:border-[#3B82F6] focus:ring-4 focus:ring-[#3B82F6]/12 ${
                            isLight
                              ? "border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:bg-white"
                              : "border-[rgba(148,163,184,0.20)] bg-[#091426] text-[#F8FAFC] placeholder-[#64748B] focus:bg-[#091426]"
                          }`}
                        />
                        {form.name && !nameValid && <p className="mt-1 text-xs text-[#EF4444]">اكتب اسم الطالب بشكل صحيح (حرفين على الأقل).</p>}
                      </div>
                      <div className="flex flex-col text-xs font-semibold">
                        <label htmlFor="student-phone" className={`mb-1.5 block text-xs font-semibold ${isLight ? "text-[#334155]" : "text-[#E2E8F0]"}`}>
                          رقم الهاتف <span className="text-[#EF4444]">*</span>
                        </label>
                        <input
                          id="student-phone"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          required
                          inputMode="tel"
                          placeholder="01XXXXXXXXX"
                          dir="ltr"
                          aria-invalid={Boolean(form.phone) && !phoneValid}
                          className={`h-[56px] w-full rounded-[12px] border px-4 text-left font-mono text-sm font-medium outline-none transition focus:border-[#3B82F6] focus:ring-4 focus:ring-[#3B82F6]/12 ${
                            isLight
                              ? "border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:bg-white"
                              : "border-[rgba(148,163,184,0.20)] bg-[#091426] text-[#F8FAFC] placeholder-[#64748B] focus:bg-[#091426]"
                          }`}
                        />
                        {form.phone && !phoneValid && <p className="mt-1 text-xs text-[#EF4444]">رقم الهاتف من 10 إلى 15 رقمًا.</p>}
                      </div>
                    </div>

                    <div className="flex flex-col text-xs font-semibold">
                      <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="student-email" className={`text-xs font-semibold ${isLight ? "text-[#334155]" : "text-[#E2E8F0]"}`}>
                          البريد الإلكتروني
                        </label>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-normal ${isLight ? "bg-slate-100 text-[#64748B]" : "bg-[#091426] border border-[rgba(148,163,184,0.15)] text-[#94A3B8]"}`}>
                          اختياري
                        </span>
                      </div>
                      <input
                        id="student-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        dir="ltr"
                        placeholder="student@example.com"
                        aria-invalid={!emailValid}
                        className={`h-[56px] w-full rounded-[12px] border px-4 text-left font-sans text-sm font-medium outline-none transition focus:border-[#3B82F6] focus:ring-4 focus:ring-[#3B82F6]/12 ${
                          isLight
                            ? "border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:bg-white"
                            : "border-[rgba(148,163,184,0.20)] bg-[#091426] text-[#F8FAFC] placeholder-[#64748B] focus:bg-[#091426]"
                        }`}
                      />
                      {!emailValid && <p className="mt-1 text-xs text-[#EF4444]">صيغة البريد الإلكتروني غير صحيحة.</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <SearchableCombobox
                        id="student-governorate"
                        label="المحافظة"
                        value={form.governorate}
                        onChange={(val) => setForm({ ...form, governorate: val, city: "" })}
                        options={Object.keys(EGYPT_GOVERNORATES)}
                        placeholder="اختر المحافظة..."
                        required
                        isLight={isLight}
                      />
                      <SearchableCombobox
                        id="student-city"
                        label="المدينة / المركز"
                        value={form.city}
                        onChange={(val) => setForm({ ...form, city: val })}
                        options={
                          form.governorate && EGYPT_GOVERNORATES[form.governorate]
                            ? EGYPT_GOVERNORATES[form.governorate]
                            : []
                        }
                        placeholder="اختر المدينة..."
                        required
                        isLight={isLight}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      disabled={!step1Valid}
                      onClick={() => setRegStep(2)}
                      className={`h-[44px] sm:h-[46px] min-w-[120px] rounded-[12px] px-5 font-bold text-xs sm:text-sm transition-all duration-200 ${
                        !step1Valid
                          ? isLight
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
                            : "bg-[#1E293B] text-slate-500 cursor-not-allowed border border-slate-800"
                          : "bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm"
                      }`}
                    >
                      التالي ←
                    </Button>
                  </div>
                </div>
              )}

              {regStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2.5 border-b border-[#E2E8F0] pb-3">
                      <span className="grid h-[30px] w-[30px] place-items-center rounded-full text-xs font-bold bg-[#E8F1FF] text-[#0866D9]">
                        02
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-[#0F172A]">النظام والمرحلة الدراسية</h3>
                        <p className="text-xs text-[#64748B]">حدد النظام والصف الحالي لعرض المحتوى المناسب للطالب</p>
                      </div>
                    </div>

                    <RegistrationStageSelector
                      value={form}
                      onChange={(selection) => setForm({ ...form, ...selection, otherGradeDetail: "" })}
                    />

                    <fieldset className="space-y-3 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <legend className="px-1 text-xs font-bold uppercase text-[#0866D9] tracking-wide">
                        طريقة المتابعة والدراسة
                      </legend>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {(
                          [
                            ["online", "أونلاين", "متابعة فيديوهات الأونلاين"],
                            ["offline", "أوفلاين", "متابعة فيديوهات السنتر"],
                          ] as const
                        ).map(([value, label, description]) => (
                          <label
                            key={value}
                            className={`relative flex min-h-[56px] cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-[#3B82F6]/30 ${
                              form.learningMode === value
                                ? "border-[#3B82F6] bg-[#E8F1FF] text-[#0F172A]"
                                : "border-[#CBD5E1] bg-white text-[#334155] hover:border-[#3B82F6]/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="learning-mode"
                              value={value}
                              checked={form.learningMode === value}
                              onChange={() => setForm({ ...form, learningMode: value })}
                              className="sr-only"
                            />
                            <span className="min-w-0 flex-1">
                              <strong className="block text-sm font-bold text-[#0F172A]">{label}</strong>
                              <small className="block text-xs text-[#64748B]">{description}</small>
                            </span>
                            {form.learningMode === value && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0866D9]" aria-hidden="true" />}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-3">
                    <Button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className={`h-[44px] sm:h-[46px] rounded-[12px] border px-4 font-bold text-xs sm:text-sm transition-all ${
                        isLight
                          ? "border-[#CBD5E1] bg-white text-[#334155] hover:bg-slate-50"
                          : "border-slate-700 bg-[#091426] text-[#E2E8F0] hover:bg-slate-800"
                      }`}
                    >
                      → السابق
                    </Button>
                    <Button
                      type="button"
                      disabled={!educationValid}
                      onClick={() => setRegStep(3)}
                      className={`h-[44px] sm:h-[46px] min-w-[120px] rounded-[12px] px-5 font-bold text-xs sm:text-sm transition-all duration-200 ${
                        !educationValid
                          ? isLight
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
                            : "bg-[#1E293B] text-slate-500 cursor-not-allowed border border-slate-800"
                          : "bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm"
                      }`}
                    >
                      التالي ←
                    </Button>
                  </div>
                </div>
              )}

              {regStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-[30px] w-[30px] place-items-center rounded-full text-xs font-bold bg-[#E8F1FF] text-[#0866D9]">
                          03
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-[#0F172A]">مراجعة وتأكيد البيانات</h3>
                          <p className="text-xs text-[#64748B]">راجع البيانات المدخلة قبل إرسال طلب التسجيل للأدمن</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRegStep(1)}
                          className="text-xs font-bold underline px-2 py-1 rounded-md text-[#0866D9] hover:bg-blue-50 transition-colors"
                        >
                          تعديل
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3 text-xs sm:text-sm">
                      <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                        <span className="text-[#64748B]">اسم الطالب:</span>
                        <strong className="font-bold text-[#0F172A]">{form.name}</strong>
                      </div>
                      <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                        <span className="text-[#64748B]">رقم الهاتف:</span>
                        <strong className="font-mono font-bold text-[#0F172A]" dir="ltr">{form.phone}</strong>
                      </div>
                      {form.email && (
                        <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                          <span className="text-[#64748B]">البريد الإلكتروني:</span>
                          <strong className="font-sans font-bold text-[#0F172A]" dir="ltr">{form.email}</strong>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                        <span className="text-[#64748B]">المحافظة والمدينة:</span>
                        <strong className="font-bold text-[#0F172A]">{form.governorate} - {form.city}</strong>
                      </div>
                      <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                        <span className="text-[#64748B]">المرحلة والصف:</span>
                        <strong className="text-[#0866D9] font-bold">{form.grade || "غير محدد"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">نظام الدراسة:</span>
                        <strong className="font-bold text-[#0F172A]">{form.learningMode === "online" ? "أونلاين" : "أوفلاين (سنتر)"}</strong>
                      </div>
                    </div>

                    <div className="rounded-[14px] border border-blue-200 bg-[#E8F1FF] p-3 text-xs leading-relaxed text-[#0866D9]">
                      <ShieldCheck className="h-4 w-4 inline ml-1.5 text-[#0866D9]" />
                      سيتم مراجعة الطلب بواسطة إدارة المنصة وتوليد كود دخول آمن للطالب فور الاعتماد.
                    </div>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-[12px] border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs font-semibold text-[#EF4444]"
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 gap-3">
                    <Button
                      type="button"
                      onClick={() => setRegStep(2)}
                      className={`h-[44px] sm:h-[46px] rounded-[12px] border px-4 font-bold text-xs sm:text-sm transition-all ${
                        isLight
                          ? "border-[#CBD5E1] bg-white text-[#334155] hover:bg-slate-50"
                          : "border-slate-700 bg-[#091426] text-[#E2E8F0] hover:bg-slate-800"
                      }`}
                    >
                      → السابق
                    </Button>
                    <Button
                      disabled={loading || !registrationValid}
                      className={`h-[44px] sm:h-[46px] min-w-[140px] rounded-[12px] px-5 font-bold text-xs sm:text-sm transition-all duration-200 ${
                        loading || !registrationValid
                          ? isLight
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
                            : "bg-[#1E293B] text-slate-500 cursor-not-allowed border border-slate-800"
                          : "bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm"
                      }`}
                    >
                      {loading ? <Loader2 className="animate-spin h-4 w-4 ml-1.5" /> : <UserPlus className="h-4.5 w-4.5 ml-1.5" />}{" "}
                      إنشاء الحساب 🚀
                    </Button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
