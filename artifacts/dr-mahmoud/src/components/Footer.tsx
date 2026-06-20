export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0f2342] text-white/80 py-12 border-t border-white/10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-right">
            <h2 className="text-2xl font-bold text-white mb-2">د. محمود المهدي</h2>
            <p className="text-sm text-white/60 mb-2">البرمجة | الذكاء الاصطناعي | ICDL | Eduverse</p>
            <p className="text-sm text-white/60">الزقازيق، مصر</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            <a href="#hero" className="hover:text-accent transition-colors">الرئيسية</a>
            <a href="#about" className="hover:text-accent transition-colors">عن الدكتور</a>
            <a href="#services" className="hover:text-accent transition-colors">الخدمات</a>
            <a href="#courses" className="hover:text-accent transition-colors">الكورسات</a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-white/40">
          <p>© {currentYear} د. محمود المهدي. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
