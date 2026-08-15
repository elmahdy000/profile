import React from "react";
import { Upload, Check, Loader2 } from "lucide-react";
import { CascadingStageSelector } from "@/components/ui/CascadingStageSelector";

export interface VideoFormState {
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
}

export interface UploadVideoTabProps {
  videoForm: VideoFormState;
  setVideoForm: React.Dispatch<React.SetStateAction<VideoFormState>>;
  handleVideoSubmit: (e: React.FormEvent) => void;
  selectedVideoFile: File | null;
  setSelectedVideoFile: (file: File | null) => void;
  isVideoDragging: boolean;
  setIsVideoDragging: (dragging: boolean) => void;
  selectVideoFile: (file: File | null) => void;
  handleVideoFileSelection: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isVideoUploading: boolean;
  videoUploadProgress: number;
  videoUploadStats: {
    loadedBytes: number;
    totalBytes: number;
    speedMBps: number;
    remainingSeconds: number;
  } | null;
  isThumbnailUploading: boolean;
  handleThumbnailImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getNextLessonNumber: (category: string, mode: string, stages?: string[]) => number;
  coursesQuery: {
    data?: any[];
    isLoading: boolean;
  };
  learningFiles: any[];
  createVideoMutation: { isPending: boolean };
  updateVideoMutation: { isPending: boolean };
  setActiveTab: (tab: any) => void;
}

export const UploadVideoTab: React.FC<UploadVideoTabProps> = ({
  videoForm,
  setVideoForm,
  handleVideoSubmit,
  selectedVideoFile,
  setSelectedVideoFile,
  isVideoDragging,
  setIsVideoDragging,
  selectVideoFile,
  handleVideoFileSelection,
  isVideoUploading,
  videoUploadProgress,
  videoUploadStats,
  isThumbnailUploading,
  handleThumbnailImageUpload,
  getNextLessonNumber,
  coursesQuery,
  learningFiles,
  createVideoMutation,
  updateVideoMutation,
  setActiveTab,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary" />
            <span>مركز رفع ونشر الفيديوهات والدروس</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            ارفع فيديوهات الشرح المباشرة مع العداد الديجيتال، غلاف الصورة، وتحديد الكورس والمستهدفين بسهولة
          </p>
        </div>
        <button
          onClick={() => setActiveTab("videos")}
          className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs font-bold transition-colors border border-border shrink-0"
        >
          العودة لمكتبة الفيديوهات
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 text-xs text-primary">
        <span className="text-xl">⚡</span>
        <div>
          <p className="font-bold">ملاحظة للتسهيل عليك أثناء الرفع:</p>
          <p className="text-muted-foreground mt-0.5">
            تم تفعيل مرحلة «كل المراحل (عام للجميع)» افتراضياً حتى لا تتغلب في تحديد المستهدفين، ويمكنك تخصيص الكورس والمراحل بالأسفل إن رغبت.
          </p>
        </div>
      </div>

      {/* Dedicated Upload Form Card */}
      <form onSubmit={handleVideoSubmit} className="space-y-6 rounded-3xl border border-border bg-white p-5 shadow-sm md:p-7">
        {/* Section 1: Video File Upload */}
        <div className="space-y-3 border-b border-border/40 pb-6">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-black text-white">1</span>
            <h3 className="font-bold text-foreground text-base">ملف الفيديو للشرح</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-muted-foreground mb-1">
                خيار 1: اختيار فيديو من جهازك (مع العداد الديجيتال)
              </span>
              <div
                onDragEnter={(event) => { event.preventDefault(); setIsVideoDragging(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { event.preventDefault(); if (event.currentTarget === event.target) setIsVideoDragging(false); }}
                onDrop={(event) => { event.preventDefault(); selectVideoFile(event.dataTransfer.files?.[0] || null); }}
                className={`group relative flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all ${isVideoDragging ? "scale-[1.01] border-primary bg-blue-50 ring-4 ring-blue-100" : selectedVideoFile ? "border-emerald-300 bg-emerald-50/40" : "border-border bg-muted hover:border-primary hover:bg-blue-50/40"}`}
              >
                <input
                  type="file"
                  accept=".mp4,.webm,.mov,.ogg,video/mp4,video/webm,video/quicktime,video/ogg"
                  onChange={handleVideoFileSelection}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {selectedVideoFile ? (
                  <div className="z-0 w-full space-y-2">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Check className="h-6 w-6" /></span>
                    <span className="block truncate text-sm font-bold text-foreground">{selectedVideoFile.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      الحجم: {(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    <span className="block text-xs font-bold text-emerald-700">جاهز للرفع عند حفظ الدرس</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pointer-events-none">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-100 text-primary"><Upload className="h-7 w-7 transition-transform group-hover:-translate-y-0.5" /></span>
                    <span className="block text-sm font-bold text-foreground">{isVideoDragging ? "اترك الفيديو هنا" : "اسحب الفيديو أو اضغط للاختيار"}</span>
                    <span className="block text-xs text-muted-foreground">MP4 أو WebM أو MOV — حتى 1 GB</span>
                    <span className="mt-1 block text-[11px] text-emerald-700">أفضل حجم وجودة: MP4 (H.264)، دقة 1080p، وميزة Web Optimized</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-muted-foreground mb-1">
                خيار 2: أو اكتب رابط يوتيوب / رابط خارجي مباشر
              </span>
              <textarea
                value={videoForm.youtubeUrl}
                onChange={(e) => { setVideoForm({ ...videoForm, youtubeUrl: e.target.value }); if (e.target.value.trim()) setSelectedVideoFile(null); }}
                placeholder="https://youtube.com/watch?v=... أو رابط مباشر"
                className="h-[180px] w-full resize-none rounded-2xl border border-border bg-white px-4 py-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Video Stream Digital HUD Progress */}
          {isVideoUploading && (
            <div className="mt-4 p-4 rounded-2xl bg-[#090D14] border border-primary/40 shadow-2xl relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500" />
                  <span className="text-xs font-mono font-bold text-primary tracking-wider uppercase">
                    DIGITAL STREAM HUD :: UPLOADING VIDEO
                  </span>
                </div>
                <span className="text-2xl font-black font-mono text-primary drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]">
                  {String(videoUploadProgress).padStart(3, "0")}%
                </span>
              </div>

              <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-primary/30 relative">
                <div
                  className="relative h-full bg-primary transition-all duration-200"
                  style={{ width: `${videoUploadProgress}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite]" />
                </div>
              </div>

              {videoUploadStats && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                  <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-muted-foreground block">السرعة الحية</span>
                    <span className="text-xs font-bold text-emerald-400">⚡ {videoUploadStats.speedMBps} MB/s</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-muted-foreground block">البيانات المرفوعة</span>
                    <span className="text-xs font-bold text-primary">
                      {(videoUploadStats.loadedBytes / (1024 * 1024)).toFixed(1)} / {(videoUploadStats.totalBytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                    <span className="text-[10px] text-muted-foreground block">الوقت المتبقي</span>
                    <span className="text-xs font-bold text-amber-400">
                      ⏳ {videoUploadStats.remainingSeconds > 60 ? `${Math.ceil(videoUploadStats.remainingSeconds / 60)} دقيقة` : `${videoUploadStats.remainingSeconds} ثانية`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Thumbnail Image Cover */}
        <div className="space-y-3 border-b border-border/40 pb-6">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-black text-white">2</span>
            <h3 className="font-bold text-foreground text-base">صورة غلاف الدرس (Thumbnail)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-muted-foreground mb-1">
                رفع غلاف من جهازك
              </span>
              <div className="relative border border-dashed border-border hover:border-primary/50 rounded-xl p-3 bg-muted/50 transition-colors flex flex-col items-center justify-center min-h-[90px]">
                {isThumbnailUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">جاري الرفع...</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground text-center font-bold">
                      انقر هنا لاختيار صورة الغلاف
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">PNG, JPG, WebP حتى 10MB</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-muted-foreground mb-1">
                أو رابط مباشر لصورة الغلاف
              </span>
              <input
                type="text"
                value={videoForm.thumbnailUrl}
                onChange={(e) => setVideoForm({ ...videoForm, thumbnailUrl: e.target.value })}
                placeholder="https://domain.com/cover.jpg"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm h-[90px]"
              />
            </div>
          </div>

          {videoForm.thumbnailUrl && (
            <div className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl">
              <img
                src={videoForm.thumbnailUrl}
                alt="Cover Preview"
                className="w-20 h-14 object-cover rounded-lg border"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-emerald-400 block">✓ تم تعيين صورة الغلاف بنجاح</span>
                <span className="text-[10px] text-muted-foreground block line-clamp-1">{videoForm.thumbnailUrl}</span>
              </div>
              <button
                type="button"
                onClick={() => setVideoForm({ ...videoForm, thumbnailUrl: "" })}
                className="text-xs text-red-400 font-bold hover:underline"
              >
                حذف
              </button>
            </div>
          )}
        </div>

        {/* Section 3: Lesson Details */}
        <div className="space-y-4 border-b border-border/40 pb-6">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-black text-white">3</span>
            <h3 className="font-bold text-foreground text-base">بيانات الدرس والتصنيف</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-foreground mb-1">عنوان الدرس / الفيديو *</label>
              <input
                type="text"
                required
                value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                placeholder="مثال: الدرس الأول - مقدمة في البرمجة وهياكل البيانات"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">نوع المحتوى *</label>
              <select
                value={videoForm.type}
                onChange={(e) => setVideoForm({ ...videoForm, type: e.target.value as "video" | "playlist" })}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
              >
                <option value="video">فيديو منفرد</option>
                <option value="playlist">قائمة تشغيل</option>
              </select>
            </div>

            {videoForm.type === "playlist" && (
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">رقم الدرس في قائمة التشغيل *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={videoForm.order}
                    onChange={(e) => setVideoForm({ ...videoForm, order: Number(e.target.value) })}
                    className="min-w-0 flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setVideoForm({ ...videoForm, order: getNextLessonNumber(videoForm.category, videoForm.learningMode, videoForm.stages) })}
                    className="rounded-xl border border-primary/30 px-3 text-xs font-bold text-primary hover:bg-primary/5"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">الكورس التابع له الفيديو *</label>
              <select
                required
                value={videoForm.courseId}
                onChange={(e) => {
                  const course = coursesQuery.data?.find(
                    (item) => String(item.id) === e.target.value,
                  );
                  setVideoForm({
                    ...videoForm,
                    courseId: e.target.value,
                    category: course?.title || "",
                    stages: [],
                    stage: "",
                    order: getNextLessonNumber(course?.title || "", videoForm.learningMode),
                  });
                }}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
              >
                <option value="">اختر الكورس</option>
                {coursesQuery.data?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">نظام عرض السلسلة</label>
              <select
                value={videoForm.learningMode}
                onChange={(e) => setVideoForm({ ...videoForm, learningMode: e.target.value as "online" | "offline" | "both" })}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
              >
                <option value="online">طلاب الأونلاين فقط</option>
                <option value="offline">طلاب الأوفلاين فقط</option>
                <option value="both">كل الطلاب (أونلاين وأوفلاين)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-foreground mb-1">وصف تفصيلي للدرس (اختياري)</label>
              <textarea
                rows={3}
                value={videoForm.description}
                onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                placeholder="اكتب النقاط الرئيسية المشروحة في هذا الفيديو..."
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
              />
            </div>

            {/* Premium Lesson Attachments Selection */}
            <div className="md:col-span-2 border-t border-border/40 pt-4 mt-2">
              <label className="block text-sm font-bold text-foreground mb-1">الملفات المرفقة مع هذا الدرس (PDF / Word / ملخصات)</label>
              <span className="block text-xs text-muted-foreground mb-3">اختر الملفات المرفقة التي يستطيع الطالب تحميلها مباشرة عند فتح هذا الدرس</span>
              
              {learningFiles.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-border bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground font-bold">لا توجد ملفات مرفوعة حالياً في المكتبة التعليمية.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("learning")}
                    className="mt-2 text-xs text-primary font-black hover:underline"
                  >
                    ارفع أول ملف من تبويب "المكتبة التعليمية" بالخارج
                  </button>
                </div>
              ) : (
                <div className="border border-border rounded-2xl overflow-hidden bg-muted/50 p-4 space-y-3">
                  {/* Selection status header */}
                  <div className="flex items-center justify-between text-xs font-bold border-b border-border pb-2">
                    <span className="text-muted-foreground">الملفات المتاحة في الكورسات والمراحل</span>
                    <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      تم تحديد ({videoForm.attachmentFileIds.length}) ملف مرفق
                    </span>
                  </div>

                  {/* Interactive checklist grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[220px] overflow-y-auto pr-1">
                    {learningFiles.map((file) => {
                      const isChecked = videoForm.attachmentFileIds.includes(String(file.id));
                      return (
                        <div
                          key={file.id}
                          onClick={() => {
                            const newIds = isChecked
                              ? videoForm.attachmentFileIds.filter((id) => id !== String(file.id))
                              : [...videoForm.attachmentFileIds, String(file.id)];
                            setVideoForm({ ...videoForm, attachmentFileIds: newIds });
                          }}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            isChecked
                              ? "border-primary bg-blue-50/30 text-primary shadow-sm"
                              : "border-border hover:border-border hover:bg-muted text-foreground bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary pointer-events-none"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold leading-tight">{file.title}</span>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span className="truncate">{file.category}</span>
                              {file.stage && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{file.stage}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 pb-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-black text-white">4</span>
            <h3 className="font-bold text-foreground text-base">المستهدفون من الدرس (تحديد المرحلة والصف)</h3>
          </div>
          <CascadingStageSelector
            selectedStages={videoForm.stages}
            onChange={(stages) =>
              setVideoForm({
                ...videoForm,
                stages,
                stage: stages[0] || "عام",
              })
            }
          />
        </div>

        {/* Submit Action Bar */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            className="px-5 py-3 bg-muted hover:bg-muted/80 text-foreground/80 rounded-xl text-xs font-bold transition-colors border border-border"
          >
            إلغاء والعودة
          </button>
          <button
            type="submit"
            disabled={createVideoMutation.isPending || updateVideoMutation.isPending || isVideoUploading}
            className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl text-sm transition-all shadow-xl shadow-primary/20 flex items-center gap-2 hover:scale-[1.02]"
          >
            {(createVideoMutation.isPending || updateVideoMutation.isPending || isVideoUploading) ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري حفظ ونشر الدرس...</span>
              </>
            ) : (
              <>
                <span>🚀 حفظ ونشر الدرس فوراً</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
