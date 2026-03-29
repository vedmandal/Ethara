/**
 * useWebRTC Hook
 * Handles peer-to-peer audio/video calls via WebRTC
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { getSocket } from '../services/socket';

const CALL_HISTORY_KEY = 'pulse_chat_call_history';

const readCallHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(CALL_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeCallHistory = (entries) => {
  localStorage.setItem(CALL_HISTORY_KEY, JSON.stringify(entries.slice(0, 50)));
  window.dispatchEvent(new Event('call-log-updated'));
};

const createCallLog = (entry) => {
  const next = [{ id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...entry }, ...readCallHistory()];
  writeCallHistory(next);
  return next[0];
};

const updateCallLog = (id, updates) => {
  if (!id) return;
  const next = readCallHistory().map((entry) => (
    entry.id === id ? { ...entry, ...updates } : entry
  ));
  writeCallHistory(next);
};

export const useWebRTC = (chatId) => {
  const [callState, setCallState] = useState('idle'); // idle | calling | incoming | active
  const [callType, setCallType] = useState(null); // audio | video
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle');

  const peerConnectionRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const activeLogRef = useRef(null);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Socket event listeners for call signaling
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('call:incoming', ({ from, fromUser, offer, callType: type }) => {
      const log = createCallLog({
        chatId,
        name: fromUser?.displayName || fromUser?.username || 'Unknown',
        avatar: fromUser?.avatar || '',
        direction: 'incoming',
        callType: type,
        outcome: 'missed',
        timestamp: new Date().toISOString(),
      });
      setIncomingCall({ from, fromUser, offer, callType: type, logId: log.id });
      setCallState('incoming');
      setCallType(type);
    });

    socket.on('call:answered', async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        while (pendingIceCandidatesRef.current.length) {
          const candidate = pendingIceCandidatesRef.current.shift();
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
        setCallState('active');
        updateCallLog(activeLogRef.current, { outcome: 'connected' });
      }
    });

    socket.on('call:ice-candidate', async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        if (peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } else {
          pendingIceCandidatesRef.current.push(candidate);
        }
      }
    });

    socket.on('call:ended', () => endCall(false));
    socket.on('call:rejected', () => {
      endCall(false);
      setCallState('idle');
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:answered');
      socket.off('call:ice-candidate');
      socket.off('call:ended');
      socket.off('call:rejected');
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
    }
    setHasRemoteVideo(Boolean(remoteStream?.getVideoTracks?.().length));
  }, [remoteStream, callState]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        socket?.emit('call:ice-candidate', { chatId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionStatus(pc.connectionState || 'connecting');
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [chatId]);

  const startCall = useCallback(async (type = 'audio', meta = {}) => {
    try {
      const constraints = { audio: true, video: type === 'video' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const log = createCallLog({
        chatId,
        name: meta.name || 'Unknown',
        avatar: meta.avatar || '',
        direction: 'outgoing',
        callType: type,
        outcome: 'calling',
        timestamp: new Date().toISOString(),
      });
      activeLogRef.current = log.id;

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const socket = getSocket();
      socket?.emit('call:offer', { chatId, offer, callType: type });

      setCallType(type);
      setCallState('calling');
      setConnectionStatus('connecting');
    } catch (err) {
      console.error('Call error:', err);
      updateCallLog(activeLogRef.current, { outcome: 'failed' });
      throw err;
    }
  }, [chatId, createPeerConnection]);

  const answerCall = useCallback(async () => {
    if (!incomingCall) return;
    try {
      const constraints = { audio: true, video: incomingCall.callType === 'video' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      while (pendingIceCandidatesRef.current.length) {
        const candidate = pendingIceCandidatesRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = getSocket();
      socket?.emit('call:answer', { chatId, answer });

      activeLogRef.current = incomingCall.logId || activeLogRef.current;
      updateCallLog(incomingCall.logId, { outcome: 'answered' });
      setCallState('active');
      setIncomingCall(null);
      setConnectionStatus('connecting');
    } catch (err) {
      console.error('Answer error:', err);
    }
  }, [incomingCall, chatId, createPeerConnection]);

  const endCall = useCallback((emitEvent = true) => {
    if (emitEvent) {
      const socket = getSocket();
      socket?.emit('call:end', { chatId });
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }

    setRemoteStream(null);
    setHasRemoteVideo(false);
    pendingIceCandidatesRef.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    updateCallLog(activeLogRef.current, {
      outcome: connectionStatus === 'connected' ? 'completed' : 'ended',
      endedAt: new Date().toISOString(),
    });
    activeLogRef.current = null;
    setCallState('idle');
    setCallType(null);
    setIncomingCall(null);
    setConnectionStatus('idle');
  }, [chatId, localStream, connectionStatus]);

  const rejectCall = useCallback(() => {
    const socket = getSocket();
    socket?.emit('call:reject', { chatId });
    updateCallLog(incomingCall?.logId, { outcome: 'declined', endedAt: new Date().toISOString() });
    activeLogRef.current = null;
    setCallState('idle');
    setIncomingCall(null);
    setConnectionStatus('idle');
  }, [chatId, incomingCall]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  }, [localStream, isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => { t.enabled = isVideoOff; });
      setIsVideoOff(!isVideoOff);
    }
  }, [localStream, isVideoOff]);

  return {
    callState, callType, incomingCall, localStream, remoteStream,
    isMuted, isVideoOff, localVideoRef, remoteVideoRef, remoteAudioRef, hasRemoteVideo, connectionStatus,
    startCall, answerCall, endCall, rejectCall, toggleMute, toggleVideo,
  };
};
