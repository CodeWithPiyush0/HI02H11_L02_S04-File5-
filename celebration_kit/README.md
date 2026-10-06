# Swiftie celebration kit

A drop-in, lip-synced celebration Swiftie for any SwiftPAL lesson. She jumps on «शाबाश!», talks with her
beak opening on each syllable of the lesson's own celebration line, then idles with her mouth shut.
Built and measured on MTG2A04_L01_S01: the mouth matches the voice in 99.6–100 % of samples.

## What's in here
| file | what |
|---|---|
| `sheets/cel_shabaash.webp` · `cel_talk.webp` · `cel_idle.webp` | the three sheets, 6×6 frames of 329×440, **already size-matched and feet-aligned** (the originals were drawn at three different scales) |
| `sheets/cel_meta.json` | frame size, grid, and each sheet's roles: शाबाश `pre` / `word` / `post` frames, talk `open` (mouth-open) frames, idle `loop` (mouth-shut frames only) |
| `make_lipsync.py` | measures a celebration VO → the lip-sync track (25 ms per char, `1` = syllable beat) |
| `swiftie_celebration.js` / `.css` | the player: `SwiftieCelebration.play({...})` |
| `_selftest/` | stand-alone test page + scorer (real audio, headless Chrome) |

**Do not edit the sheets or `cel_meta.json`** — the open-mouth frame lists were measured and checked by
eye. Nothing in them is lesson-specific; only the lip-sync track is.

## Use in a lesson (3 steps)
1. **Copy** `sheets/*.webp` into the lesson's assets (e.g. `assets/UI/celebration/`) and inline or ship
   `cel_meta.json`, `swiftie_celebration.js` and `swiftie_celebration.css`.
2. **Measure the lesson's celebration VO** (re-run whenever it is re-recorded):
   `python make_lipsync.py assets/Audio/vo_cel_prompt.ogg --json cel_track.json`
3. **Play it when the celebration VO starts:**
   ```js
   SwiftieCelebration.play({
     host: celebrationBoxElement,          // give it a size, e.g. width 300px, height 358px
     meta: CEL_META,                       // contents of cel_meta.json
     base: "assets/UI/celebration/",       // where the three .webp files are served
     bits: CEL_TRACK.bits, step_ms: 25,    // from cel_track.json
     audio: celebrationAudioElement        // OR  isSounding: () => isPlaying   (SwiftPAL engine)
   });
   ```
   Start it **at the same moment** as the VO (or just before; it waits up to 1.8 s for the voice to
   start sounding, then idles if it never does).

### In a SwiftPAL engine lesson (lesson_template.html lineage)
The celebration VO is played by the engine's `CELEBRATION` module through `play()`, which sets the global
`isPlaying`. Wrap the module (don't edit the engine file), hide the stock `.end-mascot`, and put a
300×358 host in its place, so the `आगे बढ़ें` button stays exactly where the reference lesson has it:
```js
const _cel = SlideModules.CELEBRATION.mount;
SlideModules.CELEBRATION.mount = function(host, slide){
  const r = _cel.apply(this, arguments);
  const img = document.querySelector("#endScreen .end-mascot");
  let box = document.getElementById("celBox");
  if(!box){ box = document.createElement("div"); box.id = "celBox";
            box.style.cssText = "width:300px;height:358px;position:relative;z-index:2";
            img.parentNode.insertBefore(box, img); }
  img.style.display = "none"; box.innerHTML = "";
  SwiftieCelebration.play({ host: box, meta: CEL_META, base: "assets/UI/celebration/",
                            bits: CEL_TRACK.bits, step_ms: 25, isSounding: () => isPlaying });
  return r;
};
```
Run this after the engine has defined `SlideModules` (e.g. in a `setTimeout(..., 0)` or an injected
block after the engine script). `CEL_META` / `CEL_TRACK` can be inlined into the page or carried on
the card (`CARD.end_anim`) by the lesson's build script.

## Verify
`python _selftest/_test_run.py <shot_prefix>` → expect `mouth = VO 100.0%` and no misses away from a
syllable edge. In a lesson, the equivalent check is to log `.swc-sprite` `data-sheet` / `data-f` /
`data-t` while the celebration plays and compare each talk frame's mouth (in `meta.talk.open`) with the
track at `t + 16 ms`.

## Timeline (for reference)
before the first sound → शाबाश 0–5 (standing) · the first word → शाबाश 6–29 (the jump, mouth open,
stretched to that word) · the pause after it → शाबाश 30–35 (lands) · the rest of the line → talk sheet,
a cursor walking forward but only landing on frames whose mouth matches the track · after the VO →
idle sheet, mouth-shut frames 0–4 + 24–35 only (its laughing frames 5–23 would look like talking in
silence).

The line should **start with «शाबाश!»** (or another short cheer followed by a short pause) — the jump is
fitted to the first word.
