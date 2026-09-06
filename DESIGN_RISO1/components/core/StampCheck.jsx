import React from 'react';

export function StampCheck({ checked = false, onChange, size = 22, style, ...rest }) {
  return (
    <span
      {...rest}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange && onChange(!checked)}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange && onChange(!checked); } }}
      style={{
        width: size, height: size, flex: '0 0 auto',
        border: 'var(--stroke-heavy)', borderRadius: 'var(--radius)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        font: 'var(--hand)', fontSize: size, lineHeight: 1,
        color: 'var(--pink)', background: 'transparent', cursor: 'pointer',
        userSelect: 'none', ...style,
      }}
    >{checked ? '✕' : ''}</span>
  );
}
