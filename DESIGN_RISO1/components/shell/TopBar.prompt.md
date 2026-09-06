The one bar of chrome at the top of the Atlas.

```jsx
<TopBar brand="The Atlas" meta="Zagreb · 42 printed / 74 not" filterCount={2}
        onIndex={openIndex} onPrint={rollOne} />
```

Actions ascend in weight left to right — icon, paper, ink, yellow — so "To Print" always reads as the primary. Always label the counts in `meta` ("42 printed / 74 not"), never a bare "31". The bar and its contents never rotate.
