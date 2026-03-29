import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { messageAPI } from '../../services/api';
import { useChat } from '../../context/ChatContext';
import { formatMessageTime, formatFileSize, getFileIcon } from '../../utils/helpers';
import Avatar from '../shared/Avatar';
import Dropdown, { DropdownItem } from '../shared/Dropdown';
import Modal from '../shared/Modal';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageBubble({ message, isGroup, onReply, onEdit }) {
  const { user } = useAuth();
  const { setMessages } = useChat();
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const isOwn = message.sender?._id === user._id || message.sender === user._id;
  const isDeleted = message.isDeletedForEveryone;
  const isSystem = message.messageType === 'system';

  // System messages centered
  if (isSystem) {
    return (
      <div className="system-message-wrap">
        <span className="system-message-pill">
          {message.content}
        </span>
      </div>
    );
  }

  const handleDelete = async (deleteFor) => {
    try {
      await messageAPI.deleteMessage(message._id, deleteFor);
      if (deleteFor === 'me') {
        setMessages((prev) => {
          const chatId = message.chat?._id || message.chat;
          return {
            ...prev,
            [chatId]: (prev[chatId] || []).filter((m) => m._id !== message._id),
          };
        });
      }
    } catch {}
    setShowMenu(false);
  };

  const handleReaction = async (emoji) => {
    setShowReactionPicker(false);
    try {
      await messageAPI.addReaction(message._id, emoji);
    } catch {}
  };

  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`message-wrapper ${isOwn ? 'outgoing' : 'incoming'}`}>
      {isGroup && !isOwn && (
        <div className="message-group-avatar">
          <Avatar src={message.sender?.avatar} name={message.sender?.displayName || message.sender?.username} size="sm" />
        </div>
      )}

      {isGroup && !isOwn && (
        <span className="message-sender-name" style={{ color: getSenderColor(message.sender?._id) }}>
          {message.sender?.displayName || message.sender?.username}
        </span>
      )}

      {message.replyTo && !isDeleted && (
        <div className={`message-reply-snippet ${isOwn ? 'outgoing' : ''}`}>
          <div className="message-reply-name">
            {message.replyTo.sender?.displayName || message.replyTo.sender?.username}
          </div>
          <div className="message-reply-text">
            {message.replyTo.content || '📎 Media'}
          </div>
        </div>
      )}

      <div className={`message-row ${isOwn ? 'outgoing' : 'incoming'}`}>
        <div className={`message-bubble ${isDeleted ? 'deleted' : ''}`}>
          {!isDeleted && renderMedia(message, setImageOpen, imageOpen)}

          {(message.content && !isDeleted) && (
            <div className="message-content">
              {message.content}
              {message.isEdited && <span className="message-edited">(edited)</span>}
            </div>
          )}

          {isDeleted && (
            <div className="deleted-message-text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              This message was deleted
            </div>
          )}

          <div className="message-meta">
            <span className="message-time">{formatMessageTime(message.createdAt)}</span>
            {isOwn && !isDeleted && <MessageTick status={message.status} />}
          </div>
        </div>

        {!isDeleted && (
          <div className={`message-hover-actions ${showMenu || showReactionPicker ? 'visible' : ''}`}>
            <button
              className="message-action-btn"
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              title="React"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </button>
            <Dropdown
              isOpen={showMenu}
              onClose={() => setShowMenu(false)}
              align={isOwn ? 'right' : 'left'}
              trigger={
                <button
                  className="message-action-btn"
                  onClick={() => setShowMenu(!showMenu)}
                  title="Options"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
                  </svg>
                </button>
              }
            >
              <DropdownItem onClick={() => { onReply?.(message); setShowMenu(false); }}>Reply</DropdownItem>
              {isOwn && message.messageType === 'text' && (
                <DropdownItem onClick={() => { onEdit?.(message); setShowMenu(false); }}>Edit</DropdownItem>
              )}
              <DropdownItem onClick={() => { setShowInfo(true); setShowMenu(false); }}>Info</DropdownItem>
              <DropdownItem onClick={() => { handleDelete('me'); }}>Delete for me</DropdownItem>
              {isOwn && <DropdownItem onClick={() => { handleDelete('everyone'); }} danger>Delete for everyone</DropdownItem>}
            </Dropdown>
          </div>
        )}
      </div>

      {showReactionPicker && (
        <div className="reaction-picker">
          {EMOJIS.map((emoji) => (
            <button key={emoji} onClick={() => handleReaction(emoji)}
              className="reaction-picker-btn"
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {Object.keys(groupedReactions).length > 0 && (
        <div className="message-reactions">
          {Object.entries(groupedReactions).map(([emoji, count]) => (
            <button key={emoji} className="reaction-chip" onClick={() => handleReaction(emoji)}>
              {emoji} <span>{count}</span>
            </button>
          ))}
        </div>
      )}

      <MessageInfoModal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        message={message}
        isOwn={isOwn}
        isGroup={isGroup}
      />
    </div>
  );
}

function MessageInfoModal({ isOpen, onClose, message, isOwn, isGroup }) {
  const deliveredEntries = (message.deliveredTo || []).filter((entry) => entry?.user);
  const readEntries = (message.readBy || []).filter((entry) => entry?.user);
  const reactionEntries = Object.entries(
    (message.reactions || []).reduce((acc, reaction) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    }, {})
  );

  const sentLabel = formatDetailedDate(message.createdAt);
  const editedLabel = message.editedAt ? formatDetailedDate(message.editedAt) : null;
  const deliveredSummary = getReceiptSummary(deliveredEntries.length, message.status, 'delivered');
  const seenSummary = getReceiptSummary(readEntries.length, message.status, 'seen');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Message Info"
      className="message-info-modal"
      bodyClassName="message-info-modal-body"
      maxWidth={540}
    >
      <div className="message-info-sheet">
        <div className={`message-info-preview ${isOwn ? 'outgoing' : 'incoming'}`}>
          <div className="message-info-preview-label">
            {isOwn ? 'You' : (message.sender?.displayName || message.sender?.username || 'Sender')}
          </div>
          {!message.isDeletedForEveryone && renderInfoMediaPreview(message)}
          <div className="message-info-preview-content">
            {message.isDeletedForEveryone ? 'This message was deleted' : (message.content || getMessageTypeLabel(message))}
          </div>
        </div>

        <div className="message-info-facts">
          <InfoRow label="Sent" value={sentLabel} />
          <InfoRow label="Type" value={getMessageTypeLabel(message)} />
          <InfoRow label="Status" value={formatStatus(message.status, message)} />
          {message.isEdited && <InfoRow label="Edited" value={editedLabel} />}
          {!message.isEdited && <InfoRow label="Edited" value="Not edited" />}
        </div>
      </div>

      <div className="message-info-section">
        <div className="message-info-section-title">Delivery Details</div>
        <div className="message-info-receipts">
          <ReceiptBlock
            title="Delivered"
            value={deliveredSummary}
            emptyLabel="Not delivered yet"
            entries={deliveredEntries}
            timeKey="deliveredAt"
            showMembers={isGroup}
          />
          <ReceiptBlock
            title="Read"
            value={seenSummary}
            emptyLabel="Not seen yet"
            entries={readEntries}
            timeKey="readAt"
            showMembers={isGroup}
          />
        </div>
      </div>

      {reactionEntries.length > 0 && (
        <div className="message-info-section">
          <div className="message-info-section-title">Reactions</div>
          <div className="message-info-reactions">
            {reactionEntries.map(([emoji, count]) => (
              <div key={emoji} className="message-info-reaction-chip">
                <span>{emoji}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="message-info-row">
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

function ReceiptBlock({ title, value, emptyLabel, entries, timeKey, showMembers }) {
  return (
    <div className="message-info-receipt-block">
      <div className="message-info-receipt-head">
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      {entries.length > 0 && showMembers ? (
        <div className="message-info-member-list">
          {entries.map((entry) => (
            <div key={`${entry.user?._id || entry.user}-${entry[timeKey] || title}`} className="message-info-member-row">
              <div className="message-info-member-meta">
                <Avatar
                  src={entry.user?.avatar}
                  name={entry.user?.displayName || entry.user?.username}
                  size="sm"
                />
                <div>
                  <strong>{entry.user?.displayName || entry.user?.username || 'Unknown user'}</strong>
                  <span>{formatDetailedDate(entry[timeKey])}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="message-info-empty">{entries.length ? `${title} available` : emptyLabel}</div>
      )}
    </div>
  );
}

function renderInfoMediaPreview(message) {
  const { media, messageType } = message;
  if (!media?.url) return null;

  if (messageType === 'image') {
    return <img src={media.url} alt="message preview" className="message-info-media-image" />;
  }

  if (messageType === 'video') {
    return (
      <div className="message-info-media-file">
        <span>Video</span>
        <strong>{media.name || 'Video attachment'}</strong>
      </div>
    );
  }

  if (messageType === 'document') {
    return (
      <div className="message-info-media-file">
        <span>Document</span>
        <strong>{media.name || 'Document attachment'}</strong>
      </div>
    );
  }

  if (messageType === 'audio' || messageType === 'voice') {
    return (
      <div className="message-info-media-file">
        <span>{messageType === 'voice' ? 'Voice message' : 'Audio'}</span>
        <strong>{media.name || 'Audio attachment'}</strong>
      </div>
    );
  }

  return null;
}

function formatDetailedDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMessageTypeLabel(message) {
  if (message.isDeletedForEveryone) return 'Deleted';
  switch (message.messageType) {
    case 'image':
      return 'Photo';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'voice':
      return 'Voice message';
    case 'document':
      return 'Document';
    case 'system':
      return 'System';
    default:
      return 'Text';
  }
}

function formatStatus(status, message) {
  if (message.isDeletedForEveryone) return 'Deleted for everyone';
  if (status === 'seen') return 'Seen';
  if (status === 'delivered') return 'Delivered';
  return 'Sent';
}

function getReceiptSummary(count, status, type) {
  if (count > 0) return `${count}`;
  if (type === 'seen' && status === 'seen') return 'Seen';
  if (type === 'delivered' && (status === 'delivered' || status === 'seen')) return 'Delivered';
  return '0';
}

// ─── Media renderers ──────────────────────────────────────────────────────────
function renderMedia(message, setImageOpen, imageOpen) {
  const { media, messageType } = message;
  if (!media?.url) return null;

  if (messageType === 'image') {
    return (
      <>
        <div className="media-bubble">
          <img
            src={media.url}
            alt="media"
            onClick={() => setImageOpen(true)}
            style={{ maxWidth: 260, maxHeight: 260, borderRadius: 10, marginBottom: message.content ? 6 : 0 }}
          />
        </div>
        {imageOpen && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
            onClick={() => setImageOpen(false)}
          >
            <img src={media.url} alt="full" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          </div>
        )}
      </>
    );
  }

  if (messageType === 'video') {
    return (
      <div className="media-bubble">
        <video controls style={{ maxWidth: 260, maxHeight: 200, borderRadius: 10, display: 'block', marginBottom: message.content ? 6 : 0 }}>
          <source src={media.url} />
        </video>
      </div>
    );
  }

  if (messageType === 'audio' || messageType === 'voice') {
    return <AudioPlayer url={media.url} duration={media.duration} />;
  }

  if (messageType === 'document') {
    return (
      <a href={media.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
        <div className="document-bubble">
          <div className="document-icon">{getFileIcon(media.name?.split('.').pop())}</div>
          <div className="document-info">
            <div className="document-name">{media.name || 'Document'}</div>
            <div className="document-size">{formatFileSize(media.size)}</div>
          </div>
        </div>
      </a>
    );
  }

  return null;
}

function AudioPlayer({ url, duration: initDuration }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initDuration || 0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const bars = Array.from({ length: 30 }, (_, i) => 4 + Math.sin(i * 0.7) * 10 + Math.random() * 8);

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setTotalDuration(audioRef.current?.duration || 0)}
        onEnded={() => setPlaying(false)}
      />
      <button className="audio-btn" onClick={toggle}>
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        )}
      </button>
      <div className="audio-waveform">
        {bars.map((h, i) => (
          <div key={i} className="audio-bar" style={{
            height: h,
            opacity: totalDuration > 0 && (i / bars.length) < (currentTime / totalDuration) ? 1 : 0.4,
          }} />
        ))}
      </div>
      <span className="audio-time">{fmtTime(playing ? currentTime : totalDuration)}</span>
    </div>
  );
}

function MessageTick({ status }) {
  const color = status === 'seen' ? '#53bdeb' : 'var(--text-muted)';
  if (status === 'sent') {
    return (
      <svg width="16" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    );
  }
  return (
    <svg width="18" height="12" viewBox="0 0 26 14" fill="none" stroke={color} strokeWidth="2.2">
      <polyline points="1 7 5 11 13 3"/>
      <polyline points="9 7 13 11 21 3"/>
    </svg>
  );
}

const COLORS = ['#e91e8c', '#00bcd4', '#4caf50', '#ff9800', '#9c27b0', '#f44336'];
function getSenderColor(id) {
  if (!id) return COLORS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}
