# UI kit — The Atlas

A click-through recreation of the product this design system was extracted from: a personal
atlas of day trips out of Zagreb.

**`index.html`** is the whole app in one screen, because the product is one screen:

| Interaction | What happens |
|---|---|
| Click a print | The FrameCard docks into the right-hand panel slot |
| The Index | Replaces the card with the card-index filter panel; stamps toggle states |
| Legend row | Isolates one print state on the map (tap again to release) |
| To Print → | Rolls one unprinted frame at random, highlights it in yellow, opens its card |
| Contact sheet | Swaps the map for the album view of all frames |

## Rules this kit demonstrates

- **One panel slot.** The Index and the FrameCard never appear together — opening one replaces
  the other, so the map is never buried under two sheets.
- **One bar of chrome.** Everything lives in the TopBar; nothing floats detached above the map.
- **Torn ground, saturated prints.** No stock basemap, so the prints own all the colour.
- **One grain layer**, mounted last, over the whole composition.

## Not built

Add-a-frame and the search field are stubs (the buttons are present, no flow behind them) —
the source product's add flow was never seen, so inventing one here would be a guess.
