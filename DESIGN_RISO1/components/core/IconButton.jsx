import React from 'react';

export function IconButton({ glyph = '⌕', label, size = 32, style, ...rest }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      style={{
        width: size, height: size, minWidth: 'var(--tap-min)', minHeight: 'var(--tap-min)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper-2)', color: 'var(--ink)',
        border: 'var(--stroke)', borderRadius: 'var(--radius)',
        fontSize: Math.round(size * .47), lineHeight: 1, cursor: 'pointer',
        ...style,
      }}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}
