import React, { useState, useCallback } from 'react';
import { chatAPI, userAPI } from '../../services/api';
import Modal from '../shared/Modal';
import Avatar from '../shared/Avatar';

export default function NewGroupModal({ onClose, onCreated }) {
  const [step, setStep] = useState('add'); // add | details
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchTimeout = React.useRef(null);
  const handleSearch = (val) => {
    setSearchQuery(val);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data } = await userAPI.search(val);
        setSearchResults(data.users.filter((u) => !selected.find((s) => s._id === u._id)));
      } catch {}
    }, 300);
  };

  const toggleUser = useCallback((user) => {
    setSelected((prev) => {
      const exists = prev.find((u) => u._id === user._id);
      return exists ? prev.filter((u) => u._id !== user._id) : [...prev, user];
    });
    setSearchResults((prev) => prev.filter((u) => u._id !== user._id));
  }, []);

  const handleCreate = async () => {
    if (!groupName.trim()) { setError('Group name is required'); return; }
    if (selected.length < 1) { setError('Select at least 1 participant'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await chatAPI.createGroup({
        name: groupName,
        participants: selected.map((u) => u._id),
        description,
      });
      onCreated(data.chat);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally { setLoading(false); }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={step === 'add' ? 'New Group' : 'Group Details'}
      className="ether-group-modal"
    >
      {error && <div className="ether-group-error">{error}</div>}

      {step === 'add' && (
        <>
          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="ether-group-chip-list">
              {selected.map((u) => (
                <div key={u._id} className="ether-group-chip">
                  <Avatar src={u.avatar} name={u.displayName || u.username} size="sm" style={{ width: 22, height: 22, fontSize: 10 }} />
                  <span>{u.displayName || u.username}</span>
                  <button onClick={() => toggleUser(u)} type="button">×</button>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="search-input-wrap" style={{ marginBottom: 12 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Search people to add"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="ether-group-results">
            {searchResults.map((u) => (
              <div
                key={u._id}
                onClick={() => toggleUser(u)}
                className="ether-group-result"
              >
                <Avatar src={u.avatar} name={u.displayName || u.username} size="md" />
                <div className="ether-group-result-copy">
                  <div>{u.displayName || u.username}</div>
                  <div>@{u.username}</div>
                </div>
              </div>
            ))}
            {searchQuery && searchResults.length === 0 && (
              <div className="ether-group-empty">No users found</div>
            )}
            {!searchQuery && selected.length === 0 && (
              <div className="ether-group-empty">Start typing to find people</div>
            )}
          </div>

          <div className="ether-group-action-bar">
            <div className="ether-group-action-copy">
              <strong>{selected.length} selected</strong>
              <span>Select at least 1 person to continue</span>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (selected.length < 1) {
                  setError('Add at least 1 member');
                  return;
                }
                setError('');
                setStep('details');
              }}
              disabled={selected.length < 1}
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === 'details' && (
        <>
          {/* Members preview */}
          <div className="ether-group-member-preview">
            {selected.map((u) => (
              <div key={u._id} className="ether-group-member">
                <Avatar src={u.avatar} name={u.displayName || u.username} size="sm" />
                <span>
                  {u.displayName || u.username}
                </span>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Group Name *</label>
            <input className="form-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="My Awesome Group" autoFocus maxLength={50} />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this group about?" rows={3} maxLength={200} style={{ resize: 'vertical' }} />
          </div>

          <div className="ether-group-action-bar">
            <button className="btn btn-secondary" onClick={() => setStep('add')}>Back</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? <span className="spinner spinner-sm" /> : 'Create Group'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
