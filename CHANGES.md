# CHANGES — HI02H11_L02_S04 «मात्राओं की रेल» (ओ / औ) · rebuilt on File3's engine

**Source of truth:** `1_SPEC/HI02H11_L02_S04_SME_Review.pptx` (SME review, 2026-10-05; notes verbatim
in `1_SPEC/_SME_RECOMMENDATIONS.md`) for content and hint behaviour; **File3**
(`HI02H11_L02_S02_DEV_HANDOFF`, the उ/ऊ lesson) for layout, buttons, animation, colours,
typography and flow.

**What happened:** the SME's draft (now in `_DRAFT_ORIGINAL/`) already carried the deck's words, but
on the older plain engine. This round puts the lesson on File3's engine (painted train, cloud title,
Swifty gate and talking heads, lip-synced celebration, background music, button sounds, matra
highlight, screen flow) with the ओ/औ content, pictures and voice-over.

**Decisions taken with the developer (2026-10-06):**
1. The independent round (SME's word-catch game, deck position 21) is **not built yet**.
2. File3's watch-only drag demo screen **is kept** (with घोड़ा / खिलौना).
3. The Hint-3 hand follows the deck: **hand on pages 7–11, glow + lock only on 12–16**
   (`HINT3_HAND` in the builder flips it).

Status: ✅ DONE · ⚑ FLAGGED · ⏳ PENDING · N/C no change asked.

## Checklist and scorecard

| # | Deck page | Ask (short) | Status | Proof |
|---|---|---|---|---|
| 1 | p1 cover | Two bogies «ओ (◌ो)» «औ (◌ौ)», train right→left, bogies pop one by one, whistle + sparkle, greeting VO | ✅ | `5_SCREENSHOTS/01_landing.png`; File3 cover (cloud title, painted train) |
| 2 | p2 intro | Heading kept; ओ→◌ो then औ→◌ौ; strokes lit, dotted circle neutral; आगे locked until both spoken; VO verbatim | ✅ | `02_MATRA_PAIRS.png` |
| 3 | p2 intro | "dim the first pair" | ⚑ | Kept File3's behaviour (Yasir r97: both pairs stay lit). One-line change if the deck should win |
| 4 | p3 build | घड़ा+pot → घ lit → घ+◌ो=घो → ड़ा joins → घोड़ा+horse; «घ। घो। घोड़ा।»; SFX; VO verbatim | ✅ | `03_MATRA_BUILD.png`; cues measured from the clips |
| 5 | p3 build | "Keep ड़ा together", dotted circle only in the chip | ✅ | word split by अक्षर (grapheme), not by character |
| 6 | p4 pair | Heading «ओ की मात्रा वाले शब्द पढ़िए।»; मोर, कोयल one at a time; only ो lit | ✅ | `04_MEET_PAIR.png` |
| 7 | p5 build | खिलना: **bud opens into flower**; ल+◌ौ=लौ; «अब खि, लौ और ना को जोड़ने पर, खिलौना बनता है।»; «खि + लौ + ना = खिलौना»; toy duck | ✅ | `05_MATRA_BUILD.png` (shot shows the opened flower) |
| 8 | p6 pair | Heading «औ की मात्रा वाले शब्द पढ़िए।»; कौआ, पौधा; only ौ lit (आ, ा navy) | ✅ | `06_MEET_PAIR.png` |
| 9 | p7 tap | मोर · दौड़ · चौक in that order; H1/H2/H3 lines verbatim; H2 reads all three, **marks stay lit**; H3 glow + hand + lock; silent win after H3 | ✅ | driven: `hints/_ladder_run.json` G1, `hints/G1_h2.png`, `G1_h3.png` |
| 10 | p8 tap | ढोल · कौआ · गोल → कौआ | ✅ | driven G2 |
| 11 | p9 tap | नौका · तोता · कौआ → तोता | ✅ | driven G3 |
| 12 | p10 word sort | पौधा · ढोल · कौआ · तोता picture+word cards; names read before unlock; H2 reads only the dropped word (no label walk); H3 glow + hand + other cards wait; per-card praise; no completion VO | ✅ | driven G4, `hints/G4_h3.png` |
| 13 | p11 mark sort | ◌ौ, ◌ो; no name on entry/pick-up; H2 enlarge + strokes lit, no name; H3 per-mark line + hand | ✅ | driven G5, `hints/G5_h3.png` |
| 14 | p12 word build | मो नौ ढो पौ कौ; _र _ल _धा; distractor misses counted per blank; H2 reads only the dropped अक्षर, enlarges, lights its matra; H3 glow + lock, no hand | ✅ | driven G6, `hints/G6_h3.png` |
| 15 | p13 picture sort | दौड़ · तोता · घोड़ा · हथौड़ा; H1 «फिर से सुनिए।» + name + tail; H2 word shown under picture and **kept** until placed; H3 glow, others wait, no hand | ✅ | driven G7, `hints/G7_h2.png`, `G7_h3.png` |
| 16 | p14 sentence | «पेड़ पर एक ___ बैठा है।» कौआ · घोड़ा · मोर; prompt then sentence with a pause at the blank; H2 three sentences + crow glow; H3 glow option + blank, lock, no hand | ✅ | driven G8 |
| 17 | p15 sentence | «बच्चे के पास एक ___ है।» खिलौना · मोर · ढोल; toy-duck glow | ✅ | driven G9 |
| 18 | p16 sentence | «आदमी के हाथ में एक ___ है।» ढोल · हथौड़ा · तोता; hammer glow; H3 line with «हथौड़ा शब्द को» | ✅ | driven G10 |
| 19 | p21 independent round | Word-catch game, 12 ओ + 12 औ words | ⏳ | Deferred by the developer. Words in `1_SPEC/independent_round_words.txt` |
| 20 | p17 celebration | Recap VO | ✅ | File3's lip-synced Swifty, `18_CELEBRATION.png` |
| 21 | all | आगे disabled during VO / hints; no input while VO plays; no «छोटी/बड़ी» anywhere | ✅ | engine lock; `guard_register` in the builder |

## Receipts (verbatim)

- `1_SPEC/_verify_assets.py`: `0 FAIL   0 WARN` (119 clips, truncation check on all of them, 16 images)
- `1_SPEC/_verify_vo_overlap.py`: `TOTAL CLASHES: 0`
- `1_SPEC/_drive_ladder_s04.py`: all 10 test screens driven miss→miss→miss→right and right-first-time; 0 errors
- skill `verify_bundle.py`: `14 pass · 3 FAIL · 7 warn`. **The same 3 FAILs on File3 itself:** engine
  stamp `2026.08.04b` vs the factory's `2026.07.16i`, the `--bg` token, and 6 stock UI file names.
  All three come from File3's pinned engine, not from this port.

## Changed beyond the deck (and why)

- **Engine = File3's** (`4_ENGINE/`), with additions listed in `4_ENGINE/CHANGES.md` → "S04".
- **Highlight colour is orange** (File3's), not red as the deck writes.
- **Hint 3 / File3 rules kept:** the tap screens' last-tapped coach is not retired until Hint 3 (File3 F4).
- **Em-dash → comma** in VO text (TTS truncation fix used by both earlier builds); unspoken.
- **G4D demo screen** added (developer decision #2).
- **"ओ की मात्रा" clip** plays as the matra lands on pages 3 and 5 (File3's build flow).

## Voice-over and art

- 107 of 119 clips are the draft's own recordings, reused by matching text. 13 new (Gemini TTS,
  voice Leda): the demo screen's 4, «जो अक्षर चमक रहा है…», the two «घ। घो। घोड़ा।» / «ल। लौ। खिलौना।»
  sound clips, and the six sentence halves.
- **EAR-CHECK** before shipping: `vo_g9_sent_b` («है।», recovered through a style wrapper), the
  draft's own flagged clips (`vo_rev_wb_paudha`, `vo_name_nauka`, `vo_name_hathauda`, `vo_name_chauk`,
  `vo_rev_picture_daud`, `vo_g7_h1`, `vo_ak_nau`, `vo_ak_pau`, `vo_rev_mark_au`, `vo_meet_kaua`).
- Images: the draft's 16 (13 cut-outs, bud, 3 scenes). No new art was needed.

## Observations — noticed, NOT changed

- When a card is dropped on a locked coach after Hint 3, its name can be spoken (the tap
  handler fires on release). Same in File3.
- The word shown under a picture after Hint 2 (page 13) is small (File3's size).
- The bundle is not size-optimised yet (raw-WAV audio). Do the Opus re-encode on a copy before delivery.

## Round 2 (2026-10-06) — screens made identical to File3

The developer: "all the screens should be same as my previous file, just content changes". Compared
screen by screen against a live capture of File3 and changed, so the File3 look wins over the deck:

| | was (from the deck) | now (File3) |
|---|---|---|
| pages 2, 4, 6 | heading band shown | no heading |
| ◌ो / ◌ौ chips, pages 2, 3, 5 | dotted circle navy, strokes orange | whole chip orange |
| pages 3, 5 | caption «घो + ड़ा = घोड़ा» / «खि + लौ + ना = खिलौना» | no caption |
| word sort + demo coach labels | «ओ» / «औ» | «ओ (ो)» / «औ (ौ)» |
| mark sort, placed card | strokes lit on placement | plain, as File3 |

The stroke-only look is one card switch (`chip_strokes: true`) if the SME asks for it back.
Content, VO and the deck's hint ladder are unchanged. Re-driven: 10/10 screens, right-first-time on
all 11 test screens, 0 console errors.

## Round 3 (2026-10-07) — File3's r103–r108 brought over

The developer: "apply the same changes we did in File3's last two pushes (5685f05, f97402a)" — with
three rulings: **follow this lesson's deck** where File3's change differs, **use the standard
celebration line**, and **skip the runner game** (not in this lesson). File3's engine changes were
merged into `4_ENGINE/` with a 3-way merge (base = File3 at b1a0883, so File3's runner-game fixes
r101/r102 stay out), then `inject_train.py` and the builder were re-run.

| File3 | change | here |
|---|---|---|
| r103 | cover: no disabled play button - it appears (pops in, then pulses) only once the greeting has finished | ✅ engine |
| r103 | pages 3, 5: picture 220 → 270 px | ✅ measured 270 × 270 |
| r103 | pages 9 → 10 are one train: no departure after the demo, no arrival on page 10 | ✅ `keep_train_next` on G4D; page 10 mounts parked, not entering |
| r103 | bigger drop area: a coach catches a drop anywhere on the whole coach (+26 px) | ✅ pages 10, 11, 13 (card on the roof label: placed) and page 12 (letter on the roof label and low by the wheels: placed) |
| r103 | Hint 2 on pages 10 / 13 reads every remaining option | ⛔ **not taken** - this lesson's deck wins: page 10 reads only the wrongly dropped word, page 13 keeps that picture's word until it is placed (`h2_read_bins:false`, `h2_keep_word`) - unchanged |
| r103 | page 15 «मैंने» removed | — not in this lesson |
| r103/r104/r105/r108 | transition text appears with the voice, centred, typed one akshara at a time **only while its words are spoken** (`title_voice_ms`, measured from the clip by the builder), always complete by the end of the line | ✅ the same kit clips as File3 (byte-identical), so File3's cue/duration values |
| r105 | celebration line «बहुत बढ़िया, दोस्त! तुमने कमाल कर दिया!» | ✅ was the deck's recap «शाबाश! आज हमने सीखा…»; `vo_cel_prompt` = File3's recording of the same line (Leda, −16 LUFS, 2.94 s); lip-sync track re-measured |
| r106 | Swifty rises first, then speaks (`talk_at_ms` 1960) | ✅ already so |
| r106 | celebration: she jumps and celebrates first (silent), then speaks, lip-synced | ✅ `1_SPEC/_cel_wrap.js` = File3's current wrapper |
| r107 | transition Swifty's beak moves with the line (sheet `assets/UI/swifty_gate_talk.webp`, 836 KB, built from the gate art) | ✅ builder `gate_talk()` |
| r107 | the play button sounds on the press, not on release | ✅ engine |
| r101/r102 | runner-game fixes | — no runner game in this lesson |

**Measured** (served unless noted):
- **Ladder regression:** `_drive_ladder_s04.py` on this build and on the previous one: every ladder
  record identical (10 test screens, miss → miss → miss → right and right-first-time). The only
  difference: after the page 9 demo, page 10 now starts at once (same train), so its intro follows
  the demo in the log.
- **Assets:** `_verify_assets.py`: 0 FAIL, 0 WARN.
- **Transitions:**
  - beak = track 97.8–99.4 % (frame-accurate), one opening per syllable (15 / 19 / 5), 0 open-beak
    frames before or after the line, the bird's box identical before and after the switch;
  - «चलिए,» types 4.04–4.36 s and «शुरू करें!» 4.75–5.21 s into the clip, the full line 0.46–0.60 s
    before the clip ends - from the cover's play button, served and opened as a file; guided and
    practice likewise inside their voiced stretches.
- **Celebration:** the jump plays 0.5–1.5 s with no voice, the line starts as she lands; mouth = track
  100 % on the kit's clock; sheets शाबाश → talk → idle; 0 open-mouth frames after the line.
- **Play button:** the sound starts 1 ms after the press (was ~140 ms, on release), once.
- **Console:** no errors (only the server's missing favicon).

## Round 3 (2026-10-07) — the developer's new pictures

Six files supplied in `3_BUILD/assets/Images/` (originals kept in `1_SPEC/art_src/2026-10-07_supplied/`):
three object strips were cut into single transparent pictures, and three scenes were resized to
1024 px wide.

| new picture | replaces |
|---|---|
| crow · potted plant · drum | `obj_kaua` · `obj_paudha` · `obj_dhol` |
| parrot · hammer · running boy | `obj_tota` · `obj_hathauda` · `obj_daud` |
| koel on a branch · pink flower · toy car | `obj_koyal` · `obj_khilna` · `obj_khilona` |
| crow in a tree · boy with pull-along duck · carpenter | `scn_ped_kaua` · `scn_khel` · `scn_hathauda` |

| horse · clay pot · peacock (`Cheerful Horse, Clay Pot, and Peacock Trio.png`, found in Downloads) | `obj_ghoda` · `obj_ghada` · `obj_mor` |

Hint 2's scene glow re-measured on the three new scenes (`SCENE_GLOW`). Only `obj_khilna_bud` (the
bud on page 5) is still the old art — no new bud was supplied.

**Pictures are now cache-busted** (`?v=<hash of assets/Images>`), like the audio already was: before
this, a browser (or Vercel's 1-day cache) that had seen the old pictures kept showing them after the
files were replaced.

⚑ **The खिलौना picture is now a toy car, but page 15's scene shows a toy duck** — the deck asks for
the option to match the scene. ⚑ **The bud on page 5 is the old flat red one**, so it opens into a
glossy pink flower of a different style.

## Round 4 (2026-10-07) — hint logic made identical to File3

The developer: "its hint logic will also be exact same" as File3. The deck's own ladder (rounds 1–3)
is replaced by File3's, line for line, with ओ / औ in place of उ / ऊ. Only the words differ.

| screen | Hint 1 | Hint 2 | Hint 3 |
|---|---|---|---|
| taps (7–9) | «फिर से पढ़िए। जिस शब्द में ओ की मात्रा आ रही है, उस पर टैप कीजिए।» | the three words read with their matras lit, then «जिस शब्द में ओ की मात्रा है…» | «देखिए, मोर में ओ की मात्रा है। मोर पर टैप कीजिए।» + hand + others locked |
| word sort (10) | «फिर से पढ़िए। शब्द में कौन-सी मात्रा है…» | the word + its matra, then the coach labels «ओ», «औ», then «पौधा में औ की मात्रा है। अब यही मात्रा ऊपर डिब्बों पर खोजिए…» | «पौधा को औ की मात्रा वाले डिब्बे में डालिए।» + hand |
| mark sort (11) | «फिर से देखिए। मात्रा को ध्यान से देखिए…» | each letter read with its matra shown beside it, «ओ की मात्रा ो है और औ की मात्रा ौ है…» | «ओ की मात्रा को ओ वाले डिब्बे में डालिए।» + hand |
| word build (12) | «फिर से देखिए। चित्र का नाम सोचिए…» | the three picture names read, blanks blinking, «नाम ध्यान से सुनिए…» | «मो को मोर वाले डिब्बे में डालिए। मो, र… मोर।» + hand |
| picture sort (13) | «फिर से सुनिए। चित्र का नाम ध्यान से सुनिए…» | the word shown under the picture for that beat, «दौड़ में औ की मात्रा है। अब इसे सही मात्रा वाली बोगी में डालिए।» | «दौड़ को औ की मात्रा वाली बोगी में डालिए।» + hand |
| sentences (14–16) | «फिर से पढ़िए। चित्र देखिए, पेड़ पर कौन बैठा है? …» | all three sentences + scene glow, «जो वाक्य सही लग रहा है, वही शब्द चुनिए।» | «पेड़ पर एक कौआ बैठा है। कौआ चुनिए।» + hand + others locked |

Also File3's: the hand at Hint 3 on **every** test screen (replaces the 2026-10-06 "no hand on 12–16"),
a correct answer after two misses is silent, options shuffle on every visit, misses count per
card on word-build, and the sentence screens play only the instruction on entry (no paused
reading). The mark-sort cards say «ओ की मात्रा» / «औ की मात्रा» as they appear, as in File3.

VO: 55 hint clips — 11 recovered from earlier recordings by matching text, 44 new (Gemini, Leda).
`_verify_assets.py`: `0 FAIL   0 WARN` (it caught one truncated take, `vo_g4_h3_dhol`, replaced).
Driven: all 10 test screens miss→miss→miss→right and right-first-time; 0 errors.

**EAR-CHECK** — Leda refused these lines twice, so they are on another voice (File3 had 8 such):
`vo_letter_o`, `vo_letter_au`, `vo_g5_h3_o`, `vo_g7_h2_daud`, `vo_g7_h2_tota`, `vo_g7_h2_ghoda` (Aoede),
`vo_g7_h2_hathauda`, `vo_g7_h3_ghoda` (Kore), `vo_g7_h3_hathauda`, `vo_g4_h3_dhol` (Kore).

## Round 5 (2026-10-08) — rebased on File3's CURRENT engine

File3 had moved on after round 4 (its commits of 2026-10-06/07, r101–r109). Its hint changes
(r103: page 10's Hint 2 reads every word still in the tray; page 13's Hint 2 shows every remaining
picture's word; bigger drop areas on every coach; the demo hands its train to the sort page) were
missing here. `4_ENGINE/train_modules.js`, `train_styles.css` and `lesson_template.html` are now
File3's current files plus ONLY this lesson's additions: the ो/ौ stroke highlight, the अक्षर-safe
word split (घड़ा), the bud → flower, ो/ौ arriving from above, the runner warm-up guard and the
picture version stamp. Builder: `keep_train_next` on the demo, File3's recorded transition lines
(`vo_pt_*`) and their r109 timings.

Proof — both lessons driven by the same script, miss → miss → miss → right on every test screen,
each clip reduced to its role (prompt / hint1 / hint2 / hint3 / name / letter / try / correct) and
each step's hand, glow, lock and आगे state compared: **10 of 10 screens identical** (3 tap, word
sort, mark sort, word build, picture sort, 3 sentences). 0 errors.

## Round 6 (2026-10-08) — «मात्रा टोकरी», the independent round, after page 16

The developer: "extract the tokri matra game from [File2] and implement the exact same game after
page 16 — just the words according to this file (ओ, औ), rest exactly the same".

Source: `github.com/khugshalharshvardhan/HI02H11_L02_S01_DEV_HANDOFF-file2-` at `e737324` (cloned
fresh — the local FIle2 copy is behind GitHub and has uncommitted edits, so it was not touched).

- **Engine** (`4_ENGINE/tokri_module.js`, `tokri_styles.css`, injected by `inject_train.py`): File2's
  `MATRA_TOKRI` module and the five FLN-kit pieces it uses (nudge, correct-select, wrong-select,
  object-outline, confetti), verbatim. Changed only: the rounds come from the card; right/wrong
  play this lesson's own feedback sounds (`sfx_fb_*` — File2's code asks for "the lesson's OWN
  feedback bed"); `_mtAudioSrc` / `_mtSfx` stand in for two File2 engine helpers this engine lacks;
  File2's one global CSS rule (`#confetti`) is limited to the game page. `mountSlide` got File2's
  one-line `__slideCleanup` call so the game stops when its screen is left.
- **Assets:** File2's `mt_*` art and `sfx_mt_burst` / `sfx_chime`.
- **Content:** two rounds (File2 has three, one per matra it teaches):
  - ओ — मोर, ढोल, गोल, कोयल, तोता · distractors कौआ, पौधा, दौड़, चौक, मौसम, चौकी
  - औ — कौआ, पौधा, दौड़, चौक, मौसम · distractors मोर, ढोल, गोल, कोयल, तोता, टोपी
  (from the SME's 12 + 12; a build guard fails if a word sits in the wrong list)
- **VO:** File2's wording in this lesson's आप register — «टोकरी को उँगली से इधर-उधर ले जाइए।»,
  «ओ की मात्रा वाले शब्दों को टोकरी में डालिए।», «बहुत बढ़िया! अब औ की मात्रा वाले शब्दों को टोकरी में
  डालिए।», «शाबाश! आपने सभी मात्राओं के सही शब्दों को टोकरी में रख लिया है।». 8 word clips reused,
  7 new (Leda). EAR-CHECK: `vo_mt_w_koyal` (wrapper), `vo_mt_w_mausam` (danda).
- **Flow:** page 16 → «अब आपकी बारी!» → the game → celebration (the deck's order).

Verified by playing it (`1_SPEC/_drive_tokri.py`, real clip lengths): gate shown, tutorial hand on the
basket, a wrong word ringed red and tossed out, 5 ओ words → Swifty's cheer → 5 औ words → win →
celebration; 0 errors. The same script on File2's own build gives the same clip sequence (including
the intro being heard three times at the start — File2's own behaviour). `_verify_assets.py`:
`0 FAIL   0 WARN`. Screens: `5_SCREENSHOTS/tokri/`.

## Round 7 (2026-10-16) — synced with File3's latest commits (c6c5d98 … 992e684, its r111–r138)

The developer: "make all the changes that are pushed in this repo … page placement, logic, layout of
pages, sfx etc". Source: `github.com/CodeWithPiyush0/HI02H11_L02_S02_DEV_HANDOFF` at `992e684`.

**Engine** — `4_ENGINE/train_modules.js`, `train_styles.css`, `lesson_template.html`, `inject_train.py`
are File3's `992e684` files plus ONLY this lesson's additions, re-applied: the ो/ौ stroke highlight
(`_markMaskK`), the अक्षर-safe split (घड़ा), bud → flower (`base_img_from`), the picture version stamp,
the «मात्रा टोकरी» injection + its `__slideCleanup` hook, MTG2A04's confetti, and the runner warm-up
guard (no runner here). Everything else File3 changed comes with it: the cover's title pop + bell, the
loading screen that waits for the cover's own files, sound effects played from memory, «only the next
button pulses» (r138), a success sound with every correct drop (r138), spare tray cards fading away,
phones turned to landscape and the transition fitted to them (r117).

**Pages, as File3 now has them**
- **Cover** — says «नमस्ते दोस्त! मैं हूँ स्विफ्टी। आज हम ओ और औ की मात्रा वाले शब्द पढ़ेंगे।»; page 1 has no
  opening line any more (r134). Coach labels «ओ → ◌ो» / «औ → ◌ौ».
- **Page 1** — letter, arrow and matra each arrive on their own words of «यह है ओ। इसकी मात्रा देखिए।» (r121).
  This line pauses in different places from File3's, so the cues are placed inside the clip's own
  phrases (`_word_ms` in the builder).
- **Pages 2 / 4** — no equation panel (r121): «घड़ा» + picture on the left, the arrow, then the right-hand
  word is built with the voice — घ, the ो flies in and makes घो, ड़ा joins, then the horse (r131); «घ। घो।
  घोड़ा।» lights the right-hand word (r133/r134). Adapted for ओ/औ: the flying mark is masked to the mark's
  own strokes and comes from above-right (File3's cut at the baseline only works for ु/ू, which hang
  below); खिलौना is built ल → लौ → खि joins on «खि» → ना joins on «ना» → the toy; the bud still opens.
- **Pages 3 / 5** — picture, the word centred under it, the yellow mic to its right (r134–r138); the line
  is now «मोर, इसमें म पर ओ की मात्रा लगी है। बोलकर देखिए।»; the mic appears when it ends, «listens» for 3 s
  on a tap, and after 7 s untapped plays File3's human «इस बटन पर टैप करिए।» (`vo_mic_nudge`, copied).
- **Order** (r127/r131/r134): G5 demo, G5, G1, G3, G2, G4, word build, picture sort, sentences, game.
- **G5 demo** replaces the word demo (r131): coaches ◌ो / ◌ौ, cards ओ / औ carried by the hand, «ओ की मात्रा
  इस डिब्बे पर है, इसलिए ओ इस डिब्बे में गया।», heading «देखिए, अक्षर को उसकी मात्रा वाले डिब्बे में कैसे डालते
  हैं।»; it hands its train to G5. (`vo_g4d_prompt/_ghoda/_khilona` removed.)
- **Word sort (G4)** — plates read «ओ» / «औ», no matra (r131); its Hint 2 stops after «… में ओ की मात्रा
  है।» (r134; two clips trimmed from their own Leda takes, two re-recorded).
- **Sentences** — a correct answer reads the whole sentence with it glowing (r121; here every praise line
  already contains the sentence, so it is read once); the last sentence screen has words only (r131 —
  File3 has four sentence screens and gives the last two text-only; this lesson has three, so the last).
- **Pictures** are WebP, converted by `1_SPEC/normalize_assets.py` (File3 r126, run by the build):
  16 card pictures, the loader and the rest pose; the cover's train pictures are preloaded first.
- **vercel.json** — File3's r126 caching: pages, card and pictures re-checked, versioned audio immutable.
- Not taken: everything in File3 about its runner game (r112–r120, r124–r125, r130) — this lesson's
  independent round is the «मात्रा टोकरी» (round 6), which was re-checked end to end on the new engine.

**VO** — new (Leda): `vo_landing`, `vo_meet_mor/koyal/kaua/paudha`, `vo_g5d_prompt/_o/_au`,
`vo_g4_h2_dhol/paudha`; trimmed: `vo_g4_h2_kaua/tota`; File3's recordings of identical lines copied
(`vo_cel_prompt`, `vo_g4_h1`, `vo_g4_prompt`, `vo_g4d_end`, `vo_g5_h1`, `vo_sc_h2`, `vo_sc_prompt`,
`vo_try_again`, `vo_mic_nudge`). Every new or cut clip checked by transcription.

**Proof** — both lessons driven by the same scripts: hint ladders on every test screen match File3's
step for step (the only differences are snapshot timing on the sentence screens, and the word build's
second distractor, which File3's content does not have — the engine code is identical); pages 1–5, the
G5 demo and the cover recorded with real audio side by side with File3; «मात्रा टोकरी» played to the
celebration; `_verify_assets.py` 0 FAIL 0 WARN; `_verify_vo_overlap.py` 0 clashes; no console errors.

## Round 8 (2026-10-16) — second pass against File3 (992e684)

The developer: "there are still few things that does not match with the repo, and few elements got
misalign". Both builds compared page by page: settled geometry of every element, the card's settings
slide by slide, hint ladders, post-drop states and 2x close-ups.

- **Phases / gate placement** — File3's word build, picture sort and sentence pages are PRACTICE pages
  (P1–P6); here they were still guided. They are practice now (so the practice nudge timing and the
  practice signal apply, as in File3), and the third gate «अब आपकी बारी!» is pinned before the game
  (`gate.at.round3 = MT1`, File3 pins it before its MG1), so from the word sort the lesson goes
  straight on to the word build, exactly like File3.
- **Card settings copied from File3** — `part_label` «भाग 1», `phase_transition_title`, and the
  `intro_letter_tap` signal.
- **Old S04 styles removed** — a block left from rounds 2–4 (hint-card growth, glows, chip colours,
  `.tr-matra` navy) still overrode File3's styles, e.g. the colour of the letter/matra cards on the G5
  demo and G5. Only the bud → flower and the ो/ौ highlight rules remain.
- **ो / ौ highlight edge** — a hairline of navy showed round the orange mark (the overlay and the word
  anti-alias along the same edge). A thin stroke in the highlight colour, kept inside the mark's mask,
  makes it as clean as File3's ु / ू.

Checked after: the card matches File3 field for field except the game slot (tokri) and the content;
hint ladders unchanged; the tokri game still plays through the gate to the celebration;
`_verify_assets.py` 0 FAIL 0 WARN.

## Round 9 (2026-10-16) — page 1's matra box, pages 3 / 5 picture–word spacing

1. **Page 1** — the developer: "the matra is getting out of the box". The card's -.13em lift was File3's
   measurement for «◌ु», whose ink hangs low; «◌ो» / «◌ौ» rise high, so the hook stuck out of the top.
   The matra's ink is now measured and centred in its card: 26-28 px clear above and below
   (File3's ◌ु / ◌ू: 26-29 px).
2. **Pages 3 / 5** — "the word and image in few scenes overlapping". Measured on both builds: the
   picture box (220 px) and the word's headline sit at exactly the same place, 20-22 px apart in File3;
   ो / ौ rise ~27 px above the headline, so कौआ / पौधा cut 4-7 px into the picture. The word row now
   moves down by what the word rises above a bare consonant (the picture does not move): 22 px from the
   picture to the top of every word, as File3. Sizes unchanged (picture 220 px, word 96 px).

## Round 10 (2026-10-21) — the SME's recorded voice

All 141 lines of `HI02H11_L02_S04_VO_manifest.xlsx` are now the SME's recordings (they replace the TTS
placeholders and the 11 lines borrowed from File3, including the three transition lines).

- **Source** — her WAVs (24 kHz mono) moved out of the deployed folder (`3_BUILD/assets/Audio/voiceovers/`)
  to `1_SPEC/lesson_voice/source_wav/`; the takes they replaced are in `1_SPEC/lesson_voice/tts_backup/`.
- **Prepared** by `1_SPEC/prepare_lesson_voice.py` (File3's): dead air trimmed (30 ms kept before the
  voice, 120 ms after), levelled to -16 LUFS (all 141 within ±0.7), peaks limited to -1 dBFS, written as
  WAV under the same `.ogg` names.
- **Timing re-measured from her takes** — every screen cue tied to the voice is read off her own pauses:
  page 1 (the letter on «ओ», the arrow on «इसकी», the matra on «देखिए»), pages 2 / 4 (the mark lands on
  «घो» / «लौ», ड़ा / खि / ना join on their words, the picture on «घोड़ा» / «खिलौना», the three sounds), pages
  3 / 5 (the picture on «इसमें», the matra on «ओ» / «औ»). She pauses in other places than the commas
  («यह है · औ। · …», «मोर, · इसमें · म पर ओ · …»), so `_word_ms` now puts the punctuation on her longest
  pauses and shares the words out over the stretches in between. The transition titles type on her
  phrase («चलिए, शुरू करें!» 3.24 s, «चलिए, साथ में करें!» 3.75 s, «अब आपकी बारी।» 1.22 s - measured, no longer
  File3's numbers); Swifty's lip-sync on the three transitions and the celebration follows her voice.
- **Checked** — 141/141 files match the manifest's IDs; lengths and pause patterns fit their lines
  (no file looks misnamed); the automatic transcription check could not run - the Gemini key in
  `3_BUILD/.env` is no longer valid. In the browser with real audio: pages 1, 2, 4 move on her words to
  within ~0.1 s; `_verify_vo_overlap.py` 0 clashes on every page; `_verify_assets.py` 0 FAIL 0 WARN
  (no truncated clip); «मात्रा टोकरी» plays through to the celebration.

## Round 11 (2026-10-21) — File3's QA fixes and its last two changes (File3 r139-r142)

File3 and File5 share one engine, so File3's QA round is applied here as the same code (the File3 engine
diff since its "make final changes suggested by ankita" commit, applied hunk by hunk - every hunk landed).
- **BUG_01** no translation (`translate="no"`, `notranslate`).
- **BUG_02** hidden tab / minimised browser pauses everything (voice, sounds, music, the tokri game) and
  resumes where it was; nothing starts while hidden.
- **BUG_03** music 0.68 → 0.50, still stepping back under voice and sound effects.
- **BUG_04** the speaker stays grey for a whole sequence, not just per clip.
- **BUG_05** pages 3 / 5 (T3, T5): the hand points at the mic when «इस बटन पर टैप करिए» plays; while the mic
  waits, the speaker replays the word's whole line.
- **BUG_06** Swifty's sad face only for the wrong-answer moment (back after 1.8 s).
- **BUG_07** after the correct answer the speaker is grey and ignores taps.
- **BUG_08 case 1** after the 3rd wrong attempt only the right coach takes the card.
- **Mic centred on the word** (T3, T5). File5's matras (ो / ौ) stand ABOVE the letters, so the word's centre
  is higher than in File3: the mic's offset is -61 px here (File3: -31). Measured within ±1.5 px of the
  centre of the whole word (letters + matra) on मोर, कोयल, कौआ, पौधा.
- **Transition screens** - Hindi-game-gender-identify's screen: its peeking Swifty (`assets/UI/
  peeking_talk_up.webp`), whoosh (`assets/Audio/sfx_whoosh.ogg`), magenta headline that wipes in when Swifty
  says it (still at the cue measured from the SME's clips: 3.24 / 3.75 / 1.22 s), the sink on the first one;
  the third screen holds until its line has been whole for 0.7 s. The seeking bird, its lip-sync and the
  typewriter are gone (the builder's `gate_talk()` is now `gate_cues()`, which only measures the cues).
  `swifty_gate_seek.webp` / `swifty_gate_talk.webp` are still in `assets/UI`, unused.
- The old gate styles are also taken out of `4_ENGINE/train_styles.css`, so `inject_train.py` cannot bring
  them back.
Checked in the browser: all three transitions (the real cover → T1 path too), each bug above on File5's own
pages (G1 for the speaker, G8 for the face and the speaker after the answer - dragged, as these pages are
drag-only - G4 for the coaches, T3 / T5 for the mic); no console errors.

## Round 12 (2026-10-21) — background music 40 %

QA: the music "still feels loud" at 50 %. Its level is now 0.40 (was 0.50). It still steps back under
sound effects and the voice, unchanged. Measured: 0.40 with no voice, 0.16 under the voice.

## Round 11 (2026-10-21) — pages 3 / 5: the mic centred on the word

The developer: "align the mic button with the word, it should be centred with respect to the word". The
mic was centred on the word's whole ink, hook of ो / ौ included, so it sat level with the top line, 13-18 px
above the letters. It is now centred on the letters - midway between the top line and the baseline:
measured 0 px off on मोर, कोयल, कौआ and पौधा; the gap to the word (30-33 px) and the size are unchanged.

## Round 13 (2026-10-21) — background music 30 %

QA still finds the music loud at 40 %. Its level is now 0.30. The old level under a sound effect (0.32)
would now have been LOUDER than the music itself, so both dips scale down with it: 0.15 under an effect,
0.08 under the voice (the r99 proportions, about a half and a quarter). Measured: 0.30 with no voice, 0.08
under the voice. The runner game's own music (MatraRunner, 80 % by Yasir's ruling) is not touched.

## Round 14 (2026-10-21) — QA BUG_09 and BUG_10 (File3 r145)

QA sheet, two new entries. Same code in File3 and File5.
- **BUG_09 - the speaker during a page's opening.** On the tap pages and the word-build page the train
  rolls in silently before the question is spoken, and the speaker was live in that gap: a tap started the
  question and the page's own opening then played over it. Now EVERY page keeps the speaker grey, and
  ignoring taps, from the moment it opens until its opening voice is over (something spoken, then 700 ms
  of quiet; a page that says nothing lets go after 8 s). The speaker's tap handler also ignores taps
  whenever it is grey.
- **BUG_10 - pages 3 / 5, the mic pages.** (1) After the last word, the speaker replays only that word's
  line, not the opening line and both words. (2) While the speaker replays a word's line, the mic is greyed
  and takes no tap (a tap used to cut the line off); it is live again when the line ends. The 7 s reminder
  «इस बटन पर टैप करिए» does not grey it - the hand points at the mic while it plays.
Measured in both files: 23-50 taps on the speaker during the openings of the tap / word-build pages
started nothing (the question played once), and a tap once it is blue replays the page; on both mic
pages the mic greys during the replay and a tap on it does nothing, it pulses again after, it stays live
during the reminder, and after the last word the speaker plays only that word's line. No console errors.

## Round 15 (2026-10-21) — QA round 2: BUG_06, BUG_08 case 3, shake before the hint (File3 r146)

QA round 2 + Yasir's ask on the tap pages. Same code in File3 and File5.
- **BUG_06 (round 2: "Swifty comes back to normal before the VO is complete, on all slides").** The fixed
  1.8 s timer is gone: Swifty stays sad for the whole wrong-answer sequence (the wrong sound, the shake, the
  hint line and any read-out) and turns back when it is over (250 ms of quiet after the voice). Nothing
  spoken: back after 3 s. The hand-on-the-last-option point in QA's remark is not part of this change.
- **BUG_08 case 3 ("confetti on each correct answer - once, when the activity is complete").** Option B: each
  correct drop on the sort pages and the word-build page gives the coach's glow and a soft pop; the confetti
  and the success sound come once, with the drop that completes the screen. The tap pages are unchanged
  (one answer: one confetti).
- **Tap pages (slides 8-10): shake first, then the voice.** A wrong coach shakes with the wrong sound; the
  hint (line, read-out or hand) now starts when the shake is over (520 ms), and the coaches take no tap in
  between.

## Round 16 (2026-10-21) — the success sound on every correct drop, confetti at the end (File3 r147)

Yasir, on r146's option B: "why are you not using the success sfx for every correct answer - and confetti
with sfx will play after completing all options correctly". On the sort pages and the word-build page each
correct drop now plays the success sound (with the coach's glow), no confetti; the drop that completes the
screen plays the confetti with the success sound - once, not twice. Measured in both files: G5 2 drops ->
2 success sounds, 1 confetti (on the last); word build 3 letters -> 3 success sounds, 1 confetti.

## Round 17 (2026-10-21) — a wrong attempt: the shake and the wrong sound, then the hint (File3 r148)

Yasir, still on BUG_09: "in case of a wrong attempt the coach shakes and the sfx plays, then the VO should
play". r146 waited only for the shake (520 ms) and only on the tap pages - but the wrong sound is audible for
0.67 s (sfx_fb_incorrect; silent from 0.669 s), so the line still came in over it, and the sort, word-build and
sentence pages did not wait at all. Every wrong attempt now plays the shake and the wrong sound on their own,
and its hint (line, read-out, hand) starts 750 ms later; no tap or drop is taken in between. Swifty's sad face
(r146) still lasts until the hint line is over.
Measured in both files, wrong sound -> hint voice: tap page 754-763 ms, sort 757-761, word build 757-765,
sentence 752-766; Swifty normal 0.3-0.4 s after the line ends; no console errors.

## Round 18 (2026-10-21) — the 7 s reminder after every action, not once per page (File3 r149)

Yasir: "there is a 7 s inactivity nudge, but if the user answers (correct or incorrect) and then stays inactive
for 7 s there is no nudge". [27f] allowed ONE reminder per page, so once it had been used (the child idled
before answering), every later silence on that page got nothing. Now each action of the child (a tap or a drag)
earns the next reminder: after 7 s of quiet the page's question is asked again (the tap pages also read the
options, as before). It never loops by itself - with no action in between it is said once. A page answered
correctly stays quiet (its next button pulses). Same in File3 and File5.
Measured with real pointer taps / drags, reminder already used, then a wrong answer: the reminder comes
7.0-7.6 s after the hint ends on the tap pages (G1, G2), the sort page (G4) and the sentence page; after one
correct drop of four (G4) 6.9-7.1 s; untouched, it plays once and not again in 30 s; nothing after a correct
answer.

## Round 18 (2026-10-22) — the new horse, a smaller घड़ा on page 2

- **Horse** — the developer's new picture («Cheerful Chestnut Horse Illustration.png», a transparent cut-out)
  replaces `obj_ghoda.webp`: trimmed to the horse, 640 x 564, WebP. It is the same file everywhere the horse
  appears - page 2 (घोड़ा), page 13 (picture sort), page 14 (sentence option). The source PNG moved out of the
  deployed folder to `1_SPEC/art_src/obj_ghoda_v2_source.png`; the build's picture stamp changed, so browsers
  fetch the new one.
- **Page 2, «घड़ा»** — the pot filled its whole 210 px box and read much bigger than the horse; it is 160 px
  tall now and stands on the same ground line as the horse's hooves. The box, the word and everything else on
  the page are unchanged.

## Round 19 (2026-10-22) — the 7 s reminder repeats every 7 s while the child stays inactive (File3 r150)

Yasir: "the VO replays only 1 time - it should play after each 7 seconds, not just once, if the user remains
inactive". The idle reminder keeps going now: after each reminder the 7 s count starts again when it has
finished speaking, so a child who stays inactive hears the question every 7 s of silence - until they act, the
page is answered, or they leave it. Same pages as before (every page where the child has to do something; not the
watch-only pages or the runner game; the mic pages keep their own 7 s reminder).
Measured, 40 s untouched, silence before each repeat: tap page G1 7.3-7.4 s (3 reminders - each also reads the
options), sort page G4 7.0-7.2 s (4), sentence page 7.0-7.1 s (4), in both files; nothing after a correct
answer; no console errors.

## Round 19 (2026-10-22) — «मात्रा टोकरी»: the matra on the basket, no red on a wrong catch

The developer, for the game only ("don't change anywhere else"):
1. **The round's matra on the basket** - a white tag with the lesson's yellow border and the orange matra on
   the basket's woven front: «◌ो» in the ओ round, «◌ौ» in the औ round (set at each round's start). It is part of
   the basket's front layer, so it moves, bounces and wiggles with the basket. Glyph 40 px in a 62 px tag,
   measured ~6 px clear above and below for both matras.
2. **No red when a wrong word is caught** - the basket keeps its white outline and only wiggles; the word's
   cloud keeps its own colour and only shakes; the wrong sound plays as before. Measured on a wrong catch:
   basket outline rgb(255,255,255) with its olNo wiggle, cloud filter = its normal colour, word wgNo shake.
   The green of a right catch is unchanged.
Files: `4_ENGINE/tokri_module.js` (the tag + its text per round), `4_ENGINE/tokri_styles.css` (a block at the
end, scoped to `.mt-game`). Played end to end: both rounds, a wrong catch, the celebration; no console errors.

## Round 20 (2026-10-22) — «मात्रा टोकरी»: the matra in the centre of the basket, in a colour that shows

The developer: "put the matra in the centre of the tokri, and use some other colour so that it's visible on
the tokri". The small white tag (orange matra) is gone; the matra is drawn straight onto the basket, larger
(52 px), in WHITE with a thick NAVY outline (#0B3D8C) and a soft shadow, which reads on the brown weave. It is
centred on the basket's woven front - horizontally on the basket, vertically between the rim's front lip and
the bottom (77 % of the basket's height, the ink centred, not the line box). Still «◌ो» in the ओ round and
«◌ौ» in the औ round, still moving and wiggling with the basket. Game only; nothing else changed.

## Round 21 (2026-10-22) — «मात्रा टोकरी»: the basket's matra in a box

The developer: "it's still not visible on the tokri, put it inside a box so that it's clearly visible". The
matra is now in a WHITE BOX (88 x 72 px) with a thick NAVY border (5 px, #0B3D8C), a thin white halo and a drop
shadow, so it stands off the brown weave; the matra inside is deep orange (#E8590C), 44 px, its ink centred in
the box (~7 px clear above and below, measured for both ◌ो and ◌ौ). Centred on the basket's front, moving and
wiggling with it; «◌ो» in the ओ round, «◌ौ» in the औ round. Game only.

## Round 22 (2026-10-22) — «मात्रा टोकरी»: a bigger basket, the matra box fully on it

The developer: "make the tokri a little bigger so that the matra box would be in the tokri (part of it is on
the top)". The basket is 25 % bigger: 206 x 155 -> 258 x 194 (its own proportions), standing on the grass at the
same place. Everything tied to its size moved with it, so a word is caught where the bigger rim is: catch width
103 -> 129 (half the rim), CATCH_Y 517 -> 489, catch depth 52 -> 65, the dashed catch line 10 px under the rim as
before, and the nudge hand's dx (still on the basket's right flank). The matra box (unchanged, 88 x 72) now sits
wholly on the woven front, below the rim: measured box 545-617 px against the weave's 546-618. Played end to end:
all 10 right words caught, a wrong word thrown out (no red), both labels, the celebration. Game only.

## Round 23 (2026-10-22) — «मात्रा टोकरी»: a basket with a name-plaque, as in the developer's reference

The developer sent a picture: the basket with a wooden name-plaque on its front and the matra on it. The basket
art (`assets/UI/mt_basket.webp` and its front layer `mt_basket_front.webp`) now carries that plaque - a wooden
frame with a dark outline and a lighter top band, a cream panel and two brass rivets - drawn on the same spot in
both layers so they stay in register (`1_SPEC/make_tokri_plaque.py`; the art before the plaque is kept in
`1_SPEC/art_src/tokri_basket_v1/`). The basket's outline, rim and catch geometry are untouched (same art, same
silhouette). The game writes only the matra on the plaque, in the lesson's orange (34 px, the ink centred on the
cream panel for both ◌ो and ◌ौ); the white box of round 21 is gone. Played end to end: both rounds' matras on the
plaque, a wrong catch (no red), the celebration. Game only.

## Round 20 (2026-10-23) — pages 3 / 5: the mic hand + «इस बटन पर टैप करिए» right after the word's line (File3 r151)

Yasir, pages 3 / 5: "when the VO «बोलकर देखिए» ends, «इस बटन पर टैप कीजिए» plays and the hand nudge appears -
currently only in case of 7 s inactivity". The reminder now opens the child's turn: 0.35 s after the line ends
(the mic's pop-in), the hand goes to the mic and «इस बटन पर टैप करिए» is said; after that, as before, it repeats
after every 7 s of nothing until the mic is tapped. Same in File3 and File5.
Measured on both words of both pages, in both files: hand + line 0.36-0.37 s after «…बोलकर देखिए» ends; the
repeat 7.0 s after it finishes; no console errors.

## Round 21 (2026-10-23) — the mic hand's timing as in HI02H11_L02_S03 (File3 r152)

Yasir: the hand nudge on the mic as it is done in his friend's build (github khugshalharshvardhan/
HI02H11_L02_S03-file3-, commit "hand nudge timing fixed"). Ported as it is there: the hand + «इस बटन पर टैप करिए»
come at once (0.35 s after «…बोलकर देखिए») only on page 3's FIRST word - the child's first mic; page 3's second
word and both words of page 5 get them after 7 s of inactivity, and every reminder repeats after each 7 s of
nothing until the mic is tapped. Card flag `mic_nudge_now` (T3 only, set by the builder) + their condition in
MEET_PAIR micTurn. The hand itself (pointNudgeAt, its styles) was already identical to theirs.
Measured in both files: T3 word 1 hand + line at 0.36-0.37 s, repeat at 9.0 s; T3 word 2 and T5 both words at
7.0 s; no console errors.
