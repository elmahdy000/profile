import { motion } from "framer-motion";
import { MonitorPlay, Terminal, Lightbulb, FileText, GraduationCap, Code2, HelpCircle, type LucideIcon } from "lucide-react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

const iconMap: Record<string, LucideIcon> = {
  MonitorPlay,
  Terminal,
  Lightbulb,
  FileText,
  GraduationCap,
  Code2,
};

const defaultServices = [
  {
    icon: "MonitorPlay",
    title: "Programming for Kids",
    description: "تعليم الأطفال البرمجة بطريقة ممتعة وتفاعلية باستخدام Scratch و Python ومشاريع بسيطة مناسبة للسن.",
    img: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=400&q=70"
  },
  {
    icon: "Terminal",
    title: "Python & Problem Solving",
    description: "تأسيس قوي في Python والتفكير البرمجي وحل المشكلات من الصفر حتى المشاريع العملية.",
    img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=70"
  },
  {
    icon: "Lightbulb",
    title: "AI Basics",
    description: "تعليم مبادئ الذكاء الاصطناعي وأدواته واستخداماته بطريقة بسيطة تناسب الطلاب والمبتدئين.",
    img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&q=70"
  },
  {
    icon: "FileText",
    title: "ICDL Skills",
    description: "تدريب عملي على Word و PowerPoint و Excel لاستخدامهم في الدراسة والشغل والعروض الاحترافية.",
    img: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&q=70"
  },
  {
    icon: "GraduationCap",
    title: "University Courses",
    description: "شرح عملي لمواد C++ و OOP و Data Structures و Algorithms و Database و Discrete Math.",
    img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=70"
  },
  {
    icon: "Code2",
    title: "Baccalaureate Programming",
    description: "تأسيس طلاب البكالوريا في البرمجة من الصفر بأسلوب واضح ومنظم ومناسب للمنهج.",
    img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&q=70"
  }
];

export function Services() {
  const { getJson } = useSiteSettings();
  const services = getJson(SETTINGS_KEYS.SERVICES_LIST, defaultServices);

  return (
    <section id="services" className="py-20 lg:py-24 bg-muted relative">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">ما نقدمه</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">البرامج والخدمات التعليمية</h2>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const IconComponent = iconMap[service.icon] || HelpCircle;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group relative bg-card border border-white/10 rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              >
                {/* Top image */}
                <div className="relative h-44 overflow-hidden bg-white/5">
                  <img
                    src={service.img}
                    alt={service.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />
                  <div className="absolute top-4 right-4 w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 backdrop-blur-sm flex items-center justify-center">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-sm text-foreground/55 leading-relaxed">{service.description}</p>
                </div>

                {/* Cyan bottom accent on hover */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

