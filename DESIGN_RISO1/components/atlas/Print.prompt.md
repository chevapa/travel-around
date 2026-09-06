One place on the Atlas, drawn as a photographic print — the signature component of RISO1.

```jsx
<Print state="loved" src="assets/photo-stack.jpeg" caption="Krapina" tape star pin tilt={-4} />
<Print state="fine" src="assets/collage.jpeg" caption="Ludbreg" pin tilt={3} edge={1} />
<Print state="unprinted" pin tilt={-2} width={56} height={42} />
```

State is everything: colour = printed & loved, black-and-white = printed & fine, dashed empty frame = not printed. Vary `edge` and `tilt` between adjacent prints so no two torn borders match. Captions go in the handwriting face on the white border; never over the photo. Below 28px wide the print collapses to a plain square but keeps its 44px tap target.
