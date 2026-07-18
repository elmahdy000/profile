import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Bell, BookOpen, CheckCircle2, ChevronLeft, ClipboardCheck, Download, FileText, FolderOpen, GraduationCap, LayoutDashboard, Loader2, LogOut, Play, Settings, ShieldCheck, Trophy, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YoutubeSection } from "@/components/YoutubeSection";

type Student = { id: number; name: string; phone: string; email?: string | null; status: string; governorate?: string | null; city?: string | null; grade?: string | null; otherGradeDetail?: string | null; createdAt?: string };
type LearningFile = { id: number; title: string; description?: string | null; category: string; originalName: string; sizeBytes: number };
type QuizQuestion = { prompt: string; options: string[] };
type Quiz = { id: number; title: string; description?: string | null; category: string; passingScore: number; questions: QuizQuestion[] };

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر إتمام الطلب");
  return data as T;
}

const EGYPT_GOVERNORATES: Record<string, string[]> = {
  "القاهرة": ["حلوان", "المعادي", "مصر الجديدة", "مدينة نصر", "وسط البلد", "شبرا", "التجمع الخامس", "الرحاب", "الشروق", "عين شمس", "المرج", "الزيتون", "العباسية"],
  "الجيزة": ["الدقي", "المهندسين", "الهرم", "فيصل", "6 أكتوبر", "الشيخ زايد", "العجوزة", "الوراق", "إمبابة", "البدرشين", "العياط", "أبو النمرس"],
  "الإسكندرية": ["سيدي بشر", "المنتزه", "سموحة", "الرمل", "العجمي", "السيوف", "محرم بك", "المنشية", "الشاطبي", "ميامي"],
  "القليوبية": ["بنها", "شبرا الخيمة", "قليوب", "الخانكة", "الخصوص", "طوخ", "قها", "شبين القناطر"],
  "المنوفية": ["شبين الكوم", "منوف", "السادات", "أشمون", "الباجور", "قويسنا", "تلا", "الشهداء"],
  "الغربية": ["طنطا", "المحلة الكبرى", "كفر الزيات", "زفتى", "السنطة", "بسيون", "سمنود", "قطور"],
  "الشرقية": ["الزقازيق", "العاشر من رمضان", "بلبيس", "منيا القمح", "أبو حماد", "فاقوس", "أبو كبير", "الحسينية", "كفر صقر"],
  "الدقهلية": ["المنصورة", "ميت غمر", "السنبلاوين", "دكرنس", "شربين", "المنزلة", "طلخا", "بلقاس", "جمصة"],
  "البحيرة": ["دمنهور", "كفر الدوار", "رشيد", "إدكو", "أبو المطامير", "أبو حمص", "الرحمانية", "إيتاي البارود", "حوش عيسى", "كوم حمادة"],
  "كفر الشيخ": ["كفر الشيخ", "دسوق", "قلين", "سيدي سالم", "الرياض", "فوه", "مطوبس", "بيلا", "الحامول", "بلطيم"],
  "الفيوم": ["الفيوم", "سنورس", "طامية", "إطسا", "أبشواي", "يوسف الصديق"],
  "بني سويف": ["بني سويف", "الواسطى", "ناصر", "ببا", "الفشن", "سمسطا", "اهناسيا"],
  "المنيا": ["المنيا", "ملوي", "بني مزار", "مغاغة", "سمالوط", "أبو قرقاص", "دير مواس", "العدوة", "مطاي"],
  "أسيوط": ["أسيوط", "ديروط", "منفلوط", "القوصية", "أبنوب", "أبو تيج", "الغنايم", "ساحل سليم", "البداري", "صدفا"],
  "سوهاج": ["سوهاج", "طما", "طهطا", "المراغة", "جهينة", "ساقلتة", "أخميم", "المنشأة", "جرجا", "البلينا", "دار السلام"],
  "قنا": ["قنا", "نجع حمادي", "دشنا", "أبو تشت", "فرشوط", "قفط", "نقادة", "قوص", "الوقف"],
  "الأقصر": ["الأقصر", "القرنة", "أرمنت", "إسنا", "الطود", "البياضية"],
  "أسوان": ["أسوان", "كوم أمبو", "إدفو", "نصر النوبة", "درو"],
  "دمياط": ["دمياط", "دمياط الجديدة", "رأس البر", "فارسكور", "الزرقا", "كفر سعد"],
  "بورسعيد": ["بورسعيد", "بورفؤاد"],
  "السويس": ["السويس", "الأربعين", "الجناين", "عتاقة"],
  "الإسماعيلية": ["الإسماعيلية", "التل الكبير", "فايد", "القنطرة شرق", "القنطرة غرب", "أبو صوير", "القصاصين"],
  "البحر الأحمر": ["الغردقة", "سفاجا", "القصير", "مرسى علم", "شلاتين", "حلايب", "رأس غارب"],
  "الوادي الجديد": ["الخارجة", "الداخلة", "الفرافرة", "باريس", "بلاط"],
  "مطروح": ["مرسى مطروح", "العلمين", "الضبعة", "سيدي براني", "السلوم", "سيوة"],
  "شمال سيناء": ["العريش", "الشيخ زويد", "رفح", "بئر العبد"],
  "جنوب سيناء": ["شرم الشيخ", "دهب", "نويبع", "طابا", "طور سيناء", "رأس سدر", "أبو زنيمة", "أبو رديس"]
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

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2 relative text-right w-full" dir="rtl">
      <label htmlFor={id} className="text-sm font-bold block">{label}</label>
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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    governorate: "",
    city: "",
    grade: "",
    otherGradeDetail: "",
  });

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await api<{ student: Student }>("/api/student/login", {
        method: "POST", body: JSON.stringify({ accessCode }),
      });
      onLogin(result.student);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const submitRegistration = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      await api("/api/student/register", { method: "POST", body: JSON.stringify(form) });
      setMessage("طلبك اتبعت بنجاح. أول ما الأدمن يوافق هيوصلك كود الدخول بتاعك.");
      setForm({
        name: "",
        phone: "",
        email: "",
        governorate: "",
        city: "",
        grade: "",
        otherGradeDetail: "",
      });
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <main className="academy-hero min-h-[calc(100vh-4rem)] px-4 py-12" dir="rtl">
      <div className="mx-auto max-w-6xl grid lg:grid-cols-[1fr_1fr] gap-8 items-center">
        <div className="space-y-6 text-right">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
            <ShieldCheck className="h-4 w-4" /> منصة تعليمية آمنة ومخصصة
          </span>
          <h1 className="text-4xl md:text-5xl font-black leading-tight">أهلًا بيك في أكاديمية د. محمود المهدي</h1>
          <p className="text-muted-foreground text-lg leading-8 max-w-2xl">بوابتك للشرح العملي والمسارات والملفات والاختبارات. سجّل طلبك، وبعد موافقة الأدمن هتدخل بالكود الخاص بيك.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[['دروس منظمة', BookOpen], ['ملفات خاصة', FileText], ['اختبارات ونتائج', ClipboardCheck]].map(([label, Icon]) => (
              <div key={label as string} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 font-bold shadow-sm">
                <Icon className="h-5 w-5 text-primary" /> {label as string}
              </div>
            ))}
          </div>
        </div>

        <div className="academy-card p-6 md:p-8 shadow-xl">
          <div className="grid grid-cols-2 rounded-xl bg-muted p-1 mb-7">
            <button onClick={() => { setMode("login"); setError(""); }} className={`rounded-lg py-3 font-bold transition ${mode === "login" ? "bg-background text-primary shadow" : "text-muted-foreground"}`}>دخول الطالب</button>
            <button onClick={() => { setMode("register"); setError(""); }} className={`rounded-lg py-3 font-bold transition ${mode === "register" ? "bg-background text-primary shadow" : "text-muted-foreground"}`}>تسجيل جديد</button>
          </div>
          {mode === "login" ? (
            <form onSubmit={submitLogin} className="space-y-5">
              <div><h2 className="text-2xl font-black">دخول الطلاب</h2><p className="text-sm text-muted-foreground mt-1">اكتب كود EDU اللي وصلك بعد موافقة الأدمن.</p></div>
              <div className="space-y-2"><label htmlFor="student-code" className="text-sm font-bold">كود الدخول الشخصي</label><input id="student-code" value={accessCode} onChange={(e) => setAccessCode(e.target.value.toUpperCase())} required autoComplete="one-time-code" placeholder="EDU-XXXXXXXX" className="h-14 w-full rounded-xl border border-border bg-background px-4 text-center font-mono text-lg tracking-widest focus:border-primary focus:outline-none" /></div>
              {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
              <Button disabled={loading} className="h-13 w-full rounded-xl text-base font-bold">{loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />} دخول المنصة</Button>
              <p className="text-center text-xs text-muted-foreground">لسه طلبك ما اتقبلش؟ كلمنا بعد ما تبعت التسجيل.</p>
            </form>
          ) : (
            <form onSubmit={submitRegistration} className="space-y-4">
              <div><h2 className="text-2xl font-black">تسجيل طالب جديد</h2><p className="text-sm text-muted-foreground mt-1">اكتب بياناتك، والأدمن هيراجعها قبل ما يفعّل حسابك.</p></div>
              <div className="space-y-2"><label htmlFor="student-name" className="text-sm font-bold">اسم الطالب</label><input id="student-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none" /></div>
              <div className="space-y-2"><label htmlFor="student-phone" className="text-sm font-bold">رقم الهاتف</label><input id="student-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required inputMode="tel" placeholder="01xxxxxxxxx" className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none" /></div>
              <div className="space-y-2"><label htmlFor="student-email" className="text-sm font-bold">البريد الإلكتروني (اختياري)</label><input id="student-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <SearchableCombobox
                  id="student-governorate"
                  label="المحافظة"
                  value={form.governorate}
                  onChange={(val) => setForm({ ...form, governorate: val, city: "" })}
                  options={Object.keys(EGYPT_GOVERNORATES)}
                  placeholder="مثال: القاهرة"
                  required
                />
                <SearchableCombobox
                  id="student-city"
                  label="المدينة / المركز"
                  value={form.city}
                  onChange={(val) => setForm({ ...form, city: val })}
                  options={form.governorate && EGYPT_GOVERNORATES[form.governorate] ? EGYPT_GOVERNORATES[form.governorate] : []}
                  placeholder="مثال: حلوان"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="student-grade" className="text-sm font-bold">المرحلة الدراسية</label>
                <select id="student-grade" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value, otherGradeDetail: e.target.value !== "أخرى" ? "" : form.otherGradeDetail })} required className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none">
                  <option value="">اختر المرحلة الدراسية</option>
                  <option value="أولى بكالوريا">أولى بكالوريا</option>
                  <option value="تانية بكالوريا">تانية بكالوريا</option>
                  <option value="جامعة">جامعة</option>
                  <option value="أخرى">أخرى (يرجى التحديد)</option>
                </select>
              </div>
              {form.grade === "أخرى" && (
                <div className="space-y-2">
                  <label htmlFor="student-other-grade" className="text-sm font-bold">تحديد المرحلة الدراسية الأخرى</label>
                  <input id="student-other-grade" value={form.otherGradeDetail} onChange={(e) => setForm({ ...form, otherGradeDetail: e.target.value })} required className="h-12 w-full rounded-xl border border-border bg-background px-4 focus:border-primary focus:outline-none" placeholder="اكتب مرحلتك الدراسية بالتفصيل" />
                </div>
              )}
              {message && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700">{message}</p>}
              {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
              <Button disabled={loading} className="h-13 w-full rounded-xl text-base font-bold">{loading ? <Loader2 className="animate-spin" /> : <UserPlus />} إرسال طلب التسجيل</Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function FilesPanel({ files }: { files: LearningFile[] }) {
  return <section className="container mx-auto px-4 py-12" dir="rtl"><div className="mb-8"><h2 className="text-3xl font-black">الملفات والمرفقات</h2><p className="text-muted-foreground mt-2">هنا هتلاقي المذكرات والأكواد والتمارين اللي الأدمن رفعها ليك.</p></div>{files.length === 0 ? <div className="rounded-3xl border border-dashed p-16 text-center text-muted-foreground">مفيش ملفات مرفوعة دلوقتي.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{files.map(file => <article key={file.id} className="academy-card p-5"><div className="mb-4 flex items-start justify-between"><div className="rounded-xl bg-primary/10 p-3 text-primary"><FileText /></div><span className="rounded-full bg-muted px-3 py-1 text-xs">{file.category}</span></div><h3 className="font-black text-lg">{file.title}</h3><p className="text-sm text-muted-foreground mt-2 line-clamp-2">{file.description || file.originalName}</p><a href={`/api/learning/files/${file.id}/download`} className="mt-5 inline-flex items-center gap-2 font-bold text-primary"><Download className="h-4 w-4" /> حمّل الملف</a></article>)}</div>}</section>;
}

function QuizzesPanel({ quizzes, onStartQuiz }: { quizzes: Quiz[]; onStartQuiz: (quiz: Quiz) => void }) {
  return (
    <section className="container mx-auto px-4 py-12" dir="rtl">
      <div className="mb-8">
        <h2 className="text-3xl font-black">الاختبارات</h2>
        <p className="text-muted-foreground mt-2">اختبر نفسك واعرف نتيجتك فورًا.</p>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {quizzes.map(quiz => (
          <article key={quiz.id} className="academy-card p-6">
            <span className="text-xs font-bold text-primary">{quiz.category}</span>
            <h3 className="text-xl font-black mt-2">{quiz.title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{quiz.questions.length} أسئلة · النجاح من {quiz.passingScore}%</p>
            <Button onClick={() => onStartQuiz(quiz)} className="mt-5 w-full font-bold">ابدأ الاختبار</Button>
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

function DashboardPanel({ student, files, quizzes, onOpen }: { student: Student; files: LearningFile[]; quizzes: Quiz[]; onOpen: (tab: "lessons" | "files" | "quizzes") => void }) {
  const stats = [
    { label: "دروس متاحة", value: "12", icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
    { label: "ملفات مرفوعة", value: String(files.length), icon: FolderOpen, color: "text-cyan-700", bg: "bg-cyan-500/10" },
    { label: "اختبارات", value: String(quizzes.length), icon: ClipboardCheck, color: "text-amber-700", bg: "bg-amber-500/10" },
  ];
  return <div className="space-y-8 p-4 md:p-8">
    <div><h1 className="text-3xl font-black md:text-4xl">أهلًا بيك، {student.name.split(" ")[0]} 👋</h1><p className="mt-2 text-muted-foreground">كمّل من مكان ما وقفت، وخليك ثابت على خطتك.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">{stats.map(({label,value,icon:Icon,color,bg})=><article key={label} className="academy-card flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><strong className="mt-1 block text-3xl">{value}</strong></div><div className={`grid h-12 w-12 place-items-center rounded-xl ${bg} ${color}`}><Icon /></div></article>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_.7fr]">
      <article className="academy-card overflow-hidden">
        <div className="grid md:grid-cols-[.9fr_1.1fr]">
          <div className="relative min-h-64 bg-slate-900"><img src="/baccalaureate-hero.png" alt="الدرس اللي بتذاكره" className="h-full w-full object-cover opacity-70"/><button onClick={()=>onOpen("lessons")} aria-label="شغل الدرس" className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-white shadow-xl"><Play className="h-7 w-7 fill-current"/></button></div>
          <div className="flex flex-col justify-center p-6 text-right"><span className="w-fit rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-700">كمّل من هنا</span><h2 className="mt-3 text-2xl font-black">أساسيات البرمجة وحل المسائل</h2><p className="mt-2 text-muted-foreground">كمّل الدرس اللي بدأت فيه وطبّق التمرين المرفق.</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[65%] rounded-full bg-cyan-500"/></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>65% مكتمل</span><span>12:45 دقيقة</span></div><Button onClick={()=>onOpen("lessons")} className="mt-5 h-12 w-fit font-bold">كمّل الدرس <ChevronLeft className="h-4 w-4"/></Button></div>
        </div>
      </article>
      <article className="academy-card p-6"><h2 className="text-xl font-black">المطلوب منك</h2><div className="mt-5 space-y-4"><button onClick={()=>onOpen("quizzes")} className="flex w-full items-center gap-3 rounded-xl bg-red-500/5 p-3 text-right"><ClipboardCheck className="text-red-500"/><span><strong className="block">اختبار قصير</strong><small className="text-muted-foreground">قبل يوم الخميس</small></span></button><button onClick={()=>onOpen("files")} className="flex w-full items-center gap-3 rounded-xl bg-primary/5 p-3 text-right"><FileText className="text-primary"/><span><strong className="block">ملف المراجعة</strong><small className="text-muted-foreground">اتحمّل دلوقتي</small></span></button></div></article>
    </div>
    <div><div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-black">أحدث الملفات</h2><button onClick={()=>onOpen("files")} className="font-bold text-primary">عرض الكل</button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{files.slice(0,4).map(file=><article key={file.id} className="academy-card p-4"><div className="grid h-24 place-items-center rounded-xl bg-[#e7eeff]"><FileText className="h-9 w-9 text-primary/40"/></div><h3 className="mt-3 line-clamp-1 font-bold">{file.title}</h3><a href={`/api/learning/files/${file.id}/download`} className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary/10 text-sm font-bold text-primary"><Download className="h-4 w-4"/> تحميل</a></article>)}</div>{files.length===0&&<div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">أول ما الأدمن يرفع ملفات هتظهر لك هنا.</div>}</div>
  </div>;
}

function ProfilePanel({ student }: { student: Student }) {
  return <div className="space-y-6 p-4 md:p-8"><article className="academy-card p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><img src="/dr-mahmoud-photo.png" alt="صورة الحساب" className="h-28 w-28 rounded-full border-4 border-primary/10 object-cover"/><div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700">حساب متفعّل</span><h1 className="mt-3 text-3xl font-black">{student.name}</h1><p className="text-muted-foreground">طالب في أكاديمية د. محمود المهدي</p></div></div></article><div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><article className="academy-card p-6"><h2 className="text-xl font-black">بيانات الحساب</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="space-y-2"><span className="text-sm font-bold">الاسم</span><input value={student.name} readOnly className="h-12 w-full rounded-lg border bg-muted px-4"/></label><label className="space-y-2"><span className="text-sm font-bold">رقم الموبايل</span><input value={student.phone} readOnly className="h-12 w-full rounded-lg border bg-muted px-4"/></label><label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold">الإيميل</span><input value={student.email||"مش مضاف"} readOnly className="h-12 w-full rounded-lg border bg-muted px-4"/></label><label className="space-y-2"><span className="text-sm font-bold">المحافظة</span><input value={student.governorate||"غير محدد"} readOnly className="h-12 w-full rounded-lg border bg-muted px-4"/></label><label className="space-y-2"><span className="text-sm font-bold">المدينة / المركز</span><input value={student.city||"غير محدد"} readOnly className="h-12 w-full rounded-lg border bg-muted px-4"/></label><label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold">المرحلة الدراسية</span><input value={student.grade === "أخرى" ? student.otherGradeDetail || "أخرى" : student.grade || "غير محدد"} readOnly className="h-12 w-full rounded-lg border bg-muted px-4"/></label></div></article><article className="academy-card p-6"><Trophy className="h-10 w-10 text-amber-500"/><h2 className="mt-4 text-xl font-black">إنجازاتك</h2><p className="mt-2 text-muted-foreground">كل اختبار تنجح فيه وشهادة تخلصها هتظهر هنا.</p></article></div></div>;
}

export function StudentPlatform() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"dashboard" | "lessons" | "files" | "quizzes" | "profile">("dashboard");
  const [files, setFiles] = useState<LearningFile[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // Quiz active states
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setQuizAnswers(Array(quiz.questions.length).fill(-1));
    setQuizResult(null);
  };

  const submitQuiz = async () => {
    if (!activeQuiz || quizAnswers.some(a => a < 0)) return;
    setQuizSubmitting(true);
    try {
      const res = await api<{ score: number; passed: boolean }>(`/api/learning/quizzes/${activeQuiz.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: quizAnswers })
      });
      setQuizResult(res);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setQuizSubmitting(false);
    }
  };

  useEffect(() => { api<{student:Student}>("/api/student/me").then(r=>setStudent(r.student)).catch(()=>{}).finally(()=>setLoading(false)); }, []);
  useEffect(() => { if (!student) return; Promise.all([api<LearningFile[]>("/api/learning/files"),api<Quiz[]>("/api/learning/quizzes")]).then(([f,q])=>{setFiles(f);setQuizzes(q);}).catch(()=>{}); }, [student]);
  if (loading) return <div className="min-h-[70vh] grid place-items-center"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;
  if (!student) return <AccessScreen onLogin={setStudent} />;
  const logout = async () => { await api("/api/student/logout",{method:"POST"}); setStudent(null); };
  const nav = [
    ["dashboard","لوحة التحكم",LayoutDashboard],
    ["lessons","دروسي",BookOpen],
    ["files","المرفقات",FolderOpen],
    ["quizzes","الاختبارات",ClipboardCheck],
    ["profile","حسابي",User],
  ] as const;
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f9f9ff]" dir="rtl">
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[240px_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-l border-border bg-white p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b pb-5">
            <img src="/logo.jpg" alt="اللوجو" className="h-12 w-12 rounded-full object-cover"/>
            <div>
              <strong className="block">{student.name}</strong>
              <span className="text-xs text-muted-foreground">طالب متفعّل</span>
            </div>
          </div>
          <nav className="mt-5 space-y-1">
            {nav.map(([value,label,Icon])=>(
              <button key={value} onClick={()=>setTab(value)} className={`flex min-h-12 w-full items-center gap-3 rounded-lg border-r-4 px-4 text-right font-bold ${tab===value?'border-primary bg-[#d7e2ff] text-primary':'border-transparent text-muted-foreground hover:bg-muted'}`}>
                <Icon className="h-5 w-5"/>
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-2">
            <a href="https://wa.me/201044348610" className="flex h-12 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">كلم الدعم</a>
            <button onClick={logout} className="flex h-12 w-full items-center justify-center gap-2 text-sm font-bold text-red-600">
              <LogOut className="h-4 w-4"/> تسجيل الخروج
            </button>
          </div>
        </aside>
        <section className="min-w-0">
          <div className="sticky top-16 z-30 flex h-14 items-center justify-between border-b bg-white/95 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground"/>
              <span className="text-sm font-bold text-primary">Academy Portal</span>
            </div>
            <span className="text-sm text-muted-foreground">اتعلم، طبّق، واتقدم</span>
          </div>
          <div className="lg:hidden overflow-x-auto border-b bg-white p-2">
            <div className="flex min-w-max gap-1">
              {nav.map(([value,label,Icon])=>(
                <button key={value} onClick={()=>setTab(value)} className={`flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold ${tab===value?'bg-primary text-white':'text-muted-foreground'}`}>
                  <Icon className="h-4 w-4"/>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {tab==='dashboard' ? (
            <DashboardPanel student={student} files={files} quizzes={quizzes} onOpen={setTab}/>
          ) : tab==='lessons' ? (
            <YoutubeSection student={student} files={files} quizzes={quizzes} onStartQuiz={startQuiz} />
          ) : tab==='files' ? (
            <FilesPanel files={files}/>
          ) : tab==='quizzes' ? (
            <QuizzesPanel quizzes={quizzes} onStartQuiz={startQuiz} />
          ) : (
            <ProfilePanel student={student}/>
          )}
        </section>
      </div>

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
              <h2 className="text-2xl font-black text-right mb-4">{activeQuiz.title}</h2>
              <div className="mt-6 space-y-7 text-right max-h-[60vh] overflow-y-auto px-2">
                {activeQuiz.questions.map((q, qi) => (
                  <fieldset key={qi} className="space-y-3">
                    <legend className="font-bold mb-3">{qi + 1}. {q.prompt}</legend>
                    <div className="space-y-2">
                      {q.options.map((option, oi) => (
                        <label
                          key={oi}
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                            quizAnswers[qi] === oi ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${qi}`}
                            checked={quizAnswers[qi] === oi}
                            onChange={() =>
                              setQuizAnswers(quizAnswers.map((a, i) => (i === qi ? oi : a)))
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
                    quizResult.passed ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-600'
                  }`}
                >
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-center" />
                  <strong className="text-2xl">{quizResult.score}%</strong>
                  <p className="mt-1 font-bold">
                    {quizResult.passed ? 'عاش! نجحت في الاختبار' : 'راجع الدروس وجرب تاني'}
                  </p>
                </div>
              ) : (
                <Button
                  onClick={submitQuiz}
                  disabled={quizSubmitting || quizAnswers.some((a) => a < 0)}
                  className="mt-7 w-full h-12 font-bold"
                >
                  {quizSubmitting ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'سلّم الإجابات'}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setActiveQuiz(null)} className="mt-2 w-full font-bold">
                إغلاق
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
