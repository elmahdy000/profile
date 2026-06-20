import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    q: "الكورسات بتتعمل أونلاين ولا حضوري؟",
    a: "الكورسات متاحة حضوريًا في مقر Eduverse بفلل الجامعة، الزقازيق. تواصل معنا لمعرفة إمكانية الجلسات الأونلاين."
  },
  {
    q: "إيه هي أسعار الكورسات؟",
    a: "الأسعار بتختلف حسب نوع الكورس وعدد الجلسات. تواصل معنا واحجز أول سيشن مجانًا وهنحدد البرنامج والسعر المناسب لك."
  },
  {
    q: "من كام سنة ممكن ابني يبدأ البرمجة؟",
    a: "Kids Programming Package مصمم للأطفال من سن 4 سنين. بنستخدم Scratch اللي مخصوص للأطفال الصغار بطريقة تفاعلية وممتعة."
  },
  {
    q: "هل في شهادات بعد الكورس؟",
    a: "بنقدم شهادة إتمام الكورس. بالنسبة لـ ICDL، بيتم التحضير للامتحان الرسمي المعترف بيه دوليًا."
  },
  {
    q: "إيه الفرق بين كورسات د. محمود وأي مكان تاني؟",
    a: "الأسلوب عملي 100% — مفيش حفظ ولا تلقين. كل طالب بيطلع بمشروع حقيقي في إيده. الشرح بسيط ومنظم ومناسب لكل المستويات."
  },
  {
    q: "إيه المواعيد المتاحة؟",
    a: "المواعيد مرنة ومتفق عليها مع الطالب. تواصل معنا على واتساب وهنحدد الميعاد المناسب ليك."
  },
  {
    q: "هل ممكن حصص خصوصي فردية؟",
    a: "أيوه، متاح حصص فردية وجروبات صغيرة. الحصص الفردية بتكون أكثر تركيزًا على احتياج الطالب بالتحديد."
  },
  {
    q: "هل بيتم تدريس طلاب الجامعة في مواد معينة بس؟",
    a: "بندرّس C++، OOP، Data Structures، Algorithms، Database، وDiscrete Math. لو عندك مادة تانية تواصل معنا ونشوف إمكانية تغطيتها."
  }
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-[#0a0a0a]">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">الأسئلة الشائعة</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">أسئلة بتتكرر كتير</h2>
          <p className="text-foreground/50 text-lg">لو مش لاقي إجابتك، تواصل معنا مباشرة</p>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full mt-4" />
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border border-white/10 rounded-2xl overflow-hidden hover:border-primary/20 transition-colors"
            >
              <button
                onClick={() => setOpen(open === index ? null : index)}
                className="w-full flex items-center justify-between gap-4 p-5 text-right"
              >
                <span className="font-bold text-foreground/90 text-base leading-snug">{faq.q}</span>
                <motion.div
                  animate={{ rotate: open === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0"
                >
                  <ChevronDown className="w-5 h-5 text-primary" />
                </motion.div>
              </button>

              <AnimatePresence>
                {open === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-5 pb-5 border-t border-white/5">
                      <p className="text-foreground/60 leading-relaxed pt-4 text-sm">{faq.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-foreground/45 mb-4">عندك سؤال تاني؟</p>
          <Button asChild size="lg" className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-full px-8">
            <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
              <MessageCircle className="w-5 h-5 me-2" />
              اسأل على واتساب
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
