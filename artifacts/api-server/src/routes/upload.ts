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

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for images
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
}).single("image");

const audioUpload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB limit for audio
  fileFilter: (req, file, cb) => {
    // Allow various audio formats
    const isAudioMime = file.mimetype.startsWith("audio/");
    const isAudioExt = /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.originalname);
    if (isAudioMime || isAudioExt) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed (.mp3, .wav, .m4a, .ogg, .aac, .flac)"));
    }
  },
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
