/**
 * Message Controller
 * Send, fetch, edit, delete messages
 */
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { AppError } from '../middleware/errorHandler.js';
import { io } from '../server.js';

// ─── Get Messages for a Chat ──────────────────────────────────────────────────
export const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is participant
    const chat = await Chat.findOne({ _id: chatId, participants: req.user.id });
    if (!chat) return next(new AppError('Chat not found or access denied', 404));

    const messages = await Message.find({
      chat: chatId,
      deletedFor: { $nin: [req.user.id] },
      isDeletedForEveryone: false,
    })
      .populate('sender', 'username displayName avatar')
      .populate('readBy.user', 'username displayName avatar')
      .populate('deliveredTo.user', 'username displayName avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username displayName avatar' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ chat: chatId, isDeletedForEveryone: false });

    res.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Send Message ─────────────────────────────────────────────────────────────
export const sendMessage = async (req, res, next) => {
  try {
    const { chatId, content, messageType = 'text', replyTo, media } = req.body;

    if (!chatId) return next(new AppError('chatId is required', 400));
    if (!content && !media?.url) return next(new AppError('Message content or media is required', 400));

    // Verify user is participant
    const chat = await Chat.findOne({ _id: chatId, participants: req.user.id });
    if (!chat) return next(new AppError('Chat not found or access denied', 404));

    const message = await Message.create({
      chat: chatId,
      sender: req.user.id,
      content: content || '',
      messageType,
      media: media || {},
      replyTo: replyTo || null,
      status: 'sent',
    });

    // Update chat's last message and timestamp
    chat.lastMessage = message._id;
    chat.updatedAt = new Date();

    // Update unread counts for other participants
    chat.participants.forEach((participantId) => {
      if (participantId.toString() !== req.user.id) {
        const existing = chat.unreadCounts.find((u) => u.user.toString() === participantId.toString());
        if (existing) {
          existing.count += 1;
        } else {
          chat.unreadCounts.push({ user: participantId, count: 1 });
        }
      }
    });

    await chat.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username displayName avatar')
      .populate('readBy.user', 'username displayName avatar')
      .populate('deliveredTo.user', 'username displayName avatar')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username displayName' },
      })
      .populate({
        path: 'chat',
        populate: { path: 'participants', select: 'username displayName avatar isOnline lastSeen' },
      });

    const chatPayload = await Chat.findById(chatId)
      .populate('participants', 'username displayName avatar isOnline lastSeen')
      .populate('lastMessage');

    const messageForSocket = populatedMessage.toObject();
    messageForSocket.chat = {
      _id: chat._id,
      isGroup: chat.isGroup,
      chatName: chat.chatName,
      groupAvatar: chat.groupAvatar,
      participants: chatPayload?.participants || [],
    };

    io.to(chatId).emit('message:new', messageForSocket);
    io.to(chatId).emit('chat:updated', {
      chatId,
      lastMessage: messageForSocket,
    });

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    next(error);
  }
};

// ─── Edit Message ─────────────────────────────────────────────────────────────
export const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) return next(new AppError('New content is required', 400));

    const message = await Message.findById(messageId);
    if (!message) return next(new AppError('Message not found', 404));

    // Only sender can edit
    if (message.sender.toString() !== req.user.id) {
      return next(new AppError('You can only edit your own messages', 403));
    }

    // Only text messages can be edited
    if (message.messageType !== 'text') {
      return next(new AppError('Only text messages can be edited', 400));
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const updated = await Message.findById(messageId)
      .populate('sender', 'username displayName avatar')
      .populate('readBy.user', 'username displayName avatar')
      .populate('deliveredTo.user', 'username displayName avatar');

    // Emit socket event
    io.to(message.chat.toString()).emit('message:edited', updated);

    res.json({ success: true, message: updated });
  } catch (error) {
    next(error);
  }
};

// ─── Delete Message ───────────────────────────────────────────────────────────
export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { deleteFor } = req.body; // 'me' | 'everyone'

    const message = await Message.findById(messageId);
    if (!message) return next(new AppError('Message not found', 404));

    if (deleteFor === 'everyone') {
      // Only sender can delete for everyone
      if (message.sender.toString() !== req.user.id) {
        return next(new AppError('Only the sender can delete for everyone', 403));
      }
      message.isDeletedForEveryone = true;
      message.content = 'This message was deleted';
      message.media = {};
      await message.save();

      io.to(message.chat.toString()).emit('message:deleted', {
        messageId,
        chatId: message.chat,
        deleteFor: 'everyone',
      });
    } else {
      // Delete for me only
      if (!message.deletedFor.includes(req.user.id)) {
        message.deletedFor.push(req.user.id);
        await message.save();
      }
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
};

// ─── Mark Messages as Seen ────────────────────────────────────────────────────
export const markAsSeen = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: req.user.id },
        'readBy.user': { $nin: [req.user.id] },
        isDeletedForEveryone: false,
      },
      {
        $push: { readBy: { user: req.user.id, readAt: new Date() } },
        $set: { status: 'seen' },
      }
    );

    // Reset unread count for this user in this chat
    await Chat.findByIdAndUpdate(chatId, {
      $set: { 'unreadCounts.$[elem].count': 0 },
    }, {
      arrayFilters: [{ 'elem.user': req.user.id }],
    });

    // Notify sender via socket
    io.to(chatId).emit('messages:seen', { chatId, seenBy: req.user.id });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Search Messages ──────────────────────────────────────────────────────────
export const searchMessages = async (req, res, next) => {
  try {
    const { q, chatId } = req.query;
    if (!q) return next(new AppError('Search query is required', 400));

    const query = {
      content: { $regex: q, $options: 'i' },
      isDeletedForEveryone: false,
      deletedFor: { $nin: [req.user.id] },
    };

    if (chatId) query.chat = chatId;
    else {
      // Search across all chats user is part of
      const userChats = await Chat.find({ participants: req.user.id }).select('_id');
      query.chat = { $in: userChats.map((c) => c._id) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username displayName avatar')
      .populate('chat', 'chatName isGroup participants')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};

// ─── Add Reaction ─────────────────────────────────────────────────────────────
export const addReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return next(new AppError('Message not found', 404));

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      (r) => r.user.toString() !== req.user.id
    );

    // Add new reaction (toggle if same emoji)
    if (emoji) {
      message.reactions.push({ user: req.user.id, emoji });
    }

    await message.save();

    io.to(message.chat.toString()).emit('message:reaction', {
      messageId,
      reactions: message.reactions,
    });

    res.json({ success: true, reactions: message.reactions });
  } catch (error) {
    next(error);
  }
};
