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
    <div className="fixed bottom-4 left-4 z-50 hidden items-end gap-3 sm:bottom-6 sm:left-6 md:flex">
      <AnimatePresence>
        {showTop && (
          <motion.button
            key="top"
            initial={{ opacity: 0, scale: 0.5, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 15 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            onClick={scrollToTop}
            className="hidden h-11 w-11 rounded-full border border-slate-200 bg-white text-slate-600 shadow-lg transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary dark:hover:text-primary sm:flex sm:items-center sm:justify-center"
            aria-label="العودة للأعلى"
          >
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <motion.a
          href="https://wa.me/201025131212"
          target="_blank"
          rel="noreferrer"
          aria-label="تواصل على واتساب 2"
          title="واتساب 01025131212"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 22 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/20 transition-colors hover:bg-blue-700 sm:h-12 sm:w-12"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
        </motion.a>

        <motion.a
          href="https://wa.me/201066711545"
          target="_blank"
          rel="noreferrer"
          aria-label="تواصل على واتساب 1"
          title="واتساب 01066711545"
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
    </div>
  );
}
