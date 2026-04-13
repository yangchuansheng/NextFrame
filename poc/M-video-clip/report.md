# M-video-clip Report

## Input

- Source video: `/Users/Zhuanz/bigbang/NextFrame/poc-render/H-frames-to-mp4/out.mp4`
- Source resolution: `1920x1080`
- Source duration: `5.000 s`
- Scene model: `videoClip(t, params, ctx)`

## Outputs

- `t=2.5` -> `frame_t2.5.png` using source time `2.500 s`
- `t=4.0` -> `frame_t4.png` using source time `4.000 s`
- Frame hashes differ: `true`
- PNG hashes differ: `true`

## Performance

- Total script wall time: `542.266 ms`
- Uncached extract latencies: `56.345 ms, 55.868 ms`
- Average uncached extract latency: `56.106 ms`
- Render time at `t=2.5`: `189.948 ms`
- Render time at `t=4.0`: `185.695 ms`
- Repeat render time at `t=2.5` (cache hit): `132.845 ms`
- Cache requests / hits / misses: `3 / 1 / 2`
- Cache hit rate: `33.3%`

## Frame-Pure Verdict

- Preserved: `true`
- Evidence: repeated render of `t=2.5` produced the same PNG hash `d4b9aa9562ac5628584a1e99f8163bbcbae7f8a9` as the first render, while the second call hit the `(src,time)` cache instead of re-extracting.
- Determinism boundary: the scene function depends only on `(t, params)`, converts that to a single source seek time, and asks ffmpeg for one frame. There is no playback cursor or decoder state carried between calls.

## Gotchas

- The ffmpeg command is frame-pure but not cheap; every cache miss launches a fresh process and decodes from the requested seek point.
- Exact frame choice near the end of the file is awkward, so the helper clamps seek time slightly below duration to avoid empty output on terminal timestamps.
- The cache key rounds to microseconds. That keeps repeated JS calls like `2.5` stable, but callers should still avoid accidental floating-point drift if they expect hits.
