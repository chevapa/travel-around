The detail panel for one frame, docked in the right-hand panel slot.

```jsx
<FrameCard name="Sveti Križ Začretje" state="unprinted"
  description="A restored manor house and a pleasant little town centre."
  driveTime="52 min" distance="49 km" stay="~45 min"
  tags={['Croatia', 'Castle', 'Small town']} onNearby={showRoll} />
```

Fixed order: name → print → description → drive time → tags. Never put status or category chips above the name. It shares one slot with IndexPanel; opening The Index replaces the card instead of stacking a second sheet over the map.
