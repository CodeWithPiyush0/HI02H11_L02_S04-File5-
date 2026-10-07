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
