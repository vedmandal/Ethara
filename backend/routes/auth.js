/**
 * Auth Routes
 */
import express from 'express';
import { body } from 'express-validator';
import {
  register,
  verifyOTP,
  resendOTP,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').isEmail().normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+?[0-9]{7,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('password').isLength({ min: 6 }),
];

const loginValidation = [
  body('identifier').trim().notEmpty().withMessage('Email or phone is required'),
  body('password').notEmpty(),
];

router.post('/register', authRateLimiter, registerValidation, register);
router.post('/verify-otp', authRateLimiter, verifyOTP);
router.post('/resend-otp', authRateLimiter, resendOTP);
router.post('/login', authRateLimiter, loginValidation, login);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
