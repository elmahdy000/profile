import React, { useEffect, useState } from "react";
import {
  FileText as FileTextIcon,
  Search as SearchIcon,
  CheckCircle2 as CheckCircle2Icon,
  AlertTriangle as AlertTriangleIcon,
  Clock as ClockIcon,
  User as UserIcon,
  Eye as EyeIcon,
  X as XIcon,
  Send as SendIcon,
  Loader2 as Loader2Icon,
  RefreshCw as RefreshCwIcon,
  Sparkles as SparklesIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface SummaryItem {
  id: number;
  studentId: number;
  studentName?: string;
  studentPhone?: string;
  studentGrade?: string;
  accessCode?: string;
  lessonTitle: string;
  courseId?: number | null;
  courseTitle?: string | null;
  imageUrls: string[];
  studentNotes?: string | null;
  status: "pending" | "reviewed" | "needs_revision";
  adminFeedback?: string | null;
  reviewedByRole?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export function StudentSummariesAdminTab({
  role = "superadmin",
}: {
  role?: "superadmin" | "subadmin";
}) {
  const { toast } = useToast();
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "reviewed" | "needs_revision">("all");
  
  // Review Modal state
  const [reviewingSummary, setReviewingSummary] = useState<SummaryItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"reviewed" | "needs_revision">("reviewed");
  const [adminFeedback, setAdminFeedback] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Lightbox Image Preview state
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  const loadSummaries = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/summaries", { credentials: "include" });
      if (!res.ok) throw new Error("تعذر جلب ملخصات الطلاب");
      const data = await res.json();
      setSummaries(data);
    } catch (err: any) {
      if (!silent) {
        toast({ variant: "destructive", title: "خطأ", description: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummaries();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingSummary) return;

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/admin/summaries/${reviewingSummary.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: reviewStatus,
          adminFeedback,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "تعذر حفظ المراجعة");
      }

      const updated = await res.json();
      setSummaries((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));

      toast({
        title: reviewStatus === "reviewed" ? "تمت المراجعة والاعتماد ⭐" : "تم طلب التعديل بنجاح 📝",
        description: "تم إرسال إشعار تلقائي للطالب بنتيجة المراجعة.",
      });

      setReviewingSummary(null);
      setAdminFeedback("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredSummaries = summaries.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.lessonTitle.toLowerCase().includes(q) ||
      (item.studentName && item.studentName.toLowerCase().includes(q)) ||
      (item.studentPhone && item.studentPhone.includes(q)) ||
      (item.accessCode && item.accessCode.toLowerCase().includes(q)) ||
      (item.courseTitle && item.courseTitle.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = summaries.filter((s) => s.status === "pending").length;
  const reviewedCount = summaries.filter((s) => s.status === "reviewed").length;
  const revisionCount = summaries.filter((s) => s.status === "needs_revision").length;

  return (
    <div className="space-y-6 text-[#0F172A]" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-2xs">
            <FileTextIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#0F172A]">مراجعة وتدقيق ملخصات ومذكرات الطلاب 📝</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              راجع صور كشكول الدروس المرفوعة من الطلاب، أضف ملحوظاتك التشجيعية، واعتمد التلخيص بضغطة زر.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadSummaries()}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
        >
          <RefreshCwIcon className={`h-4 w-4 text-[#64748B] ${loading ? "animate-spin" : ""}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#64748B] block">إجمالي التلخيصات</span>
          <strong className="text-2xl font-black text-[#0F172A] mt-1 block">{summaries.length}</strong>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">ينتظر المراجعة</span>
            <ClockIcon className="h-4 w-4 text-amber-600" />
          </div>
          <strong className="text-2xl font-black text-amber-900 mt-1 block">{pendingCount}</strong>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">تم الاعتماد ⭐</span>
            <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />
          </div>
          <strong className="text-2xl font-black text-emerald-900 mt-1 block">{reviewedCount}</strong>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">تعديل مطلوب ⚠️</span>
            <AlertTriangleIcon className="h-4 w-4 text-rose-600" />
          </div>
          <strong className="text-2xl font-black text-rose-900 mt-1 block">{revisionCount}</strong>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full min-w-0">
            <SearchIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
            <input
              type="text"
              placeholder="ابحث باسم الطالب، اسم الدرس، رقم الهاتف، أو الكود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pr-10 pl-4 text-xs font-semibold text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] w-full sm:w-auto">
            {(
              [
                ["all", "الكل"],
                ["pending", `معلق (${pendingCount})`],
                ["reviewed", "معتمد ⭐"],
                ["needs_revision", "تعديل ⚠️"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setStatusFilter(val as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === val
                    ? "bg-white text-blue-600 shadow-2xs"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summaries List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-[#E2E8F0]">
          <Loader2Icon className="h-8 w-8 text-blue-600 animate-spin" />
          <span className="text-xs font-bold text-[#64748B] mt-3">جارٍ تحميل التلخيصات...</span>
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-[#E2E8F0] text-center">
          <FileTextIcon className="h-10 w-10 text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-[#0F172A]">لا توجد تلخيصات مطابقة</h3>
          <p className="text-xs text-[#64748B] mt-1">لم يقم الطلاب برفع تلخيصات تطابق نتائج البحث الحالية.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSummaries.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3.5 shadow-xs hover:border-blue-300 transition-all"
            >
              <div className="space-y-3">
                {/* Header: Student Info + Status Badge */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#F1F5F9]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <strong className="truncate text-xs font-extrabold text-[#0F172A]">
                        {item.studentName || `طالب #${item.studentId}`}
                      </strong>
                    </div>
                    <span className="text-[11px] text-[#64748B] block mt-0.5">
                      {item.studentGrade || "غير محدد"} • {item.studentPhone || ""}
                    </span>
                  </div>

                  {/* Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 ${
                      item.status === "reviewed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : item.status === "needs_revision"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                    }`}
                  >
                    {item.status === "reviewed" ? (
                      <>
                        <CheckCircle2Icon className="h-3 w-3 text-emerald-600" />
                        <span>معتمد ⭐</span>
                      </>
                    ) : item.status === "needs_revision" ? (
                      <>
                        <AlertTriangleIcon className="h-3 w-3 text-rose-600" />
                        <span>تعديل ⚠️</span>
                      </>
                    ) : (
                      <>
                        <ClockIcon className="h-3 w-3 text-amber-600" />
                        <span>قيد المراجعة</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Lesson Title & Date */}
                <div>
                  <h3 className="text-sm font-black text-[#0F172A] leading-snug">{item.lessonTitle}</h3>
                  {item.courseTitle && (
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-1">
                      {item.courseTitle}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 block mt-1">
                    تاريخ الرفع: {new Date(item.createdAt).toLocaleDateString("ar-EG")} • {new Date(item.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Photo Thumbnails Preview Gallery */}
                {item.imageUrls && item.imageUrls.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-[#64748B] block mb-1.5">
                      صور الكشكول المرفوعة ({item.imageUrls.length} صورة):
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {item.imageUrls.map((imgUrl, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => {
                            setPreviewImages(item.imageUrls);
                            setActiveImageIndex(imgIdx);
                          }}
                          className="relative group shrink-0 h-16 w-16 rounded-xl overflow-hidden border border-[#E2E8F0] bg-slate-100 focus:outline-none ring-2 ring-transparent hover:ring-blue-500 transition-all"
                        >
                          <img
                            src={imgUrl}
                            alt={`صفحة ${imgIdx + 1}`}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <EyeIcon className="h-4 w-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Student Notes */}
                {item.studentNotes && (
                  <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                    <span className="font-bold text-[#0F172A] block mb-0.5">ملاحظات الطالب:</span>
                    <p className="leading-relaxed whitespace-pre-wrap">{item.studentNotes}</p>
                  </div>
                )}

                {/* Teacher Feedback Box (if already reviewed) */}
                {item.adminFeedback && (
                  <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900">ملاحظات المعلم:</span>
                      <span className="text-[10px] text-blue-700 font-semibold">{item.reviewedByName || "المعلم"}</span>
                    </div>
                    <p className="leading-relaxed font-semibold">{item.adminFeedback}</p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => {
                    setReviewingSummary(item);
                    setReviewStatus(item.status === "needs_revision" ? "needs_revision" : "reviewed");
                    setAdminFeedback(item.adminFeedback || "");
                  }}
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                  <span>{item.status === "pending" ? "مراجعة واعتماد التلخيص" : "تعديل المراجعة والملاحظات"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal Dialog */}
      {reviewingSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 space-y-4 shadow-2xl border border-[#E2E8F0] text-right" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-black text-[#0F172A]">مراجعة تلخيص الدرس</h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewingSummary(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] space-y-1 text-xs">
              <span className="font-bold text-[#0F172A] block">الطالب: {reviewingSummary.studentName} ({reviewingSummary.studentGrade})</span>
              <span className="font-semibold text-blue-600 block">الدرس: {reviewingSummary.lessonTitle}</span>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Status Radio Choice */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#0F172A]">نتيجة المراجعة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus("reviewed")}
                    className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                      reviewStatus === "reviewed"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    <CheckCircle2Icon className="h-4 w-4" />
                    <span>اعتماد التلخيص ⭐</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus("needs_revision")}
                    className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                      reviewStatus === "needs_revision"
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                    }`}
                  >
                    <AlertTriangleIcon className="h-4 w-4" />
                    <span>طلب تعديل ⚠️</span>
                  </button>
                </div>
              </div>

              {/* Admin Feedback Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#0F172A]">
                  ملاحظات وتعليق المعلم للطالب (اختياري/تشجيعي):
                </label>
                <textarea
                  rows={3}
                  placeholder="مثال: أحسنت يا بطل! تلخيص ممتاز وخط رائع كمل بنفس هذا المستوى 👏"
                  value={adminFeedback}
                  onChange={(e) => setAdminFeedback(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs font-semibold text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  {submittingReview ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                  <span>حفظ الاعتماد وتنبيه الطالب</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewingSummary(null)}
                  className="h-11 px-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Image Gallery Modal */}
      {activeImageIndex !== null && previewImages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setActiveImageIndex(null)}
            className="absolute top-4 right-4 z-50 text-white bg-white/20 p-2 rounded-full hover:bg-white/30"
          >
            <XIcon className="h-6 w-6" />
          </button>

          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center">
            <img
              src={previewImages[activeImageIndex]}
              alt={`صفحة ${activeImageIndex + 1}`}
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <div className="mt-3 flex items-center gap-4 text-white text-xs font-bold">
              <span>صفحة {activeImageIndex + 1} من {previewImages.length}</span>
              {previewImages.length > 1 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={activeImageIndex === 0}
                    onClick={() => setActiveImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                    className="px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50"
                  >
                    السابقة
                  </button>
                  <button
                    type="button"
                    disabled={activeImageIndex === previewImages.length - 1}
                    onClick={() => setActiveImageIndex((prev) => (prev !== null && prev < previewImages.length - 1 ? prev + 1 : prev))}
                    className="px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50"
                  >
                    التالية
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
