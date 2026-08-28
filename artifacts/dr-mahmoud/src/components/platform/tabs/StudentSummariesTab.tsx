import React, { useEffect, useState } from "react";
import {
  FileText as FileTextIcon,
  UploadCloud as UploadCloudIcon,
  Plus as PlusIcon,
  CheckCircle2 as CheckCircle2Icon,
  Clock as ClockIcon,
  AlertTriangle as AlertTriangleIcon,
  Image as ImageIcon,
  X as XIcon,
  Loader2 as Loader2Icon,
  Send as SendIcon,
  BookOpen as BookOpenIcon,
  Eye as EyeIcon,
  MessageSquare as MessageSquareIcon,
} from "lucide-react";
import type { Student } from "@/types/platform";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export interface StudentSummary {
  id: number;
  studentId: number;
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

export function StudentSummariesTab({
  student,
  courses = [],
  lessons = [],
  autoOpenUpload = false,
  onModalClosed,
}: {
  student: Student;
  courses?: Array<{ id: number; title: string }>;
  lessons?: Array<{ id: number; title: string; courseId?: number | null }>;
  autoOpenUpload?: boolean;
  onModalClosed?: () => void;
}) {
  const { toast } = useToast();
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "reviewed" | "needs_revision">("all");

  // Upload Form Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [studentNotes, setStudentNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Lightbox Preview
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  useEffect(() => {
    if (autoOpenUpload) {
      setShowUploadModal(true);
    }
  }, [autoOpenUpload]);

  const loadMySummaries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/learning/summaries/my", { credentials: "include" });
      if (!res.ok) throw new Error("تعذر جلب التلخيصات");
      const data = await res.json();
      setSummaries(data);
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMySummaries();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      if (filesArr.length + selectedFiles.length > 10) {
        toast({ variant: "destructive", title: "تنبيه", description: "يمكنك رفع 10 صور كحد أقصى لكل درس." });
        return;
      }

      const newFiles = [...selectedFiles, ...filesArr];
      setSelectedFiles(newFiles);

      const urls = newFiles.map((file) => URL.createObjectURL(file));
      setPreviewUrls(urls);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);

    const urls = newFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى كتابة اسم الدرس." });
      return;
    }
    if (selectedFiles.length === 0) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى اختيار صورة واحدة على الأقل من كشكول الملخص." });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("lessonTitle", lessonTitle.trim());
      if (selectedCourseId) {
        formData.append("courseId", selectedCourseId);
        const matchedCourse = courses.find((c) => String(c.id) === selectedCourseId);
        if (matchedCourse) {
          formData.append("courseTitle", matchedCourse.title);
        }
      }
      if (studentNotes.trim()) {
        formData.append("studentNotes", studentNotes.trim());
      }

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const res = await fetch("/api/learning/summaries/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "تعذر رفع التلخيص");
      }

      const created = await res.json();
      setSummaries((prev) => [created, ...prev]);

      toast({
        title: "تم تسليم الملخص بنجاح! 📝🎉",
        description: "تم إرسال التلخيص للمعلم/المشرف لمراجعته واكتفائه.",
      });

      // Reset form
      setShowUploadModal(false);
      setLessonTitle("");
      setSelectedCourseId("");
      setStudentNotes("");
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (err: any) {
      toast({ variant: "destructive", title: "تعذر الرفع", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-foreground" dir="rtl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold border border-primary/20 shadow-2xs">
            <FileTextIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">تلخيصاتي ومذكراتي 📝</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              ارفع صور تلخيص كشكولك لكل درس لمراجعتها واكتفائها من قبل الدكتور والمشرفين.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowUploadModal(true)}
          className="h-11 rounded-xl px-5 text-xs font-extrabold bg-primary hover:bg-primary/90 text-white shadow-md flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          <span>رفع تلخيص درس جديد</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      {summaries.length > 0 && (
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border w-full sm:w-auto overflow-x-auto">
          {(
            [
              ["all", "الكل"],
              ["pending", "قيد المراجعة ⏳"],
              ["reviewed", "معتمد ⭐"],
              ["needs_revision", "تعديل مطلوب ⚠️"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setStatusFilter(val as any)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === val
                  ? "bg-card text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Submissions List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border">
          <Loader2Icon className="h-8 w-8 text-primary animate-spin" />
          <span className="text-xs font-bold text-muted-foreground mt-3">جارٍ تحميل التلخيصات...</span>
        </div>
      ) : summaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border text-center">
          <UploadCloudIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">لم تقم برفع أي ملخصات بعد</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            صوّر كشكول التلخيص الخاص بالدرس واضغط على "رفع تلخيص درس جديد" لمراجعته وتقييمه.
          </p>
          <Button
            onClick={() => setShowUploadModal(true)}
            variant="outline"
            className="mt-4 rounded-xl text-xs font-bold"
          >
            رفع أول ملخص الآن
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries
            .filter((s) => (statusFilter === "all" ? true : s.status === statusFilter))
            .map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-xs hover:border-primary/40 transition-all"
            >
              <div className="space-y-3">
                {/* Header: Title + Status Badge */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border">
                  <div>
                    <h3 className="text-sm font-black text-foreground leading-snug">{item.lessonTitle}</h3>
                    {item.courseTitle && (
                      <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block mt-1">
                        {item.courseTitle}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 ${
                      item.status === "reviewed"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : item.status === "needs_revision"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse"
                    }`}
                  >
                    {item.status === "reviewed" ? (
                      <>
                        <CheckCircle2Icon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>معتمد ⭐</span>
                      </>
                    ) : item.status === "needs_revision" ? (
                      <>
                        <AlertTriangleIcon className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                        <span>تعديل مطلوب ⚠️</span>
                      </>
                    ) : (
                      <>
                        <ClockIcon className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        <span>قيد المراجعة</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Date */}
                <span className="text-[10px] text-muted-foreground block">
                  تاريخ التسليم: {new Date(item.createdAt).toLocaleDateString("ar-EG")} • {new Date(item.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </span>

                {/* Thumbnails */}
                {item.imageUrls && item.imageUrls.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground block mb-1.5">
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
                          className="relative group shrink-0 h-16 w-16 rounded-xl overflow-hidden border border-border bg-slate-900 focus:outline-none ring-2 ring-transparent hover:ring-primary transition-all"
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

                {/* Teacher Feedback Callout */}
                {item.adminFeedback && (
                  <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary flex items-center gap-1">
                        <MessageSquareIcon className="h-3.5 w-3.5" />
                        ملاحظات المعلم / المشرف:
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {item.reviewedByName || "المعلم"}
                      </span>
                    </div>
                    <p className="leading-relaxed font-semibold text-foreground">{item.adminFeedback}</p>
                  </div>
                )}

                {item.status === "needs_revision" && (
                  <Button
                    type="button"
                    onClick={() => {
                      setLessonTitle(item.lessonTitle);
                      if (item.courseId) setSelectedCourseId(String(item.courseId));
                      setShowUploadModal(true);
                    }}
                    className="w-full h-9 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    <span>إعادة رفع التلخيص بعد التعديل 🔄</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Summary Modal Form */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card p-5 space-y-4 shadow-2xl border border-border text-right" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <UploadCloudIcon className="h-5 w-5 text-primary" />
                <h3 className="text-base font-black text-foreground">رفع ملخص وكشكول الدرس</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  onModalClosed?.();
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick Select Lesson Dropdown */}
              {lessons.length > 0 && (
                <div className="space-y-1.5 bg-primary/5 p-3 rounded-xl border border-primary/20">
                  <label className="block text-xs font-bold text-primary">
                    اختر الدرس المراد رفع تلخيصه (اختياري لتعبئة الاسم تلقائياً):
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedLesson = lessons.find((l) => String(l.id) === e.target.value);
                      if (selectedLesson) {
                        setLessonTitle(selectedLesson.title);
                        if (selectedLesson.courseId) setSelectedCourseId(String(selectedLesson.courseId));
                      }
                    }}
                    className="h-10 w-full rounded-lg border border-primary/30 bg-background px-2.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="">-- اختر الدرس من قائمة دروسك --</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lesson Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">
                  اسم الدرس أو عنوان التلخيص <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ملخص الدرس الأول - التحليل الكهربي والقوانين"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Course Select (Optional) */}
              {courses.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    الكورس التابع له (اختياري):
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">بدون تحديد كورس معين</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* File Image Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">
                  صور صفحات التلخيص/الكشكول <span className="text-rose-500">*</span>
                </label>

                <div className="relative border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary transition-colors bg-background/50">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                  <span className="block text-xs font-bold text-foreground">اضغط هنا لاختيار صور كشكول الملخص</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">يمكنك اختيار عدة صور دفعة واحدة (JPG, PNG, WebP)</span>
                </div>

                {/* Thumbnails */}
                {previewUrls.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-muted-foreground block mb-2">الصور المختارة ({previewUrls.length}):</span>
                    <div className="grid grid-cols-4 gap-2">
                      {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative h-20 rounded-xl overflow-hidden border border-border group">
                          <img src={url} alt={`معاينة ${idx + 1}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Student Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground">
                  ملاحظات أو تعليق للمعلم (اختياري):
                </label>
                <textarea
                  rows={2}
                  placeholder="أي أسئلة أو ملحوظات حابب تقولها للمعلم عن هذا التلخيص..."
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                  <span>تسليم الملخص للتدقيق 📤</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  className="h-11 rounded-xl text-xs font-semibold"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
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
