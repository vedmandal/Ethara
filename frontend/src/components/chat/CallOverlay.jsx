import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const formatDuration = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const prettifyStatus = (status) => {
  if (!status || status === 'idle') return 'Idle';
  if (status === 'connected') return 'Connected';
  if (status === 'connecting') return 'Connecting';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function CallOverlay({
  callState, callType, incomingCall, chatName, chatAvatar,
  isMuted, isVideoOff, localVideoRef, remoteVideoRef, remoteAudioRef, hasRemoteVideo, connectionStatus,
  onAnswer, onEnd, onReject, onToggleMute, onToggleVideo,
}) {
  const { user } = useAuth();
  const [duration, setDuration] = useState(0);
  const [localPreviewLarge, setLocalPreviewLarge] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (callState !== 'active') {
      setDuration(0);
      return;
    }
    const interval = setInterval(() => setDuration((current) => current + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video || typeof video.addEventListener !== 'function') return undefined;
    const handleEnter = () => setIsPiPActive(true);
    const handleLeave = () => setIsPiPActive(false);
    video.addEventListener('enterpictureinpicture', handleEnter);
    video.addEventListener('leavepictureinpicture', handleLeave);
    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnter);
      video.removeEventListener('leavepictureinpicture', handleLeave);
    };
  }, [remoteVideoRef, callState]);

  const localName = user?.displayName || user?.username || 'You';
  const localAvatar = user?.avatar || '';
  const callerName = incomingCall?.fromUser?.displayName || incomingCall?.fromUser?.username || chatName;
  const remoteName = callState === 'incoming' ? callerName : chatName;
  const videoCall = callType === 'video';
  const callLabel = useMemo(() => {
    if (callState === 'calling') return 'Calling...';
    if (callState === 'incoming') return `Incoming ${videoCall ? 'video' : 'audio'} call`;
    if (callState === 'active') return formatDuration(duration);
    return '';
  }, [callState, duration, videoCall]);

  const qualityTone = connectionStatus === 'connected'
    ? 'good'
    : connectionStatus === 'connecting'
      ? 'warm'
      : 'muted';

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (overlayRef.current?.requestFullscreen) {
        await overlayRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  const togglePiP = async () => {
    const video = remoteVideoRef.current;
    if (!video || !document.pictureInPictureEnabled || !video.requestPictureInPicture) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('PiP toggle failed:', error);
    }
  };

  return (
    <div className="call-overlay ether-call-overlay" ref={overlayRef}>
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="ether-call-backdrop" />

      <div className="ether-call-topbar">
        <div className="ether-call-title">
          <span className="ether-call-eyebrow">{videoCall ? 'Video Call' : 'Voice Call'}</span>
          <h2>{remoteName}</h2>
          <p>{callLabel}</p>
        </div>

        <div className="ether-call-chips">
          <span className={`ether-call-chip ${qualityTone}`}>{prettifyStatus(connectionStatus)}</span>
          <span className="ether-call-chip">Encrypted</span>
        </div>
      </div>

      {videoCall ? (
        <div className="ether-call-stage">
          <div className="ether-call-remote-card">
            <video ref={remoteVideoRef} autoPlay playsInline className="call-remote-video ether-call-remote-video" />

            {!hasRemoteVideo && (
              <div className="call-video-placeholder ether-call-placeholder">
                {chatAvatar ? (
                  <img src={chatAvatar} alt={remoteName} className="call-video-avatar-fill" />
                ) : (
                  <div className="call-video-fallback-bg" />
                )}
                <div className="call-video-overlay" />
              </div>
            )}

            <div className="ether-call-remote-meta">
              <strong>{remoteName}</strong>
              <span>{callState === 'active' ? formatDuration(duration) : callLabel}</span>
            </div>

            <div className="ether-call-stage-tools">
              <button className="ether-call-tool-btn" type="button" onClick={toggleFullscreen}>
                {isFullscreen ? 'Exit' : 'Full'}
              </button>
              <button
                className="ether-call-tool-btn"
                type="button"
                onClick={togglePiP}
                disabled={!document.pictureInPictureEnabled}
              >
                {isPiPActive ? 'Docked' : 'PiP'}
              </button>
              <button className="ether-call-tool-btn" type="button" onClick={() => setLocalPreviewLarge((current) => !current)}>
                {localPreviewLarge ? 'Mini' : 'Focus'}
              </button>
            </div>

            <div className={`call-video-local ether-call-local ${localPreviewLarge ? 'large' : ''}`}>
              <video ref={localVideoRef} autoPlay playsInline muted className="ether-call-local-video" />
              {isVideoOff && (
                <div className="call-local-placeholder ether-call-local-placeholder">
                  {localAvatar ? (
                    <img src={localAvatar} alt={localName} className="call-video-avatar-fill" />
                  ) : (
                    <div className="call-video-fallback-bg" />
                  )}
                </div>
              )}
              <span className="ether-call-local-label">{localName}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="ether-audio-stage">
          <div className="ether-audio-orbit" />
          <div className="ether-audio-avatar">
            {chatAvatar ? <img src={chatAvatar} alt={remoteName} /> : (remoteName || '?')[0]?.toUpperCase()}
          </div>
          <h3>{remoteName}</h3>
          <p>{callState === 'active' ? formatDuration(duration) : callLabel}</p>
          <div className="ether-audio-stats">
            <span>{isMuted ? 'Muted' : 'Mic live'}</span>
            <span>{prettifyStatus(connectionStatus)}</span>
            <span>Private route</span>
          </div>
          <button className="ether-call-tool-btn" type="button" onClick={toggleFullscreen}>
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      )}

      <div className="call-actions ether-call-actions">
        {callState === 'incoming' ? (
          <>
            <button className="call-action-btn end" onClick={onReject} title="Decline">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 2.77 4.31z" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              <span>Decline</span>
            </button>
            <button className="call-action-btn answer" onClick={onAnswer} title="Answer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>Answer</span>
            </button>
          </>
        ) : (
          <>
            <button className={`call-action-btn mute ${isMuted ? 'active' : ''}`} onClick={onToggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {callType === 'video' && (
              <button className={`call-action-btn mute ${isVideoOff ? 'active' : ''}`} onClick={onToggleVideo} title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}>
                {isVideoOff ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                )}
                <span>{isVideoOff ? 'Camera On' : 'Camera Off'}</span>
              </button>
            )}

            {callType === 'video' && (
              <button className="call-action-btn mute" onClick={togglePiP} title="Picture in picture">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <rect x="13" y="11" width="6" height="4" rx="1" />
                </svg>
                <span>{isPiPActive ? 'Docked' : 'PiP'}</span>
              </button>
            )}

            <button className="call-action-btn end" onClick={onEnd} title="End call">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 2.77 4.31z" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              <span>End</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
