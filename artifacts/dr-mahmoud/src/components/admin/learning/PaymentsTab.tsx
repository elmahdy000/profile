import React, { useState, useEffect } from "react";
import { RefreshCw, Loader2, FileCheck2, Eye, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type PaymentReceipt = {
  id: number;
  status: string;
  adminNotes?: string | null;
  reviewedByRole?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  originalName: string;
  studentId: number;
  studentName: string;
  studentPhone: string;
  paymentStatus: string;
};

async function adminApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الطلب");
  return data;
}

export function PaymentsTab({ receipts: propReceipts, onRefresh }: { receipts?: PaymentReceipt[]; onRefresh?: () => void }) {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<PaymentReceipt[]>(propReceipts || []);
  const [loading, setLoading] = useState(!propReceipts);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [actionId, setActionId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectForm, setShowRejectForm] = useState<number | null>(null);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const data = await adminApi<PaymentReceipt[]>("/api/admin/payment-receipts");
      setReceipts(data);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReceipts();
  }, []);

  const handleAction = async (receiptId: number, status: "approved" | "rejected", adminNotes?: string) => {
    setActionId(receiptId);
    try {
      await adminApi(`/api/admin/payment-receipts/${receiptId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNotes: adminNotes || undefined }),
      });
      toast({ title: status === "approved" ? "تم تأكيد الدفع وتفعيل حساب الطالب بنجاح 💳" : "تم رفض الإيصال" });
      setShowRejectForm(null);
      setRejectNotes("");
      void loadReceipts();
    } catch (err) {
      toast({ title: "خطأ في التفعيل", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const filtered = filter === "all" ? receipts : receipts.filter((r) => r.status === filter);

  const counts = {
    all: receipts.length,
    pending: receipts.filter((r) => r.status === "pending").length,
    approved: receipts.filter((r) => r.status === "approved").length,
    rejected: receipts.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="rounded-2xl border border-[#E4EAF2] bg-white p-5 shadow-xs space-y-5 text-[#0F172A]">
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4EAF2] pb-4">
        <div>
          <h3 className="text-base font-extrabold text-[#0F172A]">إدارة ومتابعة إيصالات الدفع والتفعيل</h3>
          <p className="text-xs text-[#64748B] mt-0.5">مراجعة التحويلات، توثيق المشرف المفعل بالاسم والتاريخ، وتأكيد اشتراكات الطلاب</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadReceipts}
            className="h-9 px-3 rounded-xl border-[#E4EAF2] bg-white hover:bg-[#F6F8FC] text-xs font-bold text-[#0F172A]"
          >
            <RefreshCw className="h-3.5 w-3.5 ml-1.5 text-[#64748B]" /> تحديث القائمة
          </Button>
        </div>
      </div>

      {/* Filter Tabs with Counts */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "الكل", count: counts.all },
          { key: "pending", label: "قيد المراجعة", count: counts.pending },
          { key: "approved", label: "مقبول ومُفعّل", count: counts.approved },
          { key: "rejected", label: "مرفوض", count: counts.rejected },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key as any)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              filter === f.key
                ? "bg-[#0866D9] text-white shadow-xs"
                : "bg-[#F6F8FC] border border-[#E4EAF2] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E4EAF2]/50"
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                filter === f.key ? "bg-white/20 text-white" : "bg-[#E4EAF2] text-[#0F172A]"
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#0866D9]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E4EAF2] bg-[#F6F8FC]/50 p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#0866D9]/10 text-[#0866D9] mb-3">
            <FileCheck2 className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <h4 className="text-sm font-extrabold text-[#0F172A]">لا توجد إيصالات دفع</h4>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            {filter === "all"
              ? "لم يقم أي طالب برفع إيصال دفع حتى الآن."
              : `لا توجد إيصالات مضافة بحالة «${filter === "pending" ? "قيد المراجعة" : filter === "approved" ? "مقبول" : "مرفوض"}».`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E4EAF2]">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F6F8FC] text-[#64748B] font-bold border-b border-[#E4EAF2]">
              <tr>
                <th className="px-4 py-3">الطالب</th>
                <th className="px-4 py-3">رقم الهاتف</th>
                <th className="px-4 py-3">تاريخ الرفع</th>
                <th className="px-4 py-3">المشرف المسؤول والتاريخ</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EAF2] bg-white">
              {filtered.map((receipt) => (
                <React.Fragment key={receipt.id}>
                  <tr className="hover:bg-[#F6F8FC]/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-[#0F172A]">{receipt.studentName}</td>
                    <td className="px-4 py-3.5 text-[#64748B] dir-ltr text-right font-mono">{receipt.studentPhone}</td>
                    <td className="px-4 py-3.5 text-[#64748B]">
                      {new Date(receipt.createdAt).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      {receipt.reviewedByName ? (
                        <div className="space-y-0.5">
                          <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                            👤 {receipt.reviewedByName}
                          </span>
                          {receipt.reviewedAt && (
                            <span className="block text-[10px] text-slate-500 font-mono">
                              ⏱️ {new Date(receipt.reviewedAt).toLocaleString("ar-EG", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-bold">بانتظار المراجعة</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          receipt.status === "pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : receipt.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            receipt.status === "pending"
                              ? "bg-amber-500 animate-pulse"
                              : receipt.status === "approved"
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                          }`}
                        />
                        {receipt.status === "pending" ? "قيد المراجعة" : receipt.status === "approved" ? "مقبول" : "مرفوض"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewId(previewId === receipt.id ? null : receipt.id)}
                          className="h-8 px-2.5 text-xs font-bold border-[#E4EAF2]"
                        >
                          <Eye className="h-3.5 w-3.5 ml-1" /> {previewId === receipt.id ? "إخفاء" : "معاينة الإيصال"}
                        </Button>
                        {receipt.status !== "approved" && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={actionId === receipt.id}
                            onClick={() => handleAction(receipt.id, "approved")}
                            className="h-8 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="h-3.5 w-3.5 ml-1" /> قبول وتفعيل 💳
                          </Button>
                        )}
                        {receipt.status !== "rejected" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRejectForm(showRejectForm === receipt.id ? null : receipt.id)}
                            className="h-8 px-2.5 text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            <X className="h-3.5 w-3.5 ml-1" /> رفض
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Image Preview Accordion */}
                  {previewId === receipt.id && (
                    <tr>
                      <td colSpan={5} className="bg-[#F6F8FC] p-4 border-b border-[#E4EAF2]">
                        <div className="max-w-md mx-auto rounded-xl border border-[#E4EAF2] bg-white p-3 text-center shadow-xs">
                          <img
                            src={`/api/admin/payment-receipts/${receipt.id}/image`}
                            alt={`إيصال ${receipt.studentName}`}
                            className="max-h-80 w-full object-contain rounded-lg"
                          />
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Reject Reason Form */}
                  {showRejectForm === receipt.id && (
                    <tr>
                      <td colSpan={5} className="bg-rose-50/50 p-4 border-b border-rose-200">
                        <div className="max-w-md mx-auto space-y-2">
                          <label className="block text-xs font-bold text-rose-900">سبب الرفض (اختياري)</label>
                          <input
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder="مثال: الصورة غير واضحة، يرجى إعادة الرفع..."
                            className="input-admin text-xs"
                          />
                          <div className="flex justify-end gap-2 pt-1">
                            <Button size="sm" variant="ghost" onClick={() => setShowRejectForm(null)}>إلغاء</Button>
                            <Button
                              size="sm"
                              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                              disabled={actionId === receipt.id}
                              onClick={() => handleAction(receipt.id, "rejected", rejectNotes)}
                            >
                              تأكيد الرفض
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
