import React, { useEffect } from 'react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 480,
  className = '',
  bodyClassName = '',
  hideHeader = false,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${className}`.trim()} style={{ maxWidth }}>
        {!hideHeader && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button
              className="icon-btn"
              onClick={onClose}
              style={{ width: 32, height: 32 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}
        <div className={`modal-body ${bodyClassName}`.trim()}>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
