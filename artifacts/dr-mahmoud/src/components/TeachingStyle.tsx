import { motion } from "framer-motion";

export function TeachingStyle() {
  const steps = [
    { num: 1, title: "نفهم الفكرة", desc: "شرح بسيط ومنظم للمفهوم الجديد" },
    { num: 2, title: "نشوف مثال", desc: "مثال عملي واضح خطوة بخطوة" },
    { num: 3, title: "نكتب الكود", desc: "الطالب يكتب بإيده مع التوجيه" },
    { num: 4, title: "نحل تدريب", desc: "تدريب يثبت الفهم ويقيس التقدم" },
    { num: 5, title: "نعمل مشروع", desc: "مشروع صغير يجمع كل اللي اتعلمه" }
  ];

  return (
    <section className="py-20 lg:py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">المنهجية</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">طريقة الشرح</h2>
          <p className="text-lg text-foreground/55 leading-relaxed">
            البرمجة مش حفظ أكواد، البرمجة طريقة تفكير. في كل سيشن بنمشي على خطوات ثابتة تضمن إن الطالب فهم واستوعب وطبق بإيده.
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent z-0" />

          <div className="grid lg:grid-cols-5 gap-6 lg:gap-4 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 group-hover:border-primary group-hover:bg-primary/20 transition-all duration-300 text-primary font-bold text-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/10 relative">
                  {step.num}
                </div>
                <h3 className="font-bold text-base text-foreground mb-1">{step.title}</h3>
                <p className="text-xs text-foreground/45 leading-snug">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
