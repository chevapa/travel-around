The RISO1 button — mono uppercase, square, ink-bordered; the fill carries the hierarchy.

```jsx
<Button variant="primary">To Print →</Button>
<Button variant="secondary">New Frame</Button>
<Button variant="invert" badge={2}>The Index</Button>
```

Exactly one `primary` (yellow, offset shadow) per screen — it is the "do the thing" action. `secondary` is paper with a plain border; `invert` is ink and suits toggles like The Index; `accent` is pink and reserved for destructive or brand moments. Press state slides the button 2px into its own shadow. Minimum height is 44px regardless of `size`.
