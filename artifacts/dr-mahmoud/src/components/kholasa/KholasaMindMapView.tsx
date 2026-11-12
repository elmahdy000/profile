import { useState, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  X,
  ChevronRight,
  ChevronLeft,
  Map as MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProtectedKholasaImage } from "./ProtectedKholasaImage";

interface KholasaMindMapViewProps {
  title?: string | null;
  images: string[];
  darkSurface?: boolean;
}

export function KholasaMindMapView({ title, images, darkSurface = false }: KholasaMindMapViewProps) {
  const validImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [imgError, setImgError] = useState(false);

  const safeIndex = Math.min(selectedIndex, Math.max(0, validImages.length - 1));

  useEffect(() => {
    setImgError(false);
    setLightboxZoom(1);
  }, [safeIndex, images]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (e.key === "ArrowLeft" && validImages.length > 1) {
        setSelectedIndex((i) => (i + 1) % validImages.length);
      } else if (e.key === "ArrowRight" && validImages.length > 1) {
        setSelectedIndex((i) => (i - 1 + validImages.length) % validImages.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, validImages.length]);

  if (validImages.length === 0) {
    return (
      <div
        dir="rtl"
        className={`rounded-2xl border p-10 text-center ${
          darkSurface ? "border-white/10 bg-white/5 text-slate-300" : "border-border bg-card text-muted-foreground"
        }`}
      >
        <MapIcon className="h-8 w-8 mx-auto mb-2 opacity-60" />
        <p className="text-sm font-bold">لا توجد خرائط ذهنية مرفوعة لهذا الدرس حالياً.</p>
      </div>
    );
  }

  const rawUrl = validImages[safeIndex];

  return (
    <div className="space-y-4 text-right select-none" dir="rtl" onContextMenu={(e) => e.preventDefault()}>
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-3 py-1 text-xs font-extrabold">
            <MapIcon className="h-3.5 w-3.5" /> الخرائط الذهنية للدرس ({validImages.length})
          </span>
          {title && (
            <h3 className={`mt-1 text-sm sm:text-base font-black ${darkSurface ? "text-white" : "text-foreground"}`}>
              {title}
            </h3>
          )}
        </div>

        <div className="hidden md:flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(2))))}
            className={`h-9 w-9 p-0 rounded-xl cursor-pointer ${darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""}`}
            title="تصغير"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className={`px-2 text-xs font-mono font-bold ${darkSurface ? "text-slate-300" : "text-muted-foreground"}`}>
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom((z) => Math.min(2.6, Number((z + 0.2).toFixed(2))))}
            className={`h-9 w-9 p-0 rounded-xl cursor-pointer ${darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""}`}
            title="تكبير"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom(1)}
            className={`h-9 w-9 p-0 rounded-xl cursor-pointer ${darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""}`}
            title="إعادة ضبط الحجم"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLightboxZoom(1);
              setLightboxOpen(true);
            }}
            className={`h-9 px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${darkSurface ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : ""}`}
          >
            <Maximize2 className="h-3.5 w-3.5" /> ملء الشاشة
          </Button>
        </div>
      </div>

      {/* Mobile View: Sequential stacked images (عرض ورا بعض بدون الحاجة للتبديل) */}
      <div className="space-y-3 md:hidden">
        {validImages.map((img, idx) => (
          <div
            key={`${img}-${idx}`}
            className={`overflow-hidden rounded-2xl border ${
              darkSurface ? "border-white/10 bg-slate-950/70" : "border-border bg-muted/20"
            }`}
          >
            <div
              className={`flex items-center justify-between px-3 py-2 border-b text-xs font-bold ${
                darkSurface ? "border-white/10 text-slate-300" : "border-border/60 text-muted-foreground"
              }`}
            >
              <span>
                لوحة {idx + 1} من {validImages.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedIndex(idx);
                  setLightboxZoom(1);
                  setLightboxOpen(true);
                }}
                className="inline-flex items-center gap-1 text-primary font-bold cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5" /> تكبير
              </button>
            </div>
            <div className="p-2">
              <ProtectedKholasaImage
                src={img}
                alt={`خريطة ذهنية ${idx + 1}`}
                onClick={() => {
                  setSelectedIndex(idx);
                  setLightboxZoom(1);
                  setLightboxOpen(true);
                }}
                className="w-full h-auto rounded-xl shadow-xs select-none cursor-zoom-in"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Viewport */}
      <div
        className={`hidden md:block relative overflow-auto rounded-2xl border p-3 ${
          darkSurface ? "border-white/10 bg-slate-950/70" : "border-border bg-muted/30"
        }`}
        style={{ maxHeight: "70vh" }}
      >
        <div className="flex justify-center min-w-full">
          {imgError ? (
            <div className="py-12 px-4 text-center space-y-2 text-xs text-muted-foreground">
              <MapIcon className="h-8 w-8 mx-auto opacity-60" />
              <p className="font-bold">تعذر تحميل صورة الخريطة الذهنية حالياً. تأكد من اتصالك وأعد المحاولة.</p>
            </div>
          ) : (
            <ProtectedKholasaImage
              src={rawUrl}
              alt={`خريطة ذهنية ${safeIndex + 1}`}
              onImageFail={() => setImgError(true)}
              onClick={() => {
                setLightboxZoom(1);
                setLightboxOpen(true);
              }}
              className="rounded-xl transition-transform duration-200 origin-top shadow-md select-none cursor-zoom-in"
              style={{ transform: `scale(${zoom})`, maxWidth: zoom <= 1 ? "100%" : "none" }}
            />
          )}
        </div>
      </div>

      {/* Desktop Thumbnails Switcher */}
      {validImages.length > 1 && (
        <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-1">
          {validImages.map((img, idx) => (
            <button
              key={img + idx}
              type="button"
              onClick={() => {
                setSelectedIndex(idx);
                setZoom(1);
              }}
              className={`relative shrink-0 h-16 w-24 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                idx === safeIndex
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent opacity-65 hover:opacity-100"
              }`}
            >
              <ProtectedKholasaImage src={img} alt={`لوحة ${idx + 1}`} className="h-full w-full object-cover" />
              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox with Zoom & Keyboard Controls */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-3 sm:p-5"
          dir="rtl"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-white pb-3" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-bold">
              خريطة ذهنية ({safeIndex + 1} / {validImages.length})
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLightboxZoom((z) => Math.max(0.6, Number((z - 0.25).toFixed(2))))}
                className="h-9 w-9 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
                title="تصغير"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-1.5 text-xs font-mono font-bold text-slate-300">
                {Math.round(lightboxZoom * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLightboxZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="h-9 w-9 p-0 bg-white/10 border-white/20 text-white hover:bg-white/20"
                title="تكبير"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              {validImages.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIndex((i) => (i - 1 + validImages.length) % validImages.length)}
                    className="h-9 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <ChevronRight className="h-4 w-4" /> السابقة
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIndex((i) => (i + 1) % validImages.length)}
                    className="h-9 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    التالية <ChevronLeft className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setLightboxOpen(false)}
                className="h-9 w-9 bg-white/10 border-white/20 text-white hover:bg-rose-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            className="flex-1 overflow-auto flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <ProtectedKholasaImage
              src={rawUrl}
              alt={`خريطة ذهنية ${safeIndex + 1}`}
              className="object-contain rounded-xl transition-transform duration-200 origin-center"
              style={{
                transform: `scale(${lightboxZoom})`,
                maxHeight: lightboxZoom <= 1 ? "85vh" : "none",
                maxWidth: lightboxZoom <= 1 ? "95vw" : "none",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
