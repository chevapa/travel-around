Filters as a card index — tab dividers, stamped ✕ marks, pinned ink footer.

```jsx
<IndexPanel
  activeTab="State"
  rows={[{ key: 'loved', label: 'Printed · loved', count: 31, checked: true, swatch: { background: 'var(--pink)', border: 'var(--stroke-hair)' } }]}
  onToggleRow={toggle} footerCount={105} />
```

Non-negotiable: labels stay full-ink at 16px and unchecked state is shown by the empty stamp box only. The panel caps at the viewport with an internal scroll so its footer is never cut off, and it occupies the SAME slot as FrameCard — the two never appear together.
