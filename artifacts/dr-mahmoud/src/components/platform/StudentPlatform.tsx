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

type Student = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  avatarUrl?: string | null;
  status: string;
  governorate?: string | null;
  city?: string | null;
  grade?: string | null;
  educationSystem?: string | null;
  educationGrade?: string | null;
  schoolType?: string | null;
  academicTrack?: string | null;
  otherGradeDetail?: string | null;
  learningMode?: "online" | "offline";
  enrolledCourseIds?: number[];
  paymentStatus?: string;
  createdAt?: string;
};
type LearningFile = {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  stage?: string | null;
  targetType?: "stages" | "videos";
  subject?: string | null;
  tags?: string[];
  order?: number;
  originalName: string;
  mimeType?: string | null;
  sizeBytes: number;
  createdAt?: string;
};
type QuizQuestion = {
  prompt: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
  imageUrl?: string;
};
type Quiz = {
  id: number;
  scope?: "course" | "lesson";
  title: string;
  description?: string | null;
  category: string;
  stage?: string | null;
  durationMinutes?: number | null;
  passingScore: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  questionsToShow?: number | null;
  showExplanations?: boolean;
  attemptsUsed?: number;
  locked?: boolean;
  lockedReason?: string | null;
  questions: QuizQuestion[];
};
type VideoSummary = {
  id: number;
  courseId?: number | null;
  title: string;
  category: string;
  stage?: string | null;
  stages?: string[];
  subject?: string | null;
  learningMode?: "online" | "offline" | "both";
  youtubeUrl: string;
};
type ProgressRow = {
  videoId: number;
  progress: number;
  currentTimeSeconds?: number;
  durationSeconds?: number;
  completed?: boolean;
  updatedAt?: string;
};
type StudentNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  readAt?: string | null;
  createdAt: string;
};

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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
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
      <label htmlFor={id} className="block text-sm font-semibold text-[#E2E8F0]">
        {label} {required && <span className="text-[#F87171]">*</span>}
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
        className="h-[52px] w-full rounded-[14px] border border-[rgba(148,163,184,0.20)] bg-[#091426] px-4 text-right text-sm font-medium text-[#F8FAFC] placeholder-[#64748B] outline-none transition focus:border-[#3B82F6] focus:ring-4 focus:ring-[rgba(59,130,246,0.14)]"
      />
      {isOpen && (filtered.length > 0 || search.trim() !== "") && (
        <ul className="absolute z-50 w-full max-h-48 overflow-y-auto rounded-[14px] border border-[rgba(148,163,184,0.25)] bg-[#101D31] shadow-2xl mt-1 py-1 text-right">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-right hover:bg-[rgba(59,130,246,0.15)] text-sm transition-colors text-[#F8FAFC] font-medium"
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
                className="w-full px-4 py-2.5 text-right text-[#94A3B8] hover:bg-[rgba(59,130,246,0.15)] text-xs transition-colors"
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

  return (
    <main
      className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#07111F] text-[#F8FAFC] px-4 py-10 lg:py-14 dir-rtl font-sans"
      dir="rtl"
    >
      {/* Refined Layered Background System */}
      <div className="absolute top-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[#3B82F6]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full bg-[#1E3A5F]/20 blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 xl:gap-16">
        {/* Introductory Content Column (Right in RTL) */}
        <div className="space-y-8 text-right">
          {/* Trust Badge */}
          <div className="inline-flex h-[40px] items-center gap-2.5 rounded-full border border-[rgba(96,165,250,0.24)] bg-[rgba(59,130,246,0.10)] px-4 text-xs sm:text-sm font-semibold text-[#BFDBFE] backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-[#60A5FA]" />
            <span>منصة تعليمية آمنة ومخصصة للطلاب وأولياء الأمور</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-[36px] sm:text-[46px] lg:text-[56px] font-extrabold tracking-tight text-[#F8FAFC] leading-[1.2]">
            منصتك التعليمية مع <br />
            <span className="text-[#60A5FA]">
              د. محمود المهدي
            </span>
          </h1>

          {/* Supporting Paragraph */}
          <p className="text-[#CBD5E1] text-base sm:text-lg leading-[1.9] max-w-[680px] font-normal">
            بوابتك الذكية للتأسيس العملي، مشاهدة الدروس، معاينة المذكرات، وحل الاختبارات التفاعلية. سجّل حسابك واطلع على محتوى مرحلتك فور تفعيل كود الدخول.
          </p>

          {/* Connected 3-Step Journey */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#94A3B8]">خطوات الانضمام للمنصة:</h2>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 relative"
              aria-label="خطوات الانضمام للمنصة"
            >
              {[
                ["1", "سجّل بياناتك", "أدخل اسمك ومرحلتك الدراسية"],
                ["2", "موافقة الأدمن", "استلم كود التفعيل المخصص"],
                ["3", "ابدأ التعلّم", "دروس ومذكرات واختبارات حية"],
              ].map(([number, label, desc], index) => (
                <div
                  key={number}
                  className="relative flex flex-col justify-between rounded-[18px] border border-[rgba(148,163,184,0.18)] bg-[#101D31]/80 p-4 text-right transition-all duration-200 hover:border-[#3B82F6]/40 min-h-[128px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[#3B82F6] text-sm font-bold text-white shadow-md shadow-blue-500/20">
                      {number}
                    </span>
                    {index < 2 && (
                      <span className="hidden sm:block text-[rgba(148,163,184,0.3)] text-xs font-mono">←</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <strong className="block text-sm font-bold text-[#F8FAFC]">
                      {label}
                    </strong>
                    <span className="mt-1 block text-xs text-[#94A3B8] leading-relaxed">
                      {desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compact Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            {[
              ["دروس شرح منظمة", BookOpen, "مباشرة وأونلاين"],
              ["مذكرات وقوالب PDF", FileText, "معاينة داخل المنصة"],
              ["اختبارات وتقييم آلي", ClipboardCheck, "تصحيح ونتائج فورية"],
            ].map(([label, Icon, sub]) => (
              <div
                key={label as string}
                className="rounded-[18px] border border-[rgba(148,163,184,0.16)] bg-[#101D31]/72 p-4 flex items-center gap-3.5 min-h-[90px] transition-all duration-200 hover:border-[#3B82F6]/35"
              >
                <div className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[12px] bg-[rgba(59,130,246,0.12)] text-[#60A5FA]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <strong className="block text-sm font-bold text-[#F8FAFC] truncate">{label as string}</strong>
                  <span className="text-xs text-[#94A3B8] leading-relaxed block truncate">{sub as string}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Column (Left in RTL) */}
        <div className="w-full rounded-[28px] border border-[rgba(148,163,184,0.20)] bg-[#101D31] p-6 sm:p-9 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 rounded-[16px] bg-[#091426] p-[5px] mb-8 border border-[rgba(148,163,184,0.15)] h-[54px]">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`rounded-[12px] h-full font-bold text-sm transition-all duration-200 ${
                mode === "login"
                  ? "bg-[rgba(59,130,246,0.20)] text-[#F8FAFC] border border-[#3B82F6]/40 shadow-sm"
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
              className={`rounded-[12px] h-full font-bold text-sm transition-all duration-200 ${
                mode === "register"
                  ? "bg-[rgba(59,130,246,0.20)] text-[#F8FAFC] border border-[#3B82F6]/40 shadow-sm"
                  : "text-[#94A3B8] hover:text-[#CBD5E1]"
              }`}
            >
              تسجيل طالب جديد
            </button>
          </div>

          {mode === "register" && (registeredCode || message) ? (
            <div className="py-4 text-center" role="status">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#22C55E]/15 text-[#22C55E]">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-[#F8FAFC]">تم إنشاء حسابك وتفعيله فوراً 🎉</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#CBD5E1]">
                كود الدخول الخاص بك جاهز. احفظه جيداً واستخدمه للدخول إلى المنصة.
              </p>

              {registeredCode && (
                <div className="mt-5 rounded-[18px] border border-[#3B82F6]/40 bg-[#091426] p-5 text-center shadow-xs">
                  <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">كود الدخول الخاص بك</span>
                  <strong className="mt-2 block font-mono text-3xl font-bold text-[#60A5FA] tracking-widest dir-ltr select-all">
                    {registeredCode}
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(registeredCode);
                      toast({ title: "تم نسخ الكود!" });
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] px-3 py-1.5 text-xs font-bold text-[#60A5FA] hover:bg-[rgba(59,130,246,0.25)] transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" /> نسخ الكود
                  </button>
                </div>
              )}

              <div className="mt-5 rounded-[18px] border border-[rgba(148,163,184,0.18)] bg-[#091426] p-4 text-right text-xs space-y-2 leading-relaxed">
                <div className="flex items-start gap-2 text-[#22C55E] font-bold">
                  <span className="shrink-0 font-bold">1.</span>
                  <span><strong>أول فيديوهين مجانًا:</strong> يمكنك الدخول فوراً بالكود ومشاهدة أول درسين في كورساتك.</span>
                </div>
                <div className="flex items-start gap-2 text-[#60A5FA] font-bold">
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
                className="mt-6 h-[58px] w-full rounded-[14px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-base shadow-md transition-all duration-200"
              >
                الدخول للمنصة بالكود الآن 🚀
              </Button>
              <a
                href="https://wa.me/201044348610"
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-[14px] border border-[rgba(148,163,184,0.20)] font-bold text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
              >
                محتاج مساعدة؟ كلمنا واتساب
              </a>
            </div>
          ) : mode === "recover" ? (
            <form onSubmit={submitRecovery} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#F8FAFC]">استرجاع كود الدخول</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
                  اكتب نفس الاسم ورقم الموبايل اللي سجلت بيهم، والأدمن هيراجع الطلب ويتواصل معاك بأمان.
                </p>
              </div>
              {message ? (
                <div className="rounded-[14px] border border-[#22C55E]/30 bg-[#22C55E]/10 p-4 text-sm font-bold leading-relaxed text-[#22C55E]" role="status">
                  {message}
                </div>
              ) : (
                <>
                  <div className="space-y-2 text-right">
                    <label htmlFor="recovery-name" className="block text-sm font-semibold text-[#E2E8F0]">اسم الطالب</label>
                    <input
                      id="recovery-name"
                      required
                      value={recoveryForm.name}
                      onChange={(event) => setRecoveryForm({ ...recoveryForm, name: event.target.value })}
                      className="h-[58px] w-full rounded-[14px] border border-[rgba(148,163,184,0.20)] bg-[#091426] px-4 text-[#F8FAFC] placeholder-[#64748B] text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-[rgba(59,130,246,0.14)]"
                    />
                  </div>
                  <div className="space-y-2 text-right">
                    <label htmlFor="recovery-phone" className="block text-sm font-semibold text-[#E2E8F0]">رقم الموبايل المسجل</label>
                    <input
                      id="recovery-phone"
                      type="tel"
                      required
                      value={recoveryForm.phone}
                      onChange={(event) => setRecoveryForm({ ...recoveryForm, phone: event.target.value })}
                      className="h-[58px] w-full rounded-[14px] border border-[rgba(148,163,184,0.20)] bg-[#091426] px-4 text-left text-[#F8FAFC] placeholder-[#64748B] text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-[rgba(59,130,246,0.14)]"
                      dir="ltr"
                    />
                  </div>
                  {error && <p role="alert" className="rounded-[14px] border border-[#F87171]/30 bg-[#F87171]/10 p-3 text-sm font-medium text-[#F87171]">{error}</p>}
                  <Button disabled={loading} className="h-[58px] w-full rounded-[14px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-base shadow-md transition-all duration-200">
                    {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                    إرسال طلب الاسترجاع
                  </Button>
                </>
              )}
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setMessage(""); }}
                className="w-full text-center text-sm font-bold text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
              >
                رجوع لتسجيل الدخول
              </button>
            </form>
          ) : mode === "login" ? (
            <form onSubmit={submitLogin} className="space-y-6">
              <div>
                <h2 className="text-[28px] font-bold text-[#F8FAFC]">دخول الطلاب</h2>
                <p className="text-sm text-[#94A3B8] mt-1.5 leading-relaxed">
                  اكتب كود الدخول المكوّن من 6 خانات المخصص لحسابك.
                </p>
              </div>
              <div className="space-y-2 text-right">
                <label htmlFor="student-code" className="block text-sm font-semibold text-[#E2E8F0]">
                  كود الدخول الشخصي
                </label>
                <div className="relative">
                  <input
                    id="student-code"
                    type={showAccessCode ? "text" : "password"}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    required
                    autoComplete="one-time-code"
                    placeholder="A7K9P2"
                    className="h-[58px] w-full rounded-[14px] border border-[rgba(148,163,184,0.20)] bg-[#091426] px-12 text-center font-mono text-xl font-bold tracking-widest text-[#F8FAFC] placeholder-[#64748B] focus:border-[#3B82F6] focus:outline-none focus:ring-4 focus:ring-[rgba(59,130,246,0.14)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessCode((visible) => !visible)}
                    aria-label={showAccessCode ? "إخفاء كود الدخول" : "إظهار كود الدخول"}
                    aria-pressed={showAccessCode}
                    className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-[#94A3B8] hover:bg-[rgba(59,130,246,0.15)] hover:text-[#60A5FA] transition-colors"
                  >
                    {showAccessCode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-[rgba(148,163,184,0.18)] bg-[#091426] p-3.5 hover:border-[rgba(96,165,250,0.45)] transition-all">
                <input
                  type="checkbox"
                  checked={rememberCode}
                  onChange={(e) => setRememberCode(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-[#3B82F6] focus:ring-[#3B82F6]"
                />
                <div>
                  <strong className="block text-sm font-semibold text-[#F8FAFC]">
                    افتكر الكود على هذا الجهاز
                  </strong>
                  <span className="text-xs text-[#94A3B8] block mt-0.5">
                    لا تفعّلها إذا كنت تستخدم جهازاً عاماً.
                  </span>
                </div>
              </label>
              {error && (
                <p
                  role="alert"
                  className="rounded-[14px] border border-[#F87171]/30 bg-[#F87171]/10 p-3.5 text-sm font-medium text-[#F87171]"
                >
                  {error}
                </p>
              )}
              <Button
                disabled={loading}
                className="h-[58px] w-full rounded-[14px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-base shadow-md transition-all duration-200"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}{" "}
                دخول المنصة
              </Button>
              <button
                type="button"
                onClick={() => { setMode("recover"); setError(""); setMessage(""); }}
                className="w-full text-center text-sm font-semibold text-[#60A5FA] hover:text-[#93C5FD] hover:underline transition-colors"
              >
                نسيت كود الدخول؟
              </button>
              <p className="text-center text-xs text-[#94A3B8]">
                لم يتم تفعيل حسابك بعد؟ كلمنا بعد إرسال طلب التسجيل.
              </p>
            </form>
          ) : (
            <form onSubmit={submitRegistration} className="space-y-6" noValidate dir="rtl">
              <div>
                <h2 className="text-[26px] sm:text-[30px] font-extrabold text-[#F8FAFC]">تسجيل طالب جديد</h2>
                <p className="mt-1 text-sm text-[#94A3B8] leading-[1.7]">
                  اكتب بيانات الطالب بدقة، وتأكد من موافقة ولي الأمر قبل تفعيل الحساب.
                </p>
              </div>

              {/* Progress Indicator Header */}
              <div className="rounded-[16px] border border-[rgba(148,163,184,0.14)] bg-[#091426] p-2.5">
                <div className="grid grid-cols-3 gap-1 text-center">
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
                        className={`flex items-center justify-center gap-2 rounded-[12px] py-2 px-2 transition-all duration-200 text-xs sm:text-sm font-bold ${
                          isActive
                            ? "bg-[#3B82F6] text-white shadow-sm"
                            : isCompleted
                            ? "bg-[rgba(59,130,246,0.15)] text-[#60A5FA]"
                            : "text-[#94A3B8] hover:text-[#CBD5E1]"
                        }`}
                      >
                        <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-extrabold ${
                          isActive ? "bg-white text-[#3B82F6]" : isCompleted ? "bg-[#60A5FA] text-white" : "bg-slate-800 text-[#94A3B8]"
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
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="rounded-[18px] border border-[rgba(148,163,184,0.12)] bg-[rgba(9,20,38,0.35)] p-5 space-y-4">
                    <div className="flex items-center gap-3 border-b border-[rgba(148,163,184,0.12)] pb-3">
                      <span className="grid h-[32px] w-[32px] place-items-center rounded-full bg-[rgba(59,130,246,0.12)] text-[#60A5FA] text-xs font-bold">
                        01
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-[#F8FAFC]">البيانات الأساسية</h3>
                        <p className="text-xs text-[#94A3B8]">بيانات التواصل والموقع الخاصة بالطالب</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col text-xs font-semibold text-[#E2E8F0]">
                        <label htmlFor="student-name" className="mb-2 block text-sm font-medium">
                          اسم الطالب <span className="text-[#F87171]">*</span>
                        </label>
                        <input
                          id="student-name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                          placeholder="الاسم ثلاثي أو رباعي"
                          aria-invalid={Boolean(form.name) && !nameValid}
                          className="h-[54px] w-full rounded-[14px] border border-[rgba(148,163,184,0.18)] bg-[#091426] px-4 text-sm font-medium text-[#F8FAFC] placeholder-[#71809A] outline-none transition focus:border-[#3B82F6] focus:ring-4 focus:ring-[rgba(59,130,246,0.12)]"
                        />
                        {form.name && !nameValid && <p className="mt-1 text-xs text-[#F87171]">اكتب اسم الطالب بشكل صحيح (حرفين على الأقل).</p>}
                      </div>
                      <div className="flex flex-col text-xs font-semibold text-[#E2E8F0]">
                        <label htmlFor="student-phone" className="mb-2 block text-sm font-medium">
                          رقم الهاتف <span className="text-[#F87171]">*</span>
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
                          className="h-[54px] w-full rounded-[14px] border border-[rgba(148,163,184,0.18)] bg-[#091426] px-4 text-left font-mono text-sm font-medium text-[#F8FAFC] placeholder-[#71809A] outline-none transition focus:border-[#3B82F6] focus:ring-4 focus:ring-[rgba(59,130,246,0.12)]"
                        />
                        {form.phone && !phoneValid && <p className="mt-1 text-xs text-[#F87171]">رقم الهاتف من 10 إلى 15 رقمًا.</p>}
                      </div>
                    </div>

                    <div className="flex flex-col text-xs font-semibold text-[#E2E8F0]">
                      <div className="mb-2 flex items-center justify-between">
                        <label htmlFor="student-email" className="text-sm font-medium">
                          البريد الإلكتروني
                        </label>
                        <span className="rounded-full bg-[rgba(148,163,184,0.12)] px-2 py-0.5 text-[11px] font-normal text-[#94A3B8]">
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
                        className="h-[54px] w-full rounded-[14px] border border-[rgba(148,163,184,0.18)] bg-[#091426] px-4 text-left font-sans text-sm font-medium text-[#F8FAFC] placeholder-[#71809A] outline-none transition focus:border-[#3B82F6] focus:ring-4 focus:ring-[rgba(59,130,246,0.12)]"
                      />
                      {!emailValid && <p className="mt-1 text-xs text-[#F87171]">صيغة البريد الإلكتروني غير صحيحة.</p>}
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
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      disabled={!step1Valid}
                      onClick={() => setRegStep(2)}
                      className="h-[56px] min-w-[150px] rounded-[14px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-base shadow-md transition-all duration-200 disabled:opacity-50"
                    >
                      التالي ←
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Educational Details */}
              {regStep === 2 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="rounded-[18px] border border-[rgba(148,163,184,0.12)] bg-[rgba(9,20,38,0.35)] p-5 space-y-4">
                    <div className="flex items-center gap-3 border-b border-[rgba(148,163,184,0.12)] pb-3">
                      <span className="grid h-[32px] w-[32px] place-items-center rounded-full bg-[rgba(59,130,246,0.12)] text-[#60A5FA] text-xs font-bold">
                        02
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-[#F8FAFC]">النظام والمرحلة الدراسية</h3>
                        <p className="text-xs text-[#94A3B8]">حدد النظام والصف الحالي لعرض المحتوى المناسب للطالب</p>
                      </div>
                    </div>

                    <RegistrationStageSelector
                      value={form}
                      onChange={(selection) =>
                        setForm({ ...form, ...selection, otherGradeDetail: "" })
                      }
                    />

                    <fieldset className="space-y-3 rounded-[16px] border border-[rgba(148,163,184,0.18)] bg-[#091426] p-4">
                      <legend className="px-1 text-xs font-bold uppercase text-[#60A5FA] tracking-wide">
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
                            className={`relative flex min-h-[56px] cursor-pointer items-center gap-3 rounded-[14px] border px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-[#3B82F6]/30 ${form.learningMode === value ? "border-[#3B82F6] bg-[rgba(59,130,246,0.14)] text-[#F8FAFC]" : "border-[rgba(148,163,184,0.18)] bg-[#101D31] text-[#CBD5E1] hover:border-[#3B82F6]/40"}`}
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
                              <strong className="block text-sm font-bold text-[#F8FAFC]">{label}</strong>
                              <small className="block text-xs text-[#94A3B8]">{description}</small>
                            </span>
                            {form.learningMode === value && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#60A5FA]" aria-hidden="true" />}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <div className="flex items-center justify-between pt-2 gap-3">
                    <Button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="h-[56px] rounded-[14px] border border-[rgba(148,163,184,0.22)] bg-transparent text-[#CBD5E1] hover:bg-[rgba(148,163,184,0.08)] font-bold text-sm"
                    >
                      → السابق
                    </Button>
                    <Button
                      type="button"
                      disabled={!educationValid}
                      onClick={() => setRegStep(3)}
                      className="h-[56px] min-w-[150px] rounded-[14px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-base shadow-md transition-all duration-200 disabled:opacity-50"
                    >
                      التالي ←
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review and Submit */}
              {regStep === 3 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="rounded-[18px] border border-[rgba(148,163,184,0.12)] bg-[rgba(9,20,38,0.35)] p-5 space-y-4">
                    <div className="flex items-center gap-3 border-b border-[rgba(148,163,184,0.12)] pb-3">
                      <span className="grid h-[32px] w-[32px] place-items-center rounded-full bg-[rgba(59,130,246,0.12)] text-[#60A5FA] text-xs font-bold">
                        03
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-[#F8FAFC]">مراجعة وتأكيد البيانات</h3>
                        <p className="text-xs text-[#94A3B8]">راجع البيانات المدخلة قبل إرسال طلب التسجيل للأدمن</p>
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-[rgba(148,163,184,0.18)] bg-[#091426] p-4 space-y-3 text-sm">
                      <div className="flex justify-between border-b border-[rgba(148,163,184,0.10)] pb-2">
                        <span className="text-[#94A3B8]">اسم الطالب:</span>
                        <strong className="text-[#F8FAFC]">{form.name}</strong>
                      </div>
                      <div className="flex justify-between border-b border-[rgba(148,163,184,0.10)] pb-2">
                        <span className="text-[#94A3B8]">رقم الهاتف:</span>
                        <strong className="text-[#F8FAFC] font-mono" dir="ltr">{form.phone}</strong>
                      </div>
                      {form.email && (
                        <div className="flex justify-between border-b border-[rgba(148,163,184,0.10)] pb-2">
                          <span className="text-[#94A3B8]">البريد الإلكتروني:</span>
                          <strong className="text-[#F8FAFC] font-sans" dir="ltr">{form.email}</strong>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-[rgba(148,163,184,0.10)] pb-2">
                        <span className="text-[#94A3B8]">المحافظة والمدينة:</span>
                        <strong className="text-[#F8FAFC]">{form.governorate} - {form.city}</strong>
                      </div>
                      <div className="flex justify-between border-b border-[rgba(148,163,184,0.10)] pb-2">
                        <span className="text-[#94A3B8]">المرحلة والصف:</span>
                        <strong className="text-[#60A5FA]">{form.grade || "غير محدد"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#94A3B8]">نظام الدراسة:</span>
                        <strong className="text-[#F8FAFC]">{form.learningMode === "online" ? "أونلاين" : "أوفلاين (سنتر)"}</strong>
                      </div>
                    </div>

                    <div className="rounded-[14px] border border-[rgba(59,130,246,0.20)] bg-[rgba(59,130,246,0.08)] p-3.5 text-xs text-[#CBD5E1] leading-relaxed">
                      <ShieldCheck className="h-4 w-4 text-[#60A5FA] inline ml-1.5" />
                      سيتم مراجعة الطلب بواسطة إدارة المنصة وتوليد كود دخول آمن للطالب فور الاعتماد.
                    </div>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-[14px] border border-[#F87171]/30 bg-[#F87171]/10 p-3.5 text-xs font-semibold text-[#F87171]"
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 gap-3">
                    <Button
                      type="button"
                      onClick={() => setRegStep(2)}
                      className="h-[56px] rounded-[14px] border border-[rgba(148,163,184,0.22)] bg-transparent text-[#CBD5E1] hover:bg-[rgba(148,163,184,0.08)] font-bold text-sm"
                    >
                      → السابق
                    </Button>
                    <Button
                      disabled={loading || !registrationValid}
                      className="h-[56px] min-w-[180px] rounded-[14px] bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-base shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <UserPlus className="h-5 w-5" />}{" "}
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

function FilesPanel({ files }: { files: LearningFile[] }) {
  const standaloneFiles = files.filter((file) => file.targetType !== "videos");
  const [previewFile, setPreviewFile] = useState<LearningFile | null>(null);
  return (
    <section className="space-y-7" dir="rtl">
      <PageHeader title="الملفات والمرفقات" description="المذكرات والأكواد والتمارين الخاصة بمرحلتك وكورساتك." action={<StatusBadge>{standaloneFiles.length} ملف</StatusBadge>} />
      {standaloneFiles.length === 0 ? (
        <EmptyState icon={FolderOpen} title="لا توجد ملفات مرفوعة" description="ستظهر مذكرات وأكواد الكورسات هنا فور نشرها لحسابك." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {standaloneFiles.map((file) => (
            <article key={file.id} className="grid gap-3 border-b border-border p-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_160px_100px_auto] sm:items-center">
              <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate text-base font-semibold text-foreground">{file.title}</h3><p className="truncate text-[13px] text-muted-foreground">{file.originalName}</p></div></div>
              <span className="text-sm text-muted-foreground">{getTrack(file.category)?.title || file.category}</span>
              <span className="text-sm text-muted-foreground">{(file.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
              <button
                type="button"
                onClick={() => setPreviewFile(file)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/20 px-4 text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
              >
                <Eye className="h-4 w-4" /> معاينة
              </button>
            </article>
          ))}
        </div>
      )}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-3 sm:p-6"
            onMouseDown={(event) => { if (event.currentTarget === event.target) setPreviewFile(null); }}
          >
            <motion.section
              initial={{ scale: 0.98, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 12 }}
              role="dialog"
              aria-modal="true"
              aria-label={`معاينة ${previewFile.title}`}
              className="flex h-[min(90vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
            >
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0"><strong className="block truncate text-foreground">{previewFile.title}</strong><span className="block truncate text-xs text-muted-foreground">{previewFile.originalName}</span></div>
                <button type="button" onClick={() => setPreviewFile(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-muted transition-colors" aria-label="إغلاق المعاينة"><X className="h-5 w-5" /></button>
              </header>
              <div className="min-h-0 flex-1 bg-muted p-2 sm:p-4">
                {previewFile.mimeType?.startsWith("image/") ? (
                  <img src={`/api/learning/files/${previewFile.id}/preview`} alt={previewFile.title} className="h-full w-full object-contain select-none" onContextMenu={(e) => e.preventDefault()} />
                ) : previewFile.mimeType === "application/pdf" || previewFile.mimeType?.startsWith("text/") ? (
                  <iframe src={`/api/learning/files/${previewFile.id}/preview#toolbar=0&navpanes=0&scrollbar=1`} title={previewFile.title} className="h-full w-full rounded-xl border border-border bg-card" />
                ) : (
                  <div className="grid h-full place-items-center rounded-xl border border-border bg-card p-8 text-center"><div><FileText className="mx-auto h-12 w-12 text-primary" /><strong className="mt-4 block text-foreground">لا يمكن عرض هذا النوع داخل المتصفح</strong><p className="mt-2 text-sm text-muted-foreground">ارفع نسخة PDF من الملف لمعاينتها بأمان داخل المنصة.</p></div></div>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
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

function PaymentBanner({ paymentStatus, onUploaded }: { paymentStatus: string; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى اختيار صورة إيصال دمج من نوع PNG أو JPG أو WEBP", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("receipt", selectedFile);
      const res = await fetch("/api/student/payment-receipt", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر رفع الإيصال");
      toast({ title: "🎉 تم رفع الإيصال بنجاح!", description: "جارٍ مراجعة الإيصال وتأكيد الحجز فوراً من الأدمن." });
      onUploaded();
    } catch (err) {
      toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (paymentStatus === "pending_review") {
    return (
      <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 p-6 shadow-lg backdrop-blur-xl dark:border-amber-500/30 dark:from-amber-950/40 dark:to-orange-950/30 text-right dir-rtl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse">
              <Clock className="h-7 w-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                قيد المراجعة الفورية
              </div>
              <h3 className="mt-2 text-lg font-black text-amber-950 dark:text-amber-100">
                تم استلام إيصال الدفع بنجاح 📜
              </h3>
              <p className="mt-1 text-xs leading-6 font-medium text-amber-900/80 dark:text-amber-200/70 max-w-xl">
                الإيصال الآن تحت المراجعة من الإدارة. بمجرد تأكيد الحجز، سيتم فتح بقية الفيديوهات والاختبارات التفاعلية تلقائياً بدون حاجة لإعادة التسجيل!
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-amber-300/40 bg-white/70 dark:bg-amber-900/30 p-3.5 text-center shadow-xs">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block">حالة الحساب</span>
            <strong className="mt-1 text-sm font-extrabold text-amber-900 dark:text-amber-100 block">في انتظار التأكيد</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-blue-500/5 to-indigo-500/10 p-6 shadow-xl backdrop-blur-2xl dark:border-primary/20 dark:from-primary/20 dark:to-indigo-950/30 text-right dir-rtl">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-0 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      <div className="relative space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-primary to-blue-600 text-white shadow-lg shadow-primary/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                ✨ أول فيديوهين مفتوحين مجاناً
              </span>
              <h3 className="mt-1 text-lg font-black text-foreground">
                تأكيد الحجز وفتح باقي المحتوى 🚀
              </h3>
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground max-w-sm leading-relaxed">
            ارفع صورة تحويل فودافون كاش أو إيصال الدفع لفتح جميع الفيديوهات، الملفات والملازم المخصصة لمرحلتك.
          </p>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
          }}
          onClick={() => !selectedFile && fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-primary bg-primary/10 scale-[1.01]"
              : previewUrl
              ? "border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20"
              : "border-primary/30 bg-card/60 hover:border-primary hover:bg-card/90"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />

          {previewUrl ? (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-right">
                <img
                  src={previewUrl}
                  alt="معاينة الإيصال"
                  className="h-20 w-20 rounded-xl object-cover border-2 border-emerald-500/50 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    تم اختيار صورة الإيصال
                  </div>
                  <p className="mt-1 text-xs font-mono text-muted-foreground truncate max-w-xs">
                    {selectedFile?.name}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    الحجم: {Math.round((selectedFile?.size || 0) / 1024)} كيلوبايت
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="h-10 text-xs font-bold"
                >
                  تغيير الصورة
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                  disabled={uploading}
                  className="h-10 gap-2 font-black text-xs shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {uploading ? "جاري الرفع والارسال..." : "تأكيد ورفع الإيصال الآن 📤"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Camera className="h-6 w-6" />
              </div>
              <strong className="block text-sm font-black text-foreground">
                اسحب صورة الإيصال هنا أو اضغط للاختيار
              </strong>
              <p className="text-xs text-muted-foreground">
                يدعم صيغ JPG ، PNG ، WEBP (صورة واضحة للإيصال)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardPanel({
  student,
  files,
  quizzes,
  videos,
  progress,
  dataLoading,
  dataError,
  onRetry,
  onOpen,
}: {
  student: Student;
  files: LearningFile[];
  quizzes: Quiz[];
  videos: VideoSummary[];
  progress: ProgressRow[];
  dataLoading: boolean;
  dataError: string;
  onRetry: () => void;
  onOpen: (tab: "lessons" | "compiler" | "files" | "quizzes") => void;
}) {
  const academicTrack = getTrackForStage(student.grade);
  const progressByVideo = new Map(progress.map((row) => [row.videoId, row]));
  const averageProgress = videos.length
    ? Math.round(
        videos.reduce(
          (sum, video) => sum + (progressByVideo.get(video.id)?.progress || 0),
          0,
        ) / videos.length,
      )
    : 0;
  const continueRow = [...progress]
    .filter(
      (row) =>
        row.progress > 0 &&
        row.progress < 100 &&
        videos.some((video) => video.id === row.videoId),
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    )[0];
  const continueVideo =
    videos.find((video) => video.id === continueRow?.videoId) || videos[0];
  const continueProgress = continueVideo
    ? progressByVideo.get(continueVideo.id)?.progress || 0
    : 0;
  const evaluationScore = Math.round((averageProgress * 0.5) + (quizzes.length > 0 ? 50 : 0));
  const overallRating = evaluationScore >= 90 ? "ممتاز 🌟" : evaluationScore >= 75 ? "جيد جداً 🔥" : evaluationScore >= 50 ? "مستواك متوسط 👍" : "تحتاج للمزيد من المذاكرة 💪";

  const stats = [
    {
      label: "دروس متاحة",
      value: String(videos.length),
      icon: BookOpen,
      helper: "مخصصة لمرحلتك",
    },
    {
      label: "اختبارات متاحة",
      value: String(quizzes.length),
      icon: ClipboardCheck,
      helper: "جاهزة للحل",
    },
    { label: "إجمالي المشاهدة", value: `${averageProgress}%`, icon: BarChart3, helper: "عبر كل الدروس" },
    { label: "التقييم العام", value: overallRating, icon: Trophy, helper: `مستوى الإنجاز: ${evaluationScore}%` },
  ];
  if (dataLoading)
    return (
      <div
        className="space-y-6 p-4 md:p-8"
        aria-label="جاري تحميل محتوى المنصة"
      >
        <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[24px] font-extrabold text-foreground md:text-[28px] leading-tight">
            مرحبًا، {student.name}
          </h1>
          <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
            {academicTrack
              ? `${academicTrack.title} — محتواك مرتب حسب كورساتك ومرحلتك.`
              : "كمّل من مكان ما وقفت، وخليك ثابت على خطتك."}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-bold ${
            student.learningMode === "offline"
              ? "bg-violet-500/10 text-violet-400 border border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400"
              : "bg-primary/10 text-primary border border-primary/20"
          }`}
        >
          {student.learningMode === "offline"
            ? "نظامك: أوفلاين"
            : "نظامك: أونلاين"}
        </span>
      </div>
      {dataError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{dataError}</span>
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="font-bold"
          >
            حاول تاني
          </Button>
        </div>
      )}
      {student.paymentStatus !== "paid" && (
        <PaymentBanner paymentStatus={student.paymentStatus || "unpaid"} onUploaded={() => window.location.reload()} />
      )}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatisticCard key={stat.label} {...stat} />)}
      </div>
      {(() => {
        const categoryMap = new Map<string, { total: number; progressSum: number; completed: number }>();
        for (const video of videos) {
          const cat = video.category || "عام";
          const row = progressByVideo.get(video.id);
          const pct = row?.progress ?? 0;
          const existing = categoryMap.get(cat) ?? { total: 0, progressSum: 0, completed: 0 };
          categoryMap.set(cat, {
            total: existing.total + 1,
            progressSum: existing.progressSum + pct,
            completed: existing.completed + (pct >= 90 ? 1 : 0),
          });
        }
        const categories = Array.from(categoryMap.entries());
        if (categories.length < 2) return null;
        return (
          <section aria-label="تقدمك في الكورسات">
            <h2 className="mb-3 text-[15px] font-extrabold text-foreground">تقدمك في الكورسات</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map(([cat, data]) => {
                const avg = Math.round(data.progressSum / data.total);
                const isComplete = data.completed === data.total && data.total > 0;
                return (
                  <div
                    key={cat}
                    className={`rounded-2xl border p-4 text-right shadow-sm ${isComplete ? "border-emerald-500/40 bg-emerald-500/10 dark:border-emerald-700 dark:bg-emerald-900/20" : "border-border bg-card"}`}
                  >
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-bold text-foreground">{cat}</p>
                      {isComplete && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Trophy className="h-3 w-3" /> مكتمل
                        </span>
                      )}
                    </div>
                    <div className="h-[6px] overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span>{avg}%</span>
                      <span>{data.completed}/{data.total} دروس</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}
      <div className="grid gap-5 grid-cols-1 xl:grid-cols-[1.5fr_.7fr]">
        <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-[.9fr_1.1fr]">
            <div className="relative min-h-52 bg-accent">
              <img
                src={academicTrack?.image || "/university-cs-path.webp"}
                alt={academicTrack?.imageAlt || "الدرس اللي بتذاكره"}
                className="h-full w-full object-cover opacity-60"
              />
              {continueVideo && (
                <button
                  onClick={() => onOpen("lessons")}
                  aria-label={`شغّل ${continueVideo.title}`}
                  className="absolute inset-0 m-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform duration-200 hover:scale-110"
                >
                  <Play className="h-6 w-6 fill-current" />
                </button>
              )}
            </div>
            <div className="flex flex-col justify-center p-5 text-right">
              <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                {continueProgress > 0 ? "كمّل من مكان ما وقفت" : "ابدأ رحلتك"}
              </span>
              <h2 className="mt-2.5 text-lg font-extrabold text-foreground md:text-xl leading-snug">
                {continueVideo?.title || "محتواك هيظهر هنا قريب"}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {continueVideo
                  ? `${continueVideo.subject || continueVideo.category} — تقدمك بيتحفظ تلقائي على حسابك.`
                  : "لسه مفيش دروس منشورة ليك. أول ما المحتوى يتضاف هتلاقيه هنا."}
              </p>
              <div className="mt-4 h-[7px] overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${continueProgress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] font-medium text-muted-foreground">
                <span>{continueProgress}% من الدرس</span>
                <span>{averageProgress}% إجمالي التقدم</span>
              </div>
              {continueVideo && <Button onClick={() => onOpen("lessons")} className="mt-4 h-11 w-fit font-bold">{continueProgress > 0 ? "كمّل الدرس" : "ابدأ أول درس"} <ChevronLeft className="h-4 w-4" /></Button>}
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-foreground">الخطوة اللي بعدها</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            اختصار لأحدث حاجة متاحة ليك.
          </p>
          <div className="mt-5 space-y-4">
            {quizzes[0] && (
              <button
                onClick={() => onOpen("quizzes")}
                className="flex w-full items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-right transition-colors hover:bg-amber-500/20"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-500 dark:text-amber-400"><ClipboardCheck className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0">
                  <strong className="block text-[13px] font-bold text-foreground truncate">{quizzes[0].title}</strong>
                  <small className="text-[11px] text-muted-foreground">
                    {quizzes[0].questions.length} أسئلة — ابدأ لما تكون جاهز
                  </small>
                </span>
              </button>
            )}
            {files[0] && (
              <button
                onClick={() => onOpen("files")}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-right transition-colors hover:bg-muted"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0">
                  <strong className="block text-[13px] font-bold text-foreground truncate">{files[0].title}</strong>
                  <small className="text-[11px] text-muted-foreground">
                    أحدث ملف متاح للتحميل
                  </small>
                </span>
              </button>
            )}
            {!quizzes.length && !files.length && (
              <div className="rounded-xl border border-dashed border-border p-5 text-center text-[13px] text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                مفيش مهام مطلوبة منك دلوقتي. ركّز في دروسك براحتك.
              </div>
            )}
          </div>
        </article>
      </div>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground">أحدث الملفات</h2>
          <button
            onClick={() => onOpen("files")}
            className="font-bold text-primary"
          >
            عرض الكل
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {files.slice(0, 4).map((file) => (
            <article key={file.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20">
              <div className="grid h-[88px] place-items-center rounded-xl bg-primary/10">
                <FileText className="h-8 w-8 text-primary/35" />
              </div>
              <h3 className="mt-3 line-clamp-1 text-[13px] font-bold text-foreground">{file.title}</h3>
              <a
                href={`/api/learning/files/${file.id}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary/10 text-[12px] font-bold text-primary transition-colors hover:bg-primary/15"
              >
                <Eye className="h-4 w-4" /> عرض الملف
              </a>
            </article>
          ))}
        </div>
        {files.length === 0 && (
          <EmptyState icon={FolderOpen} title="لا توجد ملفات مرفوعة" description="ستظهر مذكرات وأكواد الكورسات هنا بعد اعتمادها لحسابك." />
        )}
      </div>
    </div>
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

function ProfilePanel({ student, onStudentChange }: { student: Student; onStudentChange: (student: Student) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (!(["image/png", "image/jpeg", "image/webp"].includes(file.type)) || file.size > 3 * 1024 * 1024) {
      toast({ variant: "destructive", title: "صورة غير صالحة", description: "استخدم PNG أو JPG أو WebP بحجم لا يزيد عن 3 MB." }); return;
    }
    setAvatarLoading(true);
    try {
      const cropped = await cropAvatar(file);
      const body = new FormData(); body.append("avatar", cropped, "avatar.webp");
      const response = await fetch("/api/student/avatar", { method: "POST", credentials: "include", body });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      onStudentChange({ ...student, avatarUrl: data.avatarUrl });
      toast({ title: "تم تحديث الصورة" });
    } catch (error) { toast({ variant: "destructive", title: "تعذر رفع الصورة", description: (error as Error).message }); }
    finally { setAvatarLoading(false); }
  };
  const removeAvatar = async () => {
    setAvatarLoading(true);
    try { await api("/api/student/avatar", { method: "DELETE" }); onStudentChange({ ...student, avatarUrl: null }); toast({ title: "تم حذف الصورة" }); }
    catch (error) { toast({ variant: "destructive", title: "تعذر حذف الصورة", description: (error as Error).message }); }
    finally { setAvatarLoading(false); }
  };
  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="حسابي" description="بياناتك الشخصية والتعليمية وإعدادات الحساب." />

      {/* Avatar Card */}
      <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-right sm:items-center sm:gap-5">
          <div className="shrink-0">
            <StudentAvatar name={student.name} src={student.avatarUrl} size="lg" />
          </div>
          <div className="flex-1 min-w-0">
            <StatusBadge>حساب متفعّل</StatusBadge>
            <h2 className="mt-2 text-xl font-extrabold text-foreground truncate">{student.name}</h2>
            <p className="text-[13px] text-muted-foreground">{student.grade || "طالب بمنصة د. محمود المهدي"}</p>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" disabled={avatarLoading} onClick={() => inputRef.current?.click()}>
                <Camera className="h-4 w-4" /> {avatarLoading ? "جاري الحفظ..." : "تغيير الصورة"}
              </Button>
              {student.avatarUrl && (
                <Button type="button" variant="ghost" size="sm" disabled={avatarLoading} onClick={() => void removeAvatar()} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" /> حذف
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-foreground mb-3">المعلومات الشخصية</h2>
          <dl className="divide-y divide-border">
            <ProfileInfoRow label="الاسم" value={student.name} />
            <ProfileInfoRow label="رقم الموبايل" value={student.phone} />
            <ProfileInfoRow label="البريد الإلكتروني" value={student.email || "غير مضاف"} />
            <ProfileInfoRow label="المحافظة" value={student.governorate || "—"} />
            <ProfileInfoRow label="المدينة" value={student.city || "—"} />
          </dl>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-foreground mb-3">المعلومات التعليمية</h2>
          <dl className="divide-y divide-border">
            <ProfileInfoRow label="المرحلة الدراسية" value={student.grade || "—"} />
            <ProfileInfoRow label="نظام الدراسة" value={student.learningMode === "offline" ? "حضوري" : "أونلاين"} />
            <ProfileInfoRow label="حالة الحساب" value="متفعّل ✅" />
            <ProfileInfoRow label="حالة الاشتراك" value={student.paymentStatus === "paid" ? "مدفوع 💳" : student.paymentStatus === "pending_review" ? "قيد المراجعة ⏳" : "مجاني 🆓"} />
          </dl>
        </article>
      </div>
    </div>
  );
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
      <div className="mx-auto grid max-w-[1600px] lg:grid-cols-[260px_1fr]">
        {sidebarOpen && <button className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" aria-label="إغلاق القائمة" onClick={() => setSidebarOpen(false)} />}
        <aside className={`fixed inset-y-0 right-0 z-50 flex w-[272px] flex-col border-l border-border bg-card transition-transform lg:sticky lg:top-0 lg:z-20 lg:min-h-screen ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
          <button className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة"><X className="h-4.5 w-4.5" /></button>
          <div className="flex items-center gap-3 border-b border-border px-5 py-5">
            <img
              src="/logo.webp"
              alt="شعار منصة د. محمود المهدي"
              className="h-10 w-10 rounded-[10px] object-cover ring-1 ring-primary/15"
            />
            <div><strong className="block text-[13px] font-bold text-foreground">بوابة الطالب</strong><span className="text-[11px] text-muted-foreground">د. محمود المهدي</span></div>
          </div>
          <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"><StudentAvatar name={student.name} src={student.avatarUrl} /><div className="min-w-0"><strong className="block truncate text-[13px] font-bold text-foreground">{student.name}</strong><span className="text-[11px] text-muted-foreground">طالب متفعّل</span></div></div>
          <nav className="mt-5 space-y-0.5 px-3">
            {nav.map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => { setTab(value); setSidebarOpen(false); }}
                aria-current={tab === value ? "page" : undefined}
                className={`flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 text-right text-[13px] font-bold transition-all duration-150 ${tab === value ? "bg-primary/10 text-primary shadow-[inset_-3px_0_0_hsl(var(--primary))]" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className={`h-[18px] w-[18px] ${tab === value ? "" : "opacity-70"}`} />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-2 px-4 pb-5">
            <button
              type="button"
              onClick={() => {
                const isDark = document.documentElement.classList.toggle("dark");
                localStorage.setItem("dr_mahmoud_theme", isDark ? "dark" : "light");
              }}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-[13px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Moon className="h-4 w-4 hidden dark:inline" />
              <Sun className="h-4 w-4 dark:hidden" />
              <span className="dark:hidden">الوضع الليلي</span>
              <span className="hidden dark:inline">الوضع النهاري</span>
            </button>
            <a
              href={`https://wa.me/201044348610?text=${encodeURIComponent(
                `مرحباً د. محمود 👋\n\nأود الاستفسار وحجز الكورس من داخل حسابي بالمنصة:\n- الاسم: ${student.name}\n- رقم الهاتف: ${student.phone}\n- المرحلة الدراسية: ${student.grade || "غير محدد"}\n- نظام التعليم: ${student.educationSystem || "غير محدد"}\n- المحافظة/المدينة: ${student.governorate || "غير محدد"} - ${student.city || ""}\n- وضع التعلم: ${student.learningMode === "offline" ? "أوفلاين بالزقازيق" : "أونلاين"}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center rounded-xl border border-border text-[13px] font-bold text-primary transition-colors hover:bg-primary/10 hover:border-primary/20"
            >
              كلم الدعم / حجز كورس 💬
            </a>
            <button
              onClick={logout}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
          </div>
        </aside>
        <section className="min-w-0">
          <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-sm md:px-8 dark:bg-[#111827]/95">
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
            <DashboardPanel
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
            <FilesPanel files={files} />
          ) : tab === "quizzes" ? (
            <QuizzesPanel quizzes={quizzes} onStartQuiz={startQuiz} />
          ) : (
            <ProfilePanel student={student} onStudentChange={setStudent} />
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
