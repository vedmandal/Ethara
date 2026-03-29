import React, { useRef, useEffect } from 'react';

export default function Dropdown({ isOpen, onClose, trigger, children, align = 'right' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  return (
    <div className="dropdown" ref={ref}>
      {trigger}
      {isOpen && (
        <div className="dropdown-menu" style={align === 'left' ? { left: 0, right: 'auto' } : {}}>
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ onClick, children, danger = false, icon }) {
  return (
    <button className={`dropdown-item ${danger ? 'danger' : ''}`} onClick={onClick}>
      {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
      {children}
    </button>
  );
}
