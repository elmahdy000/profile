import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Kids Package",
    subtitle: "للأطفال من 4 إلى 18 سنة",
    price: "تواصل للسعر",
    note: "حسب العمر والمستوى",
    color: "border-white/10",
    badge: null,
    features: [
      "Scratch + Python مبسّط",
      "مشاريع إبداعية",
      "حصص أسبوعية",
      "تقرير تقدم للوالدين",
      "أول سيشن مجانًا"
    ]
  },
  {
    name: "Python & AI Track",
    subtitle: "من الصفر للمشاريع الحقيقية",
    price: "تواصل للسعر",
    note: "أفضل قيمة",
    color: "border-primary/60",
    badge: "الأكثر طلبًا",
    features: [
      "Python من الأساس",
      "ذكاء اصطناعي تطبيقي",
      "مشروع حقيقي في النهاية",
      "حصص عملية 100%",
      "أول سيشن مجانًا"
    ]
  },
  {
    name: "University Support",
    subtitle: "طلاب الجامعة والبكالوريا",
    price: "تواصل للسعر",
    note: "جلسات فردية أو جروب",
    color: "border-white/10",
    badge: null,
    features: [
      "C++ / OOP / Data Structures",
      "Algorithms & Database",
      "Discrete Math",
      "تحضير للامتحانات",
      "أول سيشن مجانًا"
    ]
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-[#0f0f0f] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">الأسعار</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">اختار البرنامج المناسب</h2>
          <p className="text-foreground/50 text-lg max-w-xl mx-auto">
            الأسعار مرنة ومتفق عليها حسب البرنامج والمستوى — تواصل معنا واحجز أول سيشن مجانًا
          </p>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full mt-4" />
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-card border-2 ${plan.color} rounded-3xl p-7 flex flex-col hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 ${plan.badge ? "scale-[1.02]" : ""}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg shadow-primary/30">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-1">{plan.name}</h3>
                <p className="text-sm text-foreground/50">{plan.subtitle}</p>
              </div>

              <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">{plan.price}</span>
                </div>
                <p className="text-xs text-foreground/40 mt-1">{plan.note}</p>
              </div>

              <ul className="space-y-3 flex-grow mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-foreground/70">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`w-full font-bold ${
                  plan.badge
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-white/5 hover:bg-primary/10 text-foreground border border-white/10 hover:border-primary/40"
                }`}
              >
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <MessageCircle className="w-4 h-4 me-2" />
                  احجز مجانًا
                </a>
              </Button>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-foreground/35 text-sm mt-10"
        >
          ✅ أول سيشن مجانًا في كل البرامج — بدون التزام
        </motion.p>
      </div>
    </section>
  );
}
