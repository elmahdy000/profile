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
  Download,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  Loader2,
  LogOut,
  Play,
  Settings,
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
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
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
    <div className="space-y-1 relative text-right w-full" dir="rtl">
      <label htmlFor={id} className="block text-xs font-bold text-foreground/80">
        {label} {required && <span className="text-red-500">*</span>}
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
        className="h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-right text-xs font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 shadow-xs"
      />
      {isOpen && (filtered.length > 0 || search.trim() !== "") && (
        <ul className="absolute z-50 w-full max-h-48 overflow-y-auto rounded-xl border border-border bg-card shadow-lg mt-1 py-1 text-right">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(opt);
                  setSearch(opt);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-right hover:bg-primary/10 text-sm transition-colors text-foreground font-medium"
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
                className="w-full px-4 py-2.5 text-right text-muted-foreground hover:bg-primary/10 text-xs transition-colors"
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [rememberCode, setRememberCode] = useState(false);
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

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api<{ student: Student }>("/api/student/login", {
        method: "POST",
        body: JSON.stringify({ accessCode }),
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
    try {
      await api("/api/student/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(
        "طلبك اتبعت بنجاح. أول ما الأدمن يوافق هيوصلك كود الدخول بتاعك.",
      );
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
  const registrationValid = Boolean(
    nameValid &&
      phoneValid &&
      emailValid &&
      form.governorate &&
      form.city &&
      educationValid &&
      form.learningMode,
  );

  return (
    <main
      className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-50 to-blue-50/50 px-4 py-12 lg:py-16 dir-rtl"
      dir="rtl"
    >
      {/* Glowing Ambient Background Elements */}
      <div className="absolute top-12 right-1/4 h-96 w-96 rounded-full bg-blue-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-12 left-1/4 h-96 w-96 rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(560px,640px)] lg:gap-14">
        {/* Hero Left Info Column */}
        <div className="space-y-7 text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/90 px-4 py-2 text-xs md:text-sm font-bold text-blue-700 shadow-xs backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>منصة تعليمية آمنة ومخصصة للطلاب</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
            أهلاً بك في منصة <br />
            <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              د. محمود المهدي
            </span>
          </h1>

          <p className="text-slate-600 text-base md:text-lg leading-8 max-w-2xl font-medium">
            بوابتك الذكية للتأسيس العملي، مشاهدة الدروس، تحميل المذكرات، وحل الاختبارات التفاعلية. سجّل حسابك واطلع على محتوى مرحلتك فور تفعيل كود الدخول.
          </p>

          {/* 3-Step Journey */}
          <div
            className="grid grid-cols-3 gap-3"
            aria-label="خطوات الانضمام للمنصة"
          >
            {[
              ["1", "سجّل بياناتك", "أدخل اسمك ومرحلتك"],
              ["2", "موافقة الأدمن", "تفعيل حسابك بالكود"],
              ["3", "ابدأ التعلّم", "دروس ومذكرات واختبارات"],
            ].map(([number, label, desc], index) => (
              <div
                key={number}
                className="relative rounded-2xl border border-slate-200/90 bg-card/80 p-3.5 text-center shadow-xs transition-all hover:shadow-md hover:border-blue-300 backdrop-blur-sm"
              >
                <span className="mx-auto grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-primary to-blue-500 text-xs font-black text-white shadow-md shadow-blue-500/20">
                  {number}
                </span>
                <strong className="mt-2.5 block text-xs sm:text-sm font-black text-slate-900">
                  {label}
                </strong>
                <span className="hidden sm:block mt-1 text-[11px] text-slate-500 font-medium truncate">
                  {desc}
                </span>
                {index < 2 && (
                  <span className="absolute -left-3 top-8 hidden h-px w-4 bg-blue-300 sm:block" />
                )}
              </div>
            ))}
          </div>

          {/* Key Features Pills */}
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            {[
              ["دروس شرح منظمة", BookOpen, "مباشرة وأونلاين"],
              ["مذكرات وقوالب PDF", FileText, "معاينة وتحميل سريع"],
              ["اختبارات وتقييم آلي", ClipboardCheck, "تصحيح ونتائج فورية"],
            ].map(([label, Icon, sub]) => (
              <div
                key={label as string}
                className="rounded-2xl border border-slate-200/80 bg-card/90 p-4 flex items-center gap-3.5 font-bold shadow-xs transition-all hover:shadow-md hover:border-blue-300"
              >
                <div className="p-2.5 rounded-xl bg-blue-50 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <strong className="block text-xs md:text-sm text-slate-900">{label as string}</strong>
                  <span className="text-[11px] text-slate-500 font-normal">{sub as string}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Glassmorphism Access Card */}
        <div className="w-full rounded-[28px] border border-slate-200/90 bg-card/95 p-6 shadow-2xl shadow-blue-900/10 backdrop-blur-2xl sm:p-9">
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100/90 p-1.5 mb-7 border border-slate-200/60 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`rounded-xl py-3 font-extrabold text-xs sm:text-sm transition-all ${
                mode === "login"
                  ? "bg-card text-primary shadow-sm shadow-slate-200"
                  : "text-slate-500 hover:text-slate-900"
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
              className={`rounded-xl py-3 font-extrabold text-xs sm:text-sm transition-all ${
                mode === "register"
                  ? "bg-card text-primary shadow-sm shadow-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              تسجيل طالب جديد
            </button>
          </div>
          {mode === "register" && message ? (
            <div className="py-4 text-center" role="status">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="mt-5 text-2xl font-black">طلبك وصل بنجاح</h2>
              <p className="mx-auto mt-2 max-w-sm leading-7 text-muted-foreground">
                الأدمن هيراجع بياناتك، وبعد الموافقة هيوصلك كود EDU الخاص بيك
                عشان تدخل على محتوى مرحلتك.
              </p>
              <div className="mt-6 rounded-2xl border bg-muted/40 p-4 text-right text-sm">
                <strong className="block">الخطوة الجاية</strong>
                <span className="mt-1 block text-muted-foreground">
                  احتفظ بالكود لما يوصلك، والمنصة تقدر تفتكرهولك على جهازك
                  الشخصي.
                </span>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMessage("");
                }}
                className="mt-6 h-12 w-full rounded-xl font-bold"
              >
                عندي الكود — دخول المنصة
              </Button>
              <a
                href="https://wa.me/201044348610"
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border font-bold text-primary"
              >
                محتاج مساعدة؟ كلمنا واتساب
              </a>
            </div>
          ) : mode === "recover" ? (
            <form onSubmit={submitRecovery} className="space-y-5">
              <div>
                <h2 className="text-2xl font-black">استرجاع كود الدخول</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  اكتب نفس الاسم ورقم الموبايل اللي سجلت بيهم، والأدمن هيراجع الطلب ويتواصل معاك بأمان.
                </p>
              </div>
              {message ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800" role="status">
                  {message}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="recovery-name" className="text-sm font-bold">اسم الطالب</label>
                    <input
                      id="recovery-name"
                      required
                      value={recoveryForm.name}
                      onChange={(event) => setRecoveryForm({ ...recoveryForm, name: event.target.value })}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="recovery-phone" className="text-sm font-bold">رقم الموبايل المسجل</label>
                    <input
                      id="recovery-phone"
                      type="tel"
                      required
                      value={recoveryForm.phone}
                      onChange={(event) => setRecoveryForm({ ...recoveryForm, phone: event.target.value })}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-left"
                      dir="ltr"
                    />
                  </div>
                  {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
                  <Button disabled={loading} className="h-12 w-full rounded-xl font-bold">
                    {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                    إرسال طلب الاسترجاع
                  </Button>
                </>
              )}
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setMessage(""); }}
                className="w-full text-sm font-bold text-primary"
              >
                رجوع لتسجيل الدخول
              </button>
            </form>
          ) : mode === "login" ? (
            <form onSubmit={submitLogin} className="space-y-5">
              <div>
                <h2 className="text-2xl font-black">دخول الطلاب</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  اكتب كود الدخول المكوّن من 6 خانات بعد موافقة الأدمن.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="student-code" className="text-sm font-bold">
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
                    className="h-14 w-full rounded-xl border border-border bg-background px-12 text-center font-mono text-lg tracking-widest focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessCode((visible) => !visible)}
                    aria-label={showAccessCode ? "إخفاء كود الدخول" : "إظهار كود الدخول"}
                    aria-pressed={showAccessCode}
                    className="absolute left-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary"
                  >
                    {showAccessCode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <input
                  type="checkbox"
                  checked={rememberCode}
                  onChange={(e) => setRememberCode(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <strong className="block text-sm">
                    افتكر الكود على الجهاز
                  </strong>
                  <small className="text-muted-foreground">
                    ماتفعّلهاش لو الجهاز مش شخصي.
                  </small>
                </span>
              </label>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600"
                >
                  {error}
                </p>
              )}
              <Button
                disabled={loading}
                className="h-13 w-full rounded-xl text-base font-bold"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ShieldCheck />
                )}{" "}
                دخول المنصة
              </Button>
              <button
                type="button"
                onClick={() => { setMode("recover"); setError(""); setMessage(""); }}
                className="w-full text-center text-sm font-bold text-primary hover:underline"
              >
                نسيت كود الدخول؟
              </button>
              <p className="text-center text-xs text-muted-foreground">
                لسه طلبك ما اتقبلش؟ كلمنا بعد ما تبعت التسجيل.
              </p>
            </form>
          ) : (
            <form onSubmit={submitRegistration} className="space-y-4" noValidate>
              <div>
                <h2 className="text-xl font-bold leading-tight text-foreground">تسجيل طالب جديد</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  اكتب بياناتك، والأدمن هيراجعها قبل ما يفعّل حسابك.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col text-xs font-bold text-foreground/80">
                  <label htmlFor="student-name" className="mb-1.5 block">
                    اسم الطالب <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="student-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    aria-invalid={Boolean(form.name) && !nameValid}
                    className="h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 shadow-xs"
                  />
                  {form.name && !nameValid && <p className="mt-1 text-[11px] text-red-600">اكتب اسم الطالب بشكل صحيح.</p>}
                </div>
                <div className="flex flex-col text-xs font-bold text-foreground/80">
                  <label htmlFor="student-phone" className="mb-1.5 block">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="student-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    inputMode="tel"
                    placeholder="01xxxxxxxxx"
                    aria-invalid={Boolean(form.phone) && !phoneValid}
                    className="h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 shadow-xs"
                  />
                  {form.phone && !phoneValid && <p className="mt-1 text-[11px] text-red-600">رقم الهاتف من 10 إلى 15 رقمًا.</p>}
                </div>
              </div>
              <div className="flex flex-col text-xs font-bold text-foreground/80">
                <label htmlFor="student-email" className="mb-1.5 block">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  id="student-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  aria-invalid={!emailValid}
                  className="h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 shadow-xs"
                />
                {!emailValid && <p className="mt-1 text-[11px] text-red-600">صيغة البريد الإلكتروني غير صحيحة.</p>}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SearchableCombobox
                  id="student-governorate"
                  label="المحافظة"
                  value={form.governorate}
                  onChange={(val) =>
                    setForm({ ...form, governorate: val, city: "" })
                  }
                  options={Object.keys(EGYPT_GOVERNORATES)}
                  placeholder="مثال: القاهرة"
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
                  placeholder="مثال: حلوان"
                  required
                />
              </div>
              <RegistrationStageSelector
                value={form}
                onChange={(selection) =>
                  setForm({ ...form, ...selection, otherGradeDetail: "" })
                }
              />
              <fieldset className="space-y-2 rounded-xl border border-border/70 bg-muted/15 p-3 sm:p-4">
                <legend className="px-1 text-xs font-extrabold uppercase text-primary tracking-wide">
                  2. نظام الدراسة
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
                      className={`relative flex min-h-[56px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition focus-within:ring-2 focus-within:ring-primary/30 ${form.learningMode === value ? "border-primary bg-blue-50/70 ring-1 ring-primary/20" : "border-border/80 bg-background hover:border-primary/40"}`}
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
                        <strong className="block text-xs font-bold">{label}</strong>
                        <small className="block text-[11px] text-muted-foreground">{description}</small>
                      </span>
                      {form.learningMode === value && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                    </label>
                  ))}
                </div>
              </fieldset>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-500/10 p-2.5 text-xs text-red-600 font-semibold"
                >
                  {error}
                </p>
              )}
              <Button
                disabled={loading || !registrationValid}
                className="mt-4 h-11 w-full rounded-lg text-sm font-bold shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}{" "}
                إرسال طلب التسجيل
              </Button>
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
                  <img src={`/api/learning/files/${previewFile.id}/preview`} alt={previewFile.title} className="h-full w-full object-contain" />
                ) : previewFile.mimeType === "application/pdf" || previewFile.mimeType?.startsWith("text/") ? (
                  <iframe src={`/api/learning/files/${previewFile.id}/preview`} title={previewFile.title} className="h-full w-full rounded-xl border border-border bg-card" />
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
  const previewUrl = `/api/learning/files/${file.id}/preview`;
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
              <span>{quiz.questions.length} أسئلة</span>
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
  onOpen: (tab: "lessons" | "files" | "quizzes") => void;
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
  const stats = [
    {
      label: "دروس متاحة",
      value: String(videos.length),
      icon: BookOpen,
      helper: "مخصصة لمرحلتك",
    },
    {
      label: "ملفات مرفوعة",
      value: String(files.length),
      icon: FolderOpen,
      helper: "جاهزة للتحميل",
    },
    {
      label: "اختبارات",
      value: String(quizzes.length),
      icon: ClipboardCheck,
      helper: "منشورة حاليًا",
    },
    { label: "إجمالي التقدم", value: `${averageProgress}%`, icon: BarChart3, helper: "عبر كل الدروس" },
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                    className={`rounded-2xl border p-4 text-right shadow-sm ${isComplete ? "border-emerald-500/40 bg-emerald-500/8 dark:border-emerald-700 dark:bg-emerald-900/20" : "border-border bg-card"}`}
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
      <div className="grid gap-5 xl:grid-cols-[1.5fr_.7fr]">
        <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
          <div className="grid md:grid-cols-[.9fr_1.1fr]">
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
                href={`/api/learning/files/${file.id}/download`}
                className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-primary/10 text-[12px] font-bold text-primary transition-colors hover:bg-primary/15"
              >
                <Download className="h-4 w-4" /> تحميل
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
    <div className="space-y-7">
      <PageHeader title="حسابي" description="بياناتك الشخصية والتعليمية وإعدادات الحساب." />
      <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <StudentAvatar name={student.name} src={student.avatarUrl} size="lg" />
          <div>
            <StatusBadge>حساب متفعّل</StatusBadge><h2 className="mt-3 text-xl font-extrabold text-foreground">{student.name}</h2><p className="text-[13px] text-muted-foreground">{student.grade || "طالب بمنصة د. محمود المهدي"}</p>
            <div className="mt-4 flex flex-wrap gap-2"><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void uploadAvatar(event.target.files?.[0])} /><Button type="button" variant="outline" disabled={avatarLoading} onClick={() => inputRef.current?.click()}><Camera className="h-4 w-4" /> {avatarLoading ? "جاري الحفظ" : "تغيير الصورة"}</Button>{student.avatarUrl && <Button type="button" variant="ghost" disabled={avatarLoading} onClick={() => void removeAvatar()} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /> حذف</Button>}</div>
          </div>
        </div>
      </article>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm"><h2 className="text-base font-extrabold text-foreground">المعلومات الشخصية</h2><dl className="mt-3 grid sm:grid-cols-2"><ProfileInfoRow label="الاسم" value={student.name} /><ProfileInfoRow label="رقم الموبايل" value={student.phone} /><ProfileInfoRow label="البريد الإلكتروني" value={student.email || "غير مضاف"} /><ProfileInfoRow label="المحافظة والمدينة" value={[student.governorate, student.city].filter(Boolean).join("، ")} /></dl>
        </article>
        <article className="rounded-2xl border border-border bg-card p-6 shadow-sm"><h2 className="text-base font-extrabold text-foreground">المعلومات التعليمية</h2><dl className="mt-3"><ProfileInfoRow label="المرحلة الدراسية" value={student.grade} /><ProfileInfoRow label="نظام الدراسة" value={student.learningMode === "offline" ? "حضوري" : "أونلاين"} /><ProfileInfoRow label="حالة الحساب" value="متفعّل" /></dl></article>
      </div>
    </div>
  );
}

export function StudentPlatform() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "dashboard" | "lessons" | "files" | "quizzes" | "profile"
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

  // Exam Countdown Timer Effect
  useEffect(() => {
    if (!activeQuiz || quizResult || quizTimeRemaining === null) return;
    if (quizTimeRemaining <= 0) {
      toast({ title: "انتهى وقت الاختبار", description: "جاري تسليم إجاباتك تلقائياً..." });
      void submitQuiz();
      return;
    }
    const timer = setInterval(() => {
      setQuizTimeRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
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
    let questions = [...quiz.questions];
    if (quiz.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }
    setActiveQuiz({ ...quiz, questions });
    setQuizAnswers(Array(questions.length).fill(-1));
    setQuizResult(null);
    setQuizStartTime(Date.now());
    setQuizTimeRemaining(quiz.durationMinutes ? quiz.durationMinutes * 60 : null);
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    setQuizSubmitting(true);
    const timeSpentSeconds = Math.round((Date.now() - quizStartTime) / 1000);
    try {
      const res = await api<{
        score: number;
        passed: boolean;
        correct: number;
        total: number;
        attemptsUsed: number;
        attemptsRemaining: number;
      }>(
        `/api/learning/quizzes/${activeQuiz.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers: quizAnswers, timeSpentSeconds }),
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
  useEffect(() => {
    if (!student) return;
    const stream = new EventSource("/api/learning/notifications/stream", { withCredentials: true });
    const refresh = (event: Event) => {
      const latestId = Number(JSON.parse((event as MessageEvent).data || "{}").latestId || 0);
      if (latestId) latestNotificationIdRef.current = latestId;
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
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;
  const nav = [
    ["dashboard", "الرئيسية", Home],
    ["lessons", "كورساتي", BookOpen],
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
              href="https://wa.me/201044348610"
              className="flex h-10 items-center justify-center rounded-xl border border-border text-[13px] font-bold text-primary transition-colors hover:bg-primary/10 hover:border-primary/20"
            >
              كلم الدعم
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
                      <div className="border-b border-border px-4 py-3">
                        <strong className="text-[14px] font-bold text-foreground">الإشعارات</strong>
                        <p className="text-[11px] text-muted-foreground">كل جديد في حسابك وكورساتك</p>
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
                            className={`mb-0.5 w-full rounded-xl p-3 text-right transition-colors hover:bg-muted ${notification.readAt ? "opacity-60" : "bg-primary/10/50"}`}
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
            <button onClick={() => setTab("profile")} className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-muted"><StudentAvatar name={student.name} src={student.avatarUrl} size="sm" /><span className="hidden max-w-40 truncate text-[13px] font-bold text-foreground sm:block">{student.name}</span></button>
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
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/97 px-1 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-sm lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {nav.map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
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
            onClick={() => setActiveQuiz(null)}
          >
            <motion.div
              className="w-full max-w-xl rounded-3xl bg-background p-5 md:p-6 shadow-2xl relative border border-border"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                <div>
                  <h2 className="text-lg font-black text-foreground" dir="auto">
                    {activeQuiz.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeQuiz.questions.length} أسئلة · نسبة النجاح {activeQuiz.passingScore}%
                  </p>
                </div>
                {quizTimeRemaining !== null && !quizResult && (
                  <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-black transition-colors ${
                    quizTimeRemaining < 60 ? "bg-red-500/10 text-red-500 animate-pulse" : "bg-primary/10 text-primary"
                  }`}>
                    <Clock className="h-4 w-4" />
                    <span>
                      {Math.floor(quizTimeRemaining / 60)}:{String(quizTimeRemaining % 60).padStart(2, "0")}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-5 max-h-[60vh] overflow-y-auto px-1" dir="ltr">
                {activeQuiz.questions.map((q, qi) => {
                  const isSelected = quizAnswers[qi] !== undefined && quizAnswers[qi] >= 0;
                  const isCorrect = quizResult && quizAnswers[qi] === q.correctIndex;
                  const isWrong = quizResult && isSelected && !isCorrect;

                  return (
                    <fieldset key={qi} dir="ltr" className={`space-y-3 rounded-2xl border p-4 text-left transition-colors ${
                      quizResult
                        ? isCorrect
                          ? "border-emerald-500/30 bg-emerald-50/5"
                          : isWrong
                          ? "border-red-500/30 bg-red-50/5"
                          : "border-border"
                        : "border-border bg-card/50"
                    }`}>
                      <legend className="font-extrabold text-base mb-2 text-foreground flex items-center justify-between w-full gap-3 text-left" dir="ltr">
                        <span className="flex-1 text-left whitespace-pre-wrap leading-relaxed" dir="auto">{qi + 1}. {q.prompt}</span>
                        {quizResult && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                            isCorrect ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}>
                            {isCorrect ? "Correct ✓" : "Wrong ✗"}
                          </span>
                        )}
                      </legend>

                      {q.imageUrl && (
                        <div className="my-3 overflow-hidden rounded-xl border border-border bg-muted max-h-56 flex justify-center">
                          <img src={q.imageUrl} alt={`Question ${qi + 1} image`} className="object-contain max-h-56" />
                        </div>
                      )}

                      <div className="space-y-2" dir="ltr">
                        {q.options.map((option, oi) => {
                          const optionSelected = quizAnswers[qi] === oi;
                          const optionIsCorrect = q.correctIndex === oi;
                          let optionStyle = "border-border hover:bg-muted";

                          if (quizResult) {
                            if (optionIsCorrect) {
                              optionStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold";
                            } else if (optionSelected && !optionIsCorrect) {
                              optionStyle = "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300 line-through opacity-80";
                            } else {
                              optionStyle = "border-border opacity-50";
                            }
                          } else if (optionSelected) {
                            optionStyle = "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20";
                          }

                          return (
                            <label
                              key={oi}
                              dir="ltr"
                              className={`flex min-h-11 cursor-pointer items-center justify-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${optionStyle}`}
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
                                className="text-primary focus:ring-primary h-4 w-4 shrink-0"
                              />
                              <span dir="auto" className="text-sm font-semibold flex-1 text-left leading-relaxed">
                                {option}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {quizResult && activeQuiz.showExplanations !== false && q.explanation && (
                        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/8 p-3.5 text-xs text-foreground text-left" dir="auto">
                          <strong className="block font-bold mb-1 text-primary">الشرح:</strong>
                          <span className="text-muted-foreground">{q.explanation}</span>
                        </div>
                      )}
                    </fieldset>
                  );
                })}
              </div>

              {quizResult ? (
                <div
                  className={`mt-5 rounded-2xl p-4 text-center transition-all ${
                    quizResult.passed
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/15 text-red-400 border border-red-500/30"
                  }`}
                >
                  <CheckCircle2 className="mx-auto mb-1.5 h-8 w-8 text-center" />
                  <strong className="text-2xl font-black">{quizResult.score}%</strong>
                  <p className="mt-1 text-sm font-extrabold">
                    {quizResult.passed
                      ? "تم اجتياز الاختبار بنجاح"
                      : "لم تتخطَ درجة النجاح، ادرس المادة جيداً وجرب ثانيةً"}
                  </p>
                  <p className="mt-1.5 text-xs font-bold opacity-80">
                    {quizResult.correct} إجابة صحيحة من {quizResult.total} · {quizResult.attemptsRemaining} محاولة متبقية
                  </p>
                </div>
              ) : (
                <Button
                  onClick={submitQuiz}
                  disabled={quizSubmitting || quizAnswers.some((a) => a < 0)}
                  className="mt-5 w-full h-11 text-sm font-bold rounded-xl shadow-md"
                >
                  {quizSubmitting ? (
                    <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                  ) : (
                    "تسليم وتصحيح الاختبار"
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setActiveQuiz(null)}
                className="mt-1.5 w-full font-bold text-xs text-muted-foreground"
              >
                إغلاق
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
