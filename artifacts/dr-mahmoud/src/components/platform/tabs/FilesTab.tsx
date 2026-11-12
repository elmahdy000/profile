import { useState, useMemo, useEffect } from "react";
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
  Map as MapIcon,
  Maximize2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import type { LearningFile } from "@/types/platform";
import { FilePreviewModal } from "../FilePreviewModal";
import { studentApi } from "@/components/kholasa/kholasa-api";
import { ProtectedKholasaImage } from "@/components/kholasa/ProtectedKholasaImage";
import { BidiStatement } from "@/components/kholasa/BidiStatement";
import type { KholasaMaterial } from "@/components/kholasa/types";

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
        اطّلع وعاين المذكرات والملازم وخرائط الوحدات المخصصة لمرحلتك الدراسية داخل المنصة.
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
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-card dark:bg-[#0A101D] p-5 shadow-2xs hover:border-blue-500/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 w-full overflow-hidden" dir="rtl">
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

function resolveFileUnitGroup(file: LearningFile): { key: string; title: string; order: number } {
  const txt = `${file.title || ""} ${file.originalName || ""} ${file.category || ""}`.toLowerCase();
  const isLang = /لغات|languages|unit\s*\d|lesson\s*\d/i.test(txt);

  if (/الكتب المدرسية|الكتاب المدرسي|التقييمات|assessments|part1/i.test(txt)) {
    return { key: "books", title: "الكتب المدرسية وملازم التقييمات", order: 5 };
  }
  if (/الوحدة\s*(?:الرابعة|الرابعه|4)|\bunit\s*4\b|lesson\s*4[-_.:\s]|درس\s*4[-_.:\s]|\b4-[1-4]\b/i.test(txt)) {
    return {
      key: "unit-4",
      title: isLang ? "الوحدة الرابعة: تصميم الويب والوسائط (Unit 4)" : "الوحدة الرابعة: تصميم الويب والوسائط",
      order: 4,
    };
  }
  if (/الوحدة\s*(?:الثالثة|التالتة|3)|\bunit\s*3\b|lesson\s*3[-_.:\s]|درس\s*3[-_.:\s]|\b3-[1-4]\b/i.test(txt)) {
    return {
      key: "unit-3",
      title: isLang ? "الوحدة الثالثة: تطبيقات الويب (Unit 3)" : "الوحدة الثالثة: تطبيقات الويب",
      order: 3,
    };
  }
  if (/الوحدة\s*(?:الثانية|التانية|2)|\bunit\s*2\b|lesson\s*2[-_.:\s]|درس\s*2[-_.:\s]|\b2-[1-4]\b/i.test(txt)) {
    return {
      key: "unit-2",
      title: isLang ? "الوحدة الثانية: الأمن السيبراني والتشفير (Unit 2)" : "الوحدة الثانية: الأمن السيبراني والتشفير",
      order: 2,
    };
  }
  if (/الوحدة\s*(?:الأولى|الاولى|1)|\bunit\s*1\b|lesson\s*1[-_.:\s]|درس\s*1[-_.:\s]|\b1-[1-4]\b/i.test(txt)) {
    return {
      key: "unit-1",
      title: isLang ? "الوحدة الأولى: الذكاء الاصطناعي (Unit 1)" : "الوحدة الأولى: الذكاء الاصطناعي والمجتمع",
      order: 1,
    };
  }
  const cat = file.category || "ملفات وملازم عامة";
  return { key: `cat-${cat}`, title: cat, order: 99 };
}

function resolveMaterialUnitOrder(unitName: string): number {
  const s = (unitName || "").toLowerCase();
  if (/الأولى|الاولى|unit\s*1/i.test(s)) return 1;
  if (/الثانية|التانية|unit\s*2/i.test(s)) return 2;
  if (/الثالثة|التالتة|unit\s*3/i.test(s)) return 3;
  if (/الرابعة|الرابعه|unit\s*4/i.test(s)) return 4;
  return 50;
}

// ── Main FilesTab Component ──
export function FilesTab({ files }: { files: LearningFile[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<LearningFile | null>(null);
  const [kholasaMaterials, setKholasaMaterials] = useState<KholasaMaterial[]>([]);
  const [activeSheetLightbox, setActiveSheetLightbox] = useState<{
    title: string;
    images: string[];
    index: number;
  } | null>(null);

  useEffect(() => {
    studentApi<{ materials: KholasaMaterial[] }>("/api/learning/kholasa/materials")
      .then((res) => {
        if (Array.isArray(res?.materials)) setKholasaMaterials(res.materials);
      })
      .catch(() => undefined);
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(files.map((file) => file.category || "كورس عام"))),
    [files],
  );

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesCategory = selectedCategory === "all" || (file.category || "كورس عام") === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (file.title || "").toLowerCase().includes(q) ||
        (file.originalName || "").toLowerCase().includes(q) ||
        (file.category || "").toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [files, selectedCategory, searchQuery]);

  const groupedSections = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        title: string;
        order: number;
        pdfFiles: LearningFile[];
        kholasaLessons: KholasaMaterial[];
      }
    >();

    for (const file of filteredFiles) {
      const grp = resolveFileUnitGroup(file);
      const existing = map.get(grp.key);
      if (existing) {
        existing.pdfFiles.push(file);
      } else {
        map.set(grp.key, {
          key: grp.key,
          title: grp.title,
          order: grp.order,
          pdfFiles: [file],
          kholasaLessons: [],
        });
      }
    }

    const q = searchQuery.trim().toLowerCase();
    for (const mat of kholasaMaterials) {
      if (!Array.isArray(mat.mindmapImages) || mat.mindmapImages.length === 0) continue;
      if (
        q &&
        !mat.lesson.toLowerCase().includes(q) &&
        !mat.unit.toLowerCase().includes(q)
      ) {
        continue;
      }
      const uOrder = resolveMaterialUnitOrder(mat.unit);
      const unitKey = uOrder <= 4 ? `unit-${uOrder}` : `mat-${mat.unit}`;
      const existing = map.get(unitKey);
      if (existing) {
        existing.kholasaLessons.push(mat);
      } else {
        map.set(unitKey, {
          key: unitKey,
          title: mat.unit,
          order: uOrder,
          pdfFiles: [],
          kholasaLessons: [mat],
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [filteredFiles, kholasaMaterials, searchQuery]);

  const totalDisplayCount = files.length + kholasaMaterials.filter((m) => (m.mindmapImages?.length || 0) > 0).length;

  return (
    <section className="space-y-4 text-right max-w-[1400px] w-full" dir="rtl">
      {/* 1. Header */}
      <FilesPageHeader totalCount={totalDisplayCount} />

      {/* 2. Course Filters & Search Bar */}
      <CourseFilterTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        files={files}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 3. Unit-Grouped Sections (PDF Files + Kholasa Unit Mindmap Sheets under Unit Heading) */}
      {groupedSections.length > 0 ? (
        <div className="space-y-5">
          {groupedSections.map((sec, sIdx) => (
            <motion.div
              key={sec.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: sIdx * 0.04 }}
              className="rounded-2xl border border-slate-200/80 dark:border-[#1E2E48] bg-slate-50/70 dark:bg-[#0B1322] p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-[#1E2E48] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <FolderOpen className="h-4 w-4" />
                  </span>
                  <h2 dir="auto" className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {sec.title}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  {sec.pdfFiles.length > 0 && (
                    <span className="rounded-full bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-[#26364D] px-2.5 py-0.5 text-slate-600 dark:text-slate-300">
                      {sec.pdfFiles.length} ملزمة PDF
                    </span>
                  )}
                  {sec.kholasaLessons.length > 0 && (
                    <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-indigo-600 dark:text-indigo-300">
                      {sec.kholasaLessons.length} ملف خرائط وحدة
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {sec.pdfFiles.map((file) => (
                  <FileCard key={`pdf-${file.id}`} file={file} onPreview={setPreviewFile} />
                ))}

                {sec.kholasaLessons.map((mat) => (
                  <article
                    key={`kholasa-${mat.id}`}
                    className="group relative flex flex-col justify-between rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 bg-card dark:bg-[#0A101D] p-5 shadow-2xs hover:border-indigo-500/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 w-full overflow-hidden"
                    dir="rtl"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                            <MapIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 space-y-0.5 flex-1">
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              <BidiStatement text={mat.lesson} />
                            </h3>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                              خرائط وشيتات الخلاصة ({mat.mindmapImages.length} لوحات)
                            </p>
                          </div>
                        </div>
                        <span className="rounded-md px-2 py-0.5 text-[10px] font-extrabold border shrink-0 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                          الخلاصة
                        </span>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800/80 my-2" />

                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-900/40 px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-400 truncate max-w-[75%]">
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{mat.unit}</span>
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                          {mat.mindmapImages.length} لوحة
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveSheetLightbox({
                            title: mat.lesson,
                            images: mat.mindmapImages,
                            index: 0,
                          })
                        }
                        className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                      >
                        <Maximize2 className="h-4 w-4" />
                        <span>معاينة شيت وخرائط الدرس</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyFilesState hasCategoryFilter={selectedCategory !== "all" || searchQuery.length > 0} />
      )}

      {/* 4. Fullscreen-Optimized Preview Modal for PDFs */}
      <FilePreviewModal file={previewFile as any} onClose={() => setPreviewFile(null)} />

      {/* 5. Protected Lightbox Preview for Kholasa Unit Mindmap Sheets (No Download) */}
      {activeSheetLightbox && (
        <div
          className="fixed inset-0 z-[130] bg-black/92 backdrop-blur-md flex flex-col select-none"
          dir="rtl"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-white">
            <div className="min-w-0">
              <h3 className="text-sm font-black truncate">
                <BidiStatement text={activeSheetLightbox.title} />
              </h3>
              <span className="text-[11px] text-slate-300">
                لوحة {activeSheetLightbox.index + 1} من {activeSheetLightbox.images.length} — معاينة محمية داخل المنصة
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSheetLightbox(null)}
              className="h-9 w-9 rounded-xl border border-white/15 bg-white/10 hover:bg-red-500/25 flex items-center justify-center cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 flex flex-col items-center gap-4">
            {activeSheetLightbox.images.map((img, idx) => (
              <div key={`${img}-${idx}`} className="w-full max-w-4xl space-y-1.5">
                <span className="inline-block rounded-md bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-slate-200">
                  لوحة {idx + 1}
                </span>
                <ProtectedKholasaImage
                  src={img}
                  alt={`لوحة ${idx + 1}`}
                  className="w-full h-auto rounded-2xl border border-white/10 shadow-xl"
                />
              </div>
            ))}
          </div>
          {activeSheetLightbox.images.length > 1 && (
            <div className="flex items-center justify-center gap-3 px-4 py-2.5 border-t border-white/10 text-xs text-slate-300">
              <ChevronRight className="h-4 w-4" />
              <span>مرر للأسفل لمشاهدة جميع اللوحات بالتسلسل</span>
              <ChevronLeft className="h-4 w-4" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
