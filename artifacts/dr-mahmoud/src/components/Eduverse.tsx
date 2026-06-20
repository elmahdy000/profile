import { motion } from "framer-motion";

export function Eduverse() {
  const tags = [
    "Training rooms",
    "Coworking space",
    "Interactive screens",
    "Educational workshops",
    "Programming courses",
    "Kids activities",
    "Podcast area",
    "Practical learning environment"
  ];

  return (
    <section id="eduverse" className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-accent font-bold tracking-wider uppercase text-sm mb-4 block">Powered by</span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Eduverse — مساحة تعليم وتكنولوجيا في الزقازيق</h2>
            <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed mb-12">
              Eduverse مساحة تعليمية مجهزة للتدريب، المذاكرة، الورش، الاجتماعات، والكورسات العملية. المكان مصمم علشان يربط التعليم بالتطبيق، ويخلي الطالب يتعلم التكنولوجيا في بيئة احترافية ومريحة.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {tags.map((tag) => (
              <span 
                key={tag} 
                className="px-5 py-2.5 bg-accent/10 text-accent border border-accent/20 rounded-full font-medium"
              >
                {tag}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
