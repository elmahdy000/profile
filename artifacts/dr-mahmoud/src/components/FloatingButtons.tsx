import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowUp } from "lucide-react";

export function FloatingButtons() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-end gap-3 sm:bottom-6 sm:left-6">
      <AnimatePresence>
        {showTop && (
          <motion.button
            key="top"
            initial={{ opacity: 0, scale: 0.5, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 15 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            onClick={scrollToTop}
            className="hidden h-11 w-11 rounded-full border border-slate-200 bg-white text-slate-600 shadow-lg transition-all hover:border-primary hover:text-primary sm:flex sm:items-center sm:justify-center"
            aria-label="العودة للأعلى"
          >
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.a
        href="https://wa.me/201044348610"
        target="_blank"
        rel="noreferrer"
        aria-label="تواصل على واتساب"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 22 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/20 transition-colors hover:bg-[#20bd5a] sm:h-14 sm:w-14"
      >
        <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 fill-white" />
      </motion.a>
    </div>
  );
}
