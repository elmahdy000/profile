import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Home,
  BookOpen,
  ClipboardCheck,
  FileEdit,
  FileText,
  Code2,
  FolderOpen,
  Sparkles,
  User,
  Play,
  X,
  Clock,
  CornerDownLeft,
  FileDown,
  ArrowRight,
  LucideIcon,
} from "lucide-react";
import type { LearningFile, Quiz, VideoSummary } from "@/types/platform";

interface PaletteItem {
  id: string;
  category: "أقسام المنصة" | "المحاضرات والدروس" | "الاختبارات والامتحانات" | "المذكرات والملفات";
  title: string;
  subtitle?: string;
  badge?: string;
  icon: LucideIcon;
  onSelect: () => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  videos,
  quizzes,
  files,
  onSelectTab,
  onSelectVideo,
  onStartQuiz,
}: {
  isOpen: boolean;
  onClose: () => void;
  videos: VideoSummary[];
  quizzes: Quiz[];
  files: LearningFile[];
  onSelectTab: (tab: any) => void;
  onSelectVideo: (videoId: number) => void;
  onStartQuiz: (quiz: Quiz) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Static Navigation Sections
  const navActions: PaletteItem[] = useMemo(() => [
    {
      id: "nav-dashboard",
      category: "أقسام المنصة",
      title: "الرئيسية (لوحة المتابعة)",
      subtitle: "نظرة عامة على تقدمك، الاختبارات القادمة، وآخر الدروس",
      badge: "الرئيسية",
      icon: Home,
      onSelect: () => {
        onSelectTab("dashboard");
        onClose();
      },
    },
    {
      id: "nav-lessons",
      category: "أقسام المنصة",
      title: "المحاضرات والدروس المشروحة",
      subtitle: "مكتبة الفيديوهات والشروحات المتكاملة مع إمكانية التقديم",
      badge: "فيديوهات",
      icon: BookOpen,
      onSelect: () => {
        onSelectTab("lessons");
        onClose();
      },
    },
    {
      id: "nav-quizzes",
      category: "أقسام المنصة",
      title: "الاختبارات الإلكترونية والتقييمات",
      subtitle: "امتحانات تفاعلية مع تصحيح فوري وتحليل نقاط الضعف",
      badge: "امتحانات",
      icon: ClipboardCheck,
      onSelect: () => {
        onSelectTab("quizzes");
        onClose();
      },
    },
    {
      id: "nav-essay",
      category: "أقسام المنصة",
      title: "الامتحانات المقالية ونماذج الإجابة",
      subtitle: "تدريب على الأسئلة المقالية النموذجية ومقارنة الحلول",
      badge: "مقالي",
      icon: FileEdit,
      onSelect: () => {
        onSelectTab("essay-exams");
        onClose();
      },
    },
    {
      id: "nav-summaries",
      category: "أقسام المنصة",
      title: "تلخيصاتي ومذكراتي",
      subtitle: "رفع صور تلخيص كشكولك للمراجعة والحصول على اعتماد الدكتور",
      badge: "مذكراتي",
      icon: FileText,
      onSelect: () => {
        onSelectTab("summaries");
        onClose();
      },
    },
    {
      id: "nav-compiler",
      category: "أقسام المنصة",
      title: "محرر ومترجم البرمجة C++",
      subtitle: "بيئة تشغيل وبرمجة تفاعلية لتطبيق خوارزميات وأكواد الكورس",
      badge: "كود",
      icon: Code2,
      onSelect: () => {
        onSelectTab("compiler");
        onClose();
      },
    },
    {
      id: "nav-files",
      category: "أقسام المنصة",
      title: "المذكرات والملفات التعليمية (PDF)",
      subtitle: "كتب، ملخصات، مذكرات الشرح والواجبات بصيغة PDF",
      badge: "PDF",
      icon: FolderOpen,
      onSelect: () => {
        onSelectTab("files");
        onClose();
      },
    },
    {
      id: "nav-self-assessment",
      category: "أقسام المنصة",
      title: "بنك الأسئلة وتقييم القدرات",
      subtitle: "اختبارات ذاتية لقياس مستوى الفهم وتثبيت المفاهيم",
      badge: "ذاتي",
      icon: Sparkles,
      onSelect: () => {
        onSelectTab("self-assessment");
        onClose();
      },
    },
    {
      id: "nav-profile",
      category: "أقسام المنصة",
      title: "حسابي وإعدادات الاشتراك",
      subtitle: "تعديل البيانات الشخصية، كود الطالب، والأجهزة المتصلة",
      badge: "حسابي",
      icon: User,
      onSelect: () => {
        onSelectTab("profile");
        onClose();
      },
    },
  ], [onSelectTab, onClose]);

  // Dynamic filter across videos, quizzes, files, and nav actions
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Navigation Actions Filter
    const matchedActions = navActions.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );

    // 2. Video Lessons
    const matchedVideos: PaletteItem[] = videos
      .filter((v) => {
        if (!q) return true;
        return (
          v.title.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          (v.description && v.description.toLowerCase().includes(q))
        );
      })
      .slice(0, q ? 10 : 4) // Show 4 most recent if no search, up to 10 if searching
      .map((v) => ({
        id: `video-${v.id}`,
        category: "المحاضرات والدروس",
        title: v.title,
        subtitle: `${v.category} • ${v.durationText || "شرح فيديو"}`,
        badge: "تشغيل",
        icon: Play,
        onSelect: () => {
          onSelectVideo(v.id);
          onClose();
        },
      }));

    // 3. Quizzes
    const matchedQuizzes: PaletteItem[] = quizzes
      .filter((quiz) => {
        if (!q) return false; // Show quizzes only when searched or explicitly requested
        return (
          quiz.title.toLowerCase().includes(q) ||
          quiz.category.toLowerCase().includes(q) ||
          (quiz.stage && quiz.stage.toLowerCase().includes(q))
        );
      })
      .slice(0, 8)
      .map((quiz) => ({
        id: `quiz-${quiz.id}`,
        category: "الاختبارات والامتحانات",
        title: quiz.title,
        subtitle: `${quiz.category} • ${quiz.durationMinutes ? `${quiz.durationMinutes} دقيقة` : "غير محدد"} • درجة النجاح ${quiz.passingScore}%`,
        badge: quiz.locked ? "مغلق" : "بدء الاختبار",
        icon: ClipboardCheck,
        onSelect: () => {
          if (quiz.locked) {
            onSelectTab("quizzes");
          } else {
            onStartQuiz(quiz);
          }
          onClose();
        },
      }));

    // 4. Learning Files
    const matchedFiles: PaletteItem[] = files
      .filter((f) => {
        if (!q) return false;
        return (
          f.title.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          (f.originalName && f.originalName.toLowerCase().includes(q))
        );
      })
      .slice(0, 8)
      .map((f) => {
        const sizeText = f.sizeBytes
          ? `${(f.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          : "PDF";
        return {
          id: `file-${f.id}`,
          category: "المذكرات والملفات",
          title: f.title,
          subtitle: `${f.category} • ${sizeText} • ${f.originalName || "ملف تعليمي"}`,
          badge: "عرض الملفات",
          icon: FileDown,
          onSelect: () => {
            onSelectTab("files");
            onClose();
          },
        };
      });

    return [...matchedActions, ...matchedVideos, ...matchedQuizzes, ...matchedFiles];
  }, [query, navActions, videos, quizzes, files, onSelectVideo, onStartQuiz, onSelectTab, onClose]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (filteredItems.length === 0) return 0;
      return Math.min(prev, filteredItems.length - 1);
    });
  }, [filteredItems.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredItems.length - 1)));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const current = filteredItems[selectedIndex];
        if (current) {
          current.onSelect();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4" dir="rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/90 dark:border-[#1E2E48] bg-white dark:bg-[#0A101D] shadow-2xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/40 before:to-transparent"
        >
          {/* Search Header Bar */}
          <div className="relative flex items-center border-b border-slate-200/80 dark:border-[#1E2E48] px-4 py-3.5 bg-slate-50/50 dark:bg-[#0D1726]/40">
            <Search className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0 ml-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="ابحث عن درس، اختبار، مذكرة، أو انتقل لقسم... (مثال: البرمجة، الفصل الأول)"
              className="h-7 w-full bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070D18] px-2 py-0.5 font-mono text-[11px] font-bold text-slate-400 dark:text-slate-500 shadow-2xs shrink-0 mr-1.5">
              ESC للإغلاق
            </kbd>
          </div>

          {/* Results List */}
          <div ref={listRef} className="max-h-[60vh] sm:max-h-[460px] overflow-y-auto p-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Search className="h-8 w-8 mx-auto text-slate-400/60 dark:text-slate-600" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  لم يتم العثور على نتائج لـ "{query}"
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  تأكد من كتابة الكلمات بشكل صحيح أو ابحث بكلمات عامة مثل (امتحان، درس، كود، تلخيص).
                </p>
              </div>
            ) : (
              (() => {
                let currentCategory = "";
                return filteredItems.map((item, index) => {
                  const isNewCategory = item.category !== currentCategory;
                  if (isNewCategory) {
                    currentCategory = item.category;
                  }
                  const isSelected = index === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <div key={item.id}>
                      {isNewCategory && (
                        <div className="px-3 pt-3 pb-1.5 text-[11px] font-black text-slate-400 dark:text-slate-500 flex items-center justify-between">
                          <span>{item.category}</span>
                          {index === 0 && (
                            <span className="text-[10px] font-medium text-slate-400">
                              {filteredItems.length} نتيجة متاحة
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        data-index={index}
                        onClick={item.onSelect}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`group w-full flex items-center justify-between gap-3 rounded-xl p-2.5 text-right transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                            : "hover:bg-slate-100/80 dark:hover:bg-[#0F172A] text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100/80 dark:border-blue-900/40"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>

                          <div className="min-w-0 flex-1 text-right">
                            <strong
                              className={`block text-xs sm:text-sm font-bold truncate leading-tight ${
                                isSelected ? "text-white" : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {item.title}
                            </strong>
                            {item.subtitle && (
                              <span
                                className={`block text-[11px] truncate mt-0.5 font-medium ${
                                  isSelected ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          <span
                            className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                              isSelected ? "opacity-100 text-white" : "text-slate-400"
                            }`}
                          >
                            <CornerDownLeft className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                });
              })()
            )}
          </div>

          {/* Keyboard Hints Footer */}
          <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-[#1E2E48] px-4 py-2.5 bg-slate-50/70 dark:bg-[#0D1726]/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070D18] px-1.5 py-0.2 font-mono text-[10px] shadow-2xs">
                  ↑↓
                </kbd>
                <span>للتنقل</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070D18] px-1.5 py-0.2 font-mono text-[10px] shadow-2xs">
                  ↵
                </kbd>
                <span>للاختيار</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px]">
              <Sparkles className="h-3 w-3 text-blue-500" />
              <span>بحث شامل سريع في المنصة</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
