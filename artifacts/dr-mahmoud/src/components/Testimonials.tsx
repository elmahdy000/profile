import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "الشرح بسيط جدًا وابني بدأ يحب البرمجة.",
    author: "ولي أمر طالب",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"
  },
  {
    quote: "طريقة الدكتور منظمة وبتخلي الطالب يطبق بنفسه.",
    author: "طالب جامعي",
    avatar: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=100&q=80"
  },
  {
    quote: "أفضل تأسيس للبرمجة والكمبيوتر في الزقازيق.",
    author: "طالب مدرسة",
    avatar: "https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?w=100&q=80"
  },
  {
    quote: "المحتوى عملي ومناسب جدًا للطلبة.",
    author: "ولي أمر",
    avatar: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=100&q=80"
  }
];

export function Testimonials() {
  return (
    <section className="py-24 bg-[#0a0a0a] relative overflow-hidden">
      {/* Subtle background image */}
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
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full" />
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
              <Quote className="w-8 h-8 text-primary/30 mb-4 group-hover:text-primary/50 transition-colors" />
              <p className="text-foreground/65 font-medium leading-relaxed mb-6 flex-grow text-base">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3 mt-auto">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.author}
                  className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                />
                <span className="text-sm font-bold text-primary">{testimonial.author}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
