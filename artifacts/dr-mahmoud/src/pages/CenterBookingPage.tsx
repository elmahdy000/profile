import React, { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CenterBookingForm } from "@/components/booking/CenterBookingForm";
import { Sparkles, MapPin, CheckCircle2, PhoneCall } from "lucide-react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export default function CenterBookingPage() {
  const { get } = useSiteSettings();
  const whatsapp = get(SETTINGS_KEYS.CONTACT_WHATSAPP, "201066711545");

  useEffect(() => {
    document.title = "حجز السناتر الرسمية (أولى وتانية بكالوريا 2026) | د. محمود المهدي";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "استمارة حجز السناتر الرسمية بمحافظة الشرقية (الزقازيق) لطلاب الصف الأول والثاني البكالوريا المصرية مع د. محمود المهدي ... رسوم الحجز والسداد 500 جنيه بالسنتر بأول يوم حضور."
      );
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white dir-rtl" dir="rtl">
      <Navbar />

      {/* Hero Header Section */}
      <section className="relative pt-28 pb-12 overflow-hidden bg-gradient-to-b from-[#0B1424] via-[#0D1B33] to-[#0B1424] border-b border-slate-800">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10 text-center max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs sm:text-sm font-black text-emerald-300 shadow-md animate-pulse">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>تم فتح باب الحجز المباشر للسناتر الآن (أولى وتانية بكالوريا 2026)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight text-white">
            استمارة حجز السناتر والمواعيد المتاحة بالزقازيق 📍
          </h1>

          <p className="text-sm sm:text-base font-semibold text-slate-300 max-w-2xl mx-auto leading-relaxed">
            اختر مرحلتك وسنترك المفضل وسجّل بياناتك سهلاً في أقل من دقيقة.
            <span className="block mt-1 text-emerald-400 font-extrabold">
              الدفع والاشتراك أول يوم في السنتر بإذن الله ... 500 جنيه فقط.
            </span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-muted-foreground pt-2">
            <span className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#131E31] px-3.5 py-2">
              <MapPin className="h-4 w-4 text-blue-400" /> جميع سناتر الزقازيق الرئيسية
            </span>
            <span className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#131E31] px-3.5 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> تأكيد الموعد والكود فوراً
            </span>
            <span className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#131E31] px-3.5 py-2">
              <PhoneCall className="h-4 w-4 text-amber-400" /> الدعم والمتابعة المستمرة
            </span>
          </div>
        </div>
      </section>

      {/* Main Standalone Booking Form Container */}
      <main className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <CenterBookingForm />
      </main>

      <Footer />
    </div>
  );
}
