import React, { useEffect, useMemo, useState } from 'react';

const isVideoFile = (file) => file.type.startsWith('video/');

export default function MediaComposerModal({
  isOpen,
  items,
  onClose,
  onAddMore,
  onSubmit,
  submitting,
}) {
  const [step, setStep] = useState('gallery');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const ids = items.map((item) => item.id);
    setSelectedIds(ids);
    setActiveId(ids[0] || null);
    setCaption('');
    setStep(ids.length > 1 ? 'gallery' : 'preview');
  }, [isOpen, items]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  const activeItem = useMemo(
    () => selectedItems.find((item) => item.id === activeId) || selectedItems[0] || null,
    [selectedItems, activeId]
  );

  if (!isOpen) return null;

  const toggleSelection = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        const next = current.filter((value) => value !== id);
        if (id === activeId) setActiveId(next[0] || null);
        return next;
      }
      return [...current, id];
    });
  };

  const handlePrimary = () => {
    if (!selectedItems.length) return;
    if (step === 'gallery') {
      setActiveId(selectedItems[0].id);
      setStep('preview');
      return;
    }
    onSubmit(selectedItems, caption);
  };

  const getSelectionOrder = (id) => {
    const index = selectedIds.indexOf(id);
    return index === -1 ? null : index + 1;
  };

  return (
    <div className="media-composer-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {step === 'gallery' ? (
        <div className="media-gallery-shell">
          <header className="media-gallery-header">
            <div className="media-gallery-header-left">
              <button className="media-composer-icon-btn" onClick={onClose} type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <div className="media-gallery-title-wrap">
                <h2>All Photos</h2>
                <span>Selected media</span>
              </div>
            </div>
            <button className="media-composer-icon-btn media-composer-icon-btn-accent" type="button" onClick={handlePrimary}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1.2 14.2-3.6-3.6 1.4-1.4 2.2 2.2 4.6-4.6 1.4 1.4Z" />
              </svg>
            </button>
          </header>

          <div className="media-gallery-grid">
            <button className="media-gallery-camera" type="button" onClick={onAddMore}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h3l2-2h6l2 2h3v10H4z" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
              <span>Add More</span>
            </button>

            {items.map((item) => {
              const order = getSelectionOrder(item.id);
              const selected = order !== null;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`media-gallery-tile ${selected ? 'selected' : ''}`}
                  onClick={() => toggleSelection(item.id)}
                >
                  {isVideoFile(item.file) ? (
                    <video src={item.previewUrl} muted playsInline />
                  ) : (
                    <img src={item.previewUrl} alt={item.file.name} />
                  )}

                  {isVideoFile(item.file) && (
                    <div className="media-gallery-badge media-gallery-video">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="m16 10 5-3v10l-5-3v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2Z" />
                      </svg>
                      Video
                    </div>
                  )}

                  {selected && (
                    <>
                      <div className="media-gallery-selection">{order}</div>
                      <div className="media-gallery-overlay" />
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <footer className="media-gallery-footer">
            <div className="media-gallery-selection-strip">
              {selectedItems.map((item) => (
                <div key={item.id} className="media-gallery-selection-thumb">
                  {isVideoFile(item.file) ? (
                    <video src={item.previewUrl} muted playsInline />
                  ) : (
                    <img src={item.previewUrl} alt={item.file.name} />
                  )}
                </div>
              ))}
              <button className="media-gallery-selection-add" type="button" onClick={onAddMore}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>

            <div className="media-gallery-cta">
              <div>
                <strong>{selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected</strong>
                <span>Photos and videos</span>
              </div>
              <button className="media-composer-primary-btn" type="button" onClick={handlePrimary}>
                Add to Message
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 20 21 12 3 4l2.8 6.5L14 12l-8.2 1.5L3 20Z" />
                </svg>
              </button>
            </div>
          </footer>
        </div>
      ) : (
        <div className="media-preview-shell">
          <header className="media-preview-header">
            <div className="media-gallery-header-left">
              <button className="media-composer-icon-btn" onClick={() => setStep(selectedItems.length > 1 ? 'gallery' : 'preview')} type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <h2>Share Media</h2>
            </div>
            <button className="media-composer-icon-btn media-composer-icon-btn-accent" type="button" onClick={handlePrimary}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1.2 14.2-3.6-3.6 1.4-1.4 2.2 2.2 4.6-4.6 1.4 1.4Z" />
              </svg>
            </button>
          </header>

          <div className="media-preview-stage">
            {activeItem && (
              <div className="media-preview-canvas">
                {isVideoFile(activeItem.file) ? (
                  <video src={activeItem.previewUrl} controls playsInline className="media-preview-asset" />
                ) : (
                  <img src={activeItem.previewUrl} alt={activeItem.file.name} className="media-preview-asset" />
                )}

                <div className="media-preview-tools">
                  {['crop', 'title', 'draw', 'sticky'].map((tool) => (
                    <button key={tool} type="button" className="media-preview-tool">
                      <span>{tool.slice(0, 1).toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <footer className="media-preview-footer">
            <div className="media-preview-thumb-strip">
              {selectedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`media-preview-thumb ${activeItem?.id === item.id ? 'active' : ''}`}
                  onClick={() => setActiveId(item.id)}
                >
                  {isVideoFile(item.file) ? (
                    <video src={item.previewUrl} muted playsInline />
                  ) : (
                    <img src={item.previewUrl} alt={item.file.name} />
                  )}
                </button>
              ))}
              <button className="media-gallery-selection-add" type="button" onClick={onAddMore}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>

            <div className="media-preview-compose">
              <input
                type="text"
                placeholder="Add a caption..."
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
              />
              <button className="media-composer-send-btn" type="button" onClick={handlePrimary} disabled={submitting}>
                {submitting ? (
                  <span className="spinner spinner-sm" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 20 21 12 3 4l2.8 6.5L14 12l-8.2 1.5L3 20Z" />
                  </svg>
                )}
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
