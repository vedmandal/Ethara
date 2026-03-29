import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, background: 'var(--green-primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          Pulse<span style={{ color: 'var(--green-primary)' }}>Chat</span>
        </span>
      </div>
      <div className="spinner" />
    </div>
  );
}
