import { useState } from "react";
import {
  FileText,
  FolderOpen,
  Eye,
  X,
  BookOpen,
  Layers,
  FileCode,
  FileArchive,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LearningFile } from "@/types/platform";

// Helper for file type icons & accent colors
function getFileTypeDetails(mimeType?: string | null, originalName: string = "") {
  const ext = originalName.split(".").pop()?.toLowerCase() || "";
  if (mimeType === "application/pdf" || ext === "pdf") {
    return {
      icon: FileText,
      badgeText: "PDF",
      bgClass: "bg-red-500/10 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40",
      iconColorClass: "text-red-600 dark:text-red-400",
    };
  }
  if (ext === "cpp" || ext === "c" || ext === "js" || ext === "ts" || ext === "py" || ext === "html" || ext === "css") {
    return {
      icon: FileCode,
      badgeText: ext.toUpperCase(),
      bgClass: "bg-purple-500/10 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/40",
      iconColorClass: "text-purple-600 dark:text-purple-400",
    };
  }
  if (ext === "zip" || ext === "rar" || ext === "7z") {
    return {
      icon: FileArchive,
      badgeText: ext.toUpperCase(),
      bgClass: "bg-amber-500/10 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/40",
      iconColorClass: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    icon: FileText,
    badgeText: ext ? ext.toUpperCase() : "DOC",
    bgClass: "bg-blue-500/10 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40",
    iconColorClass: "text-blue-600 dark:text-blue-400",
  };
}

// 1. Files Page Header
export function FilesPageHeader({ totalCount }: { totalCount: number }) {
  return (
    <header className="flex flex-col gap-1 text-right border-b border-slate-200 dark:border-[#283A54] pb-3" dir="rtl">
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-[#F8FAFC] tracking-tight">
          مكتبة الملفات والملازم
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-[#172A46] border border-blue-200 dark:border-[#283A54] px-2.5 py-0.5 text-xs font-bold text-[#247CF0] dark:text-[#247CF0]">
          <FolderOpen className="h-3.5 w-3.5" />
          {totalCount} ملفات
        </span>
      </div>
      <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-[#AFC0D6]">
        حمّل واطّلع على المذكرات والأكواد المخصصة لمرحلتك الدراسية.
      </p>
    </header>
  );
}

// 2. Compact Course Filter Tabs
export function CourseFilterTabs({
  categories,
  selectedCategory,
  onSelectCategory,
  files,
}: {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  files: LearningFile[];
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none rounded-xl border border-slate-200 dark:border-[#283A54] bg-white dark:bg-[#101E32] p-2 shadow-2xs" dir="rtl">
      <button
        type="button"
        onClick={() => onSelectCategory("all")}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
          selectedCategory === "all"
            ? "bg-[#247CF0] text-white shadow-2xs"
            : "bg-slate-50 dark:bg-[#172A46] text-slate-700 dark:text-[#AFC0D6] hover:bg-slate-100 dark:hover:bg-[#1D3252] border border-slate-200 dark:border-[#283A54]"
        }`}
      >
        <Layers className="h-3.5 w-3.5" />
        <span>كل الكورسات</span>
        <span className="text-[10px] opacity-80 font-semibold">({files.length})</span>
      </button>

      {categories.map((courseName) => {
        const count = files.filter((f) => (f.category || "كورس عام") === courseName).length;
        const isSelected = selectedCategory === courseName;
        return (
          <button
            key={courseName}
            type="button"
            onClick={() => onSelectCategory(courseName)}
            dir="ltr"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer text-right shrink-0 ${
              isSelected
                ? "bg-[#247CF0] text-white shadow-2xs"
                : "bg-slate-50 dark:bg-[#172A46] text-slate-700 dark:text-[#AFC0D6] hover:bg-slate-100 dark:hover:bg-[#1D3252] border border-slate-200 dark:border-[#283A54]"
            }`}
            style={{ unicodeBidi: "isolate" }}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span>{courseName}</span>
            <span className="text-[10px] opacity-80 font-semibold">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

// 3. Rebuilt File Card Component (Tight hierarchy, 44px button, LTR bidi isolation)
export function FileCard({
  file,
  onPreview,
}: {
  file: LearningFile;
  onPreview: (file: LearningFile) => void;
}) {
  const courseTitle = file.category || "كورس عام";
  const typeDetails = getFileTypeDetails(file.mimeType, file.originalName);
  const IconComponent = typeDetails.icon;
  const fileSizeMb = (file.sizeBytes / 1024 / 1024).toFixed(1);

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[#283A54] bg-white dark:bg-[#101E32] p-5 shadow-2xs hover:border-[#247CF0]/60 hover:-translate-y-0.5 transition-all duration-200 w-full" dir="rtl">
      <div className="space-y-3">
        {/* Top Header Area: File Icon + Title + Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${typeDetails.bgClass}`}>
              <IconComponent className={`h-5 w-5 ${typeDetails.iconColorClass}`} />
            </span>

            <div className="min-w-0 space-y-0.5 flex-1">
              <h3 className="text-base font-black text-slate-900 dark:text-[#F8FAFC] leading-snug line-clamp-2">
                {file.title}
              </h3>
              <p
                dir="ltr"
                className="text-xs font-semibold text-slate-500 dark:text-[#8092AA] truncate text-right"
                style={{ unicodeBidi: "isolate" }}
              >
                {file.originalName}
              </p>
            </div>
          </div>

          <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold border shrink-0 ${typeDetails.bgClass}`}>
            {typeDetails.badgeText}
          </span>
        </div>

        <div className="border-t border-slate-100 dark:border-[#283A54]/60 my-2" />

        {/* Compact Metadata Row: Course on Right, File Size on Left */}
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-[#AFC0D6]">
          <span
            dir="ltr"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-[#172A46] border border-blue-200 dark:border-[#283A54] px-2.5 py-1 text-xs text-[#247CF0] dark:text-[#247CF0] text-right truncate max-w-[70%]"
            style={{ unicodeBidi: "isolate" }}
          >
            <BookOpen className="h-3.5 w-3.5 text-[#247CF0] shrink-0" />
            {courseTitle}
          </span>

          <span
            dir="ltr"
            className="text-xs font-bold text-slate-500 dark:text-[#8092AA] shrink-0"
            style={{ unicodeBidi: "isolate" }}
          >
            {fileSizeMb} MB
          </span>
        </div>
      </div>

      {/* Action Area: 44px High-Contrast Button & Optional Download Icon Button */}
      <div className="pt-3 mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPreview(file)}
          className="w-full h-11 rounded-xl bg-[#247CF0] hover:bg-[#1C68CC] text-white text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <Eye className="h-4 w-4" />
          <span>معاينة الملف</span>
        </button>
      </div>
    </article>
  );
}

// 4. Empty State
export function EmptyFilesState({ hasCategoryFilter }: { hasCategoryFilter: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#283A54] bg-white dark:bg-[#101E32] p-10 text-center space-y-3" dir="rtl">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 dark:bg-[#172A46] text-[#247CF0] border border-blue-100 dark:border-[#283A54]">
        <FolderOpen className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
        {hasCategoryFilter ? "لا توجد ملفات بهذا الكورس" : "لا توجد ملفات مرفوعة حالياً"}
      </h3>
      <p className="text-xs text-slate-500 dark:text-[#AFC0D6] max-w-sm mx-auto leading-relaxed">
        ستظهر مذكرات وأكواد الكورسات المخصصة لمرحلتك هنا فور نشرها لحسابك.
      </p>
    </div>
  );
}

// ── Main FilesTab Component ──
export function FilesTab({ files }: { files: LearningFile[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<LearningFile | null>(null);

  const categories = Array.from(new Set(files.map((file) => file.category || "كورس عام")));
  const filteredFiles = selectedCategory === "all"
    ? files
    : files.filter((file) => (file.category || "كورس عام") === selectedCategory);

  return (
    <section className="space-y-4 text-right max-w-[1400px] w-full" dir="rtl">
      {/* 1. Header */}
      <FilesPageHeader totalCount={files.length} />

      {/* 2. Course Filters */}
      {categories.length > 0 && (
        <CourseFilterTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          files={files}
        />
      )}

      {/* 3. True Responsive 3-Column CSS Grid (Starts from Right in RTL) */}
      {filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-start gap-5 w-full items-stretch" dir="rtl">
          {filteredFiles.map((file) => (
            <FileCard key={file.id} file={file} onPreview={setPreviewFile} />
          ))}
        </div>
      ) : (
        <EmptyFilesState hasCategoryFilter={selectedCategory !== "all"} />
      )}

      {/* 4. Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-3 sm:p-6"
            onMouseDown={(event) => { if (event.currentTarget === event.target) setPreviewFile(null); }}
          >
            <motion.section
              initial={{ scale: 0.98, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 12 }}
              role="dialog"
              aria-modal="true"
              aria-label={`معاينة ${previewFile.title}`}
              className="flex h-[min(90vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#101E32] border border-slate-200 dark:border-[#283A54] shadow-2xl"
            >
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-[#283A54] px-4 py-3 bg-slate-50 dark:bg-[#172A46]">
                <div className="min-w-0">
                  <strong className="block truncate text-slate-900 dark:text-white font-bold">{previewFile.title}</strong>
                  <span dir="ltr" className="block truncate text-xs text-slate-500 dark:text-[#AFC0D6] text-right" style={{ unicodeBidi: "isolate" }}>{previewFile.originalName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-slate-200 dark:hover:bg-[#1D3252] text-slate-600 dark:text-slate-300 transition-colors"
                  aria-label="إغلاق المعاينة"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>
              <div className="min-h-0 flex-1 bg-slate-100 dark:bg-[#08111F] p-2 sm:p-4">
                {previewFile.mimeType?.startsWith("image/") ? (
                  <img src={`/api/learning/files/${previewFile.id}/preview`} alt={previewFile.title} className="h-full w-full object-contain select-none" onContextMenu={(e) => e.preventDefault()} />
                ) : previewFile.mimeType === "application/pdf" || previewFile.mimeType?.startsWith("text/") ? (
                  <iframe src={`/api/learning/files/${previewFile.id}/preview#toolbar=0&navpanes=0&scrollbar=1`} title={previewFile.title} className="h-full w-full rounded-xl border border-slate-200 dark:border-[#283A54] bg-white dark:bg-[#101E32]" />
                ) : (
                  <div className="grid h-full place-items-center rounded-xl border border-slate-200 dark:border-[#283A54] bg-white dark:bg-[#101E32] p-8 text-center">
                    <div>
                      <FileText className="mx-auto h-12 w-12 text-[#247CF0]" />
                      <strong className="mt-4 block text-slate-900 dark:text-white">لا يمكن عرض هذا النوع داخل المتصفح</strong>
                      <p className="mt-2 text-sm text-slate-500 dark:text-[#AFC0D6]">ارفع نسخة PDF من الملف لمعاينتها بأمان داخل المنصة.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
