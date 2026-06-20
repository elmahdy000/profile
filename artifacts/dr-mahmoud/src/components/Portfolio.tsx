import { motion } from "framer-motion";

const items = [
  {
    category: "Educational",
    title: "Educational posters",
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=70"
  },
  {
    category: "Kids",
    title: "Scratch lesson designs",
    img: "https://images.unsplash.com/photo-1560785496-3c9d27877182?w=400&q=70"
  },
  {
    category: "Programming",
    title: "Python explanations",
    img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=70"
  },
  {
    category: "Web",
    title: "HTML lessons",
    img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=70"
  },
  {
    category: "Academic",
    title: "University courses",
    img: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=400&q=70"
  },
  {
    category: "AI",
    title: "AI content",
    img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=70"
  },
  {
    category: "Media",
    title: "Podcast covers",
    img: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=70"
  },
  {
    category: "Branding",
    title: "Eduverse designs",
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=70"
  },
  {
    category: "Web",
    title: "Landing page concepts",
    img: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&q=70"
  },
  {
    category: "Showcase",
    title: "Student projects",
    img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=70"
  },
];

export function Portfolio() {
  return (
    <section id="portfolio" className="py-24 bg-[#0f0f0f]">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">الأعمال</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">نماذج من شغلي</h2>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.93 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-xl cursor-pointer border border-white/10 hover:border-primary/50 transition-all duration-300"
              data-testid={`card-portfolio-${index}`}
            >
              <div className="aspect-[4/3] relative">
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />

                <div className="absolute inset-0 p-3 flex flex-col justify-end">
                  <span className="text-primary text-xs font-bold mb-0.5 uppercase tracking-wider">{item.category}</span>
                  <h3 className="text-white font-semibold text-xs leading-tight">{item.title}</h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
