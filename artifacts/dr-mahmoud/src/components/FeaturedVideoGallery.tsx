import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Sparkles,
  BookOpen,
  Terminal,
  Cpu,
  CheckCircle2,
  Clock,
  ArrowLeft,
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  MonitorPlay,
  Layers,
  ShieldCheck,
  GraduationCap,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GalleryVideo {
  id: number | string;
  title: string;
  subtitle?: string;
  category: "baccalaureate" | "cpp" | "ai" | "problem_solving";
  categoryLabel: string;
  stage: string;
  durationText: string;
  thumbnailUrl: string;
  videoUrl: string; // Direct stream or YouTube link
  isVideoFile?: boolean;
  badge?: string;
  description: string;
  outcomes: string[];
  whatsAppText: string;
  platformVideoId?: number;
}

// Default curated showcase based directly on real platform lessons
const PLATFORM_SHOWCASE_VIDEOS: GalleryVideo[] = [
  {
    id: 10,
    platformVideoId: 10,
    title: "2. مقدمة فى السى بلس بلس",
    subtitle: "تأسيس التفكير البرمجي وهيكل لغة C++ من الصفر",
    category: "cpp",
    categoryLabel: "تأسيس C++ والبرمجة",
    stage: "البكالوريا · أولى وتانية ثانوي وحاسبات",
    durationText: "15 دقيقة",
    thumbnailUrl: "/uploads/1784750571407-339603285.png",
    videoUrl: "/preview/cpp-intro.mp4",
    isVideoFile: true,
    badge: "درس تجريبي مميز 🔥",
    description:
      "شرح عملي ومبسط لهيكلية برنامج C++، مكتبة iostream، ودالة main، وكيف تحول تفكيرك إلى كود سليم يعمل على الشاشة.",
    outcomes: [
      "فهم هيكل برنامج C++ ودالة main",
      "طباعة النصوص وتتبع المخرجات في الكونسول",
      "التفكير الخوارزمي المنظم وتجنب الأخطاء الشائعة",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت درس (2. مقدمة فى السى بلس بلس) على المنصة وأرغب في الاشتراك في الكورس الكامل.",
  },
  {
    id: 14,
    platformVideoId: 14,
    title: "الدرس الخامس : If statement & switch Case",
    subtitle: "إتقان اتخاذ القرارات والشروط المنطقية في C++",
    category: "cpp",
    categoryLabel: "تأسيس C++ والبرمجة",
    stage: "البكالوريا · أولى ثانوي",
    durationText: "24 دقيقة",
    thumbnailUrl: "/uploads/1785013028267-638529034.png",
    videoUrl: "/api/videos/14/stream",
    isVideoFile: true,
    badge: "قرارات وشروط ⚡",
    description:
      "في C++ لازم تعرف إمتى تستخدم if علشان تفحص شرط وتحدد هتعمل إيه، وإمتى تستخدم switch case علشان تختار من بين كذا حالة بشكل أوضح وأسهل.",
    outcomes: [
      "الفرق الجوهري بين if و switch case وكيفية الاختيار بينهما",
      "كتابة شروط مركبة ومنطقية نظيفة باستخدام && و ||",
      "تطبيق عملي على أمثلة حياتية تحاكي مشروعات حقيقية",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت درس (If statement & switch Case) على المنصة وأريد الانضمام للمجموعة.",
  },
  {
    id: 24,
    platformVideoId: 24,
    title: "الوحدة الاولى - الدرس الثانى : كيف يعمل الذكاء الاصطناعى",
    subtitle: "منهج البكالوريا الحديث • وحدة الذكاء الاصطناعي والتكنولوجيا",
    category: "baccalaureate",
    categoryLabel: "منهج البكالوريا",
    stage: "تانية ثانوي · مدارس عربي",
    durationText: "18 دقيقة",
    thumbnailUrl: "/uploads/1787603904418-5578210.png",
    videoUrl: "/api/videos/24/stream",
    isVideoFile: true,
    badge: "منهج البكالوريا 🤖",
    description:
      "شرح تفصيلي لمبدأ عمل نماذج التعلم الآلي والشبكات العصبية، والفرق الجوهري بين البرمجة الكلاسيكية ومنظومات الـ AI الحديثة.",
    outcomes: [
      "كيف تتدرب الآلة على البيانات وتتنبأ بالنتائج",
      "أبرز مصطلحات الذكاء الاصطناعي في كتاب الوزارة",
      "حل أسئلة وتطبيقات عملية متوافقة مع نظام الامتحان الجديد",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت درس (كيف يعمل الذكاء الاصطناعي) لمنهج تانية ثانوي بكالوريا وأرغب في الاشتراك.",
  },
  {
    id: 25,
    platformVideoId: 25,
    title: "Lesson 1-2 : HOW AI WORKS",
    subtitle: "Egyptian Baccalaureate Computer Science (Languages)",
    category: "baccalaureate",
    categoryLabel: "منهج البكالوريا (لغات)",
    stage: "2nd Secondary · Languages",
    durationText: "20 دقيقة",
    thumbnailUrl: "/uploads/1787847821525-651479513.png",
    videoUrl: "/api/videos/25/stream",
    isVideoFile: true,
    badge: "Baccalaureate AI 🌐",
    description:
      "Comprehensive breakdown of Artificial Intelligence mechanisms, machine learning models, and training data concepts designed for Baccalaureate Languages students.",
    outcomes: [
      "Machine learning vs Traditional Programming",
      "Neural networks architecture and data pipelines",
      "Official curriculum examination review questions",
    ],
    whatsAppText: "Hello Dr. Mahmoud, I watched Lesson 1-2 (HOW AI WORKS) on the platform and want to join the Baccalaureate course.",
  },
  {
    id: 29,
    platformVideoId: 29,
    title: "الوحدة الاولى : الدرس الاول : تطور تكنولوجيا المعلومات والتحول الاجتماعى",
    subtitle: "الوحدة الأولى بالمنهج الجديد • بناء الوعي التكنولوجي الشامل",
    category: "baccalaureate",
    categoryLabel: "منهج البكالوريا",
    stage: "تانية ثانوي · بكالوريا",
    durationText: "19 دقيقة",
    thumbnailUrl: "/uploads/1788289353021-928131730.png",
    videoUrl: "/api/videos/29/stream",
    isVideoFile: true,
    badge: "تكنولوجيا المعلومات 📘",
    description:
      "استعراض تاريخ وتطور الحاسبات وشبكات المعلومات وأثر التحول الرقمي على المجتمع وسوق العمل الحديث.",
    outcomes: [
      "محطات تطور تكنولوجيا المعلومات والاتصالات",
      "مفاهيم التحول الرقمي ومجتمع المعرفة",
      "تجهيز الطالب لأسئلة الفهم والتحليل في الامتحانات",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت درس (تطور تكنولوجيا المعلومات) على المنصة وأود الاشتراك في المنهج.",
  },
  {
    id: 35,
    platformVideoId: 35,
    title: "الوحدة الثانية : الدرس الاول : التشفير والمصادقة",
    subtitle: "الأمن السيبراني وحماية البيانات والشبكات الرقمية",
    category: "ai",
    categoryLabel: "الأمن السيبراني والشبكات",
    stage: "تانية ثانوي · بكالوريا",
    durationText: "17 دقيقة",
    thumbnailUrl: "/uploads/1789245183216-246813183.png",
    videoUrl: "/api/videos/35/stream",
    isVideoFile: true,
    badge: "أمن سيبراني 🛡️",
    description:
      "المفاهيم الأساسية للتشفير المتماثل وغير المتماثل، وطرق المصادقة الثنائية وتأمين كلمات المرور والاتصالات ضد الاختراق.",
    outcomes: [
      "أنواع التشفير Symmetric & Asymmetric Encryption",
      "بروتوكولات المصادقة والشهادات الرقمية SSL/TLS",
      "حماية البيانات الحساسة وتأمين حسابات المستخدمين",
    ],
    whatsAppText: "السلام عليكم د. محمود، مهتم بمحاضرة (التشفير والمصادقة) والأمن السيبراني وأرغب في الاشتراك.",
  },
  {
    id: 15,
    platformVideoId: 15,
    title: "6 قاعدة while وتطبيقات عليها",
    subtitle: "التحكم في التكرار ومعالجة البيانات البرمجية بدقة",
    category: "cpp",
    categoryLabel: "تأسيس C++ والبرمجة",
    stage: "أولى وتانية ثانوي وحاسبات",
    durationText: "22 دقيقة",
    thumbnailUrl: "/uploads/1785400322174-726575300.png",
    videoUrl: "/api/videos/15/stream",
    isVideoFile: true,
    badge: "حلقات التكرار 🔁",
    description:
      "شرح وافٍ لقاعدة while وكيفية صياغة شروط التوقف وتفادي الحلقات اللانهائية (Infinite Loops) مع تطبيقات عملية.",
    outcomes: [
      "فهم دوران الحلقات وتحديث العداد Counters",
      "تنفيذ برامج تكرار العمليات الحسابية والتحقق",
      "تدريب مكثف على تتبع الكود خطوة بخطوة",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت درس (قاعدة while) وأريد الاشتراك في كورس البرمجة التأسيسي.",
  },
  {
    id: 21,
    platformVideoId: 21,
    title: "المصفوفات : arrays in c++",
    subtitle: "هيكلية تخزين البيانات في الذاكرة RAM وكيفية معالجتها",
    category: "cpp",
    categoryLabel: "تأسيس C++ والبرمجة",
    stage: "البكالوريا وحاسبات ومعلومات",
    durationText: "26 دقيقة",
    thumbnailUrl: "/uploads/1787159059822-809753404.png",
    videoUrl: "/api/videos/21/stream",
    isVideoFile: true,
    badge: "هياكل البيانات 🧠",
    description:
      "توضيح عملي لكيفية حجز المصفوفات في الذاكرة واستخدام الفهرسة (Index) وحلقات For لمعالجة عناصر المصفوفة والبحث فيها.",
    outcomes: [
      "مفهوم الـ Memory Allocation للمصفوفات",
      "القراءة والكتابة في عناصر المصفوفة بواسطة الحلقات",
      "خوارزميات البحث والحسابات الإحصائية على المصفوفة",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت درس (المصفوفات في C++) على المنصة وأود الاشتراك في الكورس.",
  },
  {
    id: 37,
    platformVideoId: 37,
    title: "الوحدة الثانية : الدرس الثالث (الاستجابة للحوادث وادارة المخاطر)",
    subtitle: "الأمن السيبراني والتعامل مع التهديدات الرقمية",
    category: "ai",
    categoryLabel: "الأمن السيبراني والشبكات",
    stage: "تانية ثانوي · بكالوريا",
    durationText: "19 دقيقة",
    thumbnailUrl: "/uploads/1790021706861-783874110.png",
    videoUrl: "/api/videos/37/stream",
    isVideoFile: true,
    badge: "إدارة المخاطر ⚠️",
    description:
      "كيف تتعامل المؤسسات مع حوادث الاختراق الرقمي، وإجراءات خطة الاستجابة السريعة (Incident Response) لتقليل الخسائر.",
    outcomes: [
      "مراحل خطة الاستجابة للحوادث السيبرانية",
      "تقييم المخاطر وإجراءات التعافي والنسخ الاحتياطي",
      "حل تدريبات ونماذج أسئلة امتحان الوزارة",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت درس (الاستجابة للحوادث وإدارة المخاطر) وأرغب في الاشتراك في المنهج.",
  },
  {
    id: 16,
    platformVideoId: 16,
    title: "التحويلات العددية Number systems",
    subtitle: "كورس التصميم المنطقي ومعمارية الحاسب لطلاب الجامعات",
    category: "problem_solving",
    categoryLabel: "حاسبات وتصميم منطقي",
    stage: "جامعات وحاسبات ومعلومات",
    durationText: "25 دقيقة",
    thumbnailUrl: "/uploads/1785705553826-528523815.png",
    videoUrl: "/api/videos/16/stream",
    isVideoFile: true,
    badge: "حاسبات وجامعات 🎓",
    description:
      "شرح رياضي ومنطقي ممتع لطرق التحويل بين الأنظمة العددية (الثنائي Binary، العشري Decimal، والـ Hexadecimal).",
    outcomes: [
      "التحويل السريع بين الأنظمة العددية الأربعة",
      "تمثيل البيانات والحروف داخل ذاكرة الحاسب",
      "تأسيس لمادة الـ Logic Design وهندسة الدوائر",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت درس (التحويلات العددية) لحاسبات ومعلومات وأود الاشتراك في كورس Logic Design.",
  },
  {
    id: 19,
    platformVideoId: 19,
    title: "الدرس الاول : يعنى ايه OOP ومثال عملى (مهم جدا)",
    subtitle: "البرمجة كائنية التوجه • الانتقال من المبتدئ إلى المحترف",
    category: "problem_solving",
    categoryLabel: "برمجة متقدمة و OOP",
    stage: "حاسبات وهندسة والجامعات",
    durationText: "28 دقيقة",
    thumbnailUrl: "/uploads/1785761959103-976060289.png",
    videoUrl: "/api/videos/19/stream",
    isVideoFile: true,
    badge: "OOP متقدم 🚀",
    description:
      "شرح مفهوم البرمجة كائنية التوجه (OOP)، ولماذا ظهرت كبديل للبرمجة الإجرائية، مع مثال عملي متكامل يوضح الـ Classes والـ Objects.",
    outcomes: [
      "فهم كينونة الـ Class والـ Object في الذاكرة",
      "مبدأ تغليف البيانات Encapsulation وتنسيق الكود",
      "بناء أول كائن برمجي تطبيقي واقعي",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت درس (يعنى ايه OOP) على المنصة وأرغب في الاشتراك في كورس الـ OOP.",
  },
  {
    id: 28,
    platformVideoId: 28,
    title: "الدرس الرابع : القضايا الاخلاقية المتعلقة بالذكاء الاصطناعى",
    subtitle: "الأبعاد الاجتماعية والأخلاقية لتطبيقات الذكاء الاصطناعي",
    category: "ai",
    categoryLabel: "الذكاء الاصطناعي",
    stage: "تانية ثانوي · بكالوريا",
    durationText: "16 دقيقة",
    thumbnailUrl: "/uploads/1788207198340-709967078.png",
    videoUrl: "/api/videos/28/stream",
    isVideoFile: true,
    badge: "أخلاقيات الـ AI ⚖️",
    description:
      "مناقشة قضايا التحيز في الخوارزميات، الخصوصية، حقوق الملكية الفكرية، ومستقبل الوظائف في ظل ثورة الـ AI التوليدي.",
    outcomes: [
      "مفاهيم العدالة والشفافية في خوارزميات الـ AI",
      "قوانين حماية الخصوصية ومسؤولية استخدام الأدوات الذكية",
      "حل أسئلة التفكير النقدي المطابقة للامتحان الوزاري",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت درس (القضايا الأخلاقية للذكاء الاصطناعي) على المنصة وأود الاشتراك في المنهج.",
  },
];

type CategoryFilter = "all" | "baccalaureate" | "cpp" | "ai" | "problem_solving";

export function FeaturedVideoGallery() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [videos, setVideos] = useState<GalleryVideo[]>(PLATFORM_SHOWCASE_VIDEOS);
  const [selectedVideo, setSelectedVideo] = useState<GalleryVideo | null>(null);

  // Dynamically load latest platform featured videos from backend
  useEffect(() => {
    let isMounted = true;
    fetch("/api/videos/featured")
      .then((res) => (res.ok ? res.json() : null))
      .then((serverVideos) => {
        if (!isMounted || !Array.isArray(serverVideos) || serverVideos.length === 0) return;

        // Map server video records to gallery format while merging metadata
        const mapped: GalleryVideo[] = serverVideos.map((sv: any) => {
          // Check if we have pre-configured enriched outcomes
          const preset = PLATFORM_SHOWCASE_VIDEOS.find((p) => p.platformVideoId === sv.id);

          let cat: CategoryFilter = "all";
          const catStr = (sv.category || "").toLowerCase();
          const stageStr = (sv.stage || "").toLowerCase();

          if (catStr.includes("c++") || catStr.includes("برمج") || catStr.includes("cpp")) {
            cat = "cpp";
          } else if (catStr.includes("بكالوريا") || stageStr.includes("بكالوريا") || catStr.includes("sec")) {
            if (catStr.includes("ذكاء") || catStr.includes("ai") || catStr.includes("تشفير") || catStr.includes("أمن") || catStr.includes("crypto") || catStr.includes("network")) {
              cat = "ai";
            } else {
              cat = "baccalaureate";
            }
          } else if (catStr.includes("logic") || catStr.includes("oop") || catStr.includes("تصميم") || catStr.includes("جامع")) {
            cat = "problem_solving";
          } else {
            cat = "baccalaureate";
          }

          return {
            id: sv.id,
            platformVideoId: sv.id,
            title: sv.title,
            subtitle: preset?.subtitle || sv.subject || `درس تطبيقي من ${sv.category}`,
            category: preset?.category || cat,
            categoryLabel: preset?.categoryLabel || sv.category,
            stage: sv.stage || preset?.stage || "جميع المراحل",
            durationText: sv.durationText || preset?.durationText || "15 دقيقة",
            thumbnailUrl: sv.thumbnailUrl || preset?.thumbnailUrl || "/dr-mahmoud-hero-classroom.webp",
            videoUrl: sv.videoUrl || preset?.videoUrl || `/preview/cpp-intro.mp4`,
            isVideoFile: sv.isVideoFile ?? true,
            badge: preset?.badge || (sv.category.includes("C++") ? "تأسيس برمجة 🔥" : "منهج المنصة 📘"),
            description: sv.description || preset?.description || `محاضرة تفاعلية من منصة د. محمود المهدي في ${sv.category}.`,
            outcomes: preset?.outcomes || [
              `فهم المفاهيم الأساسية لوحدة ${sv.category}`,
              "تطبيق عملي خطوة بخطوة على الشاشة",
              "حل تدريبات ونماذج أسئلة المنصة التفاعلية",
            ],
            whatsAppText:
              preset?.whatsAppText ||
              `السلام عليكم د. محمود، شاهدت درس (${sv.title}) على المنصة وأرغب في الاشتراك في الكورس.`,
          };
        });

        setVideos(mapped);
      })
      .catch(() => {
        // Fallback to static platform showcase seamlessly
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories: { id: CategoryFilter; label: string; icon: React.ElementType; count: number }[] = [
    {
      id: "all",
      label: "جميع محاضرات المنصة",
      icon: Layers,
      count: videos.length,
    },
    {
      id: "baccalaureate",
      label: "منهج البكالوريا (عربي ولغات)",
      icon: BookOpen,
      count: videos.filter((v) => v.category === "baccalaureate").length,
    },
    {
      id: "cpp",
      label: "تأسيس C++ والبرمجة",
      icon: Terminal,
      count: videos.filter((v) => v.category === "cpp").length,
    },
    {
      id: "ai",
      label: "الذكاء الاصطناعي والأمن السيبراني",
      icon: Cpu,
      count: videos.filter((v) => v.category === "ai").length,
    },
    {
      id: "problem_solving",
      label: "حاسبات وتصميم منطقي و OOP",
      icon: GraduationCap,
      count: videos.filter((v) => v.category === "problem_solving").length,
    },
  ];

  const filteredVideos =
    activeCategory === "all"
      ? videos
      : videos.filter((video) => video.category === activeCategory);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedVideo(null);
    };
    if (selectedVideo) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [selectedVideo]);

  const handleNextVideo = () => {
    if (!selectedVideo) return;
    const currentIndex = filteredVideos.findIndex((v) => v.id === selectedVideo.id);
    const nextIndex = (currentIndex + 1) % filteredVideos.length;
    setSelectedVideo(filteredVideos[nextIndex]);
  };

  const handlePrevVideo = () => {
    if (!selectedVideo) return;
    const currentIndex = filteredVideos.findIndex((v) => v.id === selectedVideo.id);
    const prevIndex = (currentIndex - 1 + filteredVideos.length) % filteredVideos.length;
    setSelectedVideo(filteredVideos[prevIndex]);
  };

  return (
    <section
      id="video-gallery"
      aria-labelledby="video-gallery-heading"
      className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 py-16 text-white md:py-24 border-b border-slate-800"
    >
      {/* Background Ambience Glows */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-blue-600/15 blur-[140px]" />
        <div className="absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-indigo-600/15 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-[600px] rounded-full bg-sky-500/10 blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <header className="mx-auto max-w-3xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-300 shadow-sm backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-sky-400" />
            <span>فيديوهات حقيقية من داخل المنصة • شاهد طريقة الشرح والتطبيق</span>
          </div>

          <h2
            id="video-gallery-heading"
            className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight"
          >
            نماذج حية من محاضرات{" "}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              منصة د. محمود المهدي
            </span>
          </h2>

          <p className="text-sm sm:text-base font-semibold leading-relaxed text-slate-300 max-w-2xl mx-auto">
            جميع الفيديوهات المعروضة هي محاضرات حقيقية من داخل منصة الطلاب لمناهج البكالوريا، تأسيس لغة C++، الذكاء الاصطناعي، ومواد حاسبات ومعلومات.
          </p>
        </header>

        {/* Category Filter Tabs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/50"
                    : "bg-slate-850/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                />
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Video Cards Grid */}
        <motion.div
          layout
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence>
            {filteredVideos.map((video) => (
              <motion.article
                key={video.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-600/15"
              >
                {/* Thumbnail Container */}
                <div
                  onClick={() => setSelectedVideo(video)}
                  className="relative aspect-video w-full cursor-pointer overflow-hidden bg-slate-900 select-none"
                >
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to high quality classroom poster if custom upload preview is unavailable
                      (e.currentTarget as HTMLImageElement).src = "/dr-mahmoud-hero-classroom.webp";
                    }}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Dark Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                    {video.badge && (
                      <span className="rounded-lg bg-blue-600/90 px-2.5 py-1 text-[11px] font-black text-white shadow-md backdrop-blur-sm">
                        {video.badge}
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-semibold text-slate-200 backdrop-blur-sm mr-auto">
                      <Clock className="h-3 w-3 text-sky-400" />
                      {video.durationText}
                    </span>
                  </div>

                  {/* Pulsing Glowing Play Button */}
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-xl shadow-blue-600/50 transition-all duration-300 group-hover:scale-115 group-hover:bg-blue-500">
                      <span className="absolute -inset-1 rounded-full bg-blue-400/30 animate-ping opacity-75" />
                      <Play className="h-6 w-6 fill-current text-white translate-x-0.5" />
                    </div>
                  </div>

                  {/* Stage Pill */}
                  <div className="absolute bottom-2.5 right-3">
                    <span className="inline-block rounded-md bg-slate-900/90 border border-slate-700/60 px-2.5 py-0.5 text-[11px] font-bold text-sky-300 backdrop-blur-sm">
                      {video.stage}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between p-5 text-right space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-blue-400">
                      <span>{video.categoryLabel}</span>
                      <span className="text-[11px] font-semibold text-slate-400">درس بالمنصة #{video.id}</span>
                    </div>

                    <h3 className="text-base font-black text-white leading-snug group-hover:text-blue-300 transition-colors line-clamp-2">
                      {video.title}
                    </h3>

                    <p className="text-xs font-semibold leading-relaxed text-slate-400 line-clamp-2">
                      {video.description}
                    </p>
                  </div>

                  {/* Outcomes pills */}
                  <div className="space-y-1.5 border-t border-slate-850 pt-3">
                    {video.outcomes.slice(0, 2).map((outcome, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-1.5 text-[11px] font-semibold text-slate-300"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{outcome}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons: Preview & Direct Platform Access */}
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={() => setSelectedVideo(video)}
                      className="h-10 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>معاينة الدرس</span>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="h-10 rounded-xl border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      <a href={`/platform?video=${video.id}`} title="فتح الدرس في منصة الطالب">
                        <MonitorPlay className="h-3.5 w-3.5 text-sky-400" />
                        <span>على المنصة</span>
                      </a>
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Bottom Banner with Direct Platform Access */}
        <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 md:p-8 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 text-right">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <Laptop className="h-4 w-4" />
                <span>جميع هذه الدروس وأكثر متاحة بالكامل للطلاب المشتركين</span>
              </div>
              <h3 className="text-xl font-black text-white sm:text-2xl">
                ادخل منصة الأكاديمية وجرّب الاختبارات التفاعلية وبنك الأسئلة الآن
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-400 leading-relaxed">
                كل درس على المنصة مصحوب بملخصات PDF، اختبار تفاعلي فوري، وتصحيح تلقائي مع تقرير مباشر لولي الأمر لمتابعة الدرجات والتقدم.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                asChild
                className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-white px-6 shadow-lg shadow-emerald-600/20"
              >
                <a
                  href="https://wa.me/201066711545?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20%D8%AF.%20%D9%85%D8%AD%D9%85%D9%88%D8%AF%D8%8C%20%D8%B4%D8%A7%D9%87%D8%AF%D8%AA%20%D9%85%D8%AD%D8%A7%D8%B6%D8%B1%D8%A7%D8%AA%20%D8%A7%D9%84%D9%85%D9%86%D8%B5%D8%A9%20%D9%88%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2"
                >
                  <span>اشترك عبر واتساب</span>
                  <ArrowLeft className="h-4 w-4" />
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-12 rounded-xl border-slate-700 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5"
              >
                <a href="/platform" className="flex items-center gap-2">
                  <MonitorPlay className="h-4 w-4 text-blue-400" />
                  <span>دخول منصة الطلاب</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── INTERACTIVE MODAL VIDEO PLAYER ─── */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVideo(null)}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            {/* Modal Dialog Content */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-video-title"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-blue-600/20 my-auto text-right"
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between border-b border-slate-850 bg-slate-900/80 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-600/20 border border-blue-500/30 px-2.5 py-0.5 text-xs font-bold text-blue-300">
                    {selectedVideo.stage}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                    {selectedVideo.categoryLabel}
                  </span>
                  <span className="text-xs text-sky-400/80 font-bold hidden md:inline">
                    • درس رقم #{selectedVideo.id} بالمنصة
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevVideo}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="الفيديو السابق"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextVideo}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="الفيديو التالي"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVideo(null)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors mr-2"
                    title="إغلاق النافذة"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Video Player Display */}
              <div className="relative aspect-video w-full bg-black">
                {selectedVideo.isVideoFile ? (
                  <video
                    key={selectedVideo.videoUrl}
                    src={selectedVideo.videoUrl}
                    controls
                    autoPlay
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    className="h-full w-full object-contain select-none"
                    poster={selectedVideo.thumbnailUrl}
                  >
                    متصفحك لا يدعم تشغيل الفيديو المباشر.
                  </video>
                ) : (
                  <iframe
                    key={selectedVideo.videoUrl}
                    src={getEmbedUrl(selectedVideo.videoUrl)}
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                )}
              </div>

              {/* Modal Body & Action Area */}
              <div className="p-5 sm:p-7 space-y-5 bg-gradient-to-b from-slate-950 to-slate-900">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                    <span>محاضرة من داخل منصة أكاديمية د. محمود المهدي</span>
                  </div>
                  <h3
                    id="modal-video-title"
                    className="text-lg sm:text-2xl font-black text-white leading-tight"
                  >
                    {selectedVideo.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-400 leading-relaxed">
                    {selectedVideo.description}
                  </p>
                </div>

                {/* What you learn in this lecture */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-2.5">
                  <span className="block text-xs font-bold text-sky-400">
                    أهداف ومخرجات التعلم في هذه المحاضرة:
                  </span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {selectedVideo.outcomes.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs font-semibold text-slate-300"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
                  <div className="text-right w-full sm:w-auto">
                    <span className="block text-xs font-bold text-slate-400">
                      هل ترغب في حضور باقي محاضرات الكورس وحل الاختبارات؟
                    </span>
                    <strong className="block text-sm font-black text-white">
                      تواصل مباشرة مع د. محمود المهدي عبر واتساب
                    </strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <Button
                      asChild
                      className="flex-1 sm:flex-none h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-white px-5 shadow-lg shadow-emerald-600/25"
                    >
                      <a
                        href={`https://wa.me/201066711545?text=${encodeURIComponent(
                          selectedVideo.whatsAppText
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        <span>اشترك في الكورس عبر واتساب</span>
                        <ArrowLeft className="h-4 w-4" />
                      </a>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 sm:flex-none h-11 rounded-xl border-slate-700 bg-slate-850 hover:bg-slate-800 text-white font-bold px-4"
                    >
                      <a
                        href={`/platform?video=${selectedVideo.id}`}
                        className="flex items-center justify-center gap-2"
                      >
                        <span>فتح الدرس بالمنصة</span>
                        <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

function getEmbedUrl(url: string): string {
  try {
    if (url.includes("playlist?list=")) {
      const listId = url.split("list=")[1]?.split("&")[0];
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&autoplay=1&rel=0&modestbranding=1`;
    }
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    if (match && match[1]) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0&modestbranding=1`;
    }
  } catch {
    // fallback
  }
  return url;
}
