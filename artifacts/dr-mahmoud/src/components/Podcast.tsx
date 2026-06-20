import { motion } from "framer-motion";
import { Mic, Play, Youtube, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const episodes = [
  {
    title: "دخلوا المجال عشان الترند؟",
    desc: "هل اختيار البرمجة بسبب الترند قرار صح؟ وإيه الفرق بين اللي بيتعلم وعنده هدف واللي بيجري وراء الموضة؟",
    duration: "45 دقيقة",
  },
  {
    title: "ولا فاهمين البكالوريا والبرمجة صح؟",
    desc: "كيف يجمع الطالب بين دراسة البكالوريا وتعلم البرمجة؟ وإيه الخطوات العملية للبداية الصح؟",
    duration: "38 دقيقة",
  },
  {
    title: "الذكاء الاصطناعي هيأكل الشغل ولا هيخلق فرص؟",
    desc: "نقاش صريح عن مستقبل سوق العمل في عصر الـ AI وإزاي تتأهل للمرحلة الجاية.",
    duration: "52 دقيقة",
  },
];

export function Podcast() {
  return (
    <section id="podcast" className="py-24 bg-[#0a0a0a] relative overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block flex items-center justify-center gap-2">
            <Mic className="w-4 h-4" /> بودكاست
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">البودكاست التعليمي</h2>
          <p className="text-foreground/50 max-w-xl mx-auto">
            حلقات صريحة عن البرمجة والتعليم وسوق العمل — مع د. محمود المهدي
          </p>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full mt-4" />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Poster */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex justify-center lg:order-2"
          >
            <div className="relative max-w-xs w-full">
              <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl" />
              <img
                src="/podcast-cover.png"
                alt="بودكاست د. محمود المهدي"
                className="relative rounded-2xl shadow-2xl shadow-primary/20 w-full object-cover border border-primary/20"
              />
            </div>
          </motion.div>

          {/* Episodes */}
          <div className="lg:order-1 space-y-4">
            {episodes.map((ep, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-primary/40 hover:bg-white/8 transition-all duration-300 cursor-pointer"
              >
                <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Play className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">
                      {ep.title}
                    </h3>
                    <span className="text-xs text-foreground/35 shrink-0">{ep.duration}</span>
                  </div>
                  <p className="text-xs text-foreground/45 leading-relaxed line-clamp-2">{ep.desc}</p>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="flex flex-col sm:flex-row gap-3 pt-2"
            >
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25"
              >
                <a href="https://youtube.com/@dr-mahmoud" target="_blank" rel="noreferrer">
                  <Youtube className="w-4 h-4 me-2" />
                  تابع البودكاست على YouTube
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 hover:border-primary/40 hover:text-primary font-bold"
              >
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 me-2" />
                  اقترح موضوع
                </a>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
