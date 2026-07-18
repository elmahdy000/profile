import React, { useState, useEffect } from "react";
import { useSiteSettings, useUpdateSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";
import { Loader2, Save, CheckCircle2, UploadCloud, Plus, Trash2, ArrowUp, ArrowDown, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Default Fallbacks
const defaultServices = [
  {
    icon: "MonitorPlay",
    title: "Programming for Kids",
    description: "تعليم الأطفال البرمجة بطريقة ممتعة وتفاعلية باستخدام Scratch و Python ومشاريع بسيطة مناسبة للسن.",
    img: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=400&q=70"
  },
  {
    icon: "Terminal",
    title: "Python & Problem Solving",
    description: "تأسيس قوي في Python والتفكير البرمجي وحل المشكلات من الصفر حتى المشاريع العملية.",
    img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=70"
  },
  {
    icon: "Lightbulb",
    title: "AI Basics",
    description: "تعليم مبادئ الذكاء الاصطناعي وأدواته واستخداماته بطريقة بسيطة تناسب الطلاب والمبتدئين.",
    img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=70"
  },
  {
    icon: "FileText",
    title: "ICDL Skills",
    description: "تدريب عملي على Word و PowerPoint و Excel لاستخدامهم في الدراسة والشغل والعروض الاحترافية.",
    img: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&q=70"
  },
  {
    icon: "GraduationCap",
    title: "University Courses",
    description: "شرح عملي لمواد C++ و OOP و Data Structures و Algorithms و Database و Discrete Math.",
    img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=70"
  },
  {
    icon: "Code2",
    title: "Baccalaureate Programming",
    description: "تأسيس طلاب البكالوريا في البرمجة من الصفر بأسلوب واضح ومنظم ومناسب للمنهج.",
    img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&q=70"
  }
];

const defaultPlans = [
  {
    id: "kids",
    name: "Kids Package",
    subtitle: "للأطفال من 4 إلى 18 سنة",
    headline: "تعلم البرمجة بطريقة ممتعة",
    desc: "",
    badge: "",
    featured: false,
    features: [
      "Scratch + Python مبسط",
      "مشاريع صغيرة",
      "حصص أسبوعية",
      "متابعة للوالدين",
      "أول سيشن تقييم مجانًا",
    ],
  },
  {
    id: "bac",
    name: "تأسيس البكالوريا",
    subtitle: "للصف الأول والثاني والثالث الثانوي",
    headline: "ابدأ صح من الأول",
    desc: "شرح عملي للبرمجة خطوة بخطوة بدون تعقيد.",
    badge: "مناسب للبكالوريا",
    featured: true,
    features: [
      "أساسيات البرمجة",
      "Python خطوة بخطوة",
      "حل تدريبات عملية",
      "متابعة مستوى الطالب",
      "تجهيز للامتحانات",
      "أول سيشن تقييم مجانًا",
    ],
  },
  {
    id: "ai",
    name: "Python & AI Track",
    subtitle: "من الصفر للمشاريع",
    headline: "تعلم عملي بمشروع حقيقي",
    desc: "",
    badge: "",
    featured: false,
    features: [
      "Python من الأساس",
      "ذكاء اصطناعي تطبيقي",
      "تدريبات عملية",
      "مشروع في النهاية",
      "أول سيشن تقييم مجانًا",
    ],
  },
  {
    id: "uni",
    name: "University Support",
    subtitle: "لطلاب الجامعة",
    headline: "شرح عملي للمواد الصعبة",
    desc: "",
    badge: "",
    featured: false,
    features: [
      "C++ / OOP / Data Structures",
      "Algorithms & Database",
      "Discrete Math",
      "تحضير للامتحانات",
      "جلسات فردية أو جروب",
      "أول سيشن تقييم مجانًا",
    ],
  },
];

const defaultTestimonials = [
  {
    quote: "الشرح بسيط جدًا وابني بدأ يحب البرمجة بعد أسبوعين بس. الأسلوب العملي مختلف تمامًا عن أي مكان تاني.",
    author: "أم أحمد",
    role: "ولية أمر طالب 10 سنين",
    stars: 5,
    initials: "أ"
  },
  {
    quote: "طريقة الدكتور منظمة جدًا وبتخلي الطالب يطبق بنفسه من أول يوم. خلصت الكورس وعندي مشروع حقيقي في إيدي.",
    author: "محمد سالم",
    role: "طالب جامعة — Python Track",
    stars: 5,
    initials: "م"
  },
  {
    quote: "أفضل تأسيس للبرمجة في الزقازيق. فضلت أدور ومالقتش حاجة زي د. محمود في الأسلوب والصبر مع الطلبة.",
    author: "علي حسن",
    role: "طالب ثانوي",
    stars: 5,
    initials: "ع"
  },
  {
    quote: "ابنتي اتعلمت Scratch و Python في 3 شهور وعملت مشروع كامل. الدكتور بيعرف يتعامل مع الأطفال بشكل ممتاز.",
    author: "أبو يوسف",
    role: "ولي أمر — Kids Package",
    stars: 5,
    initials: "ي"
  }
];

const defaultFaqs = [
  {
    q: "هل د. محمود المهدي بيدرس طلاب الثانوية العامة والبكالوريا؟",
    a: "نعم، د. محمود المهدي متخصص في تدريس البرمجة لطلاب الثانوية العامة والبكالوريا — الصف الأول والثاني والثالث الثانوي. يدرّس Python، C++، وأساسيات البرمجة بأسلوب مبسط يناسب المناهج الدراسية ويساعد الطالب على الفهم العميق وليس الحفظ."
  },
  {
    q: "ما هي كورسات البرمجة المتاحة للصف الثاني الثانوي في الزقازيق؟",
    a: "متاح كورس Baccalaureate Programming مصمم لطلاب الصف الثاني والثالث الثانوي والبكالوريا، يشمل: أساسيات البرمجة، Python، logic، problem solving، وتمارين عملية متوافقة مع المنهج. يُعقد الكورس في Eduverse بفلل الجامعة، الزقازيق."
  },
  {
    q: "كيف أتواصل مع د. محمود المهدي لحجز كورس برمجة؟",
    a: "يمكنك التواصل مباشرة على واتساب 01044348610 لحجز أول سيشن مجانًا. الموقع في Eduverse، فلل الجامعة، الزقازيق."
  }
];

const defaultPortfolio = [
  {
    category: "Kids",
    title: "Scratch lesson designs",
    img: "https://images.unsplash.com/photo-1560785496-3c9d27877182?w=400&q=70"
  },
  {
    category: "Programming",
    title: "Python explanations",
    img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=70"
  },
  {
    category: "AI",
    title: "AI content",
    img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=70"
  },
  {
    category: "Educational",
    title: "Educational posters",
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=70"
  },
  {
    category: "Web",
    title: "HTML lessons",
    img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=70"
  },
  {
    category: "Academic",
    title: "University courses",
    img: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=400&q=70"
  },
  {
    category: "Media",
    title: "Podcast covers",
    img: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=70"
  },
  {
    category: "Branding",
    title: "Eduverse designs",
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=70"
  },
  {
    category: "Web",
    title: "Landing page concepts",
    img: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&q=70"
  },
  {
    category: "Showcase",
    title: "Student projects",
    img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=70"
  },
];

export function AdminSettings() {
  const { toast } = useToast();
  const { settings, isLoading } = useSiteSettings();
  const updateSettingsMutation = useUpdateSiteSettings();

  const [activeTab, setActiveTab] = useState<
    "general" | "hero" | "about" | "services" | "pricing" | "testimonials" | "faq" | "contact" | "social" | "portfolio" | "eduverse" | "why-choose-me"
  >("general");

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // List states
  const [services, setServices] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [faq, setFaq] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);

  // Selected item indices for editing
  const [selServiceIdx, setSelServiceIdx] = useState<number | null>(null);
  const [selPlanIdx, setSelPlanIdx] = useState<number | null>(null);
  const [selTestimonialIdx, setSelTestimonialIdx] = useState<number | null>(null);
  const [selFaqIdx, setSelFaqIdx] = useState<number | null>(null);
  const [selPortfolioIdx, setSelPortfolioIdx] = useState<number | null>(null);

  // Initialize form data
  useEffect(() => {
    if (settings) {
      const initialData: Record<string, string> = {};
      Object.values(SETTINGS_KEYS).forEach((key) => {
        initialData[key] = settings[key]?.value || "";
      });
      setFormData(initialData);

      // Parse list fields with defaults fallback
      try {
        const val = settings[SETTINGS_KEYS.SERVICES_LIST]?.value;
        setServices(val ? JSON.parse(val) : defaultServices);
      } catch {
        setServices(defaultServices);
      }

      try {
        const val = settings[SETTINGS_KEYS.PRICING_LIST]?.value;
        setPricing(val ? JSON.parse(val) : defaultPlans);
      } catch {
        setPricing(defaultPlans);
      }

      try {
        const val = settings[SETTINGS_KEYS.TESTIMONIALS_LIST]?.value;
        setTestimonials(val ? JSON.parse(val) : defaultTestimonials);
      } catch {
        setTestimonials(defaultTestimonials);
      }

      try {
        const val = settings[SETTINGS_KEYS.FAQ_LIST]?.value;
        setFaq(val ? JSON.parse(val) : defaultFaqs);
      } catch {
        setFaq(defaultFaqs);
      }

      try {
        const val = settings[SETTINGS_KEYS.PORTFOLIO_LIST]?.value;
        setPortfolio(val ? JSON.parse(val) : defaultPortfolio);
      } catch {
        setPortfolio(defaultPortfolio);
      }
    }
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string, callback?: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("image", file);

    setIsUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        if (callback) {
          callback(data.url);
        } else {
          handleChange(key, data.url);
        }
      } else {
        toast({ title: "خطأ", description: "حدث خطأ أثناء رفع الصورة: " + (data.error || ""), variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "خطأ", description: "فشل الرفع. تأكد من اتصالك بالإنترنت.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const payload = [
      ...Object.entries(formData).map(([key, value]) => ({ key, value })),
      { key: SETTINGS_KEYS.SERVICES_LIST, value: JSON.stringify(services) },
      { key: SETTINGS_KEYS.PRICING_LIST, value: JSON.stringify(pricing) },
      { key: SETTINGS_KEYS.TESTIMONIALS_LIST, value: JSON.stringify(testimonials) },
      { key: SETTINGS_KEYS.FAQ_LIST, value: JSON.stringify(faq) },
      { key: SETTINGS_KEYS.PORTFOLIO_LIST, value: JSON.stringify(portfolio) },
    ];

    try {
      await updateSettingsMutation.mutateAsync(payload);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ الإعدادات", variant: "destructive" });
    }
  };

  // Reordering helpers
  const moveItem = (list: any[], setList: React.Dispatch<React.SetStateAction<any[]>>, idx: number, dir: "up" | "down", setIdx?: React.Dispatch<React.SetStateAction<number | null>>) => {
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const newList = [...list];
    [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
    setList(newList);
    if (setIdx) setIdx(targetIdx);
    setIsSaved(false);
  };

  const deleteItem = (list: any[], setList: React.Dispatch<React.SetStateAction<any[]>>, idx: number, setIdx?: React.Dispatch<React.SetStateAction<number | null>>) => {
    const newList = list.filter((_, i) => i !== idx);
    setList(newList);
    if (setIdx) setIdx(null);
    setIsSaved(false);
    toast({ title: "تم", description: "تم حذف العنصر بنجاح" });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/20 border border-border rounded-3xl">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  const subTabs = [
    { id: "general", label: "الإعدادات العامة" },
    { id: "hero", label: "القسم الرئيسي (Hero)" },
    { id: "about", label: "عن الدكتور (About)" },
    { id: "services", label: "الخدمات (Services)" },
    { id: "pricing", label: "الأسعار (Pricing)" },
    { id: "testimonials", label: "الآراء (Testimonials)" },
    { id: "faq", label: "الأسئلة الشائعة (FAQ)" },
    { id: "portfolio", label: "الأعمال (Portfolio)" },
    { id: "eduverse", label: "إيدوفيرس (Eduverse)" },
    { id: "why-choose-me", label: "ليه تختارني (Why Me)" },
    { id: "contact", label: "بيانات التواصل" },
    { id: "social", label: "مواقع التواصل" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Top Header & Save Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">تعديل محتوى الموقع</h2>
          <p className="text-xs text-muted-foreground mt-1">تعديل كل سكشن في الصفحة الرئيسية بشكل مباشر وسريع</p>
        </div>
        <button
          onClick={() => handleSubmit()}
          disabled={updateSettingsMutation.isPending}
          className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-6 py-3 text-sm transition-all shadow-lg shadow-primary/10 hover:shadow-primary/20 flex items-center justify-center gap-2"
        >
          {updateSettingsMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSaved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaved ? "تم الحفظ بنجاح" : "حفظ جميع التغييرات"}
        </button>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3 overflow-x-auto">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "bg-muted/40 text-muted-foreground border border-border/60 hover:bg-card/60 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
        
        {/* GENERAL SETTINGS */}
        {activeTab === "general" && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-foreground">الإعدادات العامة وشعار الموقع</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-bold">اسم الموقع (Site Name)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.SITE_NAME] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.SITE_NAME, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="د. محمود المهدي"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-bold">شعار الموقع الفرعي (Site Tagline)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.SITE_TAGLINE] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.SITE_TAGLINE, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="مدرب برمجة وذكاء اصطناعي"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-bold">وصف الموقع لمحركات البحث (SEO Description)</label>
              <textarea
                value={formData[SETTINGS_KEYS.SITE_SEO_DESC] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.SITE_SEO_DESC, e.target.value)}
                rows={3}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="كورسات برمجة وتأسيس ذكاء اصطناعي في الزقازيق..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans font-bold">شعار الموقع (Logo URL)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.SITE_LOGO_URL] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.SITE_LOGO_URL, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  dir="ltr"
                />
                <div className="relative flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, SETTINGS_KEYS.SITE_LOGO_URL)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors font-bold text-xs"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    <span>رفع شعار</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HERO SECTION */}
        {activeTab === "hero" && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-foreground">إعدادات القسم الرئيسي (Hero)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">العنوان الرئيسي (Hero Title)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.HERO_TITLE] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.HERO_TITLE, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="تعلم البرمجة والذكاء الاصطناعي"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">العنوان الفرعي (Hero Subtitle)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.HERO_SUBTITLE] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.HERO_SUBTITLE, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="مع د. محمود المهدي"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الشارة / الـ Badge (مثال: متواجدون في الزقازيق)</label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.HERO_BADGE] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.HERO_BADGE, e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="حجز تقييم مجاني بالكامل"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الوصف (Hero Description)</label>
              <textarea
                value={formData[SETTINGS_KEYS.HERO_DESC] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.HERO_DESC, e.target.value)}
                rows={4}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="أول سيشن مجاناً لتحديد المستوى والمشاريع العملية..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">صورة البطل الشخصية (Hero Image)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.HERO_PHOTO_URL] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.HERO_PHOTO_URL, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  dir="ltr"
                />
                <div className="relative flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, SETTINGS_KEYS.HERO_PHOTO_URL)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors font-bold text-xs"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    <span>رفع صورة</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABOUT SECTION */}
        {activeTab === "about" && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-foreground">إعدادات قسم "عن الدكتور" (About)</h3>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">العنوان الرئيسي</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.ABOUT_TITLE] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.ABOUT_TITLE, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="من هو د. محمود المهدي؟"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans">سنوات الخبرة</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.ABOUT_YEARS] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.ABOUT_YEARS, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans">عدد الطلاب</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.ABOUT_STUDENTS] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.ABOUT_STUDENTS, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الوصف التعريفي</label>
              <textarea
                value={formData[SETTINGS_KEYS.ABOUT_DESC] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.ABOUT_DESC, e.target.value)}
                rows={5}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="حاصل على ماجستير ودكتوراه في هندسة البرمجيات..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">صورة قسم عن الدكتور</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.ABOUT_IMAGE_URL] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.ABOUT_IMAGE_URL, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  dir="ltr"
                />
                <div className="relative flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, SETTINGS_KEYS.ABOUT_IMAGE_URL)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors font-bold text-xs"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    <span>رفع صورة</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SERVICES SECTION */}
        {activeTab === "services" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="text-lg font-bold text-foreground font-outfit">البرامج والخدمات التعليمية</h3>
              <button
                onClick={() => {
                  const newService = {
                    title: "برنامج جديد",
                    description: "تفاصيل ووصف الكورس الجديد هنا...",
                    img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=70",
                    icon: "MonitorPlay"
                  };
                  setServices([...services, newService]);
                  setSelServiceIdx(services.length);
                  setIsSaved(false);
                }}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" /> إضافة برنامج جديد
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* List */}
              <div className="md:col-span-1 space-y-2 border-l border-border/30 pl-4 max-h-[500px] overflow-y-auto">
                {services.map((service, index) => (
                  <div
                    key={index}
                    onClick={() => setSelServiceIdx(index)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      selServiceIdx === index
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {service.img && (
                        <img src={service.img} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                      )}
                      <span className="text-sm font-bold truncate">{service.title || "بدون عنوان"}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => moveItem(services, setServices, index, "up", setSelServiceIdx)}
                        className="p-1 hover:text-foreground transition-colors"
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveItem(services, setServices, index, "down", setSelServiceIdx)}
                        className="p-1 hover:text-foreground transition-colors"
                        disabled={index === services.length - 1}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(services, setServices, index, setSelServiceIdx)}
                        className="p-1 text-red-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Detail */}
              <div className="md:col-span-2">
                {selServiceIdx !== null && services[selServiceIdx] ? (
                  <div className="space-y-4 bg-background p-5 rounded-2xl border border-border">
                    <h4 className="font-bold text-foreground border-b border-border/20 pb-2">تعديل تفاصيل البرنامج</h4>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">عنوان البرنامج</label>
                        <input
                          type="text"
                          value={services[selServiceIdx].title || ""}
                          onChange={(e) => {
                            const copy = [...services];
                            copy[selServiceIdx].title = e.target.value;
                            setServices(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الأيقونة (Lucide Icon)</label>
                        <select
                          value={services[selServiceIdx].icon || "MonitorPlay"}
                          onChange={(e) => {
                            const copy = [...services];
                            copy[selServiceIdx].icon = e.target.value;
                            setServices(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans"
                        >
                          <option value="MonitorPlay">MonitorPlay (شاشة ألعاب)</option>
                          <option value="Terminal">Terminal (شاشة كود)</option>
                          <option value="Lightbulb">Lightbulb (لمبة إبداع)</option>
                          <option value="FileText">FileText (ملفات ونصوص)</option>
                          <option value="GraduationCap">GraduationCap (قبعة تخرج)</option>
                          <option value="Code2">Code2 (رمز كود)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">صورة البرنامج (رابط أو رفع)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={services[selServiceIdx].img || ""}
                          onChange={(e) => {
                            const copy = [...services];
                            copy[selServiceIdx].img = e.target.value;
                            setServices(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          dir="ltr"
                        />
                        <div className="relative flex-shrink-0">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              handleFileUpload(e, "", (url) => {
                                const copy = [...services];
                                copy[selServiceIdx].img = url;
                                setServices(copy);
                                setIsSaved(false);
                              });
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isUploading}
                          />
                          <button
                            type="button"
                            className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors font-bold text-xs"
                            disabled={isUploading}
                          >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                            <span>رفع صورة</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الوصف / التفاصيل</label>
                      <textarea
                        value={services[selServiceIdx].description || ""}
                        onChange={(e) => {
                          const copy = [...services];
                          copy[selServiceIdx].description = e.target.value;
                          setServices(copy);
                          setIsSaved(false);
                        }}
                        rows={4}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-background">
                    <p className="text-muted-foreground text-sm">اختر برنامجاً من القائمة الجانبية لتعديله أو أضف برنامجاً جديداً.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRICING SECTION */}
        {activeTab === "pricing" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="text-lg font-bold text-foreground">إعدادات أسعار المسارات (Pricing Plans)</h3>
              <button
                onClick={() => {
                  const newPlan = {
                    id: "plan_" + Date.now(),
                    name: "باقة جديدة",
                    subtitle: "تفاصيل الفئة المستهدفة",
                    headline: "تعلم قوي بمشاريع عملية",
                    desc: "",
                    badge: "",
                    featured: false,
                    features: ["ميزة 1", "ميزة 2"]
                  };
                  setPricing([...pricing, newPlan]);
                  setSelPlanIdx(pricing.length);
                  setIsSaved(false);
                }}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" /> إضافة باقة جديدة
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* List */}
              <div className="md:col-span-1 space-y-2 border-l border-border/30 pl-4 max-h-[500px] overflow-y-auto">
                {pricing.map((plan, index) => (
                  <div
                    key={plan.id || index}
                    onClick={() => setSelPlanIdx(index)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      selPlanIdx === index
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    <div className="truncate">
                      <span className="text-sm font-bold block truncate">{plan.name || "بدون عنوان"}</span>
                      <span className="text-[10px] text-muted-foreground truncate block">{plan.subtitle}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => moveItem(pricing, setPricing, index, "up", setSelPlanIdx)}
                        className="p-1 hover:text-foreground transition-colors"
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveItem(pricing, setPricing, index, "down", setSelPlanIdx)}
                        className="p-1 hover:text-foreground transition-colors"
                        disabled={index === pricing.length - 1}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(pricing, setPricing, index, setSelPlanIdx)}
                        className="p-1 text-red-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Detail */}
              <div className="md:col-span-2">
                {selPlanIdx !== null && pricing[selPlanIdx] ? (
                  <div className="space-y-4 bg-background p-5 rounded-2xl border border-border">
                    <h4 className="font-bold text-foreground border-b border-border/20 pb-2">تعديل تفاصيل الباقة</h4>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">اسم الباقة</label>
                        <input
                          type="text"
                          value={pricing[selPlanIdx].name || ""}
                          onChange={(e) => {
                            const copy = [...pricing];
                            copy[selPlanIdx].name = e.target.value;
                            setPricing(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans">معرف الباقة (ID فريد بالإنجليزية)</label>
                        <input
                          type="text"
                          value={pricing[selPlanIdx].id || ""}
                          onChange={(e) => {
                            const copy = [...pricing];
                            copy[selPlanIdx].id = e.target.value.replace(/[^a-zA-Z0-9_-]/g, "");
                            setPricing(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">العنوان الفرعي (Subtitle)</label>
                        <input
                          type="text"
                          value={pricing[selPlanIdx].subtitle || ""}
                          onChange={(e) => {
                            const copy = [...pricing];
                            copy[selPlanIdx].subtitle = e.target.value;
                            setPricing(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">السطر الترويجي (Headline)</label>
                        <input
                          type="text"
                          value={pricing[selPlanIdx].headline || ""}
                          onChange={(e) => {
                            const copy = [...pricing];
                            copy[selPlanIdx].headline = e.target.value;
                            setPricing(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">شارة مميزة (Badge)</label>
                        <input
                          type="text"
                          value={pricing[selPlanIdx].badge || ""}
                          onChange={(e) => {
                            const copy = [...pricing];
                            copy[selPlanIdx].badge = e.target.value;
                            setPricing(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          placeholder="مثال: الأكثر طلباً"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-4">
                        <input
                          type="checkbox"
                          id="planFeatured"
                          checked={!!pricing[selPlanIdx].featured}
                          onChange={(e) => {
                            const copy = [...pricing];
                            copy[selPlanIdx].featured = e.target.checked;
                            setPricing(copy);
                            setIsSaved(false);
                          }}
                          className="w-4 h-4 rounded text-primary focus:ring-primary bg-background border-border"
                        />
                        <label htmlFor="planFeatured" className="text-xs font-semibold text-foreground cursor-pointer select-none">تمييز هذه الباقة (Featured)</label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">وصف إضافي (اختياري)</label>
                      <input
                        type="text"
                        value={pricing[selPlanIdx].desc || ""}
                        onChange={(e) => {
                          const copy = [...pricing];
                          copy[selPlanIdx].desc = e.target.value;
                          setPricing(copy);
                          setIsSaved(false);
                        }}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">المميزات (اكتب كل ميزة في سطر منفصل)</label>
                      <textarea
                        value={pricing[selPlanIdx].features ? pricing[selPlanIdx].features.join("\n") : ""}
                        onChange={(e) => {
                          const copy = [...pricing];
                          copy[selPlanIdx].features = e.target.value.split("\n").filter(line => line.trim() !== "");
                          setPricing(copy);
                          setIsSaved(false);
                        }}
                        rows={5}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans"
                        placeholder="مميزات الكورس..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-background">
                    <p className="text-muted-foreground text-sm">اختر باقة أسعار من القائمة لتعديلها أو أضف باقة جديدة.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TESTIMONIALS SECTION */}
        {activeTab === "testimonials" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="text-lg font-bold text-foreground">إعدادات آراء الطلاب (Testimonials)</h3>
              <button
                onClick={() => {
                  const newTestimonial = {
                    quote: "الشرح ممتاز وجدير بالتقدير...",
                    author: "اسم الطالب الجديد",
                    role: "المرحلة الدراسية",
                    stars: 5,
                    initials: "أ"
                  };
                  setTestimonials([...testimonials, newTestimonial]);
                  setSelTestimonialIdx(testimonials.length);
                  setIsSaved(false);
                }}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" /> إضافة رأي جديد
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* List */}
              <div className="md:col-span-1 space-y-2 border-l border-border/30 pl-4 max-h-[500px] overflow-y-auto">
                {testimonials.map((test, index) => (
                  <div
                    key={index}
                    onClick={() => setSelTestimonialIdx(index)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      selTestimonialIdx === index
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    <div className="truncate">
                      <span className="text-sm font-bold block truncate">{test.author || "بدون اسم"}</span>
                      <span className="text-[10px] text-muted-foreground truncate block">{test.role}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => moveItem(testimonials, setTestimonials, index, "up", setSelTestimonialIdx)}
                        className="p-1 hover:text-foreground transition-colors"
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveItem(testimonials, setTestimonials, index, "down", setSelTestimonialIdx)}
                        className="p-1 hover:text-foreground transition-colors"
                        disabled={index === testimonials.length - 1}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(testimonials, setTestimonials, index, setSelTestimonialIdx)}
                        className="p-1 text-red-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Detail */}
              <div className="md:col-span-2">
                {selTestimonialIdx !== null && testimonials[selTestimonialIdx] ? (
                  <div className="space-y-4 bg-background p-5 rounded-2xl border border-border">
                    <h4 className="font-bold text-foreground border-b border-border/20 pb-2">تعديل تفاصيل الرأي</h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">اسم الكاتب (طالب / ولي أمر)</label>
                        <input
                          type="text"
                          value={testimonials[selTestimonialIdx].author || ""}
                          onChange={(e) => {
                            const copy = [...testimonials];
                            copy[selTestimonialIdx].author = e.target.value;
                            // Update initials automatically
                            if (e.target.value) {
                              copy[selTestimonialIdx].initials = e.target.value.trim().charAt(0);
                            }
                            setTestimonials(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الحرف الأول (للدائرة)</label>
                        <input
                          type="text"
                          value={testimonials[selTestimonialIdx].initials || ""}
                          onChange={(e) => {
                            const copy = [...testimonials];
                            copy[selTestimonialIdx].initials = e.target.value;
                            setTestimonials(copy);
                            setIsSaved(false);
                          }}
                          maxLength={2}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الوصف / الدور</label>
                        <input
                          type="text"
                          value={testimonials[selTestimonialIdx].role || ""}
                          onChange={(e) => {
                            const copy = [...testimonials];
                            copy[selTestimonialIdx].role = e.target.value;
                            setTestimonials(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          placeholder="طالب ثانوي، ولي أمر..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">عدد النجوم (Stars)</label>
                        <select
                          value={testimonials[selTestimonialIdx].stars || 5}
                          onChange={(e) => {
                            const copy = [...testimonials];
                            copy[selTestimonialIdx].stars = Number(e.target.value);
                            setTestimonials(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        >
                          <option value="5">⭐⭐⭐⭐⭐ (5 نجوم)</option>
                          <option value="4">⭐⭐⭐⭐ (4 نجوم)</option>
                          <option value="3">⭐⭐⭐ (3 نجوم)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الرأي / النص</label>
                      <textarea
                        value={testimonials[selTestimonialIdx].quote || ""}
                        onChange={(e) => {
                          const copy = [...testimonials];
                          copy[selTestimonialIdx].quote = e.target.value;
                          setTestimonials(copy);
                          setIsSaved(false);
                        }}
                        rows={4}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-background">
                    <p className="text-muted-foreground text-sm">اختر رأياً من القائمة لتعديله أو أضف رأياً جديداً.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Testimonials Background Image Upload */}
            <div className="mt-6 pt-6 border-t border-border/30">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans font-bold">صورة الخلفية لقسم الآراء (Testimonials Background Image)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.TESTIMONIALS_BG_URL] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.TESTIMONIALS_BG_URL, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  dir="ltr"
                />
                <div className="relative flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, SETTINGS_KEYS.TESTIMONIALS_BG_URL)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors font-bold text-xs"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    <span>رفع صورة</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* FAQ SECTION */}
        {activeTab === "faq" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="text-lg font-bold text-foreground">إعدادات الأسئلة الشائعة (FAQ)</h3>
              <button
                onClick={() => {
                  const newFaq = {
                    q: "سؤال جديد؟",
                    a: "الإجابة هنا..."
                  };
                  setFaq([...faq, newFaq]);
                  setSelFaqIdx(faq.length);
                  setIsSaved(false);
                }}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" /> إضافة سؤال جديد
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* List */}
              <div className="md:col-span-1 space-y-2 border-l border-border/30 pl-4 max-h-[500px] overflow-y-auto">
                {faq.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => setSelFaqIdx(index)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      selFaqIdx === index
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    <span className="text-sm font-bold truncate block">{item.q || "بدون سؤال"}</span>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => moveItem(faq, setFaq, index, "up", setSelFaqIdx)}
                        className="p-1 hover:text-foreground transition-colors"
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveItem(faq, setFaq, index, "down", setSelFaqIdx)}
                        className="p-1 hover:text-foreground transition-colors"
                        disabled={index === faq.length - 1}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(faq, setFaq, index, setSelFaqIdx)}
                        className="p-1 text-red-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Detail */}
              <div className="md:col-span-2">
                {selFaqIdx !== null && faq[selFaqIdx] ? (
                  <div className="space-y-4 bg-background p-5 rounded-2xl border border-border">
                    <h4 className="font-bold text-foreground border-b border-border/20 pb-2">تعديل تفاصيل السؤال</h4>
                    
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">السؤال</label>
                      <input
                        type="text"
                        value={faq[selFaqIdx].q || ""}
                        onChange={(e) => {
                          const copy = [...faq];
                          copy[selFaqIdx].q = e.target.value;
                          setFaq(copy);
                          setIsSaved(false);
                        }}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">الإجابة</label>
                      <textarea
                        value={faq[selFaqIdx].a || ""}
                        onChange={(e) => {
                          const copy = [...faq];
                          copy[selFaqIdx].a = e.target.value;
                          setFaq(copy);
                          setIsSaved(false);
                        }}
                        rows={5}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-background">
                    <p className="text-muted-foreground text-sm">اختر سؤالاً من القائمة لتعديله أو أضف سؤالاً جديداً.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PORTFOLIO SECTION */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="text-lg font-bold text-foreground">إعدادات معرض الأعمال (Portfolio)</h3>
              <button
                onClick={() => {
                  const newItem = {
                    category: "Programming",
                    title: "مشروع جديد للطلاب",
                    img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=70"
                  };
                  setPortfolio([...portfolio, newItem]);
                  setSelPortfolioIdx(portfolio.length);
                  setIsSaved(false);
                }}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" /> إضافة عمل جديد
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* List */}
              <div className="md:col-span-1 space-y-2 border-l border-border/30 pl-4 max-h-[500px] overflow-y-auto">
                {portfolio.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => setSelPortfolioIdx(index)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      selPortfolioIdx === index
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    <div className="truncate flex items-center gap-2">
                      {item.img && (
                        <img src={item.img} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="truncate text-right">
                        <span className="text-sm font-bold block truncate">{item.title || "بدون عنوان"}</span>
                        <span className="text-[10px] text-muted-foreground truncate block">{item.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => moveItem(portfolio, setPortfolio, index, "up", setSelPortfolioIdx)}
                        className="p-1 hover:text-foreground transition-colors"
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveItem(portfolio, setPortfolio, index, "down", setSelPortfolioIdx)}
                        className="p-1 hover:text-foreground transition-colors"
                        disabled={index === portfolio.length - 1}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(portfolio, setPortfolio, index, setSelPortfolioIdx)}
                        className="p-1 text-red-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Detail */}
              <div className="md:col-span-2">
                {selPortfolioIdx !== null && portfolio[selPortfolioIdx] ? (
                  <div className="space-y-4 bg-background p-5 rounded-2xl border border-border">
                    <h4 className="font-bold text-foreground border-b border-border/20 pb-2">تعديل تفاصيل العمل</h4>
                    
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">عنوان العمل (Title)</label>
                      <input
                        type="text"
                        value={portfolio[selPortfolioIdx].title || ""}
                        onChange={(e) => {
                          const copy = [...portfolio];
                          copy[selPortfolioIdx].title = e.target.value;
                          setPortfolio(copy);
                          setIsSaved(false);
                        }}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">القسم / الفئة (Category)</label>
                      <select
                        value={portfolio[selPortfolioIdx].category || "Programming"}
                        onChange={(e) => {
                          const copy = [...portfolio];
                          copy[selPortfolioIdx].category = e.target.value;
                          setPortfolio(copy);
                          setIsSaved(false);
                        }}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-sans"
                      >
                        <option value="Kids">الأطفال (Kids)</option>
                        <option value="Programming">برمجة (Programming)</option>
                        <option value="AI">ذكاء اصطناعي (AI)</option>
                        <option value="Educational">تعليمي (Educational)</option>
                        <option value="Web">ويب (Web)</option>
                        <option value="Academic">أكاديمي (Academic)</option>
                        <option value="Media">ميديا (Media)</option>
                        <option value="Branding">براندنج (Branding)</option>
                        <option value="Showcase">مشاريع الطلاب (Showcase)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">صورة العمل (Image URL)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={portfolio[selPortfolioIdx].img || ""}
                          onChange={(e) => {
                            const copy = [...portfolio];
                            copy[selPortfolioIdx].img = e.target.value;
                            setPortfolio(copy);
                            setIsSaved(false);
                          }}
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          dir="ltr"
                        />
                        <div className="relative flex-shrink-0">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, "", (url) => {
                              const copy = [...portfolio];
                              copy[selPortfolioIdx].img = url;
                              setPortfolio(copy);
                              setIsSaved(false);
                            })}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isUploading}
                          />
                          <button
                            type="button"
                            className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors font-bold text-xs"
                            disabled={isUploading}
                          >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                            <span>رفع صورة</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-background">
                    <p className="text-muted-foreground text-sm">اختر عملاً من القائمة لتعديله أو أضف عملاً جديداً.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EDUVERSE SECTION */}
        {activeTab === "eduverse" && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-foreground">إعدادات سكن إيدوفيرس (Eduverse)</h3>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans font-bold">صورة خلفية القسم (Background Image)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.EDUVERSE_IMAGE_URL] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.EDUVERSE_IMAGE_URL, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  dir="ltr"
                />
                <div className="relative flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, SETTINGS_KEYS.EDUVERSE_IMAGE_URL)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors font-bold text-xs"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    <span>رفع صورة</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WHY CHOOSE ME SECTION */}
        {activeTab === "why-choose-me" && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-foreground">إعدادات سكن "ليه تختارني" (Why Choose Me)</h3>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 font-sans font-bold">صورة خلفية القسم (Background Image)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.WHY_CHOOSE_ME_BG_URL] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.WHY_CHOOSE_ME_BG_URL, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  dir="ltr"
                />
                <div className="relative flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, SETTINGS_KEYS.WHY_CHOOSE_ME_BG_URL)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    className="h-full px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl flex items-center gap-2 transition-colors font-bold text-xs"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    <span>رفع صورة</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTACT SECTION */}
        {activeTab === "contact" && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-foreground">بيانات التواصل (Contact Info)</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">رقم الواتساب الرئيسي (مع كود الدولة، مثال: 201044348610)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.CONTACT_WHATSAPP] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.CONTACT_WHATSAPP, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                  dir="ltr"
                  placeholder="201044348610"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">العنوان / المقر (مثل: Eduverse، فلل الجامعة، الزقازيق)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.CONTACT_ADDRESS] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.CONTACT_ADDRESS, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="Eduverse، فلل الجامعة، الزقازيق"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">رقم الهاتف الأول (Phone 1)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.CONTACT_PHONE1] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.CONTACT_PHONE1, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">رقم الهاتف الثاني (Phone 2)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.CONTACT_PHONE2] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.CONTACT_PHONE2, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">رقم الهاتف الثالث (Phone 3)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.CONTACT_PHONE3] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.CONTACT_PHONE3, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">رابط خرائط جوجل (Google Maps Embed or Link URL)</label>
              <input
                type="text"
                value={formData[SETTINGS_KEYS.CONTACT_MAPS_URL] || ""}
                onChange={(e) => handleChange(SETTINGS_KEYS.CONTACT_MAPS_URL, e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                dir="ltr"
                placeholder="https://maps.google.com/..."
              />
            </div>
          </div>
        )}

        {/* SOCIAL SECTION */}
        {activeTab === "social" && (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-foreground">مواقع التواصل الاجتماعي (Social Media links)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">فيسبوك (Facebook URL)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.SOCIAL_FACEBOOK] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.SOCIAL_FACEBOOK, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                  dir="ltr"
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">انستجرام (Instagram URL)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.SOCIAL_INSTAGRAM] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.SOCIAL_INSTAGRAM, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                  dir="ltr"
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">يوتيوب (YouTube URL)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.SOCIAL_YOUTUBE] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.SOCIAL_YOUTUBE, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                  dir="ltr"
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">لينكد إن (LinkedIn URL)</label>
                <input
                  type="text"
                  value={formData[SETTINGS_KEYS.SOCIAL_LINKEDIN] || ""}
                  onChange={(e) => handleChange(SETTINGS_KEYS.SOCIAL_LINKEDIN, e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-left font-sans"
                  dir="ltr"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
