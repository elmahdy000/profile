import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  GraduationCap,
  Home,
  Layers3,
  Menu,
  MessageCircle,
  MessageSquareQuote,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

type NavStudent = { name: string; status: string };

const navLinks = [
  { label: "الرئيسية", href: "/#hero", id: "hero", icon: Home },
  { label: "المسارات التعليمية", href: "/#tracks", id: "tracks", icon: Layers3 },
  { label: "برنامج البكالوريا", href: "/#baccalaureate", id: "baccalaureate", icon: BookOpen },
  { label: "عن الدكتور", href: "/#about", id: "about", icon: GraduationCap },
  { label: "آراء الطلاب", href: "/#testimonials", id: "testimonials", icon: MessageSquareQuote },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [student, setStudent] = useState<NavStudent | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("app-theme") as "dark" | "light") || "dark";
  });
  const studentCacheRef = useRef<{ data: NavStudent | null; ts: number } | null>(null);
  const { get } = useSiteSettings();
  const logoUrl = get(SETTINGS_KEYS.SITE_LOGO_URL, "/logo.webp");

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("app-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new CustomEvent("app-theme-changed", { detail: nextTheme }));
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadStudent = () => {
      const cache = studentCacheRef.current;
      if (cache && Date.now() - cache.ts < 5 * 60 * 1000) {
        setStudent(cache.data);
        return;
      }
      fetch("/api/student/me", { credentials: "include" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          const s = data?.student || null;
          studentCacheRef.current = { data: s, ts: Date.now() };
          setStudent(s);
        })
        .catch(() => {
          studentCacheRef.current = { data: null, ts: Date.now() };
          setStudent(null);
        });
    };
    const onAuthChange = () => {
      studentCacheRef.current = null;
      loadStudent();
    };
    if (window.location.pathname !== "/platform") loadStudent();
    window.addEventListener("student-auth-changed", onAuthChange);
    return () => window.removeEventListener("student-auth-changed", onAuthChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (window.location.pathname === "/platform")
      setActiveSection("platform-account");
    const observers: IntersectionObserver[] = [];
    navLinks.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (!element) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-40% 0px -55% 0px" },
      );
      observer.observe(element);
      observers.push(observer);
    });
    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <nav
        aria-label="التنقل الرئيسي"
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          theme === "light"
            ? "bg-white/95 border-b border-slate-200 text-slate-900 shadow-sm"
            : isScrolled
            ? "h-[74px] bg-[#07111f]/95 shadow-[0_8px_30px_rgba(0,0,0,0.25)] border-b border-[rgba(148,163,184,0.14)]"
            : "h-[78px] md:h-[82px] bg-[#07111f]/92 shadow-[0_8px_30px_rgba(0,0,0,0.18)] border-b border-[rgba(148,163,184,0.14)]"
        } backdrop-blur-[18px]`}
        dir="rtl"
      >
        <div className="mx-auto flex h-full max-w-[1480px] items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12">
          {/* Brand Area (Right) */}
          <a
            href="/"
            className="group flex shrink-0 items-center gap-3 rounded-xl transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          >
            <div className="relative">
              <img
                src={logoUrl}
                alt="د. محمود المهدي"
                width={48}
                height={48}
                className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-full border border-[rgba(96,165,250,0.35)] object-cover shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-center text-right">
              <span className={`block text-[18px] sm:text-[20px] font-extrabold leading-[1.2] tracking-tight ${theme === "light" ? "text-slate-900" : "text-[#F8FAFC]"}`}>
                د. محمود المهدي
              </span>
              <span className={`hidden sm:block text-[12px] font-medium leading-[1.4] ${theme === "light" ? "text-slate-500" : "text-[#94A3B8]"}`}>
                منصة البرمجة وعلوم الحاسب
              </span>
            </div>
          </a>

          {/* Navigation Links (Center) */}
          <div className="hidden items-center lg:flex">
            <ul className="flex items-center gap-6 xl:gap-8">
              {navLinks.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <li key={link.id} className="relative">
                    <a
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative flex h-[44px] items-center rounded-[10px] px-3 text-[15px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${
                        isActive
                          ? "font-bold text-[#3B82F6] bg-[rgba(59,130,246,0.10)]"
                          : theme === "light"
                          ? "font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          : "font-semibold text-[#94A3B8] hover:bg-[rgba(148,163,184,0.07)] hover:text-[#F8FAFC]"
                      }`}
                    >
                      {link.label}
                    </a>
                    {isActive && (
                      <span className="absolute bottom-[-6px] left-1/2 h-[2.5px] w-5 -translate-x-1/2 rounded-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Actions (Left) */}
          <div className="hidden items-center gap-3 sm:flex">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "التحويل للوضع الفاتح (Light Mode)" : "التحويل للوضع الداكن (Dark Mode)"}
              className={`flex h-[44px] w-[44px] items-center justify-center rounded-[12px] border transition-all ${
                theme === "light"
                  ? "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "border-[rgba(148,163,184,0.22)] bg-transparent text-[#CBD5E1] hover:bg-[rgba(148,163,184,0.08)] hover:text-[#F8FAFC]"
              }`}
            >
              {theme === "dark" ? <Moon className="h-5 w-5 text-amber-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
            </button>

            <a
              href="https://wa.me/201044348610"
              target="_blank"
              rel="noreferrer"
              aria-label="تواصل عبر الواتساب"
              className={`flex h-[44px] items-center gap-2 rounded-[12px] border px-4 text-[14px] font-semibold transition-all duration-200 ${
                theme === "light"
                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  : "border-[rgba(148,163,184,0.22)] bg-transparent text-[#CBD5E1] hover:bg-[rgba(148,163,184,0.08)] hover:text-[#F8FAFC]"
              }`}
            >
              <MessageCircle className="h-[18px] w-[18px] text-[#25D366]" />
              <span>واتساب</span>
            </a>

            <a
              href="/platform"
              className="flex h-[44px] items-center justify-center rounded-[12px] bg-[#3B82F6] px-5 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#2563EB] active:translate-y-0"
            >
              {student ? "متابعة التعلم" : "دخول المنصة"}
            </a>
          </div>

          {/* Mobile Actions & Toggle */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex h-[40px] w-[40px] items-center justify-center rounded-[10px] border transition-all ${
                theme === "light"
                  ? "border-slate-300 bg-slate-100 text-slate-700"
                  : "border-[rgba(148,163,184,0.22)] bg-transparent text-[#CBD5E1]"
              }`}
            >
              {theme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-600" />}
            </button>

            <a
              href="/platform"
              className="flex h-[40px] items-center justify-center rounded-[10px] bg-[#3B82F6] px-3.5 text-[13px] font-bold text-white shadow-md transition hover:bg-[#2563EB]"
            >
              {student ? "متابعة" : "دخول المنصة"}
            </a>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
              aria-label="افتح القائمة"
              className={`grid h-[42px] w-[42px] place-items-center rounded-[10px] border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${
                theme === "light"
                  ? "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
                  : "border-[rgba(148,163,184,0.20)] bg-[rgba(148,163,184,0.08)] text-[#F8FAFC] hover:bg-[rgba(148,163,184,0.15)]"
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Tablet Menu Toggle (between sm and lg) */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label="افتح القائمة"
            className={`hidden sm:grid lg:hidden h-[44px] w-[44px] place-items-center rounded-[12px] border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] ${
              theme === "light"
                ? "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
                : "border-[rgba(148,163,184,0.20)] bg-[rgba(148,163,184,0.08)] text-[#F8FAFC] hover:bg-[rgba(148,163,184,0.15)]"
            }`}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile / Tablet Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            />

            {/* Menu Panel */}
            <motion.div
              id="mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-label="قائمة التنقل"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed top-[74px] right-3 left-3 z-[70] max-h-[85vh] overflow-y-auto rounded-[16px] border border-[rgba(148,163,184,0.16)] bg-[#101D31] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.38)] lg:hidden"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.12)] pb-3.5 mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="د. محمود المهدي"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border border-[rgba(96,165,250,0.35)] object-cover"
                  />
                  <div>
                    <strong className="block text-[16px] font-extrabold text-[#F8FAFC]">
                      د. محمود المهدي
                    </strong>
                    <span className="block text-[12px] text-[#94A3B8]">
                      منصة البرمجة وعلوم الحاسب
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="إغلاق القائمة"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[rgba(148,163,184,0.20)] bg-[rgba(148,163,184,0.08)] text-[#94A3B8] transition hover:text-[#F8FAFC]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {student && (
                <div className="mb-3 flex items-center gap-3 rounded-[12px] border border-[rgba(59,130,246,0.20)] bg-[rgba(59,130,246,0.08)] p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#3B82F6]/20 text-[#60A5FA]">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] text-[#94A3B8]">أهلًا بك</span>
                    <strong className="block truncate text-[14px] font-bold text-[#F8FAFC]">
                      {student.name}
                    </strong>
                  </div>
                </div>
              )}

              <nav className="space-y-1.5" aria-label="القائمة الرئيسية">
                {navLinks.map(({ label, href, id, icon: Icon }) => {
                  const isActive = activeSection === id;
                  return (
                    <a
                      key={id}
                      href={href}
                      onClick={closeMenu}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex h-[48px] items-center justify-between rounded-[10px] px-3.5 text-[15px] font-semibold transition ${
                        isActive
                          ? "bg-[rgba(59,130,246,0.12)] text-[#60A5FA] font-bold"
                          : "text-[#CBD5E1] hover:bg-[rgba(148,163,184,0.08)] hover:text-[#F8FAFC]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-[#60A5FA]" />
                        <span>{label}</span>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-[#64748B]" />
                    </a>
                  );
                })}
              </nav>

              <div className="mt-4 pt-3 border-t border-[rgba(148,163,184,0.12)] flex flex-col gap-2">
                <a
                  href="https://wa.me/201044348610"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMenu}
                  className="flex h-[48px] items-center justify-center gap-2 rounded-[12px] border border-[rgba(148,163,184,0.22)] bg-transparent px-4 text-[14px] font-bold text-[#25D366] transition hover:bg-[rgba(37,211,102,0.10)]"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>تواصل عبر الواتساب</span>
                </a>

                <a
                  href="/platform"
                  onClick={closeMenu}
                  className="flex h-[48px] items-center justify-center rounded-[12px] bg-[#3B82F6] px-4 text-[14px] font-bold text-white shadow-md transition hover:bg-[#2563EB]"
                >
                  {student ? "متابعة التعلم" : "دخول المنصة"}
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

