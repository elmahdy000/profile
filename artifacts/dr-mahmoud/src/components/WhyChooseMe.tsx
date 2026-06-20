import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function WhyChooseMe() {
  const features = [
    "شرح بسيط ومنظم",
    "تطبيق عملي في كل حصة",
    "مشاريع حقيقية مش كلام نظري",
    "متابعة للطالب خطوة بخطوة",
    "مناسب للأطفال وطلاب المدارس والجامعة",
    "خبرة أكاديمية في نظم المعلومات",
    "تدريب داخل مكان مجهز Eduverse",
    "محتوى تعليمي حديث ومناسب لسوق العمل"
  ];

  return (
    <section className="py-24 bg-primary/[0.03]">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">ليه تتعلم معايا؟</h2>
          <div className="w-24 h-1 bg-accent mx-auto rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-4 p-5 bg-white rounded-2xl shadow-sm border border-border/40 hover:border-primary/20 transition-colors"
            >
              <CheckCircle2 className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <p className="text-foreground/80 font-medium text-lg">{feature}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
