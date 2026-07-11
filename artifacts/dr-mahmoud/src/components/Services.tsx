import { motion } from "framer-motion";
import { BookOpen, Award, TrendingUp, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Services() {
  const tracks = [
    {
      icon: BookOpen,
      badge: "تأسيس المدارس والثانوي",
      title: "مسار البكالوريا والتعليم المدرسي",
      target: "لطلاب البكالوريا والمرحلة الثانوية الراغبين في بناء أساس برمجي قوي متوافق مع المناهج الدراسية.",
      topics: [
        "أساسيات البرمجة بلغة Python",
        "التفكير المنطقي والرياضي الموجه للبرمجة",
        "حل المشكلات وكتابة الخوارزميات البسيطة",
        "التحضير للامتحانات المدرسية والعملية",
        "بناء مشاريع برمجية تفاعلية صغيرة"
      ],
      ctaText: "تفاصيل منهج البكالوريا",
      ctaLink: "/baccalaureate",
      color: "border-primary/30 hover:border-primary/60",
      iconBg: "bg-primary/10 text-primary",
    },
    {
      icon: Award,
      badge: "دعم حاسبات ومعلومات وهندسة",
      title: "مسار الدعم الأكاديمي لطلاب الجامعة",
      target: "لطلاب كليات علوم الحاسب والهندسة الذين يحتاجون لشرح عملي عميق لمواد التخصص ومشاريع التخرج.",
      topics: [
        "أساسيات البرمجة والبرمجة الشيئية (C++ / Java / OOP)",
        "هياكل البيانات والخوارزميات (Data Structures & Algorithms)",
        "تصميم وإدارة قواعد البيانات (SQL & Database Design)",
        "الرياضيات المتقطعة ونظرية الآلات (Discrete Math & Automata)",
        "شرح أنظمة التشغيل وشبكات الحاسب"
      ],
      ctaText: "شاهد مناهج الجامعة",
      ctaLink: "/curriculum",
      color: "border-secondary/30 hover:border-secondary/60",
      iconBg: "bg-secondary/10 text-secondary",
    },
    {
      icon: TrendingUp,
      badge: "التأهيل لسوق العمل والاحتراف",
      title: "مسار التطوير المهني المتقدم",
      target: "للخريجين والمطورين الباحثين عن احتراف تكنولوجيا مطلوبة في سوق العمل وبناء بورتفوليو قوي.",
      topics: [
        "تطوير تطبيقات الموبايل باستخدام Flutter & Dart",
        "تطوير تطبيقات الأندرويد الأصيلة (Android Native - Kotlin/Java)",
        "تطوير الويب المتكامل وتطبيقات الـ Fullstack",
        "تأسيس الذكاء الاصطناعي وتعلم الآلة (AI & Machine Learning)",
        "التوجيه المهني وبناء السيرة الذاتية البرمجية"
      ],
      ctaText: "تواصل واستفسر الآن",
      ctaLink: "https://wa.me/201044348610",
      external: true,
      color: "border-primary/30 hover:border-primary/60",
      iconBg: "bg-primary/10 text-primary",
    }
  ];

  return (
    <section id="learning-tracks" className="py-20 lg:py-24 bg-muted/30 relative border-y border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 max-w-2xl mx-auto"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-3 block">المسارات التعليمية</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">اختر طريقك لاحتراف البرمجة</h2>
          <p className="text-muted-foreground text-base">برامج تدريبية متخصصة ومصممة بعناية لتناسب أهدافك الأكاديمية والمهنية، مع متابعة شخصية مستمرة.</p>
          <div className="w-20 h-1 bg-primary mx-auto rounded-full mt-4" />
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tracks.map((track, index) => {
            const IconComponent = track.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={`group bg-card border ${track.color} rounded-2xl p-6 md:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
              >
                <div>
                  {/* Badge & Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[11px] font-bold px-3 py-1 bg-muted text-muted-foreground rounded-full">
                      {track.badge}
                    </span>
                    <div className={`w-12 h-12 rounded-xl ${track.iconBg} flex items-center justify-center font-bold`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {track.title}
                  </h3>

                  {/* Target text */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {track.target}
                  </p>

                  {/* Topics List */}
                  <ul className="space-y-3 mb-8">
                    {track.topics.map((topic, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-xs md:text-sm text-foreground/75 font-medium leading-normal">{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <Button
                  asChild
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 font-bold py-5 rounded-xl text-xs md:text-sm flex items-center justify-center gap-1.5"
                >
                  <a
                    href={track.ctaLink}
                    target={track.external ? "_blank" : undefined}
                    rel={track.external ? "noreferrer" : undefined}
                  >
                    {track.ctaText}
                    <ArrowLeft className="w-4 h-4" />
                  </a>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

