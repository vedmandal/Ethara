/**
 * useTyping Hook
 * Emits typing start/stop with debounce
 */
import { useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';

export const useTyping = (chatId) => {
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const startTyping = useCallback(() => {
    if (!chatId) return;
    const socket = getSocket();
    if (!socket) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', { chatId });
    }

    // Reset timeout
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing:stop', { chatId });
    }, 2000);
  }, [chatId]);

  const stopTyping = useCallback(() => {
    if (!chatId) return;
    const socket = getSocket();
    if (!socket) return;
    clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing:stop', { chatId });
    }
  }, [chatId]);

  return { startTyping, stopTyping };
};
