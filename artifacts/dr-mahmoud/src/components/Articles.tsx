import { motion } from "framer-motion";
import { ArrowLeft, Clock, FileCode2, BookOpen, GitBranch, Compass, Layers, Map } from "lucide-react";

const articles = [
  {
    category: "أساسيات",
    icon: FileCode2,
    variant: "primary" as const,
    title: "أساسيات البرمجة: من أين تبدأ؟",
    description: "دليل عملي للمبتدئ لفهم المفاهيم الأولى قبل كتابة أول سطر كود.",
    date: "10 يوليو 2026",
    readTime: "5 دقائق قراءة",
  },
  {
    category: "بكالوريا",
    icon: BookOpen,
    variant: "cyan" as const,
    title: "نصائح لطلاب البكالوريا في البرمجة",
    description: "كيف تذاكر البرمجة بذكاء وتنظّم وقتك للامتحان العملي والنظري.",
    date: "8 يوليو 2026",
    readTime: "6 دقائق قراءة",
  },
  {
    category: "إرشاد",
    icon: Compass,
    variant: "primary" as const,
    title: "كيف تختار أول لغة برمجة؟",
    description: "معايير واضحة لاختيار لغتك الأولى حسب هدفك بدون تشتيت.",
    date: "5 يوليو 2026",
    readTime: "4 دقائق قراءة",
  },
  {
    category: "تخصصات",
    icon: Layers,
    variant: "cyan" as const,
    title: "الفرق بين تخصصات علوم الحاسب",
    description: "شرح مبسّط للفروق بين علوم الحاسب والهندسة ونظم المعلومات.",
    date: "2 يوليو 2026",
    readTime: "7 دقائق قراءة",
  },
  {
    category: "مهارات",
    icon: GitBranch,
    variant: "primary" as const,
    title: "كيف يبدأ الطالب في حل المشكلات البرمجية؟",
    description: "منهجية خطوة بخطوة لتفكيك أي مسألة وتحويلها إلى كود.",
    date: "28 يونيو 2026",
    readTime: "6 دقائق قراءة",
  },
  {
    category: "مسارات",
    icon: Map,
    variant: "cyan" as const,
    title: "خريطة طريق لتعلم البرمجة من الصفر",
    description: "خطة متدرّجة تأخذك من المبتدئ إلى بناء أول مشروع حقيقي.",
    date: "24 يونيو 2026",
    readTime: "8 دقائق قراءة",
  },
];

export function Articles() {
  return (
    <section id="articles" className="py-20 lg:py-24 bg-background relative">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 max-w-2xl mx-auto"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-3 block">المدوّنة</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">المقالات والمحتوى المجاني</h2>
          <p className="text-muted-foreground text-base">مقالات مختصرة تساعدك على بناء أساس برمجي قوي والبدء في الطريق الصحيح.</p>
          <div className="w-20 h-1 bg-primary mx-auto rounded-full mt-4" />
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article, index) => {
            const IconComponent = article.icon;
            const isCyan = article.variant === "cyan";
            return (
              <motion.article
                key={article.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.06, duration: 0.5 }}
                className="group bg-card border border-border rounded-2xl overflow-hidden text-right transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 flex flex-col"
              >
                <div className="relative h-36 bg-muted flex items-center justify-center overflow-hidden">
                  <IconComponent className="w-12 h-12 text-primary/80 group-hover:scale-110 transition-transform duration-500" />
                  <span className="absolute bottom-3 start-3 font-mono text-xs text-muted-foreground/70 select-none">&lt;/&gt;</span>
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full border ${
                        isCyan
                          ? "bg-secondary/10 text-secondary border-secondary/20"
                          : "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      {article.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {article.readTime}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed flex-grow">
                    {article.description}
                  </p>

                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">{article.date}</span>
                    <a
                      href="#articles"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-primary rounded-md hover:gap-2.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      اقرأ المقال
                      <ArrowLeft className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-muted-foreground text-sm mt-10"
        >
          محتوى جديد يُضاف باستمرار — تابعنا لتصلك أحدث المقالات.
        </motion.p>
      </div>
    </section>
  );
}
