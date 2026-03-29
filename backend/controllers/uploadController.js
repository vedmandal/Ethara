/**
 * Upload Controller
 * Handles file uploads via Cloudinary or local storage
 */

import fs from 'fs/promises';
import path from 'path';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { AppError } from '../middleware/errorHandler.js';

// Debug (remove later)
console.log('ENV CHECK:', {
  cloud: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY,
  secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Upload Single File ───────────────────────────────────────────────────────
export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const { file } = req;
    const ext = path.extname(file.originalname).toLowerCase();

    // ─── Determine media type ─────────────────────────────
    let mediaType = 'document';

    if (/\.(jpg|jpeg|png|gif|webp)$/.test(ext)) mediaType = 'image';
    else if (/\.(mp4|mov|avi|webm)$/.test(ext)) mediaType = 'video';
    else if (/\.(ogg|webm)$/.test(ext) && file.mimetype.startsWith('audio'))
      mediaType = 'voice';
    else if (/\.(mp3|wav|ogg|webm)$/.test(ext)) mediaType = 'audio';

    let fileUrl;

    // ─── Upload Logic ────────────────────────────────────
    if (isCloudinaryConfigured) {
      const resourceType =
        mediaType === 'image'
          ? 'image'
          : mediaType === 'video' ||
            mediaType === 'audio' ||
            mediaType === 'voice'
          ? 'video'
          : 'raw';

      try {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: resourceType,
          folder: `pulse-chat/${mediaType}s`,
          quality: 'auto',
          fetch_format: 'auto',
        });

        fileUrl = result.secure_url;
      } catch (err) {
        console.error('Cloudinary upload failed:', err.message);

        // fallback to local storage
        fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
      }
    } else {
      // Local storage fallback
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    }

    // ─── Response ────────────────────────────────────────
    res.json({
      success: true,
      url: fileUrl,
      type: mediaType,
      name: file.originalname,
      size: file.size,
    });
  } catch (error) {
    console.error('UPLOAD ERROR:', error);
    next(error);
  } finally {
    // ─── Cleanup temp file ───────────────────────────────
    if (isCloudinaryConfigured && req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('File cleanup error:', err.message);
      }
    }
  }
};

// ─── Upload Avatar ────────────────────────────────────────────
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const { file } = req;
    let avatarUrl;

    if (isCloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'pulse-chat/avatars',
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
          ],
        });

        avatarUrl = result.secure_url;
      } catch (err) {
        console.error('Avatar upload failed:', err.message);

        avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
      }
    } else {
      avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    }

    res.json({
      success: true,
      url: avatarUrl,
    });
  } catch (error) {
    console.error('AVATAR UPLOAD ERROR:', error);
    next(error);
  } finally {
    if (isCloudinaryConfigured && req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('File cleanup error:', err.message);
      }
    }
  }
};