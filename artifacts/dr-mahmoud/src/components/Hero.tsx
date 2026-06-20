import { motion, Variants } from "framer-motion";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const drMahmoudPhoto = "/dr-mahmoud-photo.png";

export function Hero() {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } },
  };

  return (
    <section id="hero" className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-col gap-6 order-2 lg:order-1"
          >
            <motion.div variants={item}>
              <span className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary text-sm font-bold rounded-full mb-4">
                مدرب برمجة وذكاء اصطناعي — Eduverse، الزقازيق
              </span>
            </motion.div>

            <motion.h1 variants={item} className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
              تعلم البرمجة والذكاء الاصطناعي{" "}
              <span className="text-primary">مع د. محمود المهدي</span>
              <span className="block text-2xl md:text-3xl lg:text-4xl mt-2 text-foreground/70 font-semibold">
                الزقازيق — تدريس الثانوية والبكالوريا والجامعة
              </span>
            </motion.h1>

            <motion.p variants={item} className="text-lg md:text-xl text-foreground/60 leading-relaxed max-w-2xl">
              متخصص في تدريس البرمجة لطلاب <strong className="text-foreground/80">الثانوية العامة والبكالوريا</strong> (الصف الأول والثاني والثالث الثانوي)، الأطفال من سن 4 سنين، وطلاب الجامعة. Python، Scratch، AI، C++، ICDL — من الصفر لبناء مشاريع حقيقية.
            </motion.p>

            <motion.div variants={item} className="flex flex-wrap gap-4 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 text-base h-14 font-bold shadow-lg shadow-primary/25"
                data-testid="button-book-session"
              >
                <a href="#contact">احجز أول سيشن مجانًا</a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/20 text-foreground hover:bg-white/5 hover:border-primary/40 rounded-full px-8 text-base h-14"
                data-testid="button-view-programs"
              >
                <a href="#courses">
                  شوف البرامج التدريبية
                  <ArrowLeft className="ms-2 w-4 h-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full px-8 text-base h-14"
                data-testid="button-whatsapp"
              >
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <MessageCircle className="me-2 w-5 h-5" />
                  تواصل واتساب
                </a>
              </Button>
            </motion.div>

            <motion.div variants={item} className="flex flex-wrap gap-3 pt-6 mt-2 border-t border-white/10">
              {[
                "ماجستير نظم معلومات",
                "خبرة أكاديمية وتدريبية",
                "تدريب عملي بمشاريع حقيقية",
                "داخل Eduverse في الزقازيق"
              ].map((badge) => (
                <span
                  key={badge}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-foreground/70 text-sm font-medium rounded-full"
                >
                  {badge}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative mx-auto lg:mx-0 w-full max-w-md order-1 lg:order-2"
          >
            <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
              <img
                src={drMahmoudPhoto}
                alt="د. محمود المهدي"
                fetchPriority="high"
                decoding="async"
                width={480}
                height={600}
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-6 right-6 left-6">
                <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                  <p className="text-primary font-bold text-lg">د. محمود المهدي</p>
                  <p className="text-foreground/70 text-sm">ماجستير نظم معلومات | مدرب برمجة وذكاء اصطناعي</p>
                </div>
              </div>
            </div>

            {/* Decorative gold ring */}
            <div className="absolute -inset-4 rounded-[3rem] border border-primary/15 pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
