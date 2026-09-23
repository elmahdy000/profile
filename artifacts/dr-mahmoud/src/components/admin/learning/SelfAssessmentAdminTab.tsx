import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Search,
  Plus,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  ShieldCheck,
  History,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface EntitlementItem {
  id: number;
  phone: string;
  studentName: string;
  freeAttemptUsed: boolean;
  paidAttemptsBalance: number;
  totalPurchasedAttempts: number;
  lastGrantedBy?: string | null;
  lastGrantedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function SelfAssessmentAdminTab({ role = "superadmin" }: { role?: "superadmin" | "subadmin" }) {
  const { toast } = useToast();
  const [entitlements, setEntitlements] = useState<EntitlementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activatingPhone, setActivatingPhone] = useState<string | null>(null);

  // Manual top-up form
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCount, setManualCount] = useState<number>(3);
  const [submittingManual, setSubmittingManual] = useState(false);

  const fetchEntitlements = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/learning/self-assessment/entitlements${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر جلب باقات التقييم الذاتي");
      setEntitlements(data.entitlements || []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: (err as Error).message,
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEntitlements(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void fetchEntitlements();
  }, []);

  const handleGrantAttempts = async (phone: string, studentName: string, attemptsCount = 3) => {
    setActivatingPhone(phone);
    try {
      const res = await fetch("/api/admin/learning/self-assessment/grant-attempts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          studentName,
          attemptsCount,
          notes: "تفعيل باقة 3 محاولات (50 ج.م)",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر تفعيل الباقة");

      toast({
        title: "تم التفعيل بنجاح! 🚀",
        description: data.message || `تم إضافة ${attemptsCount} محاولات لرقم ${phone}`,
      });

      // Clear manual fields if matched
      if (manualPhone === phone) {
        setManualPhone("");
        setManualName("");
      }

      await fetchEntitlements(true);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "فشل التفعيل",
        description: (err as Error).message,
      });
    } finally {
      setActivatingPhone(null);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim()) {
      toast({ variant: "destructive", description: "يرجى كتابة رقم الهاتف" });
      return;
    }
    setSubmittingManual(true);
    await handleGrantAttempts(manualPhone, manualName, manualCount);
    setSubmittingManual(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                إدارة باقات التقييم الذاتي المخصص (3 محاولات بـ 50 ج.م)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                تفعيل محاولات الاختبار الذاتي للطلاب والزوار من خارج المنصة بمجرد تأكيد استلام المبلغ.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchEntitlements(false)}
            className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ml-1.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            تحديث القائمة
          </Button>
        </div>
      </div>

      {/* 2. Quick Grant Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          شحن فوري لباقة جديدة أو رقم طالب:
        </h3>
        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4 space-y-1">
            <label className="text-xs font-medium text-slate-700">رقم هاتف الطالب / الزائر *</label>
            <div className="relative">
              <Phone className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="مثال: 01012345678"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                className="pr-9 rounded-xl text-xs h-10 border-slate-200"
                dir="ltr"
              />
            </div>
          </div>

          <div className="sm:col-span-4 space-y-1">
            <label className="text-xs font-medium text-slate-700">اسم الطالب (اختياري)</label>
            <div className="relative">
              <User className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="اسم الطالب"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="pr-9 rounded-xl text-xs h-10 border-slate-200"
              />
            </div>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700">عدد المحاولات</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={manualCount}
              onChange={(e) => setManualCount(Number(e.target.value) || 3)}
              className="rounded-xl text-xs h-10 text-center border-slate-200 font-bold"
            />
          </div>

          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={submittingManual || !manualPhone.trim()}
              className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              {submittingManual ? "جاري التفعيل..." : "+ تفعيل الباقة (50 ج.م)"}
            </Button>
          </div>
        </form>
      </div>

      {/* 3. Search & List Section */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="بحث برقم الهاتف أو الاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 rounded-xl text-xs h-9 bg-white border-slate-200"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            إجمالي الحسابات المسجلة: <strong className="text-slate-800">{entitlements.length}</strong>
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-2" />
            <p className="text-xs">جاري تحميل سجل الباقات والمحاولات...</p>
          </div>
        ) : entitlements.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <Sparkles className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">لا توجد طلبات أو أرقام مسجلة حتى الآن</p>
            <p className="text-xs text-slate-400 mt-1">
              سيظهر هنا تلقائياً أي طالب أو زائر يستخدم التقييم الذاتي من الموقع.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">الطالب / الزائر</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3 text-center">المحاولة المجانية</th>
                  <th className="p-3 text-center">الرصيد المتبقي</th>
                  <th className="p-3 text-center">إجمالي المشترى</th>
                  <th className="p-3">آخر تفعيل بواسطة</th>
                  <th className="p-3 text-center">إجراء سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {entitlements.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">
                      {item.studentName || "طالب زائر"}
                    </td>
                    <td className="p-3 font-mono text-slate-700" dir="ltr">
                      {item.phone}
                    </td>
                    <td className="p-3 text-center">
                      {item.freeAttemptUsed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          تم استهلاكها
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> متاحة مجاناً
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs ${
                          item.paidAttemptsBalance > 0
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        <Coins className="h-3.5 w-3.5" />
                        {item.paidAttemptsBalance} محاولات
                      </span>
                    </td>
                    <td className="p-3 text-center font-medium text-slate-700">
                      {item.totalPurchasedAttempts || 0}
                    </td>
                    <td className="p-3 text-[11px] text-slate-500">
                      {item.lastGrantedBy ? (
                        <div>
                          <span className="font-semibold text-slate-700">{item.lastGrantedBy}</span>
                          {item.lastGrantedAt && (
                            <span className="block text-[10px] text-slate-400">
                              {new Date(item.lastGrantedAt).toLocaleDateString("ar-EG")}
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        disabled={activatingPhone === item.phone}
                        onClick={() => handleGrantAttempts(item.phone, item.studentName, 3)}
                        className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs"
                      >
                        {activatingPhone === item.phone ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5 ml-1" />
                            +3 محاولات (50 ج)
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
