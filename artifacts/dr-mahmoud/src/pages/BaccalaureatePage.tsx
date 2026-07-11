import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  MessageCircle,
  BookOpen,
  Clock,
  ChevronLeft,
  Code2,
  Sparkles,
  Laptop,
  Users,
  Award,
  Check,
  Cpu,
  Database,
  LineChart,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateBooking } from "@workspace/api-client-react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

// Curriculum Modules Data
const curriculumModules = [
  {
    id: "module-1",
    number: "01",
    title: "التفكير البرمجي وأساسيات الـ Logic",
    description: "البداية الصح مش كتابة كود، هي إزاي تفكر زي المبرمجين. هنا بنتعلم إزاي نحلل المشاكل لخطوات منطقية ونفهم يعني إيه Algorithms.",
    topics: [
      "مفهوم حل المشكلات (Problem Solving)",
      "تصميم الخوارزميات ورسم الـ Flowcharts",
      "التعرف على بيئة العمل وتثبيت Python & VS Code",
      "كتابة أول سطر كود وفهم طريقة تشغيله"
    ],
    duration: "أسبوعين",
    icon: Code2
  },
  {
    id: "module-2",
    number: "02",
    title: "التأسيس القوي بلغة Python",
    description: "هندخل في الجد ونتعلم لغة Python خطوة بخطوة. دي اللغة الأساسية لمنهج البكالوريا وأقوى لغة للمبتدئين في العالم.",
    topics: [
      "المتغيرات (Variables) وأنواع البيانات المختلفة",
      "العمليات الحسابية والمنطقية (Operators)",
      "اتخاذ القرارات برمجياً (If Conditions)",
      "التكرار الذكي (For & While Loops)"
    ],
    duration: "3 أسابيع",
    icon: Laptop
  },
  {
    id: "module-3",
    number: "03",
    title: "هياكل البيانات وتصميم الدوال",
    description: "هنتعلم إزاي ننظم البيانات بطريقة احترافية، وإزاي نكتب كود منظم وموفر للوقت عشان نقدر نبني مشاريع أكبر.",
    topics: [
      "المصفوفات والقوائم (Lists) والتعامل معها",
      "القواميس (Dictionaries) والـ Tuples",
      "تصميم الدوال (Functions) وإعادة استخدام الكود",
      "التعامل مع الأخطاء وتصحيحها (Debugging)"
    ],
    duration: "3 أسابيع",
    icon: BookOpen
  },
  {
    id: "module-4",
    number: "04",
    title: "المشاريع العملية والـ Capstone",
    description: "وقت التطبيق الحقيقي! الطالب هيجمع كل اللي اتعلمه ويبني مشاريع برمجية كاملة بنفسه، مع تحضير خاص لأفكار مشاريع الـ STEM.",
    topics: [
      "التعامل مع الملفات وحفظ البيانات (File Handling)",
      "حل مسائل برمجية من امتحانات حقيقية ومسابقات",
      "التخطيط لبناء مشروع تخرج متكامل",
      "تطوير وعرض مشروع الطالب ومناقشته"
    ],
    duration: "أسبوعين",
    icon: Award
  }
];

// ToFAS Track Modules Data (placeholder — عدّل المحتوى حسب المنهج الحقيقي)
const tofasModules = [
  {
    id: "tofas-1",
    number: "01",
    title: "مقدمة في ToFAS وأساسياته",
    description: "نبدأ بفهم مسار ToFAS من الصفر: إيه هو، ليه مهم، وإزاي بيبني عند الطالب أساس قوي للمراحل المتقدمة.",
    topics: [
      "التعريف بمسار ToFAS وأهدافه",
      "الأدوات والبيئة المطلوبة للبدء",
      "المفاهيم الأساسية والمصطلحات",
      "أول تطبيق عملي بسيط"
    ],
    duration: "أسبوعين",
    icon: Cpu
  },
  {
    id: "tofas-2",
    number: "02",
    title: "التعامل مع البيانات في ToFAS",
    description: "هنتعلم إزاي نجمع وننظم ونتعامل مع البيانات بطريقة احترافية داخل مسار ToFAS.",
    topics: [
      "أنواع البيانات وتنظيمها",
      "تخزين واسترجاع البيانات",
      "تنظيف ومعالجة البيانات",
      "تمارين تطبيقية على بيانات حقيقية"
    ],
    duration: "3 أسابيع",
    icon: Database
  },
  {
    id: "tofas-3",
    number: "03",
    title: "التحليل والتصور البصري",
    description: "من البيانات الخام للرؤية الواضحة: هنتعلم نحلّل ونعرض النتائج بشكل بصري يوصّل الفكرة بسهولة.",
    topics: [
      "أساسيات التحليل المنطقي",
      "إنشاء الرسوم والمخططات",
      "استخلاص النتائج والاستنتاجات",
      "بناء تقرير تحليلي متكامل"
    ],
    duration: "3 أسابيع",
    icon: LineChart
  },
  {
    id: "tofas-4",
    number: "04",
    title: "المشروع التطبيقي المتكامل",
    description: "الطالب هيجمع كل اللي اتعلمه في مسار ToFAS ويبني مشروع متكامل من أوله لآخره بإشراف مباشر.",
    topics: [
      "التخطيط لمشروع ToFAS كامل",
      "التنفيذ خطوة بخطوة",
      "المراجعة والتحسين",
      "عرض ومناقشة المشروع النهائي"
    ],
    duration: "أسبوعين",
    icon: Layers
  }
];

// Student Projects Data
const studentProjects = [
  {
    title: "نظام إدارة المهام الذكي",
    desc: "برنامج متكامل لحفظ وتنظيم المهام اليومية، بيعلم الطالب إزاي يتعامل مع الملفات وتخزين البيانات بشكل دائم.",
    tech: ["Python", "File I/O", "Logic"],
    difficulty: "متوسط"
  },
  {
    title: "لعبة التخمين والذكاء المنطقي",
    desc: "لعبة تفاعلية بتعتمد على توليد أرقام عشوائية ومساعدة اللاعب بإشارات ذكية للوصول للرقم الصح.",
    tech: ["Control Flow", "Random Module", "Loops"],
    difficulty: "سهل"
  },
  {
    title: "آلة حاسبة علمية متطورة",
    desc: "تطبيق بيحسب العمليات الحسابية البسيطة والمعقدة مع واجهة تفاعلية في الـ Terminal.",
    tech: ["Functions", "Error Handling", "Math"],
    difficulty: "متوسط"
  },
  {
    title: "مشروع التخرج الخاص (Capstone)",
    desc: "فكرة يختارها الطالب بنفسه وينفذها بالكامل بمساعدة وتوجيه من الدكتور لتجهيزه للمستقبل.",
    tech: ["Full Python Program", "Creative Coding"],
    difficulty: "متقدم"
  }
];

// Testimonials Data
const testimonials = [
  {
    name: "م. أحمد الشافعي",
    role: "ولي أمر الطالب مروان (STEM الزقازيق)",
    content: "بصراحة النقلة كبيرة جداً. مروان مكنش فاهم Python في المدرسة والمنهج كان تقيل عليه، مع د. محمود اتأسس في الـ Logic وفهم البرمجة بجد مش حفظ، والمشروع بتاعه أخد تقييم ممتاز."
  },
  {
    name: "يوسف أحمد",
    role: "طالب بالصف الثاني الثانوي",
    content: "كنت فاكر البرمجة حفظ أكواد مملة، بس الشرح هنا كله عملي وبأمثلة بنشوفها في حياتنا. عملت لعبة كاملة لوحدي في أسبوعين وحسيت إني بعمل حاجة بجد."
  },
  {
    name: "أ. منى زهران",
    role: "والدة الطالبة سارة (ثانوية عامة لغات)",
    content: "أكتر حاجة مريحاني هي المتابعة والتقارير الأسبوعية اللي بتوصلنا. بنبقى عارفين سارة عملت إيه وفاضلها إيه، والتفاعل أونلاين ممتاز كأنه في السنتر بالظبط."
  }
];

// FAQs Data
const faqs = [
  {
    q: "هل الكورس مناسب لطالب معندوش أي فكرة عن البرمجة؟",
    a: "طبعاً! الكورس مصمم خصيصاً للمبتدئين من الصفر تماماً. بنبدأ من أساسيات التفكير المنطقي قبل ما نكتب سطر كود واحد، وبنمشي مع الطالب خطوة بخطوة."
  },
  {
    q: "إيه الفرق بين الكورس ده ومناهج المدرسة؟",
    a: "مناهج المدرسة غالباً بتركز على الحفظ عشان الامتحان. إحنا بنركز على الفهم والتطبيق العملي. الطالب بيبني مشاريع بإيده وبيتعلم الـ Problem Solving اللي هيفيده في دراسته وفي مستقبله المهني."
  },
  {
    q: "هل الحصص أونلاين ولا حضوري؟",
    a: "متاح الاختيارين. بنقدم حصص حضورية في الزقازيق، وحصص أونلاين تفاعلية بجودة ممتازة لكل محافظات مصر عبر برامج زوم مع سبورة ذكية ومتابعة مباشرة لكود الطالب."
  },
  {
    q: "إيه المطلوب عشان نبدأ؟",
    a: "كل المطلوب جهاز كمبيوتر أو لابتوب شغال، خط إنترنت مستقر، وشغف للتعلم. إحنا بنساعد الطالب في تسطيب كل البرامج المطلوبة مجاناً."
  },
  {
    q: "إيه هي جلسة التقييم المجانية؟",
    a: "دي جلسة مدتها 30 دقيقة أونلاين، بنقعد فيها مع الطالب نعمله اختبار تفكير منطقي بسيط، وبنتعرف على أهدافه واهتماماته عشان نحدد له الخطة والجروب الأنسب لمستواه."
  }
];

export default function BaccalaureatePage() {
  const [activeModule, setActiveModule] = useState<string>("module-1");
  const [activeTofas, setActiveTofas] = useState<string>("tofas-1");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    schoolType: "ثانوي عام",
    grade: "الصف الأول الثانوي",
    notes: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const { mutateAsync: createBooking, isPending } = useCreateBooking();
  const { get } = useSiteSettings();

  const whatsapp = get(SETTINGS_KEYS.CONTACT_WHATSAPP, "201044348610");

  useEffect(() => {
    document.title = "تأسيس البرمجة والـ Logic للثانوي والبكالوريا | د. محمود المهدي";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "برنامج برمجى متكامل لتأسيس طلاب الثانوي العام وبكالوريا STEM بلغة Python والـ Logic مع د. محمود المهدي. ابدأ صح وطبق بمشاريع حقيقية."
      );
    }
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    const detailedMessage = `نوع التعليم: ${formData.schoolType}\nالسنة الدراسية: ${formData.grade}\nالبرنامج: تأسيس البكالوريا والثانوي\n\nملاحظات: ${formData.notes || "لا توجد"}`;

    try {
      await createBooking({
        data: {
          name: formData.name,
          phone: formData.phone,
          message: detailedMessage
        }
      });
    } catch (error) {
      console.error("Failed to save booking to database:", error);
    }

    const text = encodeURIComponent(
      `مرحبًا د. محمود 👋\n\nأود حجز تقييم مجاني (تأسيس الثانوي والبكالوريا):\n- الاسم الكامل: ${formData.name}\n- رقم الهاتف: ${formData.phone}\n- نوع التعليم: ${formData.schoolType}\n- السنة الدراسية: ${formData.grade}\n- ملاحظات إضافية: ${formData.notes || "لا توجد"}`
    );
    window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank");
    
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", phone: "", schoolType: "ثانوي عام", grade: "الصف الأول الثانوي", notes: "" });
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20" dir="rtl">
      {/* Minimal Sticky Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg shadow-md shadow-primary/10">
              م
            </div>
            <span className="font-bold text-lg text-primary tracking-tight">د. محمود المهدي</span>
          </a>
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-foreground/70">
            <a href="#curriculum" className="hover:text-primary transition-colors">منهج Python</a>
            <a href="#tofas" className="hover:text-secondary transition-colors">مسار ToFAS</a>
            <a href="#projects" className="hover:text-primary transition-colors">المشاريع</a>
            <a href="#faq" className="hover:text-primary transition-colors">أسئلة شائعة</a>
          </nav>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-5 h-9 text-sm shadow-md shadow-primary/10 hover:scale-[1.03] transition-all">
            <a href="#booking-form">
              <MessageCircle className="w-4 h-4 ml-2" />
              احجز تقييم مجاني
            </a>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-secondary/8 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center max-w-6xl mx-auto">
            {/* Right Column: Text & CTA */}
            <div className="lg:col-span-7 text-right flex flex-col items-start">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-foreground/40 mb-6">
                <a href="/" className="hover:text-primary transition-colors">الرئيسية</a>
                <ChevronLeft className="w-4 h-4 text-foreground/30" />
                <span className="text-primary font-medium">تأسيس الثانوي والبكالوريا</span>
              </div>

              {/* Program Tag */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-full mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                أقوى برنامج تأسيس برمجي لطلاب الثانوي في مصر
              </div>

              {/* Main Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight tracking-tight">
                ابنك هيتعلم برمجة بجد..<br />
                <span className="text-primary">
                  مش بس عشان ينجح في الامتحان
                </span>
              </h1>

              {/* Description */}
              <p className="text-foreground/70 text-base md:text-lg lg:text-xl leading-relaxed mb-10 max-w-2xl">
                منهج تفاعلي لطلاب الثانوي العام وبكالوريا الـ STEM. بنأسس التفكير المنطقي والـ Problem Solving بلغة Python وبمشاريع حقيقية تخليهم جاهزين للمستقبل.
              </p>

              {/* Hero CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-8 h-12 shadow-lg shadow-primary/25 hover:scale-[1.02] transition-all">
                  <a href="#booking-form">
                    <MessageCircle className="w-5 h-5 ml-2" />
                    ابدأ جلسة تقييم وتوجيه مجانية
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-border bg-card/50 hover:bg-card text-foreground rounded-full px-8 h-12">
                  <a href="#curriculum">استكشف المنهج كاملاً</a>
                </Button>
              </div>

              {/* Track quick-jump chips */}
              <div className="flex flex-wrap gap-3 items-center mt-8 text-xs">
                <span className="text-foreground/40">المسارات المتاحة:</span>
                <a href="#curriculum" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold hover:bg-primary/15 transition-colors">
                  <Code2 className="w-3.5 h-3.5" />
                  تأسيس Python والـ Logic
                </a>
                <a href="#tofas" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold hover:bg-primary/15 transition-colors">
                  <Cpu className="w-3.5 h-3.5" />
                  مسار ToFAS المتقدم
                </a>
              </div>
            </div>

            {/* Left Column: Visual Asset */}
            <div className="lg:col-span-5 relative flex justify-center items-center">
              {/* Decorative background glow under the image */}
              <div className="absolute w-[80%] h-[80%] bg-primary/10 rounded-full blur-[60px] -z-10 animate-pulse" />
              
              <div className="relative rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-card p-2 max-w-[450px] w-full">
                <img 
                  src="/baccalaureate-hero.png" 
                  alt="طلاب البكالوريا والثانوي يدرسون البرمجة" 
                  className="rounded-2xl w-full h-auto object-cover aspect-[4/3] sm:aspect-square"
                />
                
                {/* Floating trust badge */}
                <div className="absolute top-6 left-6 bg-background/90 backdrop-blur-md border border-border py-2.5 px-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-foreground/50 font-medium">جلسة التوجيه</p>
                    <p className="text-xs font-extrabold text-foreground">مجانية 100%</p>
                  </div>
                </div>

                {/* Floating stat card */}
                <div className="absolute bottom-6 right-6 bg-background/90 backdrop-blur-md border border-border py-2.5 px-4 rounded-2xl shadow-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-foreground/50 font-medium">المنهج الدراسي</p>
                    <p className="text-xs font-extrabold text-foreground">متوافق مع مدارس STEM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Trust Strip */}
      <section className="border-y border-border bg-card/30 relative">
        <div className="container mx-auto px-4 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Users, val: "+150 طالب وطالبة", desc: "اتعلموا التفكير البرمجي وPython وبدأوا رحلتهم بثقة." },
              { icon: BookOpen, val: "4 مشاريع حقيقية", desc: "بيبنيهم الطالب بإيده خلال الكورس عشان يطبق عملي." },
              { icon: Clock, val: "جلسات فردية وجماعية", desc: "متابعة دورية وتقارير مستمرة لأولياء الأمور خطوة بخطوة." }
            ].map((stat, i) => (
              <div key={i} className="flex gap-4 items-start md:text-right">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">{stat.val}</h3>
                  <p className="text-xs text-foreground/60 leading-relaxed">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is this for Section */}
      <section className="py-20 bg-background relative">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-wider mb-2 block">لمن هذا البرنامج</span>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground">الكورس ده مصمم خصيصاً لمين؟</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full mt-4" />
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: "طلاب STEM والبكالوريا",
                desc: "اللي عاوزين تفوق حقيقي وفهم كامل لمنهج البرمجة المطلوب في المدرسة، ومساعدتهم في أفكار وتطبيق مشاريع الـ Capstone السنوية.",
                points: ["فهم البايثون بعمق", "تطبيق الـ Logic في المشاريع", "إشراف ومناقشة علمية ممتازة"]
              },
              {
                title: "طلاب الثانوي العام واللغات",
                desc: "الراغبين في استغلال فترة الدراسة أو الإجازة في تعلم مهارة هي الأكثر طلباً في العالم حالياً وبناء مسار مهني قوي.",
                points: ["تأسيس للمستقبل والجامعة", "بناء عقلية حل المشكلات", "استغلال ذكي ومثمر للوقت"]
              },
              {
                title: "المبتدئون تماماً من الصفر",
                desc: "اللي معندهمش أي خلفية سابقة عن الكمبيوتر أو الأكواد وعاوزين يدرسوا أساسيات البرمجة بطريقة مبسطة ومنظمة وبدون تعقيد.",
                points: ["تأسيس هادئ ومبسط جداً", "تمارين تفاعلية تناسب سنهم", "متابعة مستمرة لتشجيعهم"]
              }
            ].map((card, idx) => (
              <div key={idx} className="bg-card border border-border hover:border-primary/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                <h3 className="text-lg font-bold text-foreground mb-3">{card.title}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed mb-6 flex-grow">{card.desc}</p>
                <ul className="space-y-2 border-t border-border pt-4">
                  {card.points.map((pt, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-foreground/85">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two Tracks Overview */}
      <section className="py-16 bg-background relative">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <span className="text-primary font-bold text-xs uppercase tracking-wider mb-2 block">مسارات التعلم</span>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground">اختار المسار اللي يناسب هدفك</h2>
            <p className="text-sm text-foreground/60 mt-3">مسارين متكاملين: تأسيس قوي في البرمجة، أو تعمّق أكثر مع مسار ToFAS المتقدم</p>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full mt-4" />
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <a href="#curriculum" className="group bg-card border border-border hover:border-primary/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Code2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">تأسيس Python والـ Logic</h3>
              <p className="text-sm text-foreground/60 leading-relaxed flex-grow">المسار الأساسي لبناء التفكير البرمجي والـ Problem Solving بلغة Python بمشاريع حقيقية.</p>
              <span className="inline-flex items-center gap-1.5 text-primary font-bold text-sm mt-4 group-hover:gap-2.5 transition-all">
                استكشف المنهج
                <ChevronLeft className="w-4 h-4" />
              </span>
            </a>
            <a href="#tofas" className="group bg-card border border-border hover:border-secondary/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden">
              <div className="absolute top-4 left-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">متقدم</div>
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">مسار ToFAS</h3>
              <p className="text-sm text-foreground/60 leading-relaxed flex-grow">مسار تعليمي مميز يأخذ الطالب لمستوى أعمق بخطوات منظمة من الأساسيات حتى المشروع المتكامل.</p>
              <span className="inline-flex items-center gap-1.5 text-secondary font-bold text-sm mt-4 group-hover:gap-2.5 transition-all">
                اكتشف المسار
                <ChevronLeft className="w-4 h-4" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Curriculum Section */}
      <section id="curriculum" className="py-20 bg-card/20 border-y border-border relative">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-wider mb-2 block">مسار التعلم</span>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground">المنهج الدراسي والرحلة التعليمية</h2>
            <p className="text-sm text-foreground/60 mt-3">من الصفر تماماً وحتى بناء أول مشاريعك المتكاملة</p>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full mt-4" />
          </div>

          <div className="grid lg:grid-cols-12 gap-8 max-w-5xl mx-auto items-start">
            {/* Module Tabs Selector */}
            <div className="lg:col-span-5 space-y-3">
              {curriculumModules.map((module) => {
                const IconComponent = module.icon;
                const isActive = activeModule === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    className={`w-full text-right p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/10"
                        : "bg-card border-border hover:border-foreground/20 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      }`}>
                        {module.number}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm md:text-base leading-tight">{module.title}</h3>
                        <p className={`text-[10px] mt-0.5 ${isActive ? "text-white/70" : "text-foreground/45"}`}>
                          المدة: {module.duration}
                        </p>
                      </div>
                    </div>
                    <IconComponent className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-primary"}`} />
                  </button>
                );
              })}
            </div>

            {/* Active Module Details */}
            <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 md:p-8 min-h-[350px] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <AnimatePresence mode="wait">
                {curriculumModules.map((module) => {
                  if (module.id !== activeModule) return null;
                  return (
                    <motion.div
                      key={module.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div>
                        <span className="text-primary font-bold text-xs uppercase tracking-wider mb-2 block">
                          المرحلة الدراسية {module.number}
                        </span>
                        <h3 className="text-xl md:text-2xl font-bold text-foreground">{module.title}</h3>
                        <p className="text-sm text-foreground/60 leading-relaxed mt-3">
                          {module.description}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-foreground/80">المواضيع الأساسية التي سيتم تغطيتها:</h4>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {module.topics.map((topic, index) => (
                            <div key={index} className="flex gap-2.5 items-start p-3 bg-background/40 border border-border/50 rounded-xl">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span className="text-xs text-foreground/85 leading-snug">{topic}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ToFAS Track Section */}
      <section id="tofas" className="py-20 relative overflow-hidden bg-background">
        {/* Distinctive glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-0 w-[350px] h-[350px] bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[110px]" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              مسار متقدم
            </span>
            <h2 className="text-2xl md:text-4xl font-bold">
              <span className="text-primary">
                مسار ToFAS
              </span>
            </h2>
            <p className="text-sm text-foreground/60 mt-3">مسار تعليمي مميز يأخذ الطالب لمستوى أعمق بخطوات منظمة</p>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full mt-4" />
          </div>

          <div className="grid lg:grid-cols-12 gap-8 max-w-5xl mx-auto items-start">
            {/* Module Tabs Selector */}
            <div className="lg:col-span-5 space-y-3">
              {tofasModules.map((module) => {
                const IconComponent = module.icon;
                const isActive = activeTofas === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveTofas(module.id)}
                    className={`w-full text-right p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isActive
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/15"
                        : "bg-card border-border hover:border-foreground/20 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      }`}>
                        {module.number}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm md:text-base leading-tight">{module.title}</h3>
                        <p className={`text-[10px] mt-0.5 ${isActive ? "text-white/70" : "text-foreground/45"}`}>
                          المدة: {module.duration}
                        </p>
                      </div>
                    </div>
                    <IconComponent className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-primary"}`} />
                  </button>
                );
              })}
            </div>

            {/* Active Module Details */}
            <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 md:p-8 min-h-[350px] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />
              <AnimatePresence mode="wait">
                {tofasModules.map((module) => {
                  if (module.id !== activeTofas) return null;
                  return (
                    <motion.div
                      key={module.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div>
                        <span className="text-secondary font-bold text-xs uppercase tracking-wider mb-2 block">
                          مرحلة ToFAS {module.number}
                        </span>
                        <h3 className="text-xl md:text-2xl font-bold text-foreground">{module.title}</h3>
                        <p className="text-sm text-foreground/60 leading-relaxed mt-3">
                          {module.description}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-bold text-xs text-foreground/80">المواضيع الأساسية التي سيتم تغطيتها:</h4>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {module.topics.map((topic, index) => (
                            <div key={index} className="flex gap-2.5 items-start p-3 bg-background/40 border border-border/50 rounded-xl">
                              <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                              <span className="text-xs text-foreground/85 leading-snug">{topic}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Student Projects Section */}
      <section id="projects" className="py-20 bg-background relative">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-wider mb-2 block">مخرجات عملية</span>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground">مشاريع حقيقية هتبنيها بنفسك</h2>
            <p className="text-sm text-foreground/60 mt-3">التعليم الحقيقي هو القدرة على التطبيق. دي أمثلة من مشاريع طلابنا</p>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full mt-4" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {studentProjects.map((project, idx) => (
              <div key={idx} className="bg-card border border-border/80 hover:border-primary/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center gap-2 mb-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                      {project.difficulty}
                    </span>
                    <Code2 className="w-4 h-4 text-primary/75" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-2">{project.title}</h3>
                  <p className="text-xs text-foreground/50 leading-relaxed mb-4">{project.desc}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 border-t border-border/55 pt-3">
                  {project.tech.map((t, i) => (
                    <span key={i} className="text-[10px] bg-background border border-border px-2 py-0.5 rounded-md text-foreground/60">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-card/20 border-y border-border relative">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-wider mb-2 block">آراء وتجارب</span>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground">قالوا إيه عن تجربة التعلم معنا؟</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full mt-4" />
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((test, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-8 h-8 bg-primary/5 rounded-br-2xl flex items-center justify-center text-primary font-serif text-lg pointer-events-none">
                  “
                </div>
                <p className="text-xs md:text-sm text-foreground/75 leading-relaxed mb-6 italic">
                  &quot;{test.content}&quot;
                </p>
                <div className="border-t border-border pt-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                    {test.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground/90">{test.name}</h4>
                    <p className="text-[10px] text-foreground/45 mt-0.5">{test.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Booking Section */}
      <section id="booking-form" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-2xl mx-auto bg-card border border-border shadow-xl rounded-3xl p-6 md:p-8">
            <div className="text-center mb-8">
              <span className="text-primary font-bold text-xs uppercase tracking-wider block mb-2">أول سيشن مجاناً</span>
              <h3 className="text-xl md:text-2xl font-extrabold text-foreground mb-2">احجز جلسة التقييم والتوجيه الآن</h3>
              <p className="text-xs md:text-sm text-foreground/60">
                املأ البيانات وسيتم التواصل معك مباشرة لتحديد موعد الجلسة المناسب.
              </p>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mb-2">
                  <Check className="w-8 h-8" />
                </div>
                <p className="font-bold text-foreground text-xl">تم تسجيل طلبك بنجاح!</p>
                <p className="text-foreground/50 text-xs max-w-xs">
                  جاري توجيهك الآن إلى واتساب لإتمام تنسيق موعد الجلسة المجانية.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-bold text-foreground/80 block">
                    اسم الطالب بالكامل
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: أحمد محمد علي"
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm transition-all text-right"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-xs font-bold text-foreground/80 block">
                      رقم واتساب ولي الأمر / الطالب
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="مثال: 01044348610"
                      className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm transition-all text-right"
                    />
                  </div>

                  {/* School Type */}
                  <div className="space-y-1.5">
                    <label htmlFor="schoolType" className="text-xs font-bold text-foreground/80 block">
                      نوع التعليم الدراسي
                    </label>
                    <select
                      id="schoolType"
                      value={formData.schoolType}
                      onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                      className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm transition-all text-right cursor-pointer"
                    >
                      <option value="ثانوي عام">ثانوي عام</option>
                      <option value="STEM وبكالوريا">STEM وبكالوريا</option>
                      <option value="ثانوي لغات / تجريبي">ثانوي لغات / تجريبي</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>

                {/* Grade */}
                <div className="space-y-1.5">
                  <label htmlFor="grade" className="text-xs font-bold text-foreground/80 block">
                    السنة الدراسية
                  </label>
                  <select
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm transition-all text-right cursor-pointer"
                  >
                    <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                    <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                    <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label htmlFor="notes" className="text-xs font-bold text-foreground/80 block">
                    ملاحظات أو أسئلة إضافية (اختياري)
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="مثال: عاوز مساعدة في مشروع مدرسة STEM، أو حابب جدول مكثف..."
                    className="w-full p-4 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm transition-all text-right resize-none"
                  />
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all"
                >
                  {isPending ? "جاري تسجيل طلبك..." : "احجز الجلسة المجانية وتواصل واتساب"}
                </Button>
                <p className="text-center text-[10px] text-foreground/45 mt-2">
                  * الجلسة مجانية تماماً ولا تتضمن أي التزام بالاشتراك.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-card/25 border-t border-border">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <div className="text-center mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-wider block mb-2">أسئلة شائعة</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">أسئلة بتدور في دماغك؟</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full mt-4" />
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm"
              >
                <h4 className="font-bold text-sm md:text-base text-foreground/90 flex gap-2 items-start">
                  <span className="text-primary font-bold">س:</span>
                  <span>{faq.q}</span>
                </h4>
                <p className="text-xs md:text-sm text-foreground/60 leading-relaxed mt-2.5 mr-4 pr-1 border-r-2 border-primary/20">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 text-center bg-background relative overflow-hidden">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">حاسس إن المنهج صعب أو محتاج مساعدة؟</h2>
          <p className="text-foreground/50 text-sm md:text-base mb-8 max-w-xl mx-auto leading-relaxed">
            البرمجة متعة لو اتعلمتها صح. تواصل معنا دلوقتي وسجل ابنك في جلسة التوجيه المجانية.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-10 h-12 shadow-lg shadow-primary/25 hover:scale-[1.02] transition-all">
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
              <MessageCircle className="w-5 h-5 ml-2" />
              تواصل مباشرة عبر واتساب
            </a>
          </Button>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-foreground/35 bg-card/10">
        © {new Date().getFullYear()} د. محمود المهدي — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
