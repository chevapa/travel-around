import React from 'react';

export function GrainOverlay({ opacity, style, ...rest }) {
  return (
    <div
      {...rest}
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60,
        mixBlendMode: 'var(--grain-blend)',
        opacity: opacity != null ? opacity : 'var(--grain-opacity)',
        backgroundImage: 'var(--grain-image)',
        backgroundSize: 'var(--grain-size)',
        ...style,
      }}
    />
  );
}
