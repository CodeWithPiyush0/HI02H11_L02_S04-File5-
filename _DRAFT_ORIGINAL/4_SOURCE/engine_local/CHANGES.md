# engine_local — HI02H11_L02_S04 (भाग 3 — ओ / औ) · «मात्राओं की रेल»

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

## Third highlight mode: above-base marks (े, ै) — added for HI02H11_L02_S03

`matraHL()` now covers all three geometries, and it **measures** rather than consulting a list, so
a new matra needs no new branch:

| mode | matras | test | clip band |
|---|---|---|---|
| right-spacing | ा ी | advance grows | x beyond the base's width, full height |
| **above-base** | **े ै** | **ink rises above the base** | **y above the base's ink top** |
| below-base | ु ू | neither | y below the baseline |

Measured on this font at 100px: `े` rises **27px** and `ै` rises **31px** above their consonant,
while advance growth is **0** for both. Zero advance is why the engine's own column-clip cannot
touch them — the same reason it fails on ु/ू — but the band is on the **opposite side**, which is
why one flag could never have covered both.

`_inkAscent()` does the measuring with canvas `actualBoundingBoxAscent`, in the element's own
computed font, so the value is directly comparable to the strut-measured baseline.

Verified: बेल / बैल / केला / पैसा at 150px — one red stroke for `े`, two for `ै`, consonant and
shirorekha untouched. Then through the real module: `सेब` clipped `0 → 26.8` (baseline 68) while
`पुल` still clipped `76.8 → 111.4`. **उ/ऊ is unchanged** — that regression check is the point of
recording the numbers.

> **ओ / औ (ो, ौ) will need a FOURTH case, not this one.** They are right-spacing *and* above-base
> at once, so the advance test fires first and the above-headline hook would be missed. Do not
> assume S03's ओ/औ is covered by this work.

## A hidden tab reported zero rects

Chromium returns width 0 from `getBoundingClientRect` — and from `Range` rects — while
`document.hidden` is true; `offsetWidth` still reports the real box. So a lesson mounted in a
backgrounded tab came back with the matra **uncoloured and no error**, and the retry loop burned
its ten attempts against zeros. Measured on the bench: `docHidden true, offsetWidth 80, rect
width 0`.

`matraHLSoon()` now registers a one-shot `visibilitychange` listener when the page is hidden and
re-applies once the tab is actually looked at.


---

## Change 11 — ONE hint ladder, and the idle hint that was missing

The SME's 3-attempt ladder was **hand-copied into six modules** and had drifted in five of them.
None of the drift was visible in a screenshot, a click-through, or the asset verifier.

| what had drifted | where | what the child / the data saw |
|---|---|---|
| `hint_shown` never emitted | TRAIN_SORT, MATRA_FILL, WORD_BUILD, SENTENCE_COMPLETE, POEM_SEARCH | the signal is in `signals_expected`; the dashboard reported **zero hints on 8 of the 11 test screens** while the child was in fact being helped |
| `state.scaffoldLevel` never raised | the same five | scaffold telemetry stuck at 0 |
| `setSwMood("tryagain")` missing | MATRA_FILL | hint audio played, Swiftee kept a neutral face |
| escalation counted **per card** | the three multi-item screens | a child who missed card A once and card B once heard hint1 twice and **never reached hint2** — never earning the help [28f] says two failures have paid for |

All six now call `makeHints()`. `guard_hints` in the builder fails the build if a module plays
`hint1` on its own again, which is exactly how this drifted the first time.

POEM_SEARCH keeps its SME-GHOST behaviour unchanged — the ghost's thinking face and its float to
a correct word are passed in as the `shake` and `nudge` hooks rather than re-implemented.

### Escalation is now per SCREEN

`level = max(this card's misses, 2 once the screen has seen 2)`. The second miss anywhere
escalates. Verified on G4 by dropping two different cards wrongly: the old code gave hint1 twice,
the new one gives hint1 then hint2 + the hand.

### The idle hint — and the first version of it, which was wrong

`scaffold_rules.nudge_timeout_ms` (guided 6000 / practice 8000) is declared by this card and read
by **nothing** in this lesson. It is the engine's **hand** timer, and [28i] makes the engine refuse
it outside tutorial, so those two numbers have never done anything.

The first cut of `makeHints` "fixed" that by driving an idle VO off it. That was wrong twice over:

1. The engine **already** replays the prompt after 7s of silence, exactly once per slide, on every
   test phase ([27b]/[27d]/[27f]). Measured in-browser: `idle_vo_replay` at 7.2s.
2. Firing at 6s meant ours landed **first and then the engine's on top of it** — two voices.

What ships instead is one event that sits **behind** the engine's and says something new:

```
7.2s   idle_vo_replay   (engine)  — the prompt again
16.6s  idle_cue step 1  (ours)    — hint1, + a pulse on the whole tray
       ... nothing more, ever
```

Gated on the engine's reminder being spent (`_idleVoFired`, read defensively — an unknown reads as
"spent", so the failure mode is silence, not two voices), on a further `idle_hint_ms` of quiet, and
on a document-level pointer clock so a child mid-drag is never interrupted. One document listener
for the whole lesson, not one per slide — the pile-up trap the engine's own watcher calls out.

**It never points at the answer.** Un-earned help is a timer, not two failed attempts, and [28i]
bans the un-earned hand outside tutorial for that reason. The pulse is on the tray: "your turn",
not "this one".

### Verified by driving it, not by reading it

| | guided (G1 / G4) | practice (P3) |
|---|---|---|
| miss 1 | hint1, **hand false** | hint1, **hand false** |
| miss 2 | hint2, `hint_shown` ×1, coach glow, **hand true** | hint2, `hint_shown` ×1, card glow, **hand false** ← [28f] |
| correct on the 3rd | **silent**, nav opens, `attempts: 3` | **silent**, blank fills, `attempts: 3` |
| word clip after a missed card | still plays (`vo_name_seb`) — teaching, not praise | — |

`hint_shown` is emitted **once** per slide, not once per miss, or the mastery signal counts
keystrokes instead of children. Timer leak checked: a cue armed on G1 and left produces nothing
after the slide changes. All 17 slides mount with zero JS errors.

### Not fixed here

The engine's `<head>` preloads `pic_kaam.png` and `pic_naak.png` from the old demo card — two
404s at `fetchpriority="high"` on **every game** on this engine line. Pre-existing and fleet-wide,
so it is raised separately rather than widened into this change.

---

## Change 12 — the highlight stops being a rectangle

`matraHL` clipped ONE rectangle around the mark's ink. That works while a matra lives in a single
band, which every lesson so far has. **ो and ौ do not**: they are a hook ABOVE the consonant *and*
a bar to its RIGHT, and any rectangle containing both parts also contains the consonant sitting
between them. Measured in-browser at 100px on this font, before changing anything:

| cluster | % of the consonant the box clip would redden |
|---|---|
| से (े) | 0.0 |
| पै (ै) | 0.0 |
| पु (ु) | 1.1 |
| का (ा) | 0.3 |
| **मो (ो)** | **37.1** |
| **मौ (ौ)** | **41.5** |
| डो | 26.5 |
| कौ | 22.7 |

There is no fourth band to add — a fourth branch would fix ो and break on whatever comes next.
**The rectangle itself was the bug.** `_markMask()` now renders the cluster and its base, diffs
the alpha, dilates by one pixel so antialiasing is not shaved, and hands the result to the overlay
as a CSS `mask-image`. The clip is the mark's own pixels, so it is exact and matra-agnostic — one
overlay per word even when the word carries the matra twice.

`_markBox()` is kept as the fallback for a tainted canvas. On ो it is still wrong; it is better
than nothing and it is the only path left where the old band heuristics run.

**`.mh-ov` needed `height:100%`.** The mask is sized to the ELEMENT box and applied with
`mask-size:100% 100%`, so an auto-height overlay scales the mask vertically and slides the red off
the stroke.

**A QA seam.** `SwiftPAL.matraHL` is exported. This function's every bug — the reddened
shirorekha, the 37%-reddened consonant — was found by rendering a word and counting pixels, never
by reading the code. The seam makes that possible against a shipped build. Read-only.

## Change 13 — three rungs, per screen

The SME's page-by-page review of S03 replaced the two-rung ladder:

| rung | on the 1st/2nd/3rd wrong |
|---|---|
| **Hint 1** | shake and return. **Nothing else** — no highlight, no glow, no hand. VO re-asks. |
| **Hint 2** | **compare.** What is compared differs per screen, so it is a hook. |
| **Hint 3** | **reveal**: glow the answer, lock the distractors, say it — then **wait**. |

Hint 2 per screen, because the notes deliberately differ:

- `TRAIN_TAP` — reads **all** options L→R, marks every matra, and **leaves the marks up**.
- `TRAIN_SORT` / `WORD_BUILD` — reads **only the wrongly dropped item**.
- `SENTENCE_COMPLETE` — reads the **whole sentence with each option previewed in the blank** and
  lights the scene. The notes call this out as the exception, "because the task tests sentence
  meaning". The blank is restored empty afterwards.

After a Hint-3 completion the item celebrates **in silence** — Hint 3 already said it. That is a
different rule from the old `silent_on_late_correct`, which keyed on the attempt count; this keys
on whether the reveal was given, which is what the SME actually described.

**Counter scope is per screen and it is not uniform** — the notes say so explicitly:
`TRAIN_TAP` and `SENTENCE_COMPLETE` count once for the screen ("switching from पैर to बैल must not
reset the counter"); `TRAIN_SORT` counts per card; `WORD_BUILD` counts per correct अक्षर *plus* a
separate counter per blank for distractor drops. Modules pass `scope(key)`.

**Input lock.** "Disable all answer taps and drags while any VO is playing" appears in every
screen's Developer Notes. Taps already checked `isPlaying`; drags did not, and `makeDraggable` is
shared engine code. The lock rides on `state.revealing`, which `makeDraggable` already refuses a
grab on, plus `pointer-events`. It is released in the rung's own callback with a 20s backstop — a
lock left on is a dead screen, which is worse than the double-tap it prevents.

### Two bugs this found, both invisible to every other check

Both were per-item clips declared correctly in the card and never bound to the element, so the
card validated, the files existed, and the rung still played *something*:

- `TRAIN_SORT` Hint 3 played the **screen-wide** clip, naming a word the child was not holding.
  The SME writes "Play Only the Matching Line" on every multi-item screen.
- `SENTENCE_COMPLETE` Hint 2 played **three nulls** — silence exactly where the comparison should
  have been, which is the whole reason that screen has an exception.

`guard_hints` now fails the build if `dataset.reveal` or `dataset.sent` is not bound.

### And one that only real audio would have shown

The "speaking now" lift was cleared by a fixed 900ms timer. Clips are 2s+, so with real audio the
lift would go dark mid-sentence while the voice was still reading that option. `sequence()` now
clears it when the **next** item starts.

---

## Change 14 — the marker ring, for a lesson whose mark is a dot

अं's anusvara is **17×16px of ink at a 100px font**. ो, by comparison, is 105px tall. The engine
renders a sort-card label (`.tr-cardlbl`) at **21px** and a sentence option (`.sc-optlbl`) at
**24px**, so a correctly highlighted anusvara is a red speck **three to four pixels across**.

The highlight was right and the child could not see it — and on this skill, seeing the mark IS the
skill. Measured before deciding, at a 100px font:

| mark | ink box | at a 21px label |
|---|---|---|
| ो | 54×105 | 11×22 |
| ा | 31×73 | 7×15 |
| ै | 46×37 | 10×8 |
| **ः** | 27×57 | 6×12 |
| **ं** | **17×16** | **3.5×3.4** |

`matraHL` now draws a thin ring around the mark when `scaffold_rules.mark_ring` is set.

**THE RING IS DRAWN FOR EVERY MARK IN THE LESSON, NEVER ONLY THE SMALL ONES.** Ringing the
anusvara but not the visarga would hand the child the answer on every screen that asks अं or अः —
they would learn to read the ring instead of the mark, and pass the lesson without learning it.
That is why the switch is per card and not a size threshold inside the function.

It is an **ellipse around the mark's own box**, not a circle around its longest side: the visarga
is two stacked dots, and a circle big enough to clear them is wider than the letter they belong
to. Padding is equal on both axes, so a round mark still gets a round ring.

The ring sits UNDER the red overlay, has no fill, and is `aria-hidden`.

This is an **addition** to the SME's "highlight only the matra strokes in red", which they wrote
for marks you can see unaided. Flagged to them rather than assumed.

### Also verified here

ं and ः both clip cleanly through the existing pixel mask — 0% and 1.4% of the base inside the
mark's box, against 37-42% for ो with the old rectangle. No new geometry was needed; the mask
introduced for ओ/औ already covers a dot and a pair of dots. Checked on the two hard words:
**गोंद** (ो and ं in one cluster — only the dot reddens, the ो stays navy) and **प्रातः**
(a conjunct प्र plus ा — only the two dots redden).

---

## Change 15 — the SME's 2026-09-30 review of S03, fed into the engine

The SME reviewed S03 again and said the result is the spec for every following lesson: "इसी फ्लो
और इसी हिंट लॉजिक के हिसाब से हम आगे की फाइल्स बनाएंगे". Everything below is in the shared
`train_modules.js`, identical in S03, S04 and S05 (md5-checked after every sync).

| what | why (the SME's words, or what their deck showed) |
|---|---|
| **`revealHand(el, slide)`** — the Hint-3 hand is decided per SLIDE (`data.hint3_hand`), not per phase | the «अब आपकी बारी!» gate moved to after the last sentence, making word-build, the picture sort and the sentences GUIDED — where [28f] allows the hand — but their notes still say "Pending confirmation, use glow and lock without a hand" |
| **per-item praise**, `sayLocked()` | "Correct Response VO — Play Only the Matching Line" on every sort and on word-build: «शाबाश! शेर शब्द में ए की मात्रा है।», «शाबाश! मेज़ बन गई।» |
| **no completion VO** on multi-item screens | "Completion: No extra completion VO is required." |
| **nothing after a reveal** | "No additional VO is needed because Hint 3 has already explained the answer." |
| **the mark round's Hint 2 does not name the mark** | "Do not announce the matra's name" — naming it IS the answer there |
| **the picture round's Hint 2 shows the name**, removed on placement | "temporarily show the wrongly dropped picture's name … Remove temporary word support when its picture is correctly placed" |
| **`shuffle:false`** keeps the authored order | "Use these four picture options in this order: शेर, पेड़, गैस, पैर" |
| **input locked during praise** as well as during hints | "Disable all answer taps and drags while ANY VO is playing" |
| **the train landing** (`landing_hero.kind: "train"`) | "Show only two matra boxes … inside two train bogies … bring the train from right to left … appear one by one with a soft pop" — open since round 3 |
| **the build screen's base picture glows during its line** | p.3 "Highlight the whole group when the VO says «ये सब बच्चे हैं»"; p.5 the book "मेज़ पर किताब रखी है" |

### What the engine does NOT do, on purpose

* **The «अब आपकी बारी!» gate does not appear in the HTML.** The engine never gates into a
  CELEBRATION (`next.type !== "CELEBRATION"`), and after the SME's move round 3 holds nothing else.
  Walked end to end through `completeSlide()`: one gate (guided) between T5 and G1, none before
  the celebration. The SME's deck shows the gate followed by an independent-round runner — a
  screen that is not in this kit. See `_ref/README.md`.
* **The gate headlines are the engine's**, hard-coded in `PHASE_GATE_TITLE`. The card's
  `phase_transition_title` is ignored; the builder now writes the engine's text into it so the
  card stops claiming «चलिए, रेल चलाएँ!», which no child ever saw.

---

## Change 16 — the SME's 2026-10-05 review of S04

Shared `train_modules.js` / `train_styles.css`, identical in **S04 and S05** (md5
`2461eec6…`). **S03 is NOT updated** — it was packaged dev-ready on 2026-09-30 and is frozen;
see "S03" below.

| what | why |
|---|---|
| **the picture round's Hint 1 names the picture** — `makeHints` plays `hint1`, then `hooks.hint1Name(key)`, then `hint1_tail` | S04 p.13 (and S03 p.13, word for word): «फिर से सुनिए।» — "Play the current picture's name, then:" — «चित्र को सही मात्रा वाले डिब्बे में डालिए।». The build played the two lines as ONE clip with no name between them. Still played inside `makeHints`, so the ladder is not forked |
| **`base_img_from`** on MATRA_BUILD — the base picture as an action: the bud dissolves into the open flower while the base line plays | S04 p.5 «खिलना»: "Show the opening action clearly through a short animation, rather than only a fully open flower." A frozen capture shows the bud; in play it opens |

Guarded: `matra_train_lib.guard_engine` refuses to build without `hooks.hint1Name` and
`d.base_img_from`, so a bundle on the old modules fails loudly instead of playing a Hint 1 with
no name in it.

### S03

S03's picture round (p.13) has the same Hint-1 gap: «फिर से सुनिए। चित्र को सही मात्रा वाले
डिब्बे में डालिए।» as one clip, no picture name between. Its handoff (2026-09-30) is unchanged.
Fixing it means: copy these two files into S03's engine_local, `inject_train.py`, rebuild,
record `vo_g7_hint1` + `vo_g7_hint1_tail`, re-issue the handoff.
