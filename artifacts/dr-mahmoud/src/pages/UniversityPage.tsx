import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MessageCircle, ArrowRight, BookOpen, GraduationCap, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  "C++ من الأساس لـ OOP",
  "Data Structures وتطبيقاتها",
  "Algorithms وتحليل التعقيد",
  "Database وSQL",
  "Discrete Mathematics",
  "جلسات فردية أو جروب صغير",
  "تحضير للامتحانات",
  "أول سيشن تقييم مجانًا",
];

const subjects = [
  "C++ / OOP",
  "Java",
  "Data Structures",
  "Algorithms",
  "Database & SQL",
  "Discrete Math",
  "Operating Systems",
  "Python",
];

const faqs = [
  {
    q: "هل بتشرح لطلاب أي جامعة في مصر؟",
    a: "نعم، أونلاين لكل الجامعات في مصر — القاهرة، الإسكندرية، الجيزة، الزقازيق وكل المحافظات.",
  },
  {
    q: "ممكن حصص خصوصي فردية؟",
    a: "أيوه، متاح حصص فردية وجروبات صغيرة — الحصص الفردية بتكون أكثر تركيزًا على احتياجك.",
  },
  {
    q: "هل بتساعد في فهم مادة بعينها قبل الامتحان؟",
    a: "نعم — تواصل معنا وحدد المادة واحنا نرتب جدول مكثف للتحضير قبل الامتحان.",
  },
  {
    q: "لو مادتي مش في القائمة؟",
    a: "تواصل معنا وهنشوف إمكانية تغطيتها — معظم مواد حاسبات ومعلومات متاحة.",
  },
];

export default function UniversityPage() {
  useEffect(() => {
    document.title = "شرح مواد حاسبات ومعلومات ومقدمة فى البرمجة | د. محمود المهدي";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'شرح مواد حاسبات ومعلومات ومقدمة فى البرمجة ومواد الجامعة الصعبة (C++, OOP, Data Structures, Algorithms, SQL, Discrete Math) مع د. محمود المهدي.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      {/* Minimal Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-white/8">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">م</div>
            <span className="font-bold text-lg text-primary">د. محمود المهدي</span>
          </a>
          <Button asChild className="bg-primary text-primary-foreground font-bold rounded-full px-5 h-9 text-sm shadow-md hover:scale-[1.03] transition-all">
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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-[120px]" />
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
              <span className="text-primary">دعم طلاب الجامعة</span>
            </div>

            <span className="inline-block px-4 py-1.5 bg-primary/12 border border-primary/30 text-primary text-xs font-bold rounded-full mb-6">
              لطلاب الجامعة — حاسبات ومعلومات وما شابه
            </span>

            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-snug">
              شرح عملي<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary/80 to-secondary/80">
                لمواد الجامعة الصعبة
              </span>
            </h1>

            <p className="text-foreground/55 text-lg max-w-xl mx-auto leading-relaxed mb-10">
              C++، Data Structures، Algorithms، Database، Discrete Math — شرح بسيط وعملي مع تمارين وتحضير للامتحانات.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-8 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                  <MessageCircle className="w-5 h-5 me-2" />
                  احجز أول سيشن مجانًا
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-transparent border border-primary/30 hover:border-primary/60 text-foreground rounded-full px-8">
                <a href="/">العودة للرئيسية</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Subjects grid */}
      <section className="border-y border-white/6 bg-[#0B111C] py-10">
        <div className="container mx-auto px-4 lg:px-8">
          <p className="text-center text-foreground/40 text-xs mb-6">المواد المتاحة</p>
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {subjects.map((s) => (
              <span key={s} className="px-3 py-1.5 bg-[#121A27] border border-primary/20 text-foreground/65 text-xs rounded-full">
                {s}
              </span>
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
              <p className="text-foreground/45 text-sm mb-8">كل حاجة هتتعلمها في مسار دعم الجامعة</p>
              <ul className="space-y-4">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-foreground/75 text-sm">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-b from-[#061827] to-[#0A1628] border-2 border-primary/40 rounded-2xl p-8 shadow-xl shadow-primary/8"
            >
              <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full mb-6">
                University Support
              </span>
              <h3 className="text-xl font-bold text-foreground mb-2">دعم طلاب الجامعة</h3>
              <p className="text-foreground/45 text-sm mb-6">
                فهم عملي للمواد الصعبة — مش حفظ ومش تلقين.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 text-sm text-foreground/55">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  شرح مبسط وعملي
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/55">
                  <Laptop className="w-4 h-4 text-primary" />
                  أونلاين لكل الجامعات
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground/55">
                  <BookOpen className="w-4 h-4 text-primary" />
                  تحضير مكثف للامتحانات
                </div>
              </div>

              <p className="text-primary font-bold text-lg mb-1">السعر بعد التقييم المجاني</p>
              <p className="text-foreground/35 text-xs mb-6">فردي أو جروب — يُحدد حسب المادة والجدول</p>

              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]">
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
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">أسئلة شائعة</h2>
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
          <h2 className="text-2xl font-bold text-foreground mb-3">عندك امتحان قريب؟</h2>
          <p className="text-foreground/45 mb-8 text-sm">تواصل دلوقتي وهنرتب جدول مناسب قبل الامتحان</p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-10 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
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
