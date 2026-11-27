import React, { useState, useMemo } from "react";
import {
  Sparkles,
  BookOpen,
  ClipboardCheck,
  FileEdit,
  FileSpreadsheet,
  CalendarDays,
  QrCode,
  Users,
  MapPin,
  ShieldCheck,
  BarChart3,
  Library,
  Video,
  Upload,
  Printer,
  FileDown,
  FileText,
  FileCheck2,
  CreditCard,
  Bell,
  Mic,
  Settings,
  LayoutDashboard,
  Search,
  ArrowRight,
  TrendingUp,
  GraduationCap,
  Layers,
  Lock,
  ExternalLink,
  Zap,
  Bot,
} from "lucide-react";
import type { AdminTopTab } from "../../AdminDashboard";
import type { AdminLearningTab } from "../../AdminLearning";

export interface LaunchpadCardItem {
  id: string;
  title: string;
  description: string;
  category: "exams" | "students" | "content" | "finance" | "ops";
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  badge?: string;
  badgeColor?: string;
  count?: number | string;
  target: {
    tab: AdminTopTab;
    subTab?: AdminLearningTab;
    mode?: string;
  };
  highlight?: boolean;
  quickActions?: Array<{
    label: string;
    target: { tab: AdminTopTab; subTab?: AdminLearningTab; mode?: string };
    highlight?: boolean;
  }>;
}

interface AdminLaunchpadViewProps {
  onNavigate: (target: { tab: AdminTopTab; subTab?: AdminLearningTab; mode?: string }) => void;
  stats?: {
    studentsCount?: number;
    quizzesCount?: number;
    videosCount?: number;
    coursesCount?: number;
    curriculumsCount?: number;
    podcastsCount?: number;
    pendingReceiptsCount?: number;
  };
  adminRole?: "superadmin" | "subadmin";
}

export function AdminLaunchpadView({
  onNavigate,
  stats = {},
  adminRole = "superadmin",
}: AdminLaunchpadViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const cards: LaunchpadCardItem[] = useMemo(() => {
    return [
      // ── 1. منظومة الامتحانات والمولد الذكي ──
      {
        id: "unified-exams-hub",
        title: "منظومة الامتحانات والمولد الذكي 🚀",
        description: "المكان الموحد لتوليد الامتحانات من بنك الأسئلة بالوحدات والدروس، نشرها رقمياً للطلاب لحلها ومتابعتهم، أو طباعتها ورقة امتحان A4 للسنتر، مع متابعة نتائج الطلاب وتصحيح المقالي.",
        category: "exams",
        icon: Sparkles,
        gradient: "from-violet-600 via-indigo-600 to-purple-700",
        iconBg: "bg-violet-500/10 text-violet-600 border-violet-200",
        badge: "توليد • نشر أونلاين • طباعة A4 • نتائج",
        badgeColor: "bg-violet-600 text-white font-black animate-pulse",
        count: stats.quizzesCount ? `${stats.quizzesCount} اختبار نشط` : undefined,
        highlight: true,
        target: { tab: "learning", subTab: "quizzes" },
        quickActions: [
          {
            label: "🚀 مولد الامتحانات الذكي",
            target: { tab: "learning", subTab: "testbank", mode: "generate" },
            highlight: true,
          },
          {
            label: `📋 الاختبارات المنشورة (${stats.quizzesCount || 0})`,
            target: { tab: "learning", subTab: "quizzes" },
          },
          {
            label: "🖨️ طباعة امتحان A4 للسنتر",
            target: { tab: "learning", subTab: "memo-studio" },
          },
          {
            label: "✍️ تصحيح المقالي",
            target: { tab: "learning", subTab: "essay-exams" },
          },
          {
            label: "📊 شيت درجات الطلاب",
            target: { tab: "learning", subTab: "grades-sheet" },
          },
        ],
      },
      {
        id: "testbank",
        title: "بنك الأسئلة الشامل ومستودع المنهج 📚",
        description: "مستودع ومكتبة الأسئلة المنظم هرمياً (المرحلة ⬅️ الوحدة ⬅️ الدرس). تصفح الأسئلة، فلترتها، استيرادها ورفعها من ملفات Word و PDF، وإضافة وتعديل الأسئلة.",
        category: "exams",
        icon: BookOpen,
        gradient: "from-blue-600 to-indigo-600",
        iconBg: "bg-blue-500/10 text-blue-600 border-blue-200",
        badge: "مستودع الأسئلة والملازم",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        target: { tab: "learning", subTab: "testbank", mode: "explorer" },
        quickActions: [
          {
            label: "📂 تصفح شجرة المنهج والدروس",
            target: { tab: "learning", subTab: "testbank", mode: "explorer" },
          },
          {
            label: "📤 رفع واستيراد أسئلة (Word/PDF)",
            target: { tab: "learning", subTab: "testbank", mode: "upload" },
          },
        ],
      },

      // ── 2. شؤون الطلاب وحضور السناتر ──
      {
        id: "monthly-attendance",
        title: "دفتر الحضور بالشهور والسناتر 📅",
        description: "سجل الحضور والغياب الشهري لمجموعات وسناتر الحناوي ورافال وزاج ورصد نسب الحضور بدقة.",
        category: "students",
        icon: CalendarDays,
        gradient: "from-sky-600 to-blue-700",
        iconBg: "bg-sky-500/10 text-sky-600 border-sky-200",
        badge: "حضور شهري 📅",
        badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
        highlight: true,
        target: { tab: "learning", subTab: "attendance", mode: "monthly_centers" },
      },
      {
        id: "qr-attendance",
        title: "مسح الحضور بالكاميرا (QR Scanner) 📷",
        description: "تسجيل الحضور الفوري للطلاب عبر مسح باركود الطالب بالكاميرا فور دخوله السنتر أو القاعة.",
        category: "students",
        icon: QrCode,
        gradient: "from-emerald-600 to-green-700",
        iconBg: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        badge: "كاميرا المسح",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        target: { tab: "learning", subTab: "attendance" },
      },
      {
        id: "students",
        title: "إدارة جميع الطلاب والحسابات 👥",
        description: "سجل كامل ببيانات الطلاب، تفعيل الاشتراكات، تعديل الصلاحيات وتعيين الكورسات والمراحل المخصصة.",
        category: "students",
        icon: Users,
        gradient: "from-blue-600 to-indigo-700",
        iconBg: "bg-blue-500/10 text-blue-600 border-blue-200",
        badge: "دليل الطلاب",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        count: stats.studentsCount,
        target: { tab: "learning", subTab: "students" },
      },
      {
        id: "center-bookings",
        title: "جدول حجوزات ومواعيد السناتر 📍",
        description: "كشف تفصيلي بمواعيد ومقرات السناتر والطلاب المسجلين حضورياً بكل قاعة وسنتر.",
        category: "students",
        icon: MapPin,
        gradient: "from-purple-600 to-indigo-700",
        iconBg: "bg-purple-500/10 text-purple-600 border-purple-200",
        badge: "حجوزات المقرات",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        target: { tab: "learning", subTab: "center-bookings" },
      },
      {
        id: "parents",
        title: "حسابات أولياء الأمور 🛡️",
        description: "بوابة أولياء الأمور، ربط الأبناء، متابعة مستوى ودرجات وحضور وغياب الطالب أولاً بأول.",
        category: "students",
        icon: ShieldCheck,
        gradient: "from-slate-700 to-slate-900",
        iconBg: "bg-slate-500/10 text-slate-700 border-slate-200",
        badge: "أولياء الأمور",
        badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
        target: { tab: "parents" },
      },
      {
        id: "student-analytics",
        title: "تحليلات الأداء والمشاهدات 📈",
        description: "متابعة نشاط الطلاب، معدلات مشاهدة الفيديوهات، ومؤشرات التفاعل والالتزام الدراسي.",
        category: "students",
        icon: BarChart3,
        gradient: "from-cyan-600 to-blue-600",
        iconBg: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
        badge: "تحليلات المشاهدة",
        badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
        target: { tab: "student-analytics" },
      },

      // ── 3. استوديو المحتوى والمناهج ──
      {
        id: "curriculums",
        title: "المناهج التعليمية 🏛️",
        description: "بناء وتنظيم هيكل المناهج والمراحل (بكالوريا، ثانوية عامة، جامعات) والوحدات الدراسية.",
        category: "content",
        icon: Library,
        gradient: "from-amber-600 to-yellow-600",
        iconBg: "bg-amber-500/10 text-amber-600 border-amber-200",
        badge: "هيكل المناهج",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        count: stats.curriculumsCount,
        target: { tab: "curriculums" },
      },
      {
        id: "courses",
        title: "الكورسات التدريبية 📖",
        description: "إدارة الكورسات، أسعارها، المسارات الأكاديمية وربط الطلاب بالمحتوى المدفوع والخاص.",
        category: "content",
        icon: BookOpen,
        gradient: "from-indigo-600 to-violet-700",
        iconBg: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
        badge: "الكورسات",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
        count: stats.coursesCount,
        target: { tab: "courses" },
      },
      {
        id: "videos",
        title: "مكتبة الفيديوهات 🎥",
        description: "استعراض وتشغيل وإدارة جميع مقاطع الفيديو والمحاضرات المسجلة على المنصة وتصنيفاتها.",
        category: "content",
        icon: Video,
        gradient: "from-rose-600 to-red-700",
        iconBg: "bg-rose-500/10 text-rose-600 border-rose-200",
        badge: "مكتبة المحاضرات",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
        count: stats.videosCount,
        target: { tab: "videos" },
      },
      {
        id: "upload-video",
        title: "رفع فيديو جديد 📤",
        description: "رفع فيديو جديد مباشرة إلى المنصة أو تضمينه عبر رابط يوتيوب وربطه بالدرس والمرحلة.",
        category: "content",
        icon: Upload,
        gradient: "from-emerald-600 to-teal-700",
        iconBg: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        badge: "رفع فوري",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        target: { tab: "upload-video" },
      },
      {
        id: "kholasa",
        title: "الزتونة والخرائط الذهنية ⚡",
        description: "استوديو تلخيصات الدروس، الخرائط المفاهيمية التفاعلية، والبطاقات الذكية والتعريفات المركزة.",
        category: "content",
        icon: Sparkles,
        gradient: "from-violet-600 to-purple-800",
        iconBg: "bg-violet-500/10 text-violet-600 border-violet-200",
        badge: "الزتونات والخرائط",
        badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
        target: { tab: "learning", subTab: "kholasa" },
      },
      {
        id: "memo-studio",
        title: "استوديو المذكرات والطباعة A4 🖨️",
        description: "تصميم وتوليد مذكرات الدروس والامتحانات الجاهزة للطباعة مع هوامش الغلاف ونسخة الطالب والمعلم.",
        category: "content",
        icon: Printer,
        gradient: "from-slate-800 to-slate-950",
        iconBg: "bg-slate-500/10 text-slate-800 border-slate-200",
        badge: "استوديو A4",
        badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
        target: { tab: "learning", subTab: "memo-studio" },
      },
      {
        id: "files",
        title: "المذكرات والملفات التعليمية 📁",
        description: "مكتبة ملفات PDF والملخصات المرفوعة وتحديد ظهورها للطلاب داخل الدروس والمراحل.",
        category: "content",
        icon: FileDown,
        gradient: "from-blue-600 to-sky-700",
        iconBg: "bg-blue-500/10 text-blue-600 border-blue-200",
        badge: "المذكرات والملفات",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        target: { tab: "learning", subTab: "files" },
      },
      {
        id: "summaries",
        title: "مراجعة تلاخيص كشكول الطلاب 📝",
        description: "استعراض صور الكشكول المرفوعة من الطلاب ومراجعتها وتدقيقها وإضافة ملحوظات المعلم.",
        category: "content",
        icon: FileText,
        gradient: "from-amber-600 to-orange-700",
        iconBg: "bg-amber-500/10 text-amber-600 border-amber-200",
        badge: "تلاخيص الكشكول",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        target: { tab: "learning", subTab: "summaries" },
      },

      // ── 4. المعاملات المالية والاشتراكات ──
      {
        id: "payments",
        title: "إيصالات الدفع والتحويلات 💳",
        description: "مراجعة إيصالات فودافون كاش والمحافظ الإلكترونية واعتماد التحويلات وتفعيل الحسابات فورياً.",
        category: "finance",
        icon: FileCheck2,
        gradient: "from-amber-600 to-yellow-600",
        iconBg: "bg-amber-500/10 text-amber-600 border-amber-200",
        badge: (stats.pendingReceiptsCount || 0) > 0 ? `معلق: ${stats.pendingReceiptsCount}` : "مراجعة الدفع",
        badgeColor: (stats.pendingReceiptsCount || 0) > 0 ? "bg-amber-500 text-slate-950 font-black animate-pulse" : "bg-amber-50 text-amber-700 border-amber-200",
        count: (stats.pendingReceiptsCount || 0) > 0 ? `${stats.pendingReceiptsCount} إيصال معلق` : undefined,
        highlight: (stats.pendingReceiptsCount || 0) > 0,
        target: { tab: "learning", subTab: "payments" },
      },
      {
        id: "subscriptions",
        title: "الاشتراكات الشهرية وتجديدها 📅",
        description: "متابعة حالة الاشتراكات الشهرية للطلاب وتجديداتها وحصر المتأخرات والمستحقات.",
        category: "finance",
        icon: CreditCard,
        gradient: "from-emerald-600 to-teal-700",
        iconBg: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        badge: "الاشتراكات",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        target: { tab: "subscriptions" },
      },
      {
        id: "self-assessment-packs",
        title: "باقات التقييم الذاتي ⚡",
        description: "إدارة وتفعيل باقات الامتحانات الـ 3 محاولات (50 ج.م) للزوار والطلاب المستقلين فور تأكيد الدفع.",
        category: "finance",
        icon: Zap,
        gradient: "from-indigo-600 to-blue-700",
        iconBg: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
        badge: "باقات الزوار",
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
        target: { tab: "learning", subTab: "self-assessment-packs" },
      },

      // ── 5. العمليات والمتابعة العامة ──
      ...(adminRole === "superadmin"
        ? [
            {
              id: "ai-agent",
              title: "الوكيل الذكي ومراقب المنصة 🤖",
              description: "مراقبة فورية لكل تفاصيل المنصة بالذكاء الاصطناعي وإرسال التقارير اليومية والتنبيهات لبوت التليجرام وصفحتك.",
              category: "ops" as const,
              icon: Bot,
              gradient: "from-sky-600 to-indigo-700",
              iconBg: "bg-sky-500/15 text-sky-700 border-sky-200",
              badge: "Gemini AI + Telegram",
              badgeColor: "bg-sky-50 text-sky-800 border-sky-200 font-black",
              highlight: true,
              target: { tab: "ai-agent" as AdminTopTab },
            },
          ]
        : []),
      {
        id: "overview",
        title: "اللوحة التشغيلية العامة 📊",
        description: "نظرة عامة على أعداد الطلاب، المشتركين، والتوزيع حسب المراحل ومؤشرات الأداء الحية.",
        category: "ops",
        icon: LayoutDashboard,
        gradient: "from-slate-700 to-slate-900",
        iconBg: "bg-slate-500/10 text-slate-700 border-slate-200",
        badge: "المؤشرات العامة",
        badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
        target: { tab: "learning", subTab: "overview" },
      },
      {
        id: "notifications",
        title: "إرسال الإشعارات والتنبيهات 🔔",
        description: "إرسال تنبيهات ورسائل فورية لجميع الطلاب أو استهداف مرحلة دراسية أو مجموعة سنتر محددة.",
        category: "ops",
        icon: Bell,
        gradient: "from-blue-600 to-indigo-700",
        iconBg: "bg-blue-500/10 text-blue-600 border-blue-200",
        badge: "إشعار فوري",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        target: { tab: "learning", subTab: "notifications" },
      },
      {
        id: "podcasts",
        title: "البودكاست الصوتي 🎙️",
        description: "تسجيل وإدارة الحلقات الصوتية والتوجيهات والمراجعات المسجلة للطلاب.",
        category: "ops",
        icon: Mic,
        gradient: "from-purple-600 to-pink-700",
        iconBg: "bg-purple-500/10 text-purple-600 border-purple-200",
        badge: "البودكاست",
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        count: stats.podcastsCount,
        target: { tab: "podcasts" },
      },
      {
        id: "reports",
        title: "التقارير الشاملة ومؤشرات الأداء 📋",
        description: "تقارير إحصائية دورية وتفصيلية عن كل عمليات المنصة والتقدم الدراسي.",
        category: "ops",
        icon: BarChart3,
        gradient: "from-cyan-600 to-blue-700",
        iconBg: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
        badge: "التقارير",
        badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
        target: { tab: "learning", subTab: "reports" },
      },
      {
        id: "settings",
        title: "إعدادات النظام والمنصة ⚙️",
        description: "ضبط إعدادات المنصة، أرقام الدفع والتواصل، وسياسات الحساب والصلاحيات الإدارية.",
        category: "ops",
        icon: Settings,
        gradient: "from-slate-600 to-slate-800",
        iconBg: "bg-slate-500/10 text-slate-700 border-slate-200",
        badge: "الإعدادات",
        badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
        target: { tab: "settings" },
      },
    ];
  }, [stats]);

  // Categories metadata
  const categories = [
    { id: "all", label: "جميع بطاقات المنصة", icon: Sparkles, count: cards.length },
    { id: "exams", label: "الامتحانات والتقييم الذكي", icon: ClipboardCheck, count: cards.filter((c) => c.category === "exams").length },
    { id: "students", label: "شؤون الطلاب والسناتر", icon: Users, count: cards.filter((c) => c.category === "students").length },
    { id: "content", label: "المحتوى والمناهج والملازم", icon: BookOpen, count: cards.filter((c) => c.category === "content").length },
    { id: "finance", label: "المعاملات المالية والدفع", icon: FileCheck2, count: cards.filter((c) => c.category === "finance").length },
    { id: "ops", label: "العمليات والإعدادات", icon: LayoutDashboard, count: cards.filter((c) => c.category === "ops").length },
  ];

  // Filtering
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesCategory = selectedCategory === "all" || card.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        card.title.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q) ||
        (card.badge && card.badge.toLowerCase().includes(q))
      );
    });
  }, [cards, selectedCategory, searchQuery]);

  return (
    <div className="space-y-8 text-[#0F172A]" dir="rtl">
      {/* 1. Hero / Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-l from-[#0F172A] via-[#1E293B] to-[#0F172A] p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 h-full w-1/3 bg-radial from-blue-500/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-40 w-40 bg-radial from-purple-500/15 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> بوابة التحكم والإدارة الذكية
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              لوحة التحكم المركزية بالبطاقات 🚀
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              اختر أي بطاقة للدخول المباشر إلى الصفحة أو الأداة المطلوبة بنقرة واحدة، دون الحاجة للبحث في القوائم المعقدة.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {stats.studentsCount !== undefined && (
              <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5 backdrop-blur-xs text-center min-w-[90px]">
                <span className="block text-xl font-black text-blue-400">{stats.studentsCount}</span>
                <span className="text-[11px] font-bold text-slate-300">طالب مقيد</span>
              </div>
            )}
            {stats.quizzesCount !== undefined && (
              <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5 backdrop-blur-xs text-center min-w-[90px]">
                <span className="block text-xl font-black text-emerald-400">{stats.quizzesCount}</span>
                <span className="text-[11px] font-bold text-slate-300">اختبار نشط</span>
              </div>
            )}
            {(stats.pendingReceiptsCount || 0) > 0 && (
              <button
                type="button"
                onClick={() => onNavigate({ tab: "learning", subTab: "payments" })}
                className="rounded-2xl bg-amber-500/20 border border-amber-400/50 px-4 py-2.5 text-center min-w-[90px] cursor-pointer hover:bg-amber-500/30 transition-all animate-pulse"
              >
                <span className="block text-xl font-black text-amber-300">{stats.pendingReceiptsCount}</span>
                <span className="text-[11px] font-black text-amber-200">إيصال دفع معلق 🔔</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Instant Search Bar */}
        <div className="relative z-10 mt-6 max-w-2xl">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن أي بطاقة أو أداة (مثال: امتحان، حضور، كورس، مقالي، إيصال)..."
              className="w-full h-12 pr-12 pl-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-400 focus:bg-white/15 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-2 py-1 rounded-md bg-white/10 cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer border ${
                isSelected
                  ? "bg-[#0F172A] text-white border-[#0F172A] shadow-md shadow-slate-900/10 scale-102"
                  : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => onNavigate(card.target)}
              className={`group relative flex flex-col justify-between rounded-3xl p-6 bg-white border transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
                card.highlight
                  ? "border-violet-300 ring-2 ring-violet-500/20 shadow-md shadow-violet-500/5 bg-linear-to-b from-violet-50/20 to-white"
                  : "border-slate-200/80 hover:border-blue-400 shadow-xs"
              }`}
            >
              <div>
                {/* Card Top: Icon + Badge */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all group-hover:scale-110 ${card.iconBg}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex items-center gap-2">
                    {card.count !== undefined && (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-black border border-slate-200">
                        {card.count}
                      </span>
                    )}
                    {card.badge && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black border shadow-2xs ${
                          card.badgeColor || "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {card.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Title */}
                <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {card.title}
                </h3>

                {/* Card Description */}
                <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-3">
                  {card.description}
                </p>

                {/* Quick Action Pills if available */}
                {card.quickActions && card.quickActions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100/90 flex flex-wrap gap-1.5">
                    {card.quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(action.target);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer active:scale-95 border ${
                          action.highlight
                            ? "bg-violet-600 text-white hover:bg-violet-700 border-violet-600 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer: Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                  فتح الصفحة والأدوات
                </span>
                <span className="flex items-center gap-1.5 text-xs font-black text-blue-600 group-hover:translate-x-[-4px] transition-transform">
                  دخول سريع
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white space-y-3">
          <Search className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">لم يتم العثور على بطاقات مطابقة</h3>
          <p className="text-xs text-slate-400">جرب البحث بكلمة أخرى مثل: امتحان، حضور، كورس، مقالي...</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            إعادة تعيين البحث
          </button>
        </div>
      )}
    </div>
  );
}
