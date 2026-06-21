import { motion, Variants } from "framer-motion";
import { MessageCircle, ArrowLeft, GraduationCap, Code, CheckCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const drMahmoudPhoto = "/dr-mahmoud-photo.png";

export function Hero() {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 25 } },
  };

  return (
    <section id="hero" className="relative pt-24 pb-12 lg:pt-36 lg:pb-20 overflow-hidden bg-gradient-to-b from-[#0a0f1d] via-background to-background">
      {/* Background glow and depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 left-1/4 w-[350px] h-[350px] bg-accent/4 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Hero Content */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-col gap-5 order-2 lg:order-1 text-right"
          >
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-bold rounded-full mb-2">
                <Code className="w-4 h-4" />
                مدرب برمجة وذكاء اصطناعي — Eduverse، الزقازيق
              </span>
            </motion.div>

            <motion.h1 variants={item} className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-extrabold leading-tight text-foreground">
              تعلم البرمجة والذكاء الاصطناعي{" "}
              <span className="text-primary block mt-1">مع د. محمود المهدي</span>
              <span className="block text-xl sm:text-2xl md:text-3xl mt-3 text-foreground/75 font-semibold">
                الزقازيق — تدريس الثانوية والبكالوريا والجامعة
              </span>
            </motion.h1>

            <motion.p variants={item} className="text-base sm:text-lg md:text-xl text-foreground/70 leading-relaxed max-w-2xl">
              متخصص في تدريس البرمجة لطلاب <strong className="text-foreground/90">الثانوية العامة والبكالوريا</strong> (الصف الأول والثاني والثالث الثانوي)، الأطفال من سن 4 سنين، وطلاب الجامعة. Python، Scratch، AI، C++، ICDL — من الصفر لبناء مشاريع حقيقية.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={item} className="flex flex-col sm:flex-row flex-wrap gap-3.5 pt-2">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] rounded-full px-6 text-base h-13 font-bold shadow-lg shadow-[#D6A84F]/20 hover:shadow-[#D6A84F]/30 transition-all duration-300 w-full sm:w-auto justify-center hover:scale-[1.02]"
                data-testid="button-book-session"
              >
                <a href="#contact">احجز أول سيشن مجانًا</a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="bg-[#121A27] text-foreground border border-[#D6A84F]/28 hover:border-[#D6A84F]/60 rounded-full px-6 text-base h-13 w-full sm:w-auto justify-center transition-all duration-300 hover:bg-[#121A27]/85"
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
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full px-6 text-base h-13 w-full sm:w-auto justify-center"
                data-testid="button-whatsapp"
              >
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <MessageCircle className="me-2 w-5 h-5" />
                  تواصل واتساب
                </a>
              </Button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={item} className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 pt-5 mt-2 border-t border-white/10">
              {[
                { text: "ماجستير نظم معلومات", icon: GraduationCap },
                { text: "خبرة أكاديمية وتدريبية", icon: CheckCircle },
                { text: "تدريب عملي بمشاريع", icon: Code },
                { text: "داخل Eduverse بالزقازيق", icon: MapPin }
              ].map((badge, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/5 text-foreground/80 text-xs sm:text-sm font-medium rounded-xl justify-center sm:justify-start"
                >
                  <badge.icon className="w-4 h-4 text-primary shrink-0" />
                  {badge.text}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Profile Photo Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative mx-auto lg:mx-0 w-full max-w-sm sm:max-w-md order-1 lg:order-2 px-4"
          >
            {/* Subtle glow layers */}
            <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-tr from-primary/30 to-accent/10 blur-xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-4 -left-4 w-28 h-28 bg-primary/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative aspect-[4/5] rounded-[2.2rem] overflow-hidden shadow-2xl border border-white/10 group">
              <img
                src={drMahmoudPhoto}
                alt="د. محمود المهدي"
                fetchPriority="high"
                decoding="async"
                width={480}
                height={600}
                className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-5 right-5 left-5">
                <div className="bg-background/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl">
                  <p className="text-primary font-extrabold text-lg">د. محمود المهدي</p>
                  <p className="text-foreground/80 text-sm mt-0.5 font-medium">ماجستير نظم معلومات | مدرب برمجة وذكاء اصطناعي</p>
                </div>
              </div>
            </div>

            {/* Decorative outer frame */}
            <div className="absolute -inset-2 rounded-[2.5rem] border border-primary/15 pointer-events-none" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
