import React from 'react';

export function RingLabel({ children = '1 H', tilt = -4, style, ...rest }) {
  return (
    <span {...rest} style={{
      display: 'inline-block', background: 'var(--yellow)', border: 'var(--stroke)',
      padding: '2px 8px', font: 'var(--numeral)', fontSize: 11,
      color: 'var(--ink)', transform: `rotate(${tilt}deg)`,
      borderRadius: 'var(--radius)', ...style,
    }}>{children}</span>
  );
}

export function RingSet({ rings = [{ inset: '20% 15% 4%', label: '2 H' }, { inset: '38% 29% 22%', label: '1 H' }] }) {
  return (
    <React.Fragment>
      {rings.map((r, i) => (
        <span key={i} aria-hidden="true" style={{
          position: 'absolute', top: r.inset.split(' ')[0], left: r.inset.split(' ')[1],
          right: r.inset.split(' ')[1], bottom: r.inset.split(' ')[2],
          border: '3px dashed rgba(25,21,16,' + (i === 0 ? '.5' : '.38') + ')',
          borderRadius: '50%',
        }} />
      ))}
    </React.Fragment>
  );
}
