import React from 'react';

const V = {
  primary: { background: 'var(--action-primary)', color: 'var(--ink)', border: 'var(--stroke-heavy)', boxShadow: 'var(--lift-2)' },
  secondary: { background: 'var(--paper-2)', color: 'var(--ink)', border: 'var(--stroke)', boxShadow: 'none' },
  invert: { background: 'var(--ink)', color: 'var(--text-on-invert)', border: 'var(--stroke)', boxShadow: 'none' },
  accent: { background: 'var(--action-accent)', color: '#fff', border: 'var(--stroke-heavy)', boxShadow: 'var(--lift-2)' },
};
const SIZE = { sm: { padding: '8px 11px', fontSize: 10 }, md: { padding: '9px 15px', fontSize: 11 }, lg: { padding: '13px 20px', fontSize: 13 } };

export function Button({ variant = 'secondary', size = 'md', badge, disabled = false, style, children, ...rest }) {
  const [down, setDown] = React.useState(false);
  const v = V[variant] || V.secondary;
  const lifted = v.boxShadow !== 'none';
  return (
    <button
      {...rest}
      disabled={disabled}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      style={{
        position: 'relative',
        font: 'var(--label)',
        fontSize: SIZE[size].fontSize,
        letterSpacing: 'var(--label-tracking)',
        textTransform: 'uppercase',
        padding: SIZE[size].padding,
        minHeight: 'var(--tap-min)',
        borderRadius: 'var(--radius)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? .45 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: `transform var(--dur-press) var(--ease), box-shadow var(--dur-press) var(--ease)`,
        ...v,
        ...(down && !disabled && lifted ? { transform: 'translate(2px,2px)', boxShadow: 'none' } : null),
        ...(down && !disabled && !lifted ? { background: 'var(--ink)', color: 'var(--text-on-invert)' } : null),
        ...style,
      }}
    >
      {children}
      {badge != null ? (
        <span style={{
          position: 'absolute', top: -8, right: -8, width: 19, height: 19,
          borderRadius: '50%', background: 'var(--pink)', color: '#fff',
          border: 'var(--stroke)', font: 'var(--label-sm)', fontSize: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge}</span>
      ) : null}
    </button>
  );
}
