import React, { useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import NotificationToast from '../components/shared/NotificationToast';

export default function ChatPage() {
  const { activeChat } = useChat();
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  ));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(() => !activeChat);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(true);
    } else if (!activeChat) {
      setMobileSidebarOpen(true);
    }
  }, [activeChat, isMobile]);

  const showSidebar = !activeChat || mobileSidebarOpen;
  const showChat = !isMobile || (!!activeChat && !mobileSidebarOpen);

  return (
    <div className="app-shell">
      <div className={`shell-sidebar ${showSidebar ? 'is-visible' : ''}`}>
        <Sidebar onChatSelect={() => setMobileSidebarOpen(false)} />
      </div>

      <div className={`shell-chat ${showChat ? 'is-visible' : ''}`}>
        <ChatWindow onBack={() => setMobileSidebarOpen(true)} />
      </div>

      <NotificationToast />
    </div>
  );
}
