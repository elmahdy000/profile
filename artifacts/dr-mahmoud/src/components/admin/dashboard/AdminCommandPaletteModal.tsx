import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Users,
  QrCode,
  MapPin,
  CreditCard,
  FileCheck2,
  FileEdit,
  ShieldCheck,
  BookOpen,
  ClipboardCheck,
  Printer,
  FileText,
  FileSpreadsheet,
  Sparkles,
  Library,
  Video,
  FileDown,
  Mic,
  LayoutGrid,
  LayoutDashboard,
  Bell,
  BarChart3,
  Settings,
  Plus,
  CornerDownLeft,
  X,
  Zap,
} from "lucide-react";
import type { AdminTopTab } from "../../AdminDashboard";
import type { AdminLearningTab } from "../../AdminLearning";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "طلاب وسناتر" | "تقييم وامتحانات" | "محتوى ومناهج" | "عمليات وإعدادات" | "إجراءات سريعة";
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  keywords: string[];
  action: () => void;
}

interface AdminCommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: AdminTopTab, subTab?: AdminLearningTab, mode?: string) => void;
  openCourseModal?: (mode: "add" | "edit", course?: any) => void;
  openVideoModal?: (mode: "add" | "edit", video?: any) => void;
  openPodcastModal?: (mode: "add" | "edit", podcast?: any) => void;
  openCurriculumModal?: (mode: "add" | "edit", curriculum?: any) => void;
}

export const AdminCommandPaletteModal: React.FC<AdminCommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  openCourseModal,
  openVideoModal,
  openPodcastModal,
  openCurriculumModal,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = useMemo(() => {
    return [
      // Quick Actions
      {
        id: "quick-exam",
        title: "توليد امتحان فوري (المولد الذكي)",
        subtitle: "سحب أسئلة عشوائية من بنك الأسئلة حسب الدرس والمواصفات",
        category: "إجراءات سريعة",
        icon: Zap,
        badge: "سريع",
        keywords: ["امتحان", "توليد", "اختبار", "اسئلة", "كويز", "exam", "quiz", "generate"],
        action: () => {
          onNavigate("learning", "testbank", "generate");
          onClose();
        },
      },
      {
        id: "quick-attendance",
        title: "كشكول حضور السنتر بـ QR والباركود",
        subtitle: "مسح كود الطالب وتسجيل الحضور المباشر في قاعات السنتر",
        category: "إجراءات سريعة",
        icon: QrCode,
        badge: "سنتر",
        keywords: ["حضور", "غياب", "سنتر", "كشكول", "qr", "barcode", "attendance"],
        action: () => {
          onNavigate("learning", "attendance");
          onClose();
        },
      },
      {
        id: "quick-memo",
        title: "استوديو المذكرات وطباعة A4",
        subtitle: "تجهيز وتنسيق أوراق الامتحانات والمذكرات للطباعة الفورية",
        category: "إجراءات سريعة",
        icon: Printer,
        badge: "A4",
        keywords: ["مذكرة", "طباعة", "ورقة", "a4", "استوديو", "print", "memo"],
        action: () => {
          onNavigate("learning", "memo-studio");
          onClose();
        },
      },
      {
        id: "quick-new-course",
        title: "إضافة كورس أو شعبة جديدة",
        subtitle: "فتح نافذة إنشاء كورس دراسي جديد وتحديد مواصفاته",
        category: "إجراءات سريعة",
        icon: Plus,
        keywords: ["كورس", "جديد", "انشاء", "course", "new", "add"],
        action: () => {
          if (openCourseModal) {
            openCourseModal("add");
          } else {
            onNavigate("courses");
          }
          onClose();
        },
      },
      {
        id: "quick-upload-video",
        title: "رفع ونشر فيديو تعليمي جديد",
        subtitle: "إضافة درس فيديو أو رابط يوتيوب جديد إلى مكتبة الفيديو",
        category: "إجراءات سريعة",
        icon: Plus,
        keywords: ["فيديو", "رفع", "درس", "يوتيوب", "video", "upload"],
        action: () => {
          if (openVideoModal) {
            openVideoModal("add");
            onNavigate("upload-video");
          } else {
            onNavigate("upload-video");
          }
          onClose();
        },
      },

      // Pillar 1: Students & Centers
      {
        id: "students",
        title: "إدارة جميع الطلاب وقبول الحسابات",
        subtitle: "تفعيل الحسابات المعلقة، تعديل البيانات، وتتبع مراحل الطلاب",
        category: "طلاب وسناتر",
        icon: Users,
        keywords: ["طلاب", "طالب", "تفعيل", "قبول", "تسجيل", "students", "accounts"],
        action: () => {
          onNavigate("learning", "students");
          onClose();
        },
      },
      {
        id: "payments",
        title: "إيصالات الدفع والتحويلات البنكية",
        subtitle: "مراجعة صور إيصالات فودافون كاش وإنستاباي وتأكيد السداد",
        category: "طلاب وسناتر",
        icon: FileCheck2,
        keywords: ["دفع", "فلوس", "ايصالات", "تحويلات", "فودافون", "انستاباي", "payments", "receipts"],
        action: () => {
          onNavigate("learning", "payments");
          onClose();
        },
      },
      {
        id: "subscriptions",
        title: "الاشتراكات الشهرية والتجديد",
        subtitle: "متابعة حالة الاشتراكات المجددة والموقوفة ومواعيد التجديد",
        category: "طلاب وسناتر",
        icon: CreditCard,
        keywords: ["اشتراكات", "تجديد", "شهري", "subscriptions", "renew"],
        action: () => {
          onNavigate("learning", "subscriptions");
          onClose();
        },
      },
      {
        id: "center-bookings",
        title: "جدول ومواعيد السناتر والمجموعات",
        subtitle: "إدارة قاعات ومواعيد السناتر الحضورية بالزقازيق",
        category: "طلاب وسناتر",
        icon: MapPin,
        keywords: ["سنتر", "مواعيد", "حجز", "قاعات", "centers", "bookings"],
        action: () => {
          onNavigate("learning", "center-bookings");
          onClose();
        },
      },
      {
        id: "summaries",
        title: "تدقيق كشكول التلخيصات والواجب",
        subtitle: "مراجعة كشاكيل الطلاب المرفوعة واعتماد نقاط الالتزام",
        category: "طلاب وسناتر",
        icon: FileEdit,
        keywords: ["كشكول", "تلخيص", "واجب", "دفتر", "summaries", "homework"],
        action: () => {
          onNavigate("learning", "summaries");
          onClose();
        },
      },
      {
        id: "parents",
        title: "حسابات أولياء الأمور والتقارير",
        subtitle: "أرقام وتواصل أولياء الأمور وربط الأبناء بالتقارير الأسبوعية",
        category: "طلاب وسناتر",
        icon: ShieldCheck,
        keywords: ["ولي", "امر", "اباء", "امهات", "اهالي", "parents"],
        action: () => {
          onNavigate("parents");
          onClose();
        },
      },

      // Pillar 2: Assessment & Exams
      {
        id: "testbank",
        title: "بنك الأسئلة الموحد (3,292 سؤال)",
        subtitle: "تصفح وتعديل أسئلة الاختيار من متعدد والمقالي مع التقييمات الرسمية",
        category: "تقييم وامتحانات",
        icon: BookOpen,
        keywords: ["بنك", "اسئلة", "اختياري", "مقالي", "تقييمات", "وزارة", "questions", "bank"],
        action: () => {
          onNavigate("learning", "testbank");
          onClose();
        },
      },
      {
        id: "quizzes",
        title: "إدارة الاختبارات والواجبات المجدولة",
        subtitle: "إنشاء ونشر الامتحانات وتحديد مواعيد البدء والنهاية",
        category: "تقييم وامتحانات",
        icon: ClipboardCheck,
        keywords: ["امتحانات", "اختبارات", "واجبات", "كويزات", "نشر", "quizzes", "exams"],
        action: () => {
          onNavigate("learning", "quizzes");
          onClose();
        },
      },
      {
        id: "essay-exams",
        title: "تصحيح المقالي واستلام الإجابات",
        subtitle: "فحص إجابات الطلاب المقالية ووضع الدرجات والملاحظات",
        category: "تقييم وامتحانات",
        icon: FileText,
        keywords: ["مقالي", "تصحيح", "درجات", "اجابات", "essay", "grading"],
        action: () => {
          onNavigate("learning", "essay-exams");
          onClose();
        },
      },
      {
        id: "grades-sheet",
        title: "شيت درجات ونتائج الاختبارات",
        subtitle: "جدول درجات الطلاب الشامل وتصدير النتائج إلى Excel",
        category: "تقييم وامتحانات",
        icon: FileSpreadsheet,
        keywords: ["درجات", "شيت", "نتائج", "اكسيل", "excel", "grades", "results"],
        action: () => {
          onNavigate("learning", "grades-sheet");
          onClose();
        },
      },
      {
        id: "self-assessment-packs",
        title: "باقات التقييم الذاتي المفتوح",
        subtitle: "إدارة أرصدة ومحاولات الاختبارات الذاتية للطلاب والزوار",
        category: "تقييم وامتحانات",
        icon: Sparkles,
        keywords: ["تقييم", "ذاتي", "باقات", "محاولات", "self-assessment"],
        action: () => {
          onNavigate("learning", "self-assessment-packs");
          onClose();
        },
      },

      // Pillar 3: Content & Curriculums
      {
        id: "curriculums",
        title: "المناهج التعليمية والصفوف الدراسية",
        subtitle: "إدارة وتوزيع وحدات ودروس المنهج المصري المعتمد",
        category: "محتوى ومناهج",
        icon: Library,
        keywords: ["مناهج", "منهج", "صفوف", "وحدات", "دروس", "curriculums"],
        action: () => {
          onNavigate("curriculums");
          onClose();
        },
      },
      {
        id: "courses",
        title: "الكورسات والشعب الدراسية",
        subtitle: "إعداد الكورسات وتخصيص الصلاحيات وبوابات الحصص",
        category: "محتوى ومناهج",
        icon: BookOpen,
        keywords: ["كورسات", "كورس", "دورات", "courses"],
        action: () => {
          onNavigate("courses");
          onClose();
        },
      },
      {
        id: "videos",
        title: "مكتبة الفيديوهات والشروحات",
        subtitle: "إدارة روابط HLS وفيديوهات الشرح وجودات العرض",
        category: "محتوى ومناهج",
        icon: Video,
        keywords: ["فيديوهات", "شرح", "فيديو", "حصص", "videos", "player"],
        action: () => {
          onNavigate("videos");
          onClose();
        },
      },
      {
        id: "files",
        title: "المذكرات والملفات التعليمية PDF",
        subtitle: "رفع الملازم ومذكرات المراجعة وتحديد صلاحيات التنزيل",
        category: "محتوى ومناهج",
        icon: FileDown,
        keywords: ["مذكرات", "ملفات", "pdf", "ملازم", "files", "downloads"],
        action: () => {
          onNavigate("learning", "files");
          onClose();
        },
      },
      {
        id: "kholasa",
        title: "الزتونة والخرائط الذهنية والمصطلحات",
        subtitle: "إدارة كبسولات المراجعة المركزة والتعريفات النموذجية",
        category: "محتوى ومناهج",
        icon: Sparkles,
        keywords: ["زتونة", "خلاصة", "خرائط", "مصطلحات", "kholasa", "mindmaps"],
        action: () => {
          onNavigate("learning", "kholasa");
          onClose();
        },
      },
      {
        id: "podcasts",
        title: "البودكاست التعليمي الصوتي",
        subtitle: "إدارة التسجيلات الصوتية والشروحات المسموعة",
        category: "محتوى ومناهج",
        icon: Mic,
        keywords: ["بودكاست", "صوت", "تسجيلات", "podcasts", "audio"],
        action: () => {
          onNavigate("podcasts");
          onClose();
        },
      },

      // Pillar 4: Operations & Settings
      {
        id: "hub",
        title: "لوحة البطاقات السريعة الرئيسية",
        subtitle: "عرض كل بوابات الإدارة في بطاقات تفاعلية أنيقة",
        category: "عمليات وإعدادات",
        icon: LayoutGrid,
        keywords: ["رئيسية", "بطاقات", "هوب", "لوحة", "hub", "home"],
        action: () => {
          onNavigate("hub");
          onClose();
        },
      },
      {
        id: "overview",
        title: "اللوحة التشغيلية والمؤشرات الحيوية",
        subtitle: "إحصائيات المنصة الحية، النشاط اليومي، ونسب التفاعل",
        category: "عمليات وإعدادات",
        icon: LayoutDashboard,
        keywords: ["مؤشرات", "احصائيات", "تشغيلية", "overview", "dashboard"],
        action: () => {
          onNavigate("learning", "overview");
          onClose();
        },
      },
      {
        id: "notifications",
        title: "مركز إرسال الإشعارات ورسائل البث",
        subtitle: "إرسال إشعارات وتنبيهات مخصصة لطلاب صفوف معينة",
        category: "عمليات وإعدادات",
        icon: Bell,
        keywords: ["اشعارات", "رسائل", "تنبيهات", "بث", "notifications", "broadcast"],
        action: () => {
          onNavigate("learning", "notifications");
          onClose();
        },
      },
      {
        id: "reports",
        title: "التقارير الشاملة والتحليلات المتقدمة",
        subtitle: "تقارير أداء الطلاب، نسب الغياب، وتصدير البيانات",
        category: "عمليات وإعدادات",
        icon: BarChart3,
        keywords: ["تقارير", "تحليلات", "بيانات", "اداء", "reports", "analytics"],
        action: () => {
          onNavigate("learning", "reports");
          onClose();
        },
      },
      {
        id: "settings",
        title: "إعدادات المنصة والبوتات وحسابات المشرفين",
        subtitle: "ضبط بوابات الدفع، بوتات الواتساب وتليجرام، وتصاريح المشرفين",
        category: "عمليات وإعدادات",
        icon: Settings,
        keywords: ["اعدادات", "بوتات", "مشرفين", "حسابات", "settings", "admins"],
        action: () => {
          onNavigate("settings");
          onClose();
        },
      },
    ];
  }, [onNavigate, onClose, openCourseModal, openVideoModal, openPodcastModal, openCurriculumModal]);

  // Filter commands by search query
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => {
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.subtitle.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [commands, query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl"
          dir="rtl"
        >
          {/* Top Search Input */}
          <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3.5">
            <Search className="h-5 w-5 text-blue-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="ابحث عن أي قسم، ميزة، طالب، مذكرة، أو امتحان... (Ctrl+K)"
              className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-white placeholder-slate-400 outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-400 border border-slate-700">
                ESC للإغلاق
              </span>
            )}
          </div>

          {/* Results List */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredCommands.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Search className="h-8 w-8 mx-auto opacity-40 text-slate-500" />
                <p className="text-sm font-bold">لا توجد نتائج مطابقة لـ "{query}"</p>
                <p className="text-xs text-slate-500">جرب البحث بكلمة أخرى مثل: طلاب، حضور، مقالي، مذكرة، امتحان</p>
              </div>
            ) : (
              filteredCommands.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-right transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600/20 text-white border border-blue-500/40 shadow-xs"
                        : "text-slate-300 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-800 text-blue-400 border border-slate-700/60"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-xs sm:text-sm font-bold text-white truncate">
                            {item.title}
                          </strong>
                          {item.badge && (
                            <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.2 text-[10px] font-black">
                              {item.badge}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-semibold bg-slate-800/80 px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                      {isSelected && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-blue-400">
                          <span>انتقال</span>
                          <CornerDownLeft className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2.5 text-[11px] font-medium text-slate-400 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <span>↑↓ للتنقل</span>
              <span>↵ للاختيار</span>
            </div>
            <span className="font-mono text-slate-500">
              {filteredCommands.length} نتيجة متاحة
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
