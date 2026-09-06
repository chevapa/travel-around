import React from 'react';

const ROWS = [
  { key: 'loved', label: 'Printed · loved', swatch: { background: 'var(--pink)', border: '1.5px solid var(--paper-2)' } },
  { key: 'fine', label: 'Printed · fine', swatch: { background: 'var(--state-fine)', border: '1.5px solid var(--paper-2)' } },
  { key: 'unprinted', label: 'Not printed', swatch: { background: 'transparent', border: '1.5px dashed var(--unprinted-edge)' } },
];

export function Legend({ counts = { loved: 31, fine: 11, unprinted: 74 }, active, onToggle, title = 'Reading the page', style, ...rest }) {
  return (
    <div {...rest} style={{
      background: 'var(--ink)', color: 'var(--text-on-invert)',
      padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 7,
      boxShadow: '5px 5px 0 rgba(25,21,16,.4)', borderRadius: 'var(--radius)', ...style,
    }}>
      <span style={{ font: 'var(--label-sm)', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--yellow)' }}>{title}</span>
      {ROWS.map((r) => {
        const dim = active && active !== r.key;
        return (
          <span
            key={r.key}
            onClick={() => onToggle && onToggle(r.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              font: 'var(--label-sm)', letterSpacing: '.1em', textTransform: 'uppercase',
              cursor: onToggle ? 'pointer' : 'default',
              opacity: dim ? .55 : 1,
            }}
          >
            <span aria-hidden="true" style={{ width: 20, height: 15, flex: '0 0 auto', ...r.swatch }} />
            {r.label} · {counts[r.key]}
          </span>
        );
      })}
    </div>
  );
}
