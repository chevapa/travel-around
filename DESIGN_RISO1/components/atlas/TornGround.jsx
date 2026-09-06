import React from 'react';

const SHAPES = [
  { left: '-6%', top: '-10%', width: '64%', height: '72%', rot: -4, filter: 'sepia(.28) saturate(1.25) contrast(1.06)', clip: 'polygon(4% 12%,26% 2%,48% 9%,62% 3%,78% 14%,92% 10%,99% 30%,88% 48%,95% 66%,78% 78%,60% 72%,44% 84%,24% 79%,8% 88%,1% 62%,9% 40%)' },
  { right: '-10%', top: '6%', width: '56%', height: '60%', rot: 5, filter: 'sepia(.2) saturate(1.35) hue-rotate(-8deg)', clip: 'polygon(10% 6%,34% 0%,56% 8%,74% 2%,94% 16%,100% 40%,90% 58%,96% 78%,72% 88%,52% 80%,32% 92%,12% 84%,2% 60%,8% 34%)' },
  { left: '2%', bottom: '-16%', width: '58%', height: '56%', rot: 3, filter: 'grayscale(.55) sepia(.3) contrast(1.1)', clip: 'polygon(6% 18%,28% 6%,50% 14%,70% 4%,90% 12%,100% 34%,92% 56%,98% 76%,74% 86%,50% 78%,28% 90%,8% 80%,0% 54%,4% 36%)' },
  { right: '2%', bottom: '-8%', width: '40%', height: '42%', rot: -6, filter: 'sepia(.35) saturate(1.2)', clip: 'polygon(12% 10%,38% 2%,64% 10%,88% 4%,100% 26%,92% 50%,98% 72%,70% 84%,44% 76%,18% 88%,2% 62%,6% 32%)' },
];

export function TornGround({ fragments = [], roads = true, style, ...rest }) {
  return (
    <div {...rest} aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: 'var(--paper-3)', ...style }}>
      {SHAPES.map((s, i) => {
        const src = fragments[i % Math.max(1, fragments.length)];
        if (!src) return null;
        const { rot, clip, filter, ...pos } = s;
        return (
          <img key={i} src={src} alt="" style={{
            position: 'absolute', ...pos, objectFit: 'cover',
            clipPath: clip, filter, transform: `rotate(${rot}deg)`,
          }} />
        );
      })}
      {/* riso ink washes that sink the photos into terrain */}
      <span style={{ position: 'absolute', left: '-10%', top: '44%', width: '130%', height: '18%', background: 'var(--blue)', opacity: .42, borderRadius: '50%', transform: 'rotate(-6deg)', mixBlendMode: 'multiply' }} />
      <span style={{ position: 'absolute', left: '-8%', top: '2%', width: '56%', height: '44%', background: 'var(--green)', opacity: .34, borderRadius: '58% 42% 61% 39% / 47% 55% 45% 53%', transform: 'rotate(-9deg)', mixBlendMode: 'multiply' }} />
      <span style={{ position: 'absolute', left: '6%', bottom: '-14%', width: '46%', height: '40%', background: 'var(--yellow)', opacity: .3, borderRadius: '60% 40% 50% 50%', mixBlendMode: 'multiply' }} />
      {roads ? (
        <React.Fragment>
          <span style={{ position: 'absolute', left: '8%', top: '20%', width: '80%', height: 4, background: 'var(--pink)', opacity: .85, transform: 'rotate(6deg)', borderRadius: 3 }} />
          <span style={{ position: 'absolute', left: 0, top: '58%', width: '88%', height: 4, background: 'var(--pink)', opacity: .7, transform: 'rotate(-8deg)', borderRadius: 3 }} />
          <span style={{ position: 'absolute', left: '31%', top: '14%', width: 4, height: '74%', background: 'var(--pink)', opacity: .55, transform: 'rotate(9deg)', borderRadius: 3 }} />
        </React.Fragment>
      ) : null}
    </div>
  );
}
