import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAdmin } from "../middleware/auth";

const router = Router();
const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024; // 5 GiB — kept in sync with nginx.

// Ensure upload directory exists in public/uploads at workspace root
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Whitelist of allowed extensions per upload type, mapped to their canonical
// safe MIME type. We derive the STORED extension from this map (never from the
// client-supplied filename), so a disguised .html/.svg/.js file can't be saved
// and later served as executable content (stored-XSS).
const IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const AUDIO_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
};

const VIDEO_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
};

function makeStorage(allowed: Record<string, string>) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      // Use the canonical extension for the validated MIME type rather than
      // trusting the original filename's extension.
      const ext =
        Object.entries(allowed).find(
          ([, mime]) => mime === file.mimetype,
        )?.[0] ?? path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    },
  });
}

function makeFileFilter(
  allowed: Record<string, string>,
  label: string,
): multer.Options["fileFilter"] {
  const validExts = Object.keys(allowed);
  const validMimes = new Set(Object.values(allowed));
  return (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Require BOTH a whitelisted extension AND a matching whitelisted MIME.
    if (validExts.includes(ext) && validMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${label} are allowed (${validExts.join(", ")})`));
    }
  };
}

const imageUpload = multer({
  storage: makeStorage(IMAGE_TYPES),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for images
  fileFilter: makeFileFilter(IMAGE_TYPES, "images"),
}).single("image");

const audioUpload = multer({
  storage: makeStorage(AUDIO_TYPES),
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB limit for audio
  fileFilter: makeFileFilter(AUDIO_TYPES, "audio files"),
}).single("audio");

const videoUpload = multer({
  storage: makeStorage(VIDEO_TYPES),
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: makeFileFilter(VIDEO_TYPES, "video files"),
}).single("video");

// Image upload route
router.post("/upload", requireAdmin, imageUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// Audio upload route
import { spawn } from "child_process";

function compressVideoInBackground(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, ext);
  const tempPath = path.join(dir, `${base}-temp${ext}`);

  try {
    const child = spawn(
      "ffmpeg",
      ["-y", "-i", filePath, "-vcodec", "libx264", "-crf", "23", "-preset", "fast", "-acodec", "copy", tempPath],
      { stdio: "ignore" }
    );

    child.on("close", (code) => {
      if (code === 0 && fs.existsSync(tempPath)) {
        try {
          const origSize = fs.statSync(filePath).size;
          const compSize = fs.statSync(tempPath).size;
          if (compSize < origSize && compSize > 0) {
            fs.renameSync(tempPath, filePath);
          } else {
            fs.unlinkSync(tempPath);
          }
        } catch (e) {
          console.error(`[Video Compression Cleanup Error]:`, e);
        }
      } else {
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch (e) {}
        }
      }
    });

    child.on("error", (err) => {
      console.warn(`[Video Compression Error]: ffmpeg failed or not found:`, err.message);
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (e) {}
      }
    });
  } catch (e) {
    console.warn(`[Video Compression Exception]:`, e);
  }
}

router.post("/upload/audio", requireAdmin, audioUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// Video upload route (Legacy single file upload)
router.post("/upload/video", requireAdmin, videoUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  // Trigger compression in the background so request completes instantly
  setTimeout(() => compressVideoInBackground(filePath), 100);

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// ── Chunked & Resumable Video Upload System (5MB Chunks) ─────────────────────
const chunksBaseDir = path.join(uploadDir, "chunks");
if (!fs.existsSync(chunksBaseDir)) {
  fs.mkdirSync(chunksBaseDir, { recursive: true });
}

// 1. Initialize Upload Session
router.post("/upload/video/init", requireAdmin, (req, res) => {
  const filename = String(req.body.filename || "video.mp4").trim();
  const fileSize = Number(req.body.fileSize || 0);
  const totalChunks = Number(req.body.totalChunks || 0);

  if (!fileSize || !totalChunks || totalChunks <= 0) {
    return res.status(400).json({ error: "Invalid file size or chunk count" });
  }

  const ext = path.extname(filename).toLowerCase() || ".mp4";
  const safeExt = Object.keys(VIDEO_TYPES).includes(ext) ? ext : ".mp4";
  const uploadId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const uploadTempDir = path.join(chunksBaseDir, uploadId);

  fs.mkdirSync(uploadTempDir, { recursive: true });

  fs.writeFileSync(
    path.join(uploadTempDir, "meta.json"),
    JSON.stringify({ filename, fileSize, totalChunks, safeExt, createdAt: Date.now() }),
  );

  return res.json({ uploadId });
});

// 2. Query Upload Status (for Resuming)
router.get("/upload/video/status/:uploadId", requireAdmin, (req, res) => {
  const { uploadId } = req.params;
  const safeUploadId = path.basename(String(uploadId || ""));
  const uploadTempDir = path.join(chunksBaseDir, safeUploadId);

  if (!fs.existsSync(uploadTempDir)) {
    return res.status(404).json({ error: "Upload session not found" });
  }

  const metaPath = path.join(uploadTempDir, "meta.json");
  let meta = { totalChunks: 0 };
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    } catch {}
  }

  const files = fs.readdirSync(uploadTempDir);
  const uploadedChunks = files
    .filter((f) => f.startsWith("chunk-"))
    .map((f) => parseInt(f.replace("chunk-", ""), 10))
    .filter((num) => !isNaN(num))
    .sort((a, b) => a - b);

  return res.json({ uploadedChunks, totalChunks: meta.totalChunks });
});

// 3. Receive Single Chunk (5MB)
const chunkStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const uploadId = path.basename(String(req.body.uploadId || ""));
    const uploadTempDir = path.join(chunksBaseDir, uploadId);
    if (!fs.existsSync(uploadTempDir)) {
      return cb(new Error("Invalid upload session"), "");
    }
    cb(null, uploadTempDir);
  },
  filename: (req, _file, cb) => {
    const chunkIndex = Number(req.body.chunkIndex ?? 0);
    cb(null, `chunk-${chunkIndex}`);
  },
});

const chunkUpload = multer({
  storage: chunkStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB upper limit per chunk
}).single("chunk");

router.post("/upload/video/chunk", requireAdmin, (req, res) => {
  req.setTimeout(3600000); // 1 hour timeout for chunk upload
  chunkUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Failed to save chunk" });
    }
    const { uploadId, chunkIndex } = req.body;
    return res.json({ success: true, uploadId, chunkIndex: Number(chunkIndex) });
  });
});

// 4. Stitch Chunks & Finish Upload
router.post("/upload/video/finish", requireAdmin, async (req, res) => {
  req.setTimeout(3600000); // 1 hour timeout for stitching
  const uploadId = path.basename(String(req.body.uploadId || ""));
  const uploadTempDir = path.join(chunksBaseDir, uploadId);

  if (!fs.existsSync(uploadTempDir)) {
    return res.status(404).json({ error: "Upload session not found" });
  }

  const metaPath = path.join(uploadTempDir, "meta.json");
  if (!fs.existsSync(metaPath)) {
    return res.status(400).json({ error: "Upload metadata missing" });
  }

  let meta: { filename: string; safeExt: string; totalChunks: number } = JSON.parse(
    fs.readFileSync(metaPath, "utf-8"),
  );

  const finalFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${meta.safeExt}`;
  const finalFilePath = path.join(uploadDir, finalFilename);

  const writeStream = fs.createWriteStream(finalFilePath);

  for (let i = 0; i < meta.totalChunks; i++) {
    const chunkPath = path.join(uploadTempDir, `chunk-${i}`);
    if (!fs.existsSync(chunkPath)) {
      writeStream.close();
      if (fs.existsSync(finalFilePath)) fs.unlinkSync(finalFilePath);
      return res.status(400).json({ error: `Missing chunk ${i}` });
    }
    await new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(chunkPath);
      readStream.on("error", reject);
      readStream.on("end", resolve);
      readStream.pipe(writeStream, { end: false });
    });
  }

  writeStream.end();

  await new Promise((resolve) => writeStream.on("finish", resolve));

  // Clean up temp directory
  try {
    fs.rmSync(uploadTempDir, { recursive: true, force: true });
  } catch (e) {
    console.error("[Chunk Cleanup Error]:", e);
  }

  // Trigger background compression
  setTimeout(() => compressVideoInBackground(finalFilePath), 100);

  const fileUrl = `/uploads/${finalFilename}`;
  return res.json({ url: fileUrl });
});

export default router;

