# Task — R22: Web Audio multi-track mixer + waveform

## Goal
Integrate Web Audio API into the preview pipeline: when the timeline contains audio clips, create AudioBufferSourceNodes during playback, schedule them accurately against the playhead, and mix multiple audio tracks together. Draw waveform overlays on audio clips in the timeline.

## Requirements

### Audio engine (`runtime/web/src/audio/`)
- `audio/context.js` — exports `getAudioContext()` lazy singleton that returns a shared `AudioContext` (user-gesture-gated: first call binds to the document's click listener)
- `audio/buffer.js` — `loadAudioBuffer(url)` fetches + `decodeAudioData` → Promise<AudioBuffer>. Caches by URL.
- `audio/mixer.js` — `createMixer({audioContext})` returns a mixer with methods:
  - `playAt(audioBuffer, {startTime, clipStart, clipDur, volume, gainAutomation})` — schedules a BufferSource to play at `audioContext.currentTime + startTime`, plays from `clipStart` for `clipDur`, applies GainNode at volume
  - `stop()` — stops all scheduled sources
  - `syncToPlayhead(playhead, isPlaying)` — reconciles with store state
- `audio/waveform.js` — `drawWaveform(ctx, audioBuffer, x, y, w, h, color)` renders a peaks waveform

### Timeline integration
- Preview loop (R11): when `store.state.playing` flips on, audio mixer's `syncToPlayhead` is called, which schedules all audio clips relative to the current playhead. When flipped off, all sources stop.
- Timeline audio clips (on tracks with `kind === 'audio'`) render their waveform inside the clip rect via `audio/waveform.js`

### Asset loading
- When an audio asset is imported (R7 dialog + R10 library), call `loadAudioBuffer` and cache the buffer in `store.state.assetBuffers` (Map)
- If assets don't exist yet, audio pipeline gracefully no-ops (check before scheduling)

### Stub audio for demo
- Create `runtime/web/assets/demo-audio.wav` — a tiny generated 440Hz sine tone, 2s. OR, if you can't create a binary asset, document that `assets/demo-audio.wav` is expected but not shipped this round; audio pipeline infrastructure ships without the actual sample.

## Technical Constraints
- Pure Web Audio API, no libraries
- Must work in Wry WebView (verify by reading wry docs — WKWebView supports Web Audio)
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace` all pass
- No regression

## Code Structure
```
runtime/web/src/audio/
├── context.js
├── buffer.js
├── mixer.js
└── waveform.js
```

## Verification Commands
```bash
test -f runtime/web/src/audio/context.js
test -f runtime/web/src/audio/buffer.js
test -f runtime/web/src/audio/mixer.js
test -f runtime/web/src/audio/waveform.js
grep -q 'getAudioContext' runtime/web/src/audio/context.js
grep -q 'loadAudioBuffer' runtime/web/src/audio/buffer.js
grep -q 'createMixer' runtime/web/src/audio/mixer.js
grep -q 'drawWaveform' runtime/web/src/audio/waveform.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node --input-type=module -e "import('./runtime/web/src/audio/mixer.js').then(m => process.exit(typeof m.createMixer === 'function' ? 0 : 1))"
```

## Non-Goals
- NO volume envelope editing (R17/VENV later)
- NO export with audio (R26)
- NO audio from video files (deferred)
