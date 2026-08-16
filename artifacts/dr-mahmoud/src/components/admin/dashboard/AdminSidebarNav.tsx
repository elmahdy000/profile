import React, { useState } from "react";
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
  MapPin,
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
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navGroups = [
    {
      title: "الرئيسية والمتابعة",
      items: [
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
      ],
    },
    {
      title: "الطلاب وحجوزات السناتر",
      items: [
        {
          id: "center-bookings",
          label: "جدول حجوزات السناتر",
          icon: MapPin,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("center-bookings" as any);
          },
          active: activeTab === "learning" && (learningSubTab as string) === "center-bookings",
        },
        {
          id: "students",
          label: "إدارة جميع الطلاب",
          icon: Users,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("students");
            if (typeof window !== "undefined") {
              const params = new URLSearchParams(window.location.search);
              params.delete("mode");
              params.delete("status");
              window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
              window.dispatchEvent(new Event("popstate"));
            }
          },
          active: activeTab === "learning" && learningSubTab === "students",
        },
        {
          id: "payments",
          label: "إيصالات الدفع والاشتراكات",
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
          id: "parents",
          label: "حسابات أولياء الأمور",
          icon: ShieldCheck,
          onClick: () => setActiveTab("parents"),
          active: activeTab === "parents",
        },
        {
          id: "student-analytics",
          label: "تحليلات الأداء والمشاهدات",
          icon: BarChart3,
          onClick: () => setActiveTab("student-analytics"),
          active: activeTab === "student-analytics",
        },
      ],
    },
    {
      title: "المحتوى التعليمي",
      items: [
        {
          id: "courses",
          label: "الكورسات التدريبية",
          icon: BookOpen,
          onClick: () => setActiveTab("courses"),
          active: activeTab === "courses",
        },
        {
          id: "curriculums",
          label: "المناهج التعليمية",
          icon: Library,
          onClick: () => setActiveTab("curriculums"),
          active: activeTab === "curriculums",
        },
        {
          id: "videos",
          label: "مكتبة الفيديوهات",
          icon: VideoIcon,
          onClick: () => setActiveTab("videos"),
          active: activeTab === "videos",
        },
        {
          id: "upload-video",
          label: "رفع فيديو جديد 📤",
          icon: Upload,
          onClick: () => setActiveTab("upload-video"),
          active: activeTab === "upload-video",
        },
      ],
    },
    {
      title: "التقييم والاختبارات",
      items: [
        {
          id: "quizzes",
          label: "منظومة الاختبارات",
          icon: ClipboardCheck,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("quizzes");
          },
          active: activeTab === "learning" && learningSubTab === "quizzes",
        },
        {
          id: "results",
          label: "نتائج الطلاب والتقييمات",
          icon: CheckCircle2,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("results");
          },
          active: activeTab === "learning" && learningSubTab === "results",
        },
        {
          id: "files",
          label: "المذكرات والملفات",
          icon: FileDown,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("files");
          },
          active: activeTab === "learning" && learningSubTab === "files",
        },
      ],
    },
    {
      title: "التواصل والرسائل",
      items: [
        {
          id: "notifications",
          label: "إرسال الإشعارات والرسائل",
          icon: Bell,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("notifications");
          },
          active: activeTab === "learning" && learningSubTab === "notifications",
        },
        {
          id: "podcasts",
          label: "البودكاست الصوتي",
          icon: Mic,
          onClick: () => setActiveTab("podcasts"),
          active: activeTab === "podcasts",
        },
      ],
    },
    {
      title: "التقارير والإعدادات",
      items: [
        {
          id: "reports",
          label: "التقارير الشاملة",
          icon: FileText,
          onClick: () => {
            setActiveTab("learning");
            setLearningSubTab("reports");
          },
          active: activeTab === "learning" && learningSubTab === "reports",
        },
        {
          id: "settings",
          label: "إعدادات النظام",
          icon: Settings,
          onClick: () => setActiveTab("settings"),
          active: activeTab === "settings",
        },
      ],
    },
  ];

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
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
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-[#94A3B8] hover:bg-slate-800 hover:text-white"
            title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Action Button: Upload Video */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => openVideoModal("add")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1677FF] px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition-all hover:bg-[#4096FF] active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة درس جديد</span>
          </button>
        )}

        {/* Navigation Groups */}
        <nav className="space-y-5">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1.5">
              {!isCollapsed && (
                <span className="block px-3 text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                  {group.title}
                </span>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { item.onClick(); setIsMobileSidebarOpen(false); }}
                      title={isCollapsed ? item.label : undefined}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                        item.active
                          ? "bg-[#1677FF]/15 text-[#1677FF] border-r-4 border-[#1677FF]"
                          : "text-[#CBD5E1] hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 shrink-0 ${item.active ? "text-[#1677FF]" : "text-[#94A3B8] group-hover:text-white"}`} />
                      {!isCollapsed && <span className="flex-1 text-right truncate">{item.label}</span>}
                      {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            ("badgeColor" in item && item.badgeColor) ? item.badgeColor : "bg-[#1677FF] text-white"
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
      <div className="border-t border-slate-800 pt-4 space-y-2">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-bold text-[#CBD5E1] hover:bg-slate-800 hover:text-white"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-[#60A5FA]" />
            {!isCollapsed && <span>معاينة الموقع المنشور</span>}
          </span>
        </a>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-extrabold text-rose-400 hover:bg-rose-500/20"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span>تسجيل الخروج الأمن</span>}
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
              <span className="text-xs font-extrabold text-[#F8FAFC]">قائمة الإدارة</span>
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
          isCollapsed ? "w-[72px]" : "w-[270px]"
        }`}
      >
        {renderNavContent()}
      </aside>
    </>
  );
};
