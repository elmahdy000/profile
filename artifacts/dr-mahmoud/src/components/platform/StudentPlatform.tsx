import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoLessonsSection } from "@/components/YoutubeSection";
import { toast } from "@/hooks/use-toast";
import { ACADEMIC_TRACKS, getTrackForStage } from "@/data/academic";

type Student = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  status: string;
  governorate?: string | null;
  city?: string | null;
  grade?: string | null;
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
  subject?: string | null;
  tags?: string[];
  order?: number;
  originalName: string;
  sizeBytes: number;
};
type QuizQuestion = { prompt: string; options: string[] };
type Quiz = {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  stage?: string | null;
  passingScore: number;
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
    <div className="space-y-2 relative text-right w-full" dir="rtl">
      <label htmlFor={id} className="text-sm font-bold block">
        {label}
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
        className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none text-right"
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
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [rememberCode, setRememberCode] = useState(true);
  const [recoveryForm, setRecoveryForm] = useState({ name: "", phone: "" });
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    governorate: "",
    city: "",
    grade: "",
    otherGradeDetail: "",
    learningMode: "online" as "online" | "offline",
  });

  useEffect(() => {
    const remembered = localStorage.getItem("dr_mahmoud_student_code");
    if (remembered) setAccessCode(remembered);
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
        grade: "",
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

  return (
    <main
      className="academy-hero min-h-[calc(100vh-4rem)] px-4 py-12"
      dir="rtl"
    >
      <div className="mx-auto max-w-6xl grid lg:grid-cols-[1fr_1fr] gap-8 items-center">
        <div className="space-y-6 text-right">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
            <ShieldCheck className="h-4 w-4" /> منصة تعليمية آمنة ومخصصة
          </span>
          <h1 className="text-4xl md:text-5xl font-black leading-tight">
            أهلًا بيك في أكاديمية د. محمود المهدي
          </h1>
          <p className="text-muted-foreground text-lg leading-8 max-w-2xl">
            بوابتك للشرح العملي والمسارات والملفات والاختبارات. سجّل طلبك، وبعد
            موافقة الأدمن هتدخل بالكود الخاص بيك.
          </p>
          <div
            className="grid grid-cols-3 gap-2"
            aria-label="خطوات الانضمام للمنصة"
          >
            {[
              ["1", "سجّل بياناتك"],
              ["2", "موافقة الأدمن"],
              ["3", "ابدأ التعلّم"],
            ].map(([number, label], index) => (
              <div
                key={number}
                className="relative rounded-2xl border bg-card p-3 text-center shadow-sm"
              >
                <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-white">
                  {number}
                </span>
                <strong className="mt-2 block text-xs sm:text-sm">
                  {label}
                </strong>
                {index < 2 && (
                  <span className="absolute -left-3 top-7 hidden h-px w-4 bg-primary/30 sm:block" />
                )}
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              ["دروس منظمة", BookOpen],
              ["ملفات خاصة", FileText],
              ["اختبارات ونتائج", ClipboardCheck],
            ].map(([label, Icon]) => (
              <div
                key={label as string}
                className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 font-bold shadow-sm"
              >
                <Icon className="h-5 w-5 text-primary" /> {label as string}
              </div>
            ))}
          </div>
        </div>

        <div className="academy-card p-6 md:p-8 shadow-xl">
          <div className="grid grid-cols-2 rounded-xl bg-muted p-1 mb-7">
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`rounded-lg py-3 font-bold transition ${mode === "login" ? "bg-background text-primary shadow" : "text-muted-foreground"}`}
            >
              دخول الطالب
            </button>
            <button
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`rounded-lg py-3 font-bold transition ${mode === "register" ? "bg-background text-primary shadow" : "text-muted-foreground"}`}
            >
              تسجيل جديد
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
                  اكتب كود EDU اللي وصلك بعد موافقة الأدمن.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="student-code" className="text-sm font-bold">
                  كود الدخول الشخصي
                </label>
                <input
                  id="student-code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  required
                  autoComplete="one-time-code"
                  placeholder="EDU-XXXXXXXX"
                  className="h-14 w-full rounded-xl border border-border bg-background px-4 text-center font-mono text-lg tracking-widest focus:border-primary focus:outline-none"
                />
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
            <form onSubmit={submitRegistration} className="space-y-4">
              <div>
                <h2 className="text-2xl font-black">تسجيل طالب جديد</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  اكتب بياناتك، والأدمن هيراجعها قبل ما يفعّل حسابك.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="student-name" className="text-sm font-bold">
                  اسم الطالب
                </label>
                <input
                  id="student-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="student-phone" className="text-sm font-bold">
                  رقم الهاتف
                </label>
                <input
                  id="student-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  inputMode="tel"
                  placeholder="01xxxxxxxxx"
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="student-email" className="text-sm font-bold">
                  البريد الإلكتروني (اختياري)
                </label>
                <input
                  id="student-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <label htmlFor="student-grade" className="text-sm font-bold">
                  المرحلة الدراسية
                </label>
                <select
                  id="student-grade"
                  value={form.grade}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      grade: e.target.value,
                      otherGradeDetail:
                        e.target.value !== "أخرى" ? "" : form.otherGradeDetail,
                    })
                  }
                  required
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none"
                >
                  <option value="">اختر المرحلة الدراسية</option>
                  {ACADEMIC_TRACKS.map((track) => (
                    <optgroup key={track.id} label={track.title}>
                      {track.stages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="أخرى">أخرى (يرجى التحديد)</option>
                </select>
              </div>
              {form.grade === "أخرى" && (
                <div className="space-y-2">
                  <label
                    htmlFor="student-other-grade"
                    className="text-sm font-bold"
                  >
                    تحديد المرحلة الدراسية الأخرى
                  </label>
                  <input
                    id="student-other-grade"
                    value={form.otherGradeDetail}
                    onChange={(e) =>
                      setForm({ ...form, otherGradeDetail: e.target.value })
                    }
                    required
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none"
                    placeholder="اكتب مرحلتك الدراسية بالتفصيل"
                  />
                </div>
              )}
              <fieldset className="space-y-2">
                <legend className="text-sm font-bold">نظام الدراسة</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["online", "أونلاين", "هتتابع فيديوهات الأونلاين"],
                      ["offline", "أوفلاين", "هتتابع فيديوهات السنتر"],
                    ] as const
                  ).map(([value, label, description]) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-xl border p-3 transition ${form.learningMode === value ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "bg-background hover:border-primary/40"}`}
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
                      <strong className="block text-sm">{label}</strong>
                      <small className="mt-1 block text-xs text-muted-foreground">
                        {description}
                      </small>
                    </label>
                  ))}
                </div>
              </fieldset>
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
  return (
    <section className="container mx-auto px-4 py-12" dir="rtl">
      <div className="mb-8">
        <h2 className="text-3xl font-black">الملفات والمرفقات</h2>
        <p className="text-muted-foreground mt-2">
          هنا هتلاقي المذكرات والأكواد والتمارين الخاصة بمرحلتك وكورساتك.
        </p>
      </div>
      {files.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-16 text-center text-muted-foreground">
          مفيش ملفات مرفوعة دلوقتي.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {files.map((file) => (
            <article key={file.id} className="academy-card p-5">
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <FileText />
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs">
                    {file.stage || file.category}
                  </span>
                  {file.subject && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      {file.subject}
                    </span>
                  )}
                </div>
              </div>
              <h3 className="font-black text-lg">{file.title}</h3>
              <p className="mt-1 text-xs font-bold text-primary">
                {file.category}
              </p>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {file.description || file.originalName}
              </p>
              <a
                href={`/api/learning/files/${file.id}/download`}
                className="mt-5 inline-flex items-center gap-2 font-bold text-primary"
              >
                <Download className="h-4 w-4" /> حمّل الملف
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
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
    <section className="container mx-auto px-4 py-12" dir="rtl">
      <div className="mb-8">
        <h2 className="text-3xl font-black">الاختبارات</h2>
        <p className="text-muted-foreground mt-2">
          اختبر نفسك واعرف نتيجتك فورًا.
        </p>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {quizzes.map((quiz) => (
          <article key={quiz.id} className="academy-card p-6">
            <span className="text-xs font-bold text-primary">
              {quiz.category}
            </span>
            {quiz.stage && (
              <span className="mr-2 rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                {quiz.stage}
              </span>
            )}
            <h3 className="text-xl font-black mt-2">{quiz.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {quiz.questions.length} أسئلة · النجاح من {quiz.passingScore}%
            </p>
            <Button
              onClick={() => onStartQuiz(quiz)}
              className="mt-5 w-full font-bold"
            >
              ابدأ الاختبار
            </Button>
          </article>
        ))}
      </div>
      {quizzes.length === 0 && (
        <div className="rounded-3xl border border-dashed p-16 text-center text-muted-foreground">
          مفيش اختبارات منشورة دلوقتي.
        </div>
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
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "ملفات مرفوعة",
      value: String(files.length),
      icon: FolderOpen,
      color: "text-cyan-700",
      bg: "bg-cyan-500/10",
    },
    {
      label: "اختبارات",
      value: String(quizzes.length),
      icon: ClipboardCheck,
      color: "text-amber-700",
      bg: "bg-amber-500/10",
    },
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
    <div className="space-y-6 p-4 pb-28 md:p-6 lg:pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black md:text-3xl">
            أهلًا بيك، {student.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {academicTrack
              ? `${academicTrack.title} — محتواك مرتب حسب كورساتك ومرحلتك.`
              : "كمّل من مكان ما وقفت، وخليك ثابت على خطتك."}
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${student.learningMode === "offline" ? "bg-violet-500/10 text-violet-700" : "bg-sky-500/10 text-sky-700"}`}
        >
          {student.learningMode === "offline"
            ? "نظامك: أوفلاين"
            : "نظامك: أونلاين"}
        </span>
      </div>
      {dataError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between"
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
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <article key={label} className="academy-card p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1">
              <strong className="block text-xl sm:text-2xl">{value}</strong>
              <div
                className={`grid h-8 w-8 place-items-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${bg} ${color}`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground sm:text-xs">
              {label}
            </p>
          </article>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_.7fr]">
        <article className="academy-card overflow-hidden">
          <div className="grid md:grid-cols-[.9fr_1.1fr]">
            <div className="relative min-h-52 bg-slate-900">
              <img
                src={academicTrack?.image || "/university-cs-path.png"}
                alt={academicTrack?.imageAlt || "الدرس اللي بتذاكره"}
                className="h-full w-full object-cover opacity-70"
              />
              {continueVideo && (
                <button
                  onClick={() => onOpen("lessons")}
                  aria-label={`شغّل ${continueVideo.title}`}
                  className="absolute inset-0 m-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-xl transition hover:scale-105"
                >
                  <Play className="h-6 w-6 fill-current" />
                </button>
              )}
            </div>
            <div className="flex flex-col justify-center p-5 text-right">
              <span className="w-fit rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-bold text-cyan-700">
                {continueProgress > 0 ? "كمّل من مكان ما وقفت" : "ابدأ رحلتك"}
              </span>
              <h2 className="mt-2 text-xl font-black md:text-2xl">
                {continueVideo?.title || "محتواك هيظهر هنا قريب"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {continueVideo
                  ? `${continueVideo.subject || continueVideo.category} — تقدمك بيتحفظ تلقائي على حسابك.`
                  : "لسه مفيش دروس منشورة ليك. أول ما المحتوى يتضاف هتلاقيه هنا."}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${continueProgress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>{continueProgress}% من الدرس</span>
                <span>{averageProgress}% إجمالي التقدم</span>
              </div>
              <Button
                disabled={!continueVideo}
                onClick={() => onOpen("lessons")}
                className="mt-4 h-11 w-fit font-bold"
              >
                {continueProgress > 0 ? "كمّل الدرس" : "ابدأ أول درس"}{" "}
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </article>
        <article className="academy-card p-6">
          <h2 className="text-xl font-black">الخطوة اللي بعدها</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            اختصار لأحدث حاجة متاحة ليك.
          </p>
          <div className="mt-5 space-y-4">
            {quizzes[0] && (
              <button
                onClick={() => onOpen("quizzes")}
                className="flex w-full items-center gap-3 rounded-xl bg-amber-500/10 p-3 text-right transition hover:bg-amber-500/15"
              >
                <ClipboardCheck className="text-amber-600" />
                <span>
                  <strong className="block">{quizzes[0].title}</strong>
                  <small className="text-muted-foreground">
                    {quizzes[0].questions.length} أسئلة — ابدأ لما تكون جاهز
                  </small>
                </span>
              </button>
            )}
            {files[0] && (
              <button
                onClick={() => onOpen("files")}
                className="flex w-full items-center gap-3 rounded-xl bg-primary/5 p-3 text-right transition hover:bg-primary/10"
              >
                <FileText className="text-primary" />
                <span>
                  <strong className="block">{files[0].title}</strong>
                  <small className="text-muted-foreground">
                    أحدث ملف متاح للتحميل
                  </small>
                </span>
              </button>
            )}
            {!quizzes.length && !files.length && (
              <div className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-emerald-600" />
                مفيش مهام مطلوبة منك دلوقتي. ركّز في دروسك براحتك.
              </div>
            )}
          </div>
        </article>
      </div>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black">أحدث الملفات</h2>
          <button
            onClick={() => onOpen("files")}
            className="font-bold text-primary"
          >
            عرض الكل
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {files.slice(0, 4).map((file) => (
            <article key={file.id} className="academy-card p-4">
              <div className="grid h-24 place-items-center rounded-xl bg-[#e7eeff]">
                <FileText className="h-9 w-9 text-primary/40" />
              </div>
              <h3 className="mt-3 line-clamp-1 font-bold">{file.title}</h3>
              <a
                href={`/api/learning/files/${file.id}/download`}
                className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary/10 text-sm font-bold text-primary"
              >
                <Download className="h-4 w-4" /> تحميل
              </a>
            </article>
          ))}
        </div>
        {files.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            أول ما الأدمن يرفع ملفات هتظهر لك هنا.
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilePanel({ student }: { student: Student }) {
  return (
    <div className="space-y-6 p-4 md:p-8">
      <article className="academy-card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <img
            src="/dr-mahmoud-photo.png"
            alt="صورة الحساب"
            className="h-28 w-28 rounded-full border-4 border-primary/10 object-cover"
          />
          <div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">
              حساب متفعّل
            </span>
            <h1 className="mt-3 text-3xl font-black">{student.name}</h1>
            <p className="text-muted-foreground">
              طالب في أكاديمية د. محمود المهدي
            </p>
          </div>
        </div>
      </article>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <article className="academy-card p-6">
          <h2 className="text-xl font-black">بيانات الحساب</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-bold">الاسم</span>
              <input
                value={student.name}
                readOnly
                className="h-12 w-full rounded-lg border bg-muted px-4"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold">رقم الموبايل</span>
              <input
                value={student.phone}
                readOnly
                className="h-12 w-full rounded-lg border bg-muted px-4"
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-bold">الإيميل</span>
              <input
                value={student.email || "مش مضاف"}
                readOnly
                className="h-12 w-full rounded-lg border bg-muted px-4"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold">المحافظة</span>
              <input
                value={student.governorate || "غير محدد"}
                readOnly
                className="h-12 w-full rounded-lg border bg-muted px-4"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold">المدينة / المركز</span>
              <input
                value={student.city || "غير محدد"}
                readOnly
                className="h-12 w-full rounded-lg border bg-muted px-4"
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-bold">المرحلة الدراسية</span>
              <input
                value={
                  student.grade === "أخرى"
                    ? student.otherGradeDetail || "أخرى"
                    : student.grade || "غير محدد"
                }
                readOnly
                className="h-12 w-full rounded-lg border bg-muted px-4"
              />
            </label>
          </div>
        </article>
        <article className="academy-card p-6">
          <Trophy className="h-10 w-10 text-amber-500" />
          <h2 className="mt-4 text-xl font-black">إنجازاتك</h2>
          <p className="mt-2 text-muted-foreground">
            كل اختبار تنجح فيه وشهادة تخلصها هتظهر هنا.
          </p>
        </article>
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  // Quiz active states
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setQuizAnswers(Array(quiz.questions.length).fill(-1));
    setQuizResult(null);
  };

  const submitQuiz = async () => {
    if (!activeQuiz || quizAnswers.some((a) => a < 0)) return;
    setQuizSubmitting(true);
    try {
      const res = await api<{ score: number; passed: boolean }>(
        `/api/learning/quizzes/${activeQuiz.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers: quizAnswers }),
        },
      );
      setQuizResult(res);
    } catch (err) {
      toast({ variant: "destructive", title: "خطأ في الاختبار", description: (err as Error).message });
    } finally {
      setQuizSubmitting(false);
    }
  };

  useEffect(() => {
    api<{ student: Student }>("/api/student/me")
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
    } catch (err) {
      setDataError((err as Error).message || "مقدرناش نحمّل محتواك دلوقتي.");
    } finally {
      setDataLoading(false);
    }
  };
  useEffect(() => {
    void loadLearningData();
  }, [student]);
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
      className="min-h-[calc(100vh-4rem)] bg-[#f9f9ff] pb-24 lg:pb-0"
      dir="rtl"
    >
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[240px_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-l border-border bg-white p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b pb-5">
            <img
              src="/logo.jpg"
              alt="اللوجو"
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <strong className="block">{student.name}</strong>
              <span className="text-xs text-muted-foreground">طالب متفعّل</span>
            </div>
          </div>
          <nav className="mt-5 space-y-1">
            {nav.map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                aria-current={tab === value ? "page" : undefined}
                className={`flex min-h-12 w-full items-center gap-3 rounded-lg border-r-4 px-4 text-right font-bold ${tab === value ? "border-primary bg-[#d7e2ff] text-primary" : "border-transparent text-muted-foreground hover:bg-muted"}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-2">
            <a
              href="https://wa.me/201044348610"
              className="flex h-12 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white"
            >
              كلم الدعم
            </a>
            <button
              onClick={logout}
              className="flex h-12 w-full items-center justify-center gap-2 text-sm font-bold text-red-600"
            >
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
          </div>
        </aside>
        <section className="min-w-0">
          <div className="sticky top-16 z-30 flex h-14 items-center justify-between border-b bg-white/95 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications((current) => !current)}
                  aria-label="الإشعارات"
                  aria-expanded={showNotifications}
                  className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-white text-muted-foreground hover:text-primary"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                      {Math.min(unreadNotifications, 9)}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
                    >
                      <div className="border-b p-4">
                        <strong>الإشعارات</strong>
                        <p className="text-xs text-muted-foreground">كل جديد في حسابك وكورساتك</p>
                      </div>
                      <div className="max-h-80 overflow-y-auto p-2">
                        {notifications.length === 0 ? (
                          <p className="p-6 text-center text-sm text-muted-foreground">مفيش إشعارات جديدة</p>
                        ) : notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => void markNotificationRead(notification)}
                            className={`mb-1 w-full rounded-xl p-3 text-right transition hover:bg-muted ${notification.readAt ? "opacity-70" : "bg-primary/5"}`}
                          >
                            <span className="flex items-start gap-2">
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-slate-300" : "bg-primary"}`} />
                              <span>
                                <strong className="block text-sm">{notification.title}</strong>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{notification.message}</span>
                                <span className="mt-1 block text-[10px] text-muted-foreground">{new Date(notification.createdAt).toLocaleDateString("ar-EG")}</span>
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className="text-sm font-bold text-primary">
                Academy Portal
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              اتعلم، طبّق، واتقدم
            </span>
          </div>
          {tab === "dashboard" ? (
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
            <ProfilePanel student={student} />
          )}
        </section>
      </div>

      <nav
        aria-label="التنقل الرئيسي"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,.06)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {nav.map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              aria-current={tab === value ? "page" : undefined}
              className={`my-1 flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tab === value ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
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
        {activeQuiz && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/70 p-4 overflow-y-auto flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveQuiz(null)}
          >
            <motion.div
              className="w-full max-w-2xl rounded-2xl bg-background p-6 md:p-8 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <h2 className="text-2xl font-black text-right mb-4">
                {activeQuiz.title}
              </h2>
              <div className="mt-6 space-y-7 text-right max-h-[60vh] overflow-y-auto px-2">
                {activeQuiz.questions.map((q, qi) => (
                  <fieldset key={qi} className="space-y-3">
                    <legend className="font-bold mb-3">
                      {qi + 1}. {q.prompt}
                    </legend>
                    <div className="space-y-2">
                      {q.options.map((option, oi) => (
                        <label
                          key={oi}
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                            quizAnswers[qi] === oi
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${qi}`}
                            checked={quizAnswers[qi] === oi}
                            onChange={() =>
                              setQuizAnswers(
                                quizAnswers.map((a, i) => (i === qi ? oi : a)),
                              )
                            }
                            className="text-primary focus:ring-primary h-4 w-4"
                          />
                          <span className="text-sm font-medium">{option}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              {quizResult ? (
                <div
                  className={`mt-7 rounded-2xl p-5 text-center ${
                    quizResult.passed
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-center" />
                  <strong className="text-2xl">{quizResult.score}%</strong>
                  <p className="mt-1 font-bold">
                    {quizResult.passed
                      ? "عاش! نجحت في الاختبار"
                      : "راجع الدروس وجرب تاني"}
                  </p>
                </div>
              ) : (
                <Button
                  onClick={submitQuiz}
                  disabled={quizSubmitting || quizAnswers.some((a) => a < 0)}
                  className="mt-7 w-full h-12 font-bold"
                >
                  {quizSubmitting ? (
                    <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                  ) : (
                    "سلّم الإجابات"
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setActiveQuiz(null)}
                className="mt-2 w-full font-bold"
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
