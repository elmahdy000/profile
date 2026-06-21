import { motion } from "framer-motion";

export function Eduverse() {
  const tags = [
    "قاعات تدريب",
    "Coworking Space",
    "شاشات تفاعلية",
    "ورش تعليمية",
    "كورسات برمجة",
    "أنشطة للأطفال",
    "منطقة بودكاست",
    "بيئة تعلم عملي"
  ];

  return (
    <section id="eduverse" className="py-0 relative overflow-hidden">
      {/* Full-bleed image background */}
      <div className="relative h-[600px] lg:h-[700px]">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80"
          alt="Eduverse مساحة تعليمية"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />

        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <span className="text-primary font-bold tracking-widest uppercase text-sm mb-6 block">Powered by</span>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Eduverse
                  <span className="block text-2xl md:text-3xl text-primary mt-2">مساحة تعليم وتكنولوجيا في الزقازيق</span>
                </h2>
                <p className="text-lg text-white/70 leading-relaxed mb-10">
                  Eduverse مساحة تعليمية مجهزة للتدريب، المذاكرة، الورش، الاجتماعات، والكورسات العملية. المكان مصمم علشان يربط التعليم بالتطبيق، ويخلي الطالب يتعلم التكنولوجيا في بيئة احترافية ومريحة.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-3"
              >
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-2 bg-primary/15 text-primary border border-primary/30 rounded-full font-semibold text-sm backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
