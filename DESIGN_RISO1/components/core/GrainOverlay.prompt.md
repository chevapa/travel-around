One halftone dot screen over the entire composition — the thing that makes RISO1 look printed rather than drawn.

```jsx
<div style={{ position: 'relative' }}>
  {/* everything else */}
  <GrainOverlay />
</div>
```

Mount exactly one per page, as the last child of the outermost positioned element. Never per card, never per print: overlapping screens moiré and wreck text contrast.
