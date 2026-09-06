import React from 'react';

const TORN = [
  'polygon(2% 3%,42% 0%,74% 4%,100% 1%,98% 44%,100% 82%,97% 100%,58% 97%,22% 100%,1% 96%,3% 52%)',
  'polygon(3% 1%,40% 4%,72% 0%,100% 3%,96% 42%,100% 76%,95% 100%,60% 96%,26% 100%,2% 96%,5% 44%)',
  'polygon(2% 2%,44% 0%,76% 4%,100% 1%,97% 40%,100% 74%,98% 100%,56% 97%,24% 100%,1% 97%,3% 46%)',
];

export function Print({
  state = 'loved', src, caption, tilt = -3, width = 84, height = 62,
  tape = false, star, pin = false, edge = 0, onClick, style, ...rest
}) {
  const unprinted = state === 'unprinted';
  const collapsed = width < 28;
  const body = unprinted ? (
    <div style={{
      width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundImage: 'var(--hatch)',
      font: 'var(--display-3)', fontSize: Math.max(18, Math.round(height * .42)),
      color: 'var(--blue)', lineHeight: 1,
    }}>?</div>
  ) : (
    <img
      src={src} alt={caption || ''}
      style={{
        display: 'block', width, height, objectFit: 'cover',
        filter: state === 'fine' ? 'grayscale(1) contrast(1.15) brightness(1.04)' : 'saturate(1.2) contrast(1.05)',
      }}
    />
  );

  const sheet = (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        padding: unprinted ? '5px 5px 15px' : '5px 5px 19px',
        background: unprinted ? 'var(--paper-1)' : 'var(--paper-print)',
        border: unprinted ? 'var(--stroke-dashed)' : 'none',
        clipPath: unprinted ? 'none' : TORN[edge % TORN.length],
        boxShadow: unprinted ? 'none' : 'var(--lift-print)',
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 'var(--tap-min)', minHeight: 'var(--tap-min)',
        boxSizing: 'content-box',
      }}
    >
      {collapsed ? null : body}
      {tape ? <span aria-hidden="true" style={{
        position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%) rotate(2deg)',
        width: Math.max(40, width * .6), height: 20, background: 'var(--tape)',
        borderLeft: '1px dashed rgba(25,21,16,.35)', borderRight: '1px dashed rgba(25,21,16,.35)',
      }} /> : null}
      {caption ? (
        <span style={{
          position: 'absolute', left: 8, bottom: 2,
          font: 'var(--hand-sm)',
          color: state === 'loved' ? 'var(--blue)' : state === 'fine' ? 'var(--ink-40)' : 'var(--blue)',
        }}>{caption}</span>
      ) : null}
      {star ? (
        <span aria-hidden="true" style={{
          position: 'absolute', top: -8, right: -9, width: 20, height: 20,
          background: 'var(--pink)', border: 'var(--stroke)', borderRadius: '50%',
          color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>★</span>
      ) : null}
    </div>
  );

  return (
    <div {...rest} style={{ transform: `rotate(${tilt}deg)`, display: 'inline-block', ...style }}>
      {sheet}
      {pin ? <span aria-hidden="true" style={{
        display: 'block', width: 2.5, height: 12,
        background: unprinted ? 'var(--blue)' : 'var(--ink)', margin: '0 auto',
      }} /> : null}
    </div>
  );
}
