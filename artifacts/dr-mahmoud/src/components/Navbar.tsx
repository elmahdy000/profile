import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  const navLinks = [
    { label: "الرئيسية", href: "#hero", id: "hero" },
    { label: "عن الدكتور", href: "#about", id: "about" },
    { label: "الخدمات", href: "#services", id: "services" },
    { label: "الكورسات", href: "#courses", id: "courses" },
    { label: "نماذج الشغل", href: "#portfolio", id: "portfolio" },
    { label: "تواصل", href: "#contact", id: "contact" },
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
      <nav className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl">م</div>
            <span className="font-bold text-xl text-primary">د. محمود المهدي</span>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <ul className="flex items-center gap-8">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={`relative font-semibold text-sm transition-colors ${
                      activeSection === link.id
                        ? "text-primary"
                        : "text-foreground/75 hover:text-primary"
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
            <Button asChild className="bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] rounded-full px-6 font-bold h-10 text-sm shadow-md shadow-[#D6A84F]/10 hover:scale-[1.03] transition-all">
              <a href="#contact">احجز مجانًا</a>
            </Button>
          </div>

          <button
            className="lg:hidden text-foreground z-50 p-2 hover:bg-white/5 rounded-lg transition-colors"
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
                    className={`block font-bold text-xl py-3 rounded-xl transition-colors hover:bg-white/5 ${
                      activeSection === link.id ? "text-primary bg-primary/5" : "text-foreground/80"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="mt-6 w-full">
                <Button asChild size="lg" className="w-full bg-gradient-to-r from-[#F2C76E] to-[#D6A84F] hover:from-[#D6A84F] hover:to-[#F2C76E] text-[#070B12] rounded-full font-bold h-14 text-base shadow-md shadow-[#D6A84F]/10 transition-all">
                  <a href="#contact" onClick={() => setIsOpen(false)}>احجز مجانًا</a>
                </Button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
