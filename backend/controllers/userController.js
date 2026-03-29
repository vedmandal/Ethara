/**
 * User Controller
 * Profile management, search, user settings
 */
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

// ─── Search Users ─────────────────────────────────────────────────────────────
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return next(new AppError('Search query must be at least 2 characters', 400));

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { displayName: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        },
      ],
      isVerified: true,
      blockedUsers: { $nin: [req.user.id] },
    })
      .select('username displayName avatar isOnline lastSeen about')
      .limit(20);

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

// ─── Get User Profile ─────────────────────────────────────────────────────────
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username displayName avatar isOnline lastSeen about');

    if (!user) return next(new AppError('User not found', 404));

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
export const updateProfile = async (req, res, next) => {
  try {
    const { displayName, about, avatar, phone } = req.body;

    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (about !== undefined) updateData.about = about;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (phone !== undefined) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return next(new AppError('User not found', 404));

    if (!(await user.comparePassword(currentPassword))) {
      return next(new AppError('Current password is incorrect', 401));
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Block/Unblock User ───────────────────────────────────────────────────────
export const toggleBlockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user.id);

    const isBlocked = user.blockedUsers.includes(userId);
    if (isBlocked) {
      user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== userId);
    } else {
      user.blockedUsers.push(userId);
    }
    await user.save();

    res.json({
      success: true,
      message: isBlocked ? 'User unblocked' : 'User blocked',
      isBlocked: !isBlocked,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Online Users ─────────────────────────────────────────────────────────
export const getOnlineUsers = async (req, res, next) => {
  try {
    const users = await User.find({
      isOnline: true,
      _id: { $ne: req.user.id },
    }).select('username displayName avatar lastSeen');

    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};
