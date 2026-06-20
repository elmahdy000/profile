import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

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
    <section id="about" className="py-20 bg-primary/5">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">مين د. محمود المهدي؟</h2>
            <p className="text-lg text-foreground/80 leading-relaxed">
              د. محمود المهدي، ماجستير نظم معلومات، ومدرب برمجة وذكاء اصطناعي. بيقدم محتوى تعليمي عملي للطلاب والأطفال وطلاب الجامعة، بأسلوب بسيط ومنظم بعيد عن الحفظ والتلقين. الهدف إن الطالب يفهم، يطبق، ويطلع بمشروع حقيقي يقدر يفتخر بيه.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
            className="grid md:grid-cols-2 gap-4"
          >
            {points.map((point, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  show: { opacity: 1, x: 0 }
                }}
                className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-border/50"
              >
                <CheckCircle2 className="text-accent w-6 h-6 shrink-0" />
                <span className="font-semibold text-foreground/90">{point}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
