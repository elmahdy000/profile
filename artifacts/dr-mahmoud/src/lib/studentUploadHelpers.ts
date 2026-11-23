export function getStudentAuthHeaders(includeJson = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (typeof window === "undefined") return headers;
  try {
    const token = window.localStorage.getItem("dr_mahmoud_student_token") || "";
    const studentCode = window.localStorage.getItem("dr_mahmoud_student_code") || "";
    const deviceId = window.localStorage.getItem("dr_mahmoud_device_id") || "";
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["X-Student-Token"] = token;
    }
    if (studentCode) {
      headers["X-Student-Code"] = studentCode;
    }
    if (deviceId) {
      headers["X-Device-Id"] = deviceId;
    }
  } catch {
    // Ignore storage errors
  }
  return headers;
}

/**
 * Cross-browser safe avatar cropper & compressor (works on iOS Safari, Android WebView,
 * Xiaomi/Samsung/Oppo cameras). Always outputs a compact 640x640 JPEG (~40-80 KB),
 * with safe fallback to the original file if canvas/bitmap fails.
 */
export async function prepareAvatarUploadFile(file: File): Promise<{ blob: Blob; filename: string }> {
  const drawToBlob = (
    source: CanvasImageSource,
    width: number,
    height: number
  ): Promise<Blob> => {
    const side = Math.min(width, height);
    const sx = Math.max(0, (width - side) / 2);
    const sy = Math.max(0, (height - side) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تجهيز الصورة");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 640, 640);
    ctx.drawImage(source, sx, sy, side, side, 0, 0, 640, 640);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("تعذر ضغط الصورة"))),
        "image/jpeg",
        0.86
      );
    });
  };

  // 1. Try HTMLImageElement via Object URL first (best EXIF & iOS Safari compatibility)
  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Image decode failed"));
        el.src = objectUrl;
      });
      const blob = await drawToBlob(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
      return { blob, filename: "avatar.jpg" };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // 2. Fallback to createImageBitmap if available
    try {
      if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(file);
        try {
          const blob = await drawToBlob(bitmap, bitmap.width, bitmap.height);
          return { blob, filename: "avatar.jpg" };
        } finally {
          bitmap.close();
        }
      }
    } catch {
      // 3. Final fallback: upload original file directly (backend accepts up to 10MB)
    }
  }

  return { blob: file, filename: file.name || "avatar.jpg" };
}
