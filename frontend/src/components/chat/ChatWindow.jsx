import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { chatAPI, messageAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useWebRTC } from '../../hooks/useWebRTC';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import Avatar from '../shared/Avatar';
import IconBtn from '../shared/IconBtn';
import Dropdown, { DropdownItem } from '../shared/Dropdown';
import ProfilePanel from './ProfilePanel';
import CallOverlay from './CallOverlay';
import {
  getChatName, getChatAvatar, getOtherParticipant,
  formatLastSeen, shouldShowDateDivider, formatDateDivider, isChatOnline
} from '../../utils/helpers';

export default function ChatWindow({ onBack }) {
  const { user } = useAuth();
  const { activeChat, messages, typingUsers, onlineUsers, loadingMessages, setMessages } = useChat();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const chatId = activeChat?._id;
  const chatMessages = messages[chatId] || [];
  const typing = typingUsers[chatId] || [];
  const isOnline = activeChat ? isChatOnline(activeChat, user._id, onlineUsers) : false;
  const chatName = activeChat ? getChatName(activeChat, user._id) : '';
  const chatAvatar = activeChat ? getChatAvatar(activeChat, user._id) : null;
  const otherUser = activeChat ? getOtherParticipant(activeChat, user._id) : null;

  const {
    callState, callType, incomingCall,
    startCall, answerCall, endCall, rejectCall,
    isMuted, isVideoOff, toggleMute, toggleVideo,
    localVideoRef, remoteVideoRef, remoteAudioRef, hasRemoteVideo, connectionStatus,
  } = useWebRTC(chatId);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length]);

  // Scroll to bottom when chat changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    setPage(1);
    setHasMore(true);
    setReplyTo(null);
    setEditingMessage(null);
  }, [chatId]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (!chatId) return;
    const socket = getSocket();
    socket?.emit('messages:read', { chatId });
  }, [chatId]);

  // Load older messages on scroll
  const handleScroll = useCallback(async () => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore) return;
    if (container.scrollTop < 60) {
      setLoadingMore(true);
      const nextPage = page + 1;
      try {
        const { data } = await messageAPI.getMessages(chatId, nextPage);
        if (data.messages.length === 0) { setHasMore(false); return; }
        setMessages((prev) => ({
          ...prev,
          [chatId]: [...data.messages, ...(prev[chatId] || [])],
        }));
        setPage(nextPage);
        // Maintain scroll position
        const prevHeight = container.scrollHeight;
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight - prevHeight;
        });
      } catch {}
      finally { setLoadingMore(false); }
    }
  }, [chatId, page, loadingMore, hasMore, setMessages]);

  // Search messages
  const handleSearch = async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const { data } = await messageAPI.searchMessages(q, chatId);
      setSearchResults(data.messages);
    } catch {}
  };

  if (!activeChat) {
    return (
      <div className="chat-area">
        <div className="chat-area-bg" />
        <div className="empty-state chat-empty-state">
          <div className="chat-empty-card">
            <div className="chat-empty-logo">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M8 11.5 12 7l4 4.5M12 7v10" />
                <rect x="3" y="3" width="18" height="18" rx="6" />
              </svg>
            </div>
            <span className="sidebar-pill">Workspace ready</span>
            <h3>Pulse Chat</h3>
            <p>Select a conversation to start messaging, or search for people to connect with.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      <div className="chat-area">
        <div className="chat-area-bg" />

        <div className="chat-header">
          {onBack && (
            <IconBtn onClick={onBack} title="Back" className="mobile-back-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </IconBtn>
          )}

          <Avatar
            src={chatAvatar}
            name={chatName}
            size="md"
            showOnline={!activeChat.isGroup}
            isOnline={isOnline}
            onClick={() => setShowProfile(true)}
          />

          <div className="chat-header-info" onClick={() => setShowProfile(true)}>
            <div className="chat-header-eyebrow">{activeChat.isGroup ? 'Design room' : isOnline ? 'Online now' : 'Conversation'}</div>
            <div className="chat-header-name">{chatName}</div>
            <div className={`chat-header-status ${isOnline ? '' : 'offline'}`}>
              {typing.length > 0
                ? `${typing.length > 1 ? 'Several people' : 'Typing'}...`
                : activeChat.isGroup
                  ? `${activeChat.participants?.length || 0} members`
                  : formatLastSeen(otherUser?.lastSeen, isOnline)
              }
            </div>
          </div>

          <div className="chat-header-actions">
            <IconBtn onClick={() => startCall('video', { name: chatName, avatar: chatAvatar })} title="Video call">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </IconBtn>
            <IconBtn onClick={() => startCall('audio', { name: chatName, avatar: chatAvatar })} title="Voice call">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </IconBtn>
            <IconBtn onClick={() => setSearching(!searching)} title="Search" className={searching ? 'active-icon-btn' : ''}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </IconBtn>
            <Dropdown
              isOpen={showMenu}
              onClose={() => setShowMenu(false)}
              trigger={
                <IconBtn onClick={() => setShowMenu(!showMenu)} title="More options">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="1" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                    <circle cx="12" cy="19" r="1" fill="currentColor"/>
                  </svg>
                </IconBtn>
              }
            >
              <DropdownItem onClick={() => { setShowProfile(true); setShowMenu(false); }}>
                {activeChat.isGroup ? 'Group info' : 'View profile'}
              </DropdownItem>
              <DropdownItem onClick={() => { setSearching(true); setShowMenu(false); }}>Search messages</DropdownItem>
              <div className="dropdown-divider" />
              <DropdownItem danger onClick={async () => {
                if (!window.confirm('Delete this chat?')) return;
                try {
                  await chatAPI.deleteChat(chatId);
                  window.location.reload();
                } catch {}
                setShowMenu(false);
              }}>
                Delete chat
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        {searching && (
          <div className="chat-search-panel">
            <div className="search-input-wrap" style={{ flex: 1 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
                autoFocus
              />
            </div>
            <IconBtn onClick={() => { setSearching(false); setSearchQuery(''); setSearchResults([]); }} className="chat-search-close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </IconBtn>
          </div>
        )}

        {searching && searchResults.length > 0 && (
          <div className="chat-search-results">
            {searchResults.map((msg) => (
              <div key={msg._id} className="chat-search-result-item">
                <div className="chat-search-result-meta">
                  {msg.sender?.displayName} · {new Date(msg.createdAt).toLocaleString()}
                </div>
                <div>{msg.content}</div>
              </div>
            ))}
          </div>
        )}

        <div
          className="messages-container"
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          <div className="mobile-message-day">Today</div>
          {loadingMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <span className="spinner spinner-sm" />
            </div>
          )}

          {loadingMessages ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <span className="spinner" />
            </div>
          ) : (
            chatMessages.map((msg, index) => {
              const showDivider = shouldShowDateDivider(chatMessages, index);
              return (
                <React.Fragment key={msg._id || index}>
                  {showDivider && (
                    <div className="date-divider">
                      <span>{formatDateDivider(msg.createdAt)}</span>
                    </div>
                  )}
                  <MessageBubble
                    message={msg}
                    isGroup={activeChat.isGroup}
                    onReply={(m) => setReplyTo(m)}
                    onEdit={(m) => setEditingMessage(m)}
                  />
                </React.Fragment>
              );
            })
          )}

          {typing.length > 0 && (
            <div className="message-wrapper incoming typing-message">
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <MessageInput
          chatId={chatId}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>

      {showProfile && (
        <ProfilePanel
          chat={activeChat}
          onClose={() => setShowProfile(false)}
        />
      )}

      {(callState !== 'idle') && (
        <CallOverlay
          callState={callState}
          callType={callType}
          incomingCall={incomingCall}
          chatName={chatName}
          chatAvatar={chatAvatar}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          remoteAudioRef={remoteAudioRef}
          hasRemoteVideo={hasRemoteVideo}
          connectionStatus={connectionStatus}
          onAnswer={answerCall}
          onEnd={() => endCall(true)}
          onReject={rejectCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      )}
    </div>
  );
}
