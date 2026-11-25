import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { Request, Response } from "express";
import multer from "multer";

export const MAX_AVATAR_BYTES = 25 * 1024 * 1024; // 25 MB to accommodate raw iPhone/Android camera files

const ALLOWED_AVATAR_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".jfif",
  ".webp",
  ".heic",
  ".heif",
  ".avif",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".dng",
  ".ico",
]);

export type DetectedImageFormat =
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "avif"
  | "heic"
  | "bmp"
  | "tiff"
  | "unknown";

const avatarMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES },
  fileFilter: (_req, file, callback) => {
    const mime = (file.mimetype || "").toLowerCase().trim();
    const ext = path.extname(file.originalname || "").toLowerCase().trim();
    const validMime =
      !mime ||
      mime.startsWith("image/") ||
      mime.includes("octet-stream");
    const validExt = !ext || ALLOWED_AVATAR_EXTENSIONS.has(ext);
    if (!validMime && !validExt) {
      return callback(new Error("صيغة الملف غير مدعومة — اختار صورة صالحة"));
    }
    callback(null, true);
  },
}).single("avatar");

/** Runs Multer avatar upload and emits clean 400/413 JSON responses on errors. */
export function runAvatarUploadMiddleware(req: Request, res: Response): Promise<boolean> {
  return new Promise((resolve) => {
    avatarMulter(req, res, (err: any) => {
      if (!err) {
        resolve(true);
        return;
      }
      if (err?.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          error: "حجم الصورة كبير جداً (الحد الأقصى 25 ميجابايت). اختر صورة أصغر.",
        });
        resolve(false);
        return;
      }
      res.status(400).json({
        error: err?.message || "تعذر استقبال ملف الصورة",
      });
      resolve(false);
    });
  });
}

/** Detects true image format by magic header bytes (not trusting client MIME/extension). */
export function detectImageMagicFormat(buf: Buffer): DetectedImageFormat {
  if (!buf || buf.length < 12) return "unknown";
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "png";
  }
  // GIF: GIF8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return "gif";
  }
  // BMP: BM
  if (buf[0] === 0x42 && buf[1] === 0x4d) {
    return "bmp";
  }
  // TIFF: II*\0 or MM\0*
  if (
    (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) ||
    (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a)
  ) {
    return "tiff";
  }
  // WebP: RIFF....WEBP
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  // ISO BMFF (HEIC / HEIF / AVIF): ....ftyp<brand>
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12).toLowerCase();
    if (brand === "avif" || brand === "avis") return "avif";
    if (
      ["heic", "heix", "hevc", "hevx", "heif", "heis", "hevs", "mif1", "mif2", "msf1", "msf2"].includes(
        brand,
      )
    ) {
      return "heic";
    }
  }
  return "unknown";
}

function transcodeToJpegViaTools(
  inputBuffer: Buffer,
  hintExt: string,
  studentId: number,
  preferHeifFirst: boolean,
): Buffer | null {
  const stamp = `${studentId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tmpIn = path.join(os.tmpdir(), `avatar-in-${stamp}${hintExt || ".bin"}`);
  const tmpOut = path.join(os.tmpdir(), `avatar-out-${stamp}.jpg`);

  try {
    fs.writeFileSync(tmpIn, inputBuffer);

    if (preferHeifFirst) {
      try {
        execFileSync("heif-convert", ["-q", "88", tmpIn, tmpOut], {
          timeout: 15000,
          stdio: "ignore",
        });
        if (fs.existsSync(tmpOut)) {
          const converted = fs.readFileSync(tmpOut);
          if (detectImageMagicFormat(converted) === "jpeg") {
            return converted;
          }
        }
      } catch {
        // Fall through to ffmpeg
      }
    }

    try {
      execFileSync(
        "ffmpeg",
        [
          "-y",
          "-loglevel",
          "error",
          "-i",
          tmpIn,
          "-frames:v",
          "1",
          "-vf",
          "scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
          "-q:v",
          "3",
          tmpOut,
        ],
        { timeout: 15000, stdio: "ignore" },
      );
      if (fs.existsSync(tmpOut)) {
        const converted = fs.readFileSync(tmpOut);
        if (detectImageMagicFormat(converted) === "jpeg") {
          return converted;
        }
      }
    } catch {
      return null;
    }

    return null;
  } finally {
    try {
      if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
    } catch {}
    try {
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    } catch {}
  }
}

/**
 * Validates, converts non-universal formats (HEIC/HEIF/BMP/TIFF/oversized images)
 * into clean JPEG, saves under `public/uploads/avatars`, and returns the public `/uploads/...` URL.
 */
export function processAndSaveStudentAvatar(
  rawBuffer: Buffer,
  originalName: string,
  studentId: number,
): { ok: true; avatarUrl: string } | { ok: false; error: string } {
  const magic = detectImageMagicFormat(rawBuffer);
  const directBrowserFormats: Record<string, string> = {
    jpeg: ".jpg",
    png: ".png",
    webp: ".webp",
    gif: ".gif",
    avif: ".avif",
  };

  let finalBuffer = rawBuffer;
  let extension = directBrowserFormats[magic] || ".jpg";

  if (magic === "heic") {
    const converted = transcodeToJpegViaTools(rawBuffer, ".heic", studentId, true);
    if (!converted) {
      return {
        ok: false,
        error: "صيغة الصورة (HEIC) غير مدعومة حالياً — اختر صورة JPG أو PNG أو التقط صورة مباشرة بالكاميرا",
      };
    }
    finalBuffer = converted;
    extension = ".jpg";
  } else if (magic === "bmp" || magic === "tiff" || magic === "unknown") {
    const hintExt = path.extname(originalName || "").toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
    const converted = transcodeToJpegViaTools(rawBuffer, hintExt, studentId, false);
    if (!converted) {
      return {
        ok: false,
        error: "الملف المرفوع ليس صورة صالحة (استخدم JPG أو PNG أو WebP أو HEIC)",
      };
    }
    finalBuffer = converted;
    extension = ".jpg";
  } else if (rawBuffer.length > 600 * 1024 && magic !== "gif") {
    // Downscale oversized raw camera uploads (>600 KB) to crisp <=1080px JPEG so galleries & honor wall load fast
    const resized = transcodeToJpegViaTools(rawBuffer, extension, studentId, false);
    if (resized && resized.length < rawBuffer.length) {
      finalBuffer = resized;
      extension = ".jpg";
    }
  }

  const directory = path.join(process.cwd(), "public", "uploads", "avatars");
  fs.mkdirSync(directory, { recursive: true });
  const filename = `student-${studentId}-${Date.now()}${extension}`;
  fs.writeFileSync(path.join(directory, filename), finalBuffer);
  return { ok: true, avatarUrl: `/uploads/avatars/${filename}` };
}
