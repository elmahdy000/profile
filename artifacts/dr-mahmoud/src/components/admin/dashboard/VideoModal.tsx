import React from "react";
import { X, Loader2, Upload, Video as VideoIcon, FileText, Check, HelpCircle } from "lucide-react";
import { CascadingStageSelector } from "@/components/ui/CascadingStageSelector";

export interface ModalVideoFormState {
  title: string;
  youtubeUrl: string;
  category: string;
  description: string;
  type: "video" | "playlist";
  thumbnailUrl: string;
  order: number;
  learningMode: "online" | "offline" | "both";
  stage: string;
  stages: string[];
  courseId: string;
  attachmentFileIds: string[];
  subject: string;
  durationText: string;
  lessonsCount: string;
  level: string;
  tags: string;
  isPublished: boolean;
  isProtected: boolean;
  accessKey: string;
}

export interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  form: ModalVideoFormState;
  setForm: React.Dispatch<React.SetStateAction<ModalVideoFormState>>;
  onSubmit: (e: React.FormEvent) => void;
  videosQuery: { data?: any[] };
  useLatestLessonSettings: () => void;
  getNextLessonNumber: (category: string, mode: string, stages?: string[]) => number;
  coursesQuery: { data?: any[] };
  learningFiles: any[];
  learningQuizzes: any[];
  selectedVideoId: number | null;
  isThumbnailUploading: boolean;
  handleThumbnailImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isVideoUploading: boolean;
  videoUploadProgress: number;
  videoUploadStats: any;
  selectedVideoFile: File | null;
  setSelectedVideoFile: (file: File | null) => void;
  selectedVideoPreviewUrl: string;
  uploadSelectedVideo: () => void;
  handleVideoFileSelection: (e: React.ChangeEvent<HTMLInputElement>) => void;
  createMutation: { isPending: boolean };
  updateMutation: { isPending: boolean };
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  mode,
  form,
  setForm,
  onSubmit,
  videosQuery,
  useLatestLessonSettings,
  getNextLessonNumber,
  coursesQuery,
  learningFiles,
  learningQuizzes,
  selectedVideoId,
  isThumbnailUploading,
  handleThumbnailImageUpload,
  isVideoUploading,
  videoUploadProgress,
  videoUploadStats,
  selectedVideoFile,
  setSelectedVideoFile,
  selectedVideoPreviewUrl,
  uploadSelectedVideo,
  handleVideoFileSelection,
  createMutation,
  updateMutation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="bg-card border border-border w-full max-w-4xl rounded-3xl p-6 relative z-10 max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h3 className="text-lg font-bold text-foreground">
            {mode === "edit"
              ? "تعديل بيانات المحتوى التعليمي"
              : "إضافة محتوى تعليمي جديد"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 rounded-2xl border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["1", "حدد الطلاب"],
                  ["2", "بيانات الدرس"],
                  ["3", "ارفع الفيديو"],
                  ["4", "اربط الملفات"],
                ].map(([number, label]) => (
                  <div
                    key={number}
                    className="flex items-center gap-2 rounded-xl bg-background p-2 text-xs font-bold"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] text-white">
                      {number}
                    </span>
                    {label}
                  </div>
                ))}
              </div>
              {mode === "add" &&
                (videosQuery.data?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={useLatestLessonSettings}
                    className="mt-3 w-full rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs font-bold text-primary hover:bg-primary/10"
                  >
                    ⚡ جهّز درس جديد بنفس إعدادات آخر درس
                  </button>
                )}
            </div>
            <div className="md:col-span-2 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-white">1</span>
                <div>
                  <h4 className="font-black">اسم الدرس ورقمه</h4>
                  <p className="text-xs text-muted-foreground">اكتب البيانات التي ستظهر للطالب في قائمة الدروس.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">نوع المحتوى *</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "video" | "playlist" })} className="w-full rounded-xl border border-primary/30 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="video">فيديو منفرد</option>
                    <option value="playlist">قائمة تشغيل</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">اسم الدرس *</label>
                  <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: المتغيرات وأنواع البيانات" className="w-full rounded-xl border border-primary/30 bg-background px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                {form.type === "playlist" && <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-foreground">رقم الدرس في قائمة التشغيل *</label>
                  <div className="flex gap-2">
                    <input type="number" min="1" required value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="min-w-0 flex-1 rounded-xl border border-primary/30 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <button type="button" onClick={() => setForm({ ...form, order: getNextLessonNumber(form.category, form.learningMode, form.stages) })} className="rounded-xl border border-primary/30 bg-white px-3 text-xs font-bold text-primary hover:bg-primary/5">التالي</button>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">حدد موضع هذا الدرس داخل قائمة التشغيل.</p>
                </div>}
              </div>
            </div>
            <div className="md:col-span-2 mt-1 flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-white">
                2
              </span>
              <div>
                <h4 className="font-black">الدرس ده لمين؟</h4>
                <p className="text-xs text-muted-foreground">
                  حدد المرحلة والكورس ونظام الحضور بدقة.
                </p>
              </div>
            </div>
            <div className="md:col-span-2">
              <CascadingStageSelector
                selectedStages={form.stages}
                onChange={(stages) =>
                  setForm({
                    ...form,
                    stages,
                    stage: stages[0] || "عام",
                  })
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                الكورس التابع له الفيديو
              </label>
              <select
                required
                value={form.courseId}
                onChange={(e) => {
                  const course = coursesQuery.data?.find(
                    (item) => String(item.id) === e.target.value,
                  );
                  setForm({
                    ...form,
                    courseId: e.target.value,
                    category: course?.title || "",
                    stages: [],
                    stage: "",
                    order: getNextLessonNumber(
                      course?.title || "",
                      form.learningMode,
                    ),
                  });
                }}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              >
                <option value="">اختر الكورس</option>
                {coursesQuery.data?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              {(coursesQuery.data?.length || 0) === 0 && (
                <p className="mt-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-700">
                  ضيف كورس الأول من تبويب «الكورسات»، وبعدها ارجع ارفع
                  الفيديو.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                نظام عرض السلسلة
              </label>
              <select
                value={form.learningMode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    learningMode: e.target.value as
                      | "online"
                      | "offline"
                      | "both",
                  })
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              >
                <option value="online">طلاب الأونلاين فقط</option>
                <option value="offline">طلاب الأوفلاين فقط</option>
                <option value="both">كل الطلاب</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                الحماية بتتطبق من السيرفر، مش مجرد إخفاء في الواجهة.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                المادة
              </label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) =>
                  setForm({ ...form, subject: e.target.value })
                }
                placeholder="مثال: البرمجة وعلوم الحاسب"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                المدة (اختياري)
              </label>
              <input
                type="text"
                value={form.durationText}
                onChange={(e) =>
                  setForm({
                    ...form,
                    durationText: e.target.value,
                  })
                }
                placeholder="مثال: 12 ساعة"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                عدد الدروس (اختياري)
              </label>
              <input
                type="number"
                min="0"
                value={form.lessonsCount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    lessonsCount: e.target.value,
                  })
                }
                placeholder="مثال: 24"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                المستوى (اختياري)
              </label>
              <select
                value={form.level}
                onChange={(e) =>
                  setForm({ ...form, level: e.target.value })
                }
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              >
                <option value="">غير محدد</option>
                <option value="مبتدئ">مبتدئ</option>
                <option value="متوسط">متوسط</option>
                <option value="متقدم">متقدم</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                كلمات مفتاحية
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) =>
                  setForm({ ...form, tags: e.target.value })
                }
                placeholder="مثال: متغيرات، C++، تدريب عملي"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                افصل بين الكلمات بفاصلة.
              </p>
            </div>

            {/* Cover Image / Thumbnail Upload Section */}
            <div className="md:col-span-2 space-y-2 border-t pt-4 mt-2">
              <label className="block text-xs font-bold text-foreground text-right flex items-center justify-between">
                <span>🖼️ صورة غلاف الدرس / الفيديو (Thumbnails - اختياري)</span>
                <span className="text-[10px] text-muted-foreground">تظهر كبوستر غلاف قبل التشغيل وفي كروت الكورسات</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                {/* File Upload Box */}
                <div className="sm:col-span-1">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-3 bg-muted/20 cursor-pointer transition-colors text-center">
                    {isThumbnailUploading ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-primary font-bold">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الرفع...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="w-5 h-5 text-primary" />
                        <span className="text-xs font-bold text-foreground">رفع غلاف من جهازك</span>
                        <span className="text-[9px] text-muted-foreground">PNG, JPG, WebP</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailImageUpload}
                      disabled={isThumbnailUploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Image URL Input & Preview Box */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={form.thumbnailUrl}
                      onChange={(e) =>
                        setForm({ ...form, thumbnailUrl: e.target.value })
                      }
                      placeholder="أو اكتب رابط الغلاف مباشرة (مثال: /uploads/... أو رابط خارجي)"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary dir-ltr"
                    />
                    {form.thumbnailUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, thumbnailUrl: "" })
                        }
                        className="px-2.5 py-2 text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl whitespace-nowrap"
                      >
                        حذف الغلاف
                      </button>
                    )}
                  </div>

                  {form.thumbnailUrl && (
                    <div className="relative aspect-video max-h-24 rounded-xl overflow-hidden border border-border bg-slate-950 flex items-center justify-center">
                      <img
                        src={form.thumbnailUrl}
                        alt="معاينة غلاف الفيديو"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                        🖼️ معاينة الغلاف
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 mt-3 flex items-center gap-3 border-t pt-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-white">
                3
              </span>
              <div>
                <h4 className="font-black">الفيديو</h4>
                <p className="text-xs text-muted-foreground">
                  اختار طريقة واحدة: ملف من جهازك، رابط يوتيوب، أو رابط
                  خارجي.
                </p>
              </div>
            </div>

            <div className="md:col-span-2 space-y-3">
              <label className="block text-xs font-semibold text-muted-foreground text-right">
                مصدر الفيديو — اختار طريقة واحدة
              </label>
              <div className="grid grid-cols-1 gap-4">
                <div className="border border-dashed border-border rounded-2xl p-4 bg-muted/30 hover:border-primary/50 transition-colors">
                  <div className="flex flex-col items-center justify-center text-center space-y-2">
                    {isVideoUploading ? (
                      <div className="w-full relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-slate-950 p-5 sm:p-6 shadow-[0_0_35px_rgba(16,185,129,0.2)] text-right font-mono my-2">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-4 relative z-10">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_#34d399]" />
                            </span>
                            <span className="text-xs font-black tracking-wider text-emerald-400 uppercase">
                              نظام الرفع الديجيتال | STREAM HUD
                            </span>
                          </div>
                          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                            🚀 UPLOADING FILE
                          </span>
                        </div>

                        <div className="flex flex-col items-center justify-center my-3 relative z-10">
                          <div className="text-center">
                            <div className="flex items-baseline justify-center gap-1 dir-ltr">
                              <span className="text-6xl sm:text-7xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.7)] font-mono">
                                {String(videoUploadProgress).padStart(3, "0")}
                              </span>
                              <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">%</span>
                            </div>
                            <p className="text-xs font-semibold text-emerald-200/80 mt-2 flex items-center justify-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              <span>جاري نقل وتشفير محتوى الفيديو بالسيرفر...</span>
                            </p>
                          </div>

                          <div className="w-full mt-5 relative">
                            <div className="h-4 w-full rounded-full bg-slate-900 border border-emerald-500/30 p-0.5 overflow-hidden shadow-inner flex items-center">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-400 to-cyan-300 shadow-[0_0_15px_#34d399] transition-all duration-300 relative"
                                style={{ width: `${videoUploadProgress}%` }}
                              >
                                <div className="absolute top-0 right-0 bottom-0 w-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_#fff]" />
                              </div>
                            </div>

                            <div className="flex justify-between text-[9px] text-emerald-500/60 font-bold mt-1 px-1 dir-ltr">
                              <span>0%</span>
                              <span>25%</span>
                              <span>50%</span>
                              <span>75%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </div>

                        {videoUploadStats && (
                          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-emerald-500/20 text-center relative z-10">
                            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-2">
                              <span className="block text-[10px] text-emerald-400/70 font-semibold mb-0.5">البيانات المحملة</span>
                              <span className="text-xs font-bold text-emerald-300 dir-ltr block">
                                {(videoUploadStats.loadedBytes / (1024 * 1024)).toFixed(1)} / {(videoUploadStats.totalBytes / (1024 * 1024)).toFixed(1)} MB
                              </span>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-2">
                              <span className="block text-[10px] text-emerald-400/70 font-semibold mb-0.5">سرعة الرفع</span>
                              <span className="text-xs font-bold text-emerald-300 dir-ltr block">
                                {videoUploadStats.speedMBps} MB/s
                              </span>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-2">
                              <span className="block text-[10px] text-emerald-400/70 font-semibold mb-0.5">الوقت المتبقي</span>
                              <span className="text-xs font-bold text-emerald-300 block">
                                {videoUploadStats.remainingSeconds > 0 ? `${videoUploadStats.remainingSeconds} ثانية` : "لحظات..."}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="mt-3 text-center relative z-10">
                          <span className="text-[10px] text-emerald-400/60 font-medium">
                            ⚠️ الرجاء عدم إغلاق النافذة أو إعادة تحميل الصفحة حتى اكتمال الرفع
                          </span>
                        </div>
                      </div>
                    ) : selectedVideoFile && selectedVideoPreviewUrl ? (
                      <div className="w-full space-y-3 py-2">
                        <video
                          src={selectedVideoPreviewUrl}
                          controls
                          preload="auto"
                          className="max-h-80 w-full rounded-xl bg-black"
                        />
                        <div className="flex flex-col gap-3 rounded-xl border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 text-right">
                            <strong className="block truncate text-xs">
                              {selectedVideoFile.name}
                            </strong>
                            <span className="text-[10px] text-muted-foreground">
                              {(
                                selectedVideoFile.size /
                                1024 /
                                1024
                              ).toFixed(1)}{" "}
                              MB · معاينة محلية قبل الرفع
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedVideoFile(null)}
                              className="rounded-lg border px-3 py-2 text-xs font-bold"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={uploadSelectedVideo}
                              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                            >
                              <Upload className="ml-1 inline h-3.5 w-3.5" />
                              رفع الفيديو
                            </button>
                          </div>
                        </div>
                        {selectedVideoFile.size > 250 * 1024 * 1024 && (
                          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-right text-xs font-bold leading-5 text-amber-800">
                            الفيديو أكبر من 250 MB؛ الأفضل MP4 بترميز H.264 ودقة 720p علشان يبدأ أسرع عند الطلاب والنت الضعيف.
                          </p>
                        )}
                      </div>
                    ) : form.youtubeUrl &&
                      (form.youtubeUrl.startsWith("/uploads/") ||
                        form.youtubeUrl.includes("/stream")) ? (
                      <div className="w-full space-y-3 py-2">
                        <div className="flex items-center gap-3 justify-between bg-background border border-border p-3 rounded-xl">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                              <Check className="w-5 h-5" />
                            </div>
                            <div className="text-right min-w-0">
                              <span className="block text-xs font-bold text-foreground truncate">
                                ملف فيديو مرفوع
                              </span>
                              <span
                                className="block text-[10px] text-muted-foreground truncate"
                                dir="ltr"
                              >
                                {form.youtubeUrl}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                youtubeUrl: "",
                              }))
                            }
                            className="text-[10px] text-red-500 hover:text-red-400 font-semibold px-2 py-1 bg-red-500/5 hover:bg-red-500/10 rounded-lg border border-red-500/10 transition-colors"
                          >
                            حذف الملف
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          تحميل ملف فيديو من جهازك مباشرة
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          صيغ الفيديو المدعومة (MP4, MKV, AVI)
                        </span>
                        <div className="pt-2">
                          <label className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-4 py-2 cursor-pointer transition-colors text-xs inline-flex items-center gap-1.5 shadow-md shadow-primary/10 border border-primary/20">
                            <Upload className="w-3.5 h-3.5" />
                            اختر ملف فيديو
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              disabled={isVideoUploading}
                              onChange={handleVideoFileSelection}
                            />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                    <VideoIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={form.youtubeUrl}
                    onChange={(e) => {
                      setSelectedVideoFile(null);
                      setForm({
                        ...form,
                        youtubeUrl: e.target.value,
                      });
                    }}
                    placeholder="رابط يوتيوب أو رابط خارجي مباشر (اختياري لو هترفع ملف)..."
                    className="w-full bg-background border border-border rounded-xl pr-10 pl-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-left"
                    dir="ltr"
                  />
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">
                    سيب الرابط فاضي لو اخترت فيديو من جهازك؛ هيترفع تلقائيًا
                    وقت نشر الدرس.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground mb-1 text-right">
                الوصف (اختياري)
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                placeholder="اكتب وصفاً مختصراً لمحتوى هذا الفيديو أو قائمة التشغيل..."
                rows={3}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm resize-none"
              />
            </div>

            <div className="md:col-span-2 mt-3 flex items-center gap-3 border-t pt-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-white">
                4
              </span>
              <div>
                <h4 className="font-black">ملفات واختبار الدرس</h4>
                <p className="text-xs text-muted-foreground">
                  اختياري، وتقدر تضيف أكتر من ملف لنفس الدرس.
                </p>
              </div>
            </div>

            {/* Professional lesson resources and quiz associations */}
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_.6fr] gap-4 md:col-span-2">
              <div className="rounded-xl border bg-muted/20 p-4 text-right">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold">
                      <FileText className="w-4 h-4 text-primary" /> مرفقات
                      الدرس
                    </label>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      اختار أكتر من ملف؛ الطالب هيلاقيهم منظمين أسفل
                      الفيديو.
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                    {form.attachmentFileIds.length} ملف
                  </span>
                </div>
                {learningFiles.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
                    ارفع الملفات الأول من تبويب إدارة المنصة والطلاب.
                  </div>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto pl-1">
                    {learningFiles.map((file) => {
                      const checked = form.attachmentFileIds.includes(
                        String(file.id),
                      );
                      return (
                        <label
                          key={file.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${checked ? "border-primary bg-primary/10" : "bg-background hover:border-primary/40"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm({
                                ...form,
                                attachmentFileIds: checked
                                  ? form.attachmentFileIds.filter(
                                      (id) => id !== String(file.id),
                                    )
                                  : [
                                      ...form.attachmentFileIds,
                                      String(file.id),
                                    ],
                              })
                            }
                          />
                          <FileText className="h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate text-xs">
                              {file.title}
                            </strong>
                            <small className="block truncate text-[10px] text-muted-foreground">
                              {file.stage || "كل المراحل"} · {file.category}
                              {file.sizeBytes
                                ? ` · ${(file.sizeBytes / 1024 / 1024).toFixed(1)} MB`
                                : ""}
                            </small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-muted/20 p-4 text-right">
                <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-muted-foreground"><span>اختبار الدرس</span><HelpCircle className="h-3.5 w-3.5 text-primary" /></div>
                <p className="mt-2 text-sm font-bold text-foreground">{learningQuizzes.find((quiz) => quiz.videoId === selectedVideoId)?.title || "لا يوجد اختبار مرتبط"}</p>
                <p className="mt-1 text-xs text-muted-foreground">يتم إنشاء الاختبار وربطه بالدرس من شاشة «إدارة المنصة والطلاب ← الاختبارات» لتجنب تكرار الربط في مكانين.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 rounded-xl border bg-muted/30 p-4 md:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      isPublished: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />{" "}
                منشور للطلاب
              </label>
              <input
                type="checkbox"
                id="isProtected"
                checked={form.isProtected}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isProtected: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2 bg-background"
              />
              <label
                htmlFor="isProtected"
                className="text-xs font-semibold text-foreground cursor-pointer select-none"
              >
                تشفير وحماية هذا الفيديو (يطلب كود تفعيل للمشاهدة بعد أول
                فيديو مجاني)
              </label>
            </div>

            {form.isProtected && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  كود التفعيل لتشغيل الفيديو (Access Key)
                </label>
                <input
                  type="text"
                  required
                  value={form.accessKey}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      accessKey: e.target.value,
                    })
                  }
                  placeholder="مثال: CPP_COURSE_2026 أو KEY_XXXX"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  سيحتاج الطالب لإدخال هذا الكود لمرة واحدة لفك القفل عن
                  الفيديو (وجميع الفيديوهات اللاحقة التي تستخدم نفس الكود).
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end border-t border-border pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs transition-colors border border-border"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={
                isVideoUploading ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-colors shadow-lg shadow-primary/10 flex items-center gap-1.5"
            >
              {(isVideoUploading ||
                createMutation.isPending ||
                updateMutation.isPending) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {mode === "edit"
                ? "حفظ التعديلات"
                : `نشر الدرس رقم ${form.order}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
