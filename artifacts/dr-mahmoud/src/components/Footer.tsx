import { Facebook, Instagram, Linkedin, Youtube, MessageCircle, Phone, MapPin } from "lucide-react";
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

  const socialLinks = [
    {
      icon: Facebook,
      label: "Facebook",
      href: facebook,
      color: "hover:text-[#1877F2]"
    },
    {
      icon: Instagram,
      label: "Instagram",
      href: instagram,
      color: "hover:text-[#E1306C]"
    },
    {
      icon: Youtube,
      label: "YouTube",
      href: youtube,
      color: "hover:text-[#FF0000]"
    },
    {
      icon: Linkedin,
      label: "LinkedIn",
      href: linkedin,
      color: "hover:text-[#0A66C2]"
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      href: `https://wa.me/${whatsapp}`,
      color: "hover:text-[#25D366]"
    },
  ];

  return (
    <footer className="bg-background text-white/70 py-10 border-t border-white/10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="text-center md:text-right">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
              <div className="w-9 h-9 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">م</div>
              <h2 className="text-xl font-bold text-white">د. محمود المهدي</h2>
            </div>
            <p className="text-sm text-white/45 mb-1">البرمجة | الذكاء الاصطناعي | ICDL | Eduverse</p>
            <p className="text-sm text-white/45 mb-4">الزقازيق، مصر</p>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className={`w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 hover:border-white/30 ${s.color}`}
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="text-center">
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">روابط سريعة</h3>
            <ul className="space-y-2">
              {[
                { label: "الرئيسية", href: "#hero" },
                { label: "عن الدكتور", href: "#about" },
                { label: "الخدمات", href: "#services" },
                { label: "الكورسات", href: "#courses" },
                { label: "الأسئلة الشائعة", href: "#faq" },
                { label: "تواصل معنا", href: "#contact" },
              ].map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-white/45 hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center md:text-right">
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">تواصل معنا</h3>
            <div className="space-y-3 text-sm text-white/45 flex flex-col items-center md:items-start">
              <a
                href={`tel:+2${whatsapp}`}
                className="flex items-center gap-2 hover:text-primary transition-colors"
                dir="ltr"
              >
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span>{whatsapp}</span>
              </a>
              <a
                href={`tel:+2${phone1}`}
                className="flex items-center gap-2 hover:text-primary transition-colors"
                dir="ltr"
              >
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span>{phone1}</span>
              </a>
              <a
                href={`tel:+2${phone2}`}
                className="flex items-center gap-2 hover:text-primary transition-colors"
                dir="ltr"
              >
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span>{phone2}</span>
              </a>
              <div className="mt-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span>{address}</span>
              </div>
            </div>
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-sm font-bold rounded-full hover:bg-[#25D366] hover:text-white transition-all duration-300"
            >
              <MessageCircle className="w-4 h-4" />
              احجز مجانًا على واتساب
            </a>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 text-center text-sm text-white/30">
          <p>© {currentYear} د. محمود المهدي — جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
