/**
 * Cloudinary configuration for media uploads
 * Safe + production-ready
 */

import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Check full config (not just cloud name)
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

// ✅ Configure Cloudinary ONLY if fully configured
if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  console.log('☁️ Cloudinary configured');
} else {
  console.warn('⚠️ Cloudinary NOT configured — using local storage');
}

// ─── Local storage fallback ─────────────────────────────

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// ─── File filter ───────────────────────────────────────

const fileFilter = (req, file, cb) => {
  const allowedTypes =
    /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx|txt|mp3|ogg|webm/;

  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }

  cb(new Error('File type not supported'));
};

// ─── Multer setup ──────────────────────────────────────

export const upload = multer({
  storage: localStorage,
  limits: {
    fileSize:
      parseInt(process.env.MAX_FILE_SIZE, 10) || 25 * 1024 * 1024,
  },
  fileFilter,
});

// ✅ Export everything needed
export { cloudinary, isCloudinaryConfigured };