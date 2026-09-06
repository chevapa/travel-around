A sheet of warm paper with an ink border and a hard offset shadow — the base surface for every panel, card and index in RISO1.

```jsx
<Paper tone="card" lift="md" tape>
  <h3>Sveti Križ Začretje</h3>
</Paper>
```

Variants: `tone` card / page / ground / ink (ink is the inverted surface used by Legend and panel footers); `lift` none / sm / md / lg (lg only for the Atlas frame). Never add border-radius and never blur the shadow. `tape` sticks a yellow tape strip over the top edge; `TapeStrip` is also exported for placing tape by hand.
