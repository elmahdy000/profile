import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Clock,
  FileText,
  FolderOpen,
  Home,
  Loader2,
  LogOut,
  Play,
  ShieldCheck,
  Trophy,
  User,
  UserPlus,
  Menu,
  X,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Copy,
  Sparkles,
  AlertCircle,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoLessonsSection } from "@/components/YoutubeSection";
import { toast } from "@/hooks/use-toast";
import { getTrack, getTrackForStage } from "@/data/academic";
import {
  RegistrationStageSelector,
  createDefaultRegistrationStage,
} from "@/components/ui/RegistrationStageSelector";
import { EmptyState, PageHeader, ProfileInfoRow, StatisticCard, StatusBadge, StudentAvatar } from "./StudentDashboardUI";
import { CppCompilerPanel } from "./CppCompilerPanel";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { ProfileTab } from "./tabs/ProfileTab";
import { FilesTab } from "./tabs/FilesTab";
import { QuizzesTab } from "./tabs/QuizzesTab";
import { DashboardTab } from "./tabs/DashboardTab";

import type {
  Student,
  LearningFile,
  QuizQuestion,
  Quiz,
  VideoSummary,
  ProgressRow,
  StudentNotification,
} from "@/types/platform";

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
  if (!response.ok) throw new Error(data.error || "تعذر إتمام الطلب");
  return data as T;
}

const EGYPT_GOVERNORATES: Record<string, string[]> = {
  القاهرة: [
    "حلوان",
    "المعادي",
    "مصر الجديدة",
    "مدينة نصر",
    "وسط البلد",
    "شبرا",
    "التجمع الخامس",
    "الرحاب",
    "الشروق",
    "عين شمس",
    "المرج",
    "الزيتون",
    "العباسية",
  ],
  الجيزة: [
    "الدقي",
    "المهندسين",
    "الهرم",
    "فيصل",
    "6 أكتوبر",
    "الشيخ زايد",
    "العجوزة",
    "الوراق",
    "إمبابة",
    "البدرشين",
    "العياط",
    "أبو النمرس",
  ],
  الإسكندرية: [
    "سيدي بشر",
    "المنتزه",
    "سموحة",
    "الرمل",
    "العجمي",
    "السيوف",
    "محرم بك",
    "المنشية",
    "الشاطبي",
    "ميامي",
  ],
  القليوبية: [
    "بنها",
    "شبرا الخيمة",
    "قليوب",
    "الخانكة",
    "الخصوص",
    "طوخ",
    "قها",
    "شبين القناطر",
  ],
  المنوفية: [
    "شبين الكوم",
    "منوف",
    "السادات",
    "أشمون",
    "الباجور",
    "قويسنا",
    "تلا",
    "الشهداء",
  ],
  الغربية: [
    "طنطا",
    "المحلة الكبرى",
    "كفر الزيات",
    "زفتى",
    "السنطة",
    "بسيون",
    "سمنود",
    "قطور",
  ],
  الشرقية: [
    "الزقازيق",
    "العاشر من رمضان",
    "بلبيس",
    "منيا القمح",
    "أبو حماد",
    "فاقوس",
    "أبو كبير",
    "الحسينية",
    "كفر صقر",
  ],
  الدقهلية: [
    "المنصورة",
    "ميت غمر",
    "السنبلاوين",
    "دكرنس",
    "شربين",
    "المنزلة",
    "طلخا",
    "بلقاس",
    "جمصة",
  ],
  البحيرة: [
    "دمنهور",
    "كفر الدوار",
    "رشيد",
    "إدكو",
    "أبو المطامير",
    "أبو حمص",
    "الرحمانية",
    "إيتاي البارود",
    "حوش عيسى",
    "كوم حمادة",
  ],
  "كفر الشيخ": [
    "كفر الشيخ",
    "دسوق",
    "قلين",
    "سيدي سالم",
    "الرياض",
    "فوه",
    "مطوبس",
    "بيلا",
    "الحامول",
    "بلطيم",
  ],
  الفيوم: ["الفيوم", "سنورس", "طامية", "إطسا", "أبشواي", "يوسف الصديق"],
  "بني سويف": [
    "بني سويف",
    "الواسطى",
    "ناصر",
    "ببا",
    "الفشن",
    "سمسطا",
    "اهناسيا",
  ],
  المنيا: [
    "المنيا",
    "ملوي",
    "بني مزار",
    "مغاغة",
    "سمالوط",
    "أبو قرقاص",
    "دير مواس",
    "العدوة",
    "مطاي",
  ],
  أسيوط: [
    "أسيوط",
    "ديروط",
    "منفلوط",
    "القوصية",
    "أبنوب",
    "أبو تيج",
    "الغنايم",
    "ساحل سليم",
    "البداري",
    "صدفا",
  ],
  سوهاج: [
    "سوهاج",
    "طما",
    "طهطا",
    "المراغة",
    "جهينة",
    "ساقلتة",
    "أخميم",
    "المنشأة",
    "جرجا",
    "البلينا",
    "دار السلام",
  ],
  قنا: [
    "قنا",
    "نجع حمادي",
    "دشنا",
    "أبو تشت",
    "فرشوط",
    "قفط",
    "نقادة",
    "قوص",
    "الوقف",
  ],
  الأقصر: ["الأقصر", "القرنة", "أرمنت", "إسنا", "الطود", "البياضية"],
  أسوان: ["أسوان", "كوم أمبو", "إدفو", "نصر النوبة", "درو"],
  دمياط: ["دمياط", "دمياط الجديدة", "رأس البر", "فارسكور", "الزرقا", "كفر سعد"],
  بورسعيد: ["بورسعيد", "بورفؤاد"],
  السويس: ["السويس", "الأربعين", "الجناين", "عتاقة"],
  الإسماعيلية: [
    "الإسماعيلية",
    "التل الكبير",
    "فايد",
    "القنطرة شرق",
    "القنطرة غرب",
    "أبو صوير",
    "القصاصين",
  ],
  "البحر الأحمر": [
    "الغردقة",
    "سفاجا",
    "القصير",
    "مرسى علم",
    "شلاتين",
    "حلايب",
    "رأس غارب",
  ],
  "الوادي الجديد": ["الخارجة", "الداخلة", "الفرافرة", "باريس", "بلاط"],
  مطروح: ["مرسى مطروح", "العلمين", "الضبعة", "سيدي براني", "السلوم", "سيوة"],
  "شمال سيناء": ["العريش", "الشيخ زويد", "رفح", "بئر العبد"],
  "جنوب سيناء": [
    "شرم الشيخ",
    "دهب",
    "نويبع",
    "طابا",
    "طور سيناء",
    "رأس سدر",
    "أبو زنيمة",
    "أبو رديس",
  ],
};

function SearchableCombobox({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  isLight = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
  isLight?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearch(value || "");
    }
  }, [value, isOpen]);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2 relative text-right w-full" dir="rtl">
      <label htmlFor={id} className={`block text-xs font-semibold ${isLight ? "text-[#334155]" : "text-[#E2E8F0]"}`}>
        {label} {required && <span className="text-[#EF4444]">*</span>}
      </label>
      <input
        id={id}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
        }}
        required={required}
        placeholder={placeholder}
        className={`h-[56px] w-full rounded-[12px] border px-4 text-right text-sm font-medium outline-none transition focus:border-[#3B82F6] focus:ring-4 focus:ring-[#3B82F6]/12 shadow-xs ${
          isLight
            ? "border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] focus:bg-white"
            : "border-[rgba(148,163,184,0.20)] bg-[#091426] text-[#F8FAFC] placeholder-[#64748B] focus:bg-[#091426]"
        }`}
      />
      {isOpen && (filtered.length > 0 || search.trim() !== "") && (
        <ul className={`absolute z-50 w-full max-h-48 overflow-y-auto rounded-[14px] border shadow-lg mt-1 py-1 text-right ${
          isLight
            ? "border-[#CBD5E1] bg-white text-[#0F172A]"
            : "border-[rgba(148,163,184,0.25)] bg-[#101D31] text-[#F8FAFC]"
        }`}>
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-right text-sm transition-colors font-medium ${
                  isLight
                    ? "hover:bg-[#E8F1FF] text-[#0F172A]"
                    : "hover:bg-[rgba(59,130,246,0.15)] text-[#F8FAFC]"
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
          {search.trim() !== "" && !options.includes(search) && (
            <li>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(search);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-right text-[#64748B] hover:bg-[#E8F1FF] dark:hover:bg-[rgba(59,130,246,0.15)] text-xs transition-colors"
              >
                استخدام: "{search}"
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function AccessScreen({ onLogin }: { onLogin: (student: Student) => void }) {
  const requestedTrack = new URLSearchParams(window.location.search).get("track");
  const requestedMode = new URLSearchParams(window.location.search).get("mode");
  const shouldStartRegistration = requestedMode === "register" || requestedTrack === "engineering" || requestedTrack === "computer-science";
  const [mode, setMode] = useState<"login" | "register" | "recover">(
    shouldStartRegistration ? "register" : "login",
  );
  const [regStep, setRegStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [rememberCode, setRememberCode] = useState(false);
  const [registeredCode, setRegisteredCode] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [recoveryForm, setRecoveryForm] = useState({ name: "", phone: "" });
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
    const remembered = localStorage.getItem("dr_mahmoud_student_code");
    if (remembered) {
      setAccessCode(remembered);
      setRememberCode(true);
    }
  }, []);

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
        localStorage.setItem(
          "dr_mahmoud_student_code",
          accessCode.trim().toUpperCase(),
        );
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
  const registrationValid = Boolean(
    step1Valid &&
      educationValid &&
      form.learningMode,
  );

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
      {/* Refined Layered Background System */}
      <div className={`absolute top-0 right-1/4 h-[300px] sm:h-[500px] w-[300px] sm:w-[500px] rounded-full blur-[100px] sm:blur-[140px] pointer-events-none ${isLight ? "bg-blue-200/40" : "bg-[#3B82F6]/10"}`} />
      <div className={`absolute bottom-0 left-1/4 h-[300px] sm:h-[500px] w-[300px] sm:w-[500px] rounded-full blur-[120px] sm:blur-[160px] pointer-events-none ${isLight ? "bg-sky-200/40" : "bg-[#1E3A5F]/20"}`} />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <div className="relative mx-auto grid max-w-[1440px] items-start gap-5 sm:gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10 xl:gap-14">
        {/* Introductory Content Column (Right in RTL, order-2 on mobile) */}
        <div className="space-y-6 text-right order-2 lg:order-1">
          {/* Trust Badge */}
          <div className={`inline-flex h-[36px] items-center gap-2 rounded-full border px-3.5 text-xs font-semibold backdrop-blur-md ${
            isLight ? "border-blue-300 bg-blue-50 text-blue-800" : "border-[rgba(96,165,250,0.24)] bg-[rgba(59,130,246,0.10)] text-[#BFDBFE]"
          }`}>
            <ShieldCheck className={`h-4 w-4 ${isLight ? "text-blue-600" : "text-[#60A5FA]"}`} />
            <span>منصة تعليمية آمنة ومخصصة للطلاب وأولياء الأمور</span>
          </div>

          {/* Main Heading */}
          <h1 className="tracking-tight leading-[1.2]">
            <span className={`block text-[30px] sm:text-[38px] lg:text-[45px] font-black ${isLight ? "text-slate-900" : "text-[#F8FAFC]"}`}>
              منصتك التعليمية
            </span>
            <span className="block text-[24px] sm:text-[30px] lg:text-[36px] font-extrabold text-[#3B82F6] mt-1">
              مع د. محمود المهدي
            </span>
          </h1>

          {/* Supporting Paragraph */}
          <p className={`text-sm sm:text-base leading-[1.8] max-w-[650px] font-normal ${isLight ? "text-slate-600" : "text-[#CBD5E1]"}`}>
            بوابتك الذكية للتأسيس العملي، مشاهدة الدروس، معاينة المذكرات، وحل الاختبارات التفاعلية. سجّل حسابك واطلع على محتوى مرحلتك فور تفعيل كود الدخول.
          </p>

          {/* Connected 3-Step Journey with Visible Connector Lines */}
          <div className="space-y-2.5">
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>خطوات الانضمام للمنصة:</h2>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative"
              aria-label="خطوات الانضمام للمنصة"
            >
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

          {/* Compact Feature Cards */}
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

        {/* Form Column (Left in RTL, order-1 on mobile) */}
        <div className={`w-full rounded-[24px] border p-4 sm:p-6 transition-all order-1 lg:order-2 ${
          isLight
            ? "border-[#E2E8F0] bg-white shadow-md text-[#0F172A]"
            : "border-[rgba(148,163,184,0.20)] bg-[#101D31] shadow-[0_20px_60px_rgba(0,0,0,0.30)] text-[#F8FAFC]"
        }`}>
          {/* Segmented Tab Switcher */}
          <div className={`grid grid-cols-2 rounded-[14px] p-1 mb-4 border h-[46px] ${
            isLight ? "bg-[#F1F5F9] border-[#E2E8F0]" : "bg-[#091426] border-[rgba(148,163,184,0.15)]"
          }`}>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
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
              onClick={() => {
                setMode("register");
                setError("");
              }}
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
                  if (registeredCode) {
                    setAccessCode(registeredCode);
                  }
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
                <p
                  role="alert"
                  className="rounded-[12px] border border-[#F87171]/30 bg-[#F87171]/10 p-2.5 text-xs font-medium text-[#F87171]"
                >
                  {error}
                </p>
              )}
              <Button
                disabled={loading}
                className="h-[48px] w-full rounded-[12px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-sm shadow-md transition-all duration-200"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4.5 w-4.5 ml-1.5" />
                )}{" "}
                دخول المنصة
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

              {/* Progress Indicator Header */}
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

              {/* Step 1: Basic Information */}
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
                        onChange={(val) =>
                          setForm({ ...form, governorate: val, city: "" })
                        }
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

              {/* Step 2: Educational Details */}
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
                      onChange={(selection) =>
                        setForm({ ...form, ...selection, otherGradeDetail: "" })
                      }
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
                              onChange={() =>
                                setForm({ ...form, learningMode: value })
                              }
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

              {/* Step 3: Review and Submit */}
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

function AppFilePreviewModal({ file, onClose }: { file: LearningFile | null; onClose: () => void }) {
  if (!file) return null;
  const previewUrl = `/api/learning/files/${file.id}/preview#toolbar=0&navpanes=0&scrollbar=1`;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] grid place-items-center bg-black/70 backdrop-blur-sm p-3 sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <motion.section initial={{ scale: 0.98, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.98, y: 12 }} role="dialog" aria-modal="true" aria-label={`معاينة ${file.title}`} className="flex h-[min(90vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><div className="min-w-0"><strong className="block truncate text-foreground">{file.title}</strong><span className="block truncate text-xs text-muted-foreground">{file.originalName}</span></div><button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-muted transition-colors" aria-label="إغلاق المعاينة"><X className="h-5 w-5" /></button></header>
        <div className="min-h-0 flex-1 bg-muted p-2 sm:p-4">
          {file.mimeType?.startsWith("image/") ? <img src={previewUrl} alt={file.title} className="h-full w-full object-contain" /> : file.mimeType === "application/pdf" || file.mimeType?.startsWith("text/") ? <iframe src={previewUrl} title={file.title} className="h-full w-full rounded-xl border border-border bg-card" /> : <div className="grid h-full place-items-center rounded-xl border border-border bg-card p-8 text-center"><div><FileText className="mx-auto h-12 w-12 text-primary" /><strong className="mt-4 block text-foreground">لا يمكن عرض هذا النوع داخل المتصفح</strong><p className="mt-2 text-sm text-muted-foreground">اطلب نسخة PDF لمعاينتها داخل المنصة.</p></div></div>}
        </div>
      </motion.section>
    </motion.div>
  );
}

function QuizzesPanel({
  quizzes,
  onStartQuiz,
}: {
  quizzes: Quiz[];
  onStartQuiz: (quiz: Quiz) => void;
}) {
  return (
    <section className="space-y-7" dir="rtl">
      <PageHeader title="الاختبارات" description="اختبر فهمك واعرف نتيجتك فورًا." action={<StatusBadge>{quizzes.length} اختبار</StatusBadge>} />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {quizzes.map((quiz) => (
          <article key={quiz.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20">
            <span className="text-[12px] font-bold text-primary">
              {quiz.category}
            </span>
            {quiz.stage && (
              <span className="mr-2 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                {quiz.stage}
              </span>
            )}
            <h3 className="text-lg font-extrabold text-foreground mt-2">{quiz.title}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px] font-semibold text-muted-foreground">
              <span>{quiz.questionsToShow && quiz.questionsToShow > 0 ? quiz.questionsToShow : quiz.questions.length} سؤال</span>
              <span>·</span>
              <span>النجاح من {quiz.passingScore}%</span>
              {quiz.durationMinutes && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-bold text-primary">
                    <Clock className="h-3.5 w-3.5" /> {quiz.durationMinutes} دقيقة
                  </span>
                </>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              {quiz.maxAttempts ? `${Math.max(0, quiz.maxAttempts - (quiz.attemptsUsed || 0))} محاولات متبقية من أصل ${quiz.maxAttempts}` : "محاولات بلا حدود"}
            </p>
            {quiz.locked && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-700">{quiz.lockedReason}</p>}
            <Button
              onClick={() => onStartQuiz(quiz)}
              disabled={quiz.locked || (quiz.maxAttempts !== undefined && (quiz.attemptsUsed || 0) >= quiz.maxAttempts)}
              className="mt-5 w-full font-bold"
            >
              {quiz.locked ? quiz.lockedReason || "الاختبار غير متاح" : "ابدأ الاختبار"}
            </Button>
          </article>
        ))}
      </div>
      {quizzes.length === 0 && (
        <EmptyState icon={ClipboardCheck} title="لا توجد اختبارات متاحة" description="سيظهر أي اختبار جديد فور نشره لحسابك." />
      )}
    </section>
  );
}



async function cropAvatar(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 640;
  canvas.getContext("2d")?.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 640, 640);
  image.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("تعذر تجهيز الصورة")), "image/webp", .88));
}


export function StudentPlatform() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "dashboard" | "lessons" | "compiler" | "files" | "quizzes" | "profile"
  >("dashboard");
  const [files, setFiles] = useState<LearningFile[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [linkedPreviewFile, setLinkedPreviewFile] = useState<LearningFile | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const latestNotificationIdRef = useRef(0);

  // Restore saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("dr_mahmoud_theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
    else if (saved === "light") document.documentElement.classList.remove("dark");
  }, []);

  // Quiz active states & Timer
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState<number | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    correct: number;
    total: number;
    attemptsUsed: number;
    attemptsRemaining: number;
  } | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizElapsedSeconds, setQuizElapsedSeconds] = useState(0);
  const [quizTabSwitchCount, setQuizTabSwitchCount] = useState(0);
  const MAX_TAB_SWITCHES = 3;
  const submitQuizRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Anti-cheat: detect tab/window switching during active quiz
  useEffect(() => {
    if (!activeQuiz || quizResult) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setQuizTabSwitchCount((prev) => {
          const next = prev + 1;
          if (next >= MAX_TAB_SWITCHES) {
            toast({
              variant: "destructive",
              title: `تم رصد ${MAX_TAB_SWITCHES} مغادرة للاختبار`,
              description: "جاري تسليم إجاباتك تلقائياً...",
            });
            void submitQuizRef.current();
          } else {
            toast({
              variant: "destructive",
              title: `تحذير — غادرت الاختبار (${next}/${MAX_TAB_SWITCHES})`,
              description: next === MAX_TAB_SWITCHES - 1 ? "المرة الجاية سيتم التسليم تلقائياً!" : "يُمنع مغادرة نافذة الاختبار أثناء الحل.",
            });
          }
          return next;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeQuiz, quizResult]);

  // Exam Countdown Timer Effect
  useEffect(() => {
    if (!activeQuiz || quizResult) return;
    if (quizTimeRemaining !== null && quizTimeRemaining <= 0) {
      toast({ title: "انتهى وقت الاختبار", description: "جاري تسليم إجاباتك تلقائياً..." });
      void submitQuizRef.current();
      return;
    }
    const timer = setInterval(() => {
      if (quizTimeRemaining !== null) {
        setQuizTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }
      setQuizElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, quizResult, quizTimeRemaining]);

  const startQuiz = (quiz: Quiz) => {
    if (quiz.locked || (quiz.maxAttempts !== undefined && (quiz.attemptsUsed || 0) >= quiz.maxAttempts)) {
      toast({
        variant: "destructive",
        title: "الاختبار غير متاح الآن",
        description: quiz.lockedReason || "استخدمت كل المحاولات المتاحة لهذا الاختبار.",
      });
      return;
    }
    // Map questions with their original index before shuffling
    let mappedQuestions = quiz.questions.map((q, idx) => ({ ...q, _originalIndex: idx }));
    if (quiz.shuffleQuestions) {
      for (let i = mappedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mappedQuestions[i], mappedQuestions[j]] = [mappedQuestions[j], mappedQuestions[i]];
      }
    }
    if (quiz.questionsToShow && quiz.questionsToShow > 0 && quiz.questionsToShow < mappedQuestions.length) {
      mappedQuestions = mappedQuestions.slice(0, quiz.questionsToShow);
    }
    setActiveQuiz({ ...quiz, questions: mappedQuestions });
    setQuizAnswers(Array(mappedQuestions.length).fill(-1));
    setQuizResult(null);
    setQuizTabSwitchCount(0);
    setQuizStartTime(Date.now());
    setQuizElapsedSeconds(0);
    setQuizTimeRemaining(quiz.durationMinutes ? quiz.durationMinutes * 60 : null);
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    setQuizSubmitting(true);
    const timeSpentSeconds = Math.round((Date.now() - quizStartTime) / 1000);

    // Map answers back using full quiz original questions length
    const totalOriginalQuestions = activeQuiz.questions ? activeQuiz.questions.length : 0;
    const originalAnswers = Array(totalOriginalQuestions).fill(-1);
    
    activeQuiz.questions.forEach((q: any, i: number) => {
      const targetIdx = q._originalIndex !== undefined ? q._originalIndex : i;
      if (targetIdx >= 0 && targetIdx < totalOriginalQuestions) {
        originalAnswers[targetIdx] = quizAnswers[i];
      }
    });

    try {
      const res = await api<{
        score: number;
        passed: boolean;
        correct: number;
        total: number;
        attemptsUsed: number;
        attemptsRemaining: number;
        details?: Array<{ questionIndex: number; selectedOption: number; correctOption: number; isCorrect: boolean }>;
      }>(
        `/api/learning/quizzes/${activeQuiz.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers: originalAnswers, timeSpentSeconds }),
        },
      );
      setQuizResult(res);
      setQuizTimeRemaining(null);
      setQuizzes((current) =>
        current.map((quiz) =>
          quiz.id === activeQuiz.id
            ? {
                ...quiz,
                attemptsUsed: res.attemptsUsed,
                locked: res.attemptsRemaining === 0,
                lockedReason: res.attemptsRemaining === 0 ? "استخدمت كل المحاولات المتاحة" : quiz.lockedReason,
              }
            : quiz,
        ),
      );
    } catch (err) {
      toast({ variant: "destructive", title: "خطأ في الاختبار", description: (err as Error).message });
    } finally {
      setQuizSubmitting(false);
    }
  };
  submitQuizRef.current = submitQuiz;

  useEffect(() => {
    api<{ student: Student | null }>("/api/student/me")
      .then((r) => setStudent(r.student))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const loadLearningData = async () => {
    if (!student) return;
    setDataLoading(true);
    setDataError("");
    try {
      const [f, q, v, p, n] = await Promise.all([
        api<LearningFile[]>("/api/learning/files"),
        api<Quiz[]>("/api/learning/quizzes"),
        api<VideoSummary[]>("/api/videos"),
        api<ProgressRow[]>("/api/learning/progress"),
        api<StudentNotification[]>("/api/learning/notifications"),
      ]);
      setFiles(f);
      setQuizzes(q);
      setVideos(v);
      setProgress(p);
      setNotifications(n);
      latestNotificationIdRef.current = Math.max(0, ...n.map((item) => item.id));
    } catch (err) {
      setDataError((err as Error).message || "مقدرناش نحمّل محتواك دلوقتي.");
    } finally {
      setDataLoading(false);
    }
  };
  useEffect(() => {
    void loadLearningData();
  }, [student]);
  const playNotificationSound = useNotificationSound();
  useEffect(() => {
    if (!student) return;
    const stream = new EventSource("/api/learning/notifications/stream", { withCredentials: true });
    const refresh = (event: Event) => {
      const latestId = Number(JSON.parse((event as MessageEvent).data || "{}").latestId || 0);
      if (latestId) latestNotificationIdRef.current = latestId;
      playNotificationSound();
      void loadLearningData();
      toast({ title: "محتوى جديد", description: "تم تحديث الدروس والملفات والاختبارات المتاحة لك." });
    };
    stream.addEventListener("refresh", refresh);
    return () => {
      stream.removeEventListener("refresh", refresh);
      stream.close();
    };
  }, [student?.id]);
  useEffect(() => {
    if (!student) return;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const rows = await api<StudentNotification[]>("/api/learning/notifications");
        const latestId = Math.max(0, ...rows.map((item) => item.id));
        if (latestNotificationIdRef.current > 0 && latestId > latestNotificationIdRef.current) {
          latestNotificationIdRef.current = latestId;
          setNotifications(rows);
          playNotificationSound();
          void loadLearningData();
          toast({ title: "محتوى جديد", description: "تم تحديث المحتوى المتاح لك تلقائيًا." });
        } else {
          latestNotificationIdRef.current = latestId;
          setNotifications(rows);
        }
      } catch {
        // SSE keeps retrying; the next poll provides an independent fallback.
      }
    };
    const timer = window.setInterval(poll, 12000);
    return () => window.clearInterval(timer);
  }, [student?.id]);
  useEffect(() => {
    if (!student) return;
    let lastRefresh = 0;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Debounce: skip if refreshed within the last 30 seconds
      const now = Date.now();
      if (now - lastRefresh < 30_000) return;
      lastRefresh = now;
      void loadLearningData();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [student?.id]);
  if (loading)
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  if (!student)
    return (
      <AccessScreen
        onLogin={(nextStudent) => {
          setStudent(nextStudent);
          window.dispatchEvent(new Event("student-auth-changed"));
        }}
      />
    );
  const logout = async () => {
    await api("/api/student/logout", { method: "POST" });
    localStorage.removeItem("dr_mahmoud_watch_progress");
    localStorage.removeItem("dr_mahmoud_watch_positions");
    localStorage.removeItem("dr_mahmoud_bookmarks");
    setStudent(null);
    window.dispatchEvent(new Event("student-auth-changed"));
  };
  const markNotificationRead = async (notification: StudentNotification) => {
    if (notification.readAt) return;
    try {
      const updated = await api<StudentNotification>(
        `/api/learning/notifications/${notification.id}/read`,
        { method: "PATCH" },
      );
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch {
      // Reading notifications should never interrupt the learning experience.
    }
  };
  const markAllNotificationsRead = async () => {
    try {
      await api("/api/learning/notifications/read-all", { method: "POST" });
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
      );
    } catch {
      // Reading notifications should never interrupt the learning experience.
    }
  };
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;
  const nav = [
    ["dashboard", "الرئيسية", Home],
    ["lessons", "كورساتي", BookOpen],
    ["compiler", "محرر الكود C++", Code2],
    ["files", "الملفات", FolderOpen],
    ["quizzes", "الاختبارات", ClipboardCheck],
    ["profile", "حسابي", User],
  ] as const;
  return (
    <main
      className="min-h-screen bg-background pb-24 lg:pb-0"
      dir="rtl"
      onClickCapture={(event) => {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="/api/learning/files/"]');
        if (!link) return;
        const match = link.getAttribute("href")?.match(/\/api\/learning\/files\/(\d+)\/(?:download|preview)/);
        const file = match ? files.find((item) => item.id === Number(match[1])) : undefined;
        if (!file) return;
        event.preventDefault();
        setLinkedPreviewFile(file);
      }}
    >
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[248px_1fr]">
        {sidebarOpen && <button className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" aria-label="إغلاق القائمة" onClick={() => setSidebarOpen(false)} />}
        <aside className={`fixed inset-y-0 right-0 z-50 flex w-[248px] flex-col border-l border-[#E4EAF2] bg-[#0F1B2D] text-white transition-transform lg:sticky lg:top-0 lg:z-20 lg:min-h-screen ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
          <button className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3 border-b border-slate-800/80 px-4 py-4">
            <img
              src="/logo.webp"
              alt="شعار منصة د. محمود المهدي"
              className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10"
            />
            <div><strong className="block text-[13px] font-bold text-white">بوابة الطالب</strong><span className="text-[10px] text-slate-400">د. محمود المهدي</span></div>
          </div>
          <div className="mx-3 mt-3 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5"><StudentAvatar name={student.name} src={student.avatarUrl} size="sm" /><div className="min-w-0"><strong className="block truncate text-[12px] font-bold text-white">{student.name}</strong><span className="text-[10px] text-slate-400">طالب متفعّل</span></div></div>
          <nav className="mt-4 space-y-1 px-2.5">
            {nav.map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => { setTab(value); setSidebarOpen(false); }}
                aria-current={tab === value ? "page" : undefined}
                className={`flex min-h-[40px] w-full items-center gap-3 rounded-xl px-3 text-right text-[13px] font-bold transition-all duration-150 ${tab === value ? "bg-[#1769FF] text-white shadow-xs" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"}`}
              >
                <Icon className={`h-[18px] w-[18px] ${tab === value ? "" : "opacity-80"}`} />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-2 px-3 pb-4">
            <button
              type="button"
              onClick={() => {
                const isDark = document.documentElement.classList.toggle("dark");
                localStorage.setItem("dr_mahmoud_theme", isDark ? "dark" : "light");
              }}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-800 text-[12px] font-bold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Moon className="h-3.5 w-3.5 hidden dark:inline" />
              <Sun className="h-3.5 w-3.5 dark:hidden" />
              <span className="dark:hidden">الوضع الليلي</span>
              <span className="hidden dark:inline">الوضع النهاري</span>
            </button>
            <a
              href={`https://wa.me/201044348610?text=${encodeURIComponent(
                `مرحباً د. محمود 👋\n\nأود الاستفسار وحجز الكورس من داخل حسابي بالمنصة:\n- الاسم: ${student.name}\n- رقم الهاتف: ${student.phone}\n- المرحلة الدراسية: ${student.grade || "غير محدد"}\n- نظام التعليم: ${student.educationSystem || "غير محدد"}\n- المحافظة/المدينة: ${student.governorate || "غير محدد"} - ${student.city || ""}\n- وضع التعلم: ${student.learningMode === "offline" ? "أوفلاين بالزقازيق" : "أونلاين"}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center justify-center rounded-xl border border-[#1769FF]/40 bg-[#1769FF]/10 text-[12px] font-bold text-[#3B82F6] transition-colors hover:bg-[#1769FF]/20"
            >
              كلم الدعم / حجز كورس 💬
            </a>
            <button
              onClick={logout}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" /> تسجيل الخروج
            </button>
          </div>
        </aside>
        <section className="min-w-0 bg-[#F6F8FC] dark:bg-[#0B1220] min-h-screen">
          <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E4EAF2] bg-white/95 px-4 backdrop-blur-sm md:px-6 dark:border-[#26364D] dark:bg-[#111C2E]/95">
            <div className="flex items-center gap-3">
              <button className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة"><Menu className="h-[18px] w-[18px]" /></button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications((current) => !current)}
                  aria-label="الإشعارات"
                  aria-expanded={showNotifications}
                  className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-primary hover:border-primary/20"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -left-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white shadow-sm">
                      {Math.min(unreadNotifications, 9)}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
                    >
                      <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <div>
                          <strong className="text-[14px] font-bold text-foreground">الإشعارات</strong>
                          <p className="text-[11px] text-muted-foreground">كل جديد في حسابك وكورساتك</p>
                        </div>
                        {unreadNotifications > 0 && (
                          <button
                            type="button"
                            onClick={() => void markAllNotificationsRead()}
                            className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/20"
                          >
                            تحديد الكل كمقروء
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto p-1.5">
                        {notifications.length === 0 ? (
                          <p className="p-8 text-center text-[13px] text-muted-foreground">مفيش إشعارات جديدة</p>
                        ) : notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              void markNotificationRead(notification);
                              if (notification.type === "lesson") setTab("lessons");
                              if (notification.type === "file") setTab("files");
                              if (notification.type === "quiz") setTab("quizzes");
                              setShowNotifications(false);
                            }}
                            className={`mb-0.5 w-full rounded-xl p-3 text-right transition-colors hover:bg-muted ${notification.readAt ? "opacity-60" : "bg-primary/5"}`}
                          >
                            <span className="flex items-start gap-2.5">
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-border" : "bg-primary"}`} />
                              <span>
                                <strong className="block text-[13px] font-bold text-foreground">{notification.title}</strong>
                                <span className="mt-0.5 block text-[12px] leading-5 text-muted-foreground">{notification.message}</span>
                                <span className="mt-1 block text-[10px] text-muted-foreground/70">{new Date(notification.createdAt).toLocaleDateString("ar-EG")}</span>
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="hidden text-[13px] font-bold text-foreground sm:inline">{nav.find(([value]) => value === tab)?.[1]}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setTab("profile")} className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-muted"><StudentAvatar name={student.name} src={student.avatarUrl} size="sm" /><span className="hidden max-w-40 truncate text-[13px] font-bold text-foreground sm:block">{student.name}</span></button>
              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="lg:hidden grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
          <div className="mx-auto max-w-[1440px] p-4 pb-8 sm:p-6 lg:p-8">{tab === "dashboard" ? (
            <DashboardTab
              student={student}
              files={files}
              quizzes={quizzes}
              videos={videos}
              progress={progress}
              dataLoading={dataLoading}
              dataError={dataError}
              onRetry={loadLearningData}
              onOpen={setTab}
            />
          ) : tab === "lessons" ? (
            <VideoLessonsSection
              student={student}
              files={files}
              quizzes={quizzes}
              onStartQuiz={startQuiz}
            />
          ) : tab === "compiler" ? (
            <CppCompilerPanel />
          ) : tab === "files" ? (
            <FilesTab files={files} />
          ) : tab === "quizzes" ? (
            <QuizzesTab quizzes={quizzes} onStartQuiz={startQuiz} />
          ) : (
            <ProfileTab student={student} onStudentChange={setStudent} />
          )}</div>
        </section>
      </div>

      <nav
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-sm lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {nav.filter(([value]) => value !== "compiler").map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => { setTab(value); setSidebarOpen(false); }}
              aria-current={tab === value ? "page" : undefined}
              className={`my-1 flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-bold transition-colors active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tab === value ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              <Icon
                className={`h-[23px] w-[23px] ${tab === value ? "stroke-[2.5]" : ""}`}
              />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence>
        {linkedPreviewFile && <AppFilePreviewModal file={linkedPreviewFile} onClose={() => setLinkedPreviewFile(null)} />}
        {activeQuiz && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/75 p-4 overflow-y-auto flex items-center justify-center backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (activeQuiz && !quizResult) {
                void submitQuiz();
              } else {
                setActiveQuiz(null);
              }
            }}
          >
            <motion.div
              className="w-full max-w-xl rounded-3xl bg-background p-5 md:p-6 shadow-2xl relative border border-border"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              {/* Sticky Timer Bar */}
              <div className="sticky top-0 z-10 -mx-5 -mt-5 md:-mx-6 md:-mt-6 mb-0">
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 md:px-6 rounded-t-3xl border-b border-border transition-colors duration-500 ${
                  quizResult
                    ? "bg-muted/80"
                    : quizTimeRemaining !== null
                      ? quizTimeRemaining < 30
                        ? "bg-red-500/15 border-red-500/30"
                        : quizTimeRemaining < 60
                        ? "bg-amber-500/12 border-amber-500/25"
                        : "bg-card"
                      : "bg-card"
                }`} dir="rtl">
                  {/* Right side (RTL): Quiz title & Stats */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-base md:text-lg font-black text-foreground leading-tight truncate" dir="auto">
                      {activeQuiz.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-semibold">
                      <span>{activeQuiz.questionsToShow && activeQuiz.questionsToShow > 0 ? activeQuiz.questionsToShow : activeQuiz.questions.length} سؤال</span>
                      <span>•</span>
                      <span>نجاح {activeQuiz.passingScore}%</span>
                      {!quizResult && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-primary">
                            أجبت: {quizAnswers.filter(a => a >= 0).length}/{activeQuiz.questions.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Left side (LTR): Timer & Anti-cheat warning badge */}
                  {!quizResult && (
                    <div className="flex items-center gap-2 shrink-0 justify-end" dir="ltr">
                      {quizTabSwitchCount > 0 && (
                        <div className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold ${quizTabSwitchCount >= MAX_TAB_SWITCHES - 1 ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse" : "bg-amber-500/15 text-amber-600 border border-amber-500/20"}`}>
                          <span>⚠</span>
                          <span>{quizTabSwitchCount}/{MAX_TAB_SWITCHES}</span>
                        </div>
                      )}

                      <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold shadow-2xs transition-all duration-500 ${
                        quizTimeRemaining === null
                          ? "bg-muted text-muted-foreground"
                          : quizTimeRemaining < 30
                          ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse"
                          : quizTimeRemaining < 60
                          ? "bg-amber-500/15 text-amber-600 border border-amber-500/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-black text-sm tabular-nums">
                          {quizTimeRemaining !== null
                            ? `${Math.floor(quizTimeRemaining / 60)}:${String(quizTimeRemaining % 60).padStart(2, "0")}`
                            : `${Math.floor(quizElapsedSeconds / 60)}:${String(quizElapsedSeconds % 60).padStart(2, "0")}`
                          }
                        </span>
                        {quizTimeRemaining !== null && (
                          <span className="text-[10px] font-bold opacity-70">
                            / {Math.floor((activeQuiz.durationMinutes ?? 0) * 60 / 60)}:{String((activeQuiz.durationMinutes ?? 0) * 60 % 60).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar for countdown */}
                {quizTimeRemaining !== null && !quizResult && activeQuiz.durationMinutes && (
                  <div className="h-1 w-full bg-border overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear ${
                        quizTimeRemaining < 30 ? "bg-red-500" : quizTimeRemaining < 60 ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${(quizTimeRemaining / (activeQuiz.durationMinutes * 60)) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="border-b border-border mt-4 mb-4" />


              <div className="mt-4 space-y-5 max-h-[60vh] overflow-y-auto px-1" dir="ltr">
                {activeQuiz.questions.map((q, qi) => {
                  const origIdx = (q as any)._originalIndex !== undefined ? (q as any)._originalIndex : qi;
                  const details = (quizResult as any)?.details as Array<{ questionIndex: number; selectedOption: number; correctOption: number; isCorrect: boolean }> | undefined;
                  const detail = details?.find((d: { questionIndex: number }) => d.questionIndex === origIdx);
                  const isSelected = quizAnswers[qi] !== undefined && quizAnswers[qi] >= 0;
                  const isCorrect = detail ? detail.isCorrect : Boolean(quizResult && quizAnswers[qi] === q.correctIndex);
                  const isWrong = quizResult && isSelected && !isCorrect;

                  return (
                    <div key={qi} className={`space-y-4 rounded-2xl border p-5 transition-all shadow-xs text-left ${
                      quizResult
                        ? isCorrect
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : isWrong
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-border bg-card/40"
                        : "border-border bg-card/60"
                    }`}>
                      {/* Question Header & Prompt */}
                      <div className="w-full space-y-2.5">
                        <div className="flex items-start justify-between gap-3 w-full">
                          <div className="flex-1 space-y-2">
                            {(() => {
                              const lines = q.prompt.split('\n').map((l) => l.trim()).filter(Boolean);
                              const arLines = lines.filter((l) => /[\u0600-\u06FF]/.test(l));
                              const enLines = lines.filter((l) => !/[\u0600-\u06FF]/.test(l));

                              // Detect if English lines contain code (variables, cout, cin, braces, semicolons)
                              const titleLine = enLines[0] || "";
                              const codeLines = enLines.slice(1);

                              return (
                                <>
                                  {/* English Title Line */}
                                  {titleLine && (
                                    <h3 dir="ltr" className="text-base md:text-lg font-bold text-foreground leading-snug">
                                      {qi + 1}. {titleLine}
                                    </h3>
                                  )}

                                  {/* Code Block if lines look like C++/Code */}
                                  {codeLines.length > 0 && (
                                    <div dir="ltr" className="my-2.5 overflow-x-auto rounded-xl bg-slate-900 dark:bg-slate-950 p-3.5 text-xs md:text-sm font-mono text-emerald-400 border border-slate-800 shadow-inner leading-relaxed">
                                      {codeLines.map((cLine, ci) => (
                                        <div key={ci} className="whitespace-pre">{cLine}</div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Arabic Translation Badge Card */}
                                  {arLines.length > 0 && (
                                    <div dir="rtl" className="text-right text-xs md:text-sm font-semibold text-primary/90 bg-primary/5 dark:bg-primary/10 border border-primary/15 rounded-xl px-3.5 py-2 mt-2 leading-relaxed shadow-2xs">
                                      {arLines.join(" ")}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {quizResult && (
                            <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
                              isCorrect ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
                            }`}>
                              {isCorrect ? '✓ صح' : '✗ غلط'}
                            </span>
                          )}
                        </div>
                      </div>

                      {q.imageUrl && (
                        <div className="my-3 overflow-hidden rounded-xl border border-border bg-muted max-h-56 flex justify-center">
                          <img src={q.imageUrl} alt={`Question ${qi + 1} image`} className="object-contain max-h-56" />
                        </div>
                      )}

                      <div className="space-y-2.5 pt-1" dir="ltr">
                        {q.options.map((option, oi) => {
                          const optionSelected = quizAnswers[qi] === oi;
                          const correctOptionIndex = detail ? detail.correctOption : q.correctIndex;
                          const optionIsCorrect = correctOptionIndex !== undefined && correctOptionIndex === oi;
                          let optionStyle = "border-border hover:bg-muted/70 hover:border-primary/30";

                          if (quizResult) {
                            if (optionIsCorrect) {
                              optionStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold";
                            } else if (optionSelected && !optionIsCorrect) {
                              optionStyle = "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300 line-through opacity-80";
                            } else {
                              optionStyle = "border-border opacity-50";
                            }
                          } else if (optionSelected) {
                            optionStyle = "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20 shadow-xs";
                          }

                          return (
                            <label
                              key={oi}
                              dir="auto"
                              className={`flex min-h-12 cursor-pointer items-center gap-3.5 rounded-xl border px-4 py-3 transition-all ${optionStyle}`}
                            >
                              <input
                                type="radio"
                                disabled={Boolean(quizResult)}
                                name={`q-${qi}`}
                                checked={optionSelected}
                                onChange={() =>
                                  setQuizAnswers(
                                    quizAnswers.map((a, i) => (i === qi ? oi : a)),
                                  )
                                }
                                className="text-primary focus:ring-primary h-4 w-4 shrink-0 cursor-pointer"
                              />
                              <span dir="auto" className="text-sm md:text-base font-medium flex-1 leading-normal">
                                {option}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {quizResult && activeQuiz.showExplanations !== false && q.explanation && (
                        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/10 p-3.5 text-xs text-foreground text-right" dir="rtl">
                          <strong className="block font-bold mb-1 text-primary">الشرح:</strong>
                          <span className="text-muted-foreground" dir="auto">{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {quizResult ? (
                <div
                  className={`mt-5 rounded-2xl p-6 text-center shadow-lg transition-all border ${
                    quizResult.passed
                      ? "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                      : "bg-red-500/10 dark:bg-red-950/40 border-red-500/30 text-red-900 dark:text-red-200"
                  }`}
                  dir="rtl"
                >
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-background/80 shadow-md mb-3">
                    {quizResult.passed ? (
                      <Sparkles className="h-8 w-8 text-emerald-500 animate-bounce" />
                    ) : (
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    )}
                  </div>

                  <strong className="block text-3xl font-black tracking-tight">
                    {quizResult.passed ? "مبروك! تم الاجتياز بنجاح 🎉" : "للأسف لم تتخطَ درجة النجاح 💔"}
                  </strong>

                  <p className="mt-1 text-xs md:text-sm font-semibold opacity-90">
                    {quizResult.passed
                      ? "أداء ممتاز! تم توثيق نتيجتك وحفظ المحاولة بنجاح."
                      : `درجة النجاح المطلوبة هي ${activeQuiz?.passingScore}%، ادرس الأسئلة الموضحة بالأسفل وحاول مجدداً.`}
                  </p>

                  <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-current/10" dir="ltr">
                    <div className="rounded-xl bg-background/60 p-2.5 text-center shadow-2xs">
                      <span className="block text-[10px] font-bold text-muted-foreground">النسبة</span>
                      <strong className="block text-base font-black text-primary">{quizResult.score}%</strong>
                    </div>

                    <div className="rounded-xl bg-background/60 p-2.5 text-center shadow-2xs">
                      <span className="block text-[10px] font-bold text-muted-foreground">الإجابات الصحيحة</span>
                      <strong className="block text-base font-black text-emerald-600 dark:text-emerald-400">
                        {quizResult.correct} / {quizResult.total}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-background/60 p-2.5 text-center shadow-2xs">
                      <span className="block text-[10px] font-bold text-muted-foreground">المحاولات المتبقية</span>
                      <strong className="block text-base font-black text-amber-600 dark:text-amber-400">
                        {quizResult.attemptsRemaining}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={submitQuiz}
                  disabled={quizSubmitting}
                  className="mt-5 w-full h-12 text-base font-extrabold rounded-xl shadow-lg bg-primary hover:bg-primary/90 text-white transition-all active:scale-[0.98]"
                >
                  {quizSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>جارٍ التصحيح وحساب النتيجة...</span>
                    </div>
                  ) : (
                    "تسليم وتصحيح الاختبار"
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setActiveQuiz(null);
                  setQuizResult(null);
                }}
                className="mt-2 w-full font-bold text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إغلاق نافذة الاختبار ✕
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
