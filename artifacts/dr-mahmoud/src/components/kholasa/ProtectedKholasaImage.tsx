import { useState, useEffect, useRef } from "react";
import { ZoomIn } from "lucide-react";
import { buildKholasaMediaUrl } from "./kholasa-api";
import { PremiumImageLightbox } from "@/components/ui/PremiumImageLightbox";

interface ProtectedKholasaImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  onImageFail?: () => void;
  disableLightbox?: boolean;
}

/**
 * Renders protected media with smooth loading shimmer, authenticated Blob fallback,
 * and an interactive full-screen zoom/pan/rotate lightbox on click.
 */
export function ProtectedKholasaImage({
  src,
  alt = "",
  className = "",
  onImageFail,
  onError,
  onClick,
  onLoad,
  disableLightbox = false,
  ...rest
}: ProtectedKholasaImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => buildKholasaMediaUrl(src));
  const [attemptedBlob, setAttemptedBlob] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const isThumbnailOrCustomClick =
    disableLightbox || Boolean(onClick) || className.includes("object-cover");

  useEffect(() => {
    setResolvedSrc(buildKholasaMediaUrl(src));
    setAttemptedBlob(false);
    setLoaded(false);
  }, [src]);

  // If browser already has the image cached, mark loaded immediately
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [resolvedSrc]);

  useEffect(() => {
    return () => {
      if (resolvedSrc.startsWith("blob:")) {
        URL.revokeObjectURL(resolvedSrc);
      }
    };
  }, [resolvedSrc]);

  const handleError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!attemptedBlob && src.includes("/api/learning/kholasa/media/")) {
      setAttemptedBlob(true);
      try {
        const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
        const token = localStorage.getItem("dr_mahmoud_student_token") || "";
        const studentCode = localStorage.getItem("dr_mahmoud_student_code") || "";
        const res = await fetch(src, {
          credentials: "include",
          headers: {
            ...(deviceId ? { "X-Device-Id": deviceId } : {}),
            ...(token ? { Authorization: `Bearer ${token}`, "X-Student-Token": token } : {}),
            ...(studentCode ? { "X-Student-Code": studentCode } : {}),
          },
        });
        if (res.ok) {
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          setResolvedSrc(objUrl);
          return;
        }
      } catch {
        // fall through to failure handler
      }
    }
    setLoaded(true);
    onImageFail?.();
    onError?.(e);
  };

  if (isThumbnailOrCustomClick) {
    return (
      <img
        loading="lazy"
        decoding="async"
        {...rest}
        ref={imgRef}
        className={className}
        draggable={false}
        onClick={onClick}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          rest.onContextMenu?.(e);
        }}
        src={resolvedSrc}
        alt={alt}
        onError={handleError}
      />
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setLightboxOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setLightboxOpen(true);
          }
        }}
        title="اضغط لتكبير الصورة وفحص التفاصيل"
        className="group relative inline-flex flex-col items-center justify-center max-w-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-100/70 dark:bg-slate-900/60 p-2 shadow-xs hover:shadow-md hover:border-blue-400/60 dark:hover:border-blue-500/50 transition-all cursor-zoom-in"
      >
        {!loaded && (
          <div className="h-44 w-64 max-w-full rounded-xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
        )}
        <img
          loading="lazy"
          decoding="async"
          {...rest}
          ref={imgRef}
          draggable={false}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            rest.onContextMenu?.(e);
          }}
          src={resolvedSrc}
          alt={alt}
          onError={handleError}
          className={`${className} transition-all duration-300 group-hover:scale-[1.015] ${
            loaded ? "opacity-100" : "opacity-0 absolute inset-0"
          }`}
        />
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-slate-950/75 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[10px] font-bold text-white shadow-md opacity-85 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="h-3 w-3 text-sky-300" />
          <span>تكبير</span>
        </span>
      </div>

      <PremiumImageLightbox
        src={lightboxOpen ? resolvedSrc : null}
        alt={alt}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
