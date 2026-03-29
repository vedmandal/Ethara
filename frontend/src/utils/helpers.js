/**
 * Utility helpers
 */
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';

// ─── Date/Time Formatting ──────────────────────────────────────────────────────
export const formatMessageTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return format(d, 'HH:mm');
};

export const formatChatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEE');
  return format(d, 'dd/MM/yy');
};

export const formatLastSeen = (date, isOnline) => {
  if (isOnline) return 'online';
  if (!date) return 'last seen recently';
  const d = new Date(date);
  if (isToday(d)) return `last seen today at ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `last seen yesterday at ${format(d, 'HH:mm')}`;
  return `last seen ${formatDistanceToNow(d, { addSuffix: true })}`;
};

export const formatDateDivider = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
};

// ─── Chat Helpers ─────────────────────────────────────────────────────────────
export const getChatName = (chat, currentUserId) => {
  if (chat.isGroup) return chat.chatName;
  const other = chat.participants?.find((p) => p._id !== currentUserId);
  return other?.displayName || other?.username || 'Unknown User';
};

export const getChatAvatar = (chat, currentUserId) => {
  if (chat.isGroup) return chat.groupAvatar || null;
  const other = chat.participants?.find((p) => p._id !== currentUserId);
  return other?.avatar || null;
};

export const getOtherParticipant = (chat, currentUserId) => {
  if (chat.isGroup) return null;
  return chat.participants?.find((p) => p._id !== currentUserId);
};

export const isChatOnline = (chat, currentUserId, onlineUsers) => {
  if (chat.isGroup) return false;
  const other = getOtherParticipant(chat, currentUserId);
  return other ? onlineUsers.has(other._id) : false;
};

// ─── Message Helpers ──────────────────────────────────────────────────────────
export const getMessagePreview = (message) => {
  if (!message) return '';
  if (message.isDeletedForEveryone) return '🚫 This message was deleted';
  switch (message.messageType) {
    case 'image': return '📷 Photo';
    case 'video': return '🎥 Video';
    case 'audio': return '🎵 Audio';
    case 'voice': return '🎤 Voice message';
    case 'document': return `📄 ${message.media?.name || 'Document'}`;
    case 'system': return message.content;
    default: return message.content || '';
  }
};

export const shouldShowDateDivider = (messages, index) => {
  if (index === 0) return true;
  const curr = new Date(messages[index].createdAt);
  const prev = new Date(messages[index - 1].createdAt);
  return curr.toDateString() !== prev.toDateString();
};

// ─── File Helpers ─────────────────────────────────────────────────────────────
export const getFileIcon = (type) => {
  const icons = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊',
    xlsx: '📊', ppt: '📊', pptx: '📊', txt: '📃',
    zip: '🗜️', rar: '🗜️', default: '📎',
  };
  return icons[type?.toLowerCase()] || icons.default;
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Avatar Helpers ───────────────────────────────────────────────────────────
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getAvatarColor = (name) => {
  const colors = [
    '#e57373', '#f06292', '#ba68c8', '#7986cb',
    '#4fc3f7', '#4dd0e1', '#4db6ac', '#81c784',
    '#aed581', '#ffd54f', '#ffb74d', '#a1887f',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ─── Misc ─────────────────────────────────────────────────────────────────────
export const truncate = (str, max = 40) => {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}...` : str;
};

export const groupMessagesByDate = (messages) => {
  const groups = {};
  messages.forEach((msg) => {
    const key = new Date(msg.createdAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  });
  return groups;
};
