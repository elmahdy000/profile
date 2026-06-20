import { motion } from "framer-motion";
import { MessageCircle, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Contact() {
  return (
    <section id="contact" className="py-24 bg-[#0f0f0f]">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-primary font-bold text-sm uppercase tracking-wider mb-4 block">تواصل معنا</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">ابدأ رحلتك في البرمجة</h2>
            <p className="text-lg text-foreground/55">
              احجز أول سيشن مجانًا واعرف البرنامج المناسب لسن الطالب ومستواه.
            </p>
            <div className="w-24 h-0.5 bg-primary mx-auto rounded-full mt-4" />
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <a
                href="https://wa.me/201044348610"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-white/10 hover:border-[#25D366]/40 transition-all duration-300 group"
                data-testid="link-whatsapp"
              >
                <div className="w-12 h-12 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#25D366]/20 transition-colors">
                  <MessageCircle className="w-6 h-6 text-[#25D366]" />
                </div>
                <div>
                  <p className="text-xs text-foreground/45 mb-0.5">واتساب</p>
                  <p className="font-bold text-lg text-foreground group-hover:text-[#25D366] transition-colors" dir="ltr">+20 10 4434 8610</p>
                </div>
              </a>

              <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-white/10 hover:border-primary/30 transition-all duration-300 group">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-foreground/45 mb-0.5">مكالمات</p>
                  <a href="tel:+201066711545" className="font-bold text-lg text-foreground hover:text-primary transition-colors block" dir="ltr">+20 10 6671 1545</a>
                  <a href="tel:+201272047933" className="font-bold text-lg text-foreground hover:text-primary transition-colors block" dir="ltr">+20 12 7204 7933</a>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-white/10">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-foreground/45 mb-0.5">المكان</p>
                  <p className="font-bold text-lg text-foreground">Eduverse، فلل الجامعة، الزقازيق</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-white flex-1 font-bold"
                  data-testid="button-whatsapp-contact"
                >
                  <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">تواصل واتساب</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 font-bold"
                  data-testid="button-call"
                >
                  <a href="tel:+201066711545">اتصل الآن</a>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl overflow-hidden border border-white/10 relative min-h-[350px]"
            >
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
                alt="Eduverse مقر"
                className="w-full h-full object-cover absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-6 right-6 left-6">
                <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                  <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h3 className="font-bold text-white mb-1">مقر Eduverse</h3>
                  <p className="text-sm text-white/60">فلل الجامعة، الزقازيق، مصر</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
