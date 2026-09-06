import React from 'react';

const A = '../../assets/';

/**
 * The product's main view: torn-collage terrain, prints pinned to it, one bar of chrome,
 * a permanent legend, and a single right-hand panel slot shared by The Index and a FrameCard.
 */
export function AtlasScreen({ frames = [], sheet = [] }) {
  const { TopBar, IndexPanel, FrameCard, ContactSheet, Print, FrameStack, RingLabel, RingSet, Legend, TornGround, GrainOverlay, Button } = window.RISO1;

  const [slot, setSlot] = React.useState(null);        // null | 'index' | frameId
  const [view, setView] = React.useState('atlas');     // 'atlas' | 'sheet'
  const [iso, setIso] = React.useState(null);
  const [checks, setChecks] = React.useState({ loved: true, fine: false, unprinted: true });
  const [rolled, setRolled] = React.useState(null);

  const counts = {
    loved: frames.filter((f) => f.state === 'loved').length,
    fine: frames.filter((f) => f.state === 'fine').length,
    unprinted: frames.filter((f) => f.state === 'unprinted').length,
  };
  const shown = frames.filter((f) => (!iso || f.state === iso) && checks[f.state]);
  const open = frames.find((f) => f.id === slot);
  const filterCount = Object.values(checks).filter(Boolean).length === 3 ? 0 : 3 - Object.values(checks).filter(Boolean).length;

  const rows = [
    { key: 'loved', label: 'Printed · loved', count: counts.loved, checked: checks.loved, swatch: { background: 'var(--pink)', border: 'var(--stroke-hair)' } },
    { key: 'fine', label: 'Printed · fine', count: counts.fine, checked: checks.fine, swatch: { background: 'var(--state-fine)', border: 'var(--stroke-hair)' } },
    { key: 'unprinted', label: 'Not printed', count: counts.unprinted, checked: checks.unprinted, swatch: { border: '1.5px dashed var(--blue)' } },
  ];

  const roll = () => {
    const pool = frames.filter((f) => f.state === 'unprinted');
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setRolled(pick.id);
    setSlot(pick.id);
    setView('atlas');
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--paper-1)' }}>
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: 'var(--paper-3)' }}>
        <TornGround fragments={[A + 'collage2.webp', A + 'collage.jpeg', A + 'photo-stack.jpeg', A + 'collage2.webp']} />
        <RingSet />
        <span style={{ position: 'absolute', left: '15.5%', top: '50%' }}><RingLabel tilt={-4}>2 H</RingLabel></span>
        <span style={{ position: 'absolute', left: '29.5%', top: '55%' }}><RingLabel tilt={-3}>1 H</RingLabel></span>

        <div style={{ position: 'absolute', left: '46%', top: '66%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 16, height: 16, background: 'var(--pink)', border: 'var(--stroke-heavy)', borderRadius: '50%' }} />
          <span style={{ font: 'var(--label-sm)', letterSpacing: '.12em', background: 'var(--ink)', color: 'var(--text-on-invert)', padding: '1px 5px' }}>HOME</span>
        </div>

        {view === 'atlas' && shown.map((f, i) => (
          <div key={f.id} style={{ position: 'absolute', left: f.x + '%', top: f.y + '%', transform: 'translate(-50%,-100%)', zIndex: rolled === f.id ? 5 : 1 }}>
            <Print
              state={f.state} src={f.src ? A + f.src : undefined} caption={f.caption}
              tape={f.state === 'loved'} star={f.state === 'loved'} pin
              tilt={[-4, 3, -2, 2, -3, 1][i % 6]} edge={i % 3}
              width={f.state === 'unprinted' ? 56 : 84} height={f.state === 'unprinted' ? 42 : 62}
              onClick={() => setSlot(f.id)}
              style={rolled === f.id ? { outline: '3px solid var(--yellow)', outlineOffset: 4 } : null}
            />
          </div>
        ))}
        {view === 'atlas' ? (
          <div style={{ position: 'absolute', left: '41%', top: '24%', transform: 'translate(-50%,-50%)' }}>
            <FrameStack count={4} />
          </div>
        ) : null}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          <TopBar
            brand="The Atlas"
            meta={`Zagreb · ${counts.loved + counts.fine} printed / ${counts.unprinted} not`}
            filterCount={filterCount}
            onIndex={() => setSlot(slot === 'index' ? null : 'index')}
            onPrint={roll}
          />
        </div>

        <div style={{ position: 'absolute', left: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <Legend counts={counts} active={iso} onToggle={(k) => setIso(iso === k ? null : k)} />
          <Button variant="secondary" size="sm" onClick={() => setView(view === 'atlas' ? 'sheet' : 'atlas')}>
            {view === 'atlas' ? 'Contact sheet' : 'Back to the atlas'}
          </Button>
        </div>

        {view === 'sheet' ? (
          <div style={{ position: 'absolute', left: '50%', top: 96, transform: 'translateX(-50%)', width: 'min(760px, 88%)' }}>
            <ContactSheet frames={sheet.map((f) => ({ ...f, src: f.src ? A + f.src : undefined }))} range="2023—2026" />
          </div>
        ) : null}

        {slot === 'index' ? (
          <IndexPanel
            rows={rows}
            footerCount={shown.length}
            onToggleRow={(k) => setChecks({ ...checks, [k]: !checks[k] })}
            style={{ position: 'absolute', right: 16, top: 88, bottom: 16, width: 'min(37%, 340px)' }}
          />
        ) : open ? (
          <FrameCard
            name={open.name} state={open.state} src={open.src ? A + open.src : undefined}
            description={open.desc} driveTime={open.drive} distance={open.dist} stay={open.stay}
            tags={open.tags}
            onClose={() => { setSlot(null); setRolled(null); }}
            style={{ position: 'absolute', right: 16, top: 88, bottom: 16, width: 'min(37%, 340px)' }}
          />
        ) : null}

        <GrainOverlay />
      </div>
    </div>
  );
}
