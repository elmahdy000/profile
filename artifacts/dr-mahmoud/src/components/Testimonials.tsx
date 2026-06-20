import { motion } from "framer-motion";
import { Quote } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      quote: "الشرح بسيط جدًا وابني بدأ يحب البرمجة.",
      author: "ولي أمر طالب"
    },
    {
      quote: "طريقة الدكتور منظمة وبتخلي الطالب يطبق بنفسه.",
      author: "طالب جامعي"
    },
    {
      quote: "أفضل تأسيس للبرمجة والكمبيوتر في الزقازيق.",
      author: "طالب مدرسة"
    },
    {
      quote: "المحتوى عملي ومناسب جدًا للطلبة.",
      author: "ولي أمر"
    }
  ];

  return (
    <section className="py-24 bg-primary/[0.03]">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">آراء الطلاب وأولياء الأمور</h2>
          <div className="w-24 h-1 bg-accent mx-auto rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-border/50 flex flex-col h-full"
            >
              <Quote className="w-8 h-8 text-accent/40 mb-4" />
              <p className="text-foreground/80 font-medium leading-relaxed mb-6 flex-grow">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {testimonial.author.charAt(0)}
                </div>
                <span className="text-sm font-bold text-primary">{testimonial.author}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
