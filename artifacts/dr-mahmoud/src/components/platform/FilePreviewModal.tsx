import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  Maximize2,
  FileCheck,
} from "lucide-react";
import type { LearningFile } from "../../types/learning";

interface FilePreviewModalProps {
  file: LearningFile | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // Reset zoom on file change
  useEffect(() => {
    setZoom(1);
    setIsIframeLoaded(false);
  }, [file?.id]);

  // Handle ESC key to close
  useEffect(() => {
    if (!file) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [file, onClose]);

  if (!file) return null;

  const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
  const rawPreviewUrl = `/api/learning/files/${file.id}/preview${deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ""}`;
  const iframePreviewUrl = `${rawPreviewUrl}#toolbar=0&navpanes=0&scrollbar=1`;

  const isImage = file.mimeType?.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf" || file.mimeType?.startsWith("text/");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 md:p-6"
        role="dialog"
        aria-modal="true"
        aria-label={`معاينة ${file.title}`}
      >
        <motion.section
          initial={{ scale: 0.98, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.98, y: 12 }}
          className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-slate-950 text-slate-100 sm:h-[94vh] sm:rounded-2xl sm:border sm:border-slate-800 sm:shadow-2xl"
        >
          {/* ── 1. Header Bar ── */}
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2.5 sm:px-5 sm:py-3.5 backdrop-blur-sm">
            {/* Title and metadata */}
            <div className="min-w-0 flex-1 text-right" dir="rtl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-blue-400">
                  {isPdf ? "مستند PDF" : isImage ? "صورة / ورقة" : "ملف مرفق"}
                </span>
                <strong className="block truncate text-sm sm:text-base font-black text-white">
                  {file.title}
                </strong>
              </div>
              <span
                dir="ltr"
                className="mt-0.5 block truncate text-[11px] text-slate-400 text-right"
                style={{ unicodeBidi: "isolate" }}
              >
                {file.originalName}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" dir="ltr">
              {/* Image Zoom Controls */}
              {isImage && (
                <div className="flex items-center gap-1 rounded-xl bg-slate-800 border border-slate-700/60 p-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                    disabled={zoom <= 0.5}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition"
                    title="تصغير"
                    aria-label="تصغير"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="px-2 text-xs font-mono font-bold text-blue-400 hover:text-blue-300"
                    title="إعادة ضبط الحجم"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                    disabled={zoom >= 3}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 transition"
                    title="تكبير"
                    aria-label="تكبير"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Open in full separate window/tab */}
              <a
                href={rawPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 text-xs font-bold text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition active:scale-95"
                title="فتح في نافذة كاملة مستقلة"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">نافذة كاملة</span>
              </a>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40 transition active:scale-95"
                aria-label="إغلاق المعاينة"
                title="إغلاق (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* ── 2. Viewer Content Area ── */}
          <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-950 flex items-center justify-center">
            {isImage ? (
              <div className="h-full w-full overflow-auto p-2 sm:p-4 flex items-center justify-center">
                <div
                  className="transition-transform duration-150 ease-out origin-center select-none"
                  style={{ transform: `scale(${zoom})` }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <img
                    src={rawPreviewUrl}
                    alt={file.title}
                    className="max-h-[85vh] sm:max-h-[82vh] max-w-full rounded-lg shadow-2xl object-contain"
                  />
                </div>
              </div>
            ) : isPdf ? (
              <div className="relative h-full w-full bg-white dark:bg-[#0E1726]">
                <iframe
                  src={iframePreviewUrl}
                  title={file.title}
                  onLoad={() => setIsIframeLoaded(true)}
                  className="h-full w-full border-0"
                  style={{ WebkitOverflowScrolling: "touch" }}
                />
              </div>
            ) : (
              <div className="grid h-full place-items-center p-8 text-center" dir="rtl">
                <div className="max-w-md space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
                  <FileText className="mx-auto h-12 w-12 text-blue-500" />
                  <strong className="block text-base font-black text-white">
                    نوع الملف غير مدعوم للمعاينة المباشرة
                  </strong>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    يرجى استخدام ملف بصيغة PDF أو صورة لمعاينتها داخل المنصة بأمان.
                  </p>
                  <a
                    href={rawPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
                  >
                    <ExternalLink className="h-4 w-4" />
                    محاولة الفتح في نافذة جديدة
                  </a>
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
