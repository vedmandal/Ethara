/**
 * Upload Routes
 */
import express from 'express';
import { upload } from '../config/cloudinary.js';
import { uploadFile, uploadAvatar } from '../controllers/uploadController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/file', upload.single('file'), uploadFile);
router.post('/avatar', upload.single('avatar'), uploadAvatar);

export default router;
