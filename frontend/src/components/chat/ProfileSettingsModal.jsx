import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, uploadAPI } from '../../services/api';
import Modal from '../shared/Modal';
import Avatar from '../shared/Avatar';

export default function ProfileSettingsModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    displayName: user.displayName || '',
    about: user.about || '',
    phone: user.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('profile'); // profile | password
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const fileRef = useRef(null);

  const handleSave = async () => {
    setLoading(true); setError(''); setSuccess(false);
    try {
      const { data } = await userAPI.updateProfile(form);
      updateUser(data.user);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally { setLoading(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    setUploading(true);
    try {
      const { data } = await uploadAPI.uploadAvatar(formData);
      const { data: ud } = await userAPI.updateProfile({ avatar: data.url });
      updateUser(ud.user);
    } catch (err) {
      setError('Failed to upload avatar');
    } finally { setUploading(false); }
  };

  const handlePasswordChange = async () => {
    if (passwords.newPass !== passwords.confirm) { setError('Passwords do not match'); return; }
    if (passwords.newPass.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      await userAPI.changePassword({ currentPassword: passwords.current, newPassword: passwords.newPass });
      setSuccess(true);
      setPasswords({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Account"
      className="profile-settings-modal"
      bodyClassName="profile-settings-modal-body"
      maxWidth={640}
    >
      <div className="profile-settings-hero">
        <button className="profile-settings-avatar-btn" type="button" onClick={() => fileRef.current?.click()}>
          <Avatar src={user.avatar} name={user.displayName || user.username} size="xl" />
          <span className="profile-settings-avatar-badge">
            {uploading ? (
              <span className="spinner spinner-sm" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </span>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </button>
        <div className="profile-settings-hero-copy">
          <strong>{user.displayName || user.username}</strong>
          <span>@{user.username}</span>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="profile-settings-tabs">
        {['profile', 'password'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`profile-settings-tab ${tab === t ? 'active' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="profile-settings-alert error">{error}</div>}
      {success && <div className="profile-settings-alert success">Saved successfully</div>}

      {tab === 'profile' && (
        <div className="profile-settings-form">
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input className="form-input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your name" />
          </div>
          <div className="form-group">
            <label className="form-label">About</label>
            <textarea
              className="form-input"
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              placeholder="Tell people about yourself"
              rows={3}
              maxLength={150}
              className="form-input profile-settings-textarea"
            />
            <div className="profile-settings-counter">{form.about.length}/150</div>
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 890" />
          </div>

          <button className="btn btn-primary btn-full profile-settings-save" onClick={handleSave} disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Save Changes'}
          </button>
        </div>
      )}

      {tab === 'password' && (
        <div className="profile-settings-form">
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} placeholder="Current password" />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={passwords.newPass} onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })} placeholder="Min. 6 characters" />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Repeat new password" />
          </div>
          <button className="btn btn-primary btn-full profile-settings-save" onClick={handlePasswordChange} disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Change Password'}
          </button>
        </div>
      )}
    </Modal>
  );
}
