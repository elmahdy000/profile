export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white/70 py-12 border-t border-white/10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-right">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
              <div className="w-9 h-9 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg">م</div>
              <h2 className="text-xl font-bold text-white">د. محمود المهدي</h2>
            </div>
            <p className="text-sm text-white/45 mb-1">البرمجة | الذكاء الاصطناعي | ICDL | Eduverse</p>
            <p className="text-sm text-white/45">الزقازيق، مصر</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            {[
              { label: "الرئيسية", href: "#hero" },
              { label: "عن الدكتور", href: "#about" },
              { label: "الخدمات", href: "#services" },
              { label: "الكورسات", href: "#courses" },
              { label: "Eduverse", href: "#eduverse" },
              { label: "تواصل معنا", href: "#contact" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-white/30">
          <p>© {currentYear} د. محمود المهدي — جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
