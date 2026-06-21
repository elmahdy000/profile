import { motion } from "framer-motion";
import { MessageCircle, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCreateBooking } from "@workspace/api-client-react";

export function Contact() {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const { mutateAsync: createBooking, isPending } = useCreateBooking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createBooking({
        data: {
          name: form.name,
          phone: form.phone,
          message: form.message,
        },
      });
    } catch (error) {
      console.error("Failed to save booking to database:", error);
    }

    const text = encodeURIComponent(
      `مرحبًا د. محمود 👋\n\nاسمي: ${form.name}\nرقم التليفون: ${form.phone}\n\n${form.message}`
    );
    window.open(`https://wa.me/201044348610?text=${text}`, "_blank");
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: "", phone: "", message: "" });
    }, 4000);
  };

  return (
    <section id="contact" className="py-20 lg:py-24 bg-background relative">
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
                  className="bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] flex-1 font-bold shadow-lg shadow-[#D6A84F]/10 hover:shadow-[#D6A84F]/20 transition-all duration-300 hover:scale-[1.01]"
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
              className="bg-card border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-foreground mb-1">أرسل رسالة مباشرة</h3>
              <p className="text-sm text-foreground/45 mb-6">هيتحولك على واتساب بشكل تلقائي</p>

              {submitted ? (
                <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
                  <CheckCircle2 className="w-14 h-14 text-primary" />
                  <p className="font-bold text-foreground text-lg">تم الإرسال!</p>
                  <p className="text-foreground/50 text-sm">هيتحولك على واتساب دلوقتي</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1.5">الاسم</label>
                    <input
                      type="text"
                      required
                      placeholder="اسمك الكامل"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1.5">رقم التليفون</label>
                    <input
                      type="tel"
                      required
                      placeholder="01xxxxxxxxx"
                      dir="ltr"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 transition-colors text-sm text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1.5">رسالتك</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="اكتب استفساري عن الكورس المناسب لي / لابني..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 transition-colors text-sm resize-none"
                    />
                  </div>

                   <Button
                    type="submit"
                    size="lg"
                    disabled={isPending}
                    className="w-full bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] font-bold shadow-lg shadow-[#D6A84F]/20 transition-all duration-300 hover:scale-[1.01]"
                  >
                    <Send className="w-4 h-4 me-2" />
                    {isPending ? "جاري الحفظ..." : "إرسال عبر واتساب"}
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
