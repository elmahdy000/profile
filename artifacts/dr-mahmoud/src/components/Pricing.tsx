import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

const defaultPlans = [
  {
    id: "kids",
    name: "Kids Package",
    subtitle: "للأطفال من 4 إلى 18 سنة",
    headline: "تعلم البرمجة بطريقة ممتعة",
    desc: null,
    badge: null,
    featured: false,
    features: [
      "Scratch + Python مبسط",
      "مشاريع صغيرة",
      "حصص أسبوعية",
      "متابعة للوالدين",
      "أول سيشن تقييم مجانًا",
    ],
  },
  {
    id: "bac",
    name: "تأسيس البكالوريا",
    subtitle: "للصف الأول والثاني والثالث الثانوي",
    headline: "ابدأ صح من الأول",
    desc: "شرح عملي للبرمجة خطوة بخطوة بدون تعقيد.",
    badge: "مناسب للبكالوريا",
    featured: true,
    features: [
      "أساسيات البرمجة",
      "Python خطوة بخطوة",
      "حل تدريبات عملية",
      "متابعة مستوى الطالب",
      "تجهيز للامتحانات",
      "أول سيشن تقييم مجانًا",
    ],
  },
  {
    id: "ai",
    name: "Python & AI Track",
    subtitle: "من الصفر للمشاريع",
    headline: "تعلم عملي بمشروع حقيقي",
    desc: null,
    badge: null,
    featured: false,
    features: [
      "Python من الأساس",
      "ذكاء اصطناعي تطبيقي",
      "تدريبات عملية",
      "مشروع في النهاية",
      "أول سيشن تقييم مجانًا",
    ],
  },
  {
    id: "uni",
    name: "University Support",
    subtitle: "لطلاب الجامعة",
    headline: "شرح عملي للمواد الصعبة",
    desc: null,
    badge: null,
    featured: false,
    features: [
      "C++ / OOP / Data Structures",
      "Algorithms & Database",
      "Discrete Math",
      "تحضير للامتحانات",
      "جلسات فردية أو جروب",
      "أول سيشن تقييم مجانًا",
    ],
  },
];

export function Pricing() {
  const { getJson } = useSiteSettings();
  const plans = getJson(SETTINGS_KEYS.PRICING_LIST, defaultPlans);

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-[#070B12] relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/6 rounded-full blur-[140px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-3 block">
            المسارات
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            اختار المسار اللي يناسبك
          </h2>
          <p className="text-slate-400 text-base max-w-lg mx-auto leading-relaxed">
            أول سيشن تقييم مجانية علشان نحدد المستوى والخطة المناسبة.
          </p>
          <div className="w-20 h-0.5 bg-gradient-to-r from-primary/80 to-secondary/80 mx-auto rounded-full mt-5" />
        </motion.div>

        {/* Cards grid — 4 cols on lg, 2 on md, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${
                plan.featured
                  ? "bg-gradient-to-b from-[#061827] to-[#0A1628] border-2 border-primary/50 shadow-xl shadow-primary/10 ring-1 ring-[#06B6D4]/20"
                  : "bg-[#141D2E] border border-white/12 hover:border-primary/40 hover:shadow-lg hover:shadow-[#06B6D4]/5"
              }`}
            >
              {/* Featured badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-md whitespace-nowrap">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Card header */}
              <div className={`mb-5 ${plan.badge ? "mt-3" : ""}`}>
                <h3
                  className={`text-lg font-bold mb-1 ${
                    plan.featured ? "text-primary" : "text-white"
                  }`}
                >
                  {plan.name}
                </h3>
                <p className="text-xs text-slate-300 mb-3">{plan.subtitle}</p>

                {/* Headline value line */}
                <p
                  className={`text-sm font-semibold leading-snug ${
                    plan.featured ? "text-primary" : "text-slate-100"
                  }`}
                >
                  {plan.headline}
                </p>

                {/* Optional short description */}
                {plan.desc && (
                  <p className="text-xs text-foreground/60 mt-2 leading-relaxed">
                    {plan.desc}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div
                className={`w-full h-px mb-5 ${
                  plan.featured
                    ? "bg-gradient-to-r from-transparent via-[#06B6D4]/30 to-transparent"
                    : "bg-border"
                }`}
              />

              {/* Features list */}
              <ul className="space-y-2.5 flex-grow mb-7">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-xs text-slate-200"
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        plan.featured ? "text-primary" : "text-primary/60"
                      }`}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                asChild
                className={`w-full font-bold text-sm transition-all duration-300 ${
                  plan.featured
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.01]"
                    : "bg-transparent text-primary border border-primary/30 hover:border-primary/60 hover:bg-primary/6"
                }`}
              >
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <MessageCircle className="w-4 h-4 me-2" />
                  احجز تقييم مجاني
                </a>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-slate-400 text-xs mt-10"
        >
          السعر يُحدد بعد جلسة التقييم المجانية حسب المستوى والبرنامج
        </motion.p>
      </div>
    </section>
  );
}
