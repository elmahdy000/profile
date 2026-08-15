import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  FileText,
  GraduationCap,
  Home,
  Layers3,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquareQuote,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppTheme } from "@/lib/theme";

type NavStudent = { name: string; status: string };

const navLinks = [
  { label: "الرئيسية", href: "/#hero", id: "hero", icon: Home },
  { label: "برنامج البكالوريا", href: "/baccalaureate", id: "baccalaureate", icon: BookOpen },
  { label: "حجز السناتر 📍", href: "/booking", id: "booking", icon: MapPin },
  { label: "مواد حاسبات ومعلومات", href: "/university", id: "university", icon: GraduationCap },
  { label: "الكورسات", href: "/#courses-section", id: "courses-section", icon: Layers3 },
  { label: "عن د. المهدي", href: "/#about", id: "about", icon: UserRound },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [student, setStudent] = useState<NavStudent | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const theme = useAppTheme();
  const studentCacheRef = useRef<{ data: NavStudent | null; ts: number } | null>(null);
  const { get } = useSiteSettings();
  const logoUrl = get(SETTINGS_KEYS.SITE_LOGO_URL, "/logo.webp");

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
        className="sticky top-0 z-50 w-full transition-all duration-300 h-[74px] sm:h-[78px] bg-white/95 border-b border-border text-foreground shadow-xs /95 dark:border-[rgba(148,163,184,0.14)] dark:text-slate-100 dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-[18px]"
        dir="rtl"
      >
        <div className="mx-auto flex h-full max-w-[1536px] items-center justify-between px-3 sm:px-5 md:px-6 lg:px-8">
          {/* Brand Area (Right) */}
          <a
            href="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-xl transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
          >
            <div className="relative">
              <img
                src={logoUrl}
                alt="د. محمود المهدي"
                width={48}
                height={48}
                className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full border border-[rgba(96,165,250,0.35)] object-cover shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-center text-right">
              <span className="block text-[16px] sm:text-[18px] lg:text-[19px] font-black leading-[1.2] tracking-tight text-foreground dark:text-[#F8FAFC]">
                د. محمود المهدي
              </span>
              <span className="hidden md:block text-[11px] font-semibold leading-[1.3] text-muted-foreground dark:text-[#94A3B8]">
                منصة البرمجة وعلوم الحاسب
              </span>
            </div>
          </a>

          {/* Navigation Links (Center) */}
          <div className="hidden items-center lg:flex">
            <ul className="flex items-center gap-1.5 xl:gap-3">
              {navLinks.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <li key={link.id} className="relative">
                    <a
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative flex h-[40px] items-center rounded-xl px-3 text-[14px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] whitespace-nowrap ${
                        isActive
                          ? "text-[#3B82F6] bg-[rgba(59,130,246,0.12)]"
                          : "text-foreground hover:bg-muted hover:text-foreground dark:text-[#CBD5E1] dark:hover:bg-[rgba(148,163,184,0.10)] dark:hover:text-[#F8FAFC]"
                      }`}
                    >
                      {link.label}
                    </a>
                    {isActive && (
                      <span className="absolute bottom-[-4px] left-1/2 h-[2.5px] w-4 -translate-x-1/2 rounded-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Actions (Left) */}
          <div className="hidden items-center gap-2 sm:flex">
            {/* Theme Toggle Button */}
            <ThemeToggle className="h-[40px] w-[40px] shadow-none" />

            <a
              href="https://wa.me/201066711545"
              target="_blank"
              rel="noreferrer"
              aria-label="تواصل عبر الواتساب"
              className="flex h-[40px] items-center gap-1.5 rounded-xl border px-3 text-[13px] font-bold transition-all duration-200 border-border bg-white text-foreground hover:bg-muted dark:border-[rgba(148,163,184,0.18)] dark:bg-[rgba(255,255,255,0.04)] dark:text-[#CBD5E1] dark:hover:bg-[rgba(148,163,184,0.12)] dark:hover:text-[#F8FAFC]"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              <span>واتساب</span>
            </a>

            <a
              href="/parent"
              aria-label="بوابة ولي الأمر"
              className="flex h-[40px] items-center gap-1.5 rounded-xl border px-3 text-[13px] font-bold transition-all duration-200 border-border bg-white text-foreground hover:bg-muted dark:border-[rgba(148,163,184,0.18)] dark:bg-[rgba(255,255,255,0.04)] dark:text-[#CBD5E1] dark:hover:bg-[rgba(148,163,184,0.12)] dark:hover:text-[#F8FAFC]"
            >
              <Users className="h-4 w-4 text-[#3B82F6]" />
              <span>دخول ولي الأمر</span>
            </a>

            <a
              href="/platform"
              className="flex h-[40px] items-center justify-center rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] px-4 text-[13.5px] font-black text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-[1px] active:translate-y-0"
            >
              {student ? "متابعة التعلم" : "دخول المنصة"}
            </a>
          </div>

          {/* Mobile Actions & Toggle */}
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle className="h-[40px] w-[40px] rounded-[10px] shadow-none" />

            <a
              href="/parent"
              aria-label="بوابة ولي الأمر"
              title="دخول ولي الأمر"
              className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] border transition-all border-border bg-muted text-[#3B82F6] dark:border-[rgba(148,163,184,0.22)] dark:bg-transparent dark:text-[#60A5FA]"
            >
              <Users className="h-4.5 w-4.5" />
            </a>

            <a
              href="/platform"
              className="flex h-[40px] items-center justify-center rounded-[10px] bg-[#3B82F6] px-3 text-[12.5px] font-bold text-white shadow-md transition hover:bg-[#2563EB]"
            >
              {student ? "متابعة" : "دخول المنصة"}
            </a>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
              aria-label="افتح القائمة"
              className="grid h-[42px] w-[42px] place-items-center rounded-[10px] border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] border-border bg-muted text-foreground hover:bg-slate-200 dark:border-[rgba(148,163,184,0.20)] dark:bg-[rgba(148,163,184,0.08)] dark:text-[#F8FAFC] dark:hover:bg-[rgba(148,163,184,0.15)]"
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
            className="hidden sm:grid lg:hidden h-[44px] w-[44px] place-items-center rounded-[12px] border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] border-border bg-muted text-foreground hover:bg-slate-200 dark:border-[rgba(148,163,184,0.20)] dark:bg-[rgba(148,163,184,0.08)] dark:text-[#F8FAFC] dark:hover:bg-[rgba(148,163,184,0.15)]"
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
                  href="/parent"
                  onClick={closeMenu}
                  className="flex h-[48px] items-center justify-center gap-2 rounded-[12px] border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-4 text-[14px] font-bold text-[#60A5FA] transition hover:bg-[#3B82F6]/20"
                >
                  <Users className="h-5 w-5 text-[#60A5FA]" />
                  <span>دخول ولي الأمر</span>
                </a>

                <a
                  href="https://wa.me/201066711545"
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

