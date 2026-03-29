/**
 * useVoiceRecorder Hook
 * Records audio for voice messages
 */
import { useState, useRef, useCallback } from 'react';

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      setAudioBlob(null);

      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      throw new Error('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    clearInterval(intervalRef.current);
    setIsRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    clearInterval(intervalRef.current);
    setIsRecording(false);
    setAudioBlob(null);
    setDuration(0);
    chunksRef.current = [];
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  };
};
