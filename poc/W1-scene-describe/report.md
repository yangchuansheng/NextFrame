# W1 Scene Describe POC

- LOC of `describe()` function: 156 lines (`lowerThirdVelvet.js:137-292`)
- Phase progression printed output:

```text
enter 5
enter 5
hold 5
hold 5
exit 5
exit 5
```

- Describe values relative to render math: yes. `describe()` uses the same `wipeIn`, `textIn`, `alpha`, bar sizing, dot pulse, text placement, and stroke sizing math as `lowerThirdVelvet()`. The only approximation is text bounding-box width, since this POC does not use canvas text metrics.
- Done.
