import { Facebook, Instagram, Linkedin, Youtube, MessageCircle } from "lucide-react";

const socialLinks = [
  {
    icon: Facebook,
    label: "Facebook",
    href: "https://facebook.com",
    color: "hover:text-[#1877F2]"
  },
  {
    icon: Instagram,
    label: "Instagram",
    href: "https://instagram.com",
    color: "hover:text-[#E1306C]"
  },
  {
    icon: Youtube,
    label: "YouTube",
    href: "https://youtube.com",
    color: "hover:text-[#FF0000]"
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    href: "https://linkedin.com",
    color: "hover:text-[#0A66C2]"
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    href: "https://wa.me/201044348610",
    color: "hover:text-[#25D366]"
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white/70 py-12 border-t border-white/10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
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
                { label: "Eduverse", href: "#eduverse" },
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

          <div className="text-center md:text-left">
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">تواصل معنا</h3>
            <div className="space-y-2 text-sm text-white/45">
              <p dir="ltr">📞 01044348610</p>
              <p dir="ltr">📞 01066711545</p>
              <p dir="ltr">📞 01272047933</p>
              <p className="mt-3">📍 Eduverse، فلل الجامعة، الزقازيق</p>
            </div>
            <a
              href="https://wa.me/201044348610"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-sm font-bold rounded-full hover:bg-[#25D366]/20 transition-colors"
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
