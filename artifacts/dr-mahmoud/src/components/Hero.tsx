import { useState } from "react";
import { motion, Variants } from "framer-motion";
import { MessageCircle, ArrowLeft, GraduationCap, Code, CheckCircle, MapPin, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

const drMahmoudPhotoDefault = "/dr-mahmoud-photo.png";

export function Hero() {
  const [imageError, setImageError] = useState(false);
  const { get } = useSiteSettings();
  
  const title = get(SETTINGS_KEYS.HERO_TITLE, "أفضل كورسات برمجة وشرح مواد حاسبات");
  const subtitle = get(SETTINGS_KEYS.HERO_SUBTITLE, "مع د. محمود المهدي");
  const desc = get(SETTINGS_KEYS.HERO_DESC, "تأسيس من الصفر ومقدمة فى البرمجة لطلاب الجامعة، وشرح منهج برمجة ثانوية عامة وبكالوريا برمجة أونلاين لكل مصر وحضوري بالزقازيق.");
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
      className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 overflow-hidden bg-gradient-to-b from-[#0B1F3A] via-[#081527] to-[#050C18]"
    >
      {/* Smooth bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background/40 to-transparent pointer-events-none z-10" />
      {/* Background glows — Cyan and Blue */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-[420px] h-[420px] bg-secondary/8 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 left-1/4 w-[280px] h-[280px] bg-primary/8 rounded-full blur-[100px]" />
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 border border-secondary/20 text-secondary text-xs font-semibold rounded-full">
                <Code className="w-3.5 h-3.5 shrink-0" />
                {badge}
              </span>
            </motion.div>

            {/* Headline — split into two distinct lines */}
            <motion.h1
              variants={item}
              className="text-[1.85rem] sm:text-[2.25rem] md:text-4xl lg:text-[2.6rem] xl:text-5xl font-extrabold leading-[1.2] text-white flex flex-col gap-2"
            >
              <span className="block">{title}</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-secondary via-primary to-secondary font-black block mt-1">
                {subtitle}
              </span>
            </motion.h1>

            {/* YouTube Link Badge */}
            <motion.div variants={item} className="mt-0.5 flex">
              <a
                href="https://www.youtube.com/@learntocode9453"
                target="_blank"
                rel="noopener noreferrer me"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/35 text-red-400 text-xs font-semibold rounded-full transition-all duration-300 w-fit"
              >
                <Youtube className="w-4 h-4 shrink-0 text-red-500 animate-pulse" />
                <span>قناتنا التعليمية على يوتيوب:</span>
                <span className="font-mono underline decoration-dotted font-bold text-white hover:text-secondary transition-colors">Learn to Code</span>
              </a>
            </motion.div>

            {/* Subheadline */}
            <motion.p
              variants={item}
              className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed"
            >
              للثانوية والبكالوريا والجامعة — شرح عملي من الصفر للمشاريع
            </motion.p>

            {/* Description — shorter, tighter */}
            <motion.p
              variants={item}
              className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg whitespace-pre-wrap"
            >
              {desc}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={item}
              className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1"
            >
              {/* Primary — Royal Blue gradient */}
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-primary to-blue-700 hover:from-blue-700 hover:to-primary text-white rounded-full px-7 h-12 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 w-full sm:w-auto justify-center hover:scale-[1.02]"
                data-testid="button-book-session"
              >
                <a href="#contact">احجز أول سيشن مجانًا</a>
              </Button>

              {/* Secondary — dark navy, Cyan border */}
              <Button
                asChild
                size="lg"
                className="bg-[#081527] text-slate-200 border border-secondary/35 hover:border-secondary hover:text-white rounded-full px-7 h-12 text-sm w-full sm:w-auto justify-center transition-all duration-300"
                data-testid="button-view-programs"
              >
                <a href="#courses">
                  شوف البرامج التدريبية
                  <ArrowLeft className="ms-2 w-4 h-4 shrink-0" />
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
                  <MessageCircle className="me-2 w-4 h-4 shrink-0" />
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/4 border border-white/6 text-slate-300 text-xs font-medium rounded-xl justify-center sm:justify-start"
                >
                  <badge.icon className="w-3.5 h-3.5 text-secondary shrink-0" />
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
            {/* Subtle outer glow — Cyan */}
            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-tr from-secondary/18 to-transparent blur-2xl opacity-70 pointer-events-none" />

            {/* Photo frame */}
            <div className="relative aspect-[4/5] rounded-[1.8rem] overflow-hidden shadow-2xl border border-secondary/10 group bg-[#081527] flex items-center justify-center">
              {!imageError ? (
                <img
                  src={photo}
                  alt="د. محمود المهدي — مدرب برمجة وذكاء اصطناعي"
                  fetchPriority="high"
                  decoding="async"
                  width={420}
                  height={525}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#0B1F3A] to-[#050C18]">
                  <div className="w-24 h-24 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-6">
                    <span className="text-4xl font-bold text-secondary">م</span>
                  </div>
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

              {/* Info card */}
              <div className="absolute bottom-4 right-4 left-4">
                <div className="bg-[#081527]/85 backdrop-blur-md border border-secondary/20 rounded-xl p-3.5 shadow-lg">
                  <p className="text-secondary font-bold text-base leading-tight">د. محمود المهدي</p>
                  <p className="text-slate-300 text-xs mt-0.5 leading-snug">
                    ماجستير نظم معلومات · مدرب برمجة وذكاء اصطناعي
                  </p>
                </div>
              </div>
            </div>

            {/* Thin outer border ring */}
            <div className="absolute -inset-1.5 rounded-[2rem] border border-secondary/12 pointer-events-none" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
