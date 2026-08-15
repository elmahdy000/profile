import React from "react";
import {
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  UserX,
  CreditCard,
  FileCheck2,
  Bell,
  BookOpen,
  ChevronLeft,
  TrendingUp,
  Eye,
  Layers,
  GraduationCap,
  UserPlus,
} from "lucide-react";
import type { Student } from "@/types/platform";
import type { PaymentReceipt } from "./PaymentReceiptsPanel";

interface OverviewSectionProps {
  students: Student[];
  paymentReceipts?: PaymentReceipt[];
  bookingsCount?: number;
  learningCourses?: Array<{ id: number; title: string; category?: string; stages?: string[] }>;
  onNavigateToTab?: (tab: "students" | "payments" | "notifications" | "files" | "quizzes", filter?: any) => void;
  onFilterStudents?: (filterKey: string, filterValue: string) => void;
  onSelectStageFilter?: (filter: any) => void;
  onSelectCourseFilter?: (courseTitle: any) => void;
}

export function OverviewSection({
  students = [],
  paymentReceipts = [],
  bookingsCount = 0,
  learningCourses = [],
  onNavigateToTab,
  onFilterStudents,
  onSelectStageFilter,
  onSelectCourseFilter,
}: OverviewSectionProps) {
  // Metric Definitions
  const totalRegisteredAccounts = students.length; // 127
  const activeStudents = students.filter((s) => s.status === "approved").length; // 104
  const paidStudents = students.filter((s) => s.paymentStatus === "paid").length; // 78
  const pendingStudents = students.filter((s) => s.status !== "approved" && s.status !== "suspended").length; // 22
  const suspendedStudents = students.filter((s) => s.status === "suspended").length; // 1
  const pendingReceipts = paymentReceipts.filter((r) => r.status === "pending").length;

  const todayStr = new Date().toDateString();
  const todayNewStudents = students.filter(
    (s) => s.createdAt && new Date(s.createdAt).toDateString() === todayStr
  ).length;

  // Track / Stage Breakdown calculation
  const stageMap = new Map<string, { name: string; track: string; members: Student[] }>();
  for (const student of students) {
    const rawStage = student.grade === "أخرى"
      ? student.otherGradeDetail?.trim() || "مرحلة أخرى"
      : student.grade?.trim() || "غير محدد";
    
    let track = "عام";
    if (rawStage.includes("بكالوريا")) track = "البكالوريا المصرية";
    else if (rawStage.includes("ثانوية")) track = "الثانوية العامة";
    else if (rawStage.includes("جامعة") || rawStage.includes("كلية") || rawStage.includes("الفرقة")) track = "المرحلة الجامعية";
    else track = "المناهج العامة";

    if (!stageMap.has(rawStage)) {
      stageMap.set(rawStage, { name: rawStage, track, members: [] });
    }
    stageMap.get(rawStage)!.members.push(student);
  }

  const sortedStages = Array.from(stageMap.values())
    .map((s) => ({
      name: s.name,
      track: s.track,
      count: s.members.length,
      paid: s.members.filter((m) => m.paymentStatus === "paid").length,
      unpaid: s.members.filter((m) => m.paymentStatus !== "paid").length,
      percent: totalRegisteredAccounts > 0 ? Math.round((s.members.length / totalRegisteredAccounts) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Course Breakdown calculation
  const normalize = (v?: string | null) => String(v || "").trim().toLocaleLowerCase("ar");
  const defaultCoursesList = learningCourses.length > 0 ? learningCourses : [
    { id: 1, title: "C++ Programming", category: "baccalaureate", stages: ["البكالوريا - الصف الأول (أولى بكالوريا) - مدارس عربي", "البكالوريا - الصف الأول (أولى بكالوريا) - مدارس لغات (Languages)"] },
    { id: 2, title: "مهارات الكمبيوتر (computer skills)", category: "baccalaureate", stages: ["البكالوريا - الصف الأول (أولى بكالوريا) - مدارس عربي", "البكالوريا - الصف الأول (أولى بكالوريا) - مدارس لغات (Languages)"] },
    { id: 3, title: "Object Oriented Programming (OOP)", category: "university", stages: ["المرحلة الجامعية - الفرقة الأولى / إعدادي - كلية حاسبات والمعلومات", "المرحلة الجامعية - الفرقة الثانية - كلية حاسبات والمعلومات"] },
    { id: 4, title: "Logic Design", category: "university", stages: ["المرحلة الجامعية - الفرقة الأولى / إعدادي - كلية حاسبات والمعلومات"] },
  ];

  const sortedCourses = defaultCoursesList.map((course) => {
    const members = students.filter((student) => {
      const assignedIds = new Set(student.enrolledCourseIds || []);
      const assignedNames = new Set(((student as any).enrolledCategories || []).map(normalize));
      return assignedIds.has(course.id) || assignedNames.has(normalize(course.title)) || assignedNames.has(normalize(course.category || ""));
    });
    const paidCount = members.filter((m) => m.paymentStatus === "paid").length;
    const activeCount = members.filter((m) => m.status === "approved").length;
    const percent = totalRegisteredAccounts > 0 ? Math.round((members.length / totalRegisteredAccounts) * 100) : 0;
    const targetStages = course.stages || [];

    const titleMatch = course.title.match(/^(.*?)\((.*?)\)$/) || course.title.match(/^(.*?)\s*-\s*(.*)$/);
    let titleEng = course.title;
    let titleAr = "";
    if (titleMatch) {
      if (/[\u0600-\u06FF]/.test(titleMatch[1])) {
        titleAr = titleMatch[1].trim();
        titleEng = titleMatch[2].trim();
      } else {
        titleEng = titleMatch[1].trim();
        titleAr = titleMatch[2].trim();
      }
    }

    return {
      id: course.id,
      titleRaw: course.title,
      titleEng,
      titleAr,
      count: members.length,
      activeCount,
      paidCount,
      percent,
      stages: targetStages,
    };
  }).sort((a, b) => b.count - a.count);

  const handleKpiClick = (filterKey: string, filterValue: string) => {
    onNavigateToTab?.("students");
    onFilterStudents?.(filterKey, filterValue);
  };

  return (
    <div className="space-y-6 text-[#F8FAFC]" dir="rtl">
      {/* 1. Operational KPI Cards Row (Single operational metrics definitions) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* KPI 1: Active Approved Students */}
        <button
          type="button"
          onClick={() => handleKpiClick("status", "approved")}
          className="group rounded-2xl border border-[#26364D] bg-[#131E31] p-3.5 text-right transition-all hover:border-[#1677FF] hover:bg-[#1A2942] h-[130px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#A8B5C7]">الطلاب النشطون</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#F8FAFC]">{activeStudents}</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center">
                <TrendingUp className="h-3 w-3 me-0.5" /> %{totalRegisteredAccounts > 0 ? Math.round((activeStudents / totalRegisteredAccounts) * 100) : 0}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#8492A6] truncate">حسابات مفعّلة ومصرح لها</p>
          </div>
        </button>

        {/* KPI 2: Total Accounts */}
        <button
          type="button"
          onClick={() => handleKpiClick("status", "all")}
          className="group rounded-2xl border border-[#26364D] bg-[#131E31] p-3.5 text-right transition-all hover:border-[#1677FF] hover:bg-[#1A2942] h-[130px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#A8B5C7]">إجمالي الحسابات</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1677FF]/15 text-[#1677FF]">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#F8FAFC]">{totalRegisteredAccounts}</span>
              <span className="text-xs font-bold text-[#1677FF]">سجل مسجل</span>
            </div>
            <p className="mt-1 text-[11px] text-[#8492A6] truncate">إجمالي قاعدة الطلاب</p>
          </div>
        </button>

        {/* KPI 3: Paid Subscriptions */}
        <button
          type="button"
          onClick={() => handleKpiClick("payment", "paid")}
          className="group rounded-2xl border border-[#26364D] bg-[#131E31] p-3.5 text-right transition-all hover:border-[#1677FF] hover:bg-[#1A2942] h-[130px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#A8B5C7]">الاشتراكات المدفوعة</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#F8FAFC]">{paidStudents}</span>
              <span className="text-xs font-bold text-blue-400">اشتراك</span>
            </div>
            <p className="mt-1 text-[11px] text-[#8492A6] truncate">وصول كامل مدفوع الأجر</p>
          </div>
        </button>

        {/* KPI 4: Pending Activation */}
        <button
          type="button"
          onClick={() => handleKpiClick("status", "pending")}
          className="group rounded-2xl border border-[#26364D] bg-[#131E31] p-3.5 text-right transition-all hover:border-[#1677FF] hover:bg-[#1A2942] h-[130px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#A8B5C7]">ينتظر التفعيل</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#F8FAFC]">{pendingStudents}</span>
              <span className="text-xs font-bold text-amber-400">طلب</span>
            </div>
            <p className="mt-1 text-[11px] text-[#8492A6] truncate">ينتظر موافقة المشرف</p>
          </div>
        </button>

        {/* KPI 5: Today New Students */}
        <button
          type="button"
          onClick={() => handleKpiClick("sort", "newest")}
          className="group rounded-2xl border border-[#26364D] bg-[#131E31] p-3.5 text-right transition-all hover:border-[#1677FF] hover:bg-[#1A2942] h-[130px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#A8B5C7]">الطلاب الجدد اليوم</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#F8FAFC]">{todayNewStudents}</span>
              <span className="text-xs font-bold text-purple-400">طالب جديد</span>
            </div>
            <p className="mt-1 text-[11px] text-[#8492A6] truncate">مسجل خلال الـ 24 ساعة</p>
          </div>
        </button>

        {/* KPI 6: Suspended Accounts */}
        <button
          type="button"
          onClick={() => handleKpiClick("status", "suspended")}
          className="group rounded-2xl border border-[#26364D] bg-[#131E31] p-3.5 text-right transition-all hover:border-[#1677FF] hover:bg-[#1A2942] h-[130px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#A8B5C7]">الحسابات الموقوفة</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-[#F8FAFC]">{suspendedStudents}</span>
              <span className="text-xs font-bold text-rose-400">موقوف</span>
            </div>
            <p className="mt-1 text-[11px] text-[#8492A6] truncate">حسابات معطلة مؤقتًا</p>
          </div>
        </button>
      </div>

      {/* 2. Needs Action Section */}
      <div className="rounded-2xl border border-[#26364D] bg-[#131E31] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#26364D] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F8FAFC]">تحتاج إلى إجراء فوري</h3>
              <p className="text-xs text-[#A8B5C7]">تنبيهات العمليات والمعاملات التي تتطلب تدخل المشرف</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center justify-between rounded-xl border border-[#26364D] bg-[#0B1424] p-4">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-[#F8FAFC]">مراجعة إيصالات التحويل</span>
              <p className="text-xs text-[#A8B5C7]">{pendingReceipts} إيصال مرفوع ينتظر التأكيد</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab?.("payments")}
              className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-400 transition-colors shadow-sm min-h-[44px]"
            >
              <span>مراجعة ({pendingReceipts})</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#26364D] bg-[#0B1424] p-4">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-[#F8FAFC]">تفعيل الطلاب الجدد</span>
              <p className="text-xs text-[#A8B5C7]">{pendingStudents} حساب جديد ينتظر الموافقة</p>
            </div>
            <button
              type="button"
              onClick={() => handleKpiClick("status", "pending")}
              className="flex items-center gap-1 rounded-xl bg-[#1677FF] px-3 py-2 text-xs font-extrabold text-white hover:bg-[#4096FF] transition-colors shadow-sm min-h-[44px]"
            >
              <span>قبول ({pendingStudents})</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#26364D] bg-[#0B1424] p-4">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-[#F8FAFC]">إرسال إشعارات المنصة</span>
              <p className="text-xs text-[#A8B5C7]">تنبيه جميع الطلاب بالتحديثات</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab?.("notifications")}
              className="flex items-center gap-1.5 rounded-xl border border-[#26364D] bg-[#131E31] px-3 py-2 text-xs font-bold text-[#F8FAFC] hover:bg-[#1A2942] transition-colors min-h-[44px]"
            >
              <Bell className="h-3.5 w-3.5 text-[#1677FF]" />
              <span>إرسال إشعار</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Section 1: Stage Distribution Statistical Table (No empty gaps, Auto Height) */}
      <div className="rounded-2xl border border-[#26364D] bg-[#131E31] p-5 space-y-4 shadow-sm h-auto">
        <div className="flex items-center justify-between border-b border-[#26364D] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1677FF]/15 text-[#1677FF]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F8FAFC]">توزيع الطلاب حسب المرحلة الدراسية</h3>
              <p className="text-xs text-[#A8B5C7]">إحصائيات إجمالي الطلاب، الاشتراكات والنسب المئوية لكافة المراحل</p>
            </div>
          </div>
          <span className="rounded-full bg-[#1677FF]/15 border border-[#1677FF]/30 px-3 py-1 text-xs font-extrabold text-[#1677FF]">
            {sortedStages.length} مراحل دراسية
          </span>
        </div>

        {/* Compact Table */}
        <div className="overflow-x-auto rounded-xl border border-[#26364D] bg-[#0B1424]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#131E31] text-[#A8B5C7] font-bold border-b border-[#26364D]">
              <tr className="h-12">
                <th className="py-3 px-4">المرحلة الدراسية</th>
                <th className="py-3 px-4">المسار</th>
                <th className="py-3 px-4 text-center">إجمالي الطلاب</th>
                <th className="py-3 px-4 text-center">المدفوع</th>
                <th className="py-3 px-4 text-center">غير المدفوع</th>
                <th className="py-3 px-4 w-44">النسبة</th>
                <th className="py-3 px-4 text-left">عرض الطلاب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26364D]/70 bg-[#0B1424]">
              {sortedStages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#8492A6]">
                    لا توجد بيانات طلاب مسجلة بعد.
                  </td>
                </tr>
              ) : (
                sortedStages.map((stage) => (
                  <tr
                    key={stage.name}
                    onClick={() => handleKpiClick("stage", stage.name)}
                    className="h-14 transition-colors hover:bg-[#1A2942] cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-bold text-[#F8FAFC] max-w-[240px]">
                      <div className="truncate text-xs group-hover:text-[#1677FF] transition-colors" title={stage.name}>
                        {stage.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#A8B5C7] font-semibold text-xs whitespace-nowrap">
                      {stage.track}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-sm text-[#F8FAFC]">
                      {stage.count}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-400">
                      {stage.paid}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-amber-400">
                      {stage.unpaid}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#A8B5C7]">
                          <span>{stage.percent}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#131E31]">
                          <div
                            className="h-full bg-[#1677FF] rounded-full transition-all duration-300"
                            style={{ width: `${stage.percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-left">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStageFilter) {
                            onSelectStageFilter(stage.name);
                          } else {
                            handleKpiClick("stage", stage.name);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#384D6C] bg-[#1C2C44] px-3 py-1.5 text-xs font-bold text-[#F8FAFC] hover:bg-[#1677FF] hover:border-[#1677FF] hover:text-white transition-all shadow-xs min-h-[40px]"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#38BDF8]" />
                        <span>عرض الطلاب</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Section 2: Course Distribution Statistical Table */}
      <div className="rounded-2xl border border-[#26364D] bg-[#131E31] p-5 space-y-4 shadow-sm h-auto">
        <div className="flex items-center justify-between border-b border-[#26364D] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1677FF]/15 text-[#1677FF]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F8FAFC]">توزيع الطلاب حسب الكورس</h3>
              <p className="text-xs text-[#A8B5C7]">أعداد التسجيلات، الحسابات النشطة، والاشتراكات المدفوعة لكل كورس</p>
            </div>
          </div>
          <span className="rounded-full bg-[#1677FF]/15 border border-[#1677FF]/30 px-3 py-1 text-xs font-extrabold text-[#1677FF]">
            {sortedCourses.length} كورسات تعليمية
          </span>
        </div>

        {/* Compact Course Table */}
        <div className="overflow-x-auto rounded-xl border border-[#26364D] bg-[#0B1424]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#131E31] text-[#A8B5C7] font-bold border-b border-[#26364D]">
              <tr className="h-12">
                <th className="py-3 px-4">اسم الكورس التعليمي</th>
                <th className="py-3 px-4 text-center">الطلاب المسجلون</th>
                <th className="py-3 px-4 text-center">الحسابات النشطة</th>
                <th className="py-3 px-4 text-center">الاشتراكات المدفوعة</th>
                <th className="py-3 px-4 w-40">النسبة</th>
                <th className="py-3 px-4">المراحل المستهدفة</th>
                <th className="py-3 px-4 text-left">عرض الطلاب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26364D]/70 bg-[#0B1424]">
              {sortedCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#8492A6]">
                    لا توجد كورسات مضافة بعد.
                  </td>
                </tr>
              ) : (
                sortedCourses.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleKpiClick("course", c.titleRaw)}
                    className="h-16 transition-colors hover:bg-[#1A2942] cursor-pointer group"
                  >
                    <td className="py-3 px-4 max-w-[280px]">
                      <div className="space-y-0.5">
                        <span className="block font-black text-sm text-[#F8FAFC] dir-ltr text-right group-hover:text-[#1677FF] transition-colors truncate" title={c.titleEng}>
                          {c.titleEng}
                        </span>
                        {c.titleAr && (
                          <span className="block text-xs font-semibold text-[#A8B5C7] truncate" title={c.titleAr}>
                            {c.titleAr}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-black text-base text-[#F8FAFC]">
                      {c.count}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-400">
                      {c.activeCount}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[#1677FF]">
                      {c.paidCount}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#A8B5C7]">
                          <span>{c.percent}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#131E31]">
                          <div
                            className="h-full bg-[#1677FF] rounded-full transition-all duration-300"
                            style={{ width: `${c.percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1 rounded-lg bg-[#131E31] border border-[#26364D] px-2.5 py-1 text-xs font-bold text-[#A8B5C7]"
                        title={c.stages.length > 0 ? c.stages.join(" | ") : "جميع المراحل"}
                      >
                        <Layers className="h-3.5 w-3.5 text-[#1677FF]" />
                        <span>
                          {c.stages.length === 0
                            ? "جميع المراحل"
                            : c.stages.length === 1
                            ? "مرحلة واحدة"
                            : c.stages.length === 2
                            ? "مرحلتان"
                            : `${c.stages.length} مراحل`}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectCourseFilter) {
                            onSelectCourseFilter(c.titleRaw);
                          } else {
                            handleKpiClick("course", c.titleRaw);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#384D6C] bg-[#1C2C44] px-3 py-1.5 text-xs font-bold text-[#F8FAFC] hover:bg-[#1677FF] hover:border-[#1677FF] hover:text-white transition-all shadow-xs min-h-[40px]"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#38BDF8]" />
                        <span>عرض الطلاب</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
