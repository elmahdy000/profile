import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCw, Maximize2, X, Move } from "lucide-react";

interface PremiumImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function PremiumImageLightbox({ src, alt = "معاينة الصورة", onClose }: PremiumImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => {
    if (!src) return;
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(4, +(s + 0.35).toFixed(2)));
      else if (e.key === "-") setScale((s) => Math.max(0.5, +(s - 0.35).toFixed(2)));
      else if (e.key === "0") {
        setScale(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
      } else if (e.key.toLowerCase() === "r") {
        setRotation((r) => (r + 90) % 360);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [src, onClose]);

  useEffect(() => {
    if (scale <= 1) setOffset({ x: 0, y: 0 });
  }, [scale]);

  if (typeof document === "undefined") return null;

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((s) => Math.min(4, Math.max(0.5, +(s + delta).toFixed(2))));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || scale <= 1) return;
    setOffset({
      x: dragStartRef.current.ox + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.oy + (e.clientY - dragStartRef.current.y),
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const toggleDoubleZoom = () => {
    if (scale > 1.1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setScale(2.2);
    }
  };

  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[260] flex flex-col bg-slate-950/92 backdrop-blur-xl select-none"
          onClick={onClose}
          dir="rtl"
        >
          {/* Floating Glass Toolbar */}
          <div
            className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-slate-950/60 backdrop-blur-md z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold text-slate-200 truncate max-w-[200px] sm:max-w-md">
                {alt || "معاينة الصورة"}
              </span>
              {scale > 1 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-sky-300">
                  <Move className="h-3.5 w-3.5" /> اسحب لتحريك الصورة
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5" dir="ltr">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.5, +(s - 0.35).toFixed(2)))}
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
                title="تصغير (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[52px] text-center font-mono text-xs font-black text-white bg-white/10 border border-white/10 rounded-xl py-2 px-2">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(4, +(s + 0.35).toFixed(2)))}
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
                title="تكبير (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
                title="تدوير 90° (R)"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setRotation(0);
                  setOffset({ x: 0, y: 0 });
                }}
                className="hidden sm:grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
                title="إعادة الضبط (0)"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <div className="w-px h-5 bg-white/15 mx-1" />
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 hover:bg-rose-500/35 hover:text-white transition cursor-pointer"
                title="إغلاق (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Interactive Canvas */}
          <div
            className={`flex-1 flex items-center justify-center overflow-hidden p-4 sm:p-8 ${
              scale > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
            }`}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={(e) => {
              if (scale <= 1) onClose();
              else e.stopPropagation();
            }}
          >
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.18 }}
              src={src}
              alt={alt}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onDoubleClick={(e) => {
                e.stopPropagation();
                toggleDoubleZoom();
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
                transition: dragging ? "none" : "transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              className="max-h-[82vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl ring-1 ring-white/15 bg-white/5"
            />
          </div>

          {/* Subtle Bottom Hint */}
          <div
            className="pb-3 text-center text-[11px] font-medium text-slate-400 pointer-events-none"
          >
            اضغط مرتين للتكبير السريع • عجلة الماوس للتكبير والتصغير • Esc للإغلاق
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
