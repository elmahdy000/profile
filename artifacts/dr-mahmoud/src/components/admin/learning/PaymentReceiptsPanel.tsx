import React, { useEffect, useState } from "react";
import { Eye, FileCheck2, FileText, Loader2, RefreshCw, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type PaymentReceipt = {
  id: number;
  status: string;
  adminNotes?: string | null;
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
      ...(!(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "تعذر تنفيذ الطلب");
  return data;
}

export function PaymentReceiptsPanel({ receipts: propReceipts, onRefresh }: { receipts?: PaymentReceipt[]; onRefresh?: () => void }) {
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
      toast({ title: status === "approved" ? "تم تأكيد الدفع" : "تم رفض الإيصال" });
      setShowRejectForm(null);
      setRejectNotes("");
      void loadReceipts();
    } catch (err) {
      toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" });
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
    <div className="rounded-2xl border border-border bg-white p-5 shadow-xs space-y-5 text-foreground">
      {/* Card Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-extrabold text-foreground">إدارة إيصالات الدفع</h3>
          <p className="text-xs text-muted-foreground mt-0.5">مراجعة وتأكيد التحويلات وإيصالات الدفع المرفوعة من الطلاب</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadReceipts}
            className="h-9 px-3 rounded-xl border-border bg-white hover:bg-muted text-xs font-bold text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" /> تحديث القائمة
          </Button>
        </div>
      </div>

      {/* Filter Tabs with Counts */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "الكل", count: counts.all },
          { key: "pending", label: "قيد المراجعة", count: counts.pending },
          { key: "approved", label: "مقبول", count: counts.approved },
          { key: "rejected", label: "مرفوض", count: counts.rejected },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key as "all" | "pending" | "approved" | "rejected")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
              filter === f.key
                ? "bg-primary text-white shadow-xs"
                : "bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-[#E4EAF2]/50"
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                filter === f.key
                  ? "bg-white/20 text-white"
                  : "bg-[#E4EAF2] text-foreground"
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
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/50 p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
            <FileCheck2 className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <h4 className="text-sm font-extrabold text-foreground">لا توجد إيصالات دفع</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {filter === "all"
              ? "لم يقم أي طالب برفع إيصال دفع حتى الآن."
              : `لا توجد إيصالات مضافة بحالة «${filter === "pending" ? "قيد المراجعة" : filter === "approved" ? "مقبول" : "مرفوض"}».`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted text-muted-foreground font-bold border-b border-border">
              <tr>
                <th className="px-4 py-3">الطالب</th>
                <th className="px-4 py-3">رقم الهاتف</th>
                <th className="px-4 py-3">تاريخ الرفع</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EAF2] bg-white">
              {filtered.map((receipt) => (
                <React.Fragment key={receipt.id}>
                  <tr className="hover:bg-muted/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-foreground">
                      {receipt.studentName}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground dir-ltr text-right font-mono">
                      {receipt.studentPhone}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {new Date(receipt.createdAt).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                        {receipt.status === "pending"
                          ? "قيد المراجعة"
                          : receipt.status === "approved"
                          ? "مقبول"
                          : "مرفوض"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-bold border-border text-foreground hover:bg-muted"
                          onClick={() => setPreviewId(previewId === receipt.id ? null : receipt.id)}
                        >
                          <Eye className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                          {previewId === receipt.id ? "إخفاء" : "عرض الصورة"}
                        </Button>
                        {receipt.status === "pending" && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={actionId === receipt.id}
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من قبول الإيصال وتفعيل الطالب (${receipt.studentName})؟`)) {
                                  handleAction(receipt.id, "approved");
                                }
                              }}
                              className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {actionId === receipt.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5 ml-1" />
                              )}
                              قبول
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={actionId === receipt.id}
                              onClick={() => setShowRejectForm(showRejectForm === receipt.id ? null : receipt.id)}
                              className="h-8 px-3 text-xs font-bold"
                            >
                              <UserX className="h-3.5 w-3.5 ml-1" />
                              رفض
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline Preview */}
                  {previewId === receipt.id && (
                    <tr className="bg-muted/80">
                      <td colSpan={5} className="p-4">
                        <div className="overflow-hidden rounded-xl border border-border bg-white p-3 text-center">
                          <img
                            src={`/api/admin/payment-receipts/${receipt.id}/image`}
                            alt="إيصال الدفع"
                            className="mx-auto max-h-[450px] rounded-lg object-contain"
                          />
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Inline Reject Form */}
                  {showRejectForm === receipt.id && (
                    <tr className="bg-rose-50/50">
                      <td colSpan={5} className="p-3">
                        <div className="flex items-center gap-2 max-w-xl mr-auto">
                          <input
                            type="text"
                            placeholder="سبب الرفض (اختياري)..."
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            className="flex-1 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={actionId === receipt.id}
                            onClick={() => handleAction(receipt.id, "rejected", rejectNotes)}
                            className="h-8 text-xs font-bold"
                          >
                            {actionId === receipt.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "تأكيد الرفض"
                            )}
                          </Button>
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
