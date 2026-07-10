import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAdmin } from "../middleware/auth";

const router = Router();

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

// Image upload route
router.post("/upload", requireAdmin, imageUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

// Audio upload route
router.post("/upload/audio", requireAdmin, audioUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({ url: fileUrl });
});

export default router;
