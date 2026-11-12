import { useState, useEffect } from "react";
import { buildKholasaMediaUrl } from "./kholasa-api";

interface ProtectedKholasaImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  onImageFail?: () => void;
}

/**
 * Renders protected media normally (via cookie + deviceId query param) and
 * seamlessly falls back once to header-authenticated fetch -> Blob URL if a
 * browser restricts third-party/session cookies on <img> tags.
 */
export function ProtectedKholasaImage({
  src,
  alt = "",
  onImageFail,
  onError,
  ...rest
}: ProtectedKholasaImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => buildKholasaMediaUrl(src));
  const [attemptedBlob, setAttemptedBlob] = useState(false);

  useEffect(() => {
    setResolvedSrc(buildKholasaMediaUrl(src));
    setAttemptedBlob(false);
  }, [src]);

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
    onImageFail?.();
    onError?.(e);
  };

  return <img {...rest} src={resolvedSrc} alt={alt} onError={handleError} />;
}

