import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { chatAPI, statusAPI, userAPI } from '../../services/api';
import Avatar from '../shared/Avatar';
import IconBtn from '../shared/IconBtn';
import Dropdown, { DropdownItem } from '../shared/Dropdown';
import NewGroupModal from '../group/NewGroupModal';
import ProfileSettingsModal from './ProfileSettingsModal';
import StatusComposerModal from './StatusComposerModal';
import StatusViewerModal from './StatusViewerModal';
import {
  getChatName, getChatAvatar, getOtherParticipant,
  getMessagePreview, formatChatTime, isChatOnline, truncate
} from '../../utils/helpers';

export default function Sidebar({ onChatSelect }) {
  const { user, logout } = useAuth();
  const { chats, activeChat, selectChat, onlineUsers, updateChatList } = useChat();
  const { isDark, toggleTheme } = useTheme();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [statusGroups, setStatusGroups] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [showStatusComposer, setShowStatusComposer] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [viewerGroup, setViewerGroup] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('messages');
  const [callLogs, setCallLogs] = useState([]);
  const [messageFilter, setMessageFilter] = useState('all');
  const [favoriteChatIds, setFavoriteChatIds] = useState([]);

  const loadCallLogs = useCallback(() => {
    try {
      setCallLogs(JSON.parse(localStorage.getItem('pulse_chat_call_history') || '[]'));
    } catch {
      setCallLogs([]);
    }
  }, []);

  const loadFavoriteChats = useCallback(() => {
    try {
      setFavoriteChatIds(JSON.parse(localStorage.getItem('pulse_chat_favorite_chats') || '[]'));
    } catch {
      setFavoriteChatIds([]);
    }
  }, []);

  const fetchStatuses = useCallback(async () => {
    setLoadingStatuses(true);
    try {
      const { data } = await statusAPI.getStatuses();
      setStatusGroups(data.statuses || []);
    } catch (err) {
      console.error('Failed to load statuses:', err);
    } finally {
      setLoadingStatuses(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    loadCallLogs();
    loadFavoriteChats();
    const handleCallLogs = () => loadCallLogs();
    const handleFavorites = () => loadFavoriteChats();
    window.addEventListener('call-log-updated', handleCallLogs);
    window.addEventListener('favorite-chats-updated', handleFavorites);
    window.addEventListener('focus', handleCallLogs);
    return () => {
      window.removeEventListener('call-log-updated', handleCallLogs);
      window.removeEventListener('favorite-chats-updated', handleFavorites);
      window.removeEventListener('focus', handleCallLogs);
    };
  }, [loadCallLogs, loadFavoriteChats]);

  useEffect(() => {
    const interval = window.setInterval(fetchStatuses, 30000);
    const handleFocus = () => fetchStatuses();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchStatuses]);

  // Debounced user search
  const searchTimeout = React.useRef(null);
  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await userAPI.search(val);
        setSearchResults(data.users);
      } catch {}
      finally { setSearching(false); }
    }, 350);
  };

  const handleUserClick = useCallback(async (foundUser) => {
    setSearch('');
    setSearchResults([]);
    try {
      const { data } = await chatAPI.accessChat(foundUser._id);
      updateChatList(data.chat);
      selectChat(data.chat);
      onChatSelect?.();
    } catch (err) {
      console.error('Failed to access chat:', err);
    }
  }, [selectChat, updateChatList, onChatSelect]);

  const handleChatClick = useCallback((chat) => {
    selectChat(chat);
    onChatSelect?.();
  }, [selectChat, onChatSelect]);

  // Filter chats by search query
  const filteredChats = search.trim()
    ? chats.filter((c) => {
        const name = getChatName(c, user._id).toLowerCase();
        return name.includes(search.toLowerCase());
      })
    : chats;

  const visibleChats = useMemo(() => {
    if (messageFilter === 'unread') return filteredChats.filter((chat) => (chat.unreadCount || 0) > 0);
    if (messageFilter === 'favorites') return filteredChats.filter((chat) => favoriteChatIds.includes(chat._id));
    if (messageFilter === 'groups') return filteredChats.filter((chat) => chat.isGroup);
    return filteredChats;
  }, [filteredChats, messageFilter, favoriteChatIds]);

  const ownStatusGroup = useMemo(
    () => statusGroups.find((group) => group.user._id === user._id) || null,
    [statusGroups, user._id]
  );

  const otherStatusGroups = useMemo(
    () => statusGroups.filter((group) => group.user._id !== user._id),
    [statusGroups, user._id]
  );

  const upsertStatusGroup = useCallback((savedStatus, isEdit = false) => {
    setStatusGroups((prev) => {
      const ownerId = savedStatus.user._id;
      const existingGroup = prev.find((group) => group.user._id === ownerId);

      if (!existingGroup) {
        return [{
          user: savedStatus.user,
          statuses: [{ ...savedStatus, canManage: true, viewed: true, viewCount: savedStatus.viewers?.length || 0 }],
          latestStatusAt: savedStatus.createdAt,
          hasUnviewed: false,
        }, ...prev];
      }

      const nextStatuses = isEdit
        ? existingGroup.statuses.map((item) => (
            item._id === savedStatus._id
              ? { ...item, ...savedStatus, canManage: true, viewed: true, viewCount: savedStatus.viewers?.length || item.viewCount || 0 }
              : item
          ))
        : [...existingGroup.statuses, { ...savedStatus, canManage: true, viewed: true, viewCount: savedStatus.viewers?.length || 0 }];

      return prev.map((group) => (
        group.user._id === ownerId
          ? {
              ...group,
              user: savedStatus.user,
              statuses: nextStatuses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
              latestStatusAt: savedStatus.createdAt,
              hasUnviewed: false,
            }
          : group
      ));
    });
  }, []);

  const openViewer = useCallback((group, initial = 0) => {
    setViewerGroup(group);
    setViewerIndex(initial);
  }, []);

  const markStatusViewed = useCallback(async (status) => {
    if (!status || status.canManage || status.viewed) return;
    try {
      await statusAPI.viewStatus(status._id);
      setStatusGroups((prev) => prev.map((group) => {
        if (group.user._id !== status.user._id) return group;
        const statuses = group.statuses.map((item) => (
          item._id === status._id ? { ...item, viewed: true } : item
        ));
        return {
          ...group,
          statuses,
          hasUnviewed: statuses.some((item) => !item.viewed),
        };
      }));
    } catch (err) {
      console.error('Failed to mark status as viewed:', err);
    }
  }, []);

  const handleDeleteStatus = useCallback(async (status) => {
    try {
      await statusAPI.deleteStatus(status._id);
      setStatusGroups((prev) => prev
        .map((group) => {
          if (group.user._id !== status.user._id) return group;
          const statuses = group.statuses.filter((item) => item._id !== status._id);
          if (!statuses.length) return null;
          return {
            ...group,
            statuses,
            latestStatusAt: statuses[statuses.length - 1].createdAt,
          };
        })
        .filter(Boolean));
      setViewerGroup((curr) => {
        if (!curr || curr.user._id !== status.user._id) return curr;
        const statuses = curr.statuses.filter((item) => item._id !== status._id);
        if (!statuses.length) return null;
        return { ...curr, statuses };
      });
    } catch (err) {
      console.error('Failed to delete status:', err);
    }
  }, []);

  const handleToggleFavorite = useCallback((event, chatId) => {
    event.stopPropagation();
    setFavoriteChatIds((prev) => {
      const next = prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId];
      localStorage.setItem('pulse_chat_favorite_chats', JSON.stringify(next));
      window.dispatchEvent(new Event('favorite-chats-updated'));
      return next;
    });
  }, []);

  return (
    <div className="sidebar-shell">
      <aside className="chat-desktop-rail">
        <div className="chat-desktop-rail-brand">
          <div className="chat-desktop-rail-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2 6 13h5l-1 9 8-12h-5l1-8Z" />
            </svg>
          </div>
          <span>ETHER</span>
        </div>

        <nav className="chat-desktop-rail-nav">
          <button className={`chat-desktop-rail-item ${activeTab === 'messages' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('messages')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Messages</span>
          </button>
          <button className={`chat-desktop-rail-item ${activeTab === 'calls' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('calls')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18.85 19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.33 2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
            </svg>
            <span>Calls</span>
          </button>
          <button className={`chat-desktop-rail-item ${activeTab === 'status' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('status')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 1 0 9 9h-4a5 5 0 1 1-5-5V3Z" />
              <circle cx="17.5" cy="6.5" r="2.5" />
            </svg>
            <span>Status</span>
          </button>
          <button className="chat-desktop-rail-item" type="button" onClick={toggleTheme}>
            {isDark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 18a6 6 0 1 1 6-6 6 6 0 0 1-6 6Zm0-16 1.74 3.52L17.5 7l-3.76 1.48L12 12 10.26 8.48 6.5 7l3.76-1.48Z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 15.31A8 8 0 0 1 8.69 4 8.02 8.02 0 1 0 20 15.31Z" />
              </svg>
            )}
            <span>Settings</span>
          </button>
        </nav>

        <div className="chat-desktop-rail-footer">
          <button className="chat-desktop-compose-btn" type="button" onClick={() => setShowNewGroup(true)}>
            New Message
          </button>
          <button className="chat-desktop-profile-icon" type="button" onClick={() => setShowProfile(true)} title="Account">
            <Avatar src={user.avatar} name={user.displayName || user.username} size="sm" />
          </button>
        </div>
      </aside>

      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand sidebar-mobile-brand" onClick={() => setShowProfile(true)}>
            <Avatar src={user.avatar} name={user.displayName || user.username} size="sm" />
            <div>
              <span className="sidebar-brand-title">ETHER</span>
              <p className="sidebar-brand-subtitle">Luminous messaging</p>
            </div>
          </div>

          <div className="sidebar-desktop-copy">
            <h1 className="sidebar-page-title">
              {activeTab === 'calls' ? 'Calls' : activeTab === 'status' ? 'Status' : 'Messages'}
            </h1>
            <p className="sidebar-page-subtitle">
              {activeTab === 'calls'
                ? 'Incoming, outgoing and missed'
                : activeTab === 'status'
                  ? 'Recent updates from your contacts'
                  : 'Encrypted conversations'}
            </p>
          </div>

          <div className="sidebar-actions">
            <IconBtn title="Account" onClick={() => setShowProfile(true)}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </IconBtn>
            <IconBtn title="Search" className="sidebar-action-mobile" onClick={() => {}}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </IconBtn>
            <Dropdown
              isOpen={showMenu}
              onClose={() => setShowMenu(false)}
              trigger={
                <IconBtn onClick={() => setShowMenu(!showMenu)} title="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="5" r="1" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                    <circle cx="12" cy="19" r="1" fill="currentColor"/>
                  </svg>
                </IconBtn>
              }
            >
              <DropdownItem onClick={() => { setShowNewGroup(true); setShowMenu(false); }}
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}>
                New Group
              </DropdownItem>
              <DropdownItem onClick={() => { toggleTheme(); setShowMenu(false); }}>
                {isDark ? 'Light mode' : 'Dark mode'}
              </DropdownItem>
              <div className="dropdown-divider" />
              <DropdownItem onClick={logout} danger
                icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>}>
                Logout
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        <div className="search-bar">
          <div className="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => { setSearch(''); setSearchResults([]); }} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'messages' && (
          <div className="sidebar-chat-filters">
            {['all', 'unread', 'favorites', 'groups'].map((filter) => (
              <button
                key={filter}
                type="button"
                className={`sidebar-chat-filter ${messageFilter === filter ? 'active' : ''}`}
                onClick={() => setMessageFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {!search && activeTab === 'messages' && (
          <div className="sidebar-section status-strip-section">
            <div className="status-strip-header">
              <div className="chat-list-heading">Status</div>
              <button
                type="button"
                className="status-strip-add-btn"
                onClick={() => {
                  setEditingStatus(null);
                  setShowStatusComposer(true);
                }}
              >
                Add
              </button>
            </div>
            <div className="status-strip">
              <button
                className={`story-chip story-chip-you status-chip ${ownStatusGroup?.statuses?.length ? 'has-status' : ''}`}
                onClick={() => ownStatusGroup ? openViewer(ownStatusGroup) : setShowStatusComposer(true)}
              >
                <div className="story-chip-you-wrap">
                  <Avatar
                    src={user.avatar}
                    name={user.displayName || user.username}
                    size="md"
                  />
                  <span className="story-chip-plus">+</span>
                </div>
                <span>{ownStatusGroup?.statuses?.length ? 'My status' : 'Add status'}</span>
              </button>

              {otherStatusGroups.map((group) => {
                const name = group.user.displayName || group.user.username;

                return (
                  <button
                    key={group.user._id}
                    className={`story-chip status-chip ${group.hasUnviewed ? 'unviewed' : 'viewed'}`}
                    onClick={() => openViewer(group)}
                  >
                    <Avatar
                      src={group.user.avatar}
                      name={name}
                      size="md"
                      showOnline
                      isOnline={onlineUsers.has(group.user._id)}
                    />
                    <span>{truncate(name, 12)}</span>
                  </button>
                );
              })}

              {!loadingStatuses && !ownStatusGroup && otherStatusGroups.length === 0 && (
                <div className="status-empty-copy">Share your first update</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="sidebar-section status-page-section">
            <div className="status-strip-header">
              <div className="chat-list-heading">My Status</div>
              <button
                type="button"
                className="status-strip-add-btn"
                onClick={() => {
                  setEditingStatus(null);
                  setShowStatusComposer(true);
                }}
              >
                Add
              </button>
            </div>

            <div className="status-page-list">
              <button
                className={`status-page-item status-page-item-you ${ownStatusGroup?.statuses?.length ? 'has-status' : ''}`}
                onClick={() => ownStatusGroup ? openViewer(ownStatusGroup) : setShowStatusComposer(true)}
              >
                <div className="status-page-item-main">
                  <div className="story-chip-you-wrap">
                    <Avatar
                      src={user.avatar}
                      name={user.displayName || user.username}
                      size="md"
                    />
                    <span className="story-chip-plus">+</span>
                  </div>
                  <div className="status-page-copy">
                    <strong>{ownStatusGroup?.statuses?.length ? 'My status' : 'Add status'}</strong>
                    <span>{ownStatusGroup?.statuses?.length ? 'Tap to view your updates' : 'Share a photo, video or text update'}</span>
                  </div>
                </div>
              </button>

              <div className="chat-list-heading">Recent Updates</div>

              {otherStatusGroups.map((group) => {
                const name = group.user.displayName || group.user.username;
                const latest = group.statuses[group.statuses.length - 1];

                return (
                  <button
                    key={group.user._id}
                    className={`status-page-item ${group.hasUnviewed ? 'unviewed' : 'viewed'}`}
                    onClick={() => openViewer(group)}
                  >
                    <div className="status-page-item-main">
                      <Avatar
                        src={group.user.avatar}
                        name={name}
                        size="md"
                        showOnline
                        isOnline={onlineUsers.has(group.user._id)}
                      />
                      <div className="status-page-copy">
                        <strong>{name}</strong>
                        <span>{latest ? formatChatTime(latest.createdAt) : 'Recent update'}</span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {!loadingStatuses && !ownStatusGroup && otherStatusGroups.length === 0 && (
                <div className="empty-state sidebar-empty-state" style={{ paddingTop: 40 }}>
                  <div className="empty-state-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 3a9 9 0 1 0 9 9h-4a5 5 0 1 1-5-5V3Z" />
                      <circle cx="17.5" cy="6.5" r="2.5" />
                    </svg>
                  </div>
                  <h3>No status updates yet</h3>
                  <p>Share your first update or check back when your contacts post one.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="chat-list">
        {activeTab === 'messages' && searchResults.length > 0 && (
          <>
            <div className="chat-list-heading">People</div>
            {searchResults.map((u) => (
              <div key={u._id} className="chat-list-item" onClick={() => handleUserClick(u)}>
                <Avatar src={u.avatar} name={u.displayName || u.username} size="md" showOnline isOnline={onlineUsers.has(u._id)} />
                <div className="chat-list-item-info">
                  <div className="chat-list-item-top">
                    <span className="chat-list-item-name">{u.displayName || u.username}</span>
                  </div>
                  <div className="chat-list-item-preview">
                    <span>@{u.username}</span>
                    {u.about && <span> · {truncate(u.about, 30)}</span>}
                  </div>
                </div>
              </div>
            ))}
            {visibleChats.length > 0 && (
              <div className="chat-list-heading">Chats</div>
            )}
          </>
        )}

        {activeTab === 'messages' && searching && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <span className="spinner spinner-sm" />
          </div>
        )}

        {activeTab === 'messages' && !searchResults.length && !searching && (
          <div className="chat-list-heading">
            {search ? 'Matching Chats' : messageFilter === 'all' ? 'Recent Messages' : messageFilter}
          </div>
        )}

        {activeTab === 'messages' && visibleChats.map((chat) => {
          const name = getChatName(chat, user._id);
          const avatar = getChatAvatar(chat, user._id);
          const other = getOtherParticipant(chat, user._id);
          const isOnline = isChatOnline(chat, user._id, onlineUsers);
          const preview = getMessagePreview(chat.lastMessage);
          const isActive = activeChat?._id === chat._id;
          const unread = chat.unreadCount || 0;
          const isSentByMe = chat.lastMessage?.sender?._id === user._id || chat.lastMessage?.sender === user._id;
          const isFavorite = favoriteChatIds.includes(chat._id);

          return (
            <div
              key={chat._id}
              className={`chat-list-item ${isActive ? 'active' : ''}`}
              onClick={() => handleChatClick(chat)}
            >
              <div className="chat-list-avatar-wrap">
                <Avatar
                  src={avatar}
                  name={name}
                  size="md"
                  showOnline={!chat.isGroup}
                  isOnline={isOnline}
                />
              </div>
              <div className="chat-list-item-info">
                <div className="chat-list-item-top">
                  <span className="chat-list-item-name">{name}</span>
                  <div className="chat-list-item-top-actions">
                    <span className="chat-list-item-time">
                      {chat.lastMessage ? formatChatTime(chat.lastMessage.createdAt || chat.updatedAt) : formatChatTime(chat.updatedAt)}
                    </span>
                    <button
                      type="button"
                      className={`chat-favorite-btn ${isFavorite ? 'active' : ''}`}
                      onClick={(event) => handleToggleFavorite(event, chat._id)}
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="m12 17.3-6.18 3.64 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.67 1.64 7.03z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="chat-list-item-preview" style={{ flex: 1, minWidth: 0 }}>
                    {isSentByMe && (
                      <MessageStatusIcon status={chat.lastMessage?.status} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.isGroup && chat.lastMessage && !isSentByMe && chat.lastMessage.sender?.displayName
                        ? `${chat.lastMessage.sender.displayName}: `
                        : ''}
                      {preview || <em style={{ color: 'var(--text-muted)' }}>No messages yet</em>}
                    </span>
                  </div>
                  {unread > 0 && <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>}
                </div>
                {!chat.isGroup && other?.about && !preview && (
                  <div className="chat-list-meta">{truncate(other.about, 56)}</div>
                )}
              </div>
            </div>
          );
        })}

        {activeTab === 'messages' && !searching && visibleChats.length === 0 && searchResults.length === 0 && (
          <div className="empty-state sidebar-empty-state" style={{ paddingTop: 60 }}>
            <div className="empty-state-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3>{search ? 'No results' : 'No chats found'}</h3>
            <p>{search ? 'Try a different name or username' : `No chats match the ${messageFilter} filter right now.`}</p>
          </div>
        )}

        {activeTab === 'calls' && (
          <>
            <div className="chat-list-heading">Recent Calls</div>
            {callLogs.length > 0 ? callLogs.map((call) => (
              <div key={call.id} className="chat-list-item call-list-item">
                <div className="chat-list-avatar-wrap">
                  <Avatar src={call.avatar} name={call.name} size="md" />
                </div>
                <div className="chat-list-item-info">
                  <div className="chat-list-item-top">
                    <span className={`chat-list-item-name ${call.outcome === 'missed' || call.outcome === 'declined' ? 'call-missed-name' : ''}`}>{call.name}</span>
                    <span className="chat-list-item-time">{formatChatTime(call.timestamp)}</span>
                  </div>
                  <div className="call-list-item-preview">
                    <span className={`call-direction-icon ${call.outcome}`}>
                      {renderCallDirectionIcon(call)}
                    </span>
                    <span>{formatCallSummary(call)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="call-list-action"
                  onClick={() => {
                    const matchedChat = chats.find((chat) => chat._id === call.chatId);
                    if (matchedChat) {
                      selectChat(matchedChat);
                      setActiveTab('messages');
                      onChatSelect?.();
                    }
                  }}
                  title="Open chat"
                >
                  {call.callType === 'video' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23 7l-7 5 7 5V7Z" />
                      <rect x="1" y="5" width="15" height="14" rx="3" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18.85 19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.33 2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
                    </svg>
                  )}
                </button>
              </div>
            )) : (
              <div className="empty-state sidebar-empty-state" style={{ paddingTop: 60 }}>
                <div className="empty-state-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18.85 19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.33 2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/>
                  </svg>
                </div>
                <h3>No calls yet</h3>
                <p>Your incoming, outgoing, and missed calls will show up here.</p>
              </div>
            )}
          </>
        )}
      </div>

        <div className="mobile-chat-nav">
          <button className={`mobile-chat-nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Chats</span>
          </button>
          <button className={`mobile-chat-nav-item ${activeTab === 'calls' ? 'active' : ''}`} onClick={() => setActiveTab('calls')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.19 18.85 19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.33 2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>Calls</span>
          </button>
          <button className={`mobile-chat-nav-item ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3a9 9 0 1 0 9 9h-4a5 5 0 1 1-5-5V3Z" />
              <circle cx="17.5" cy="6.5" r="2.5" />
            </svg>
            <span>Status</span>
          </button>
          <button className="mobile-chat-nav-item mobile-chat-nav-item-menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
            <span>Menu</span>
          </button>
          <button className="mobile-compose-fab" onClick={() => setShowNewGroup(true)} title="Compose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {showNewGroup && (
        <NewGroupModal onClose={() => setShowNewGroup(false)} onCreated={(chat) => {
          updateChatList(chat);
          selectChat(chat);
          setShowNewGroup(false);
          onChatSelect?.();
        }} />
      )}
      {showProfile && <ProfileSettingsModal onClose={() => setShowProfile(false)} />}
      <StatusComposerModal
        isOpen={showStatusComposer}
        onClose={() => { setShowStatusComposer(false); setEditingStatus(null); }}
        onSaved={upsertStatusGroup}
        status={editingStatus}
      />
      <StatusViewerModal
        isOpen={Boolean(viewerGroup)}
        onClose={() => setViewerGroup(null)}
        group={viewerGroup}
        initialIndex={viewerIndex}
        onView={markStatusViewed}
        onEdit={(status) => {
          setViewerGroup(null);
          setEditingStatus(status);
          setShowStatusComposer(true);
        }}
        onDelete={handleDeleteStatus}
      />
    </div>
  );
}

function MessageStatusIcon({ status }) {
  if (!status) return null;
  const color = status === 'seen' ? '#53bdeb' : 'var(--text-muted)';
  if (status === 'sent') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={{ flexShrink: 0, marginRight: 2 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  return (
    <svg width="16" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={{ flexShrink: 0, marginRight: 2 }}>
      <polyline points="17 6 7 16 2 11"/><polyline points="23 6 13 16 10.5 13.5"/>
    </svg>
  );
}

function formatCallSummary(call) {
  const typeLabel = call.callType === 'video' ? 'video call' : 'voice call';

  if (call.outcome === 'missed') return `Missed ${typeLabel}`;
  if (call.outcome === 'declined') return `Declined ${typeLabel}`;
  if (call.direction === 'incoming') return `Incoming ${typeLabel}`;
  return `Outgoing ${typeLabel}`;
}

function renderCallDirectionIcon(call) {
  const color = call.outcome === 'missed' || call.outcome === 'declined' ? '#ff6e84' : '#81ecff';
  const incoming = call.direction === 'incoming';

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {incoming ? (
        <>
          <path d="M7 17 17 7" />
          <path d="M9 7h8v8" />
        </>
      ) : (
        <>
          <path d="M7 7 17 17" />
          <path d="M17 9v8H9" />
        </>
      )}
    </svg>
  );
}
