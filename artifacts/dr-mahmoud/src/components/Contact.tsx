import { motion } from "framer-motion";
import { MessageCircle, Phone, MapPin, Send, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCreateBooking } from "@workspace/api-client-react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export function Contact() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    age: "",
    grade: "",
    program: "برمجة الأطفال",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const { mutateAsync: createBooking, isPending } = useCreateBooking();
  const { get } = useSiteSettings();

  const whatsapp = get(SETTINGS_KEYS.CONTACT_WHATSAPP, "201044348610");
  const phone1 = get(SETTINGS_KEYS.CONTACT_PHONE1, "01066711545");
  const phone2 = get(SETTINGS_KEYS.CONTACT_PHONE2, "01272047933");
  const address = get(SETTINGS_KEYS.CONTACT_ADDRESS, "Eduverse، فلل الجامعة، الزقازيق");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const detailedMessage = `السن: ${form.age || "غير محدد"}\nالمرحلة الدراسية: ${form.grade || "غير محدد"}\nالبرنامج المختار: ${form.program}\n\nالرسالة: ${form.message || "لا توجد رسالة إضافية"}`;

    try {
      await createBooking({
        data: {
          name: form.name,
          phone: form.phone,
          message: detailedMessage,
        },
      });
    } catch (error) {
      console.error("Failed to save booking to database:", error);
    }

    const text = encodeURIComponent(
      `مرحبًا د. محمود 👋\n\nأود حجز تقييم مجاني:\n- الاسم الكامل: ${form.name}\n- رقم الهاتف: ${form.phone}\n- سن الطالب: ${form.age || "غير محدد"}\n- المرحلة الدراسية: ${form.grade || "غير محدد"}\n- البرنامج المختار: ${form.program}\n- رسالة إضافية: ${form.message || "لا توجد"}`
    );
    window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank");
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: "", phone: "", age: "", grade: "", program: "برمجة الأطفال", message: "" });
    }, 4000);
  };

  return (
    <section id="contact" className="pt-32 pb-20 lg:pt-40 lg:pb-28 bg-background relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-primary font-bold text-xs md:text-sm uppercase tracking-wider mb-3 block">احجز جلستك الآن</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 tracking-tight leading-tight">
              احجز تقييم مجاني وحدد المسار المناسب
            </h2>
            <p className="text-base md:text-lg text-foreground/70 max-w-2xl mx-auto leading-relaxed">
              سيشن قصيرة نعرف منها مستوى الطالب ونرشح البرنامج الأنسب لعمره وهدفه.
            </p>
            <div className="w-20 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto rounded-full mt-6" />
          </motion.div>

          <div className="grid md:grid-cols-12 gap-8 items-start">
            {/* Left/Form Card - Order 1 on mobile, Order 2 on desktop */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="md:col-span-7 bg-[#0b111e]/90 border border-white/[0.06] shadow-[0_0_60px_rgba(214,168,79,0.06),0_1px_3px_rgba(0,0,0,0.3)] rounded-3xl p-6 md:p-8 order-1"
            >
              <h3 className="text-xl font-bold text-foreground mb-1">احجز تقييم مجاني</h3>
              <p className="text-xs text-foreground/60 mb-6">املأ البيانات وسيتم التواصل معك على واتساب.</p>

              {submitted ? (
                <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-foreground text-xl">تم تسجيل طلبك بنجاح!</p>
                  <p className="text-foreground/50 text-sm max-w-xs">
                    جاري توجيهك الآن إلى واتساب لإتمام الحجز وتنسيق الموعد.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-1.5">الاسم الكامل</label>
                      <input
                        type="text"
                        required
                        placeholder="اسم الطالب أو ولي الأمر"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-1.5">رقم الهاتف</label>
                      <input
                        type="tel"
                        required
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-primary/50 transition-colors text-sm text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-1.5">سن الطالب</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: 12 سنة"
                        value={form.age}
                        onChange={(e) => setForm({ ...form, age: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-1.5">المرحلة الدراسية</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: الصف السادس الابتدائي"
                        value={form.grade}
                        onChange={(e) => setForm({ ...form, grade: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1.5">اختر البرنامج</label>
                    <div className="relative">
                      <select
                        value={form.program}
                        onChange={(e) => setForm({ ...form, program: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm appearance-none cursor-pointer pr-10"
                      >
                        <option value="برمجة الأطفال" className="bg-[#070B12]">برمجة الأطفال</option>
                        <option value="نظام البكالوريا" className="bg-[#070B12]">نظام البكالوريا</option>
                        <option value="Python & AI" className="bg-[#070B12]">Python & AI</option>
                        <option value="دعم الجامعة" className="bg-[#070B12]">دعم الجامعة</option>
                        <option value="ICDL" className="bg-[#070B12]">ICDL</option>
                        <option value="مش عارف أختار" className="bg-[#070B12]">مش عارف أختار</option>
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1.5">رسالتك (اختياري)</label>
                    <textarea
                      rows={3}
                      placeholder="أي تفاصيل أو استفسارات إضافية تود مشاركتها..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-primary/50 transition-colors text-sm resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[#25D366]/10 transition-all duration-300 flex items-center justify-center gap-2 text-sm mt-2 hover:scale-[1.01]"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    {isPending ? "جاري تسجيل البيانات..." : "احجز تقييم مجاني عبر واتساب"}
                  </Button>
                </form>
              )}
            </motion.div>

            {/* Right Contact Cards - Order 2 on mobile, Order 1 on desktop */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="md:col-span-5 space-y-4 order-2"
            >
              {/* WhatsApp Card */}
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-white/5 hover:border-[#25D366]/40 transition-all duration-300 group block relative"
                data-testid="link-whatsapp"
              >
                <div className="w-12 h-12 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#25D366]/20 transition-colors">
                  <MessageCircle className="w-6 h-6 text-[#25D366]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/45 mb-0.5">واتساب</p>
                  <p className="font-bold text-lg text-foreground group-hover:text-[#25D366] transition-colors" dir="ltr">{whatsapp}</p>
                </div>
                <span className="text-xs font-bold text-[#25D366] bg-[#25D366]/10 px-2.5 py-1 rounded-lg">تواصل واتساب</span>
              </a>

              {/* Calls Card */}
              <a
                href={`tel:+2${phone1}`}
                className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-white/5 hover:border-primary/40 transition-all duration-300 group block relative"
              >
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/45 mb-0.5">مكالمات هاتفية</p>
                  <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors" dir="ltr">{phone1}</p>
                  <p className="text-sm text-foreground/60" dir="ltr">{phone2}</p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">اتصل الآن</span>
              </a>

              {/* Location Card */}
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-white/5 hover:border-primary/40 transition-all duration-300 group block"
              >
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/45 mb-0.5">المقر الرئيسي</p>
                  <p className="font-bold text-sm md:text-base text-foreground group-hover:text-primary transition-colors">
                    {address}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded">عرض الخريطة</span>
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
