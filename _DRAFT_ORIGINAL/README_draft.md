# HI02H11_L02_S04 · «मात्राओं की रेल» — ओ / औ
## Developer handover · built to the SME's review of 2026-10-05

**Skill:** ओ, औ मात्रा वाले शब्द पढ़ता है। शब्दों में आने वाली मात्रा पहचानता है।
**Grade 2 · Hindi FLN · 17 screens** (landing + 16) **+ the independent round, which you build**
· engine `2026.08.04b-r4-unified`

This is not a change request. The SME's notes have been **implemented** in the build in
`3_BUILD/`, and `1_SPEC/IMPLEMENTATION_STATUS.md` says, line by line, what was built, what differs
and why. The flow and the hint logic are the same as HI02H11_L02_S03 (ए / ऐ); only the words, the
pictures and some VO lines differ. The folder is self-contained.

---

## Read in this order

| | |
|---|---|
| 1 | **`1_SPEC/IMPLEMENTATION_STATUS.md`**: every SME note against the build. ✅ built · ◐ differs, with the reason · ⏳ waiting on a ruling · ➜ yours |
| 2 | **`1_SPEC/independent_round.png` + `independent_round_words.txt`**: the round **you build** (see below) |
| 3 | **`2_BUILT_REVIEW_DECK/HI02H11_L02_S04_Built_Review.pptx`**: screenshots of THIS build in the SME's own deck format, with their notes in the speaker notes |
| 4 | **`3_BUILD/HI02H11_L02_S04.html`**: play it |
| 5 | `1_SPEC/HI02H11_L02_S04_SME_Review.pptx` and `_SME_RECOMMENDATIONS.md`: the SME's deck exactly as sent, and its notes verbatim |

---

## The independent round is yours to build

After «अब आपकी बारी!» the SME placed a **word-catch game**: words in clouds, a basket, five
progress circles (deck position 21). Their note says *"Full game logic same as in आ, इ, ई मात्रा
वाले शब्द पढ़ता है।"*. You already have that game; the SME confirmed you will build this round.
The screenshot's words (नदी, काम, सिर) come from that आ/इ/ई lesson. For this lesson, use:

* **ओ की मात्रा (◌ो):** मोर, तोता, घोड़ा, ढोल, गोल, कोयल, टोपी, रोटी, गोभी, धोबी, कटोरा, खोना।
* **औ की मात्रा (◌ौ):** कौआ, पौधा, दौड़, चौक, चौकी, चौड़ा, हथौड़ा, खिलौना, कचौड़ी, पकौड़ा, तौलिया, मौसम।

Every word carries exactly one ो or ौ. Other marks in them (टोपी's ी, तौलिया's ि and ा) stay
uncoloured, under the same rule as the rest of the lesson.

In this HTML, round 3 holds only the celebration, and the engine never gates into a celebration,
so **«अब आपकी बारी!» is not shown here**. It belongs at the start of your round.

---

## What is in the folder

```
1_SPEC/
  HI02H11_L02_S04_SME_Review.pptx     the SME's reviewed deck, untouched
  _SME_RECOMMENDATIONS.md             its speaker notes, verbatim, in the deck's order
  IMPLEMENTATION_STATUS.md            note by note against the build
  independent_round.png               the SME's screen for the independent round
  independent_round_words.txt         its 24 words, verbatim from the SME
2_BUILT_REVIEW_DECK/
  HI02H11_L02_S04_Built_Review.pptx   this build, in the SME's format
3_BUILD/                              HI02H11_L02_S04.html + card.json + assets/ (runnable)
4_SOURCE/
  scripts/build_skill_HI02H11_L02_S04.py   the words, CONTENT ONLY
  scripts/matra_train_lib.py               the flow, the ladder, every VO template, the guards
  scripts/sme_notes.py                     speaker notes for the review decks
  engine_local/                            train_modules.js, train_styles.css, inject_train.py, CHANGES.md
  art/                                     every image prompt, and the rules the failures taught
  _verify_assets.py · _vo_script.json      the asset checker, and the text of every clip
5_SCREENSHOTS/                         17 pages + _gates/ (the three peek gates)
```

---

## Running it

```bash
cd 3_BUILD
python -m http.server 8000
```

Open `http://127.0.0.1:8000/HI02H11_L02_S04.html`. Serve it over http: opening the file directly
blocks the audio and asset loads.

Rebuilding: `cd 4_SOURCE/scripts && PYTHONUTF8=1 python build_skill_HI02H11_L02_S04.py`. The
builder refuses to build if the flow, a phase, a heading, a hint rung, a per-item praise or reveal
clip, or the hand rule is missing or wrong. Never hand-edit the HTML: `card.json` is generated,
and engine changes go through `engine_local/inject_train.py`.

---

## Two things to know before you ship

**1 · The Hint-3 hand on G6–G10 is waiting on Ankita.** On word-build, the picture sort and the
three sentences, the SME's notes say *"Pending confirmation, use glow and lock without a hand"*.
It is built that way. One switch flips it: `HINT3_HAND` in `matra_train_lib.py`.

**2 · New in the engine since S03** (`engine_local/CHANGES.md`, Change 16):
* on the picture round, Hint 1 plays the picture's **name between its two lines**, as the SME's
  note asks: «फिर से सुनिए।» → name → «चित्र को सही मात्रा वाले डिब्बे में डालिए।»;
* on page 5 the base picture is an action: the **bud opens into the flower** while
  «यह शब्द देखिए, खिलना» plays. The frozen screenshot shows the bud.

---

## State of the build

| | |
|---|---|
| screens | 17: tutorial 5 · guided 10 · independent 1 (+ your independent round) |
| voice-over | 125 clips · `_verify_assets.py` **0 FAIL / 0 WARN** |
| images | 16: 13 cut-outs + 3 scenes, every one checked by eye |
| JS errors | none: every slide mounted |
| verified by driving it | the bud-to-flower bloom; G1's full ladder with the hand at Hint 3 and «शाबाश! मोर शब्द में ओ की मात्रा है।»; G6 distractor counting across नौ → कौ and «शाबाश! पौधा बन गया।»; G7's named Hint 1, temporary name at Hint 2, frozen cards and no hand at Hint 3, silence after; G10's three-sentence Hint 2 and its Hint 3 lock |

**Two 404s on load, not from this lesson.** `pic_kaam.png` and `pic_naak.png` are preload tags
baked into the shared engine's `<head>`, pointing at an old demo lesson. Every game on this engine
line fires them; they are being fixed separately.
