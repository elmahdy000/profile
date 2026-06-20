import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export function Courses() {
  const courses = [
    {
      title: "Kids Programming Package",
      age: "من 4 إلى 18 سنة",
      tags: ["Scratch", "Python basics", "AI basics", "mini projects", "creative thinking"]
    },
    {
      title: "Python Track",
      age: "من الصفر",
      tags: ["Variables", "Conditions", "Loops", "Functions", "Lists", "Problem Solving", "Projects"]
    },
    {
      title: "ICDL Practical Track",
      age: "جميع المستويات",
      tags: ["Word", "PowerPoint", "Excel", "presentations", "reports", "spreadsheets"]
    },
    {
      title: "AI Starter Track",
      age: "للمبتدئين والطلاب",
      tags: ["AI concepts", "tools", "prompts", "practical use cases", "student projects"]
    },
    {
      title: "University Support",
      age: "طلاب الجامعة",
      tags: ["C++", "OOP", "Data Structures", "Algorithms", "Database", "Discrete Math"]
    },
    {
      title: "Baccalaureate Programming",
      age: "طلاب البكالوريا",
      tags: ["Programming basics", "logic", "Python", "problem solving", "practical exercises"]
    }
  ];

  return (
    <section id="courses" className="py-24 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">الكورسات والمسارات التدريبية</h2>
          <div className="w-24 h-1 bg-accent mx-auto rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full flex flex-col border-border/60 shadow-sm hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <CardTitle className="text-xl font-bold text-primary leading-tight">
                      {course.title}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-accent/10 text-accent hover:bg-accent/20 whitespace-nowrap">
                      {course.age}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 bg-primary/5 text-foreground/70 text-xs font-medium rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border/30 mt-auto">
                  <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white">
                    <a href="#contact">تسجيل الآن</a>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
