import { Facebook, Instagram, Linkedin, Youtube, Phone, MapPin } from "lucide-react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { get } = useSiteSettings();

  const whatsapp = get(SETTINGS_KEYS.CONTACT_WHATSAPP, "201044348610");
  const phone1 = get(SETTINGS_KEYS.CONTACT_PHONE1, "01066711545");
  const phone2 = get(SETTINGS_KEYS.CONTACT_PHONE2, "01272047933");
  const address = get(SETTINGS_KEYS.CONTACT_ADDRESS, "Eduverse، فلل الجامعة، الزقازيق");
  
  const facebook = get(SETTINGS_KEYS.SOCIAL_FACEBOOK, "#");
  const instagram = get(SETTINGS_KEYS.SOCIAL_INSTAGRAM, "#");
  const youtube = get(SETTINGS_KEYS.SOCIAL_YOUTUBE, "#");
  const linkedin = get(SETTINGS_KEYS.SOCIAL_LINKEDIN, "#");

  const logoUrl = get(SETTINGS_KEYS.SITE_LOGO_URL, "/logo.jpg");
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
    <footer className="relative z-10 border-t border-slate-200 bg-[#0F1D32] pb-24 pt-12 text-white/75 md:pb-8">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-10 text-right">
          
          <div className="md:col-span-5 flex flex-col order-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoUrl} alt="Logo" className="w-10 h-10 object-cover rounded-full border border-primary/20 shrink-0" />
              <h2 className="text-xl font-bold text-white">{siteName}</h2>
            </div>
            <p className="text-sm font-semibold text-primary mb-2">{siteTagline}</p>
            <p className="text-sm text-white/60 leading-relaxed mb-6 max-w-sm">
              شرح برمجة عملي للمدرسة والجامعة والمبتدئين، بخطة واضحة ومتابعة خطوة بخطوة.
            </p>
            <div className="flex items-center gap-3 mt-auto">
              {socialLinks.filter((s) => s.href && s.href !== "#").map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 hover:border-primary/50 text-white/60"
                >
                  <s.icon className="w-[18px] h-[18px]" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 flex flex-col order-3 md:order-2">
            <h3 className="font-bold text-white mb-5 text-sm uppercase tracking-wider">روابط سريعة</h3>
            <ul className="space-y-3">
              {[
                { label: "الرئيسية", href: "/" },
                { label: "عن الدكتور", href: "/#about" },
                { label: "المسارات", href: "/#tracks" },
                { label: "المناهج التعليمية", href: "/curriculum" },
                { label: "دخول المنصة", href: "/platform" },
                { label: "كلمنا", href: `https://wa.me/${whatsapp}` },
              ].map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-white/60 hover:text-primary transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 flex flex-col order-2 md:order-3">
            <h3 className="font-bold text-white mb-5 text-sm uppercase tracking-wider">تواصل معنا</h3>
            <div className="space-y-4 text-sm text-white/70">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="leading-snug">{address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <div className="flex flex-col gap-1" dir="ltr">
                  <a href={toTelephoneUrl(whatsapp)} className="hover:text-primary transition-colors text-right">{whatsapp}</a>
                  <a href={toTelephoneUrl(phone1)} className="hover:text-primary transition-colors text-right">{phone1}</a>
                  <a href={toTelephoneUrl(phone2)} className="hover:text-primary transition-colors text-right">{phone2}</a>
                </div>
              </div>
            </div>
            
          </div>
          
        </div>

        {/* Copyright Row */}
        <div className="pt-6 border-t border-white/10 text-center text-sm text-white/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {currentYear} د. محمود المهدي — جميع الحقوق محفوظة.</p>
          <p className="text-xs">منصة تعليمية للبرمجة وعلوم الحاسب</p>
        </div>
      </div>
    </footer>
  );
}
