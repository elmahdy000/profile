import { useState } from "react";
import { FileText, FolderOpen, Eye, X, BookOpen, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LearningFile } from "@/types/platform";
import { PageHeader, StatusBadge, EmptyState } from "../StudentDashboardUI";

export function FilesTab({ files }: { files: LearningFile[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<LearningFile | null>(null);

  const categories = Array.from(new Set(files.map((file) => file.category || "كورس عام")));
  const filteredFiles = selectedCategory === "all"
    ? files
    : files.filter((file) => (file.category || "كورس عام") === selectedCategory);

  return (
    <section className="space-y-6 text-right" dir="rtl">
      <PageHeader
        title="مكتبة الملفات والملازم"
        description="حمل واطلع على المذكرات والأكواد المخصصة لمرحلتك."
        action={<StatusBadge>{files.length} ملفات</StatusBadge>}
      />

      {categories.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              selectedCategory === "all"
                ? "bg-primary text-white shadow-md"
                : "bg-card text-muted-foreground hover:bg-muted border border-border"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> كل الكورسات ({files.length})
          </button>
          {categories.map((courseName) => {
            const count = files.filter((f) => (f.category || "كورس عام") === courseName).length;
            return (
              <button
                key={courseName}
                type="button"
                onClick={() => setSelectedCategory(courseName)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  selectedCategory === courseName
                    ? "bg-primary text-white shadow-md"
                    : "bg-card text-muted-foreground hover:bg-muted border border-border"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" /> {courseName} ({count})
              </button>
            );
          })}
        </div>
      )}

      {filteredFiles.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="لا توجد ملفات مرفوعة"
          description="ستظهر مذكرات وأكواد الكورسات هنا فور نشرها لحسابك."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          {filteredFiles.map((file) => {
            const courseTitle = file.category || "كورس عام";
            return (
              <article
                key={file.id}
                className="grid gap-3 border-b border-border p-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_180px_100px_auto] sm:items-center hover:bg-muted/40 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-foreground">{file.title}</h3>
                    <p className="truncate text-[13px] text-muted-foreground">{file.originalName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/25 px-2.5 py-1 text-xs font-bold text-white border border-blue-500/30">
                    <BookOpen className="h-3.5 w-3.5 text-blue-400" /> {courseTitle}
                  </span>
                </div>

                <span className="text-xs font-semibold text-muted-foreground">
                  {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB
                </span>

                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 text-xs font-bold text-primary hover:bg-primary/15 transition-colors"
                >
                  <Eye className="h-4 w-4" /> معاينة وقراءة
                </button>
              </article>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-3 sm:p-6"
            onMouseDown={(event) => { if (event.currentTarget === event.target) setPreviewFile(null); }}
          >
            <motion.section
              initial={{ scale: 0.98, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 12 }}
              role="dialog"
              aria-modal="true"
              aria-label={`معاينة ${previewFile.title}`}
              className="flex h-[min(90vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
            >
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0"><strong className="block truncate text-foreground">{previewFile.title}</strong><span className="block truncate text-xs text-muted-foreground">{previewFile.originalName}</span></div>
                <button type="button" onClick={() => setPreviewFile(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-muted transition-colors" aria-label="إغلاق المعاينة"><X className="h-5 w-5" /></button>
              </header>
              <div className="min-h-0 flex-1 bg-muted p-2 sm:p-4">
                {previewFile.mimeType?.startsWith("image/") ? (
                  <img src={`/api/learning/files/${previewFile.id}/preview`} alt={previewFile.title} className="h-full w-full object-contain select-none" onContextMenu={(e) => e.preventDefault()} />
                ) : previewFile.mimeType === "application/pdf" || previewFile.mimeType?.startsWith("text/") ? (
                  <iframe src={`/api/learning/files/${previewFile.id}/preview#toolbar=0&navpanes=0&scrollbar=1`} title={previewFile.title} className="h-full w-full rounded-xl border border-border bg-card" />
                ) : (
                  <div className="grid h-full place-items-center rounded-xl border border-border bg-card p-8 text-center"><div><FileText className="mx-auto h-12 w-12 text-primary" /><strong className="mt-4 block text-foreground">لا يمكن عرض هذا النوع داخل المتصفح</strong><p className="mt-2 text-sm text-muted-foreground">ارفع نسخة PDF من الملف لمعاينتها بأمان داخل المنصة.</p></div></div>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
