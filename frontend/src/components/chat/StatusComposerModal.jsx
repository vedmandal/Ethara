import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../shared/Modal';
import { statusAPI, uploadAPI } from '../../services/api';
import { formatFileSize, getFileIcon } from '../../utils/helpers';

const BACKGROUNDS = [
  'linear-gradient(135deg, #b6a0ff 0%, #7e51ff 100%)',
  'linear-gradient(135deg, #81ecff 0%, #00d4ec 100%)',
  'linear-gradient(135deg, #131313 0%, #343d96 100%)',
  'linear-gradient(135deg, #ff6e84 0%, #d73357 100%)',
  'linear-gradient(135deg, #1a1a1a 0%, #005762 100%)',
];

export default function StatusComposerModal({ isOpen, onClose, onSaved, status }) {
  const [text, setText] = useState('');
  const [background, setBackground] = useState(BACKGROUNDS[0]);
  const [media, setMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setText(status?.text || '');
    setBackground(status?.background || BACKGROUNDS[0]);
    setMedia(status?.media?.url ? status.media : null);
    setError('');
    setUploading(false);
    setSaving(false);
  }, [isOpen, status]);

  const title = status ? 'Edit Status' : 'Create Status';
  const previewStyle = useMemo(() => (
    media?.url
      ? {}
      : { background }
  ), [background, media]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    const input = event.target;
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext);
    const isDocument = ['pdf'].includes(ext);

    if (!isImage && !isVideo && !isDocument) {
      setError('Only image, video, and PDF files can be used for status.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await uploadAPI.uploadFile(formData);
      setMedia({
        url: data.url,
        type: data.type,
        name: data.name,
        size: data.size,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload media.');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !media?.url) {
      setError('Add some text or choose media for your status.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        text: text.trim(),
        media,
        background,
      };
      const { data } = status
        ? await statusAPI.updateStatus(status._id, payload)
        : await statusAPI.createStatus(payload);

      onSaved?.(data.status, Boolean(status));
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth={560}
      className="status-composer-modal"
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving || uploading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || uploading}>
            {saving ? 'Saving...' : status ? 'Save Changes' : 'Post Status'}
          </button>
        </>
      )}
    >
      <div className="status-composer">
        <div className="status-composer-preview" style={previewStyle}>
          <span className="status-composer-preview-badge">ETHER Status</span>
          {media?.url ? (
            media.type === 'video' ? (
              <video src={media.url} controls className="status-composer-media" />
            ) : media.type === 'document' ? (
              <div className="status-composer-document">
                <div className="status-composer-document-icon">{getFileIcon(media.name?.split('.').pop())}</div>
                <strong>{media.name || 'Document'}</strong>
                <span>{formatFileSize(media.size) || 'PDF Document'}</span>
              </div>
            ) : (
              <img src={media.url} alt={media.name || 'status media'} className="status-composer-media" />
            )
          ) : (
            <p>{text || 'Your status preview'}</p>
          )}
        </div>

        <div className="status-composer-controls">
          <textarea
            className="status-composer-textarea"
            placeholder="Write a status..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={500}
          />

          <div className="status-composer-actions">
            <label className="status-upload-btn">
              <input type="file" accept="image/*,video/*,.pdf,application/pdf" onChange={handleFileChange} hidden />
              <span>{uploading ? 'Uploading...' : media?.url ? 'Replace Media' : 'Add Photo, Video or PDF'}</span>
            </label>
            {media?.url && (
              <button
                className="status-clear-btn"
                onClick={() => setMedia(null)}
                type="button"
              >
                Remove Media
              </button>
            )}
          </div>

          <div className="status-backgrounds">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg}
                type="button"
                className={`status-background-swatch ${background === bg ? 'active' : ''}`}
                style={{ background: bg }}
                onClick={() => setBackground(bg)}
                aria-label="Choose status background"
              />
            ))}
          </div>

          <div className="status-composer-meta">
            <span>{text.length}/500</span>
            <span>Status disappears after 24 hours</span>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>
      </div>
    </Modal>
  );
}
