import { useEffect, useState } from "react";
import { useCreateBooking } from "@workspace/api-client-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { FloatingButtons } from "@/components/FloatingButtons";
import { Navbar } from "@/components/Navbar";
import { SETTINGS_KEYS, useSiteSettings } from "@/hooks/useSiteSettings";
import {
  ArrowLeft, BookOpen, Check, CheckCircle2, ClipboardCheck,
  Clock, FileText, GraduationCap, Laptop, MapPin, MessageCircle,
  Play, Send, ShieldCheck, Star, UserCheck, Users, Code, Award,
  CheckCircle, ArrowRight, ExternalLink, HelpCircle, Layers,
  Brain, Code2, GitFork, Lightbulb, Crown
} from "lucide-react";

type BookingForm = { parentName: string; studentName: string; phone: string; grade: string; schoolType: string; mode: string; message: string };
type Testimonial = { quote: string; author: string; role: string; stars?: number; initials?: string };

const initialBooking: BookingForm = { parentName: "", studentName: "", phone: "", grade: "أولى ثانوي", schoolType: "عربي", mode: "أونلاين لكل مصر", message: "" };

const defaultTestimonials: Testimonial[] = [
  { quote: "الشرح مبني على الفهم مش التكرار، مروان مكنش فاهم Python في المدرسة وبقى يكتب الكود ويحل التمارين بنفسه بسهولة.", author: "أحمد الشافعي", role: "ولي أمر طالب STEM", stars: 5, initials: "أ" },
  { quote: "الشرح الأونلاين منظم والم المنصة عليها الاختبارات والملفات والمتابعة كأننا في سنتر بالضبط.", author: "منى زهران", role: "ولية أمر طالبة لغات", stars: 5, initials: "م" },
  { quote: "طريقة الدكتور محمود خلتني أفهم التفكير البرمجي قبل كتابة الكود وبقت المادة ممتعة وسهلة بالنسبة لي.", author: "يوسف أحمد", role: "طالب ثانية ثانوي", stars: 5, initials: "ي" },
];

const faqs = [
  ["مين يقدر يشترك في برنامج برمجة البكالوريا؟", "البرنامج مخصص لطلاب الصف الأول الثانوي والصف الثاني الثانوي بالبكالوريا المصرية (عربي ولغات وSTEM)."],
  ["هل البرنامج مناسب للمبتدئ تماماً؟", "نعم، المسار يبدأ من أساسيات التفكير المنطقي وتحليل المسألة قبل كتابة سطر كود واحد، ثم ينتقل تدريجياً لكتابة البرامج الأكبر."],
  ["هل الشرح متاح أونلاين لكل المحافظات؟", "نعم، المحاضرات والمنصة التعليمية متاحة أونلاين لجميع طلاب محافظات مصر بجودة عالية ومتابعة مستمرة."],
  ["هل محتاج لابتوب أو كمبيوتر؟", "نعم، يُفضل وجود جهاز كمبيوتر أو لابتوب للتدريب العملي وتطبيق كتابة الأكواد والتمارين بعد كل درس."],
  ["إيه الفرق بين برنامج أولى وتانية ثانوي؟", "برنامج أولى ثانوي يركز على التأسيس والتفكير المنطقي والعمليات والشروط؛ بينما تانية ثانوي يستكمل التتبع وحل المشكلات والأكواد المتقدمة."],
  ["هل فيه اختبارات وتدريبات على المنصة؟", "نعم، تحتوي المنصة على بنك أسئلة وتدريبات واختبارات تفاعلية بعد كل وحدة مع تقييم مستوى الطالب."],
  ["إزاي الطالب يدخل المنصة؟", "بعد تأكيد الاشتراك، يحصل الطالب على اسم مستخدم وكود تفعيل مخصص لدخول منصته وبدء الدروس."],
  ["هل فيه حضور مباشر في الزقازيق؟", "نعم، الحضور المباشر متاح داخل مقر الأكاديمية بالزقازيق مع متابعة مباشرة لكود الطالب."],
  ["ولي الأمر يقدر يتابع مستوى الطالب إزاي؟", "من خلال تقارير التقدم ونسبة مشاهدة الدروس ودرجات الاختبارات المنفذة عبر المنصة وتواصل المتابعة الدوري."],
  ["هل أقدر أشوف درس قبل الاشتراك؟", "نعم، تتيح المنصة معايانات ومحتوى تجريبي مجاني ليتعرف الطالب على طريقة الشرح والأسلوب."],
];

function HomeHonorWallSection() {
  const [students, setStudents] = useState<Array<{
    id: number;
    name: string;
    school: string;
    completedVideos: number;
    totalVideos: number;
    percentage: number;
    avatarUrl: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/baccalaureate/honor-wall")
      .then((res) => res.json())
      .then((data) => {
        if (data.students) setStudents(data.students);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const eventSource = new EventSource("/api/baccalaureate/honor-wall/stream");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.students) setStudents(data.students);
      } catch {}
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (loading || students.length === 0) return null;

  return (
    <section className="bg-slate-900 text-white py-14 border-b border-slate-800 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black rounded-full mb-2">
            <Crown className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            <span>لوحة شرف الأبطال المتفوقين</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            طلاب حققوا أعلى نسب متابعة ومشاهدة
          </h2>
          <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-400">
            تكريم متميز للطلاب الأكثر التزاماً بمتابعة الدروس والتطبيقات العملية (80% وأكثر)!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {students.map((hero, idx) => {
            const calcPercent = hero.totalVideos > 0 ? Math.min(100, Math.round((hero.completedVideos / hero.totalVideos) * 100)) : 100;
            const displayPercent = calcPercent >= 100 ? 100 : calcPercent >= 83 ? 90 : 80;

            return (
              <div
                key={hero.id || idx}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-3">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      بطل #{idx + 1}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                      displayPercent >= 100
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                    }`}>
                      <CheckCircle2 className="h-3 w-3" /> {displayPercent}% مكتمل
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {hero.avatarUrl ? (
                        <img
                          src={hero.avatarUrl}
                          alt={hero.name}
                          className="h-11 w-11 rounded-xl object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                          <Code2 className="h-5.5 w-5.5 text-blue-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-black text-white truncate">{hero.name}</h3>
                      <p className="text-[10px] font-medium text-slate-400 truncate">{hero.school}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                  <span>نسبة الإنجاز:</span>
                  <span className="font-extrabold text-white dir-ltr">{displayPercent}% ({hero.completedVideos} فيديو)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function AcademyHome() {
  const { get, getJson } = useSiteSettings();
  const whatsapp = get(SETTINGS_KEYS.CONTACT_WHATSAPP, "201066711545");
  const testimonials = getJson<Testimonial[]>(SETTINGS_KEYS.TESTIMONIALS_LIST, defaultTestimonials).slice(0, 3);
  const { mutateAsync: createBooking, isPending } = useCreateBooking();
  const [form, setForm] = useState<BookingForm>(initialBooking);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!form.parentName.trim() || !form.studentName.trim() || !/^01\d{9}$/.test(form.phone.replace(/\s/g, ""))) {
      setFormError("اكتب اسم ولي الأمر واسم الطالب ورقم موبايل مصري صحيح.");
      return;
    }
    const details = `اسم الطالب: ${form.studentName}\nالمرحلة: ${form.grade}\nنوع المدرسة: ${form.schoolType}\nطريقة الدراسة: ${form.mode}\nالرسالة: ${form.message || "لا توجد"}`;
    try {
      await createBooking({ data: { name: form.parentName, phone: form.phone, message: details } });
      
      const text = encodeURIComponent(
        `مرحبًا د. محمود\n\nأود استفسار وحجز برنامج برمجة البكالوريا:\n- اسم ولي الأمر: ${form.parentName}\n- اسم الطالب: ${form.studentName}\n- رقم الهاتف: ${form.phone}\n- المرحلة: ${form.grade}\n- نوع المدرسة: ${form.schoolType}\n- طريقة الدراسة: ${form.mode}`
      );
      window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank");

      setSubmitted(true);
      setForm(initialBooking);
    } catch {
      setFormError("تعذر إرسال الطلب الآن. حاول مرة أخرى أو تواصل معنا عبر واتساب.");
    }
  };

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "د. محمود المهدي",
    "alternateName": "Dr. Mahmoud Elmahdy",
    "jobTitle": "مدرس برمجة وعلوم حاسب",
    "description": "ماجستير نظم المعلومات ومتخصص في تدريس وتأسيس برمجة البكالوريا المصرية لطلاب أولى وتانية ثانوي أونلاين وفي الزقازيق.",
    "url": "https://drelmahdy.com/",
    "image": "https://drelmahdy.com/dr-mahmoud-hero-classroom.webp",
    "sameAs": ["https://wa.me/201066711545", "https://www.youtube.com/@learntocode9453"],
    "knowsAbout": ["برمجة البكالوريا", "Python", "C++", "علوم الحاسب", "تطوير البرمجيات", "حل المشكلات"]
  };

  return (
    <div className="theme-adaptive min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <Navbar />

      <main>
        {/* ─── 1. HERO SECTION ─── */}
        <section id="hero" className="relative border-b border-slate-200 bg-white py-12 md:py-20 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              
              {/* Right Content Column */}
              <div className="lg:col-span-7 space-y-5 text-right">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-400/35">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  برمجة البكالوريا المصرية • أونلاين لكل محافظات مصر
                </span>

                <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl md:text-5xl">
                  اتعلم برمجة البكالوريا صح <span className="text-blue-600">من البداية</span>
                </h1>

                <p className="max-w-2xl text-base font-semibold leading-relaxed text-slate-600 md:text-lg">
                  شرح عملي لطلاب أولى وتانية ثانوي مع د. محمود المهدي، ماجستير نظم المعلومات. هتفهم الفكرة، تطبق بنفسك، تحل تدريبات واختبارات، وتتابع مستواك خطوة بخطوة من خلال المنصة.
                </p>

                {/* Primary & Secondary Actions */}
                <div className="flex flex-col gap-3 sm:flex-row pt-2">
                  <Button asChild size="lg" className="h-12 rounded-xl bg-blue-600 px-6 font-black text-white hover:bg-blue-700 shadow-md">
                    <a href="#baccalaureate">
                      ابدأ برنامج البكالوريا
                      <ArrowLeft className="mr-2 h-4 w-4" />
                    </a>
                  </Button>

                  <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-slate-300 bg-white px-6 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-800">
                    <a href="/platform">
                      <Laptop className="ml-2 h-4 w-4 text-blue-600" />
                      دخول الطالب
                    </a>
                  </Button>

                  <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-blue-200 bg-blue-50/70 px-6 font-bold text-blue-800 hover:bg-blue-100 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20">
                    <a href="/parent">
                      <Users className="ml-2 h-4 w-4 text-blue-700" />
                      بوابة ولي الأمر
                    </a>
                  </Button>
                </div>

                {/* Trust line */}
                <div className="pt-2 text-xs font-bold text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 mt-4">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> أونلاين لكل مصر</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> حضور في الزقازيق</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> متابعة واختبارات مستمرة</span>
                </div>

                {/* 4 Concise benefit points */}
                <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-4">
                  {[
                    ["شرح مبسط", "تأسيس هادئ من الصفر"],
                    ["تطبيق عملي", "تطبيق كود بعد كل درس"],
                    ["بنك أسئلة", "تدريبات وتطبيقات متدرجة"],
                    ["متابعة مستوى", "تقارير وتقييم مستمر"],
                  ].map(([title, sub]) => (
                    <div key={title} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-right dark:border-slate-700 dark:bg-slate-900/45">
                      <strong className="block text-xs font-black text-slate-900">{title}</strong>
                      <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">{sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Left Photo Column */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-md overflow-hidden rounded-2xl border-4 border-white bg-white shadow-xl">
                  <img
                    src="/dr-mahmoud-hero-classroom.webp"
                    alt="د. محمود المهدي — مدرس برمجة البكالوريا المصرية"
                    fetchPriority="high"
                    width={800}
                    height={1000}
                    className="aspect-[4/5] w-full object-cover object-[center_10%]"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-4 text-white text-right">
                    <strong className="block text-base font-black">د. محمود المهدي</strong>
                    <span className="text-xs text-blue-200 font-semibold">ماجستير نظم المعلومات • متخصص تدريس برمجة البكالوريا</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ─── 2. WHY STUDENTS FIND PROGRAMMING DIFFICULT SECTION ─── */}
        <section aria-labelledby="problem-section-heading" className="bg-slate-50 py-12 md:py-16 border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <header className="mx-auto max-w-3xl text-center mb-10">
              <span className="inline-block rounded-full bg-blue-100/80 px-3.5 py-1 text-xs font-bold text-blue-700 tracking-normal dark:bg-blue-500/12 dark:text-blue-300 dark:border dark:border-blue-400/25">
                المشكلة مش في قدرات الطالب
              </span>
              <h2 id="problem-section-heading" className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl lg:text-4xl leading-tight">
                ليه طلاب كتير بيحسّوا إن البرمجة صعبة؟
              </h2>
              <p className="mt-3 text-sm sm:text-base font-semibold leading-relaxed text-slate-600">
                غالبًا السبب مش ضعف الطالب، لكن طريقة البداية وترتيب الشرح.
              </p>
            </header>

            {/* Problem Cards Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "الحفظ بدل الفهم",
                  description: "الطالب يحفظ شكل الكود، لكن أول ما السؤال يتغير مش بيعرف يحلل المطلوب أو يبدأ الحل.",
                  icon: Brain,
                  accentColor: "text-amber-600 bg-amber-50 border-amber-200/60 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-400/25"
                },
                {
                  title: "البداية من الكود مباشرة",
                  description: "بيبدأ يكتب أوامر قبل ما يفهم الفكرة، والمتغيرات، والشروط، وخطوات حل المشكلة.",
                  icon: Code2,
                  accentColor: "text-rose-600 bg-rose-50 border-rose-200/60 dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-400/25"
                },
                {
                  title: "شرح بدون مسار واضح",
                  description: "فيديوهات ودروس منفصلة من غير ترتيب تدريجي يربط الفهم بالتطبيق والتدريب.",
                  icon: GitFork,
                  accentColor: "text-indigo-600 bg-indigo-50 border-indigo-200/60 dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-400/25"
                }
              ].map((card) => (
                <article
                  key={card.title}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-slate-300 transition-all duration-200 text-right motion-reduce:hover:translate-y-0 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900/45 dark:hover:border-slate-600"
                >
                  <div>
                    <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${card.accentColor}`}>
                      <card.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 leading-snug">
                      {card.title}
                    </h3>
                    <p className="mt-2.5 text-xs sm:text-sm font-semibold leading-relaxed text-slate-600">
                      {card.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            {/* Conclusion & Transition Strip */}
            <div className="mt-10 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/70 via-white to-blue-50/70 p-6 md:p-8 text-center shadow-xs dark:border-blue-400/25 dark:from-blue-500/10 dark:via-slate-900/80 dark:to-blue-500/10">
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                  <Lightbulb className="h-5 w-5" aria-hidden="true" />
                </div>
                
                <p className="text-base sm:text-lg font-black text-slate-900 leading-relaxed">
                  الحل مش في فيديوهات أكتر؛ الحل في مسار يخلي الطالب يفهم، يطبّق، يحل، ويعرف سبب كل خطوة.
                </p>

                <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row sm:gap-3 text-xs sm:text-sm font-bold text-slate-600">
                  <span>وده أساس طريقة الشرح داخل برنامج د. محمود المهدي.</span>
                  <a
                    href="#learning-method"
                    className="inline-flex items-center gap-1.5 font-black text-blue-600 hover:text-blue-800 hover:underline focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-0.5 transition-colors"
                  >
                    <span>شوف الطالب بيتعلم إزاي</span>
                    <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── HONOR WALL SECTION (BEFORE GRADE SELECTION) ─── */}
        <HomeHonorWallSection />

        {/* ─── 3. GRADE SELECTION SECTION ─── */}
        <section id="baccalaureate" className="bg-white py-14 md:py-20 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">البرنامج المخصص</span>
              <h2 className="mt-2 text-3xl font-black text-slate-900">
                اختار برنامجك حسب مرحلتك
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                مسارات تعليمية متدرجة تضمن فهم المنهج والتدريب على الاختبارات بثقة.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Card 1: 1st Secondary */}
              <div id="first-sec" className="group flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-blue-100 bg-slate-50/50 hover:border-blue-300 transition-all hover:shadow-xl hover:shadow-blue-500/5">
                <div>
                  {/* Card Cover Image */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-950">
                    <img 
                      src="/baccalaureate-1st-sec.png" 
                      alt="برمجة أولى ثانوي"
                      className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    <span className="absolute top-4 right-4 inline-block rounded-full bg-blue-600/90 backdrop-blur-md px-3.5 py-1 text-xs font-black text-white shadow-md">
                      الصف الأول الثانوي
                    </span>
                    <div className="absolute bottom-4 right-4 left-4 text-right">
                      <h3 className="text-2xl font-black text-white drop-shadow-sm">برمجة أولى ثانوي</h3>
                      <p className="text-xs font-semibold text-blue-200">التأسيس والخوارزميات والتطبيقات الأولى</p>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-4 text-right">
                    <p className="text-sm font-semibold leading-relaxed text-slate-600">
                      تأسيس الطالب في التفكير البرمجي، الخوارزميات، المتغيرات، الإدخال والإخراج، العمليات، الشروط، والتطبيقات الأساسية.
                    </p>
                    
                    <div className="border-t border-slate-200/80 pt-4 space-y-2 text-xs font-bold text-slate-700">
                      <span className="block text-blue-700">مخرجات التعلم الرئيسية:</span>
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600 flex-shrink-0" /> تحليل المشكلات ورسم Flowcharts</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600 flex-shrink-0" /> فهم المتغيرات والأنواع والشروط برمجياً</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600 flex-shrink-0" /> كتابة تطبيقات تفاعلية بسيطة بنفسه</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 pt-0 border-t border-slate-200/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-auto">
                  <span className="text-xs font-bold text-slate-500">متاح أونلاين لكل مصر • أوفلاين بالزقازيق</span>
                  <Button asChild className="h-11 rounded-xl bg-blue-600 font-black text-white hover:bg-blue-700 shadow-md shadow-blue-600/20">
                    <a href="/baccalaureate">
                      شاهد برنامج أولى ثانوي
                      <ArrowLeft className="mr-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Card 2: 2nd Secondary */}
              <div id="second-sec" className="group flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-indigo-100 bg-slate-50/50 hover:border-indigo-300 transition-all hover:shadow-xl hover:shadow-indigo-500/5">
                <div>
                  {/* Card Cover Image */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-950">
                    <img 
                      src="/baccalaureate-2nd-sec.png" 
                      alt="برمجة تانية ثانوي"
                      className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    <span className="absolute top-4 right-4 inline-block rounded-full bg-indigo-600/90 backdrop-blur-md px-3.5 py-1 text-xs font-black text-white shadow-md">
                      الصف الثاني الثانوي
                    </span>
                    <div className="absolute bottom-4 right-4 left-4 text-right">
                      <h3 className="text-2xl font-black text-white drop-shadow-sm">برمجة تانية ثانوي</h3>
                      <p className="text-xs font-semibold text-indigo-200">حل المشكلات المتقدمة وهياكل البيانات</p>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-4 text-right">
                    <p className="text-sm font-semibold leading-relaxed text-slate-600">
                      استكمال المهارات البرمجية، حل المشكلات، تتبع الأكواد، التدريب على الأسئلة، والمفاهيم المتقدمة المناسبة للمنهج.
                    </p>

                    <div className="border-t border-slate-200/80 pt-4 space-y-2 text-xs font-bold text-slate-700">
                      <span className="block text-indigo-700">مخرجات التعلم الرئيسية:</span>
                      <ul className="space-y-1.5">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600 flex-shrink-0" /> تتبع الأكواد المعقدة واكتشاف الأخطاء</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600 flex-shrink-0" /> التعامل مع القوائم والدوال وبنية البيانات</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600 flex-shrink-0" /> حل نماذج اختبارات البكالوريا بثقة</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 pt-0 border-t border-slate-200/60 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-auto">
                  <span className="text-xs font-bold text-slate-500">متاح أونلاين لكل مصر • أوفلاين بالزقازيق</span>
                  <Button asChild className="h-11 rounded-xl bg-indigo-600 font-black text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20">
                    <a href="/baccalaureate">
                      شاهد برنامج تانية ثانوي
                      <ArrowLeft className="mr-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. LEARNING METHOD SECTION ─── */}
        <section id="learning-method" className="bg-slate-50 py-14 md:py-20 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">منهجية الفهم</span>
              <h2 className="text-3xl font-black text-slate-900">الطالب هيتعلم إزاي؟</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">رحلة متدرجة تضمن الوصول لأعلى مستوى فهم وتطبيق.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {[
                ["1. نفهم الفكرة", "شرح مبسط للمفهوم قبل كتابة أي كود."],
                ["2. نشوف مثال", "تحويل الفكرة لبرنامج واضح خطوة بخطوة."],
                ["3. نطبق بإيدينا", "الطالب يكتب ويجرب ويشوف النتيجة."],
                ["4. نحل تدريبات", "أسئلة متدرجة من السهل للمستوى الأعلى."],
                ["5. نختبر الفهم", "اختبارات قصيرة بعد كل جزء."],
                ["6. نتابع المستوى", "تحديد نقاط القوة والأجزاء التي تحتاج مراجعة."],
              ].map(([step, desc]) => (
                <div key={step} className="rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-xs">
                  <strong className="block text-sm font-black text-blue-600">{step}</strong>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 5. PLATFORM SHOWCASE SECTION ─── */}
        <section className="bg-white py-14 md:py-20 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">بيئة التعلم المتكاملة</span>
              <h2 className="text-3xl font-black text-slate-900">كل حاجة محتاجها الطالب في مكان واحد</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">منصة تعليمية مخصصة تجمع الشرح والأكواد والاختبارات والمتابعة.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [BookOpen, "مشاهدة الدروس", "عرض الفيديوهات المخصصة لمرحلة الطالب بدون تشتت."],
                [Layers, "تنظيم الكورسات", "تقسيم المواد والمحاضرات حسب المرحلة الدراسية."],
                [FileText, "المذكرات والملفات", "تحميل الملازم وأكواد التدريب والتمارين المرفقة."],
                [ClipboardCheck, "حل الاختبارات", "اختبارات تفاعلية تقيم فهم الطالب فوراً."],
                [Code, "بنك الأسئلة", "تدريبات وتطبيقات شاملة متدرجة الصعوبة."],
                [UserCheck, "متابعة التقدم", "استكمال آخر درس وتتبع نسبة الإنجاز والدرجات."],
              ].map(([Icon, title, desc]: any) => (
                <div key={title} className="flex gap-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-right">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{title}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center flex justify-center gap-4">
              <Button asChild className="h-11 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700">
                <a href="/platform">ادخل المنصة الآن</a>
              </Button>
            </div>
          </div>
        </section>

        {/* ─── 6. INSTRUCTOR AUTHORITY SECTION ─── */}
        <section id="about" className="bg-slate-50 py-14 md:py-20 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5 flex justify-center">
                <div className="overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg max-w-sm w-full">
                  <img
                    src="/dr-mahmoud-hero-classroom.webp"
                    alt="د. محمود المهدي"
                    loading="lazy"
                    width={800}
                    height={600}
                    className="aspect-[4/3] w-full object-cover object-[center_12%]"
                  />
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4 text-right">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">المحاضر والمتخصص</span>
                <h2 className="text-3xl font-black text-slate-900">مين هو د. محمود المهدي؟</h2>
                <p className="text-sm font-semibold leading-relaxed text-slate-600">
                  د. محمود المهدي، ماجستير نظم المعلومات، ومتخصص في تدريس البرمجة وعلوم الحاسب لطلاب المدارس والجامعات. بيعتمد في الشرح على الفهم والتطبيق وحل المشكلات، مش حفظ الأكواد أو تقليد أمثلة جاهزة.
                </p>

                <div className="grid gap-2.5 sm:grid-cols-2 pt-2 text-xs font-bold text-slate-700">
                  {[
                    "ماجستير نظم المعلومات",
                    "تدريس البرمجة وعلوم الحاسب",
                    "خبرة مع طلاب المدارس والجامعات",
                    "شرح أونلاين لكل مصر وحضوري بالزقازيق",
                    "تأسيس عملي وحل مشكلات",
                    "إنشاء محتوى تعليمي واختبارات",
                  ].map((pt) => (
                    <span key={pt} className="flex items-center gap-2 rounded-lg bg-white p-2.5 border border-slate-200">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                      {pt}
                    </span>
                  ))}
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <Button asChild variant="outline" className="h-10 rounded-xl font-bold border-slate-300">
                    <a href="/baccalaureate">اعرف أكتر عن د. المهدي</a>
                  </Button>
                  <Button asChild variant="ghost" className="h-10 rounded-xl font-bold text-blue-600 hover:bg-blue-50">
                    <a href="/#free-preview">شاهد شرح مجاني ←</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 7. SAMPLE EDUCATIONAL CONTENT ─── */}
        <section id="free-preview" className="bg-white py-14 md:py-20 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">المعاينة المجانية</span>
              <h2 className="text-3xl font-black text-slate-900">ابدأ تتعلم من دلوقتي</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">جرب أسلوب الشرح واطلع على المناهج والملفات المجانية المتاحة.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: "درس تمهيدي مجاني", tag: "درس مجاني", type: "فيديو", href: "/baccalaureate", cta: "شاهد المعاينة" },
                { title: "خريطة المناهج والمسارات", tag: "دليل المنهج", type: "ملف PDF", href: "/curriculum", cta: "استعرض المناهج" },
                { title: "تجربة منصة الطالب", tag: "بنك الأسئلة", type: "اختبار تجريبي", href: "/platform", cta: "دخول المنصة" },
              ].map((item) => (
                <div key={item.title} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-right">
                  <div className="space-y-2">
                    <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                      {item.tag}
                    </span>
                    <h3 className="text-lg font-black text-slate-900">{item.title}</h3>
                    <p className="text-xs font-semibold text-slate-500">{item.type} لتوضيح تسلسل التعلم والتطبيق.</p>
                  </div>
                  <Button asChild variant="outline" className="mt-5 h-10 w-full rounded-xl border-slate-300 font-bold hover:bg-blue-50 hover:text-blue-600">
                    <a href={item.href}>{item.cta} ←</a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 8. RESULTS AND TESTIMONIALS ─── */}
        <section id="testimonials" className="bg-slate-50 py-14 md:py-20 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">تجارب الفهم والتطبيق</span>
              <h2 className="text-3xl font-black text-slate-900">تجارب حقيقية من الطلاب وأولياء الأمور</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((item, i) => (
                <blockquote key={i} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-right">
                  <p className="text-sm font-semibold leading-relaxed text-slate-700">"{item.quote}"</p>
                  <footer className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                      {item.initials || item.author[0]}
                    </span>
                    <div>
                      <strong className="block text-xs font-black text-slate-900">{item.author}</strong>
                      <span className="text-[11px] font-semibold text-slate-400">{item.role}</span>
                    </div>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 9. NATIONWIDE ONLINE LEARNING SECTION ─── */}
        <section className="bg-white py-14 md:py-20 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">التغطية والدراسة</span>
            <h2 className="mt-2 text-3xl font-black text-slate-900">من أي محافظة في مصر… تقدر تبدأ</h2>
            <p className="mt-3 max-w-2xl mx-auto text-sm font-semibold text-slate-500 leading-relaxed">
              الشرح الأونلاين متاح لطلاب البكالوريا في جميع محافظات مصر، مع الوصول للدروس والملفات والاختبارات من خلال المنصة، ومتابعة منظمة تساعد الطالب يكمل من غير تشتت.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
              {[
                ["أونلاين لكل مصر", "دروس واختبارات ومتابعة أونلاين"],
                ["حضور بالزقازيق", "مباشر بمقر الأكاديمية بالشرقية"],
                ["متاح على الموبايل والكمبيوتر", "تصفح مرن في أي وقت"],
                ["محتوى منظم ومحدث", "تسلسل واضح يناسب المرحلة"],
              ].map(([t, s]) => (
                <div key={t} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <strong className="block text-xs font-black text-slate-900">{t}</strong>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-500">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 10. PARENT-FOCUSED SECTION ─── */}
        <section className="bg-slate-50 py-14 md:py-20 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">إجابات أولياء الأمور</span>
              <h2 className="text-3xl font-black text-slate-900">إيه اللي يهم ولي الأمر؟</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                المنصة والبرنامج مش مجرد فيديوهات. الطالب بيمشي في مسار واضح، يحل بعد كل جزء، ويعرف مستواه، وولي الأمر يقدر يفهم الطالب وصل لفين وإيه اللي محتاج مراجعة.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ["هل الطالب بيفهم ولا بيحفظ؟", "الشرح مبني على تحويل المشكلة لخطوات منطقية وفهم المتغيرات والشروط قبل كتابة أي كود."],
                ["هل بيحل تدريبات بعد الدرس؟", "نعم، كل وحدة تحتوي على تمارين وأسئلة متدرجة الصعوبة واختبارات تقييم متكررة."],
                ["هل مستواه بيتابع؟", "يتم تتبع نشاط الطالب على المنصة والدروس المكتملة ودرجات الاختبارات المنفذة."],
                ["هل المحتوى مناسب لمرحلته؟", "المحتوى مصمم خصيصاً لمنهج أولى وتانية ثانوي بالبكالوريا المصرية لضمان التأسيس والتفوق."],
              ].map(([q, a]) => (
                <div key={q} className="rounded-2xl border border-slate-200 bg-white p-6 text-right">
                  <h3 className="text-base font-black text-slate-900">{q}</h3>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 11. OTHER PROGRAMS SECTION ─── */}
        <section id="courses-section" className="bg-white py-14 md:py-20 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">مسارات إضافية</span>
              <h2 className="text-2xl font-black text-slate-800">برامج تعليمية تانية</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">مسارات متخصصة للجامعات والناشئين بجانب برنامج البكالوريا الرئيسي.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["تأسيس البرمجة العامة", "للمبتدئين وطلاب الثانوي", "/curriculum"],
                ["كورسات الجامعة", "لطلاب حاسبات وهندسة", "/university"],
                ["برمجة الأطفال", "للأطفال والناشئين", "/kids"],
                ["مهارات الكمبيوتر", "ICDL والمكتبية", "/curriculum"],
              ].map(([title, sub, href]) => (
                <a key={title} href={href} className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-right hover:border-blue-400 transition-all">
                  <strong className="block text-sm font-bold text-slate-900 group-hover:text-blue-600">{title}</strong>
                  <span className="mt-1 block text-xs text-slate-500">{sub}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 12. FAQ SECTION ─── */}
        <section id="faq" className="bg-slate-50 py-14 md:py-20 border-b border-slate-200">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-10">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">توضيحات سريعة</span>
              <h2 className="text-3xl font-black text-slate-900">الأسئلة الشائعة</h2>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map(([q, a], i) => (
                <AccordionItem key={q} value={`faq-${i}`} className="rounded-2xl border border-slate-200 bg-white px-5">
                  <AccordionTrigger className="min-h-14 text-right font-black text-slate-900 hover:no-underline text-sm sm:text-base">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-xs font-semibold leading-relaxed text-slate-500">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ─── 13. FINAL CTA & BOOKING FORM SECTION ─── */}
        <section id="contact" className="bg-white py-14 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5 space-y-4 text-right">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">انضم للبرنامج</span>
                <h2 className="text-3xl font-black text-slate-900">ابدأ تأسيس البرمجة صح</h2>
                <p className="text-sm font-semibold leading-relaxed text-slate-600">
                  اختار المرحلة المناسبة، شوف محتوى البرنامج، وابدأ التعلم بخطة واضحة بدل التشتت بين مصادر مختلفة.
                </p>

                <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100 space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-xs">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    إرسال الطلب للاستفسار وتحديد الخطة المناسبة فقط (لا يعني الدفع)
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-5 w-5" />
                    التواصل المباشر عبر الواتساب
                  </a>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-slate-50 p-6 md:p-8 shadow-xs">
                {submitted ? (
                  <div role="status" className="py-12 text-center space-y-3">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                    <h3 className="text-xl font-black text-slate-900">تم إرسال طلبك بنجاح</h3>
                    <p className="text-xs font-semibold text-slate-500">سيتم التواصل معك فوراً لتوضيح مواعيد وأسلوب الدراسة المناسب.</p>
                    <Button type="button" variant="outline" className="mt-4 font-bold" onClick={() => setSubmitted(false)}>
                      إرسال طلب جديد
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={submitBooking} noValidate className="grid gap-4 sm:grid-cols-2 text-right">
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">اسم ولي الأمر</span>
                      <input required value={form.parentName} onChange={(e) => setForm({ ...form, parentName: e.target.value })} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold focus:border-blue-600 focus:outline-none" />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">اسم الطالب</span>
                      <input required value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold focus:border-blue-600 focus:outline-none" />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">رقم الهاتف</span>
                      <input required inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-right focus:border-blue-600 focus:outline-none" />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">المرحلة الدراسية</span>
                      <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none">
                        <option>أولى ثانوي</option>
                        <option>تانية ثانوي</option>
                        <option>جامعة</option>
                        <option>أخرى</option>
                      </select>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">نوع المدرسة</span>
                      <select value={form.schoolType} onChange={(e) => setForm({ ...form, schoolType: e.target.value })} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none">
                        <option>عربي</option>
                        <option>لغات</option>
                        <option>STEM</option>
                        <option>أخرى</option>
                      </select>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">طريقة الدراسة</span>
                      <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 focus:border-blue-600 focus:outline-none">
                        <option>أونلاين لكل مصر</option>
                        <option>أوفلاين بالزقازيق</option>
                        <option>مساعدة في الاختيار</option>
                      </select>
                    </label>

                    {formError && <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{formError}</p>}

                    <Button disabled={isPending} type="submit" className="sm:col-span-2 h-12 rounded-xl bg-blue-600 font-black text-white hover:bg-blue-700">
                      <Send className="ml-2 h-4 w-4" />
                      {isPending ? "جاري الإرسال..." : "إرسال طلب الحجز والاستفسار"}
                    </Button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />
      <FloatingButtons />
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white/95 p-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,29,50,.08)] backdrop-blur md:hidden">
        <a href="/baccalaureate" className="flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-bold text-white">تفاصيل برنامج البكالوريا</a>
        <a href={`https://wa.me/${whatsapp}`} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-600 text-xs font-bold text-emerald-700">
          <MessageCircle className="h-4 w-4" /> واتساب
        </a>
      </div>
    </div>
  );
}


