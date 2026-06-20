import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, BookOpen, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListCourses } from "@workspace/api-client-react";

const categories = [
  { id: "all", label: "الكل" },
  { id: "kids", label: "الأطفال" },
  { id: "python", label: "Python" },
  { id: "db", label: "قواعد البيانات" },
  { id: "mobile", label: "تطبيقات موبايل" },
  { id: "ai", label: "الذكاء الاصطناعي" },
  { id: "university", label: "الجامعة" },
  { id: "icdl", label: "ICDL" },
];

const courses = [
  {
    title: "Kids Programming Package",
    age: "من 4 إلى 18 سنة",
    duration: "3 أشهر",
    sessions: "12 حصة",
    level: "مبتدئ",
    category: "kids",
    tags: ["Scratch", "Python basics", "AI basics", "mini projects", "creative thinking"],
    img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=70"
  },
  {
    title: "Python Track",
    age: "من الصفر",
    duration: "شهرين",
    sessions: "16 حصة",
    level: "مبتدئ → متوسط",
    category: "python",
    tags: ["Variables", "Conditions", "Loops", "Functions", "Lists", "OOP", "Problem Solving"],
    img: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&q=70"
  },
  {
    title: "SQL & Database Design",
    age: "جميع المستويات",
    duration: "شهرين",
    sessions: "16 حصة",
    level: "مبتدئ → متوسط",
    category: "db",
    tags: ["SQL", "SQL Server", "MySQL", "Database Design", "ERD", "Joins", "Stored Procedures", "Indexes"],
    img: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&q=70"
  },
  {
    title: "Flutter Development",
    age: "للمبتدئين والمحترفين",
    duration: "3 أشهر",
    sessions: "20 حصة",
    level: "مبتدئ → متقدم",
    category: "mobile",
    tags: ["Dart", "Flutter", "Widgets", "State Management", "APIs", "Firebase", "iOS & Android"],
    img: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&q=70"
  },
  {
    title: "Android Native",
    age: "للمبتدئين والمحترفين",
    duration: "3 أشهر",
    sessions: "20 حصة",
    level: "مبتدئ → متقدم",
    category: "mobile",
    tags: ["Java", "Kotlin", "Android Studio", "XML Layouts", "Activities", "APIs", "Firebase"],
    img: "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&q=70"
  },
  {
    title: "C++ Programming",
    age: "طلاب الجامعة والثانوي",
    duration: "شهرين",
    sessions: "14 حصة",
    level: "مبتدئ → متقدم",
    category: "university",
    tags: ["C++ Basics", "OOP", "Pointers", "Data Structures", "Algorithms", "STL", "Problem Solving"],
    img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=70"
  },
  {
    title: "Java Programming",
    age: "طلاب الجامعة والمحترفون",
    duration: "شهرين",
    sessions: "16 حصة",
    level: "مبتدئ → متقدم",
    category: "university",
    tags: ["Java Basics", "OOP", "Collections", "Generics", "Exception Handling", "Design Patterns"],
    img: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=400&q=70"
  },
  {
    title: "AI Starter Track",
    age: "للمبتدئين والطلاب",
    duration: "شهر",
    sessions: "8 حصص",
    level: "مبتدئ",
    category: "ai",
    tags: ["AI concepts", "Machine Learning basics", "Prompting", "ChatGPT", "Practical tools", "Projects"],
    img: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&q=70"
  },
  {
    title: "Python for Data & AI",
    age: "من الصفر للاحتراف",
    duration: "3 أشهر",
    sessions: "20 حصة",
    level: "متوسط → متقدم",
    category: "ai",
    tags: ["Python", "NumPy", "Pandas", "Matplotlib", "Scikit-learn", "ML Models", "Real Projects"],
    img: "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=400&q=70"
  },
  {
    title: "ICDL Practical Track",
    age: "جميع المستويات",
    duration: "شهر ونص",
    sessions: "10 حصص",
    level: "مبتدئ",
    category: "icdl",
    tags: ["Word", "PowerPoint", "Excel", "presentations", "reports", "spreadsheets"],
    img: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=400&q=70"
  },
  {
    title: "University Support",
    age: "طلاب الجامعة",
    duration: "حسب المادة",
    sessions: "جلسات فردية",
    level: "متوسط → متقدم",
    category: "university",
    tags: ["C++", "OOP", "Data Structures", "Algorithms", "Database", "Discrete Math"],
    img: "https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=70"
  },
  {
    title: "Baccalaureate Programming",
    age: "طلاب البكالوريا",
    duration: "شهرين",
    sessions: "14 حصة",
    level: "مبتدئ → متوسط",
    category: "university",
    tags: ["Programming basics", "logic", "Python", "problem solving", "practical exercises"],
    img: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&q=70"
  }
];

export function Courses() {
  const [active, setActive] = useState("all");
  const { data: dbCourses } = useListCourses();

  const activeCourses = dbCourses && dbCourses.length > 0 ? dbCourses : courses;
  const filtered = active === "all" ? activeCourses : activeCourses.filter(c => c.category === active);

  return (
    <section id="courses" className="py-24 bg-[#0f0f0f]">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">المسارات</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">الكورسات والمسارات التدريبية</h2>
          <p className="text-foreground/50 mt-2">احجز أول سيشن مجانًا لتحديد البرنامج المناسب</p>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full mt-4" />
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border ${
                active === cat.id
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                  : "bg-white/5 text-foreground/60 border-white/10 hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat.label}
              {cat.id !== "all" && (
                <span className="mr-1.5 text-xs opacity-60">
                  ({courses.filter(c => c.category === cat.id).length})
                </span>
              )}
            </button>
          ))}
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((course, index) => (
              <motion.div
                key={course.title}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="group bg-card border border-white/10 rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 flex flex-col"
              >
                <div className="relative h-40 overflow-hidden bg-white/5">
                  <img
                    src={course.img?.includes("unsplash.com")
                      ? course.img.replace(/\?.*$/, "?w=400&h=160&q=75&auto=format&fm=webp&fit=crop")
                      : course.img}
                    alt={course.title}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={160}
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
                  >
                    <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                      <MessageCircle className="w-4 h-4 me-2" />
                      استفسر وسجّل
                    </a>
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-foreground/35 text-sm mt-10"
        >
          ✅ أول سيشن مجانًا في كل البرامج — بدون التزام
        </motion.p>
      </div>
    </section>
  );
}
