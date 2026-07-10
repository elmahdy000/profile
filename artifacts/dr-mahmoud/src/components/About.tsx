import { motion, useInView } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

function CountUp({ end, prefix, suffix }: { end: number; prefix: string; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);

  return (
    <span ref={ref} className="font-bold text-xl text-primary">
      {prefix}{count}{suffix}
    </span>
  );
}

export function About() {
  const { get } = useSiteSettings();
  
  const desc = get(SETTINGS_KEYS.ABOUT_DESC, "د. محمود المهدي، ماجستير نظم معلومات ومدرب برمجة. متخصص في تقديم كورسات برمجة وشرح مواد حاسبات ومعلومات ومقدمة فى البرمجة لطلاب الجامعة والتعليم الثانوي وبكالوريا برمجة أونلاين بمصر وحضوري بالزقازيق.");
  const years = parseInt(get(SETTINGS_KEYS.ABOUT_YEARS, "5"));
  const students = parseInt(get(SETTINGS_KEYS.ABOUT_STUDENTS, "200"));
  const aboutImage = get(SETTINGS_KEYS.ABOUT_IMAGE_URL, "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80");
  
  const stats = [
    { end: years, prefix: "+", suffix: "", label: "سنوات خبرة" },
    { end: students, prefix: "+", suffix: "", label: "طالب متخرج" },
    { end: 6, prefix: "", suffix: "", label: "مسارات تدريبية" },
    { end: 100, prefix: "", suffix: "%", label: "تدريب عملي" },
  ];

  const points = [
    "ماجستير نظم معلومات",
    "مدرب برمجة وذكاء اصطناعي",
    "مؤسس Eduverse",
    "أسلوب تدريس عملي",
    "تركيز على المشاريع",
    "مناسب للأطفال والمدارس والجامعة"
  ];

  return (
    <section id="about" className="py-20 lg:py-24 pb-28 lg:pb-32 bg-card/30 relative">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl border border-white/10">
              <img
                src={aboutImage}
                alt="محاضرة تعليمية"
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/60 to-transparent" />
            </div>

            <div className="absolute -bottom-8 right-0 left-0 mx-4">
              <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 grid grid-cols-4 gap-2 shadow-xl">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <CountUp end={stat.end} prefix={stat.prefix} suffix={stat.suffix} />
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-12 lg:mt-0"
          >
            <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">من هو الدكتور؟</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">مين د. محمود المهدي؟</h2>
            <p className="text-lg text-foreground/70 leading-relaxed mb-10 whitespace-pre-wrap">
              {desc}
            </p>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.08 } }
              }}
              className="grid grid-cols-2 gap-3"
            >
              {points.map((point, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 }
                  }}
                  className="flex items-center gap-2.5 bg-card border border-border p-3 rounded-xl hover:border-primary/30 transition-colors"
                >
                  <CheckCircle2 className="text-primary w-5 h-5 shrink-0" />
                  <span className="font-medium text-foreground/80 text-sm">{point}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
