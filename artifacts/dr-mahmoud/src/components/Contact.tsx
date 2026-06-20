import { motion } from "framer-motion";
import { MessageCircle, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Contact() {
  return (
    <section id="contact" className="py-24 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">ابدأ رحلتك في البرمجة</h2>
            <p className="text-lg text-foreground/70">
              احجز أول سيشن مجانًا واعرف البرنامج المناسب لسن الطالب ومستواه.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                    <MessageCircle className="w-6 h-6 text-[#25D366]" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60 mb-1">واتساب</p>
                    <a href="https://wa.me/201044348610" dir="ltr" className="font-bold text-lg hover:text-accent transition-colors block">
                      +20 10 4434 8610
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60 mb-1">مكالمات</p>
                    <a href="tel:+201066711545" dir="ltr" className="font-bold text-lg hover:text-accent transition-colors block">
                      +20 10 6671 1545
                    </a>
                    <a href="tel:+201272047933" dir="ltr" className="font-bold text-lg hover:text-accent transition-colors block">
                      +20 12 7204 7933
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                    <MapPin className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60 mb-1">المكان</p>
                    <p className="font-bold text-lg">Eduverse، فلل الجامعة، الزقازيق</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button asChild size="lg" className="bg-[#25D366] hover:bg-[#20bd5a] text-white flex-1">
                  <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">
                    تواصل واتساب
                  </a>
                </Button>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white flex-1">
                  <a href="tel:+201066711545">اتصل الآن</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-accent text-accent hover:bg-accent/10 flex-1">
                  <a href="#eduverse">اعرف مكان Eduverse</a>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="h-full min-h-[300px] rounded-2xl overflow-hidden bg-muted border border-border relative"
            >
              {/* Map Placeholder */}
              <div className="absolute inset-0 bg-[url('https://api.dicebear.com/7.x/shapes/svg?seed=map&backgroundColor=f8f9fa')] opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                <div className="text-center p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-border/50 max-w-[80%]">
                  <MapPin className="w-10 h-10 text-accent mx-auto mb-3" />
                  <h3 className="font-bold text-primary mb-1">مقر Eduverse</h3>
                  <p className="text-sm text-foreground/70">فلل الجامعة، الزقازيق، مصر</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
