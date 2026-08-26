import React, { useState, useEffect } from "react";
import { RefreshCw, Loader2, FileCheck2, Eye, Check, X, ShieldCheck, User } from "lucide-react";
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

export function PaymentsTab({ receipts: propReceipts, onRefresh, role = "superadmin" }: { receipts?: PaymentReceipt[]; onRefresh?: () => void; role?: "superadmin" | "subadmin" }) {
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
    // Only fetch independently if the parent didn't pass receipts as props
    if (!propReceipts) {
      void loadReceipts();
    }
  }, []);

  // Sync with parent prop updates (e.g., after admin approves from StudentsTab)
  useEffect(() => {
    if (propReceipts) {
      setReceipts(propReceipts);
      setLoading(false);
    }
  }, [propReceipts]);

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
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs space-y-5 text-[#0F172A]">
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">إدارة ومتابعة إيصالات الدفع والتفعيل</h3>
          <p className="text-xs text-[#64748B] mt-0.5">مراجعة التحويلات، توثيق المشرف المفعل بالاسم والتاريخ، وتأكيد اشتراكات الطلاب</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadReceipts}
            className="h-9 px-3.5 rounded-xl border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A]"
          >
            <RefreshCw className="h-3.5 w-3.5 ml-1.5 text-[#2563EB]" /> تحديث القائمة
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
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              filter === f.key
                ? "bg-[#2563EB] text-white shadow-xs"
                : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                filter === f.key ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#0F172A]"
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
          <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] mb-3">
            <FileCheck2 className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <h4 className="text-sm font-bold text-[#0F172A]">لا توجد إيصالات دفع</h4>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            {filter === "all"
              ? "لم يقم أي طالب برفع إيصال دفع حتى الآن."
              : `لا توجد إيصالات مضافة بحالة «${filter === "pending" ? "قيد المراجعة" : filter === "approved" ? "مقبول" : "مرفوض"}».`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F8FAFC] text-[#334155] font-bold border-b border-[#E2E8F0]">
              <tr className="h-12">
                <th className="px-4 py-3 font-bold">الطالب</th>
                <th className="px-4 py-3 font-bold">رقم الهاتف</th>
                <th className="px-4 py-3 font-bold">تاريخ الرفع</th>
                <th className="px-4 py-3 font-bold">المشرف المسؤول والتاريخ</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 text-left font-bold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {filtered.map((receipt) => (
                <React.Fragment key={receipt.id}>
                  <tr className="h-14 hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-bold text-[#0F172A] text-sm">{receipt.studentName}</td>
                    <td className="px-4 py-3 text-[#0F172A] dir-ltr text-right font-mono text-xs font-semibold">{receipt.studentPhone}</td>
                    <td className="px-4 py-3 text-[#334155] font-semibold text-xs">
                      {new Date(receipt.createdAt).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {receipt.reviewedByName ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-semibold text-[#2563EB]">
                            <User className="h-3 w-3 shrink-0" />
                            <span>{receipt.reviewedByName}</span>
                          </span>
                          {receipt.reviewedAt && (
                            <span className="block text-[10px] text-[#64748B] font-mono font-medium">
                              ⏱️ {new Date(receipt.reviewedAt).toLocaleString("ar-EG", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#64748B] font-medium text-xs">بانتظار المراجعة</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          receipt.status === "pending"
                            ? "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]"
                            : receipt.status === "approved"
                            ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                            : "bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            receipt.status === "pending"
                              ? "bg-[#D97706] animate-pulse"
                              : receipt.status === "approved"
                              ? "bg-[#059669]"
                              : "bg-[#DC2626]"
                          }`}
                        />
                        {receipt.status === "pending" ? "قيد المراجعة" : receipt.status === "approved" ? "مقبول" : "مرفوض"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewId(previewId === receipt.id ? null : receipt.id)}
                          className="h-9 px-3 text-xs font-semibold border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                        >
                          <Eye className="h-3.5 w-3.5 ml-1 text-[#2563EB]" /> {previewId === receipt.id ? "إخفاء" : "معاينة الإيصال"}
                        </Button>
                        {receipt.status === "pending" && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={actionId === receipt.id}
                            onClick={() => handleAction(receipt.id, "approved")}
                            className="h-9 px-3.5 text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-white shadow-xs"
                          >
                            <Check className="h-3.5 w-3.5 ml-1" /> قبول وتفعيل
                          </Button>
                        )}
                        {role === "superadmin" && receipt.status === "pending" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRejectForm(showRejectForm === receipt.id ? null : receipt.id)}
                            className="h-9 px-3 text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50"
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
                      <td colSpan={6} className="bg-[#F8FAFC] p-4 border-b border-[#E2E8F0]">
                        <div className="max-w-md mx-auto rounded-2xl border border-[#E2E8F0] bg-white p-3 text-center shadow-xs">
                          <img
                            src={`/api/admin/payment-receipts/${receipt.id}/image`}
                            alt={`إيصال ${receipt.studentName}`}
                            className="max-h-80 w-full object-contain rounded-xl"
                          />
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Reject Reason Form */}
                  {role === "superadmin" && showRejectForm === receipt.id && (
                    <tr>
                      <td colSpan={6} className="bg-red-50/50 p-4 border-b border-red-200">
                        <div className="max-w-md mx-auto space-y-2 text-right">
                          <label className="block text-xs font-bold text-red-900">سبب الرفض (اختياري)</label>
                          <input
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            placeholder="مثال: الصورة غير واضحة، يرجى إعادة الرفع..."
                            className="h-10 w-full rounded-xl border border-red-200 bg-white px-3 text-xs text-[#0F172A] outline-none focus:border-red-500"
                          />
                          <div className="flex justify-end gap-2 pt-1">
                            <Button size="sm" variant="ghost" onClick={() => setShowRejectForm(null)}>إلغاء</Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-4 rounded-xl"
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
