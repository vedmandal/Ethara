import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { chatAPI, userAPI } from '../../services/api';
import Avatar from '../shared/Avatar';
import IconBtn from '../shared/IconBtn';
import { getChatName, getChatAvatar, getOtherParticipant, formatLastSeen, isChatOnline } from '../../utils/helpers';

export default function ProfilePanel({ chat, onClose }) {
  const { user } = useAuth();
  const { onlineUsers, fetchChats, updateChatList, setActiveChat } = useChat();
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [panelError, setPanelError] = useState('');

  const name = getChatName(chat, user._id);
  const avatar = getChatAvatar(chat, user._id);
  const other = getOtherParticipant(chat, user._id);
  const isOnline = isChatOnline(chat, user._id, onlineUsers);

  const refreshGroup = async (chatId) => {
    const { data } = await chatAPI.getChatById(chatId);
    updateChatList(data.chat);
    setActiveChat(data.chat);
    return data.chat;
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      setActionLoadingId(userId);
      await chatAPI.removeFromGroup(chat._id, userId);
      await refreshGroup(chat._id);
      await fetchChats();
    } catch (err) {
      setPanelError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setActionLoadingId('');
    }
  };

  const isAdmin = chat.isGroup && chat.groupAdmins?.some((a) => (a._id || a) === user._id);
  const isOwner = chat.isGroup && (chat.groupAdmin?._id || chat.groupAdmin) === user._id;

  const searchTimeout = React.useRef(null);
  const handleMemberSearch = (value) => {
    setMemberQuery(value);
    setPanelError('');
    clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setMemberResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        setMemberLoading(true);
        const { data } = await userAPI.search(value);
        const existingIds = new Set((chat.participants || []).map((p) => p._id || p));
        setMemberResults((data.users || []).filter((u) => !existingIds.has(u._id)));
      } catch (err) {
        setPanelError(err.response?.data?.message || 'Failed to search users');
      } finally {
        setMemberLoading(false);
      }
    }, 300);
  };

  const handleAddMember = async (userId) => {
    try {
      setActionLoadingId(userId);
      setPanelError('');
      await chatAPI.addToGroup(chat._id, userId);
      await refreshGroup(chat._id);
      await fetchChats();
      setMemberResults((prev) => prev.filter((item) => item._id !== userId));
      setMemberQuery('');
      setShowAddMembers(false);
    } catch (err) {
      setPanelError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setActionLoadingId('');
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      setActionLoadingId(`admin-${userId}`);
      setPanelError('');
      await chatAPI.makeAdmin(chat._id, userId);
      await refreshGroup(chat._id);
      await fetchChats();
    } catch (err) {
      setPanelError(err.response?.data?.message || 'Failed to update admin');
    } finally {
      setActionLoadingId('');
    }
  };

  return (
    <div className="profile-panel">
      <div className="profile-panel-header">
        <IconBtn onClick={onClose} title="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </IconBtn>
        <h3>{chat.isGroup ? 'Group Info' : 'Contact Info'}</h3>
      </div>

      {/* Banner */}
      <div className="profile-banner">
        <Avatar src={avatar} name={name} size="xl" showOnline={!chat.isGroup} isOnline={isOnline} />
        <div className="profile-banner-name">{name}</div>
        <div className="profile-banner-status">
          {chat.isGroup
            ? `${chat.participants?.length || 0} members`
            : formatLastSeen(other?.lastSeen, isOnline)
          }
        </div>
      </div>

      {/* Info rows */}
      {!chat.isGroup && other && (
        <>
          <div className="profile-info-row">
            <div style={{ flex: 1 }}>
              <div className="profile-info-label">About</div>
              <div className="profile-info-value">{other.about || 'Hey there! I am using Pulse Chat.'}</div>
            </div>
          </div>
          <div className="profile-info-row">
            <div style={{ flex: 1 }}>
              <div className="profile-info-label">Username</div>
              <div className="profile-info-value">@{other.username}</div>
            </div>
          </div>
        </>
      )}

      {chat.isGroup && (
        <>
          {panelError && <div className="ether-group-error" style={{ margin: '0 18px 14px' }}>{panelError}</div>}

          {chat.groupDescription && (
            <div className="profile-info-row">
              <div style={{ flex: 1 }}>
                <div className="profile-info-label">Description</div>
                <div className="profile-info-value">{chat.groupDescription}</div>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="profile-info-row" style={{ display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div className="profile-info-label">Group Management</div>
                  <div className="profile-info-value">Add members and manage admin access</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddMembers((current) => !current)}>
                  {showAddMembers ? 'Close' : 'Add Members'}
                </button>
              </div>

              {showAddMembers && (
                <div style={{ marginTop: 14 }}>
                  <div className="search-input-wrap" style={{ marginBottom: 10 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      placeholder="Search people to add"
                      value={memberQuery}
                      onChange={(e) => handleMemberSearch(e.target.value)}
                    />
                  </div>
                  <div className="ether-group-results" style={{ maxHeight: 220 }}>
                    {memberLoading && <div className="ether-group-empty">Searching...</div>}
                    {!memberLoading && memberResults.map((result) => (
                      <div key={result._id} className="ether-group-result">
                        <Avatar src={result.avatar} name={result.displayName || result.username} size="sm" />
                        <div className="ether-group-result-copy" style={{ flex: 1 }}>
                          <div>{result.displayName || result.username}</div>
                          <div>@{result.username}</div>
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddMember(result._id)}
                          disabled={actionLoadingId === result._id}
                        >
                          {actionLoadingId === result._id ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    ))}
                    {!memberLoading && memberQuery && memberResults.length === 0 && (
                      <div className="ether-group-empty">No available users found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members */}
          <div style={{ padding: '12px 0' }}>
            <div
              style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setShowMembers(!showMembers)}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>
                {chat.participants?.length || 0} Members
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: showMembers ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {showMembers && (chat.participants || []).map((participant) => {
              const p = typeof participant === 'object' ? participant : { _id: participant };
              const pIsOnline = onlineUsers.has(p._id);
              const pIsAdmin = chat.groupAdmins?.some((a) => (a._id || a) === p._id);
              const isCurrentUser = p._id === user._id;

              return (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px' }}>
                  <Avatar src={p.avatar} name={p.displayName || p.username} size="sm" showOnline isOnline={pIsOnline} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {p.displayName || p.username}
                      {isCurrentUser && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (You)</span>}
                    </div>
                    {pIsAdmin && (
                      <div style={{ fontSize: 11, color: 'var(--green-primary)', fontWeight: 600 }}>Admin</div>
                    )}
                  </div>
                  {isOwner && !isCurrentUser && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleAdmin(p._id)}
                      disabled={actionLoadingId === `admin-${p._id}`}
                      style={{ minWidth: 92 }}
                    >
                      {actionLoadingId === `admin-${p._id}`
                        ? 'Saving...'
                        : pIsAdmin ? 'Remove Admin' : 'Make Admin'}
                    </button>
                  )}
                  {isAdmin && !isCurrentUser && (
                    <IconBtn
                      onClick={() => handleRemoveMember(p._id)}
                      title="Remove"
                      disabled={actionLoadingId === p._id}
                      style={{ width: 28, height: 28, color: '#ef4444' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </IconBtn>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Leave group */}
      {chat.isGroup && (
        <div style={{ padding: '16px 20px', marginTop: 'auto', borderTop: '1px solid var(--border-color)' }}>
          <button
            className="btn btn-outline btn-full"
            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
            onClick={async () => {
              if (!window.confirm('Leave this group?')) return;
              try {
                await chatAPI.removeFromGroup(chat._id, user._id);
                onClose();
                fetchChats();
              } catch (err) {
                alert(err.response?.data?.message || 'Failed to leave group');
              }
            }}
          >
            Leave Group
          </button>
        </div>
      )}
    </div>
  );
}
