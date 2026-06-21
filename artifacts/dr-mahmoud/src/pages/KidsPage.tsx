import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle, ArrowRight, Star, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  "Scratch للأطفال الصغار (4–8 سنين)",
  "Python مبسط للأكبر (8–18 سنة)",
  "مشاريع صغيرة وممتعة",
  "حصص أسبوعية منتظمة",
  "متابعة تقدم الطفل للوالدين",
  "أسلوب تفاعلي وغير ممل",
  "أول سيشن تقييم مجانًا",
];

const faqs = [
  {
    q: "من كام سنة ممكن ابني يبدأ؟",
    a: "من سن 4 سنين. بنستخدم Scratch مع الأطفال الصغار — بدون كتابة كود، بس بصور وألعاب.",
  },
  {
    q: "هل لازم ابني يعرف يقرأ وبكتب؟",
    a: "مش شرط للأطفال الصغار جداً — Scratch بصري بالكامل. للأطفال فوق 8 سنين بنبدأ Python بسيط.",
  },
  {
    q: "كيف بيتم المتابعة مع الوالدين؟",
    a: "بنبعت تقرير دوري عن تقدم الطفل وما تعلمه في كل حصة.",
  },
  {
    q: "الحصص حضورية ولا أونلاين؟",
    a: "متاح الاثنين — حضوري في الزقازيق وأونلاين لكل مصر.",
  },
];

export default function KidsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      {/* Minimal Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-white/8">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">م</div>
            <span className="font-bold text-lg text-primary">د. محمود المهدي</span>
          </a>
          <Button asChild className="bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] text-[#070B12] font-bold rounded-full px-5 h-9 text-sm shadow-md hover:scale-[1.03] transition-all">
            <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
              <MessageCircle className="w-4 h-4 me-2" />
              احجز تقييم مجاني
            </a>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#D6A84F]/8 rounded-full blur-[120px]" />
        </div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-foreground/40 mb-8">
              <a href="/" className="hover:text-primary transition-colors">الرئيسية</a>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span className="text-primary">برمجة الأطفال</span>
            </div>

            <span className="inline-block px-4 py-1.5 bg-[#D6A84F]/12 border border-[#D6A84F]/30 text-[#D6A84F] text-xs font-bold rounded-full mb-6">
              من سن 4 إلى 18 سنة
            </span>

            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-snug">
              تعلم البرمجة<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F2C76E] to-[#D6A84F]">
                بطريقة ممتعة للأطفال
              </span>
            </h1>

            <p className="text-foreground/55 text-lg max-w-xl mx-auto leading-relaxed mb-10">
              Scratch و Python مبسط — بأسلوب تفاعلي يخلي الطفل يتعلم ويستمتع في نفس الوقت.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] font-bold rounded-full px-8 shadow-lg shadow-[#D6A84F]/20 hover:scale-[1.02] transition-all">
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <MessageCircle className="w-5 h-5 me-2" />
                  احجز أول سيشن مجانًا
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-transparent border border-[#D6A84F]/30 hover:border-[#D6A84F]/60 text-foreground rounded-full px-8">
                <a href="/">العودة للرئيسية</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/6 bg-[#0B111C]">
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto text-center">
            {[
              { icon: Star, label: "من 4 سنين" },
              { icon: Clock, label: "حصص أسبوعية" },
              { icon: Users, label: "متابعة للوالدين" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#D6A84F]/10 border border-[#D6A84F]/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#D6A84F]" />
                </div>
                <p className="text-xs text-foreground/50">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features + CTA */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-start">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">محتوى البرنامج</h2>
              <p className="text-foreground/45 text-sm mb-8">كل حاجة هيتعلمها ابنك في برنامج البرمجة</p>
              <ul className="space-y-4">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#D6A84F] shrink-0" />
                    <span className="text-foreground/75 text-sm">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-b from-[#1A1400] to-[#121A27] border-2 border-[#D6A84F]/40 rounded-2xl p-8 shadow-xl shadow-[#D6A84F]/8"
            >
              <span className="inline-block px-3 py-1 bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] text-[#070B12] text-xs font-bold rounded-full mb-6">
                Kids Package
              </span>
              <h3 className="text-xl font-bold text-foreground mb-2">برمجة الأطفال</h3>
              <p className="text-foreground/45 text-sm mb-6">
                بنبدأ من الصفر — Scratch للصغار وPython للأكبر.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 text-sm text-foreground/55">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D6A84F]" />
                  Scratch (4–8 سنين)
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/55">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D6A84F]" />
                  Python مبسط (8–18 سنة)
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/55">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D6A84F]" />
                  متابعة دورية للوالدين
                </div>
              </div>

              <p className="text-[#D6A84F] font-bold text-lg mb-1">السعر بعد التقييم المجاني</p>
              <p className="text-foreground/35 text-xs mb-6">يُحدد حسب سن الطفل والمستوى</p>

              <Button asChild className="w-full bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] font-bold shadow-lg shadow-[#D6A84F]/20 transition-all hover:scale-[1.01]">
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <MessageCircle className="w-4 h-4 me-2" />
                  احجز تقييم مجاني
                </a>
              </Button>
              <p className="text-center text-foreground/30 text-xs mt-3">أول سيشن مجانًا — بدون التزام</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 bg-[#0B111C]">
        <div className="container mx-auto px-4 lg:px-8 max-w-2xl">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">أسئلة الوالدين</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-[#121A27] border border-white/6 rounded-xl p-5"
              >
                <p className="font-bold text-foreground/90 text-sm mb-2">{faq.q}</p>
                <p className="text-foreground/50 text-sm leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-14 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground mb-3">ابنك جاهز يبدأ؟</h2>
          <p className="text-foreground/45 mb-8 text-sm">احجز أول سيشن تقييم مجاني — هنحدد المستوى المناسب لسنه</p>
          <Button asChild size="lg" className="bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] font-bold rounded-full px-10 shadow-lg shadow-[#D6A84F]/20 hover:scale-[1.02] transition-all">
            <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
              <MessageCircle className="w-5 h-5 me-2" />
              تواصل على واتساب
            </a>
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/6 py-6 text-center text-xs text-foreground/25">
        © {new Date().getFullYear()} د. محمود المهدي — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
