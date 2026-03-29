/**
 * Chat Controller
 * Handles creating, fetching, and managing chats
 */
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { AppError } from '../middleware/errorHandler.js';

// ─── Access or Create 1-1 Chat ────────────────────────────────────────────────
export const accessChat = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return next(new AppError('UserId is required', 400));

    // Find existing chat between the two users
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [req.user.id, userId], $size: 2 },
    })
      .populate('participants', '-password')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username displayName avatar' },
      });

    if (chat) {
      return res.json({ success: true, chat });
    }

    // Create new chat
    chat = await Chat.create({
      participants: [req.user.id, userId],
      isGroup: false,
    });

    chat = await Chat.findById(chat._id).populate('participants', '-password');

    res.status(201).json({ success: true, chat });
  } catch (error) {
    next(error);
  }
};

// ─── Get All My Chats ─────────────────────────────────────────────────────────
export const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate('participants', 'username displayName avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username displayName avatar' },
      })
      .sort({ updatedAt: -1 });

    res.json({ success: true, chats });
  } catch (error) {
    next(error);
  }
};

// ─── Get Single Chat ──────────────────────────────────────────────────────────
export const getChatById = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id,
    })
      .populate('participants', 'username displayName avatar isOnline lastSeen about')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username displayName avatar' },
      })
      .populate('groupAdmin', 'username displayName avatar')
      .populate('groupAdmins', 'username displayName avatar');

    if (!chat) return next(new AppError('Chat not found', 404));

    res.json({ success: true, chat });
  } catch (error) {
    next(error);
  }
};

// ─── Create Group Chat ────────────────────────────────────────────────────────
export const createGroupChat = async (req, res, next) => {
  try {
    const { name, participants, description } = req.body;

    if (!name || !participants || participants.length < 1) {
      return next(new AppError('Group name and at least 1 participant are required', 400));
    }

    // Add current user to participants
    const allParticipants = [...new Set([...participants, req.user.id])];

    const group = await Chat.create({
      chatName: name,
      isGroup: true,
      participants: allParticipants,
      groupAdmin: req.user.id,
      groupAdmins: [req.user.id],
      groupDescription: description || '',
    });

    // Create system message
    await Message.create({
      chat: group._id,
      sender: req.user.id,
      messageType: 'system',
      content: `${req.user.displayName || req.user.username} created the group "${name}"`,
      systemInfo: 'group_created',
    });

    const populatedGroup = await Chat.findById(group._id)
      .populate('participants', 'username displayName avatar isOnline lastSeen')
      .populate('groupAdmin', 'username displayName avatar');

    res.status(201).json({ success: true, chat: populatedGroup });
  } catch (error) {
    next(error);
  }
};

// ─── Add Member to Group ──────────────────────────────────────────────────────
export const addToGroup = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroup) return next(new AppError('Group chat not found', 404));

    // Check if requester is admin
    if (!chat.groupAdmins.includes(req.user.id)) {
      return next(new AppError('Only admins can add members', 403));
    }

    if (chat.participants.includes(userId)) {
      return next(new AppError('User is already in the group', 400));
    }

    chat.participants.push(userId);
    await chat.save();

    // System message
    const addedUser = await User.findById(userId).select('username displayName');
    await Message.create({
      chat: chatId,
      sender: req.user.id,
      messageType: 'system',
      content: `${addedUser.displayName || addedUser.username} was added to the group`,
      systemInfo: 'member_added',
    });

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'username displayName avatar isOnline lastSeen')
      .populate('groupAdmins', 'username displayName avatar');

    res.json({ success: true, chat: updatedChat });
  } catch (error) {
    next(error);
  }
};

// ─── Remove Member from Group ─────────────────────────────────────────────────
export const removeFromGroup = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroup) return next(new AppError('Group chat not found', 404));

    // Only admins can remove others; anyone can remove themselves (leave)
    const isSelf = userId === req.user.id;
    if (!isSelf && !chat.groupAdmins.includes(req.user.id)) {
      return next(new AppError('Only admins can remove members', 403));
    }

    chat.participants = chat.participants.filter((p) => p.toString() !== userId);
    chat.groupAdmins = chat.groupAdmins.filter((a) => a.toString() !== userId);
    await chat.save();

    const removedUser = await User.findById(userId).select('username displayName');
    await Message.create({
      chat: chatId,
      sender: req.user.id,
      messageType: 'system',
      content: isSelf
        ? `${removedUser.displayName || removedUser.username} left the group`
        : `${removedUser.displayName || removedUser.username} was removed from the group`,
      systemInfo: isSelf ? 'member_left' : 'member_removed',
    });

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'username displayName avatar isOnline lastSeen')
      .populate('groupAdmins', 'username displayName avatar');

    res.json({ success: true, chat: updatedChat });
  } catch (error) {
    next(error);
  }
};

// ─── Update Group ─────────────────────────────────────────────────────────────
export const updateGroup = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { chatName, groupDescription, groupAvatar } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroup) return next(new AppError('Group not found', 404));

    if (!chat.groupAdmins.includes(req.user.id)) {
      return next(new AppError('Only admins can update group details', 403));
    }

    if (chatName) chat.chatName = chatName;
    if (groupDescription !== undefined) chat.groupDescription = groupDescription;
    if (groupAvatar) chat.groupAvatar = groupAvatar;
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'username displayName avatar isOnline lastSeen')
      .populate('groupAdmins', 'username displayName avatar');

    res.json({ success: true, chat: updatedChat });
  } catch (error) {
    next(error);
  }
};

// ─── Promote/Demote Admin ──────────────────────────────────────────────────────
export const makeAdmin = async (req, res, next) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat?.isGroup) return next(new AppError('Group not found', 404));

    // Only the group owner (original admin) can promote
    if (chat.groupAdmin.toString() !== req.user.id) {
      return next(new AppError('Only the group owner can promote admins', 403));
    }

    if (!chat.groupAdmins.includes(userId)) {
      chat.groupAdmins.push(userId);
    } else {
      // Demote
      chat.groupAdmins = chat.groupAdmins.filter((a) => a.toString() !== userId);
    }
    await chat.save();

    res.json({ success: true, message: 'Admin status updated' });
  } catch (error) {
    next(error);
  }
};

// ─── Delete Chat ──────────────────────────────────────────────────────────────
export const deleteChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) return next(new AppError('Chat not found', 404));
    if (!chat.participants.includes(req.user.id)) {
      return next(new AppError('Not authorized', 403));
    }

    // For groups, only admin can delete
    if (chat.isGroup && chat.groupAdmin.toString() !== req.user.id) {
      return next(new AppError('Only group admin can delete the group', 403));
    }

    await Message.deleteMany({ chat: chatId });
    await chat.deleteOne();

    res.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    next(error);
  }
};
