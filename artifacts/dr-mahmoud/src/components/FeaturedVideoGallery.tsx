import React, { useState, useEffect, useId } from "react";
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
  HelpCircle,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GalleryVideo {
  id: string;
  title: string;
  subtitle: string;
  category: "baccalaureate" | "cpp" | "ai" | "problem_solving";
  categoryLabel: string;
  stage: string;
  durationText: string;
  thumbnailUrl: string;
  videoUrl: string; // Direct mp4 or YouTube link
  isVideoFile?: boolean;
  badge?: string;
  description: string;
  outcomes: string[];
  whatsAppText: string;
}

const GALLERY_VIDEOS: GalleryVideo[] = [
  {
    id: "cpp-intro",
    title: "مقدمة في لغة C++ وتأسيس التفكير البرمجي",
    subtitle: "المحاضرة التمهيدية الأولى لطلاب البكالوريا والجامعات",
    category: "cpp",
    categoryLabel: "تأسيس البرمجة و C++",
    stage: "تأسيس عام لجميع المراحل",
    durationText: "15 دقيقة",
    thumbnailUrl: "/dr-mahmoud-hero-classroom.webp",
    videoUrl: "/preview/cpp-intro.mp4",
    isVideoFile: true,
    badge: "الأكثر طلباً 🔥",
    description:
      "شرح عملي ومبسط لهيكلية لغة C++، وكيف تحول التفكير البشري إلى كود برمجي منظم خطوة بخطوة بدون حفظ.",
    outcomes: [
      "فهم هيكلية البرنامج ومكتبة iostream",
      "الفرق بين كتابة الكود والتفكير الخوارزمي",
      "كتابة وتتبع أول كود يعمل بنجاح على الشاشة",
    ],
    whatsAppText: "السلام عليكم د. محمود، شاهدت محاضرة مقدمة C++ وأرغب في الاشتراك في الكورس الكامل.",
  },
  {
    id: "baccalaureate-comp-thinking",
    title: "مدخل التفكير الحاسوبي وهندسة الخوارزميات (أولى ثانوي)",
    subtitle: "الوحدة الأولى من المنهج المصري الحديث للبكالوريا",
    category: "baccalaureate",
    categoryLabel: "منهج البكالوريا",
    stage: "الصف الأول الثانوي",
    durationText: "22 دقيقة",
    thumbnailUrl: "/baccalaureate-1st-sec.png",
    videoUrl: "https://www.youtube.com/watch?v=M-5T8T2p5gQ",
    badge: "منهج البكالوريا 📘",
    description:
      "تفكيك مشكلات المنهج وتحويلها إلى خرائط تدفق Flowcharts وخوارزميات واضحة ومطابقة لمواصفات الامتحان الوزاري.",
    outcomes: [
      "ركائز التفكير الحاسوبي الأربعة وحل المشكلات",
      "رسم وتحليل خرائط التدفق Flowcharts القياسية",
      "نماذج أسئلة الامتحان الجديد وكيفية صياغة الإجابة",
    ],
    whatsAppText: "السلام عليكم د. محمود، أود الاشتراك في برنامج منهج البكالوريا للصف الأول الثانوي.",
  },
  {
    id: "ai-revolution-sec2",
    title: "كيف يفكر الذكاء الاصطناعي؟ مفاهيم وتطبيقات عملية (تانية ثانوي)",
    subtitle: "وحدة الذكاء الاصطناعي وتكنولوجيا المستقبل بالمنهج الجديد",
    category: "ai",
    categoryLabel: "الذكاء الاصطناعي",
    stage: "الصف الثاني الثانوي",
    durationText: "18 دقيقة",
    thumbnailUrl: "/baccalaureate-2nd-sec.png",
    videoUrl: "https://www.youtube.com/playlist?list=PL43pGnjiVwgSxY6b5O_Hmsj-0YhT_a4R3",
    badge: "ذكاء اصطناعي 🤖",
    description:
      "شرح ممتع وشيق يوضح للطالب كيف تتعلم الآلات، والفرق بين البرمجة التقليدية ونماذج الذكاء الاصطناعي التوليدي.",
    outcomes: [
      "مبدأ عمل نماذج التعلم الآلي والشبكات العصبية",
      "الأخلاقيات والاستخدام المسؤول للذكاء الاصطناعي",
      "تطبيقات برمجية عملية باستخدام بايثون والأدوات الحديثة",
    ],
    whatsAppText: "السلام عليكم د. محمود، مهتم بكورس الذكاء الاصطناعي ومنهج تانية ثانوي.",
  },
  {
    id: "cpp-conditions-logic",
    title: "إتقان جمل الشروط والقرارات المنطقية (If-Else & Logic)",
    subtitle: "تطبيق عملي خطوة بخطوة على قرارات البرمجة",
    category: "cpp",
    categoryLabel: "تأسيس البرمجة و C++",
    stage: "أولى وتانية ثانوي + حاسبات",
    durationText: "24 دقيقة",
    thumbnailUrl: "/dr-mahmoud-photo.webp",
    videoUrl: "https://www.youtube.com/playlist?list=PL43pGnjiVwgS6cQW6a-8Hj4_N292f7XwX",
    badge: "أساس برمجي ⚡",
    description:
      "بناء المنطق البرمجي السليم: متى نستخدم if وelse ومتى نلجأ إلى switch، مع تجنب الأخطاء الشائعة للمبتدئين.",
    outcomes: [
      "التعامل مع الشروط المركبة والمعاملات المنطقية && و ||",
      "كتابة كود نظيف سهل القراءة بدون تكرار",
      "تطبيقات عملية على أمثلة حياتية تحاكي مشروعات حقيقية",
    ],
    whatsAppText: "السلام عليكم د. محمود، أرغب في الانضمام لكورس أساسيات C++ المتقدم.",
  },
  {
    id: "exam-essay-solving",
    title: "حل وتحليل الأسئلة المقالية النموذجية في امتحان البرمجة",
    subtitle: "تدريب على صياغة الكود للحصول على الدرجة النهائية",
    category: "problem_solving",
    categoryLabel: "حل المسائل والامتحانات",
    stage: "منهج البكالوريا والثانوية",
    durationText: "20 دقيقة",
    thumbnailUrl: "/cs_first_year.png",
    videoUrl: "https://www.youtube.com/playlist?list=PL43pGnjiVwgTq0Kwt-jP_Gndn1154cQk2",
    badge: "نماذج الامتحانات 🎯",
    description:
      "تحليل دقيق لطريقة تصحيح الأسئلة المقالية والبرمجية بالوزارة، وكيف يكتب الطالب الكود بتنسيق سليم يحصد الدرجة كاملة.",
    outcomes: [
      "تفكيك نصوص الأسئلة الطويلة وتحديد المطلوب بدقة",
      "تجنب الأخطاء البرمجية النحوية والمنطقية الشائعة",
      "صياغة الإجابة النموذجية المعتمدة في نماذج الإجابة",
    ],
    whatsAppText: "السلام عليكم د. محمود، مهتم بمراجعة حل امتحانات البرمجة وبنك الأسئلة المقالية.",
  },
  {
    id: "cpp-loops-arrays",
    title: "حلقات التكرار والمصفوفات Arrays في الذاكرة",
    subtitle: "فهم عميق لكيفية تخزين ومعالجة البيانات المتسلسلة",
    category: "cpp",
    categoryLabel: "تأسيس البرمجة و C++",
    stage: "المرحلة الثانوية وحاسبات",
    durationText: "26 دقيقة",
    thumbnailUrl: "/university-cs-path.webp",
    videoUrl: "https://www.youtube.com/playlist?list=PL43pGnjiVwgS6cQW6a-8Hj4_N292f7XwX",
    badge: "فهم الذاكرة 🧠",
    description:
      "توضيح بصري لطريقة تخزين المصفوفات في الذاكرة RAM واستخدام حلقات For و While للبحث والفرز والتعامل مع البيانات.",
    outcomes: [
      "فهم الفهرسة (Indexing) وحجز أماكن المتغيرات في الذاكرة",
      "تنفيذ خوارزميات البحث وحساب المتوسطات والمجاميع",
      "تمارين تطبيقية وتجهيز الطالب لمادة هياكل البيانات",
    ],
    whatsAppText: "السلام عليكم د. محمود، أريد الاشتراك في كورس البرمجة المتقدم والمصفوفات.",
  },
  {
    id: "cybersecurity-foundations",
    title: "مبادئ الأمن السيبراني والتشفير وحماية البيانات",
    subtitle: "تأمين الشبكات والبرمجيات ضد الثغرات والاختراق",
    category: "ai",
    categoryLabel: "الذكاء الاصطناعي",
    stage: "تكنولوجيا المعلومات والأمن",
    durationText: "17 دقيقة",
    thumbnailUrl: "/dr-mahmoud-hero-classroom.webp",
    videoUrl: "https://www.youtube.com/playlist?list=PL43pGnjiVwgSxY6b5O_Hmsj-0YhT_a4R3",
    badge: "أمن سيبراني 🛡️",
    description:
      "شرح مفهوم التشفير المتماثل وغير المتماثل، وكيفية حماية كلمات المرور والبيانات الحساسة في تطبيقات الويب والشبكات.",
    outcomes: [
      "أساسيات حماية الأنظمة الرقمية وبروتوكولات الأمان",
      "كيف تعمل تقنيات التشفير الحديثة والمصادقة الآمنة",
      "أفضل الممارسات لتأمين حساباتك وتطبيقاتك البرمجية",
    ],
    whatsAppText: "السلام عليكم د. محمود، مهتم بمحاضرات الأمن السيبراني وتكنولوجيا المعلومات.",
  },
  {
    id: "live-platform-test-solving",
    title: "تجربة حية لحل امتحان تفاعلي واكتشاف الأخطاء البرمجية",
    subtitle: "محاكاة كاملة لطريقة الاختبار على منصة الأكاديمية",
    category: "problem_solving",
    categoryLabel: "حل المسائل والامتحانات",
    stage: "جميع المراحل",
    durationText: "19 دقيقة",
    thumbnailUrl: "/cs_second_year.png",
    videoUrl: "https://www.youtube.com/watch?v=M-5T8T2p5gQ",
    badge: "محاكاة واقعية 💻",
    description:
      "شاهد كيف يحل الطالب الاختبار التقييمي، ويحصل على تقرير فوري بنقاط القوة والضعف مع شرح تفصيلي لكل خطأ.",
    outcomes: [
      "التعود على وتيرة وضغط وقت الامتحان",
      "التعامل مع أسئلة تتبع الكود (Tracing) والتصحيح",
      "الاستفادة من التغذية الراجعة الفورية للمنصة",
    ],
    whatsAppText: "السلام عليكم د. محمود، أود معرفة كيفية تفعيل حساب المنصة والامتحانات التفاعلية.",
  },
];

type CategoryFilter = "all" | "baccalaureate" | "cpp" | "ai" | "problem_solving";

export function FeaturedVideoGallery() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [selectedVideo, setSelectedVideo] = useState<GalleryVideo | null>(null);

  const categories: { id: CategoryFilter; label: string; icon: React.ElementType; count: number }[] = [
    {
      id: "all",
      label: "الكل",
      icon: Layers,
      count: GALLERY_VIDEOS.length,
    },
    {
      id: "baccalaureate",
      label: "منهج البكالوريا",
      icon: BookOpen,
      count: GALLERY_VIDEOS.filter((v) => v.category === "baccalaureate").length,
    },
    {
      id: "cpp",
      label: "تأسيس C++ والبرمجة",
      icon: Terminal,
      count: GALLERY_VIDEOS.filter((v) => v.category === "cpp").length,
    },
    {
      id: "ai",
      label: "الذكاء الاصطناعي والتكنولوجيا",
      icon: Cpu,
      count: GALLERY_VIDEOS.filter((v) => v.category === "ai").length,
    },
    {
      id: "problem_solving",
      label: "حل المسائل والامتحانات",
      icon: HelpCircle,
      count: GALLERY_VIDEOS.filter((v) => v.category === "problem_solving").length,
    },
  ];

  const filteredVideos =
    activeCategory === "all"
      ? GALLERY_VIDEOS
      : GALLERY_VIDEOS.filter((video) => video.category === activeCategory);

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
      {/* Dynamic Background Glows */}
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
            <span>معرض المحاضرات والشروحات التفاعلية • جرب طريقة الشرح بنفسك</span>
          </div>

          <h2
            id="video-gallery-heading"
            className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight"
          >
            شاهد نماذج واقعية من محاضرات{" "}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              المنهج والبرمجة والبكالوريا
            </span>
          </h2>

          <p className="text-sm sm:text-base font-semibold leading-relaxed text-slate-300 max-w-2xl mx-auto">
            قبل أن تشترك، تعرّف على أسلوب د. محمود المهدي في التبسيط والربط بين المفاهيم النظرية
            والتطبيق العملي على الشاشة خطوة بخطوة.
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
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
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
                    <span className="inline-block rounded-md bg-slate-900/80 border border-slate-700/60 px-2 py-0.5 text-[11px] font-bold text-sky-300 backdrop-blur-sm">
                      {video.stage}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between p-5 text-right space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                      <span>{video.categoryLabel}</span>
                    </div>

                    <h3 className="text-base font-black text-white leading-snug group-hover:text-blue-300 transition-colors">
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

                  {/* Action Button */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => setSelectedVideo(video)}
                      className="w-full h-10 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>مشاهدة المعاينة الآن</span>
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Bottom Banner & Guarantee Strip */}
        <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 md:p-8 backdrop-blur-sm shadow-xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 text-right">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <Laptop className="h-4 w-4" />
                <span>شاهدت طريقة الشرح وتريد البدء فوراً؟</span>
              </div>
              <h3 className="text-xl font-black text-white sm:text-2xl">
                ابدأ رحلتك البرمجية مع د. محمود المهدي اليوم
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-400 leading-relaxed">
                اشترك في مجموعات البكالوريا أو كورسات C++ وحاسبات ومعلومات واحصل على وصول فوري للمنصة
                وبنك الأسئلة التفاعلي والمتابعة المستمرة.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                asChild
                className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-white px-6 shadow-lg shadow-emerald-600/20"
              >
                <a
                  href="https://wa.me/201066711545?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20%D8%AF.%20%D9%85%D8%AD%D9%85%D9%88%D8%AF%D8%8C%20%D8%B4%D8%A7%D9%87%D8%AF%D8%AA%20%D9%85%D8%B9%D8%B1%D8%B6%20%D8%A7%D9%84%D9%81%D9%8A%D8%AF%D9%8A%D9%88%D9%87%D8%A7%D8%AA%20%D9%88%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83"
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
                  <span>دخول منصة الطالب</span>
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
                    ماذا يتعلم الطالب في هذه المحاضرة؟
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
                      تريد حجز الكورس أو الحصول على المتابعة الدورية؟
                    </span>
                    <strong className="block text-sm font-black text-white">
                      تواصل مباشرة مع فريق د. محمود المهدي
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
                        <span>اشترك في هذا الكورس عبر واتساب</span>
                        <ArrowLeft className="h-4 w-4" />
                      </a>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 sm:flex-none h-11 rounded-xl border-slate-700 bg-slate-850 hover:bg-slate-800 text-white font-bold px-4"
                    >
                      <a href="/platform" className="flex items-center justify-center gap-2">
                        <span>المنصة والامتحانات</span>
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
  // Extract YouTube ID or Playlist ID
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
