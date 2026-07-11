import { motion } from "framer-motion";
import { Lightbulb, Eye, Code2, CheckSquare, Rocket } from "lucide-react";

export function TeachingStyle() {
  const steps = [
    { num: 1, title: "نفهم الفكرة", desc: "شرح بسيط ومنظم للمفهوم الجديد.", icon: Lightbulb },
    { num: 2, title: "نشوف مثال", desc: "مثال عملي واضح خطوة بخطوة.", icon: Eye },
    { num: 3, title: "نكتب الكود", desc: "الطالب يكتب بإيده مع التوجيه.", icon: Code2 },
    { num: 4, title: "نحل تدريبات", desc: "تدريبات تقيس الفهم وتثبت المعلومة.", icon: CheckSquare },
    { num: 5, title: "نعمل مشروع", desc: "مشروع صغير يجمع كل اللي اتعلمه.", icon: Rocket }
  ];

  return (
    <section className="py-16 bg-background border-t border-border relative overflow-hidden">
      {/* Subtle top divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-border" />

      {/* Decorative Ambient Background Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[140px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 max-w-3xl mx-auto"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-3 block">المنهجية</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">من الفهم للتطبيق</h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            مش بنحفظ أكواد. بنفهم الفكرة، نطبقها بإيدينا، ونخرج بمشروع يثبت إن الطالب فهم.
          </p>
          <div className="w-20 h-0.5 bg-primary/60 mx-auto rounded-full mt-4" />
        </motion.div>

        {/* Stepper Container */}
        <div className="relative max-w-5xl mx-auto mb-10">
          
          {/* Stepper horizontal line (desktop only) */}
          <div className="hidden lg:block absolute top-[28px] left-[10%] right-[10%] h-[2px] bg-white/10 z-0">
            {/* Animated laser pulse running RTL */}
            <motion.div
              initial={{ right: "-100%" }}
              animate={{ right: "100%" }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="absolute top-0 bottom-0 w-1/3 bg-primary/30"
            />
          </div>

          {/* Desktop Timeline Layout */}
          <div className="hidden lg:grid grid-cols-5 gap-4 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isStep5 = step.num === 5;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex flex-col group h-full"
                >
                  {/* Number Circle */}
                  <div className="relative z-10 mb-4 flex justify-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isStep5 
                        ? "bg-primary text-white border-primary font-black shadow-lg shadow-primary/30 scale-110" 
                        : "bg-background text-primary border-primary/30 group-hover:border-primary group-hover:text-primary"
                    }`}>
                      <span className="text-xl font-bold">{step.num}</span>
                    </div>
                  </div>

                  {/* Step Card */}
                  <div className={`flex-1 p-5 rounded-2xl border transition-all duration-300 flex flex-col ${
                    isStep5
                       ? "bg-primary/5 border-primary/50 shadow-lg shadow-primary/5 hover:bg-primary/8"
                       : "bg-card border-border hover:border-primary/30 hover:bg-muted"
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2.5 rounded-xl ${
                        isStep5 ? "bg-primary text-black" : "bg-primary/10 text-primary"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {isStep5 && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 uppercase tracking-wide">
                          النتيجة
                        </span>
                      )}
                    </div>
                    <h3 className={`font-bold text-lg mb-2 transition-colors ${
                      isStep5 ? "text-primary" : "text-foreground group-hover:text-primary"
                    }`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Mobile/Tablet Vertical Layout */}
          <div className="lg:hidden flex flex-col gap-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isStep5 = step.num === 5;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ${
                    isStep5
                      ? "bg-primary/5 border-primary/50 shadow-lg shadow-primary/5"
                      : "bg-card border-border"
                  }`}
                >
                  {/* Step Number Badge & Icon */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${
                      isStep5 ? "bg-primary text-black" : "bg-primary/10 text-primary border border-primary/20"
                    }`}>
                      {step.num}
                    </div>
                    <div className={`p-2 rounded-lg ${
                      isStep5 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-bold text-base ${isStep5 ? "text-primary" : "text-foreground"}`}>
                        {step.title}
                      </h3>
                      {isStep5 && (
                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          النتيجة
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <a
            href="#contact"
            className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-3.5 font-bold text-base shadow-lg shadow-primary/10 hover:scale-[1.02] transition-all"
          >
            احجز تقييم مجاني
          </a>
        </motion.div>
      </div>
    </section>
  );
}
