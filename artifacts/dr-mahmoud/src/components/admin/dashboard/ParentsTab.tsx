import React, { useEffect } from "react";
import { ShieldCheck, Phone, RefreshCw, Loader2, X, CheckCircle2, Clock } from "lucide-react";

export type ParentRow = {
  id: number;
  name: string;
  phone: string;
  parentCode: string;
  createdAt: string;
  lastSessionExpiresAt: string | null;
  student: {
    id: number;
    name: string | null;
    phone: string | null;
    grade: string | null;
    status: string | null;
  } | null;
};

function formatArabicDate(dateString?: string | null): string {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function ParentsTab() {
  const [parents, setParents] = React.useState<ParentRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/parents", { credentials: "include" });
      if (!res.ok) throw new Error("فشل تحميل بيانات أولياء الأمور");
      const data = await res.json();
      setParents(data.parents ?? []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      setError(e.message || "خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = parents.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.parentCode.toLowerCase().includes(q) ||
      (p.student?.name ?? "").toLowerCase().includes(q) ||
      (p.student?.phone ?? "").includes(q)
    );
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0F172A] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0866D9]" />
            أولياء الأمور المسجلون
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            إجمالي المسجلين: <strong>{total}</strong> ولي أمر
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الرقم أو الكود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 pl-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0866D9] w-64"
            />
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0866D9]/10 text-[#0866D9] text-xs font-bold hover:bg-[#0866D9]/20 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#0866D9]" />
          <span className="mr-2 text-sm text-slate-500">جاري التحميل...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <X className="w-4 h-4 shrink-0" />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {search ? "لا توجد نتائج مطابقة للبحث" : "لم يسجّل أي ولي أمر حتى الآن"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_2fr_1.5fr_1.5fr] gap-0 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold text-slate-500">
            <span>ولي الأمر</span>
            <span>رقم الهاتف</span>
            <span>الكود</span>
            <span>الطالب المرتبط</span>
            <span>تاريخ التسجيل</span>
            <span>آخر دخول للبوابة</span>
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.map((parent) => {
              const isActive = parent.lastSessionExpiresAt
                ? new Date(parent.lastSessionExpiresAt) > new Date()
                : false;
              return (
                <div
                  key={parent.id}
                  className="grid grid-cols-[2fr_1.5fr_1fr_2fr_1.5fr_1.5fr] gap-0 px-4 py-3.5 items-center hover:bg-slate-50 transition-colors text-xs"
                >
                  {/* Parent name */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#0866D9]/10 text-[#0866D9] font-black flex items-center justify-center text-xs shrink-0">
                      {parent.name.substring(0, 2)}
                    </div>
                    <span className="font-bold text-slate-900 truncate">{parent.name}</span>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-1 text-slate-600 font-mono">
                    <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                    {parent.phone}
                  </div>

                  {/* Code */}
                  <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-1 rounded-lg w-fit">
                    {parent.parentCode}
                  </span>

                  {/* Student */}
                  {parent.student ? (
                    <div>
                      <span className="font-bold text-slate-900 block">{parent.student.name ?? "—"}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{parent.student.phone ?? ""}</span>
                      {parent.student.grade && (
                        <span className="text-[10px] text-[#0866D9] bg-[#0866D9]/10 px-1.5 py-0.5 rounded-md font-bold mt-0.5 inline-block">
                          {parent.student.grade}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}

                  {/* Registration date */}
                  <span className="text-slate-500 text-[11px]">{formatArabicDate(parent.createdAt)}</span>

                  {/* Last session */}
                  <div className="flex flex-col gap-0.5">
                    {parent.lastSessionExpiresAt ? (
                      <>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                          isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {isActive ? "الجلسة نشطة" : "سجّل دخول"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isActive
                            ? `تنتهي: ${formatArabicDate(parent.lastSessionExpiresAt)}`
                            : `آخر دخول: ${formatArabicDate(parent.lastSessionExpiresAt)}`}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        لم يدخل بعد
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400">
            يتم عرض {filtered.length} من أصل {total} ولي أمر
          </div>
        </div>
      )}
    </div>
  );
}
