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

  const whatsapp = get(SETTINGS_KEYS.CONTACT_WHATSAPP, "01066711545");
  const phone1 = get(SETTINGS_KEYS.CONTACT_PHONE1, "01066711545");
  const phone2 = get(SETTINGS_KEYS.CONTACT_PHONE2, "01025131212");
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
      // booking save failed silently
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
            <div className="w-20 h-1 bg-primary/40 mx-auto rounded-full mt-6" />
          </motion.div>

          <div className="grid md:grid-cols-12 gap-8 items-start">
            {/* Left/Registration Notice Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="md:col-span-7 bg-card border border-primary/30 shadow-xl rounded-3xl p-6 md:p-8 order-1 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-primary via-blue-500 to-indigo-500" />
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">طريقة الحجز والاشتراك</h3>
                  <p className="text-xs text-primary font-semibold">التسجيل عبر المنصة التعليمية والتواصل مع الحجز</p>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6 text-right">
                <p className="text-sm md:text-base font-bold text-foreground leading-relaxed mb-3">
                  من فضلًا: للحجز والاشتراك، يُرجى إنشاء حساب الطالب وتسجيل البيانات أولاً على المنصة التعليمية، ثم التواصل مع فريق الحجز عبر الأرقام الموضحة لتفعيل اشتراكك وتأكيد الموعد.
                </p>
                <ul className="space-y-2 text-xs text-foreground/75 font-medium">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span>1. سجّل حسابك الجديد واطلع على كود الدخول الخاص بك.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span>2. تواصل مع أرقام الحجز عبر واتساب أو الهاتف لتفعيل الكود.</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 h-12 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 text-sm hover:scale-[1.01]"
                >
                  <a href="/platform?action=register">
                    <Send className="w-4 h-4 ml-2" />
                    إنشاء حساب والتسجيل على المنصة
                  </a>
                </Button>
                
                <Button
                  asChild
                  variant="outline"
                  className="bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 font-bold py-3.5 h-12 rounded-xl transition-all text-sm"
                >
                  <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("مرحباً، أود التواصل لحجز الاشتراك بعد التسجيل على المنصة")}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="w-4 h-4 ml-2" />
                    تواصل مع أرقام الحجز
                  </a>
                </Button>
              </div>
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
                className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border hover:border-[#25D366]/40 transition-all duration-300 group block relative"
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
                className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-300 group block relative"
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
                className="flex items-center gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-300 group block"
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
