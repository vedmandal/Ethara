/**
 * User Routes
 */
import express from 'express';
import {
  searchUsers,
  getUserProfile,
  updateProfile,
  changePassword,
  toggleBlockUser,
  getOnlineUsers,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All user routes require auth

router.get('/search', searchUsers);
router.get('/online', getOnlineUsers);
router.get('/:userId', getUserProfile);
router.patch('/profile', updateProfile);
router.patch('/change-password', changePassword);
router.patch('/block/:userId', toggleBlockUser);

export default router;
