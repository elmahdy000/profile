import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export function Portfolio() {
  const items = [
    { category: "Educational", title: "Educational posters" },
    { category: "Kids", title: "Scratch lesson designs" },
    { category: "Programming", title: "Python explanations" },
    { category: "Web", title: "HTML lessons" },
    { category: "Academic", title: "University courses" },
    { category: "AI", title: "AI content" },
    { category: "Media", title: "Podcast covers" },
    { category: "Branding", title: "Eduverse designs" },
    { category: "Web", title: "Landing page concepts" },
    { category: "Showcase", title: "Student projects" },
  ];

  return (
    <section id="portfolio" className="py-24 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">نماذج من شغلي</h2>
          <div className="w-24 h-1 bg-accent mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden group cursor-pointer border-none shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-0 relative aspect-[4/3]">
                  {/* Placeholder Image Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 group-hover:scale-105 transition-transform duration-500" />
                  
                  {/* Overlay content */}
                  <div className="absolute inset-0 p-4 flex flex-col justify-end bg-gradient-to-t from-primary/80 via-primary/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity">
                    <span className="text-accent text-xs font-bold mb-1 uppercase tracking-wider">{item.category}</span>
                    <h3 className="text-white font-semibold text-sm leading-tight">{item.title}</h3>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
