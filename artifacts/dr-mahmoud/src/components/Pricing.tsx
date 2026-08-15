import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

const defaultPlans = [
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
      "معاينة مجانية للمحتوى",
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
      "تأهيل سوق العمل",
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
    ],
  },
];

export function Pricing() {
  const { getJson } = useSiteSettings();
  const rawPlans = getJson(SETTINGS_KEYS.PRICING_LIST, defaultPlans);
  const plans = (Array.isArray(rawPlans) ? rawPlans : defaultPlans).filter((p: any) => p.id !== "kids");

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-muted/40 border-t border-border relative overflow-hidden">
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
            المسارات التعليمية
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            اختر المسار الذي يناسبك
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
            سجل حسابك على المنصة وتواصل مع أرقام الحجز لتأكيد تفعيل اشتراكك في المسار المناسب.
          </p>
          <div className="w-20 h-0.5 bg-primary/60 mx-auto rounded-full mt-5" />
        </motion.div>

        {/* Cards grid — 3 cols on lg, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan: any, index: number) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 ${
                plan.featured
                  ? "bg-primary/5 border-2 border-primary/50 shadow-xl shadow-primary/10"
                  : "bg-card border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
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
                    plan.featured ? "text-primary" : "text-foreground"
                  }`}
                >
                  {plan.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">{plan.subtitle}</p>

                {/* Headline value line */}
                <p
                  className={`text-sm font-semibold leading-snug ${
                    plan.featured ? "text-primary" : "text-foreground/80"
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
                className="w-full h-px mb-5 bg-border"
              />

              {/* Features list */}
              <ul className="space-y-2.5 flex-grow mb-7">
                {(plan.features || []).map((f: string) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-xs text-foreground/80"
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
                <a href="/platform?action=register">
                  <MessageCircle className="w-4 h-4 me-2" />
                  سجّل بالمنصة للتواصل والحجز
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
          className="text-center text-muted-foreground text-xs mt-10"
        >
          السعر يُحدد بعد جلسة التقييم المجانية حسب المستوى والبرنامج
        </motion.p>
      </div>
    </section>
  );
}
