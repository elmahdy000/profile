import { motion } from "framer-motion";

export function TeachingStyle() {
  const steps = [
    { num: 1, title: "نفهم الفكرة" },
    { num: 2, title: "نشوف مثال بسيط" },
    { num: 3, title: "نكتب الكود" },
    { num: 4, title: "نحل تدريب" },
    { num: 5, title: "نعمل مشروع صغير" }
  ];

  return (
    <section className="py-24 bg-primary/[0.03]">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">طريقة الشرح</h2>
          <p className="text-lg text-foreground/80 leading-relaxed">
            البرمجة مش حفظ أكواد، البرمجة طريقة تفكير. في كل سيشن بنمشي على خطوات ثابتة تضمن إن الطالب فهم واستوعب وطبق بإيده.
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-border -translate-y-1/2 z-0" />
          
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-4 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-full bg-white border-4 border-primary text-primary font-bold text-2xl flex items-center justify-center mb-4 shadow-sm relative">
                  {step.num}
                  {/* Connecting Line (Mobile) */}
                  {index !== steps.length - 1 && (
                    <div className="lg:hidden absolute -bottom-6 left-1/2 w-1 h-6 bg-border -translate-x-1/2" />
                  )}
                </div>
                <h3 className="font-bold text-lg text-foreground bg-white px-4 py-2 rounded-lg shadow-sm border border-border/50 w-full lg:w-auto">
                  {step.title}
                </h3>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
