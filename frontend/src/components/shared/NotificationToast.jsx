import React, { useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import Avatar from './Avatar';
import { getChatName, getChatAvatar, getMessagePreview } from '../../utils/helpers';

export default function NotificationToast() {
  const { notification, setNotification, chats, selectChat } = useChat();
  const { user } = useAuth();

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification, setNotification]);

  if (!notification) return null;

  const chat = chats.find((c) => c._id === notification.chatId);
  const name = chat ? getChatName(chat, user._id) : 'New message';
  const avatar = chat ? getChatAvatar(chat, user._id) : null;
  const preview = getMessagePreview(notification.message);

  const handleClick = () => {
    if (chat) { selectChat(chat); }
    setNotification(null);
  };

  return (
    <div className="notification-toast" onClick={handleClick}>
      <Avatar src={avatar} name={name} size="sm" />
      <div className="notification-toast-content">
        <div className="notification-toast-name">{name}</div>
        <div className="notification-toast-msg">{preview}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setNotification(null); }}
        style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 4 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}
