import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../shared/Modal';
import Avatar from '../shared/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { formatFileSize, getFileIcon } from '../../utils/helpers';

const STORY_DURATION_MS = 5000;

export default function StatusViewerModal({
  isOpen,
  onClose,
  group,
  initialIndex = 0,
  onView,
  onEdit,
  onDelete,
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const statuses = group?.statuses || [];
  const activeStatus = statuses[activeIndex];
  const isOwner = activeStatus?.canManage;
  const duration = activeStatus?.media?.type === 'video' ? 8000 : STORY_DURATION_MS;

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(initialIndex);
  }, [isOpen, initialIndex, group?.user?._id]);

  useEffect(() => {
    if (!statuses.length) {
      onClose?.();
      return;
    }
    setActiveIndex((curr) => Math.min(curr, statuses.length - 1));
  }, [statuses.length, onClose]);

  useEffect(() => {
    if (!isOpen || !activeStatus) return;
    onView?.(activeStatus);
  }, [isOpen, activeStatus, onView]);

  useEffect(() => {
    if (!isOpen || statuses.length <= 1) return undefined;
    const timer = window.setTimeout(() => {
      setActiveIndex((curr) => {
        if (curr >= statuses.length - 1) {
          onClose?.();
          return curr;
        }
        return curr + 1;
      });
    }, duration);

    return () => window.clearTimeout(timer);
  }, [isOpen, statuses.length, activeIndex, activeStatus, onClose, duration]);

  const contentStyle = useMemo(() => (
    activeStatus?.media?.url
      ? {}
      : { background: activeStatus?.background || 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }
  ), [activeStatus]);

  if (!group || !activeStatus) return null;

  const handlePrev = () => {
    setActiveIndex((curr) => Math.max(0, curr - 1));
  };

  const handleNext = () => {
    if (activeIndex >= statuses.length - 1) {
      onClose?.();
      return;
    }
    setActiveIndex((curr) => curr + 1);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth={920}
      className="status-viewer-modal"
      bodyClassName="status-viewer-modal-body"
      hideHeader
    >
      <div className="status-viewer">
        <div className="status-viewer-stage" style={contentStyle}>
          <div className="status-viewer-overlay top" />
          <div className="status-viewer-overlay bottom" />

          <div className="status-viewer-stage-top">
            <div className="status-viewer-progress">
              {statuses.map((status, index) => (
                <span
                  key={status._id}
                  className={`status-progress-bar ${index < activeIndex ? 'complete' : ''} ${index === activeIndex ? 'active' : ''}`}
                >
                  <span
                    className="status-progress-fill"
                    style={index === activeIndex ? { animationDuration: `${duration}ms` } : undefined}
                  />
                </span>
              ))}
            </div>

            <div className="status-viewer-header">
              <div className="status-viewer-user">
                <Avatar
                  src={group.user.avatar}
                  name={group.user.displayName || group.user.username}
                  size="sm"
                />
                <div>
                  <strong>{group.user.displayName || group.user.username}</strong>
                  <span>{formatDistanceToNow(new Date(activeStatus.createdAt), { addSuffix: true })}</span>
                </div>
              </div>

              <div className="status-viewer-actions">
                {isOwner && (
                  <>
                    <button className="icon-btn" onClick={() => onEdit?.(activeStatus)} title="Edit status">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button className="icon-btn" onClick={() => onDelete?.(activeStatus)} title="Delete status">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </>
                )}
                <button className="icon-btn status-viewer-close" onClick={onClose} title="Close status">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M18 6 6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="status-viewer-stage-center">
          {activeStatus.media?.url ? (
            activeStatus.media.type === 'video' ? (
              <video src={activeStatus.media.url} controls autoPlay className="status-viewer-media" />
            ) : activeStatus.media.type === 'document' ? (
              <a href={activeStatus.media.url} target="_blank" rel="noreferrer" className="status-viewer-document">
                <div className="status-viewer-document-icon">{getFileIcon(activeStatus.media.name?.split('.').pop())}</div>
                <strong>{activeStatus.media.name || 'Document'}</strong>
                <span>{formatFileSize(activeStatus.media.size) || 'Open document'}</span>
              </a>
            ) : (
              <img src={activeStatus.media.url} alt={activeStatus.media.name || 'status media'} className="status-viewer-media" />
            )
          ) : (
            <div className="status-viewer-text">{activeStatus.text || 'Status'}</div>
          )}
          </div>

          <div className="status-viewer-stage-bottom">
            {activeStatus.text && activeStatus.media?.url && (
              <div className="status-viewer-caption">{activeStatus.text}</div>
            )}

            <div className="status-viewer-footer">
              {isOwner ? (
                <span>{activeStatus.viewCount} view{activeStatus.viewCount === 1 ? '' : 's'}</span>
              ) : (
                <span>{activeIndex + 1} / {statuses.length}</span>
              )}
              <span className="status-viewer-footer-type">
                {activeStatus.media?.type === 'video' ? 'Video update' : activeStatus.media?.type === 'document' ? 'Document update' : activeStatus.media?.url ? 'Photo update' : 'Text update'}
              </span>
            </div>
          </div>

          <button className="status-nav prev" onClick={handlePrev} disabled={activeIndex === 0}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button className="status-nav next" onClick={handleNext}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <button className="status-tap-zone prev" onClick={handlePrev} aria-label="Previous status" />
          <button className="status-tap-zone next" onClick={handleNext} aria-label="Next status" />
        </div>
      </div>
    </Modal>
  );
}
