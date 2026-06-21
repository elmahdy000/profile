import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    q: "هل د. محمود المهدي بيدرس طلاب الثانوية العامة والبكالوريا؟",
    a: "نعم، د. محمود المهدي متخصص في تدريس البرمجة لطلاب الثانوية العامة والبكالوريا — الصف الأول والثاني والثالث الثانوي. يدرّس Python، C++، وأساسيات البرمجة بأسلوب مبسط يناسب المناهج الدراسية ويساعد الطالب على الفهم العميق وليس الحفظ."
  },
  {
    q: "ما هي كورسات البرمجة المتاحة للصف الثاني الثانوي في الزقازيق؟",
    a: "متاح كورس Baccalaureate Programming مصمم لطلاب الصف الثاني والثالث الثانوي والبكالوريا، يشمل: أساسيات البرمجة، Python، logic، problem solving، وتمارين عملية متوافقة مع المنهج. يُعقد الكورس في Eduverse بفلل الجامعة، الزقازيق."
  },
  {
    q: "كيف أتواصل مع د. محمود المهدي لحجز كورس برمجة؟",
    a: "يمكنك التواصل مباشرة على واتساب 01044348610 لحجز أول سيشن مجانًا. الموقع في Eduverse، فلل الجامعة، الزقازيق."
  },
  {
    q: "الكورسات بتتعمل أونلاين ولا حضوري في الزقازيق؟",
    a: "الكورسات متاحة حضوريًا في مقر Eduverse بفلل الجامعة، الزقازيق. تواصل معنا لمعرفة إمكانية الجلسات الأونلاين."
  },
  {
    q: "إيه هي أسعار كورسات البرمجة عند د. محمود المهدي؟",
    a: "الأسعار بتختلف حسب نوع الكورس وعدد الجلسات. تواصل معنا واحجز أول سيشن مجانًا وهنحدد البرنامج والسعر المناسب لك. الأول سيشن مجانًا في كل البرامج بدون أي التزام."
  },
  {
    q: "من كام سنة ممكن ابني يبدأ البرمجة مع د. محمود المهدي؟",
    a: "Kids Programming Package مصمم للأطفال من سن 4 سنين. بنستخدم Scratch اللي مخصوص للأطفال الصغار بطريقة تفاعلية وممتعة. للأطفال الأكبر من 10 سنين بنبدأ Python basics ومشاريع حقيقية."
  },
  {
    q: "هل في شهادات بعد الكورس وهل ICDL معترف بيه؟",
    a: "بنقدم شهادة إتمام الكورس. بالنسبة لـ ICDL، بيتم التحضير الكامل للامتحان الرسمي المعترف بيه دوليًا ويُعتمد في التوظيف والجامعات."
  },
  {
    q: "إيه الفرق بين كورسات د. محمود المهدي وأماكن البرمجة التانية في الزقازيق؟",
    a: "الأسلوب عملي 100% — مفيش حفظ ولا تلقين. كل طالب بيطلع بمشروع حقيقي في إيده. الشرح بسيط ومنظم ومناسب لكل المستويات من الأطفال للجامعة. د. محمود حاصل على ماجستير نظم معلومات وعنده خبرة أكاديمية وتدريبية متخصصة."
  },
  {
    q: "هل ممكن حصص برمجة خصوصي فردية في الزقازيق؟",
    a: "أيوه، متاح حصص فردية وجروبات صغيرة. الحصص الفردية بتكون أكثر تركيزًا على احتياج الطالب بالتحديد، سواء كان طالب ثانوي يحتاج تدريب على البرمجة أو طالب جامعي في مادة محددة."
  },
  {
    q: "هل ممكن كورسات برمجة أونلاين للي مش في الزقازيق؟",
    a: "أيوه، د. محمود المهدي بيقدم كورسات برمجة أونلاين عبر الإنترنت لكل محافظات مصر: القاهرة، الإسكندرية، الجيزة، المنصورة، طنطا، أسيوط، سوهاج، المنيا وكل باقي المحافظات. نفس الجودة والأسلوب العملي مع حصص مسجلة ومتابعة مستمرة."
  },
  {
    q: "هل د. محمود بيشرح مواد حاسبات ومعلومات للجامعة؟",
    a: "أيوه، د. محمود المهدي متخصص في شرح كل مواد قسم حاسبات ومعلومات: C++، Java، OOP، Data Structures، Algorithms، Database، SQL، Discrete Math، Operating Systems. الشرح أونلاين لكل الجامعات في مصر."
  },
  {
    q: "هل في تدريس Flutter و Android لبناء تطبيقات موبايل؟",
    a: "أيوه، متاح كورس Flutter Development لبناء تطبيقات iOS و Android باستخدام Dart و Flutter، وكورس Android Native بـ Java و Kotlin. الكورسات متاحة حضوريًا في الزقازيق وأونلاين لكل مصر."
  },
  {
    q: "هل بيتم تدريس مواد الجامعة زي Data Structures و Algorithms؟",
    a: "أيوه، بندرّس C++، OOP، Data Structures، Algorithms، Database، و Discrete Math لطلاب الجامعة. لو عندك مادة تانية تواصل معنا ونشوف إمكانية تغطيتها."
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
