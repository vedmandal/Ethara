/**
 * Chat Context
 * Manages chat list, active chat, messages, socket events
 */
import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useRef,
} from 'react';
import { chatAPI, messageAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

const mergeMessage = (list = [], message) => {
  const idx = list.findIndex((m) => m._id === message._id);
  if (idx === -1) return [...list, message];
  const next = [...list];
  next[idx] = { ...next[idx], ...message };
  return next;
};

const sortChatsByRecent = (chatList) => (
  [...chatList].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({}); // { chatId: [...messages] }
  const [typingUsers, setTypingUsers] = useState({}); // { chatId: [userId] }
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [notification, setNotification] = useState(null);
  const activeChatRef = useRef(activeChat);
  activeChatRef.current = activeChat;

  // Fetch chats on mount
  useEffect(() => {
    if (!user) return;
    fetchChats();
  }, [user]); // eslint-disable-line

  // Socket event listeners
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;

    // New message
    socket.on('message:new', (message) => {
      const chatId = message.chat?._id || message.chat;

      setMessages((prev) => {
        const existing = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: mergeMessage(existing, message),
        };
      });

      setChats((prev) => {
        const exists = prev.some((c) => c._id === chatId);
        const updatedAt = message.createdAt || new Date().toISOString();
        if (!exists) {
          const derivedChat = message.chat?._id ? {
            ...message.chat,
            _id: message.chat._id,
            lastMessage: message,
            updatedAt,
            unreadCount: activeChatRef.current?._id === chatId ? 0 : 1,
          } : null;
          return derivedChat ? sortChatsByRecent([derivedChat, ...prev]) : prev;
        }

        return sortChatsByRecent(
          prev.map((c) => (
            c._id === chatId
              ? {
                  ...c,
                  lastMessage: message,
                  updatedAt,
                  unreadCount: activeChatRef.current?._id === chatId
                    ? 0
                    : (c.unreadCount || 0) + (message.sender?._id === user._id || message.sender === user._id ? 0 : 1),
                }
              : c
          ))
        );
      });

      if (activeChatRef.current?._id !== chatId && !(message.sender?._id === user._id || message.sender === user._id)) {
        setNotification({ message, chatId });
        playNotificationSound();
      }
    });

    // Message edited
    socket.on('message:edited', (updatedMsg) => {
      const chatId = updatedMsg.chat._id || updatedMsg.chat;
      setMessages((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((m) =>
          m._id === updatedMsg._id ? updatedMsg : m
        ),
      }));
    });

    // Message deleted
    socket.on('message:deleted', ({ messageId, chatId, deleteFor }) => {
      if (deleteFor === 'everyone') {
        setMessages((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map((m) =>
            m._id === messageId
              ? { ...m, isDeletedForEveryone: true, content: 'This message was deleted' }
              : m
          ),
        }));
      }
    });

    // Message reaction
    socket.on('message:reaction', ({ messageId, reactions }) => {
      setMessages((prev) => {
        const updated = { ...prev };
        for (const chatId in updated) {
          updated[chatId] = updated[chatId].map((m) =>
            m._id === messageId ? { ...m, reactions } : m
          );
        }
        return updated;
      });
    });

    // Messages seen
    socket.on('messages:seen', ({ chatId, seenBy }) => {
      if (seenBy === user._id) return;
      setMessages((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((m) =>
          m.sender._id === user._id || m.sender === user._id
            ? { ...m, status: 'seen' }
            : m
        ),
      }));
    });

    // Message delivered
    socket.on('message:delivered', ({ messageId, chatId }) => {
      setMessages((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((m) =>
          m._id === messageId && m.status === 'sent' ? { ...m, status: 'delivered' } : m
        ),
      }));
    });

    // Typing indicators
    socket.on('typing:start', ({ chatId, userId }) => {
      if (userId === user._id) return;
      setTypingUsers((prev) => ({
        ...prev,
        [chatId]: [...new Set([...(prev[chatId] || []), userId])],
      }));
    });

    socket.on('typing:stop', ({ chatId, userId }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter((id) => id !== userId),
      }));
    });

    // Online/offline presence
    socket.on('user:online', ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
      setChats((prev) =>
        prev.map((c) => ({
          ...c,
          participants: c.participants?.map((p) =>
            p._id === userId ? { ...p, isOnline: true } : p
          ),
        }))
      );
    });

    socket.on('user:offline', ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      setChats((prev) =>
        prev.map((c) => ({
          ...c,
          participants: c.participants?.map((p) =>
            p._id === userId ? { ...p, isOnline: false, lastSeen } : p
          ),
        }))
      );
    });

    // Chat updated (from other user)
    socket.on('chat:updated', ({ chatId, lastMessage }) => {
      setChats((prev) =>
        sortChatsByRecent(
          prev.map((c) =>
            c._id === chatId ? { ...c, lastMessage, updatedAt: lastMessage?.createdAt || new Date() } : c
          )
        )
      );
    });

    return () => {
      socket.off('message:new');
      socket.off('message:edited');
      socket.off('message:deleted');
      socket.off('message:reaction');
      socket.off('messages:seen');
      socket.off('message:delivered');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('chat:updated');
    };
  }, [user]); // eslint-disable-line

  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const { data } = await chatAPI.getMyChats();
      setChats(data.chats);
      // Build online users set
      const online = new Set();
      data.chats.forEach((c) =>
        c.participants?.forEach((p) => { if (p.isOnline) online.add(p._id); })
      );
      setOnlineUsers(online);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const selectChat = useCallback(async (chat) => {
    setActiveChat(chat);

    // Join socket room
    const socket = getSocket();
    if (socket) socket.emit('chat:join', chat._id);

    // Load messages if not already loaded
    if (!messages[chat._id]) {
      setLoadingMessages(true);
      try {
        const { data } = await messageAPI.getMessages(chat._id);
        setMessages((prev) => ({ ...prev, [chat._id]: data.messages }));
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    }

    // Mark messages as read
    if (socket) socket.emit('messages:read', { chatId: chat._id });
    setChats((prev) =>
      prev.map((c) => (c._id === chat._id ? { ...c, unreadCount: 0 } : c))
    );
  }, [messages]);

  const sendMessage = useCallback((chatId, messageData) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('message:send', { chatId, ...messageData });
    }
  }, []);

  const addMessage = useCallback((chatId, message) => {
    setMessages((prev) => ({
      ...prev,
      [chatId]: mergeMessage(prev[chatId] || [], message),
    }));
    setChats((prev) =>
      sortChatsByRecent(
        prev.map((c) =>
          c._id === chatId
            ? { ...c, lastMessage: message, updatedAt: message.createdAt || new Date().toISOString() }
            : c
        )
      )
    );
  }, []);

  const updateChatList = useCallback((chat) => {
    setChats((prev) => {
      const exists = prev.find((c) => c._id === chat._id);
      if (exists) {
        return sortChatsByRecent(
          prev.map((c) => (c._id === chat._id ? { ...c, ...chat } : c))
        );
      }
      return [chat, ...prev];
    });
  }, []);

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  return (
    <ChatContext.Provider value={{
      chats,
      activeChat,
      messages,
      typingUsers,
      onlineUsers,
      loadingChats,
      loadingMessages,
      notification,
      setNotification,
      fetchChats,
      selectChat,
      setActiveChat,
      sendMessage,
      addMessage,
      updateChatList,
      setChats,
      setMessages,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
