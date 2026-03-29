import React from 'react';

export default function IconBtn({ onClick, children, title, className = '', danger = false, primary = false, disabled = false, style }) {
  let cls = `icon-btn ${className}`;
  if (primary) cls += ' primary';
  if (danger) cls += ' danger';
  return (
    <button className={cls} onClick={onClick} title={title} disabled={disabled} style={style}>
      {children}
    </button>
  );
}
