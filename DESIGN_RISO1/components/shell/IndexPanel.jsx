import React from 'react';
import { StampCheck } from '../core/StampCheck.jsx';

export function IndexPanel({
  tabs = ['State', 'Kind', 'Season'], activeTab = 'State', onTab,
  rows = [], onToggleRow, footerCount, sortLabel = 'By drive time', onSort, style, ...rest
}) {
  return (
    <div {...rest} style={{
      background: 'var(--paper-2)', border: 'var(--stroke-heavy)', boxShadow: 'var(--lift-3)',
      display: 'flex', flexDirection: 'column', maxHeight: '100%', ...style,
    }}>
      <div style={{ display: 'flex', padding: '0 12px', marginTop: -2, flex: '0 0 auto' }}>
        {tabs.map((t) => (
          <span key={t} onClick={() => onTab && onTab(t)} style={{
            background: t === activeTab ? 'var(--yellow)' : 'var(--paper-1)',
            border: 'var(--stroke-heavy)', borderTop: 'none',
            borderLeft: t === tabs[0] ? undefined : 'none',
            padding: '6px 11px', font: 'var(--label-sm)',
            letterSpacing: '.1em', textTransform: 'uppercase',
            cursor: onTab ? 'pointer' : 'default',
          }}>{t}</span>
        ))}
      </div>
      <div style={{ padding: 'var(--pad-panel)', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', minHeight: 0 }}>
        {rows.map((r, i) => (
          <div key={r.key || i} style={{
            display: 'flex', alignItems: 'center', gap: 11, padding: '10px 4px',
            borderBottom: i === rows.length - 1 ? 'none' : 'var(--stroke-dashed-quiet)',
          }}>
            <StampCheck checked={!!r.checked} onChange={() => onToggleRow && onToggleRow(r.key)} />
            {r.swatch ? <span aria-hidden="true" style={{ width: 22, height: 16, flex: '0 0 auto', ...r.swatch }} /> : null}
            <span style={{ font: 'var(--body)', color: 'var(--text-strong)' }}>{r.label}</span>
            <span style={{ marginLeft: 'auto', font: 'var(--numeral)', color: 'var(--ink-55)' }}>{r.count}</span>
          </div>
        ))}
      </div>
      <div style={{
        background: 'var(--ink)', padding: '11px 16px', flex: '0 0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        font: 'var(--label-sm)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-on-invert)',
      }}>
        <span>{footerCount} frames match</span>
        <span onClick={onSort} style={{ background: 'var(--yellow)', color: 'var(--ink)', padding: '6px 10px', cursor: onSort ? 'pointer' : 'default' }}>{sortLabel}</span>
      </div>
    </div>
  );
}
