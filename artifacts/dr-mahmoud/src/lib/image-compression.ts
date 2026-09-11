/**
 * Client-side image compression utility for student notebook summaries and document uploads.
 * Reduces raw mobile camera photos (8MB-20MB) down to ~350KB-600KB while preserving
 * full handwriting sharpness and legibility (up to 1920px max dimension, 0.82 JPEG quality).
 */

export async function compressImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.82
): Promise<File> {
  const isImage =
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|heic|heif|bmp|jfif)$/i.test(file.name);

  // If not an image (e.g. PDF, doc, docx, txt), return as-is
  if (!isImage) {
    return file;
  }

  // If already lightweight (< 350 KB) and not HEIC, no need to compress
  if (file.size <= 350 * 1024 && !/\.(heic|heif)$/i.test(file.name)) {
    return file;
  }

  try {
    let source: ImageBitmap | HTMLImageElement | null = null;
    let width = 0;
    let height = 0;

    // Try createImageBitmap first (very fast on modern browsers)
    if (typeof createImageBitmap === "function") {
      try {
        const bmp = await createImageBitmap(file);
        source = bmp;
        width = bmp.width;
        height = bmp.height;
      } catch {
        // Fallback to HTMLImageElement
        source = null;
      }
    }

    // Fallback to HTMLImageElement via Object URL
    if (!source) {
      const img = await loadImageElement(file);
      source = img;
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
    }

    if (!width || !height) {
      return file; // If dimensions cannot be read, fallback to original
    }

    // Calculate proportional dimensions up to maxDimension
    let targetWidth = width;
    let targetHeight = height;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        targetWidth = maxDimension;
        targetHeight = Math.round((height * maxDimension) / width);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((width * maxDimension) / height);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // Solid white background for paper/notebook readability and PNG transparency handling
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(source as any, 0, 0, targetWidth, targetHeight);

    // Clean up ImageBitmap if applicable
    if ("close" in source && typeof (source as any).close === "function") {
      (source as any).close();
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });

    if (!blob || blob.size >= file.size) {
      // If compressed version is somehow larger or failed, return original
      return file;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Image compression skipped, using original file:", err);
    return file;
  }
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Batch compress multiple files with optional progress callback
 */
export async function compressMultipleFiles(
  files: File[],
  onProgress?: (index: number, total: number) => void
): Promise<File[]> {
  const results: File[] = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const compressed = await compressImageFile(files[i]);
    results.push(compressed);
  }
  return results;
}
