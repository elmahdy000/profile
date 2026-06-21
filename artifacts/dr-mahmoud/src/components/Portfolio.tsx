import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const items = [
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
    category: "AI",
    title: "AI content",
    img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=70"
  },
  {
    category: "Educational",
    title: "Educational posters",
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=70"
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

const allCategories = ["الكل", ...Array.from(new Set(items.map((i) => i.category)))];

const categoryAr: Record<string, string> = {
  "الكل": "الكل",
  "Kids": "الأطفال",
  "Programming": "برمجة",
  "AI": "ذكاء اصطناعي",
  "Educational": "تعليمي",
  "Web": "ويب",
  "Academic": "أكاديمي",
  "Media": "ميديا",
  "Branding": "براندنج",
  "Showcase": "مشاريع الطلاب",
};

export function Portfolio() {
  const [active, setActive] = useState("الكل");

  const filtered = active === "الكل" ? items : items.filter((i) => i.category === active);

  return (
    <section id="portfolio" className="py-20 lg:py-24 bg-background relative">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">الأعمال</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">نماذج من شغلي</h2>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full" />
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 border ${
                active === cat
                  ? "bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] text-[#070B12] border-transparent shadow-lg shadow-[#D6A84F]/20"
                  : "bg-[#121A27] text-foreground/60 border border-[#D6A84F]/28 hover:border-[#D6A84F]/60 hover:text-foreground"
              }`}
            >
              {categoryAr[cat] ?? cat}
            </button>
          ))}
        </div>

        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <motion.div
                key={item.title}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="group relative overflow-hidden rounded-xl cursor-pointer border border-white/10 hover:border-primary/50 transition-all duration-300"
              >
                <div className="aspect-[4/3] relative bg-white/5">
                  <img
                    src={item.img}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-70 group-hover:opacity-95 transition-opacity" />
                  <div className="absolute inset-0 p-3 flex flex-col justify-end">
                    <span className="text-primary text-xs font-bold mb-0.5 uppercase tracking-wider">
                      {categoryAr[item.category] ?? item.category}
                    </span>
                    <h3 className="text-white font-semibold text-xs leading-tight">{item.title}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
