import { motion } from "framer-motion";
import { MonitorPlay, Terminal, Lightbulb, FileText, GraduationCap, Code2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function Services() {
  const services = [
    {
      icon: MonitorPlay,
      title: "Programming for Kids",
      description: "تعليم الأطفال البرمجة بطريقة ممتعة وتفاعلية باستخدام Scratch وPython ومشاريع بسيطة مناسبة للسن."
    },
    {
      icon: Terminal,
      title: "Python & Problem Solving",
      description: "تأسيس قوي في Python والتفكير البرمجي وحل المشكلات من الصفر حتى المشاريع العملية."
    },
    {
      icon: Lightbulb,
      title: "AI Basics",
      description: "تعليم مبادئ الذكاء الاصطناعي وأدواته واستخداماته بطريقة بسيطة تناسب الطلاب والمبتدئين."
    },
    {
      icon: FileText,
      title: "ICDL Skills",
      description: "تدريب عملي على Word وPowerPoint وExcel لاستخدامهم في الدراسة والشغل والعروض الاحترافية."
    },
    {
      icon: GraduationCap,
      title: "University Courses",
      description: "شرح عملي لمواد C++ وOOP وData Structures وAlgorithms وDatabase وDiscrete Math."
    },
    {
      icon: Code2,
      title: "Baccalaureate Programming",
      description: "تأسيس طلاب البكالوريا في البرمجة من الصفر بأسلوب واضح ومنظم ومناسب للمنهج."
    }
  ];

  return (
    <section id="services" className="py-24 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">البرامج والخدمات التعليمية</h2>
          <div className="w-24 h-1 bg-accent mx-auto rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-transparent group-hover:bg-accent transition-colors duration-300" />
                <CardHeader>
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                    <service.icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl text-primary font-bold">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-foreground/70 leading-relaxed">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
