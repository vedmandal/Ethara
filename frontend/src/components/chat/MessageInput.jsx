import React, { useState, useRef, useCallback } from 'react';
import { messageAPI, uploadAPI } from '../../services/api';
import { useChat } from '../../context/ChatContext';
import { useTyping } from '../../hooks/useTyping';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import MediaComposerModal from './MediaComposerModal';

const COMMON_EMOJIS = [
  '😀','😂','😍','🥰','😎','😭','😤','🤔','👍','👎','❤️','🔥',
  '✨','🎉','🙏','💪','🤣','😊','🥺','😳','🫡','🤝','👋','💯',
  '😢','😡','🤯','🥳','🫶','💀','👀','🫠','😴','🤢','😱','🎊',
];

export default function MessageInput({ chatId, replyTo, onClearReply, editingMessage, onCancelEdit }) {
  const { addMessage } = useChat();
  const { startTyping, stopTyping } = useTyping(chatId);
  const {
    isRecording, duration, audioBlob,
    startRecording, stopRecording, cancelRecording, formatDuration,
  } = useVoiceRecorder();

  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaComposerOpen, setMediaComposerOpen] = useState(false);
  const [mediaQueue, setMediaQueue] = useState([]);
  const textareaRef = useRef(null);
  const mediaInputRef = useRef(null);
  const docInputRef = useRef(null);
  const mediaQueueRef = useRef([]);

  React.useEffect(() => {
    mediaQueueRef.current = mediaQueue;
  }, [mediaQueue]);

  React.useEffect(() => (
    () => {
      mediaQueueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    }
  ), []);

  React.useEffect(() => {
    if (!editingMessage) return;
    setText(editingMessage.content || '');
    requestAnimationFrame(() => {
      autoResize();
      textareaRef.current?.focus();
    });
  }, [editingMessage]);

  // Auto-resize textarea
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    autoResize();
    startTyping();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content && !audioBlob) return;

    stopTyping();

    // Edit existing message
    if (editingMessage) {
      try {
        await messageAPI.editMessage(editingMessage._id, content);
        onCancelEdit?.();
        setText('');
        autoResize();
      } catch {}
      return;
    }

    // Send voice note
    if (audioBlob) {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice.webm');
      setUploading(true);
      try {
        const { data: uploadData } = await uploadAPI.uploadFile(formData);
        const { data } = await messageAPI.sendMessage({
          chatId,
          content: '',
          messageType: 'voice',
          media: { url: uploadData.url, type: 'voice', duration },
          replyTo: replyTo?._id,
        });
        addMessage(chatId, data.message);
        onClearReply?.();
        cancelRecording();
      } catch {}
      finally { setUploading(false); }
      return;
    }

    // Send text message
    try {
      const { data } = await messageAPI.sendMessage({
        chatId,
        content,
        messageType: 'text',
        replyTo: replyTo?._id,
      });
      addMessage(chatId, data.message);
      setText('');
      onClearReply?.();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (err) {
      console.error('Send failed:', err);
    }
  }, [text, chatId, replyTo, audioBlob, duration, editingMessage, stopTyping, addMessage, onClearReply, cancelRecording]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      const { data: uploadData } = await uploadAPI.uploadFile(formData);
      const { data } = await messageAPI.sendMessage({
        chatId,
        content: '',
        messageType: uploadData.type,
        media: {
          url: uploadData.url,
          type: uploadData.type,
          name: uploadData.name,
          size: uploadData.size,
        },
        replyTo: replyTo?._id,
      });
      addMessage(chatId, data.message);
      onClearReply?.();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleMediaPick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    setMediaQueue((current) => {
      const next = [
        ...current,
        ...files.map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ];
      return next;
    });
    setMediaComposerOpen(true);
  };

  const closeMediaComposer = () => {
    mediaQueue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setMediaQueue([]);
    setMediaComposerOpen(false);
  };

  const handleMediaComposerSubmit = useCallback(async (selectedItems, caption) => {
    if (!selectedItems.length) return;
    setUploading(true);
    try {
      for (let index = 0; index < selectedItems.length; index += 1) {
        const selected = selectedItems[index];
        const formData = new FormData();
        formData.append('file', selected.file);
        const { data: uploadData } = await uploadAPI.uploadFile(formData);
        const { data } = await messageAPI.sendMessage({
          chatId,
          content: caption.trim(),
          messageType: uploadData.type,
          media: {
            url: uploadData.url,
            type: uploadData.type,
            name: uploadData.name,
            size: uploadData.size,
          },
          replyTo: replyTo?._id,
        });
        addMessage(chatId, data.message);
      }
      onClearReply?.();
      closeMediaComposer();
    } catch (err) {
      console.error('Media send failed:', err);
    } finally {
      setUploading(false);
    }
  }, [addMessage, chatId, onClearReply, replyTo]);

  const insertEmoji = (emoji) => {
    setText((t) => t + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch {
        alert('Microphone permission denied');
      }
    }
  };

  return (
    <div className="message-input-area">
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-preview-bar" />
          <div className="reply-preview-content">
            <div className="reply-preview-name">
              {replyTo.sender?.displayName || replyTo.sender?.username}
            </div>
            <div className="reply-preview-text">
              {replyTo.content || '📎 Media'}
            </div>
          </div>
          <button onClick={onClearReply} className="reply-preview-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="reply-preview edit-mode-preview">
          <div className="reply-preview-bar edit-mode-bar" />
          <div className="reply-preview-content">
            <div className="reply-preview-name edit-mode-title">Editing message</div>
            <div className="reply-preview-text">{editingMessage.content}</div>
          </div>
          <button onClick={() => { onCancelEdit?.(); setText(''); }} className="reply-preview-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {isRecording && (
        <div className="composer-status composer-status-recording">
          <div className="composer-status-dot" />
          <span>Recording… {formatDuration(duration)}</span>
          <button onClick={cancelRecording} className="composer-status-action">
            Cancel
          </button>
        </div>
      )}

      {audioBlob && !isRecording && (
        <div className="composer-status composer-status-preview">
          <span>Voice message ready ({formatDuration(duration)})</span>
          <button onClick={cancelRecording} className="composer-status-action">
            Discard
          </button>
        </div>
      )}

      <div className="message-input-row">
        {showEmoji && (
          <div className="emoji-picker-wrap">
            {COMMON_EMOJIS.map((e) => (
              <button key={e} className="emoji-btn" onClick={() => insertEmoji(e)}>{e}</button>
            ))}
          </div>
        )}

        <div className="message-input-box">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={`composer-inline-btn ${showEmoji ? 'active' : ''}`}
            title="Emoji"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>

          {!audioBlob && !isRecording && (
            <textarea
              ref={textareaRef}
              className="message-textarea"
              placeholder="Type a message"
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onBlur={stopTyping}
              rows={1}
            />
          )}

          {audioBlob && !isRecording && (
            <div className="composer-placeholder">
              🎤 Ready to send
            </div>
          )}

          {!audioBlob && (
            <>
              <button
                onClick={() => mediaInputRef.current?.click()}
                disabled={uploading}
                className="composer-inline-btn"
                title="Attach media"
              >
                {uploading ? (
                  <span className="spinner spinner-sm" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                )}
              </button>
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleMediaPick}
              />

              <button
                onClick={() => docInputRef.current?.click()}
                disabled={uploading}
                className="composer-inline-btn"
                title="Attach document"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                  <path d="M10 9H8" />
                </svg>
              </button>
              <input
                ref={docInputRef}
                type="file"
                accept="audio/*,.pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </>
          )}
        </div>

        {(text.trim() || audioBlob) ? (
          <button
            className="icon-btn primary composer-send-btn"
            onClick={handleSend}
            title="Send"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        ) : (
          <button
            className={`icon-btn composer-send-btn ${isRecording ? 'primary composer-recording-btn' : ''}`}
            onClick={handleVoiceToggle}
            title={isRecording ? 'Stop recording' : 'Voice message'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
        )}
      </div>

      <MediaComposerModal
        isOpen={mediaComposerOpen}
        items={mediaQueue}
        onClose={closeMediaComposer}
        onAddMore={() => mediaInputRef.current?.click()}
        onSubmit={handleMediaComposerSubmit}
        submitting={uploading}
      />
    </div>
  );
}
