import { motion, Variants } from "framer-motion";
import { MessageCircle, ArrowLeft, GraduationCap, Code, CheckCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

const drMahmoudPhotoDefault = "/dr-mahmoud-photo.png";

export function Hero() {
  const { get } = useSiteSettings();
  
  const title = get(SETTINGS_KEYS.HERO_TITLE, "تعلم البرمجة والذكاء الاصطناعي");
  const subtitle = get(SETTINGS_KEYS.HERO_SUBTITLE, "مع د. محمود المهدي");
  const desc = get(SETTINGS_KEYS.HERO_DESC, "تأسيس برمجة للثانوية العامة والبكالوريا، الأطفال وطلاب الجامعة.");
  const badge = get(SETTINGS_KEYS.HERO_BADGE, "برمجة | AI | Eduverse الزقازيق");
  const photo = get(SETTINGS_KEYS.HERO_PHOTO_URL, drMahmoudPhotoDefault);
  const whatsapp = get(SETTINGS_KEYS.CONTACT_WHATSAPP, "201044348610");
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.09 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 240, damping: 26 } },
  };

  return (
    <section
      id="hero"
      className="relative pt-24 pb-14 lg:pt-32 lg:pb-20 overflow-hidden bg-gradient-to-b from-[#080C18] via-background to-background"
    >
      {/* Background glows — reduced intensity */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-[420px] h-[420px] bg-[#D6A84F]/6 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 left-1/4 w-[280px] h-[280px] bg-[#D6A84F]/4 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">

          {/* ─── CONTENT (right side / RTL order 2→1) ─── */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-col gap-5 order-2 lg:order-1 text-right"
          >
            {/* Badge */}
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D6A84F]/10 border border-[#D6A84F]/22 text-[#D6A84F] text-xs font-semibold rounded-full">
                <Code className="w-3.5 h-3.5 shrink-0" />
                {badge}
              </span>
            </motion.div>

            {/* Headline — reduced size, tighter line-height */}
            <motion.h1
              variants={item}
              className="text-[1.85rem] sm:text-[2.25rem] md:text-4xl lg:text-[2.6rem] xl:text-5xl font-extrabold leading-[1.25] text-[#F8F5EE]"
            >
              {title}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-[#F2C76E] to-[#D6A84F]">
                {subtitle}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={item}
              className="text-base sm:text-lg text-[#F8F5EE]/60 font-medium leading-relaxed"
            >
              للثانوية والبكالوريا والجامعة — شرح عملي من الصفر للمشاريع
            </motion.p>

            {/* Description — shorter, tighter */}
            <motion.p
              variants={item}
              className="text-sm sm:text-base text-[#A7AFBC] leading-relaxed max-w-lg whitespace-pre-wrap"
            >
              {desc}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={item}
              className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1"
            >
              {/* Primary — gold gradient, strongest */}
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] rounded-full px-7 h-12 text-sm font-bold shadow-lg shadow-[#D6A84F]/20 hover:shadow-[#D6A84F]/30 transition-all duration-300 w-full sm:w-auto justify-center hover:scale-[1.02]"
                data-testid="button-book-session"
              >
                <a href="#contact">احجز أول سيشن مجانًا</a>
              </Button>

              {/* Secondary — dark navy, gold border */}
              <Button
                asChild
                size="lg"
                className="bg-[#0E1520] text-[#F8F5EE]/80 border border-[#D6A84F]/25 hover:border-[#D6A84F]/50 hover:text-[#F8F5EE] rounded-full px-7 h-12 text-sm w-full sm:w-auto justify-center transition-all duration-300"
                data-testid="button-view-programs"
              >
                <a href="#courses">
                  شوف البرامج التدريبية
                  <ArrowLeft className="ms-2 w-4 h-4" />
                </a>
              </Button>

              {/* WhatsApp — softer, outline style */}
              <Button
                asChild
                size="lg"
                className="bg-transparent border border-[#25D366]/40 hover:bg-[#25D366]/10 text-[#25D366] rounded-full px-7 h-12 text-sm w-full sm:w-auto justify-center transition-all duration-300"
                data-testid="button-whatsapp"
              >
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="me-2 w-4 h-4" />
                  تواصل واتساب
                </a>
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={item}
              className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-5 mt-1 border-t border-white/8"
            >
              {[
                { text: "ماجستير نظم معلومات", icon: GraduationCap },
                { text: "خبرة أكاديمية وتدريبية", icon: CheckCircle },
                { text: "تدريب عملي بمشاريع", icon: Code },
                { text: "الزقازيق • أونلاين لكل مصر", icon: MapPin },
              ].map((badge, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/4 border border-white/6 text-[#A7AFBC] text-xs font-medium rounded-xl justify-center sm:justify-start"
                >
                  <badge.icon className="w-3.5 h-3.5 text-[#D6A84F] shrink-0" />
                  {badge.text}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* ─── PROFILE PHOTO CARD (left side) ─── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative mx-auto lg:mx-0 w-full max-w-[300px] sm:max-w-[340px] order-1 lg:order-2"
          >
            {/* Subtle outer glow — reduced from before */}
            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-tr from-[#D6A84F]/18 to-transparent blur-2xl opacity-70 pointer-events-none" />

            {/* Photo frame */}
            <div className="relative aspect-[4/5] rounded-[1.8rem] overflow-hidden shadow-2xl border border-white/8 group">
              <img
                src={photo}
                alt="د. محمود المهدي — مدرب برمجة وذكاء اصطناعي"
                fetchPriority="high"
                decoding="async"
                width={420}
                height={525}
                className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.025]"
              />
              {/* Gradient overlay — slightly lighter than before */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

              {/* Info card — smaller and more refined */}
              <div className="absolute bottom-4 right-4 left-4">
                <div className="bg-[#080C18]/85 backdrop-blur-md border border-white/10 rounded-xl p-3.5 shadow-lg">
                  <p className="text-[#D6A84F] font-bold text-base leading-tight">د. محمود المهدي</p>
                  <p className="text-[#A7AFBC] text-xs mt-0.5 leading-snug">
                    ماجستير نظم معلومات · مدرب برمجة وذكاء اصطناعي
                  </p>
                </div>
              </div>
            </div>

            {/* Thin outer border ring */}
            <div className="absolute -inset-1.5 rounded-[2rem] border border-[#D6A84F]/12 pointer-events-none" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
