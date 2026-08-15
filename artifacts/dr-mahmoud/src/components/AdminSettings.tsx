import React, { useState, useEffect } from "react";
import { useSiteSettings, useUpdateSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";
import { Loader2, Save, CheckCircle2, UploadCloud, Plus, Trash2, ArrowUp, ArrowDown, HelpCircle, X, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GeneralTab } from "./admin/settings/GeneralTab";
import { HeroTab } from "./admin/settings/HeroTab";
import { AboutTab } from "./admin/settings/AboutTab";
import { ServicesTab } from "./admin/settings/ServicesTab";
import { PricingTab } from "./admin/settings/PricingTab";
import { TestimonialsTab } from "./admin/settings/TestimonialsTab";
import { FaqTab } from "./admin/settings/FaqTab";
import { PortfolioTab } from "./admin/settings/PortfolioTab";
import { EduverseTab } from "./admin/settings/EduverseTab";
import { WhyChooseMeTab } from "./admin/settings/WhyChooseMeTab";
import { ContactSocialTab } from "./admin/settings/ContactSocialTab";
import { AuditLogsTab } from "./admin/settings/AuditLogsTab";
import { AdminAccountsTab } from "./admin/settings/AdminAccountsTab";
import { CentersTab, defaultOfflineCenters, type OfflineCenterItem } from "./admin/settings/CentersTab";

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
    a: "يمكنك التواصل مباشرة على واتساب 01066711545 لحجز أول سيشن مجانًا. الموقع في Eduverse، فلل الجامعة، الزقازيق."
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

export function AdminSettings({ role = "superadmin" }: { role?: "superadmin" | "subadmin" }) {
  const { toast } = useToast();
  const { settings, isLoading } = useSiteSettings();
  const updateSettingsMutation = useUpdateSiteSettings();

  const [activeTab, setActiveTab] = useState<
    "general" | "offline-centers" | "hero" | "about" | "services" | "pricing" | "testimonials" | "faq" | "contact" | "social" | "portfolio" | "eduverse" | "why-choose-me" | "audit-logs" | "admin-accounts"
  >("general");

  const [auditLogs, setAuditLogs] = useState<Array<{
    id: number;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string | null;
    details: string | null;
    ipAddress: string | null;
    createdAt: string;
  }>>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<{
    id: number;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string | null;
    details: string | null;
    ipAddress: string | null;
    createdAt: string;
  } | null>(null);

  const [superAdminPass, setSuperAdminPass] = useState("");
  const [subAdminPass, setSubAdminPass] = useState("");
  const [showSuperAdminPass, setShowSuperAdminPass] = useState(false);
  const [showSubAdminPass, setShowSubAdminPass] = useState(false);
  const [lastUpdatedInfo, setLastUpdatedInfo] = useState<{ pass?: string; subPass?: string; time: string } | null>(null);
  const [isUpdatingPasswords, setIsUpdatingPasswords] = useState(false);

  // Subadmin accounts management state
  const [subAdminAccounts, setSubAdminAccounts] = useState<Array<{ id: number; username: string; displayName: string; isActive: boolean; createdAt: string }>>([]);
  const [loadingSubAdminAccounts, setLoadingSubAdminAccounts] = useState(false);
  const [showSubAdminModal, setShowSubAdminModal] = useState(false);
  const [newSubAdminUsername, setNewSubAdminUsername] = useState("");
  const [newSubAdminDisplayName, setNewSubAdminDisplayName] = useState("");
  const [newSubAdminPassword, setNewSubAdminPassword] = useState("");
  const [isCreatingSubAdmin, setIsCreatingSubAdmin] = useState(false);

  const fetchSubAdminAccounts = async () => {
    setLoadingSubAdminAccounts(true);
    try {
      const res = await fetch("/api/admin/subadmins", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSubAdminAccounts(data);
      }
    } catch {
      //
    } finally {
      setLoadingSubAdminAccounts(false);
    }
  };

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // List states
  const [services, setServices] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [faq, setFaq] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [offlineCenters, setOfflineCenters] = useState<OfflineCenterItem[]>([]);

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

      try {
        const val = settings[SETTINGS_KEYS.OFFLINE_CENTERS_LIST]?.value;
        setOfflineCenters(val ? JSON.parse(val) : defaultOfflineCenters);
      } catch {
        setOfflineCenters(defaultOfflineCenters);
      }
    }
  }, [settings]);

  const fetchAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const res = await fetch("/api/admin/audit-logs", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch {
      toast({ title: "خطأ", description: "فشل تحميل سجل العمليات", variant: "destructive" });
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "audit-logs") {
      fetchAuditLogs();
    }
    if (activeTab === "admin-accounts" && role === "superadmin") {
      fetchSubAdminAccounts();
    }
  }, [activeTab, role]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminPass && !subAdminPass) return;
    setIsUpdatingPasswords(true);
    try {
      const res = await fetch("/api/admin/change-passwords", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          superAdminPassword: superAdminPass || undefined,
          subAdminPassword: subAdminPass !== undefined && subAdminPass !== "" ? subAdminPass : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تحديث كلمات المرور");
      
      setLastUpdatedInfo({
        ...(superAdminPass ? { pass: superAdminPass } : {}),
        ...(subAdminPass ? { subPass: subAdminPass } : {}),
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });

      toast({ variant: "success", title: "تم حفظ وتثبيت كلمة المرور في قاعدة البيانات 🔐", description: data.message });
      setSuperAdminPass("");
      setSubAdminPass("");
    } catch (err: any) {
      toast({ title: "خطأ في التحديث", description: err.message, variant: "destructive" });
    } finally {
      setIsUpdatingPasswords(false);
    }
  };

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
      { key: SETTINGS_KEYS.OFFLINE_CENTERS_LIST, value: JSON.stringify(offlineCenters) },
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
    toast({ variant: "success", title: "تم", description: "تم حذف العنصر بنجاح" });
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
    { id: "offline-centers", label: "📍 السناتر والمواعيد (الزقازيق)" },
    { id: "audit-logs", label: "سجل العمليات (Audit Logs)" },
    { id: "admin-accounts", label: "إدارة الحسابات والكلمات" },
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
        
        {activeTab === "general" && (
          <GeneralTab
            formData={formData}
            handleChange={handleChange}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
          />
        )}

        {activeTab === "offline-centers" && (
          <CentersTab
            centers={offlineCenters}
            setCenters={setOfflineCenters}
            onSave={() => handleSubmit()}
          />
        )}

        {activeTab === "hero" && (
          <HeroTab
            formData={formData}
            handleChange={handleChange}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
          />
        )}

        {activeTab === "about" && (
          <AboutTab
            formData={formData}
            handleChange={handleChange}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
          />
        )}

        {activeTab === "services" && (
          <ServicesTab
            services={services}
            setServices={setServices}
            selServiceIdx={selServiceIdx}
            setSelServiceIdx={setSelServiceIdx}
            moveItem={moveItem}
            deleteItem={deleteItem}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
            setIsSaved={setIsSaved}
          />
        )}

        {activeTab === "pricing" && (
          <PricingTab
            pricing={pricing}
            setPricing={setPricing}
            selPlanIdx={selPlanIdx}
            setSelPlanIdx={setSelPlanIdx}
            moveItem={moveItem}
            deleteItem={deleteItem}
            setIsSaved={setIsSaved}
          />
        )}

        {activeTab === "testimonials" && (
          <TestimonialsTab
            testimonials={testimonials}
            setTestimonials={setTestimonials}
            selTestimonialIdx={selTestimonialIdx}
            setSelTestimonialIdx={setSelTestimonialIdx}
            moveItem={moveItem}
            deleteItem={deleteItem}
            formData={formData}
            handleChange={handleChange}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
            setIsSaved={setIsSaved}
          />
        )}

        {activeTab === "faq" && (
          <FaqTab
            faq={faq}
            setFaq={setFaq}
            selFaqIdx={selFaqIdx}
            setSelFaqIdx={setSelFaqIdx}
            moveItem={moveItem}
            deleteItem={deleteItem}
            setIsSaved={setIsSaved}
          />
        )}

        {activeTab === "portfolio" && (
          <PortfolioTab
            portfolio={portfolio}
            setPortfolio={setPortfolio}
            selPortfolioIdx={selPortfolioIdx}
            setSelPortfolioIdx={setSelPortfolioIdx}
            moveItem={moveItem}
            deleteItem={deleteItem}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
            setIsSaved={setIsSaved}
          />
        )}

        {activeTab === "eduverse" && (
          <EduverseTab
            formData={formData}
            handleChange={handleChange}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
          />
        )}

        {activeTab === "why-choose-me" && (
          <WhyChooseMeTab
            formData={formData}
            handleChange={handleChange}
            handleFileUpload={handleFileUpload}
            isUploading={isUploading}
          />
        )}

        {(activeTab === "contact" || activeTab === "social") && (
          <ContactSocialTab
            activeTab={activeTab}
            formData={formData}
            handleChange={handleChange}
          />
        )}

        {activeTab === "audit-logs" && (
          <AuditLogsTab
            auditLogs={auditLogs}
            loadingAuditLogs={loadingAuditLogs}
            fetchAuditLogs={fetchAuditLogs}
            selectedAuditLog={selectedAuditLog}
            setSelectedAuditLog={setSelectedAuditLog}
          />
        )}

        {activeTab === "admin-accounts" && (
          <AdminAccountsTab
            role={role}
            handlePasswordChange={handlePasswordChange}
            lastUpdatedInfo={lastUpdatedInfo}
            superAdminPass={superAdminPass}
            setSuperAdminPass={setSuperAdminPass}
            showSuperAdminPass={showSuperAdminPass}
            setShowSuperAdminPass={setShowSuperAdminPass}
            subAdminPass={subAdminPass}
            setSubAdminPass={setSubAdminPass}
            showSubAdminPass={showSubAdminPass}
            setShowSubAdminPass={setShowSubAdminPass}
            isUpdatingPasswords={isUpdatingPasswords}
            showSubAdminModal={showSubAdminModal}
            setShowSubAdminModal={setShowSubAdminModal}
            loadingSubAdminAccounts={loadingSubAdminAccounts}
            subAdminAccounts={subAdminAccounts}
            fetchSubAdminAccounts={fetchSubAdminAccounts}
            newSubAdminUsername={newSubAdminUsername}
            setNewSubAdminUsername={setNewSubAdminUsername}
            newSubAdminDisplayName={newSubAdminDisplayName}
            setNewSubAdminDisplayName={setNewSubAdminDisplayName}
            newSubAdminPassword={newSubAdminPassword}
            setNewSubAdminPassword={setNewSubAdminPassword}
            isCreatingSubAdmin={isCreatingSubAdmin}
            setIsCreatingSubAdmin={setIsCreatingSubAdmin}
          />
        )}

      </div>
    </div>
  );
}
