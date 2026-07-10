import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, GraduationCap } from "lucide-react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const { get } = useSiteSettings();
  const logoUrl = get(SETTINGS_KEYS.SITE_LOGO_URL, "/logo.jpg");
  const siteName = get(SETTINGS_KEYS.SITE_NAME, "د. محمود المهدي");

  const navLinks = [
    { label: "الرئيسية", href: "/#hero", id: "hero" },
    { label: "المسارات التعليمية", href: "/#learning-tracks", id: "learning-tracks" },
    { label: "الكورسات", href: "/#courses", id: "courses" },
    { label: "الورش المجانية", href: "/#free-workshop", id: "free-workshop" },
    { label: "عن الدكتور", href: "/#about", id: "about" },
    { label: "آراء الطلاب", href: "/#testimonials", id: "testimonials" },
    { label: "المنصة التعليمية", href: "/#youtube-lectures", id: "youtube-lectures" },
    { label: "تواصل معنا", href: "/#contact", id: "contact" },
  ];

  useEffect(() => {
    const sectionIds = navLinks.map((l) => l.id);
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-40% 0px -55% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 shrink-0">
            <img src={logoUrl} alt="Logo" className="w-10 h-10 object-cover rounded-full border border-primary/20 shrink-0" />
            <div className="flex flex-col text-right">
              <span className="font-bold text-base md:text-lg leading-tight text-foreground">{siteName.split("|")[0].trim()}</span>
              {siteName.split("|")[1] && (
                <span className="text-[10px] text-muted-foreground font-medium leading-none mt-0.5 max-w-[180px] md:max-w-xs truncate">
                  {siteName.split("|")[1].replace("بالزقازيق", "").trim()}
                </span>
              )}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 xl:gap-6">
            <ul className="flex items-center gap-2 xl:gap-5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                     href={link.href}
                     className={`relative font-semibold text-[11px] xl:text-sm transition-colors ${
                       activeSection === link.id
                         ? "text-primary font-bold"
                         : "text-muted-foreground hover:text-primary"
                     }`}
                  >
                    {link.label}
                    {activeSection === link.id && (
                      <motion.span
                        layoutId="nav-indicator"
                        className="absolute -bottom-1 right-0 left-0 h-0.5 bg-primary rounded-full"
                      />
                    )}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full font-bold h-10 text-xs border-primary text-primary hover:bg-primary/5">
                <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer">تواصل واتساب</a>
              </Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground rounded-full px-5 font-bold h-10 text-xs shadow-md transition-all gap-2">
                <a href="/#youtube-lectures">
                  دخول المنصة
                </a>
              </Button>
            </div>
          </div>

          <button
            className="lg:hidden text-foreground z-50 p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Full-screen RTL Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-40 bg-background/98 backdrop-blur-lg flex flex-col justify-center items-center px-6 lg:hidden"
          >
            <ul className="flex flex-col gap-6 text-center w-full max-w-xs">
              {navLinks.map((link) => (
                <li key={link.href} className="w-full">
                  <a
                    href={link.href}
                    className={`block font-bold text-xl py-3 rounded-xl transition-colors hover:bg-muted ${
                      activeSection === link.id ? "text-primary bg-primary/5" : "text-foreground/80"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="mt-6 flex flex-col gap-3 w-full">
                <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/95 text-primary-foreground rounded-full font-bold h-14 text-base shadow-md transition-all gap-2">
                  <a href="/#youtube-lectures" onClick={() => setIsOpen(false)}>دخول المنصة</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full rounded-full font-bold h-14 text-base border-primary text-primary hover:bg-primary/5">
                  <a href="https://wa.me/201044348610" target="_blank" rel="noreferrer" onClick={() => setIsOpen(false)}>تواصل واتساب</a>
                </Button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
