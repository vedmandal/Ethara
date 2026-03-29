/**
 * Socket.IO Service
 * Handles all real-time events: messaging, typing, presence, calls
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

// Track active users: userId -> Set of socketIds (user can have multiple tabs)
const activeUsers = new Map();

export const initializeSocket = (io) => {
  // ─── Authentication Middleware ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username displayName avatar');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.username} (${socket.id})`);

    // ─── User Online ────────────────────────────────────────────────────────
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);

    // Update user status in DB
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: new Date(),
    });

    // Broadcast online status to all connected clients
    socket.broadcast.emit('user:online', {
      userId,
      isOnline: true,
      lastSeen: new Date(),
    });

    // ─── Join User's Chats ──────────────────────────────────────────────────
    const userChats = await Chat.find({ participants: userId }).select('_id');
    userChats.forEach((chat) => {
      socket.join(chat._id.toString());
    });

    // ─── Join a Chat Room ───────────────────────────────────────────────────
    socket.on('chat:join', (chatId) => {
      socket.join(chatId);
    });

    socket.on('chat:leave', (chatId) => {
      socket.leave(chatId);
    });

    // ─── New Message ────────────────────────────────────────────────────────
    socket.on('message:send', async (data) => {
      try {
        const { chatId, content, messageType = 'text', replyTo, media } = data;

        const chat = await Chat.findOne({ _id: chatId, participants: userId });
        if (!chat) return;

        const message = await Message.create({
          chat: chatId,
          sender: userId,
          content: content || '',
          messageType,
          media: media || {},
          replyTo: replyTo || null,
          status: 'sent',
        });

        // Update chat
        chat.lastMessage = message._id;
        chat.updatedAt = new Date();
        await chat.save();

        const populated = await Message.findById(message._id)
          .populate('sender', 'username displayName avatar')
          .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'username displayName' },
          });

        // Emit to all in the chat room
        io.to(chatId).emit('message:new', populated);

        // Mark as delivered for online recipients
        const chatFull = await Chat.findById(chatId).select('participants');
        chatFull.participants.forEach(async (participantId) => {
          const pid = participantId.toString();
          if (pid !== userId && activeUsers.has(pid)) {
            // User is online - mark as delivered
            await Message.findByIdAndUpdate(message._id, {
              $push: { deliveredTo: { user: pid, deliveredAt: new Date() } },
              status: 'delivered',
            });
            io.to(chatId).emit('message:delivered', { messageId: message._id, chatId });
          }
        });

        // Update unread counts
        chat.participants.forEach(async (participantId) => {
          const pid = participantId.toString();
          if (pid !== userId) {
            // Notify participant's other sockets about new message
            const userSockets = activeUsers.get(pid);
            if (userSockets) {
              userSockets.forEach((socketId) => {
                io.to(socketId).emit('chat:updated', {
                  chatId,
                  lastMessage: populated,
                });
              });
            }
          }
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
        console.error('Socket message error:', err);
      }
    });

    // ─── Typing Indicator ───────────────────────────────────────────────────
    socket.on('typing:start', ({ chatId }) => {
      socket.to(chatId).emit('typing:start', {
        chatId,
        userId,
        username: socket.user.username,
        displayName: socket.user.displayName,
      });
    });

    socket.on('typing:stop', ({ chatId }) => {
      socket.to(chatId).emit('typing:stop', { chatId, userId });
    });

    // ─── Message Read Receipts ──────────────────────────────────────────────
    socket.on('messages:read', async ({ chatId }) => {
      try {
        await Message.updateMany(
          {
            chat: chatId,
            sender: { $ne: userId },
            'readBy.user': { $nin: [userId] },
          },
          {
            $push: { readBy: { user: userId, readAt: new Date() } },
            $set: { status: 'seen' },
          }
        );

        io.to(chatId).emit('messages:seen', { chatId, seenBy: userId });
      } catch (err) {
        console.error('Read receipt error:', err);
      }
    });

    // ─── WebRTC Signaling ────────────────────────────────────────────────────
    socket.on('call:offer', ({ chatId, offer, callType }) => {
      socket.to(chatId).emit('call:incoming', {
        from: userId,
        fromUser: socket.user,
        offer,
        callType, // 'audio' | 'video'
        chatId,
      });
    });

    socket.on('call:answer', ({ chatId, answer }) => {
      socket.to(chatId).emit('call:answered', { from: userId, answer });
    });

    socket.on('call:ice-candidate', ({ chatId, candidate }) => {
      socket.to(chatId).emit('call:ice-candidate', { from: userId, candidate });
    });

    socket.on('call:end', ({ chatId }) => {
      socket.to(chatId).emit('call:ended', { from: userId });
    });

    socket.on('call:reject', ({ chatId }) => {
      socket.to(chatId).emit('call:rejected', { from: userId });
    });

    // ─── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.user.username}`);

      // Remove this socket from active users
      if (activeUsers.has(userId)) {
        activeUsers.get(userId).delete(socket.id);
        if (activeUsers.get(userId).size === 0) {
          activeUsers.delete(userId);

          // User is fully offline
          const lastSeen = new Date();
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen,
            socketId: '',
          });

          socket.broadcast.emit('user:offline', { userId, lastSeen });
        }
      }
    });
  });

  return io;
};

// Helper to check if user is online
export const isUserOnline = (userId) => activeUsers.has(userId.toString());
