import React from 'react';

const TONE = { card: 'var(--paper-2)', page: 'var(--paper-1)', ground: 'var(--paper-3)', ink: 'var(--ink)' };
const LIFT = { none: 'none', sm: 'var(--lift-2)', md: 'var(--lift-3)', lg: 'var(--lift-4)' };

export function Paper({ tone = 'card', lift = 'md', tape = false, pad = 'var(--pad-card)', as = 'div', style, children, ...rest }) {
  const Tag = as;
  return (
    <Tag
      {...rest}
      style={{
        position: 'relative',
        background: TONE[tone] || TONE.card,
        color: tone === 'ink' ? 'var(--text-on-invert)' : 'var(--text-body)',
        border: 'var(--stroke-heavy)',
        borderRadius: 'var(--radius)',
        boxShadow: LIFT[lift],
        padding: pad,
        font: 'var(--body)',
        ...style,
      }}
    >
      {tape ? <TapeStrip /> : null}
      {children}
    </Tag>
  );
}

export function TapeStrip({ width = 76, left = '26%', tilt = -2 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute', top: -9, left, width, height: 22,
        background: 'var(--tape)',
        borderLeft: '1px dashed rgba(25,21,16,.4)',
        borderRight: '1px dashed rgba(25,21,16,.4)',
        transform: `rotate(${tilt}deg)`,
        zIndex: 2,
      }}
    />
  );
}
