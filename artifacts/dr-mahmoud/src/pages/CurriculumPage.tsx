import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListCurriculums } from "@workspace/api-client-react";
import {
  ArrowRight,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Layers,
  Info,
  Maximize2,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export default function CurriculumPage() {
  const { get } = useSiteSettings();
  const logoUrl = get(SETTINGS_KEYS.SITE_LOGO_URL, "/logo.jpg");
  const siteName = get(SETTINGS_KEYS.SITE_NAME, "د. محمود المهدي");

  const { data: curriculums, isLoading } = useListCurriculums();
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLesson, setActiveLesson] = useState<any | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);

  const openLesson = (lesson: any) => {
    setActiveLesson(lesson);
    setCurrentSlideIndex(0);
    setDirection(0);
    const url = new URL(window.location.href);
    url.searchParams.set("lesson", lesson.title);
    window.history.pushState({}, "", url.toString());
  };

  const closeLesson = () => {
    setActiveLesson(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("lesson");
    window.history.pushState({}, "", url.toString());
  };

  // Set page meta details for SEO
  useEffect(() => {
    document.title = "المناهج والملخصات البرمجية المصورة | د. محمود المهدي";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "تصفح مناهج البرمجة وعلوم الحاسب المصورة بالتفصيل مع د. محمود المهدي. سلاسل دروس تفاعلية مبسطة بالصور لجميع المستويات واللغات البرمجية."
      );
    }
  }, []);

  // Keyboard navigation for active presentation
  useEffect(() => {
    if (!activeLesson) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        nextSlide();
      } else if (e.key === "ArrowRight") {
        prevSlide();
      } else if (e.key === "Escape") {
        closeLesson();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLesson, currentSlideIndex]);

  // Deep link support on mount and when curriculums load
  useEffect(() => {
    if (!curriculums || curriculums.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const lessonTitle = params.get("lesson");
    if (lessonTitle) {
      const found = curriculums.find(
        (c) => c.title === decodeURIComponent(lessonTitle)
      );
      if (found) {
        openLesson(found);
      }
    }
  }, [curriculums]);

  // Extract unique subjects from backend
  const subjectsList = curriculums
    ? Array.from(new Set(curriculums.map((c) => c.subject)))
    : [];

  const filteredCurriculums = curriculums
    ? curriculums
        .filter((c) => selectedSubject === "all" || c.subject === selectedSubject)
        .filter((c) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            c.title.toLowerCase().includes(query) ||
            (c.description && c.description.toLowerCase().includes(query)) ||
            c.subject.toLowerCase().includes(query)
          );
        })
        .sort((a, b) => a.order - b.order)
    : [];

  const nextSlide = () => {
    if (!activeLesson) return;
    if (currentSlideIndex < activeLesson.images.length - 1) {
      setDirection(1);
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setDirection(-1);
      setCurrentSlideIndex((prev) => prev - 1);
    }
  };

  // 3D Flipping Book Page Variants
  const pageVariants = {
    initial: (dir: number) => ({
      rotateY: dir > 0 ? -110 : 110,
      opacity: 0,
      z: -100,
    }),
    animate: {
      rotateY: 0,
      opacity: 1,
      z: 0,
      transition: {
        duration: 0.55,
        ease: [0.25, 1, 0.5, 1] as any, // easeOutQuart
      }
    },
    exit: (dir: number) => ({
      rotateY: dir > 0 ? 110 : -110,
      opacity: 0,
      z: -100,
      transition: {
        duration: 0.55,
        ease: [0.25, 1, 0.5, 1] as any,
      }
    })
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      {/* Minimal Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="w-9 h-9 object-cover rounded-full border border-primary/20 shrink-0" />
            <span className="font-bold text-lg text-primary">{siteName}</span>
          </a>
          <Button asChild className="bg-primary text-primary-foreground font-bold rounded-full px-5 h-9 text-sm shadow-md hover:scale-[1.03] transition-all">
            <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
              <MessageCircle className="w-4 h-4 me-2" />
              احجز تقييم مجاني
            </a>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-[120px]" />
        </div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-foreground/40 mb-8">
              <a href="/" className="hover:text-primary transition-colors">الرئيسية</a>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span className="text-primary">المناهج البرمجية المصورة</span>
            </div>

            <span className="inline-block px-4 py-1.5 bg-primary/12 border border-primary/30 text-primary text-xs font-bold rounded-full mb-6">
              شرح مبسط بالخرائط الذهنية والصور التوضيحية
            </span>

            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-snug">
              مكتبة المناهج والملخصات البرمجية <br />
              <span className="text-primary">
                تصفح الدروس كشرائح تفاعلية
              </span>
            </h1>

            <p className="text-foreground/70 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
              أفضل طريقة لتثبيت المفاهيم البرمجية الصعبة (مثل الجمل الشرطية، الدورات، هياكل البيانات، والمؤشرات) من خلال ملخصات بصرية تفاعلية معدة باحترافية لتناسب طلاب الجامعات، المدارس، وعشاق البرمجة بالزقازيق ومصر.
            </p>
          </div>
        </div>
      </section>

      {/* Main Section */}
      <section className="pb-24 container mx-auto px-4 lg:px-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">جاري تحميل المناهج والدروس المصورة...</p>
          </div>
        ) : !curriculums || curriculums.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-3xl max-w-xl mx-auto px-6 shadow-sm">
            <BookOpen className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <h3 className="font-bold text-foreground text-lg">لم يتم رفع مناهج تعليمية بعد</h3>
            <p className="text-xs text-muted-foreground mt-2">
              تابعنا باستمرار، سيقوم الدكتور بإضافة شروحات برمجية بصرية رائعة قريبًا جدًا!
            </p>
            <Button asChild className="mt-6 bg-primary text-primary-foreground font-bold">
              <a href="/">العودة للرئيسية</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <input
                type="text"
                placeholder="ابحث عن درس أو موضوع معين..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-full px-5 py-3 pr-11 text-sm text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-primary/50 transition-colors shadow-sm"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/45 pointer-events-none" />
            </div>

            {/* Subjects Pill Filters */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto border-b border-border/40 pb-6">
              <button
                onClick={() => setSelectedSubject("all")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  selectedSubject === "all"
                    ? "bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20"
                    : "bg-card text-foreground/80 border border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                جميع المواد ({curriculums.length})
              </button>
              {subjectsList.map((subj) => {
                const count = curriculums.filter((c) => c.subject === subj).length;
                return (
                  <button
                    key={subj}
                    onClick={() => setSelectedSubject(subj)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                      selectedSubject === subj
                        ? "bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20"
                        : "bg-card text-foreground/80 border border-border hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {subj} ({count})
                  </button>
                );
              })}
            </div>

            {/* Curriculum Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCurriculums.map((lesson) => (
                <div
                  key={lesson.id}
                  className="group bg-card border border-border hover:border-primary/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded-md">
                        {lesson.subject}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Layers className="w-3 h-3 text-primary/70" />
                        {lesson.images.length} صفحة
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {lesson.title}
                    </h3>

                    {lesson.description && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-3 leading-relaxed">
                        {lesson.description}
                      </p>
                    )}
                  </div>

                  {/* Thumbnail Row & View Action */}
                  <div className="px-6 pb-6 pt-2 border-t border-border bg-background/25 space-y-4">
                    <div className="flex items-center gap-1.5 overflow-hidden py-1">
                      {lesson.images.slice(0, 4).map((img, idx) => (
                        <div
                          key={idx}
                          className="relative w-12 h-14 rounded-md overflow-hidden border border-border bg-muted flex-shrink-0"
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover opacity-80"
                          />
                          {idx === 3 && lesson.images.length > 4 && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center text-[10px] font-bold text-white">
                              +{lesson.images.length - 4}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={() => openLesson(lesson)}
                      className="w-full bg-muted/65 hover:bg-primary text-primary hover:text-white border border-border hover:border-transparent transition-all duration-300 font-bold text-xs py-5"
                    >
                      <Maximize2 className="w-3.5 h-3.5 me-2" />
                      عرض الدرس كشرائح صور
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Full screen Presentation Modal */}
      <AnimatePresence>
        {activeLesson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between"
          >
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between text-white bg-black/40 backdrop-blur-md relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 font-bold px-2 py-0.5 rounded">
                    {activeLesson.subject}
                  </span>
                  <span className="text-xs text-slate-400">الدرس رقم {activeLesson.order}</span>
                </div>
                <h3 className="font-bold text-sm md:text-lg">{activeLesson.title}</h3>
              </div>

              <button
                onClick={closeLesson}
                className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                title="إغلاق"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Slide Stage */}
            <div className="flex-1 flex items-center justify-center relative p-4 md:p-8">
              {/* Prev Button (Right side in RTL) */}
              <button
                onClick={prevSlide}
                disabled={currentSlideIndex === 0}
                className="absolute right-4 md:right-8 p-3 md:p-4 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-full text-white transition-colors border border-white/15 z-10"
                title="الصفحة السابقة"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Main Image Slider with 3D Page Flip Animation */}
              <div 
                className="relative w-full max-w-2xl aspect-[3/4] max-h-[70vh] flex items-center justify-center"
                style={{ perspective: "1500px" }}
              >
                <AnimatePresence initial={false} custom={direction} mode="wait">
                  <motion.div
                    key={currentSlideIndex}
                    custom={direction}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    style={{
                      transformStyle: "preserve-3d",
                      transformOrigin: direction >= 0 ? "right center" : "left center",
                    }}
                    className="w-full h-full relative bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex items-center justify-center p-2"
                  >
                    {/* Notebook Spine / binding effect on the right side for RTL book layout */}
                    <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-black/45 to-transparent border-l border-white/5 pointer-events-none z-10" />
                    <div className="absolute top-0 right-1.5 w-[2px] h-full bg-slate-950/80 pointer-events-none z-10" />
                    
                    {/* Subtle page fold lighting shadow */}
                    <div className="absolute top-0 right-4 w-6 h-full bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none z-10" />

                    <img
                      src={activeLesson.images[currentSlideIndex]}
                      alt={`Slide ${currentSlideIndex + 1}`}
                      className="max-w-full max-h-full object-contain rounded-xl select-none"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Next Button (Left side in RTL) */}
              <button
                onClick={nextSlide}
                disabled={currentSlideIndex === activeLesson.images.length - 1}
                className="absolute left-4 md:left-8 p-3 md:p-4 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-full text-white transition-colors border border-white/15 z-10"
                title="الصفحة التالية"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>

            {/* Footer with slides strip and indicators */}
            <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-md relative z-10 flex flex-col items-center gap-3">
              {/* Info text */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-primary/80" />
                <span>يمكنك استخدام الأسهم يمين ويسار (← →) في الكيبورد للتنقل</span>
              </div>

              {/* Pagination text */}
              <div className="text-white text-xs font-bold font-mono bg-white/10 px-3 py-1.5 rounded-full">
                {currentSlideIndex + 1} / {activeLesson.images.length}
              </div>

              {/* Horizontal list of thumbnails */}
              <div className="flex items-center gap-2 overflow-x-auto max-w-full px-4 pb-1">
                {activeLesson.images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setDirection(idx > currentSlideIndex ? 1 : -1);
                      setCurrentSlideIndex(idx);
                    }}
                    className={`relative w-10 h-12 rounded overflow-hidden border transition-all flex-shrink-0 ${
                      currentSlideIndex === idx
                        ? "border-primary scale-110 shadow-lg shadow-primary/20"
                        : "border-white/20 opacity-40 hover:opacity-75"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
