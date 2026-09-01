import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle as AlertTriangleIcon,
  BookOpen as BookOpenIcon,
  Camera as CameraIcon,
  CheckCircle2 as CheckCircle2Icon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  Eye as EyeIcon,
  FileText as FileTextIcon,
  Image as ImageIcon,
  Loader2 as Loader2Icon,
  MessageSquare as MessageSquareIcon,
  Plus as PlusIcon,
  Send as SendIcon,
  UploadCloud as UploadCloudIcon,
  X as XIcon,
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

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [studentNotes, setStudentNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  // Automatically manage object URLs without memory leaks or state updater side-effects
  useEffect(() => {
    if (selectedFiles.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = selectedFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  // Lock body scroll when upload modal is open so the background page doesn't scroll on mobile touch
  useEffect(() => {
    if (showUploadModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showUploadModal]);

  // Lightbox Keyboard navigation (Esc, Arrow Keys)
  useEffect(() => {
    if (activeImageIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveImageIndex(null);
      } else if (e.key === "ArrowRight") {
        setActiveImageIndex((p) => (p !== null && p > 0 ? p - 1 : p));
      } else if (e.key === "ArrowLeft") {
        setActiveImageIndex((p) => (p !== null && previewImages.length > 0 && p < previewImages.length - 1 ? p + 1 : p));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageIndex, previewImages.length]);

  const openUploadModal = (title = "", courseId = "") => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setUploadSuccess(false);
    setUploadProgress(0);
    setSubmitting(false);
    setLessonTitle(title);
    setSelectedCourseId(courseId);
    setStudentNotes("");
    setSelectedFiles([]);
    setShowUploadModal(true);
  };

  useEffect(() => {
    if (autoOpenUpload) openUploadModal();
  }, [autoOpenUpload]);

  const loadMySummaries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/learning/summaries/my", { credentials: "include" });
      if (!res.ok) throw new Error("تعذر جلب التلخيصات");
      setSummaries(await res.json());
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMySummaries();
  }, []);

  const addFiles = useCallback((incoming: File[]) => {
    setSelectedFiles((prev) => {
      if (prev.length >= 10) {
        toast({ variant: "destructive", title: "تنبيه", description: "وصلت للحد الأقصى (10 صور كحد أقصى)." });
        return prev;
      }
      const combined = [...prev, ...incoming];
      if (combined.length > 10) {
        toast({ title: "تنبيه", description: "تمت إضافة الصور حتى الحد الأقصى (10 صور)." });
        return combined.slice(0, 10);
      }
      return combined;
    });
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index: number, dir: -1 | 1) => {
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= selectedFiles.length) return;
    setSelectedFiles((prev) => {
      const arr = [...prev];
      [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
      return arr;
    });
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/") ||
      f.type === "application/pdf" ||
      f.type.includes("word") ||
      /\.(heic|heif|jpg|jpeg|png|webp|gif|bmp|jfif|tiff|pdf|doc|docx|txt)$/i.test(f.name)
    );
    if (files.length) addFiles(files);
  };

  const closeModal = () => {
    if (submitting) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setShowUploadModal(false);
    setUploadSuccess(false);
    setLessonTitle("");
    setSelectedCourseId("");
    setStudentNotes("");
    setSelectedFiles([]);
    setUploadProgress(0);
    onModalClosed?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى اختيار أو كتابة اسم الدرس." });
      return;
    }
    if (selectedFiles.length === 0) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى اختيار صورة واحدة على الأقل." });
      return;
    }
    setSubmitting(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("lessonTitle", lessonTitle.trim());
      if (selectedCourseId) {
        formData.append("courseId", selectedCourseId);
        const mc = courses.find((c) => String(c.id) === selectedCourseId);
        if (mc) formData.append("courseTitle", mc.title);
      }
      if (studentNotes.trim()) formData.append("studentNotes", studentNotes.trim());
      selectedFiles.forEach((file) => formData.append("images", file));

      const created = await new Promise<StudentSummary>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/learning/summaries/upload");
        xhr.withCredentials = true;
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error("استجابة غير صالحة")); }
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || "تعذر رفع الملخص")); } catch { reject(new Error("تعذر رفع الملخص")); }
          }
        };
        xhr.onerror = () => reject(new Error("خطأ في الاتصال، يرجى الفحص وإعادة المحاولة"));
        xhr.send(formData);
      });

      setSummaries((prev) => [created, ...prev]);
      setUploadSuccess(true);
      setUploadProgress(100);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setShowUploadModal(false);
        setUploadSuccess(false);
        setLessonTitle("");
        setSelectedCourseId("");
        setStudentNotes("");
        setSelectedFiles([]);
        setUploadProgress(0);
        onModalClosed?.();
      }, 2500);
    } catch (err: any) {
      toast({ variant: "destructive", title: "تعذر الرفع", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSummaries = summaries.filter((s) => statusFilter === "all" || s.status === statusFilter);
  const pendingCount = summaries.filter((s) => s.status === "pending").length;
  const needsRevisionCount = summaries.filter((s) => s.status === "needs_revision").length;

  return (
    <div className="space-y-6 text-foreground" dir="rtl">

      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <FileTextIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              تلخيصاتي ومذكراتي 📝
              {needsRevisionCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black">{needsRevisionCount}</span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">ارفع صور تلخيص كشكولك لكل درس لمراجعتها واكتفائها من قبل الدكتور والمشرفين.</p>
          </div>
        </div>
        <Button onClick={() => openUploadModal()} className="h-11 rounded-xl px-5 text-xs font-extrabold bg-primary hover:bg-primary/90 text-white shadow-md flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /><span>رفع تلخيص درس جديد</span>
        </Button>
      </div>

      {/* First-time guide */}
      {!loading && summaries.length === 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
          <h3 className="text-sm font-black text-primary">📋 كيف ترفع مذكرة أو ملخص درس؟</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { step: "١", icon: BookOpenIcon, cls: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800", text: "اختر الدرس المراد رفع تلخيصه" },
              { step: "٢", icon: CameraIcon, cls: "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800", text: "صوّر صفحات كشكولك أو مذكرتك" },
              { step: "٣", icon: SendIcon, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800", text: "ارفع الصور وانتظر اكتفاء المعلم" },
            ] as const).map(({ step, icon: Icon, cls, text }) => (
              <div key={step} className={`flex items-center gap-3 rounded-xl border p-3 ${cls}`}>
                <span className="text-lg font-black">{step}</span>
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-xs font-bold leading-snug">{text}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => openUploadModal()} className="w-full sm:w-auto h-11 rounded-xl bg-primary text-white font-bold text-sm">ابدأ رفع أول ملخص الآن 🚀</Button>
        </div>
      )}

      {/* Filter */}
      {summaries.length > 0 && (
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border overflow-x-auto">
          {([
            ["all", "الكل"],
            ["pending", pendingCount > 0 ? `قيد المراجعة ⏳ (${pendingCount})` : "قيد المراجعة ⏳"],
            ["reviewed", "معتمد ⭐"],
            ["needs_revision", needsRevisionCount > 0 ? `تعديل ⚠️ (${needsRevisionCount})` : "تعديل مطلوب ⚠️"],
          ] as const).map(([val, label]) => (
            <button key={val} type="button" onClick={() => setStatusFilter(val as any)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                statusFilter === val ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}>{label}</button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border">
          <Loader2Icon className="h-8 w-8 text-primary animate-spin" />
          <span className="text-xs font-bold text-muted-foreground mt-3">جارٍ تحميل التلخيصات...</span>
        </div>
      ) : filteredSummaries.length === 0 && summaries.length > 0 ? (
        <div className="flex flex-col items-center p-10 bg-card rounded-2xl border border-border text-center">
          <span className="text-2xl mb-2">🔍</span>
          <p className="text-sm font-bold">لا يوجد تلخيصات بهذا الفلتر</p>
        </div>
      ) : summaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSummaries.map((item) => (
            <div key={item.id} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-xs hover:border-primary/40 transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border">
                  <div>
                    <h3 className="text-sm font-black text-foreground leading-snug">{item.lessonTitle}</h3>
                    {item.courseTitle && <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block mt-1">{item.courseTitle}</span>}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 ${
                    item.status === "reviewed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : item.status === "needs_revision" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse"
                  }`}>
                    {item.status === "reviewed" ? <><CheckCircle2Icon className="h-3 w-3" /><span>معتمد ⭐</span></>
                    : item.status === "needs_revision" ? <><AlertTriangleIcon className="h-3 w-3" /><span>تعديل ⚠️</span></>
                    : <><ClockIcon className="h-3 w-3" /><span>قيد المراجعة</span></>}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground block">{new Date(item.createdAt).toLocaleDateString("ar-EG")} • {new Date(item.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                {item.imageUrls?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground block mb-1.5">الملفات والملخصات المرفوعة ({item.imageUrls.length}):</span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {item.imageUrls.map((imgUrl, imgIdx) => {
                        const isDoc = /\.(pdf|doc|docx|txt)$/i.test(imgUrl);
                        if (isDoc) {
                          return (
                            <a key={imgIdx} href={imgUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 h-16 px-3 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all shrink-0">
                              <FileTextIcon className="h-5 w-5" />
                              <span className="truncate max-w-[100px]">ملف #{imgIdx + 1}</span>
                            </a>
                          );
                        }
                        return (
                          <button key={imgIdx} type="button" onClick={() => { setPreviewImages(item.imageUrls); setActiveImageIndex(imgIdx); }}
                            className="relative group shrink-0 h-16 w-16 rounded-xl overflow-hidden border border-border bg-slate-100 dark:bg-slate-800 ring-2 ring-transparent hover:ring-primary transition-all focus:outline-none">
                            <img src={imgUrl} alt={`صفحة ${imgIdx + 1}`} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"><EyeIcon className="h-4 w-4" /></div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {item.adminFeedback && (
                  <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary flex items-center gap-1"><MessageSquareIcon className="h-3.5 w-3.5" />ملاحظات المعلم:</span>
                      <span className="text-[10px] text-muted-foreground">{item.reviewedByName || "المعلم"}</span>
                    </div>
                    <p className="leading-relaxed font-semibold text-foreground">{item.adminFeedback}</p>
                  </div>
                )}
                {item.status === "needs_revision" && (
                  <Button type="button" onClick={() => openUploadModal(item.lessonTitle, item.courseId ? String(item.courseId) : "")}
                    className="w-full h-9 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1.5">
                    <PlusIcon className="h-3.5 w-3.5" /><span>إعادة رفع التلخيص بعد التعديل 🔄</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ===== Upload Modal ===== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs"
          onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl border border-border text-right max-h-[85dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden" dir="rtl">

            <div className="shrink-0 bg-card flex items-center justify-between px-5 pt-5 pb-3 border-b border-border z-10">
              <div className="flex items-center gap-2">
                <UploadCloudIcon className="h-5 w-5 text-primary" />
                <h3 className="text-base font-black text-foreground">رفع ملخص / كشكول الدرس</h3>
              </div>
              <button type="button" onClick={closeModal} disabled={submitting} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors disabled:opacity-40">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="flex flex-col items-center justify-center gap-4 px-5 py-12 text-center overflow-y-auto">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 border-2 border-emerald-500/30">
                  <CheckCircle2Icon className="h-10 w-10 text-emerald-500" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-lg font-black text-foreground">تم تسليم الملخص بنجاح! 🎉</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    تم إرسال {selectedFiles.length} {selectedFiles.length === 1 ? "ملف/صورة" : "ملفات/صور"} للمعلم/المشرف. ستصلك إشعار عند الاكتفاء.
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground animate-pulse">سيتم الإغلاق تلقائياً...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                  {/* Step 1 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-black">١</span>
                      <label className="text-xs font-black text-foreground">اختر الدرس</label>
                    </div>
                    {lessons.length > 0 ? (
                      <div className="space-y-2">
                        <select
                          value={lessons.find((l) => l.title === lessonTitle) ? String(lessons.find((l) => l.title === lessonTitle)!.id) : ""}
                          onChange={(e) => {
                            const sel = lessons.find((l) => String(l.id) === e.target.value);
                            if (sel) { setLessonTitle(sel.title); if (sel.courseId) setSelectedCourseId(String(sel.courseId)); }
                          }}
                          className="h-11 w-full rounded-xl border border-primary/30 bg-primary/5 px-3 text-xs font-bold text-foreground focus:border-primary focus:outline-none cursor-pointer"
                        >
                          <option value="" disabled>-- اختر من قائمة دروسك --</option>
                          {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                        </select>
                        <input type="text" placeholder="أو اكتب اسم الدرس يدوياً..." value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)}
                          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none" />
                      </div>
                    ) : (
                      <input type="text" required placeholder="مثال: ملخص الدرس الأول - التحليل الكهربي" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)}
                        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none" />
                    )}
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[10px] font-black">٢</span>
                        <label className="text-xs font-black text-foreground">صور الكشكول / المذكرة <span className="text-rose-500">*</span></label>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold">{selectedFiles.length}/10</span>
                    </div>

                    <div ref={dropZoneRef} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                      className={`relative rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                        isDragging ? "border-primary bg-primary/10 scale-[1.01]"
                        : selectedFiles.length > 0 ? "border-emerald-400/50 bg-emerald-500/5"
                        : "border-border bg-background/50 hover:border-primary/50"
                      }`}>
                      <input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt" multiple onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      {selectedFiles.length === 0 ? (
                        <div className="pointer-events-none space-y-1.5">
                          <ImageIcon className="mx-auto h-9 w-9 text-muted-foreground/50" />
                          <p className="text-sm font-black text-foreground">اسحب الصور أو الملفات هنا أو اضغط للاختيار</p>
                          <p className="text-[11px] text-muted-foreground">صور (JPG, PNG, HEIC) • ملفات (PDF, Word, TXT) • حتى 10 ملفات</p>
                        </div>
                      ) : (
                        <p className="pointer-events-none text-xs font-bold text-emerald-600 dark:text-emerald-400">✅ {selectedFiles.length} ملفات/صور محددة — اضغط لإضافة المزيد</p>
                      )}
                    </div>

                    <label className="relative flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-bold text-foreground cursor-pointer transition-colors">
                      <input type="file" accept="image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt" capture="environment" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                      <CameraIcon className="h-4 w-4 text-primary" />
                      التقط صورة الكشكول الآن بالكاميرا 📷
                    </label>

                    {previewUrls.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-muted-foreground block mb-2">الملفات المختارة — يمكنك ترتيبها أو حذفها:</span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {previewUrls.map((url, idx) => {
                            const fileObj = selectedFiles[idx];
                            const isDoc = fileObj && (fileObj.type.includes("pdf") || fileObj.type.includes("word") || fileObj.name.match(/\.(pdf|doc|docx|txt)$/i));
                            return (
                              <div key={idx} className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-slate-100 dark:bg-slate-800">
                                {isDoc ? (
                                  <div className="flex flex-col items-center justify-center h-full p-2 text-center bg-primary/10 text-primary">
                                    <FileTextIcon className="h-7 w-7 mb-1 shrink-0" />
                                    <span className="text-[9px] font-bold truncate max-w-full dir-ltr">{fileObj?.name}</span>
                                  </div>
                                ) : (
                                  <img src={url} alt={`معاينة ${idx + 1}`} className="h-full w-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                                  <div className="flex gap-1">
                                    <button type="button" onClick={() => moveFile(idx, -1)} disabled={idx === 0} className="h-6 w-6 rounded-lg bg-white/20 text-white flex items-center justify-center disabled:opacity-30 hover:bg-white/30"><ChevronRightIcon className="h-3.5 w-3.5" /></button>
                                    <button type="button" onClick={() => moveFile(idx, 1)} disabled={idx === selectedFiles.length - 1} className="h-6 w-6 rounded-lg bg-white/20 text-white flex items-center justify-center disabled:opacity-30 hover:bg-white/30"><ChevronLeftIcon className="h-3.5 w-3.5" /></button>
                                  </div>
                                  <button type="button" onClick={() => removeFile(idx)} className="h-6 px-2 rounded-lg bg-rose-500/80 text-white text-[10px] font-bold flex items-center gap-0.5 hover:bg-rose-600"><XIcon className="h-3 w-3" />حذف</button>
                                </div>
                                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-black/60 text-white text-[9px] font-black flex items-center justify-center pointer-events-none">{idx + 1}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 3 */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-black border border-border">٣</span>
                      <label className="text-xs font-bold text-muted-foreground">ملاحظة للمعلم (اختياري):</label>
                    </div>
                    <textarea rows={2} placeholder="أي أسئلة أو تعليقات للمعلم..." value={studentNotes} onChange={(e) => setStudentNotes(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none resize-none" />
                  </div>

                  {/* Progress */}
                  {submitting && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-primary flex items-center gap-1.5"><Loader2Icon className="h-3.5 w-3.5 animate-spin" />جارٍ رفع {selectedFiles.length} {selectedFiles.length === 1 ? "ملف" : "ملفات"}...</span>
                        <span className="text-muted-foreground">{uploadProgress}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                </div>

                {/* Sticky Submit Footer */}
                <div className="shrink-0 bg-card p-4 border-t border-border sticky bottom-0 shadow-lg z-20 flex items-center gap-2">
                  <Button type="submit" disabled={submitting || selectedFiles.length === 0 || !lessonTitle.trim()}
                    className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-40">
                    {submitting ? <><Loader2Icon className="h-4 w-4 animate-spin" /><span>جارٍ الرفع...</span></> : <><SendIcon className="h-4 w-4" /><span>تسليم الملخص للتدقيق 📤</span></>}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeModal} disabled={submitting} className="h-12 rounded-xl text-xs font-semibold px-4">إلغاء</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {activeImageIndex !== null && previewImages.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4" onClick={() => setActiveImageIndex(null)}>
          <button type="button" onClick={() => setActiveImageIndex(null)} className="absolute top-4 right-4 z-50 text-white bg-white/15 p-2 rounded-full hover:bg-white/25 transition-colors"><XIcon className="h-6 w-6" /></button>
          {previewImages.length > 1 && (
            <>
              <button type="button" disabled={activeImageIndex === 0} onClick={(e) => { e.stopPropagation(); setActiveImageIndex((p) => (p !== null && p > 0 ? p - 1 : p)); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 disabled:opacity-30 transition-colors">
                <ChevronRightIcon className="h-6 w-6" />
              </button>
              <button type="button" disabled={activeImageIndex === previewImages.length - 1} onClick={(e) => { e.stopPropagation(); setActiveImageIndex((p) => (p !== null && p < previewImages.length - 1 ? p + 1 : p)); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 disabled:opacity-30 transition-colors">
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
            </>
          )}
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={previewImages[activeImageIndex]} alt={`صفحة ${activeImageIndex + 1}`} className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl" />
            <div className="mt-3 text-white text-xs font-bold bg-black/40 px-4 py-1.5 rounded-full">صفحة {activeImageIndex + 1} من {previewImages.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}