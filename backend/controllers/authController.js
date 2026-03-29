/**
 * Authentication Controller
 * Handles signup, login, OTP verification, token refresh
 */
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { sendOTPEmail } from '../services/emailService.js';
import { AppError } from '../middleware/errorHandler.js';

// ─── Generate JWT ──────────────────────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const normalizePhone = (value = '') => value.replace(/[^\d+]/g, '').trim();
const OTP_SELECT = '+otp.code +otp.expiresAt +otp.verified';

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password, displayName, phone } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = normalizePhone(phone);

    // Check if user already exists
    const duplicateChecks = [{ email: normalizedEmail }, { username }];
    if (normalizedPhone) duplicateChecks.push({ phone: normalizedPhone });
    const existingUser = await User.findOne({ $or: duplicateChecks });
    if (existingUser) {
      return next(new AppError(
        existingUser.email === normalizedEmail
          ? 'Email already registered'
          : existingUser.phone === normalizedPhone && normalizedPhone
            ? 'Phone number already registered'
            : 'Username already taken',
        400
      ));
    }

    // Create user
    const user = await User.create({
      username,
      email: normalizedEmail,
      password,
      displayName: displayName || username,
      ...(normalizedPhone ? { phone: normalizedPhone } : {}),
    });

    // Generate and send OTP
    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    // Send OTP via email
    await sendOTPEmail(email, otp, username);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email with the OTP sent.',
      userId: user._id,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export const verifyOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId).select(OTP_SELECT);
    if (!user) return next(new AppError('User not found', 404));

    if (!user.verifyOTP(String(otp || '').trim())) {
      return next(new AppError('Invalid or expired OTP', 400));
    }

    // Mark as verified
    user.isVerified = true;
    user.otp.verified = true;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully!',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        displayName: user.displayName,
        avatar: user.avatar,
        about: user.about,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Resend OTP ───────────────────────────────────────────────────────────────
export const resendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId).select(OTP_SELECT);
    if (!user) return next(new AppError('User not found', 404));
    if (user.isVerified) return next(new AppError('Account already verified', 400));

    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail(user.email, otp, user.username);

    res.json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, phone, identifier, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    const normalizedPhone = normalizePhone(phone || identifier || '');
    const loginIdentifier = (identifier || email || phone || '').trim();

    const query = normalizedEmail || loginIdentifier.includes('@')
      ? { email: (normalizedEmail || loginIdentifier.toLowerCase().trim()) }
      : { phone: normalizedPhone };

    // Find user with password
    const user = await User.findOne(query).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email/phone or password', 401));
    }

    if (!user.isVerified) {
      return next(new AppError('Please verify your email first', 401));
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        displayName: user.displayName,
        avatar: user.avatar,
        about: user.about,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    // Mark user offline
    await User.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      lastSeen: new Date(),
      socketId: '',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
    }

    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });
    await sendOTPEmail(email, otp, user.username, 'password_reset');

    res.json({ success: true, message: 'OTP sent to your email', userId: user._id });
  } catch (error) {
    next(error);
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { userId, otp, newPassword } = req.body;

    const user = await User.findById(userId).select(`${OTP_SELECT} +password`);
    if (!user) return next(new AppError('User not found', 404));

    if (!user.verifyOTP(String(otp || '').trim())) {
      return next(new AppError('Invalid or expired OTP', 400));
    }

    user.password = newPassword;
    user.otp.verified = true;
    await user.save();

    const token = generateToken(user._id);
    res.json({ success: true, message: 'Password reset successful', token });
  } catch (error) {
    next(error);
  }
};
