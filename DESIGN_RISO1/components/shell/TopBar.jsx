import React from 'react';
import { Button } from '../core/Button.jsx';
import { IconButton } from '../core/IconButton.jsx';

export function TopBar({ brand = 'The Atlas', meta, filterCount, onSearch, onNewFrame, onIndex, onPrint, primaryLabel = 'To Print →', style, ...rest }) {
  return (
    <div {...rest} style={{
      background: 'var(--paper-2)', borderBottom: 'var(--stroke-heavy)',
      padding: 'var(--pad-bar)', display: 'flex', alignItems: 'center',
      gap: 14, flexWrap: 'wrap', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{
          font: 'var(--display-2)', fontSize: 21, letterSpacing: 'var(--display-tracking)',
          textTransform: 'uppercase', background: 'var(--pink)', color: '#fff',
          padding: '2px 9px', transform: 'rotate(-1.5deg)', display: 'inline-block',
        }}>{brand}</span>
        {meta ? (
          <span style={{
            font: 'var(--label-sm)', letterSpacing: '.14em', textTransform: 'uppercase',
            color: 'var(--ink)', border: 'var(--stroke)', padding: '3px 7px',
          }}>{meta}</span>
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <IconButton glyph="⌕" label="Search frames" onClick={onSearch} />
        <Button variant="secondary" size="sm" onClick={onNewFrame}>New Frame</Button>
        <Button variant="invert" size="sm" badge={filterCount || undefined} onClick={onIndex}>The Index</Button>
        <Button variant="primary" size="md" onClick={onPrint}>{primaryLabel}</Button>
      </div>
    </div>
  );
}
