import { motion } from "framer-motion";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <section id="hero" className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            <motion.h1 variants={item} className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-primary">
              تعلم البرمجة والذكاء الاصطناعي مع د. محمود المهدي
            </motion.h1>
            
            <motion.p variants={item} className="text-lg md:text-xl text-foreground/70 leading-relaxed max-w-2xl">
              من الصفر لحد بناء مشاريع حقيقية بأسلوب بسيط ومنظم يناسب الأطفال، طلاب المدارس، وطلاب الجامعة.
            </motion.p>
            
            <motion.div variants={item} className="flex flex-wrap gap-4 pt-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-white rounded-full px-8 text-base h-14">
                <a href="#contact">احجز أول سيشن مجانًا</a>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-primary text-primary hover:bg-primary/5 rounded-full px-8 text-base h-14">
                <a href="#courses">
                  شوف البرامج التدريبية
                  <ArrowLeft className="ml-2 w-4 h-4" />
                </a>
              </Button>
              <Button asChild size="lg" className="bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full px-8 text-base h-14">
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 w-5 h-5" />
                  تواصل واتساب
                </a>
              </Button>
            </motion.div>

            <motion.div variants={item} className="flex flex-wrap gap-3 pt-8 mt-4 border-t border-border/50">
              {[
                "ماجستير نظم معلومات",
                "خبرة أكاديمية وتدريبية",
                "تدريب عملي بمشاريع حقيقية",
                "داخل Eduverse في الزقازيق"
              ].map((badge) => (
                <span key={badge} className="px-4 py-2 bg-primary/5 text-primary text-sm font-medium rounded-full border border-primary/10">
                  {badge}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto lg:mx-0 w-full max-w-md aspect-square"
          >
            {/* Professional Profile Photo Placeholder */}
            <div className="w-full h-full rounded-[3rem] bg-primary overflow-hidden relative shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary to-primary/80" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl text-white/20 font-bold">م . م</span>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent rounded-full blur-3xl opacity-30" />
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-white rounded-full blur-3xl opacity-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
