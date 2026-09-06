import React from 'react';

export function Tag({ children, tone = 'outline', style, ...rest }) {
  const tones = {
    outline: { background: 'transparent', color: 'var(--ink)', border: 'var(--stroke-hair)' },
    ink: { background: 'var(--ink)', color: 'var(--text-on-invert)', border: '1.5px solid var(--ink)' },
    yellow: { background: 'var(--yellow)', color: 'var(--ink)', border: 'var(--stroke)' },
  };
  return (
    <span {...rest} style={{
      display: 'inline-block', padding: '4px 8px',
      font: 'var(--label-sm)', fontSize: 9,
      letterSpacing: 'var(--label-tracking)', textTransform: 'uppercase',
      borderRadius: 'var(--radius)', ...tones[tone], ...style,
    }}>{children}</span>
  );
}
