import React from 'react';
import { getInitials, getAvatarColor } from '../../utils/helpers';

/**
 * Avatar - shows image if available, otherwise colored initials
 * size: 'sm' | 'md' | 'lg' | 'xl'
 */
export default function Avatar({ src, name, size = 'md', showOnline = false, isOnline = false, onClick, style }) {
  const sizeClass = `avatar avatar-${size}`;
  const color = getAvatarColor(name || '');
  const initials = getInitials(name);

  return (
    <div
      className={sizeClass}
      onClick={onClick}
      style={{ background: src ? 'transparent' : color, cursor: onClick ? 'pointer' : 'default', ...style }}
    >
      {src ? (
        <img src={src} alt={name || 'avatar'} onError={(e) => { e.target.style.display = 'none'; }} />
      ) : (
        <span style={{ color: 'white', userSelect: 'none' }}>{initials}</span>
      )}
      {showOnline && isOnline && <span className="online-dot" />}
    </div>
  );
}
