import { useState, useMemo } from "react";
import {
  FileText,
  FolderOpen,
  Eye,
  X,
  BookOpen,
  Layers,
  FileCode,
  FileArchive,
  Search,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LearningFile } from "@/types/platform";
import { FilePreviewModal } from "../FilePreviewModal";

// Helper for file type icons & accent colors
function getFileTypeDetails(mimeType?: string | null, originalName: string = "") {
  const ext = originalName.split(".").pop()?.toLowerCase() || "";
  if (mimeType === "application/pdf" || ext === "pdf") {
    return {
      icon: FileText,
      badgeText: "PDF",
      bgClass: "bg-red-500/10 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200/80 dark:border-red-900/40",
      iconColorClass: "text-red-600 dark:text-red-400",
    };
  }
  if (ext === "cpp" || ext === "c" || ext === "js" || ext === "ts" || ext === "py" || ext === "html" || ext === "css") {
    return {
      icon: FileCode,
      badgeText: ext.toUpperCase(),
      bgClass: "bg-purple-500/10 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200/80 dark:border-purple-900/40",
      iconColorClass: "text-purple-600 dark:text-purple-400",
    };
  }
  if (ext === "zip" || ext === "rar" || ext === "7z") {
    return {
      icon: FileArchive,
      badgeText: ext.toUpperCase(),
      bgClass: "bg-amber-500/10 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-900/40",
      iconColorClass: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    icon: FileText,
    badgeText: ext ? ext.toUpperCase() : "DOC",
    bgClass: "bg-blue-500/10 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-900/40",
    iconColorClass: "text-blue-600 dark:text-blue-400",
  };
}

// 1. Files Page Header
export function FilesPageHeader({ totalCount }: { totalCount: number }) {
  return (
    <header className="flex flex-col gap-1 text-right border-b border-slate-200/80 dark:border-[#1E2E48] pb-3.5" dir="rtl">
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          مكتبة الملفات والملازم
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-2xs">
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="font-mono tabular-nums">{totalCount}</span> ملفات
        </span>
      </div>
      <p className="text-xs md:text-[13px] font-medium text-slate-500 dark:text-slate-400">
        حمّل واطّلع على المذكرات والشيتات المخصصة لمرحلتك الدراسية مع إمكانية المعاينة المباشرة.
      </p>
    </header>
  );
}

// 2. Compact Course Filter Tabs & Search
export function CourseFilterTabs({
  categories,
  selectedCategory,
  onSelectCategory,
  files,
  searchQuery,
  onSearchChange,
}: {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  files: LearningFile[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-3 shadow-2xs space-y-3" dir="rtl">
      {/* Search Input Row */}
      <div className="relative">
        <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ابحث باسم الملزمة أو الملف..."
          className="h-9 w-full rounded-xl border border-slate-200/80 dark:border-[#1E2E48] bg-slate-50/70 dark:bg-[#0D1726] pr-10 pl-3 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-[#070D18] focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" dir="rtl">
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedCategory === "all"
              ? "bg-blue-600 text-white shadow-2xs"
              : "bg-slate-50 dark:bg-[#0D1726] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#122034] border border-slate-200/80 dark:border-[#1E2E48]"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>كل الكورسات</span>
          <span className="text-[10px] opacity-80 font-mono font-semibold">({files.length})</span>
        </button>

        {categories.map((courseName) => {
          const count = files.filter((f) => (f.category || "كورس عام") === courseName).length;
          const isSelected = selectedCategory === courseName;
          return (
            <button
              key={courseName}
              type="button"
              onClick={() => onSelectCategory(courseName)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer text-right shrink-0 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-50 dark:bg-[#0D1726] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#122034] border border-slate-200/80 dark:border-[#1E2E48]"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span>{courseName}</span>
              <span className="text-[10px] opacity-80 font-mono font-semibold">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 3. Rebuilt File Card Component (Vercel Precision Style)
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
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 shadow-2xs hover:border-blue-500/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 w-full overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-500/20 before:to-transparent hover:before:via-blue-500/50" dir="rtl">
      <div className="space-y-3">
        {/* Top Header Area: File Icon + Title + Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${typeDetails.bgClass} group-hover:scale-105 transition-transform duration-200 shadow-2xs`}>
              <IconComponent className={`h-5 w-5 ${typeDetails.iconColorClass}`} />
            </span>

            <div className="min-w-0 space-y-0.5 flex-1">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {file.title}
              </h3>
              <p
                dir="ltr"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate text-right font-mono"
              >
                {file.originalName}
              </p>
            </div>
          </div>

          <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold border shrink-0 ${typeDetails.bgClass} shadow-2xs`}>
            {typeDetails.badgeText}
          </span>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/80 my-2" />

        {/* Metadata Row: Course on Right, File Size on Left */}
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/40 px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400 text-right truncate max-w-[70%]"
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">{courseTitle}</span>
          </span>

          <span
            className="text-xs font-bold font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0"
          >
            {fileSizeMb} MB
          </span>
        </div>
      </div>

      {/* Action Area: High-Contrast Button & Preview */}
      <div className="pt-3 mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPreview(file)}
          className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
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
    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-10 text-center space-y-3" dir="rtl">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-2xs">
        <FolderOpen className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        {hasCategoryFilter ? "لا توجد ملفات تطابق الفلتر أو البحث" : "لا توجد ملفات مرفوعة حالياً"}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<LearningFile | null>(null);

  const categories = useMemo(() => Array.from(new Set(files.map((file) => file.category || "كورس عام"))), [files]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesCategory = selectedCategory === "all" || (file.category || "كورس عام") === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        (file.title || "").toLowerCase().includes(q) ||
        (file.originalName || "").toLowerCase().includes(q) ||
        (file.category || "").toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [files, selectedCategory, searchQuery]);

  return (
    <section className="space-y-4 text-right max-w-[1400px] w-full" dir="rtl">
      {/* 1. Header */}
      <FilesPageHeader totalCount={files.length} />

      {/* 2. Course Filters & Search Bar */}
      <CourseFilterTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        files={files}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 3. Responsive 3-Column Grid */}
      {filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-start gap-4 sm:gap-5 w-full items-stretch" dir="rtl">
          {filteredFiles.map((file) => (
            <FileCard key={file.id} file={file} onPreview={setPreviewFile} />
          ))}
        </div>
      ) : (
        <EmptyFilesState hasCategoryFilter={selectedCategory !== "all" || searchQuery.length > 0} />
      )}

      {/* 4. Fullscreen-Optimized Preview Modal */}
      <FilePreviewModal file={previewFile as any} onClose={() => setPreviewFile(null)} />
    </section>
  );
}
