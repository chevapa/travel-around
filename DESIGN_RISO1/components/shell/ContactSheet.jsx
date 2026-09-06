import React from 'react';

export function ContactSheet({ frames = [], columns = 6, title = 'Contact sheet', range, onPick, style, ...rest }) {
  return (
    <div {...rest} style={{
      background: 'var(--ink)', border: 'var(--stroke-heavy)', boxShadow: 'var(--lift-3)',
      padding: 14, display: 'flex', flexDirection: 'column', gap: 10, ...style,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        font: 'var(--label-sm)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--yellow)',
      }}>
        <span>{title} · {frames.length}</span>
        {range ? <span style={{ color: 'var(--text-on-invert)' }}>{range}</span> : null}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 6 }}>
        {frames.map((f, i) => f.state === 'unprinted' ? (
          <span key={i} onClick={() => onPick && onPick(f, i)} style={{
            aspectRatio: '4 / 3', border: '1.5px dashed var(--unprinted-edge)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--unprinted-edge)', font: 'var(--display-3)', fontSize: 16,
            cursor: onPick ? 'pointer' : 'default',
          }}>?</span>
        ) : (
          <img key={i} src={f.src} alt={f.name || ''} onClick={() => onPick && onPick(f, i)} style={{
            width: '100%', aspectRatio: '4 / 3', objectFit: 'cover',
            border: '1.5px solid var(--paper-2)',
            filter: f.state === 'fine' ? 'grayscale(1)' : 'none',
            cursor: onPick ? 'pointer' : 'default',
          }} />
        ))}
      </div>
    </div>
  );
}
