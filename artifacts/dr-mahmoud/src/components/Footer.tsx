import { Facebook, Instagram, Linkedin, Youtube, Phone, MapPin } from "lucide-react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { get } = useSiteSettings();

  const whatsapp = get(SETTINGS_KEYS.CONTACT_WHATSAPP, "01066711545");
  const phone1 = get(SETTINGS_KEYS.CONTACT_PHONE1, "01066711545");
  const phone2 = get(SETTINGS_KEYS.CONTACT_PHONE2, "01025131212");
  const address = get(SETTINGS_KEYS.CONTACT_ADDRESS, "Eduverse، فلل الجامعة، الزقازيق");
  
  const facebook = get(SETTINGS_KEYS.SOCIAL_FACEBOOK, "#");
  const instagram = get(SETTINGS_KEYS.SOCIAL_INSTAGRAM, "#");
  const youtube = get(SETTINGS_KEYS.SOCIAL_YOUTUBE, "#");
  const linkedin = get(SETTINGS_KEYS.SOCIAL_LINKEDIN, "#");

  const logoUrl = get(SETTINGS_KEYS.SITE_LOGO_URL, "/logo.webp");
  const siteName = get(SETTINGS_KEYS.SITE_NAME, "د. محمود المهدي");
  const siteTagline = get(SETTINGS_KEYS.SITE_TAGLINE, "مدرب برمجة وذكاء اصطناعي — مؤسس Eduverse");

  const toTelephoneUrl = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("20")) return `tel:+${digits}`;
    if (digits.startsWith("0")) return `tel:+2${digits}`;
    return `tel:+${digits}`;
  };

  const socialLinks = [
    { icon: Facebook, label: "Facebook", href: facebook, color: "hover:text-primary" },
    { icon: Instagram, label: "Instagram", href: instagram, color: "hover:text-primary" },
    { icon: Youtube, label: "YouTube", href: youtube, color: "hover:text-primary" },
    { icon: Linkedin, label: "LinkedIn", href: linkedin, color: "hover:text-primary" },
  ];

  return (
    <footer className="relative z-10 border-t border-slate-200 bg-[#0F1D32] pb-24 pt-12 text-white/75 md:pb-8" dir="rtl">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-10 text-right">
          
          {/* Col 1: Dr. Mahmoud */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <img src={logoUrl} alt="Logo" width={36} height={36} className="w-9 h-9 object-cover rounded-full border border-primary/20 shrink-0" />
              <h2 className="text-base font-bold text-white">{siteName}</h2>
            </div>
            <p className="text-xs font-semibold text-primary mb-2">مدرس برمجة البكالوريا المصرية</p>
            <p className="text-xs text-white/60 leading-relaxed mb-4">
              ماجستير نظم المعلومات — متخصص في تأسيس وشرح البرمجة لطلاب أولى وتانية ثانوي أونلاين لكل مصر وأوفلاين بالزقازيق.
            </p>
            <div className="flex items-center gap-2">
              {socialLinks.filter((s) => s.href && s.href !== "#").map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all hover:border-primary/50 text-white/60"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Baccalaureate Programs */}
          <div className="flex flex-col">
            <h3 className="font-bold text-white mb-4 text-xs uppercase tracking-wider">برامج البكالوريا</h3>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li><a href="/baccalaureate#first-sec" className="hover:text-primary transition-colors">برمجة أولى ثانوي</a></li>
              <li><a href="/baccalaureate#second-sec" className="hover:text-primary transition-colors">برمجة تانية ثانوي</a></li>
              <li><a href="/platform" className="hover:text-primary transition-colors">بنك الأسئلة والتمارين</a></li>
              <li><a href="/platform" className="hover:text-primary transition-colors">اختبارات التقييم</a></li>
            </ul>
          </div>

          {/* Col 3: Platform */}
          <div className="flex flex-col">
            <h3 className="font-bold text-white mb-4 text-xs uppercase tracking-wider">المنصة التعليمية</h3>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li><a href="/platform" className="hover:text-primary transition-colors">تسجيل الدخول</a></li>
              <li><a href="/platform" className="hover:text-primary transition-colors">إنشاء حساب جديد</a></li>
              <li><a href="/#courses-section" className="hover:text-primary transition-colors">دليل الكورسات</a></li>
              <li><a href="/platform" className="hover:text-primary transition-colors">المذكرات والملفات</a></li>
            </ul>
          </div>

          {/* Col 4: Educational Content */}
          <div className="flex flex-col">
            <h3 className="font-bold text-white mb-4 text-xs uppercase tracking-wider">محتوى تعليمي</h3>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li><a href="/curriculum" className="hover:text-primary transition-colors">المناهج والمسارات</a></li>
              <li><a href="/#free-preview" className="hover:text-primary transition-colors">الدروس المجانية</a></li>
              <li><a href="/#faq" className="hover:text-primary transition-colors">الأسئلة الشائعة</a></li>
              <li><a href="/kids" className="hover:text-primary transition-colors">برمجة الأطفال والأشبال</a></li>
            </ul>
          </div>

          {/* Col 5: Contact */}
          <div className="flex flex-col">
            <h3 className="font-bold text-white mb-4 text-xs uppercase tracking-wider">التواصل والحجز</h3>
            <div className="space-y-3 text-xs text-white/70">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="leading-snug">{address}</span>
              </div>
              <div className="flex flex-col gap-1.5" dir="ltr">
                <a href={toTelephoneUrl(whatsapp)} className="hover:text-primary transition-colors text-right flex items-center gap-1.5 justify-end">
                  <span>{whatsapp}</span>
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                </a>
                <a href={toTelephoneUrl(phone1)} className="hover:text-primary transition-colors text-right flex items-center gap-1.5 justify-end">
                  <span>{phone1}</span>
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Copyright Row */}
        <div className="pt-6 border-t border-white/10 text-center text-xs text-white/40 flex flex-col md:flex-row justify-between items-center gap-3">
          <p>© {currentYear} د. محمود المهدي — جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <a href="/#booking" className="hover:text-white/70">الشروط والأحكام</a>
            <span>•</span>
            <a href="/#booking" className="hover:text-white/70">سياسة الخصوصية</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
