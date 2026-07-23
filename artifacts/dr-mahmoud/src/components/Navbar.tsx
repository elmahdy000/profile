import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  GraduationCap,
  Home,
  Layers3,
  Menu,
  MessageCircle,
  MessageSquareQuote,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSiteSettings, SETTINGS_KEYS } from "@/hooks/useSiteSettings";

type NavStudent = { name: string; status: string };

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [student, setStudent] = useState<NavStudent | null>(null);
  const { get } = useSiteSettings();
  const logoUrl = get(SETTINGS_KEYS.SITE_LOGO_URL, "/logo.jpg");
  const siteName = get(SETTINGS_KEYS.SITE_NAME, "د. محمود المهدي");

  const navLinks = [
    { label: "الرئيسية", href: "/#hero", id: "hero", icon: Home },
    {
      label: "المسارات التعليمية",
      href: "/#tracks",
      id: "tracks",
      icon: Layers3,
    },
    { label: "عن الدكتور", href: "/#about", id: "about", icon: GraduationCap },
    {
      label: "آراء الطلاب",
      href: "/#testimonials",
      id: "testimonials",
      icon: MessageSquareQuote,
    },
  ];

  useEffect(() => {
    const loadStudent = () =>
      fetch("/api/student/me", { credentials: "include" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => setStudent(data?.student || null))
        .catch(() => setStudent(null));
    // The platform performs its own session bootstrap. Avoid two expected 401
    // responses for signed-out visitors on that route.
    if (window.location.pathname !== "/platform") void loadStudent();
    window.addEventListener("student-auth-changed", loadStudent);
    return () =>
      window.removeEventListener("student-auth-changed", loadStudent);
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
        className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur"
        dir="rtl"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <a
            href="/"
            className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <img
              src={logoUrl}
              alt="لوجو أكاديمية د. محمود المهدي"
              className="h-10 w-10 shrink-0 rounded-full border border-primary/20 object-cover"
            />
            <div className="text-right">
              <span className="block text-base font-black leading-tight text-primary md:text-lg">
                د. محمود المهدي
              </span>
              <span className="mt-0.5 block max-w-[180px] truncate text-[10px] font-medium text-muted-foreground">
                منصة البرمجة وعلوم الحاسب
              </span>
            </div>
          </a>

          <div className="hidden items-center gap-3 lg:flex">
            <ul className="flex items-center gap-1">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeSection === link.id ? "bg-blue-50 text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-primary"}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href="https://wa.me/201044348610"
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" />
              واتساب
            </a>
            <a
              href="/platform"
              className="flex h-10 items-center rounded-lg bg-primary px-5 text-xs font-bold text-white hover:bg-primary/90"
            >
              {student ? "متابعة التعلم" : "دخول المنصة"}
            </a>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label="افتح القائمة"
            className="grid h-11 w-11 place-items-center rounded-full text-foreground transition hover:bg-slate-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="قائمة التنقل"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-[80] overflow-y-auto bg-[#F7F9FC] lg:hidden"
            dir="rtl"
          >
            <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col px-5 pb-[calc(90px+env(safe-area-inset-bottom))]">
              <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="شعار المنصة"
                    className="h-11 w-11 rounded-full border border-primary/20 object-cover"
                  />
                  <div>
                    <strong className="block text-[17px] leading-6 text-slate-900">
                      منصة د/ المهدي
                    </strong>
                    <span className="block text-xs text-slate-500">
                      بوابتك للتعلم والمتابعة
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="إغلاق القائمة"
                  className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <section className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-primary shadow-sm">
                  <UserRound className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs text-slate-500">أهلًا بك</span>
                  <strong className="block truncate text-base text-slate-900">
                    {student?.name || "زائر المنصة"}
                  </strong>
                  <span className="mt-0.5 block text-xs text-blue-700">
                    {student
                      ? "حسابك متفعّل — تقدر تكمل دروسك"
                      : "سجل دخولك لمتابعة كورساتك"}
                  </span>
                </div>
              </section>

              <nav
                className="mt-[18px] space-y-2.5"
                aria-label="القائمة الرئيسية"
              >
                {navLinks.map(({ label, href, id, icon: Icon }) => (
                  <a
                    key={id}
                    href={href}
                    onClick={closeMenu}
                    aria-current={activeSection === id ? "page" : undefined}
                    className={`flex min-h-14 items-center gap-3 rounded-[14px] border px-4 text-base font-semibold transition active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeSection === id ? "border-blue-100 bg-blue-50 text-primary" : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"}`}
                  >
                    <Icon className="h-[22px] w-[22px] shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronLeft className="h-4 w-4 text-slate-400" />
                  </a>
                ))}
              </nav>

              <div className="my-5 h-px bg-slate-200" />
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="/platform"
                  onClick={closeMenu}
                  className="flex h-[52px] items-center justify-center rounded-[14px] bg-primary px-3 text-sm font-bold text-white transition hover:bg-primary/90 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {student ? "متابعة التعلم" : "دخول المنصة"}
                </a>
                <a
                  href="https://wa.me/201044348610"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMenu}
                  className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] border border-[#25D366] bg-white px-3 text-sm font-bold text-[#168C45] transition hover:bg-green-50 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
                >
                  <MessageCircle className="h-5 w-5" />
                  واتساب
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
