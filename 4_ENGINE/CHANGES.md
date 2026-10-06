# engine_local — HI02H11_L02_S02 (भाग 1 — उ / ऊ) · «मात्राओं की रेल»

Per-game engine copy. Baseline preserved as `_baseline_08.04b.html`, so every edit is diffable.

| | |
|---|---|
| Base engine | **2026.08.04b-r4-unified** |
| Copied from | `G2/HI02H11_L02_S01/engine_local/lesson_template.html` |
| Inherited changes | 3, unmodified (see the sibling's CHANGES.md) |
| **New here** | **the train module set** — 7 modules + the shell + a 3-attempt ladder |

## Why the modules live here and not in a dev ticket

The SME's «मात्राओं की रेल» design needs mechanics the shared engine does not have. The kit's
documented route for a per-game engine change is this folder, and it already held three. So the
modules were built here rather than waiting on the queue. Everything is **additive**: new entries
on `SlideModules` plus one CSS block, injected between marked fences. **No existing module,
helper or style is modified**, so every other lesson on this engine line renders byte-identically.

Rebuild with `scratchpad/inject_train.py`, which is idempotent — it strips the previous block
before re-inserting, so iterating never stacks two definitions. **Do not hand-edit the monolith.**

⚠️ **After changing the modules you MUST re-run the builder.** The served file is
`HI02H11_L02_S02.html`, which is generated from this template; patching the template alone leaves
the game running the old code. This cost one full debug cycle — three screens looked unfixed
because the HTML had not been regenerated.

## What was added

| module | what it does | screens |
|---|---|---|
| *(shell)* | locomotive + N coaches + track, right-to-left entry, 7 coach states | all train screens |
| `TRAIN_TAP` | tap the coach whose word carries the matra | 8, 9, 10 |
| `TRAIN_SORT` | drag cards into coaches — three kinds: `word`, `matra` (reverse), `picture` (labels hidden) | 11, 12, 14 |
| `MATRA_FILL` | a word with a blank; drag the matra in, the word completes | 13 |
| `MATRA_BUILD` | staged transformation: base → consonant → matra travels in → syllable → word | 2, 4 |
| `MEET_PAIR` | two example words, one at a time, each with its matra called out | 3, 5, 7 |
| `CONTRAST_PAIR` | a minimal pair taught head to head (फुल ≠ फूल) | 6 |
| `POEM_SEARCH` | poem card, draggable magnifying glass, N sequential target rounds | 15 |

Plus the **3-attempt ladder** (wrong 1 = hint VO, no hand · wrong 2 = hint VO + hand on the correct
coach · 3rd-try correct = confetti but silent), implemented inside these modules rather than by
changing the shared scaffold, so the blast radius stays in this game.

## Four engine facts this code is built around

Each one cost a debug cycle here or on the sibling. Do not undo them.

1. **`capture_pages.py` injects `*{animation:none!important;transition:none!important}`.** Anything
   that exists only inside an `@keyframes` is invisible in the review deck. Every element is
   therefore authored in its **settled** state and the entry motion is an added class. Kill the
   animation and you get the finished slide.
2. **Staged reveals must use the engine's `seq-hidden` naming.** The capture harness strips
   `/\S*seq-hidden/g` before shooting. A bespoke hidden class is invisible to it — which is exactly
   why the build screens first photographed as panel 1 only and both sort trays photographed
   empty. The classes are now `mb-seq-hidden` and `tr-seq-hidden`.
3. **Content that appears from an audio callback must also be painted synchronously.** `MEET_PAIR`
   built every example inside a `play()` callback, so a frozen capture caught an empty card and
   three teach pages shipped blank in the first deck. It now paints example 1 at mount.
4. **`makeDraggable(tile, onDrop)` hit-tests `.dd-zone`** and calls `onDrop(zone, tile)`. Coaches
   that accept a drop carry `.dd-zone`; tap-only coaches must not, or a stray drag highlights them.

## The guiding hand: an older ruling wins over the SME's note

The SME asks for the hand nudge on the 2nd wrong attempt on **every** test screen. The engine
carries a signed-off ruling ([28f], Yasir 2026-07-28): the hand is allowed in **tutorial and
guided**, and **never in practice** — "regardless of whatever name we save it by". Its own comment
says a new mechanic must call `handOnAnswer()` rather than `pointNudgeAt()`, because ~25 direct
callers once bypassed the gate and a hand appeared in round 3.

I wrote the modules against `pointNudgeAt()` first, which bypassed it. **Fixed**: every nudge now
goes through `handOnAnswer(el, slide)`. Net effect — guided screens get the hand as the SME asked;
practice screens get the coach **glow** but no hand. The glow is ours and is not phase-gated, so a
practice slide still escalates visually. Flagged to the SME rather than silently overriding either
ruling.

## Two engine behaviours worked around, both worth fixing upstream

- **The heading band does not collapse when `prompt_hi` is empty.** The SME asks for VO-only
  instruction on every test screen, so those slides ship `prompt_hi: ""` — and the engine still laid
  out the band, leaving a bare blue pill across the top of nine screens. Worked around with
  `.header-row:has(#promptText:empty){display:none}`. Belongs in the engine.
- **`concept_strip` landings never receive the glow class** — carried over from the sibling; this
  bundle still ships its own scoped rule.

## `ु` and `ू` must never be added to `RIGHT_SPACING_MATRAS`

They are **below-base** marks sharing their consonant's columns, so `_matraClipCols` colours the
**next letter**. Measured, forced on and rendered:

| word | red px | where |
|---|---|---|
| **पुल** (ु) | 11,342 | **27–50% of the word — on the ल** ❌ |
| **फूल** (ू) | 450 | a 13-px sliver ❌ |
| नाक (ा) / तीर (ी) *controls* | 6,704 / 8,944 | correct ✅ |

`guard_engine` in the builder **hard-fails** if either is added, because the failure is silent and
looks like the feature working. `ा` and `ी` are the only two matras the pixel-column method can
ever handle, so every remaining lesson in this LO needs glyph-cluster highlighting — filed, now
carrying reports from both matra lessons.

## Still upstream, deliberately not hacked in here

The train shell, the 3-attempt ladder and these seven modules are all worth having fleet-wide. They
are filed as engine requests under session `sme-lxd-matra-train` and should be **promoted from this
copy into the shared engine** rather than reimplemented — the code here is the reference
implementation, and it has been exercised end to end.

---

# ROUND 2 — the SME's review of the built HTML (2026-09-21)

Their words: the heading box above the train screens was missing, things were overlapping in many
places, and **a large part of their comments had not been implemented**. All three were correct.
This round fixes them and adds one module. Everything is still additive.

## What was wrong, and what actually caused it

Each of these passed every automated check. The bundle scored **0 FAIL / 0 WARN with all four
defects on screen**, which is the point worth remembering: nothing here was findable without
rendering the page and measuring it.

| # | Symptom | Real cause | Fix |
|---|---|---|---|
| 1 | Mascot sat at the top beside **nothing** on 14 of 16 screens | `prompt_hi: ""` everywhere plus `.header-row:has(#promptText:empty){display:none}` — my misreading of "No instruction text on screen" | every screen carries its heading; `guard_prompts` now **fails the build** on an empty one |
| 2 | `प` and `ल` spilled out of the coach and hit the next coach | the blank carries `.dd-zone`, and the engine sizes **every** drop zone `width:150px`, which beat `min-width:44px`. Measured: `.tr-fill` 216px inside a 172px body | `.tr-body .tr-blank.dd-zone{width:auto;min-width:54px}` |
| 3 | The result word printed **through** its picture | `centerInkGlyph()` translateYs each `.ink-glyph` to centre its ink **in its parent**; the parent was the whole tall panel. Measured: `translateY(61.97px)` | `.ink-box` — a parent that hugs the word, with 12px side padding so the engine's ink-fit does not shrink it |
| 4 | Coach labels touched the coach roofs | the label itself contains a matra (`छोटी उ ◌ु`), which descends | `--hi-lh: 1.45` everywhere + coach gap 12px |

## The in-word matra highlight — now possible

The single most repeated note in the SME's deck is *"Highlight only the matra in the word"*, and
round 1 shipped without it on the grounds that it could not be done for `ु`/`ू`. That was true of
**the engine's method**, not of the problem.

`RIGHT_SPACING_MATRAS` + `_matraClipCols` clip a vertical **pixel column** range. `ा` and `ी` own
an advance to the right of the consonant, so a column isolates them. `ु` and `ू` have **zero
advance** — they hang under the consonant and share its columns — so a column clip selects the
consonant and whatever follows. Forced on and measured: **पुल → 11,342 red px on the ल**.

`matraHL()` clips in **two dimensions**:

1. `Intl.Segmenter('hi')` splits the word into grapheme clusters, so `पुल → ["पु","ल"]` and the
   mark is never separated from its base.
2. A `Range` rect gives that cluster's exact x-range.
3. Intersect with the band **below the baseline**, found with a zero-size inline-block strut.

Nothing else in these words descends, so the intersection is the mark and only the mark. Verified
at 150px on `पुल`, `फूल` and `मुकुट` — the last correctly reddens **both** of its `ु` marks.

Two things to preserve if this is ever touched:

- **The overlay's text is in `data-w`, painted by `.mh-ov::before`, NOT a text node.**
  `centerInkGlyph()` measures with `textContent`, which concatenates descendants — a text-node
  overlay makes `पुल` measure as `पुलपुल` and the engine then shrinks the real word to fit a
  doubled ink box.
- **`matraHLSoon()` retries across ~10 frames and again after `document.fonts.ready`.** A single
  rAF retry was not enough: a MEET_PAIR word came back with zero overlays and **no error**, which
  is exactly the silent-failure shape this lesson keeps producing.

The function already handles right-spacing matras (it measures the cluster with and without the
mark and switches mode when the advance grows), so `ा`/`ी` work too. भाग 2 (ए/ऐ) needs a third
mode for above-base marks; the branch point is marked.

**`ु`/`ू` must still never be added to `RIGHT_SPACING_MATRAS`** — `guard_engine` still hard-fails
on it. `matraHL` replaces that path here, it does not rehabilitate it.

## MATRA_INTRO — the eighth module

The SME's screen 1 asks for *"the letter and its corresponding matra symbol as a pair, one by
one … आ → ा"*. The stock `INTRO` draws a row of bare symbols, so the built screen showed `◌ु ◌ू`
with no vowels beside them — the child was never told which sound each mark carries. `MATRA_INTRO`
shows `उ → ◌ु` and `ऊ → ◌ू`, one pair lit at a time while its VO plays, the rest dimmed, आगे
locked until both are done. Painted settled, so a frozen capture shows the whole screen.

## Also implemented from the deck, previously missing

- **The POEM_SEARCH ghost**, in full: entry flight round the lens → dim to a corner · idle drift
  toward the poem · happy bounce + sparkle on a hit · thinking face on a first miss, no hand ·
  drift to a real target and pulse on a second miss (this is the hint) · fly-across with sparkles
  at round end · centre spin + lens glow at the finish. Plus round dots, so a child can see how
  many words remain without adding instruction text.
- **MATRA_BUILD panel captions** from `slide05_image5.png` — «यह शब्द देखिए — पल», the equation's
  own one-liner, «पल से बना पुल» — and the base picture slot.
- **MEET_PAIR shows the word first, the picture a beat later**, per *"Word should appear first,
  then image should appear"*. `.mp-pic` starts transparent and is revealed on the clip.
- **SFX**: train arrival whistle on entry and on completion, a pop as each matra lands, a sparkle
  on each highlight. Synthesised with the engine's own `_tone()`, so no new files ship.

## Capture-harness rule, restated because it bit again

Anything revealed from a `play()` callback must **also be painted at mount**, or the review deck
photographs it missing. This round that meant the matra highlights on MATRA_BUILD and
CONTRAST_PAIR: live, those panels are `mb-seq-hidden` so the child never sees the red mark early,
but the capture strips `seq-hidden` and freezes before any audio, so a highlight applied only in
the callback was invisible in the deck. `matraHL` is idempotent, so painting at mount and again in
the chain is safe.

## How this round was verified

Driven, not just rendered:

- tap ladder walked on a TRAIN_TAP screen — **no** nudge and **no** hand on miss 1, coach glow
  **and** hand on miss 2, silent confetti on a third-try win;
- all three words dragged into place on MATRA_FILL including a deliberate wrong drop (returns the
  card, counts the attempt), completed words keep their matra marked;
- both POEM_SEARCH rounds played to completion — 3 then 6 hits, dots reset between rounds, ghost
  and lens finish states fire, nav opens;
- all 16 slides mounted in sequence: **zero JS errors**, 16/16 headings present;
- 0 FAIL / 0 WARN, 79/79 clips, 10/10 images, every referenced asset 200.

`assets/UI/hint.png` and `hint_active.png` resolve to 404 if fetched, but `#hintImg` does not exist
in this engine build so the guarded branch never runs and the browser never requests them. Present
in the sibling bundle too; inherited from the shared engine, not introduced here.

## A silent 404 found while packaging the handoff

`MEET_PAIR` played its example lines with `say(ex.audio_line)`, where `ex.audio_line` is the bare
clip **id** `"vo_meet_pul"` — not a path. The browser therefore requested `/vo_meet_pul`, got a 404,
and **the child heard nothing on the line that teaches the word**, on all three example screens.
`MATRA_INTRO` had the same bug on its pair names.

It survived every check we have:

- the clip **exists** on disk, so `_verify_assets.py` passed;
- the preloader fetches by id and builds the path correctly, so the asset sweep saw a **200**;
- `say()`'s 9-second fallback timer fires when a clip fails, so the chain still advanced, the
  slide still completed and no JS error was raised.

It was visible only in the browser's own network log, read while checking the packaged copy.

**Fix:** `clip(idOrPath)` normalises a bare id to `assets/Audio/<id>.<ext>`, and `say()` now runs
every source through it. A caller can pass either form and cannot reintroduce this. The six call
sites that previously built the path by hand now use `clip()` too, so there is one way to do it.

**Lesson for the checklist:** "the asset exists and serves 200" and "the module requests the right
URL" are different claims. Only the second one is what the child hears. Read the network log.


---

# ROUND 3 — the SME's review of the round-2 build (deck of 2026-09-22)

Their deck deletes two screens, replaces a third, adds three, rewrites one module, asks for one
that did not exist, and flips the register of the whole lesson. Everything below is still
**additive**: two new `SlideModules` entries, edits confined to this bundle's own modules, and one
appended CSS block. `MATRA_FILL`, `CONTRAST_PAIR` and `POEM_SEARCH` are left **registered and
untouched** even though nothing mounts them any more — removing them would change the engine for
every other lesson on this line, which is the one thing this folder must never do.

## Two new modules

| module | what it does | replaces |
|---|---|---|
| `WORD_BUILD` | picture above each coach, `_ल` inside it, drag a whole **अक्षर** into a blank that sits **first** | `MATRA_FILL` (which dragged a bare matra into `प_ल`) |
| `SENTENCE_COMPLETE` | scene illustration one side, a sentence with a dashed blank the other, three picture option cards below | `POEM_SEARCH` — and three more instances beside it |

`WORD_BUILD` judges a drop by **reconstructing the word** (`akshar + slot.tail === slot.word`)
rather than by an index. That is what makes a distractor match nothing by construction, and it is
why the two `…ल` coaches can never both accept the same tile. `guard_word_build` in the builder
proves both properties every build.

`SENTENCE_COMPLETE` treats a tap as **both the read and the choice**: the option's word VO plays
first and the answer is judged when that clip ends, so a child who cannot decode खुश can still
hear it and decide. Wrong taps shake and return — they do **not** lock — because the SME specifies
the 3-attempt ladder here as on every other test screen.

## Changes to existing modules

- **`TRAIN_SORT`** — praise is now **per card** (`card.correct_audio`) and the slide-level
  completion line is gone, which is what the SME asked for card by card; `data.single` limits a
  coach to one card (the matra round); coach labels fade in one by one (`tr-lblseq`).
- **`MATRA_INTRO`** — each pair now rides in a **train bogie** behind the locomotive, on the same
  track the test screens use, for the "मात्राओं की रेल journey" continuity the deck asks for.
- **`MATRA_BUILD`** — `explain` is gone (its content moved into the reworded `result` line) and a
  new `sounds` rung speaks the SME's **sound-differentiation** beat, प · पु · पुल, as ONE clip so
  the deliberate pauses survive.
- **`MEET_PAIR`** — the separate matra call-out clip is optional now; round 3 folds it into the
  example line itself.
- **The landing** — `dressLandingTrain()` re-dresses the SHARED engine's concept strip as a
  locomotive + bogies + track, **after** boot has painted it, gated on `landing_hero.train`. The
  shared engine is not touched, and a card without that flag renders exactly as before.
- **`sayOpt()`** — a helper for the rungs the SME deliberately SILENCES (the 3rd-attempt win, the
  sort completion line). Handing `play()` a null source instead would sit out say()'s 9-second
  fallback timer, turning "no praise" into "nine seconds of nothing".

## The guiding hand — the older ruling still wins, now confirmed

The SME again asks for a hand nudge on the 2nd wrong attempt on **every** test screen, and round 3
makes that 11 screens including all four new ones. Ruling `[28f]` (Yasir, 2026-07-28) allows the
hand in tutorial and guided and forbids it in practice. **Confirmed with the user on 2026-09-23:
keep `[28f]`.** So practice screens get the option/coach **glow** and pulse — which is ours and is
not phase-gated — and the hand is withheld. Every nudge in both new modules routes through
`handOnAnswer()`, which is the only place the rule can be enforced. Verified by driving: the hand
appears on the three TRAIN_TAP screens (guided) and does not appear on the four sentence screens
or on WORD_BUILD (practice), while the glow appears on all of them.

## ⚠️ CORRECTION to fact 1 above: what `capture_pages.py` actually strips

Fact 1 in the round-1 section says the capture harness strips `/\S*seq-hidden/g`. **It does not.**
The shipped script removes only the exact class `.seq-hidden`:

```js
document.querySelectorAll('.seq-hidden').forEach(function(e){ e.classList.remove('seq-hidden'); });
```

`mb-seq-hidden` and `tr-seq-hidden` survive it. Round 2's deck looked complete anyway because
every clip existed, so the audio-driven reveal chain finished inside the harness's wait and the
classes were removed by the modules themselves. Round 3 has 61 clips still unrecorded, `say()`
falls back to a **9-second timer per clip**, and the chain cannot finish — so MATRA_BUILD
photographed as panel 1 alone and MEET_PAIR as an empty card.

That is a **capture artefact, not a render bug** — the same screens are complete when driven. But
it means the review deck cannot be trusted while any clip is missing. Until the harness is fixed
upstream, capture with a settler that strips **every** `*seq-hidden` variant and re-applies the
settled classes; `_review_shots/` in this bundle was produced that way.

---

# ROUND 3b — the painted train, ported from the sibling lesson

The SME's landing mockup draws a **painted** locomotive with the matras inside its bogies. Round 3
shipped a drawn SVG stand-in on the grounds that painted art needed a generation run. That was the
wrong call for a reason nobody had checked: **the sibling lesson `HI02H11_L02_S01` had already
built exactly this screen and shipped it.**

## What came across, and what was changed

| | |
|---|---|
| ported verbatim | the `matra_train` landing: 6×6 spritesheet, travel curve, chimney smoke, ink-centred matras, the rail, and every measurement comment |
| adapted | **three coaches → two.** All 36 cells cropped 634 → 479px |
| adapted | panel centres 41.17% / 64.27% of 634 → **54.49% / 85.07%** of 479; chimney 8.4% → **11.12%** |
| adapted | entrance `translateX(136%)` → **168%** — that percentage is of the wrap's own width |
| replaced | the synthesised `_tone()` train sounds → the sibling's **real recordings** |

**Why the cells are cropped rather than the third coach simply left empty.** The note says "Show
only two matra boxes/cards". A third, empty coach reads as a lesson that lost its third matra.
The cut is at x=479, which is inside the coach-2/3 coupling (its ink-height minimum is at
x=476–480) and clear of the pink coach, whose first painted column across **all 36 frames** is
x=481. Cutting at 484 — which looked right on a single frame — left a pink sliver visible on the
landing.

## Two traps this port hit, both worth knowing

1. **The extracted CSS began mid-comment.** Lifting a line range out of the sibling's engine
   started the block inside a comment, so it opened with orphaned prose and a stray `*/`. The CSS
   parser read that as a bad selector and ate the rules after it — `.lt-clip` and `.lt-track`
   never applied, the clip stayed 478px wide instead of 1080, and **the rail rendered with height
   0**. Nothing errored; the train simply had no track under it. When lifting a block out of
   another file, cut on a rule boundary, not on a line number.
2. **`sfxWhistle` is shared.** `buildTrain()` calls it on every train screen, so repointing it at
   a real file changes seven screens, not just the landing. That is wanted here — the SME asks for
   the arrival sound on all of them — but it is the kind of edit that looks local and is not.

## The SFX are real recordings now

`sfx_train_arrive`, `sfx_train_move`, `sfx_whistle` and `sfx_mt_burst` are the sibling's own files.
`sfxFile()` plays them and falls back to the old `_tone()` synthesis if one is ever missing, so a
stripped bundle still makes a sound rather than going quiet.

## Which train is painted, and which is not

Only the **landing**. The in-slide trains on TRAIN_TAP / TRAIN_SORT / WORD_BUILD stay drawn,
because their coaches have to recolour per screen, glow, shake, lock and accept drops — none of
which a flat sprite can do. MATRA_INTRO also stays drawn: its coach body carries a whole
«उ → ◌ु» pair, which does not fit the painted coach's matra panel. This is the (a) option from the
round-3 change request §4, now with real art where the mockup actually shows it.

## ROUND 3b, second pass — the port was only half done

The first pass repainted the LANDING and left `buildTrain()` drawing an SVG train on the seven
activity screens. That is precisely the defect the sibling's `[r7]` note describes, reintroduced:
a painted cover and a drawn everything-else.

`TrainChrome` is now ported in full and `buildTrain()` is a thin adapter over it, so TRAIN_TAP,
TRAIN_SORT, WORD_BUILD, MATRA_INTRO **and** the landing all mount the same train. Two
compatibility details keep seven modules working unchanged: `.coach-body` also carries the old
`.tr-body` class and `data-idx` (makeDraggable hit-tests it), and `coaches[i].body` is the
`.coach-face` — the painted cream panel — because that is where content belongs.

Slicing also retired the cropped two-coach sprite sheet: a two-coach train is parts 0..2 of the
three-coach artwork and part 3 is simply never drawn.

### Three things this second pass found and fixed

1. **Sorted cards were appended to the coach BODY, not its panel.** `zone.closest(".tr-body")`
   returns the body — correct as a drop target, wrong as a parent — so two cards landed at the
   body's top-left and spilled out of the coach. They go to `.coach-face` now, and a snapped card
   is sized to fit two across a 162px panel.
2. **The coach words appeared with the train.** The note says "After the train stops, the three
   coaches पुल, दूध, सूरज appear clearly" — so the words are held on `tt-hold` and revealed from
   `on_enter`, 180 ms apart.
3. **The geometry sweep reported 8 of 17 slides overflowing, and every one was a false alarm.**
   It measured 0.9 s after mount while the train takes 3.4 s to pull in, so it was catching the
   train mid-arrival, outside the stage, which is where a train arriving from the right is meant
   to be. With the settle raised past the travel: 0 of 17. Any harness that measures this lesson
   must wait out `TRAIN_TRAVEL_MS`.

---

# ROUND 3c — VO clashes, and the cover matched to the sibling properly

## The clash, measured rather than guessed

Nothing in this bundle checks the house rule "never overlap two VO clips", and it is invisible to
every other test: each clip exists, is the right length and plays. So `play()` was instrumented
with the clips' REAL durations, every interval recorded, and any pair overlapping by more than
120 ms reported. Two causes came out, and one of them was mine:

1. **The prompt talked over the arriving train.** Every train module fired its prompt VO at mount,
   while the train spent 3.4 s pulling in under a whistle and a chug bed — on all seven train
   screens. The SME's ordering is explicit: "Train comes through animation from right to left.
   Train stops at the centre of the screen." and only then "VO: जिस डिब्बे में …".
   **Fixed:** `buildTrain()` exposes `whenParked(fn)`, fed by TrainChrome's `on_enter`, and every
   train module now gates its opening prompt on it. (The sibling does the same thing through
   `state.promptGate`, which *this* engine sets but never reads — it has no such hook.)

2. **A stale chain could speak over the next screen.** Every module drives a chain of clips that
   call each other's callbacks, and a chain has no idea the screen under it has changed. Measured:
   two concurrent MATRA_INTRO mounts put `vo_pair_u` on top of *itself* for 2.1 s.
   **Fixed:** `newVoEpoch()` at the top of every mount, and `say()` drops any callback whose epoch
   has moved on. One chain at a time, ever — a re-mount, a replay or a fast आगे can no longer
   produce two voices.

**A caution about the measurement itself.** The first run reported 9 clashes and *most were the
harness's own fault*: it re-mounted slide 0 (which the start button had already mounted, so two
copies of the module ran), and it allowed 14 s per slide when the longest teach chain runs ~24 s,
so one screen's tail landed on the next. Both were fixed in the harness before drawing any
conclusion. A test that creates the defect it reports is worse than no test.

## The cover, actually matched this time

Three concrete differences from the sibling's cover remained after round 3b:

| | was | now |
|---|---|---|
| scale | `maxH 220` → k=0.372, a chunky train crowding the card | `maxH 174`, i.e. the sibling's own per-part scale of 634/2155 = 0.294 |
| rail | a track ran under the cover train | **no rail** — the sibling's cover has none. The track belongs to the activity screens, where the train arrives along it; on the cover it cut the card in half |
| matras | **the coaches photographed EMPTY** | they are revealed from `on_enter` at 3.4 s, so anything looking earlier saw two blank coaches — which is what the round-3b review deck shipped. A 5 s backstop now reveals them regardless, and the capture waits out the arrival |

The tray cards were also matched to the sibling's `.tt-card` (paler border, flatter shadow, roomier
padding) and the activity trains raised to `maxH 270` — the sibling uses 300 and carries no heading
band, which this lesson does.

---

# ROUND 5 — the buttons, the cover's motion, and the train back on page 1

Three asks, all of them "make it match the sibling lesson":

> currently page1 feels bit empty, do one thing bring back the train in page 1, but it should not
> get outside of the box that is made — also you are still not using the buttons and its placement
> used in this file (play button, next button) — and also in the cover page there is animation in
> the stars and bubble which is currently missing in my current file

## What was actually different, measured rather than eyeballed

The buttons were the confusing one, because the *pills* were already identical — same fill,
border, radius, shadow, `bottom`, `min-width`. Diffing the two engines rule by rule found the
differences were all in the CONTENTS:

| | S01 | this build, before | now |
|---|---|---|---|
| `.nav-btn::after` | `content:"→"; font-size:52px; line-height:1` | `content:"→"; font-size:28px` | matched |
| `.sg-btn` label | icon-only `▶` via `::after`, Hindi in `aria-label` | the text `शुरू करें` | matched |
| `.sg-btn` states | `.sg-waiting` + `.idle-pulse` | neither | matched |
| `.end-btn::after` | `content:"→"; font-size:52px` | none (arrow **typed into the label**) | matched |
| animation kit | installed | `grep -c "sg-sky\|sgFly" == 0` | ported |

A 28px arrow against a 52px one is nearly half-size, which is why the next button "looked wrong"
on a pill whose geometry was already right.

## The pulse is still not wallpaper

Ruling [30l] in this engine killed `sgBtnPulse` outright because it ran from first paint: it was
decoration, not a signal, and there was nothing left to escalate to when a child actually stalled.
That ruling is intact. S01's answer is better than either extreme and is what was ported: the
pulse hangs off `.idle-pulse`, which only a 5-second idle timer adds. A resting button is still
perfectly still. A tap anywhere on the cover RESTARTS that wait rather than cancelling it —
cancelling meant one stray tap bought permanent silence, which is not what "idle for 5 seconds"
describes.

The second state is `.sg-waiting`: while the greeting is speaking the button is genuinely
disabled, so it is drawn disabled. A bright button that ignores taps is worse than a grey one,
because the child concludes the screen is broken rather than that it is busy.

## The animation kit

Recipes 1 (drifting stars) and 2 (tap to burst) from the kit S01 installed, ported whole —
CSS into `train_styles.css`, JS into `train_modules.js`, and the `.sg-glow` / `.sg-sky` layers
into the body of `lesson_template.html` (they are outside the injection fences, so they live in
the template itself). `bgdeco_star.svg`, `bgdeco_star_o.svg` and `bgdeco_spark.svg` came back —
they were deleted in an earlier round as "unused", which they were, right up until this.

`startnew_bg_plain.webp` came with them and is **mandatory, not cosmetic**. Our shipped
`startnew_bg.webp` has stars, sparkles, rings and dots PAINTED IN; drifting a second set over them
is the kit's own documented "two sets of stars, one frozen and one moving" bug.

### One deliberate divergence from S01

The kit's burst handler claims a tap with `stopPropagation()` + `preventDefault()`. On the
background that is right. On a button it is not: `preventDefault()` on `pointerdown` suppresses
the click that follows, so a star drifting over शुरू करें makes the button silently ignore the
press. Two things make that likelier than it sounds — the mask that punches a hole over the centre
card is VISUAL ONLY (a star inside it still has a real box and a real computed opacity, so the
kit's own `minAlpha` test cannot tell it is invisible, and the play button sits inside that hole),
and `pad` is `max(12, width*0.7)`, so a star is a bigger target than it looks.

`INTERACTIVE_TAPS_ARE_NOT_OURS`: the handler now checks what is under the pointer and leaves
`button, a, input, select, textarea, [role=button], [onclick]` alone. S01 carries this latent bug.

## Page 1's train

The page-1 note says "Do not add extra decorative elements", so a train that is only scenery would
put back exactly what that line removes. The train therefore **carries the content**: coach *k*
holds the matra of pair *k*, revealed on the same beat the pair lights up. Same two matras, on the
train theme the deck asks to keep running through the lesson — not a third thing on the screen.

"Not outside the box" is enforced **structurally**, not by picking a lucky number:

* `.mp-train` is a fixed 560px box with `overflow:hidden`, so the 3.4s arrival that starts fully
  off to the right is clipped at the box edge rather than trusted to fit.
* `maxW:520 / maxH:150` size the artwork to ~412×150 inside that box, so at rest there is a
  visible run of track either side and nothing is near an edge.
* `.mp-train .train-track{left:0;right:0;}` — the track is drawn `-7%/-7%` on the activity screens
  so the line outruns the train. In a 559px box that is a 39px overhang at each end, and
  `overflow:hidden` would CUT it; a sliced rail reads as a mistake. Pulled back to the box edges
  so the clip is left to do the one job it is actually for.

The prompt now waits for `whenParked`, like every other train screen here. Firing at mount would
put the instruction under a moving train with a whistle and a chug bed over it — the clash already
fixed seven times in round 3c. The chain's failsafe went 30s → 34s to cover the arrival it now
waits on.

Measured at three moments (mid-arrival, at rest, after the chain): furthest part outside the box
is **+116px mid-arrival — clipped — and +0.0px at rest and at the end**.

## Three bugs this round found, none of them in the ask

### 1. A `</sty`+`le>` inside a CSS comment took the whole page apart

The new CSS block carried the comment *"This block is injected before the last `</style>`, so it
is later than the original .start-bg"*. The HTML parser does not care that it sits inside a CSS
comment: it ended the stylesheet right there, and every rule after it became **text in the body**.

The symptom looked nothing like the cause. The entire stage was shoved to `x=1797` in a 1382px
viewport by a 1797px-wide run of stray CSS text; `.sg-glow` / `.sg-sky` never got
`position:fixed`; and Selenium reported the start button "not interactable" because it now sat
outside a viewport that `body{overflow:hidden}` would not scroll. Clean build, green receipt, no
console error. The control that found it was S01: same measurement there gave `x=26`.

`inject_train.py` now refuses to inject either source if it contains a literal closing tag, and
names the file and line. One string check; half an hour to find without it.

### 2. The end button would have had two arrows

`.end-btn` had its arrow **typed into the label** (`आगे बढ़ें →`) where `.nav-btn` draws it with a
pseudo-element. Adding S01's `.end-btn::after` on top would have rendered `आगे बढ़ें → →`. The
typed arrow is gone and the pseudo-element draws it, matching `.nav-btn` exactly. The *word* stays:
`आगे बढ़ें` is a different action from `आगे`, and dropping it to an icon would be a content change
nobody asked for.

### 3. The harnesses could not press the start button — and three guesses were wrong first

Every one of the 18 captured pages came back as the cover. Three plausible causes were checked;
all three were innocent, which is worth recording because each looked right at the time:

1. **The new disabled state.** शुरू करें is now genuinely disabled while the greeting plays, and
   Selenium refuses to click a disabled control. Real, and the harnesses did need to wait for it —
   but it was not this: the press was happening after the button had gone live.
2. **The star layer.** Removing `.sg-sky` from the DOM entirely changed nothing.
3. **The burst handler eating the tap.** Short-circuiting it via `html.no-anim` changed nothing.

The actual cause: **under Chrome 153 headless the first synthetic press can deliver `pointerdown`
alone** — no `mousedown`, no `mouseup`, no `click` — so the handler never runs. A second press
goes through. The control settled it: **the sibling build behaves identically under the same
driver**, so nothing in either lesson is at fault. (The engine's own drag VO-gate at
`installDragVoGate` does `preventDefault()` on `pointerdown`, which looked like a perfect
suspect — but its selector list is `.sort-item, .dd-tile, .cdm-objtile, .cdm-card, .combine-drag`,
so it never sees this button.)

Both harnesses now press with `ActionChains`, **retry up to four times**, and **poll
`startGate.hidden`** instead of sleeping. The fixed 3.5s sleep was already marginal — the start
handler awaits an audio warm-up capped at 3s and the phase gate holds its peek for ~2s — and
polling asserts the gate DID open, which is what every later screenshot silently depends on. They
also wait for `disabled` to clear first, capped at 20s: above the engine's own 12s stranding
backstop, so a hang there means the backstop failed, which is worth failing on.

The burst guard in the section above was kept even though it was not the cause here. The risk it
closes is real and independent — it just is not what broke the harness.

### 4. Page 1's pairs were not being settled for the capture

`.mp-pair` is held by `opacity:0` and revealed by adding `.active` / `.shown` — a different
mechanism from the `*seq-hidden` classes the settler strips, so SETTLE never touched it. It went
unnoticed while page 1 had no train, because the chain finished inside the harness's 4s wait. Now
that the chain waits for the train to park at 3.4s, the shot caught it one pair in: **the captured
page showed one pair where the child sees two.** A review deck that misrepresents the screen is
worse than no deck. `_capture_settled.py` now settles them to the deck's end state — all pairs
visible, the last still lit, the earlier ones faded.

## Known, and not a build problem

**The phase gate cannot open when the real `play()` is in use under headless Chrome.** Its VO goes
down the WebAudio buffer path and that source's `onended` never fires in this state, so `body`
keeps `vo-lock` and the gate's callback never runs — `startGate` stays up and the lesson never
starts. **S01 behaves identically**, which is what proves it is the harness and not this build.
Stub `window.play` first (which is what `_capture_settled.py` does, and why the gate opens there
once the button is actually pressed), or use the engine's own `?slide=N` QA jump.

---

# S04 — HI02H11_L02_S04 (ओ / औ) on this engine · 2026-10-06

This engine copy is File3's (HI02H11_L02_S02) with these additions. All are gated on card data, so
a card that does not ask for them behaves exactly as File3.

| addition | where | why (deck) |
|---|---|---|
| per-pixel stroke highlight for ो / ौ (`_markMaskK`, mask path in `matraHL`) | matraHL | ो/ौ are a hook above + a stem to the right; a box clip reddens the consonant. Below-base marks keep File3's path |
| baseline from font ascent inside flex/grid boxes | matraHL | the zero-size strut is its own flex item there (equation chip was 38 px off) |
| overlay anchored on the text's own box | matraHL | centred chips start away from (0,0) |
| `data.hint3_hand:false` takes the slide's phase out of HAND_PHASES for the rung-3 call | withHand3 | "Pending confirmation, use glow and lock without a hand" (pages 12–16) |
| `scaffold_rules.silent_from_attempt` (3) | all test modules | only the win after Hint 3 is silent |
| `data.shuffle:false` keeps the authored order | tap, sort, word build, sentence | "Keep the options in this order" |
| `h2_keep_marks` | TRAIN_TAP | "Retain the matra highlights in all three words" |
| `h2_read_bins:false` | TRAIN_SORT word | "Read only the wrongly dropped word" |
| `h2_mark_only` | TRAIN_SORT matra | enlarge + strokes lit, never name the mark; cards carry no clip |
| `audio.hint1_tail` | TRAIN_SORT picture | «फिर से सुनिए।» + name + «चित्र को…» |
| `h2_keep_word` | TRAIN_SORT picture | the word stays under the picture until placed |
| Hint-3 card glow + other cards wait (`tr-glow`, `tr-wait`) | TRAIN_SORT, WORD_BUILD | "Temporarily disable other unfinished cards" |
| `h2_akshar`: distractor misses counted per blank, H2 reads only the dropped अक्षर, H3 reveals that blank's अक्षर | WORD_BUILD | page 12 notes |
| `audio.sent_pre` / `sent_post`: sentence read with a pause at the blinking blank; blank glows at H3 | SENTENCE_COMPLETE | "pause at the blank … Do not say the missing word" |
| `base_img_from` bud → flower; `cap_result` caption; base word split by अक्षर; `travel:"up"` | MATRA_BUILD | page 5 animation; «खि + लौ + ना = खिलौना»; keep ड़ा whole |
| stroke-only chip (`mp-strokes`, `mb-strokes`) | MATRA_PAIRS, MATRA_BUILD | "Keep the dotted circle neutral" |
| runner files warmed only when a MINI_GAME slide exists | warmRunner | no runner in this lesson (14 × 404 otherwise) |

After any edit: `PYTHONUTF8=1 python 4_ENGINE/inject_train.py`, then the builder.
