import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    quote: "الشرح بسيط جدًا وابني بدأ يحب البرمجة بعد أسبوعين بس. الأسلوب العملي مختلف تمامًا عن أي مكان تاني.",
    author: "أم أحمد",
    role: "ولية أمر طالب 10 سنين",
    stars: 5,
    initials: "أ"
  },
  {
    quote: "طريقة الدكتور منظمة جدًا وبتخلي الطالب يطبق بنفسه من أول يوم. خلصت الكورس وعندي مشروع حقيقي في إيدي.",
    author: "محمد سالم",
    role: "طالب جامعة — Python Track",
    stars: 5,
    initials: "م"
  },
  {
    quote: "أفضل تأسيس للبرمجة في الزقازيق. فضلت أدور ومالقتش حاجة زي د. محمود في الأسلوب والصبر مع الطلبة.",
    author: "علي حسن",
    role: "طالب ثانوي",
    stars: 5,
    initials: "ع"
  },
  {
    quote: "ابنتي اتعلمت Scratch و Python في 3 شهور وعملت مشروع كامل. الدكتور بيعرف يتعامل مع الأطفال بشكل ممتاز.",
    author: "أبو يوسف",
    role: "ولي أمر — Kids Package",
    stars: 5,
    initials: "ي"
  }
];

export function Testimonials() {
  return (
    <section className="py-24 bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <img
          src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1400&q=50"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">الآراء</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">آراء الطلاب وأولياء الأمور</h2>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className="w-5 h-5 fill-primary text-primary" />
            ))}
          </div>
          <p className="text-foreground/45 text-sm">تقييم ممتاز من طلابنا</p>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full mt-4" />
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-white/10 p-6 rounded-2xl flex flex-col h-full hover:border-primary/30 transition-all duration-300 group"
              data-testid={`card-testimonial-${index}`}
            >
              <Quote className="w-8 h-8 text-primary/30 mb-3 group-hover:text-primary/50 transition-colors" />

              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: testimonial.stars }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>

              <p className="text-foreground/65 font-medium leading-relaxed mb-6 flex-grow text-sm">
                "{testimonial.quote}"
              </p>

              <div className="flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-sm">{testimonial.initials}</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-foreground block">{testimonial.author}</span>
                  <span className="text-xs text-foreground/45">{testimonial.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
