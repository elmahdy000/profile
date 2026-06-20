import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const stats = [
  { value: "+5", label: "سنوات خبرة" },
  { value: "+200", label: "طالب متخرج" },
  { value: "6", label: "مسارات تدريبية" },
  { value: "100%", label: "تدريب عملي" },
];

export function About() {
  const points = [
    "ماجستير نظم معلومات",
    "مدرب برمجة وذكاء اصطناعي",
    "مؤسس Eduverse",
    "أسلوب تدريس عملي",
    "تركيز على المشاريع",
    "مناسب للأطفال والمدارس والجامعة"
  ];

  return (
    <section id="about" className="py-24 bg-[#0a0a0a]">
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
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80"
                alt="محاضرة تعليمية"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/60 to-transparent" />
            </div>

            <div className="absolute -bottom-8 right-0 left-0 mx-4">
              <div className="bg-[#111] border border-white/10 rounded-2xl p-4 grid grid-cols-4 gap-2 shadow-xl">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="font-bold text-xl text-primary">{stat.value}</p>
                    <p className="text-xs text-foreground/50 leading-tight mt-0.5">{stat.label}</p>
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
            className="mt-8 lg:mt-0"
          >
            <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">من هو الدكتور؟</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">مين د. محمود المهدي؟</h2>
            <p className="text-lg text-foreground/60 leading-relaxed mb-10">
              د. محمود المهدي، ماجستير نظم معلومات، ومدرب برمجة وذكاء اصطناعي. بيقدم محتوى تعليمي عملي للطلاب والأطفال وطلاب الجامعة، بأسلوب بسيط ومنظم بعيد عن الحفظ والتلقين. الهدف إن الطالب يفهم، يطبق، ويطلع بمشروع حقيقي يقدر يفتخر بيه.
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
                  className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-xl hover:border-primary/30 transition-colors"
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
