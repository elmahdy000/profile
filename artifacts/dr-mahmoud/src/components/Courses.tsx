import { motion } from "framer-motion";
import { Clock, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const courses = [
  {
    title: "Kids Programming Package",
    age: "من 4 إلى 18 سنة",
    duration: "3 أشهر",
    sessions: "12 حصة",
    level: "مبتدئ",
    tags: ["Scratch", "Python basics", "AI basics", "mini projects", "creative thinking"],
    img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=70"
  },
  {
    title: "Python Track",
    age: "من الصفر",
    duration: "شهرين",
    sessions: "16 حصة",
    level: "مبتدئ → متوسط",
    tags: ["Variables", "Conditions", "Loops", "Functions", "Lists", "Problem Solving", "Projects"],
    img: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&q=70"
  },
  {
    title: "ICDL Practical Track",
    age: "جميع المستويات",
    duration: "شهر ونص",
    sessions: "10 حصص",
    level: "مبتدئ",
    tags: ["Word", "PowerPoint", "Excel", "presentations", "reports", "spreadsheets"],
    img: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=400&q=70"
  },
  {
    title: "AI Starter Track",
    age: "للمبتدئين والطلاب",
    duration: "شهر",
    sessions: "8 حصص",
    level: "مبتدئ",
    tags: ["AI concepts", "tools", "prompts", "practical use cases", "student projects"],
    img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&q=70"
  },
  {
    title: "University Support",
    age: "طلاب الجامعة",
    duration: "حسب المادة",
    sessions: "جلسات فردية",
    level: "متوسط → متقدم",
    tags: ["C++", "OOP", "Data Structures", "Algorithms", "Database", "Discrete Math"],
    img: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=70"
  },
  {
    title: "Baccalaureate Programming",
    age: "طلاب البكالوريا",
    duration: "شهرين",
    sessions: "14 حصة",
    level: "مبتدئ → متوسط",
    tags: ["Programming basics", "logic", "Python", "problem solving", "practical exercises"],
    img: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&q=70"
  }
];

export function Courses() {
  return (
    <section id="courses" className="py-24 bg-[#0f0f0f]">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">المسارات</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">الكورسات والمسارات التدريبية</h2>
          <p className="text-foreground/50 mt-2">احجز أول سيشن مجانًا لتحديد البرنامج المناسب</p>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full mt-4" />
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group bg-card border border-white/10 rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 flex flex-col"
              data-testid={`card-course-${index}`}
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={course.img}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
                <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  {course.age}
                </span>
              </div>

              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>

                <div className="flex flex-wrap gap-3 mb-3 text-xs text-foreground/55">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary/70" />
                    {course.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-primary/70" />
                    {course.sessions}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-primary/70" />
                    {course.level}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-5 flex-grow">
                  {course.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/10 text-foreground/55 text-xs rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>

                <Button
                  asChild
                  className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 hover:border-primary transition-all duration-300 font-bold"
                  data-testid={`button-enroll-${index}`}
                >
                  <a href="#contact">احجز مجانًا للاستفسار</a>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
