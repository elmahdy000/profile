import React, { useState, useMemo } from "react";
import {
  Calendar,
  BookOpen,
  Mic,
  Library,
  Video as VideoIcon,
  Upload,
  Users,
  FileCheck2,
  MessageCircle,
  FileText,
  ClipboardCheck,
  CheckCircle2,
  BarChart3,
  ShieldCheck,
  Settings,
  X,
  ExternalLink,
  LogOut,
  Plus,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Bell,
  Activity,
  FileDown,
  FileSpreadsheet,
  MapPin,
  Sparkles,
  QrCode,
  FileEdit,
  Printer,
  CalendarDays,
  CreditCard,
  LayoutGrid,
  Search,
} from "lucide-react";

interface AdminSidebarNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  learningSubTab: string;
  setLearningSubTab: (tab: any) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  openVideoModal: (mode: "add" | "edit", video?: any) => void;
  handleLogout: () => void;
  bookingsCount?: number;
  coursesCount?: number;
  podcastsCount?: number;
  curriculumsCount?: number;
  videosCount?: number;
  adminRole: "superadmin" | "subadmin";
  pendingReceiptsCount?: number;
  onOpenCommandPalette?: () => void;
}

export const AdminSidebarNav: React.FC<AdminSidebarNavProps> = ({
  activeTab,
  setActiveTab,
  learningSubTab,
  setLearningSubTab,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  openVideoModal,
  handleLogout,
  bookingsCount,
  coursesCount,
  podcastsCount,
  curriculumsCount,
  videosCount,
  adminRole,
  pendingReceiptsCount = 0,
  onOpenCommandPalette,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // The 4 Unified Pillars / Hubs
  const navGroups = useMemo(() => [
    // -------------------------------------------------------------
    // HUB 1: شؤون الطلاب والسناتر (Students & Operations Hub)
    // -------------------------------------------------------------
    {
      id: "hub-students",
      title: "شؤون الطلاب والسناتر",
      items: [
        {
          id: "students",
          label: "إدارة جميع الطلاب",
          icon: Users,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("students");
          },
          active: activeTab === "learning" && learningSubTab === "students",
        },
        {
          id: "attendance",
          label: "سجل وحضور السناتر (QR)",
          icon: QrCode,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("attendance");
          },
          active: activeTab === "learning" && learningSubTab === "attendance",
        },
        {
          id: "center-bookings",
          label: "جدول ومواعيد السناتر",
          icon: MapPin,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("center-bookings" as any);
          },
          active: activeTab === "learning" && (learningSubTab as string) === "center-bookings",
          badge: bookingsCount && bookingsCount > 0 ? bookingsCount : undefined,
        },
        {
          id: "summaries",
          label: "تدقيق كشكول التلخيصات",
          icon: FileEdit,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("summaries" as any);
          },
          active: activeTab === "learning" && (learningSubTab as string) === "summaries",
        },
        {
          id: "parents",
          label: "حسابات أولياء الأمور",
          icon: ShieldCheck,
          onClick: () => setActiveTab("parents"),
          active: activeTab === "parents",
        },
      ],
    },

    // -------------------------------------------------------------
    // HUB 1.5: المالية والاشتراكات (Finance & Subscriptions)
    // -------------------------------------------------------------
    {
      id: "hub-finance",
      title: "المالية والاشتراكات",
      items: [
        {
          id: "payments",
          label: "إيصالات الدفع والتحويلات",
          icon: FileCheck2,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("payments");
          },
          active: activeTab === "learning" && learningSubTab === "payments",
          badge: pendingReceiptsCount > 0 ? pendingReceiptsCount : undefined,
          badgeColor: "bg-amber-500 text-slate-950 font-black",
        },
        {
          id: "subscriptions",
          label: "الاشتراكات الشهرية والتجديد",
          icon: CreditCard,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("subscriptions");
          },
          active: activeTab === "learning" && learningSubTab === "subscriptions",
        },
      ],
    },

    // -------------------------------------------------------------
    // HUB 2: استوديو التقييم وبنك الأسئلة (Assessment & Exams Studio)
    // -------------------------------------------------------------
    {
      id: "hub-exams",
      title: "استوديو التقييم وبنك الأسئلة",
      items: [
        {
          id: "testbank",
          label: "بنك الأسئلة والمولد الذكي",
          icon: BookOpen,
          onClick: () => {
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("mode");
              window.history.replaceState(null, "", url.toString());
              window.dispatchEvent(new Event("popstate"));
            }
            setActiveTab("learning");
            setLearningSubTab("testbank");
          },
          active: activeTab === "learning" && learningSubTab === "testbank",
        },
        {
          id: "quizzes",
          label: "إدارة ونشر الاختبارات والواجبات",
          icon: ClipboardCheck,
          onClick: () => {
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("mode");
              window.history.replaceState(null, "", url.toString());
              window.dispatchEvent(new Event("popstate"));
            }
            setActiveTab("learning");
            setLearningSubTab("quizzes");
          },
          active: activeTab === "learning" && learningSubTab === "quizzes",
        },
        {
          id: "memo-studio",
          label: "استوديو المذكرات وطباعة A4",
          icon: Printer,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("memo-studio");
          },
          active: activeTab === "learning" && learningSubTab === "memo-studio",
        },
        {
          id: "essay-exams",
          label: "تصحيح المقالي واستلام الإجابات",
          icon: FileText,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("essay-exams");
          },
          active: activeTab === "learning" && learningSubTab === "essay-exams",
        },
        {
          id: "grades-sheet",
          label: "شيت درجات ونتائج الاختبارات",
          icon: FileSpreadsheet,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("grades-sheet");
          },
          active: activeTab === "learning" && learningSubTab === "grades-sheet",
        },
        {
          id: "self-assessment-packs",
          label: "باقات التقييم الذاتي",
          icon: Sparkles,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("self-assessment-packs");
          },
          active: activeTab === "learning" && learningSubTab === "self-assessment-packs",
        },
      ],
    },

    // -------------------------------------------------------------
    // HUB 3: المحتوى والمناهج التعليمية (Content & Curriculums Vault)
    // -------------------------------------------------------------
    {
      id: "hub-content",
      title: "المحتوى والمناهج التعليمية",
      items: [
        ...(adminRole === "superadmin"
          ? [
              {
                id: "curriculums",
                label: "المناهج والصفوف الرسمية",
                icon: Library,
                onClick: () => setActiveTab("curriculums"),
                active: activeTab === "curriculums",
                badge: curriculumsCount && curriculumsCount > 0 ? curriculumsCount : undefined,
              },
              {
                id: "courses",
                label: "الكورسات التدريبية والشعب",
                icon: BookOpen,
                onClick: () => setActiveTab("courses"),
                active: activeTab === "courses",
                badge: coursesCount && coursesCount > 0 ? coursesCount : undefined,
              },
              {
                id: "videos",
                label: "مكتبة الفيديوهات والشروحات",
                icon: VideoIcon,
                onClick: () => setActiveTab("videos"),
                active: activeTab === "videos",
                badge: videosCount && videosCount > 0 ? videosCount : undefined,
              },
            ]
          : []),
        {
          id: "files",
          label: "المذكرات والملفات التعليمية PDF",
          icon: FileDown,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("files");
          },
          active: activeTab === "learning" && learningSubTab === "files",
        },
        {
          id: "kholasa",
          label: "الزتونة والخرائط الذهنية",
          icon: Sparkles,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("kholasa");
          },
          active: activeTab === "learning" && learningSubTab === "kholasa",
        },
        ...(adminRole === "superadmin"
          ? [
              {
                id: "podcasts",
                label: "البودكاست التعليمي الصوتي",
                icon: Mic,
                onClick: () => setActiveTab("podcasts"),
                active: activeTab === "podcasts",
                badge: podcastsCount && podcastsCount > 0 ? podcastsCount : undefined,
              },
            ]
          : []),
      ],
    },

    // -------------------------------------------------------------
    // HUB 4: غرفة العمليات والإعدادات (Operations & Settings Hub)
    // -------------------------------------------------------------
    {
      id: "hub-ops",
      title: "غرفة العمليات والإعدادات",
      items: [
        {
          id: "launchpad-hub",
          label: "لوحة البطاقات السريعة",
          icon: LayoutGrid,
          onClick: () => setActiveTab("hub"),
          active: activeTab === "hub",
        },
        {
          id: "learning-overview",
          label: "اللوحة التشغيلية العامة",
          icon: LayoutDashboard,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("overview" as any);
          },
          active: activeTab === "learning" && (learningSubTab as string) === "overview",
        },
        {
          id: "notifications",
          label: "مركز إرسال الإشعارات والرسائل",
          icon: Bell,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("notifications");
          },
          active: activeTab === "learning" && learningSubTab === "notifications",
        },
        {
          id: "reports",
          label: "التقارير الشاملة والتحليلات",
          icon: BarChart3,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("reports");
          },
          active: activeTab === "learning" && learningSubTab === "reports",
        },
        ...(adminRole === "superadmin"
          ? [
              {
                id: "settings",
                label: "إعدادات المنصة والبوتات",
                icon: Settings,
                onClick: () => setActiveTab("settings"),
                active: activeTab === "settings",
              },
            ]
          : []),
      ],
    },
  ], [
    activeTab,
    learningSubTab,
    adminRole,
    bookingsCount,
    coursesCount,
    curriculumsCount,
    videosCount,
    podcastsCount,
    pendingReceiptsCount,
    setActiveTab,
    setLearningSubTab,
  ]);

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <img src="/logo.webp" alt="شعار د. محمود" className="h-10 w-10 rounded-xl border border-blue-500/30 object-cover shadow-sm" />
            {!isCollapsed && (
              <div>
                <strong className="block text-sm font-black text-[#F8FAFC]">د. محمود المهدي</strong>
                <span className="text-[10px] font-semibold text-[#1677FF] uppercase tracking-wider">
                  {adminRole === "superadmin" ? "Super Admin" : "Sub Admin"}
                </span>
              </div>
            )}
          </div>
          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-[#94A3B8] hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Action Button: Add Video */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => {
              openVideoModal("add");
              setIsMobileSidebarOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition-all hover:bg-[#4096FF] active:scale-98 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة درس جديد</span>
          </button>
        )}

        {/* Global Quick Search (Ctrl+K trigger) */}
        {!isCollapsed && onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-900/60 border border-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:text-blue-400 transition-colors" />
              <span className="truncate">بحث سريع في المنصة...</span>
            </div>
            <kbd className="inline-flex items-center rounded bg-slate-800/80 px-1.5 py-0.5 text-[9.5px] font-mono text-slate-400 border border-slate-700/60">
              Ctrl+K
            </kbd>
          </button>
        )}

        {/* The 4 Unified Navigation Hubs (Clean flat list with subtle headers) */}
        <nav className="space-y-4 pt-1">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                    {group.title}
                  </span>
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        item.onClick();
                        setIsMobileSidebarOpen(false);
                      }}
                      title={isCollapsed ? item.label : undefined}
                      className={`group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        item.active
                          ? "bg-[#1677FF]/15 text-[#1677FF] border-r-3 border-[#1677FF] font-black"
                          : "text-[#CBD5E1] hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          item.active ? "text-[#1677FF]" : "text-[#94A3B8] group-hover:text-white"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="flex-1 text-right truncate">{item.label}</span>
                      )}
                      {!isCollapsed && typeof item.badge === "number" && item.badge > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            "badgeColor" in item && item.badgeColor
                              ? item.badgeColor
                              : item.active
                              ? "bg-[#1677FF] text-white"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="border-t border-slate-800 pt-3 space-y-2">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-bold text-[#CBD5E1] hover:bg-slate-800 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-[#60A5FA]" />
            {!isCollapsed && <span>زيارة واجهة المنصة</span>}
          </span>
        </a>

        <button
          onClick={handleLogout}
          type="button"
          className="flex w-full items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!isCollapsed && <span>تسجيل الخروج الآمن</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs" onClick={() => setIsMobileSidebarOpen(false)} />
          <aside className="admin-adaptive-dark-ui admin-sidebar-surface fixed inset-y-0 right-0 flex w-[280px] flex-col bg-[#131E31] text-[#F8FAFC] shadow-2xl z-10 border-l border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <span className="text-xs font-extrabold text-[#F8FAFC]">لوحة تحكم المنصة</span>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderNavContent()}
          </aside>
        </div>
      )}

      {/* Desktop Sticky Sidebar - Full Viewport Height */}
      <aside
        className={`admin-adaptive-dark-ui admin-sidebar-surface hidden lg:flex flex-col border-l border-slate-800/80 bg-[#131E31] text-[#F8FAFC] transition-all duration-300 shrink-0 sticky top-0 h-screen ${
          isCollapsed ? "w-[72px]" : "w-[280px]"
        }`}
      >
        {renderNavContent()}
      </aside>
    </>
  );
};
