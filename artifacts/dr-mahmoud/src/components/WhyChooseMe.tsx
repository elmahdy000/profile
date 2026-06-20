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
    <section className="py-24 relative overflow-hidden bg-[#0a0a0a]">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1400&q=60"
          alt=""
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">الميزات</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">ليه تتعلم معايا؟</h2>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-primary/40 hover:bg-white/8 transition-all duration-300 group"
            >
              <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <p className="text-foreground/75 font-medium text-lg leading-snug">{feature}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
