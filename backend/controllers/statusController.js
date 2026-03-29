import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import Status from '../models/Status.js';
import { AppError } from '../middleware/errorHandler.js';

const getVisibleUserIds = async (userId) => {
  const participantIds = await Chat.distinct('participants', { participants: userId });
  const allIds = new Set([String(userId), ...participantIds.map((id) => String(id))]);
  return [...allIds];
};

const buildStatusGroups = (statuses, currentUserId) => {
  const grouped = new Map();

  statuses.forEach((status) => {
    const statusObj = status.toObject();
    const ownerId = String(statusObj.user._id);

    if (!grouped.has(ownerId)) {
      grouped.set(ownerId, {
        user: statusObj.user,
        statuses: [],
        latestStatusAt: statusObj.createdAt,
        hasUnviewed: false,
      });
    }

    const group = grouped.get(ownerId);
    const viewed = statusObj.viewers.some((viewer) => String(viewer.user) === String(currentUserId));
    const normalizedStatus = {
      ...statusObj,
      viewed,
      canManage: ownerId === String(currentUserId),
      viewCount: statusObj.viewers.length,
    };

    group.statuses.push(normalizedStatus);
    if (!viewed && ownerId !== String(currentUserId)) {
      group.hasUnviewed = true;
    }
    if (new Date(statusObj.createdAt) > new Date(group.latestStatusAt)) {
      group.latestStatusAt = statusObj.createdAt;
    }
  });

  return [...grouped.values()].sort((a, b) => {
    if (String(a.user._id) === String(currentUserId)) return -1;
    if (String(b.user._id) === String(currentUserId)) return 1;
    if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
    return new Date(b.latestStatusAt) - new Date(a.latestStatusAt);
  });
};

export const getStatuses = async (req, res, next) => {
  try {
    const visibleUserIds = await getVisibleUserIds(req.user.id);
    const statuses = await Status.find({
      user: { $in: visibleUserIds },
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'username displayName avatar isOnline lastSeen')
      .sort({ createdAt: 1 });

    const groups = buildStatusGroups(statuses, req.user.id);
    res.json({ success: true, statuses: groups });
  } catch (error) {
    next(error);
  }
};

export const createStatus = async (req, res, next) => {
  try {
    const { text = '', media, background } = req.body;

    if (!text.trim() && !media?.url) {
      return next(new AppError('Status text or media is required', 400));
    }

    if (media?.url && !['image', 'video', 'document'].includes(media.type)) {
      return next(new AppError('Status media must be an image, video, or document', 400));
    }

    const status = await Status.create({
      user: req.user.id,
      text: text.trim(),
      media: media?.url ? media : undefined,
      background: background || undefined,
    });

    const populated = await Status.findById(status._id)
      .populate('user', 'username displayName avatar isOnline lastSeen');

    res.status(201).json({ success: true, status: populated });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { statusId } = req.params;
    const { text = '', media, background } = req.body;

    const status = await Status.findById(statusId);
    if (!status) return next(new AppError('Status not found', 404));
    if (String(status.user) !== String(req.user.id)) {
      return next(new AppError('You can only edit your own status', 403));
    }

    if (!text.trim() && !media?.url && !status.media?.url) {
      return next(new AppError('Status text or media is required', 400));
    }

    status.text = text.trim();
    if (media) {
      if (media.url && !['image', 'video', 'document'].includes(media.type)) {
        return next(new AppError('Status media must be an image, video, or document', 400));
      }
      status.media = media.url ? media : { url: '', type: '', name: '', size: 0 };
    }
    if (background) status.background = background;

    await status.save();

    const populated = await Status.findById(status._id)
      .populate('user', 'username displayName avatar isOnline lastSeen');

    res.json({ success: true, status: populated });
  } catch (error) {
    next(error);
  }
};

export const deleteStatus = async (req, res, next) => {
  try {
    const { statusId } = req.params;
    const status = await Status.findById(statusId);
    if (!status) return next(new AppError('Status not found', 404));
    if (String(status.user) !== String(req.user.id)) {
      return next(new AppError('You can only delete your own status', 403));
    }

    await status.deleteOne();
    res.json({ success: true, message: 'Status deleted successfully', statusId });
  } catch (error) {
    next(error);
  }
};

export const viewStatus = async (req, res, next) => {
  try {
    const { statusId } = req.params;
    const status = await Status.findById(statusId);
    if (!status) return next(new AppError('Status not found', 404));

    const visibleUserIds = await getVisibleUserIds(req.user.id);
    if (!visibleUserIds.includes(String(status.user))) {
      return next(new AppError('Status not available', 403));
    }

    if (String(status.user) !== String(req.user.id)) {
      const alreadyViewed = status.viewers.some((viewer) => String(viewer.user) === String(req.user.id));
      if (!alreadyViewed) {
        status.viewers.push({ user: new mongoose.Types.ObjectId(req.user.id) });
        await status.save();
      }
    }

    res.json({ success: true, statusId, viewed: true });
  } catch (error) {
    next(error);
  }
};
