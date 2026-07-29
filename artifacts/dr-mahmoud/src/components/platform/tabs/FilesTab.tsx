import { useState } from "react";
import {
  FileText,
  FolderOpen,
  Eye,
  X,
  BookOpen,
  Layers,
  FileCode,
  FileSpreadsheet,
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
    <header className="flex flex-col gap-1 text-right border-b border-slate-200 dark:border-[#223552] pb-3" dir="rtl">
      <div className="flex items-center gap-2.5">
        <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          مكتبة الملفات والملازم
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
          <FolderOpen className="h-3.5 w-3.5" />
          {totalCount} ملفات
        </span>
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        حمّل واطّلع على المذكرات والأكواد المخصصة لمرحلتك الدراسية.
      </p>
    </header>
  );
}

// 2. Course Filter Tabs
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
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-3 shadow-2xs" dir="rtl">
      <button
        type="button"
        onClick={() => onSelectCategory("all")}
        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
          selectedCategory === "all"
            ? "bg-[#0F1B2D] dark:bg-blue-600 text-white shadow-2xs"
            : "bg-slate-50 dark:bg-[#12233B] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A3050] border border-slate-200 dark:border-[#223552]"
        }`}
      >
        <Layers className="h-3.5 w-3.5" />
        <span>كل الكورسات</span>
        <span className="text-[10px] opacity-75 font-normal">({files.length})</span>
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
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer text-right ${
              isSelected
                ? "bg-[#0F1B2D] dark:bg-blue-600 text-white shadow-2xs"
                : "bg-slate-50 dark:bg-[#12233B] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A3050] border border-slate-200 dark:border-[#223552]"
            }`}
            style={{ unicodeBidi: "isolate" }}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span>{courseName}</span>
            <span className="text-[10px] opacity-75 font-normal">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

// 3. File Card Component
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
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-5 shadow-2xs hover:border-blue-500/50 hover:-translate-y-0.5 transition-all duration-200 w-full" dir="rtl">
      <div className="space-y-3">
        {/* Top Row: Type Icon & Type Badge */}
        <div className="flex items-center justify-between gap-2">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${typeDetails.bgClass}`}>
            <IconComponent className={`h-5 w-5 ${typeDetails.iconColorClass}`} />
          </span>

          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${typeDetails.bgClass}`}>
            {typeDetails.badgeText}
          </span>
        </div>

        {/* Main Info: Title */}
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
          {file.title}
        </h3>

        {/* Original File Name (Isolated LTR) */}
        <p
          dir="ltr"
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate text-right"
          style={{ unicodeBidi: "isolate" }}
        >
          {file.originalName}
        </p>

        <div className="border-t border-slate-100 dark:border-[#1F314A] my-2" />

        {/* Metadata: Course Name & Size */}
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span
            dir="ltr"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 px-2.5 py-0.5 text-xs text-blue-700 dark:text-blue-300 text-right truncate"
            style={{ unicodeBidi: "isolate" }}
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            {courseTitle}
          </span>

          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            {fileSizeMb} MB
          </span>
        </div>
      </div>

      {/* Action Button: Solid High-Contrast Blue */}
      <div className="pt-4 mt-2">
        <button
          type="button"
          onClick={() => onPreview(file)}
          className="w-full h-10 rounded-xl bg-[#1769E0] hover:bg-[#1258BE] text-white text-xs font-bold shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <Eye className="h-4 w-4" />
          <span>معاينة وقراءة الملف</span>
        </button>
      </div>
    </article>
  );
}

// 4. Empty State
export function EmptyFilesState({ hasCategoryFilter }: { hasCategoryFilter: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-10 text-center space-y-3" dir="rtl">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
        <FolderOpen className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        {hasCategoryFilter ? "لا توجد ملفات بهذا الكورس" : "لا توجد ملفات مرفوعة حالياً"}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
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

      {/* 3. Responsive File Card Grid */}
      {filteredFiles.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(300px,380px))] justify-start gap-4 w-full">
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
              className="flex h-[min(90vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#0D1B2E] border border-slate-200 dark:border-[#223552] shadow-2xl"
            >
              <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-[#223552] px-4 py-3 bg-slate-50 dark:bg-[#12233B]">
                <div className="min-w-0">
                  <strong className="block truncate text-slate-900 dark:text-white font-bold">{previewFile.title}</strong>
                  <span dir="ltr" className="block truncate text-xs text-slate-500 dark:text-slate-400 text-right" style={{ unicodeBidi: "isolate" }}>{previewFile.originalName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-slate-200 dark:hover:bg-[#1C2C42] text-slate-600 dark:text-slate-300 transition-colors"
                  aria-label="إغلاق المعاينة"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>
              <div className="min-h-0 flex-1 bg-slate-100 dark:bg-[#080E1A] p-2 sm:p-4">
                {previewFile.mimeType?.startsWith("image/") ? (
                  <img src={`/api/learning/files/${previewFile.id}/preview`} alt={previewFile.title} className="h-full w-full object-contain select-none" onContextMenu={(e) => e.preventDefault()} />
                ) : previewFile.mimeType === "application/pdf" || previewFile.mimeType?.startsWith("text/") ? (
                  <iframe src={`/api/learning/files/${previewFile.id}/preview#toolbar=0&navpanes=0&scrollbar=1`} title={previewFile.title} className="h-full w-full rounded-xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E]" />
                ) : (
                  <div className="grid h-full place-items-center rounded-xl border border-slate-200 dark:border-[#223552] bg-white dark:bg-[#0D1B2E] p-8 text-center">
                    <div>
                      <FileText className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400" />
                      <strong className="mt-4 block text-slate-900 dark:text-white">لا يمكن عرض هذا النوع داخل المتصفح</strong>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">ارفع نسخة PDF من الملف لمعاينتها بأمان داخل المنصة.</p>
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
