import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { label: "الرئيسية", href: "#hero" },
    { label: "عن الدكتور", href: "#about" },
    { label: "الخدمات", href: "#services" },
    { label: "Eduverse", href: "#eduverse" },
    { label: "الكورسات", href: "#courses" },
    { label: "نماذج الشغل", href: "#portfolio" },
    { label: "تواصل", href: "#contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0f0f0f]/95 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-xl">م</div>
          <span className="font-bold text-xl text-primary">د. محمود المهدي</span>
        </div>

        <div className="hidden lg:flex items-center gap-8">
          <ul className="flex items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-foreground/70 hover:text-primary transition-colors font-medium text-sm"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 font-bold">
            <a href="#contact">احجز مجانًا</a>
          </Button>
        </div>

        <button
          className="lg:hidden text-foreground"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="button-mobile-menu"
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden bg-[#0f0f0f] border-b border-white/10 px-4 py-4"
        >
          <ul className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block text-foreground/70 hover:text-primary font-medium transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full mt-2 font-bold">
                <a href="#contact" onClick={() => setIsOpen(false)}>احجز مجانًا</a>
              </Button>
            </li>
          </ul>
        </motion.div>
      )}
    </nav>
  );
}
