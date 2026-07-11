import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Play, Users, Clock, ArrowLeft, Video, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const defaultWorkshops = [
  {
    id: 1,
    type: "live", // live or recorded
    title: "ورشة عمل: مدخل إلى البرمجة ولغة Python",
    description: "للمبتدئين وطلاب المدارس والجامعات. سنتعلم معًا مبادئ التفكير البرمجي وكيفية كتابة أول كود برمجي وحل المشكلات البسيطة بـ Python.",
    date: "قريبًا (تفاعلية عبر Zoom)",
    duration: "ساعتان",
    audience: "المبتدئون وطلاب الثانوي والجامعة",
    ctaText: "احجز مقعدك المجاني (واتساب)",
    ctaLink: "https://wa.me/201044348610?text=أريد%20التسجيل%20في%20ورشة%20الـ%20Python%20المجانية",
    img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&q=80"
  },
  {
    id: 2,
    type: "recorded",
    title: "ورشة عمل: التفكير المنطقي وأسس حل المشكلات (Problem Solving)",
    description: "شرح تطبيقي لطرق تفكير المبرمجين المحترفين وكيفية كسر العقد البرمجية وتحليل المشكلات خطوة بخطوة بالاستعانة بخوارزميات ذكية.",
    date: "مسجلة (متاحة مجانًا)",
    duration: "3 ساعات",
    audience: "طلاب الكليات العلمية والمهتمين بالبرمجة",
    ctaText: "شاهد الورشة الآن",
    ctaLink: "https://www.youtube.com/@learntocode9453",
    img: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=500&q=80"
  },
  {
    id: 3,
    type: "recorded",
    title: "ورشة عمل: طريقك لإنشاء تطبيق أندرويد متكامل",
    description: "مقدمة عملية حول عالم تطوير تطبيقات الهواتف الذكية بنظام Android. سنستعرض بيئة Android Studio والمكونات الأساسية لبناء تطبيقك الأول.",
    date: "مسجلة (متاحة مجانًا)",
    duration: "ساعتان ونصف",
    audience: "مطورون مبتدئون وطلاب التخرج",
    ctaText: "شاهد الورشة الآن",
    ctaLink: "https://www.youtube.com/@learntocode9453",
    img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80"
  }
];

export function Portfolio() {
  const [filter, setFilter] = useState("all"); // all, live, recorded

  const filteredWorkshops = filter === "all" 
    ? defaultWorkshops 
    : defaultWorkshops.filter(w => w.type === filter);

  return (
    <section id="free-workshop" className="py-20 lg:py-24 bg-background relative border-b border-border">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-0 w-72 h-72 bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 max-w-2xl mx-auto"
        >
          <span className="text-secondary font-bold text-sm uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
            مجتمع تعلم البرمجة
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">الورش البرمجية المجانية</h2>
          <p className="text-muted-foreground text-base">ورش عمل أونلاين تفاعلية (مباشرة ومسجلة) تهدف لتبسيط المفاهيم الصعبة ومساعدتك على اتخاذ أولى خطواتك العملية.</p>
          <div className="w-20 h-1 bg-secondary mx-auto rounded-full mt-4" />
        </motion.div>

        {/* Filter buttons */}
        <div className="flex justify-center gap-3 mb-12">
          {[
            { label: "كل الورش", value: "all" },
            { label: "ورش تفاعلية مباشرة", value: "live" },
            { label: "ورش مسجلة", value: "recorded" },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`px-5 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 border ${
                filter === btn.value
                  ? "bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/10"
                  : "bg-card text-muted-foreground border-border hover:border-secondary hover:text-foreground"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Workshops list */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <AnimatePresence mode="popLayout">
            {filteredWorkshops.map((w, index) => (
              <motion.div
                key={w.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="group flex flex-col justify-between bg-card border border-border rounded-2xl overflow-hidden hover:border-secondary/40 transition-all duration-300 hover:shadow-lg"
              >
                <div>
                  {/* Workshop Image & Tag */}
                  <div className="relative h-48 overflow-hidden bg-muted">
                    <img
                      src={w.img}
                      alt={w.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    
                    {/* Status Badge */}
                    <span className={`absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md ${
                      w.type === "live" 
                        ? "bg-secondary text-white animate-pulse" 
                        : "bg-primary text-white"
                    }`}>
                      {w.type === "live" ? <Video className="w-3.5 h-3.5 shrink-0" /> : <Play className="w-3.5 h-3.5 shrink-0" />}
                      {w.type === "live" ? "تفاعلية مباشرة" : "مسجلة بالكامل"}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-foreground mb-3 leading-snug group-hover:text-secondary transition-colors">
                      {w.title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-6">
                      {w.description}
                    </p>

                    {/* Metadata */}
                    <div className="space-y-2 border-t border-border pt-4 text-muted-foreground text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground">{w.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>المدة: {w.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>الفئة المستهدفة: {w.audience}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="p-6 pt-0">
                  <Button
                    asChild
                    variant={w.type === "live" ? "default" : "outline"}
                    className={`w-full py-5 rounded-xl font-bold text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${
                      w.type === "live" 
                        ? "bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/10" 
                        : "border-primary text-primary hover:bg-primary hover:text-white"
                    }`}
                  >
                    <a href={w.ctaLink} target="_blank" rel="noreferrer">
                      {w.ctaText}
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                    </a>
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
