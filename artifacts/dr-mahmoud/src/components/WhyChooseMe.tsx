import { motion } from "framer-motion";
import { 
  Code2, 
  GraduationCap, 
  Laptop, 
  ClipboardCheck, 
  FolderGit2, 
  Award, 
  MapPin, 
  Globe 
} from "lucide-react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export function WhyChooseMe() {
  const { get } = useSiteSettings();
  const bgImg = get(SETTINGS_KEYS.WHY_CHOOSE_ME_BG_URL, "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1400&q=60");

  const features = [
    {
      title: "تأسيس من الصفر",
      desc: "نفهم الفكرة قبل ما نكتب الكود.",
      icon: Code2,
      highlight: false
    },
    {
      title: "مناسب للبكالوريا",
      desc: "شرح منظم وتدريبات مناسبة للمرحلة.",
      icon: GraduationCap,
      highlight: true
    },
    {
      title: "تطبيق عملي في كل حصة",
      desc: "الطالب يكتب وينفذ بنفسه.",
      icon: Laptop,
      highlight: false
    },
    {
      title: "متابعة وتقييم",
      desc: "قياس مستوى الطالب خطوة بخطوة.",
      icon: ClipboardCheck,
      highlight: false
    },
    {
      title: "مشاريع حقيقية",
      desc: "كل مرحلة تنتهي بتطبيق عملي.",
      icon: FolderGit2,
      highlight: false
    },
    {
      title: "خبرة أكاديمية",
      desc: "تبسيط البرمجة للمدارس والجامعة.",
      icon: Award,
      highlight: false
    },
    {
      title: "داخل Eduverse",
      desc: "تدريب في مكان مجهز وبيئة منظمة.",
      icon: MapPin,
      highlight: false
    },
    {
      title: "أونلاين لكل مصر",
      desc: "نفس الخطة والمتابعة من أي مكان.",
      icon: Globe,
      highlight: false
    }
  ];

  return (
    <section className="py-20 lg:py-24 relative overflow-hidden bg-background">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={bgImg}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover opacity-[0.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 max-w-2xl mx-auto"
        >
          <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">الميزات</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">ليه تختار د. محمود المهدي؟</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
            مش مجرد شرح وخلاص. خطة واضحة حسب سن الطالب ومستواه، تدريب عملي، متابعة، ومشروع يثبت الفهم.
          </p>
          <div className="w-24 h-0.5 bg-primary mx-auto rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-start gap-4 p-5 rounded-2xl transition-all duration-300 group ${
                  feature.highlight 
                    ? "bg-primary/5 border-2 border-primary shadow-lg shadow-primary/5 hover:bg-primary/8" 
                    : "bg-white/5 border border-white/10 hover:border-primary/45 hover:bg-white/8"
                }`}
              >
                <div className={`p-3 rounded-xl shrink-0 ${
                  feature.highlight 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300"
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-lg mb-1 leading-snug">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex justify-center mt-12"
        >
          <a
            href="#contact"
            className="inline-flex items-center justify-center bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] rounded-full px-8 py-3.5 font-bold text-base shadow-lg shadow-[#D6A84F]/10 hover:scale-[1.02] transition-all"
          >
            احجز تقييم مجاني
          </a>
        </motion.div>
      </div>
    </section>
  );
}
