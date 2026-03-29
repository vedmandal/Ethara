/**
 * User Model
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    avatar: {
      type: String,
      default: '',
    },
    about: {
      type: String,
      default: 'Hey there! I am using Pulse Chat.',
      maxlength: [150, 'About cannot exceed 150 characters'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    // OTP verification
    otp: {
      code: { type: String, select: false },
      expiresAt: { type: Date, select: false },
      verified: { type: Boolean, default: false },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Push notification token (for future use)
    fcmToken: {
      type: String,
      default: '',
    },
    // Blocked users
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Socket ID for real-time
    socketId: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.otp;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    verified: false,
  };
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function (code) {
  if (!this.otp?.code) return false;
  if (this.otp.expiresAt < new Date()) return false;
  return this.otp.code === code;
};

export default mongoose.model('User', userSchema);
