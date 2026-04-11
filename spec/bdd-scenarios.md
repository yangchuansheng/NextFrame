# NextFrame · BDD Scenarios (v1.0)

**Total: 104 scenarios** · P0=59 (MVP) / P1=34 (extensions) / P2=11 (polish)

Format: `ID | Priority | Given / When / Then`

Convention: IDs are `{CATEGORY}-{NUM}`. Categories map to UI surface.

---

## 1. Editor Shell (SHELL) — 5 scenarios

| ID | P | Given | When | Then |
|---|---|---|---|---|
| SHELL-01 | P0 | Cold start | User launches `nextframe` binary | Window opens 1440×900, 5-zone layout visible, no console errors |
| SHELL-02 | P0 | Window open | User resizes window | All 5 zones reflow, no clipping, min 1024×640 enforced |
| SHELL-03 | P0 | Window open | User drags zone splitter | Zones resize, minimum widths respected |
| SHELL-04 | P1 | Window open | User closes window with unsaved changes | Confirm dialog: Save/Discard/Cancel |
| SHELL-05 | P1 | Window open | User hits Cmd+Q | Same save prompt if dirty; quits cleanly otherwise |

## 2. Asset Import (ASSET) — 6 scenarios

| ID | P | Given | When | Then |
|---|---|---|---|---|
| ASSET-01 | P0 | Empty asset library | User clicks "Import" button | Native file dialog opens |
| ASSET-02 | P0 | File dialog open | User selects MP4/MOV file | File appears in library with thumbnail, duration, codec info |
| ASSET-03 | P0 | File dialog open | User selects MP3/WAV file | File appears as audio asset with waveform thumbnail |
| ASSET-04 | P0 | File dialog open | User selects PNG/JPG image | File appears as image asset with preview thumbnail |
| ASSET-05 | P1 | Asset library has items | User drags file from Finder into library | Same as Import: file ingested, thumbnail rendered |
| ASSET-06 | P1 | Asset library | User right-clicks asset | Context menu: Rename/Remove/Reveal in Finder |

## 3. Multi-Track Timeline (TL) — 7 scenarios

| ID | P | Given | When | Then |
|---|---|---|---|---|
| TL-01 | P0 | New project | Timeline renders | At least 3 empty tracks visible (V1, V2, A1), ruler shows 0-30s |
| TL-02 | P0 | Timeline has tracks | User clicks "Add Video Track" | New track inserted above existing video tracks |
| TL-03 | P0 | Timeline with tracks | User clicks "Add Audio Track" | New audio track inserted below video tracks |
| TL-04 | P0 | Timeline | User scrolls horizontally | Ruler + all tracks scroll in sync, playhead stays at time position |
| TL-05 | P0 | Timeline | User uses zoom slider / Cmd+= / Cmd+- | Ruler scale changes, clip widths scale proportionally |
| TL-06 | P1 | Timeline has 6+ tracks | User scrolls vertically | Tracks scroll, ruler stays fixed at top |
| TL-07 | P1 | Track has clips | User clicks track header "mute" button | Track visually dimmed, output excluded from preview |

## 4. Clip Editing (CLIP) — 8 scenarios

| ID | P | Given | When | Then |
|---|---|---|---|---|
| CLIP-01 | P0 | Empty timeline, video asset in library | User drags asset onto V1 track | Clip created at drop position, length = asset duration |
| CLIP-02 | P0 | Clip on track | User drags clip body to new position | Clip moves, start time updates, other clips unaffected |
| CLIP-03 | P0 | Clip on track | User drags left edge | Clip in-point updates, clip length shortens/lengthens |
| CLIP-04 | P0 | Clip on track | User drags right edge | Clip out-point updates |
| CLIP-05 | P0 | Clip on track, playhead inside clip | User clicks Blade tool then clip | Clip splits at playhead into two clips |
| CLIP-06 | P0 | Multiple clips | User drags marquee around clips | All enclosed clips selected, highlighted |
| CLIP-07 | P0 | Clip(s) selected | User hits Delete | Clips removed from timeline, gap remains |
| CLIP-08 | P1 | Clip(s) selected | User hits Cmd+C then Cmd+V | Clips duplicated at playhead position |

## 5. Preview Playback (PREV) — 6 scenarios

| ID | P | Given | When | Then |
|---|---|---|---|---|
| PREV-01 | P0 | Timeline with clips | User clicks Play button | Preview canvas plays from playhead at real-time, audio sync |
| PREV-02 | P0 | Playing | User clicks Pause | Playback stops immediately, playhead held |
| PREV-03 | P0 | Playing | Playback reaches timeline end | Playback stops, playhead at end |
| PREV-04 | P0 | Paused | User hits Space | Toggles play/pause |
| PREV-05 | P1 | Playing | User clicks elsewhere on timeline | Playhead jumps to clicked time, playback continues from there |
| PREV-06 | P1 | Preview canvas | User drags a corner | Canvas resizes, aspect ratio locked to project setting |

## 6. Frame-Pure Scrubbing (SCRUB) — 5 scenarios

| ID | P | Given | When | Then |
|---|---|---|---|---|
| SCRUB-01 | P0 | Timeline with clips | User drags playhead | Preview updates in real-time (≥15fps scrub) |
| SCRUB-02 | P0 | Scrubbing | User releases mouse | Preview shows exact frame at release position |
| SCRUB-03 | P0 | Playhead at t=5.0 | User jumps to t=20.0 via click | Preview shows frame at t=20.0 immediately (no accumulated state) |
| SCRUB-04 | P1 | Scrubbing backwards | User drags playhead backward | Preview updates correctly in reverse direction |
| SCRUB-05 | P1 | Long timeline (>5 min) | User scrubs rapidly | No crash, no stale frames, <200ms stabilization |

## 7. Inspector Panel (INS) — 6 scenarios

| ID | P | Given | When | Then |
|---|---|---|---|---|
| INS-01 | P0 | Nothing selected | Inspector shows | Empty state with "Select a clip" hint |
| INS-02 | P0 | Clip selected | Inspector shows | Clip properties: start, duration, source, scene params |
| INS-03 | P0 | Clip selected | User edits numeric field (e.g., start time) | Value applied, clip moves in timeline |
| INS-04 | P0 | Text scene clip selected | User edits text content | Preview updates with new text |
| INS-05 | P1 | Multiple clips selected | Inspector shows | Shared properties visible, mixed values shown as "—" |
| INS-06 | P1 | Clip with scene params | User edits color picker | Color applied live to preview |

## 8. Save / Load Project (FILE) — 5 scenarios

| ID | P | Given | When | Then |
|---|---|---|---|---|
| FILE-01 | P0 | Clean project | User hits Cmd+S | Save dialog opens, default name "Untitled.nfproj" |
| FILE-02 | P0 | File saved | User hits Cmd+S again | Saves silently to same path |
| FILE-03 | P0 | Project file exists | User opens file via Open dialog | Timeline, clips, assets restored exactly |
| FILE-04 | P0 | Empty session | User hits File > New | Empty project loads |
| FILE-05 | P1 | Unsaved project | User opens different project | Prompt: save/discard/cancel |

## 9. Undo / Redo (UNDO) — 5 scenarios

| ID | P | Given | When | Then |
|---|---|---|---|---|
| UNDO-01 | P0 | Any editing action taken | User hits Cmd+Z | Previous state restored, UI reflects change |
| UNDO-02 | P0 | Undo performed | User hits Cmd+Shift+Z | Action re-applied |
| UNDO-03 | P0 | 20 actions taken | User hits Cmd+Z 20 times | All 20 actions undone sequentially |
| UNDO-04 | P1 | Undo performed, new action taken | User attempts redo | Redo stack cleared, redo disabled |
| UNDO-05 | P1 | Undo history | User hits Edit > History | History panel opens showing action list |

## 10. Export to MP4 (EXP) — 6 scenarios

| ID | P | Given | When | Then |
|---|---|---|---|---|
| EXP-01 | P0 | Project with clips | User hits File > Export | Export dialog opens with preset options |
| EXP-02 | P0 | Export dialog | User selects resolution + clicks Start | Recorder subprocess launches, progress shown |
| EXP-03 | P0 | Export running | Progress bar advances | ETA updates, cancel button available |
| EXP-04 | P0 | Export complete | MP4 file created | File at chosen path, h264+aac, duration ≈ timeline length |
| EXP-05 | P1 | Export with audio track | MP4 verified | ffprobe shows audio stream, waveform matches timeline mix |
| EXP-06 | P1 | Export cancelled | User clicks Cancel | Subprocess killed, partial file cleaned up |

---

## 11. Text Overlay (TEXT) — 4 scenarios

| ID | P | G/W/T |
|---|---|---|
| TEXT-01 | P0 | Scene library has "Text" → drag to track → clip with default text "Hello" |
| TEXT-02 | P0 | Text clip selected → edit content in Inspector → preview updates instantly |
| TEXT-03 | P1 | Text clip → Inspector font picker → font changes in preview |
| TEXT-04 | P1 | Text clip → color picker → text color changes live |

## 12. Audio Mixing (AUDIO) — 4 scenarios

| ID | P | G/W/T |
|---|---|---|
| AUDIO-01 | P0 | Two audio clips on A1/A2 → play → both audible simultaneously, mixed |
| AUDIO-02 | P0 | Audio clip → Inspector volume slider → playback volume changes |
| AUDIO-03 | P1 | Audio clip → draw volume envelope keyframes → automation during playback |
| AUDIO-04 | P2 | Audio clip → mute track → track silent in preview |

## 13. Cut / Blade (BLADE) — 3 scenarios

| ID | P | G/W/T |
|---|---|---|
| BLADE-01 | P0 | Clip selected, playhead inside → Cmd+B → clip splits at playhead |
| BLADE-02 | P0 | Blade tool active → click clip → splits at click X |
| BLADE-03 | P1 | Multi-clip selection + Cmd+B → all split at playhead simultaneously |

## 14. Snap (SNAP) — 3 scenarios

| ID | P | G/W/T |
|---|---|---|
| SNAP-01 | P0 | Snap enabled → drag clip near playhead → snaps to playhead (±5px) |
| SNAP-02 | P0 | Snap enabled → drag clip near another clip edge → snaps to edge |
| SNAP-03 | P1 | Snap toggle OFF → drag → no snapping |

## 15. Zoom (ZOOM) — 3 scenarios

| ID | P | G/W/T |
|---|---|---|
| ZOOM-01 | P0 | Timeline → Cmd+= → scale doubles, clips wider |
| ZOOM-02 | P0 | Timeline → Cmd+- → scale halves, clips narrower |
| ZOOM-03 | P1 | Timeline → Cmd+0 → zoom to fit project duration |

## 16. Keyboard Shortcuts (KB) — 4 scenarios

| ID | P | G/W/T |
|---|---|---|
| KB-01 | P0 | Any state → Space → toggle play/pause |
| KB-02 | P0 | Clip selected → Delete/Backspace → clip removed |
| KB-03 | P0 | Any state → Cmd+Z → undo |
| KB-04 | P1 | Any state → J/K/L → reverse/pause/forward playback |

## 17. Volume Envelope (VENV) — 2 scenarios

| ID | P | G/W/T |
|---|---|---|
| VENV-01 | P1 | Audio clip → toggle envelope mode → line overlay on waveform |
| VENV-02 | P1 | Envelope → click to add keyframe, drag to adjust → volume auto-interpolates |

## 18. Scene Library (LIB) — 3 scenarios

| ID | P | G/W/T |
|---|---|---|
| LIB-01 | P0 | Left panel → "Scenes" tab → grid of scene thumbnails |
| LIB-02 | P0 | Scene tile → drag onto track → clip created with scene's default duration |
| LIB-03 | P1 | Scene tile → hover → tooltip with description |

## 19. Effect Stack (FX) — 3 scenarios

| ID | P | G/W/T |
|---|---|---|
| FX-01 | P1 | Clip selected → Inspector "Effects" → Add Effect dropdown |
| FX-02 | P1 | Effect added → effect params in Inspector → live preview |
| FX-03 | P2 | Multiple effects on clip → reorder via drag → rendered in new order |

## 20. Transitions (TRANS) — 3 scenarios

| ID | P | G/W/T |
|---|---|---|
| TRANS-01 | P1 | Two adjacent clips → drag transition onto boundary → crossfade created |
| TRANS-02 | P1 | Transition clip → Inspector → duration slider → transition stretches |
| TRANS-03 | P2 | Transition → right-click → replace with other type |

## 21. AI Asset Import (AI) — 3 scenarios

| ID | P | G/W/T |
|---|---|---|
| AI-01 | P1 | File menu → "Import from AI" → dialog lists local AI-generated folders |
| AI-02 | P1 | AI folder selected → all clips imported with metadata (prompt, model) |
| AI-03 | P2 | AI clip in timeline → Inspector shows original prompt + reroll button |

## 22. Vox Subtitle Sync (VOX) — 3 scenarios

| ID | P | G/W/T |
|---|---|---|
| VOX-01 | P1 | Audio clip + SRT file → drag SRT onto clip → subtitle track created at word-level timing |
| VOX-02 | P1 | Subtitle clip → Inspector → edit word → preview updates at exact word timing |
| VOX-03 | P2 | Subtitle track → export → burned into MP4 correctly |

## 23. Multi-Select (SEL) — 3 scenarios

| ID | P | G/W/T |
|---|---|---|
| SEL-01 | P0 | Shift+click second clip → both selected |
| SEL-02 | P0 | Multiple selected → drag one → all move together, relative spacing preserved |
| SEL-03 | P1 | Cmd+A → all clips on active track selected |

## 24. Magnetic Timeline (MAG) — 2 scenarios

| ID | P | G/W/T |
|---|---|---|
| MAG-01 | P2 | Magnetic mode on → delete clip → subsequent clips slide left to fill gap |
| MAG-02 | P2 | Magnetic mode on → insert clip → subsequent clips slide right |

## 25. Project Templates (TPL) — 2 scenarios

| ID | P | G/W/T |
|---|---|---|
| TPL-01 | P2 | File → New from Template → template gallery → select → project with placeholders |
| TPL-02 | P2 | Current project → File → Save as Template → becomes reusable |

---

## Top 20 "must work first" BDD (targets for R27 BDD tests)

1. SHELL-01  2. SHELL-02  3. ASSET-02  4. ASSET-03  5. TL-01
6. TL-04    7. TL-05    8. CLIP-01   9. CLIP-02  10. CLIP-03
11. CLIP-05 12. CLIP-07 13. PREV-01  14. PREV-02 15. SCRUB-01
16. SCRUB-03 17. INS-02 18. FILE-01  19. FILE-03 20. UNDO-01

## Status tracking

All scenarios start `status: todo, verify: pending`. Updated via `bdd-manage.py` during implement/verify phases. See `/Users/Zhuanz/bigbang/ClaudeCodeConfig/rules/bdd-driven.md`.
