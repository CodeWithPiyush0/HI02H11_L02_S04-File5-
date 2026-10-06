# HI02H11_L02_S04 · ओ / औ — implementation status against the SME's 2026-10-05 review

Every line of the SME's speaker notes has been read against the built game. **✅ built and
verified by driving it in the browser · ◐ built, with a stated difference · ⏳ waiting on a ruling ·
➜ the developer's.** Nothing is marked ✅ on the strength of reading code alone.

The flow, the hint ladder and the gates are the S03 review of 2026-09-30, unchanged; this review
changed the words, the pictures and five lines of VO, and answered the independent-round question.

## The shape of the lesson

| | |
|---|---|
| ✅ 17 screens in the SME's deck order, none deleted | `guard_flow` fails the build on any other order |
| ✅ tutorial 5 · guided 10 · independent 1; «चलिए, शुरू करें!» on शुरू करें, «चलिए, साथ में करें!» between T5 and G1 | gates seen firing |
| ➜ **the independent round** (deck position 21, after «अब आपकी बारी!») — a word-catch game: words in clouds, a basket, five progress circles. The SME's notes give the words and say "Full game logic same as in आ, इ, ई मात्रा वाले शब्द पढ़ता है।" **Not in this HTML; the developer builds it** from the list below and the screenshot in `1_SPEC/independent_round.png` | |
| ⏳ **Hint-3 hand on G6–G10** (word-build, picture sort, sentences): the SME's notes still say "Confirm with Ankita … Pending confirmation, use glow and lock without a hand". Built that way — one switch, `HINT3_HAND` | verified: hand on G1, none on G7/G10 |
| ✅ input locked while ANY VO plays; «छोटी» / «बड़ी» never appear | `guard_register` |

**The independent round's words** (the SME's, verbatim):

* ओ की मात्रा (◌ो) वाले 12 शब्द: मोर, तोता, घोड़ा, ढोल, गोल, कोयल, टोपी, रोटी, गोभी, धोबी, कटोरा, खोना।
* औ की मात्रा (◌ौ) वाले 12 शब्द: कौआ, पौधा, दौड़, चौक, चौकी, चौड़ा, हथौड़ा, खिलौना, कचौड़ी, पकौड़ा, तौलिया, मौसम।

## Page by page

| page | status | notes |
|---|---|---|
| 1 landing | ✅ | the two marks in two bogies, the train pulls in, bogies pop ◌ो then ◌ौ |
| | ◐ | no per-bogie SFX — the browser blocks sound before the first tap (as S03) |
| 2 intro | ✅ | heading and pair lines verbatim; one pair lit at a time; आगे locked until both |
| 3 build | ✅ | घड़ा + pot → घ + ◌ो = घो → घोड़ा + horse. VO now «यह शब्द देखिए, घड़ा।» only — the draft's gloss «यह पानी का घड़ा है।» removed, as the SME's note has none. The result caption shows **घो + ड़ा = घोड़ा** |
| 4 pair | ✅ | **मोर, कोयल** (was मोर, तोता). New koel picture: black, long tail, red eye, on a branch |
| 5 build | ✅ | **the bud opens into the flower** while «यह शब्द देखिए, खिलना» plays (new: `base_img_from`); «अब खि, लौ और ना को जोड़ने पर, खिलौना बनता है।»; caption **खि + लौ + ना = खिलौना**; the toy duck as before |
| | ◐ | "Highlight ल in खिलना" — ल is lit in the centre equation, not inside the word on the left (as S03) |
| 6 pair | ✅ | **कौआ, पौधा** (was कौआ, नौका). पौधा's ा and कौआ's आ stay navy |
| 7 tap | ✅ | **मोर · दौड़ · चौक** → मोर. Hint 1 «फिर से पढ़िए…»; Hint 2 reads all three and leaves the marks; Hint 3 glow + lock + **hand**, «मोर शब्द में ओ की मात्रा है। मोर पर टैप कीजिए।»; silent after |
| 8 tap | ✅ | **ढोल · कौआ · गोल** → कौआ |
| 9 tap | ✅ | नौका · तोता · कौआ → तोता; «तोता पर टैप कीजिए» as written |
| 10 word sort | ✅ | **पौधा · ढोल · कौआ · तोता**, picture-and-word cards, each name read before the tray unlocks; per-card counter, praise and reveal; no completion VO; hand at Hint 3 |
| 11 mark sort | ✅ | ◌ौ · ◌ो; Hint 2 does not name the mark |
| 12 word build | ✅ | मो+र · ढो+ल · **पौ+धा**; options मो, नौ, ढो, पौ, कौ in that order; verified: distractor drops on _धा counted across नौ → कौ (Hint 2 on the second), Hint 2 reads only the dropped अक्षर, «शाबाश! पौधा बन गया।» |
| 13 picture sort | ✅ | **दौड़ · तोता · घोड़ा · हथौड़ा** (new pictures: two children running, a claw hammer). **Hint 1 now names the picture**: «फिर से सुनिए।» → «दौड़» → «चित्र को सही मात्रा वाले डिब्बे में डालिए।» — verified. Hint 2 shows the name until placed; Hint 3 «दौड़ में औ की मात्रा है…», the other pictures frozen, no hand, silent after |
| 14 sentence | ✅ | **«पेड़ पर एक ___ बैठा है।»** — कौआ, घोड़ा, मोर; new scene: one tree, one crow, no child, no parrot |
| 15 sentence | ✅ | «बच्चे के पास एक ___ है।» — खिलौना, मोर, ढोल; scene re-drawn with ONE toy duck, no other toys; Hint 3 «… खिलौना को खाली जगह में डालिए।» |
| 16 sentence | ✅ | **«आदमी के हाथ में एक ___ है।»** — ढोल, हथौड़ा, तोता; new scene: a man holding a claw hammer at a workbench. Verified: Hint 2 reads all three sentences, Hint 3 «… हथौड़ा शब्द को खाली जगह में डालिए।», ढोल and तोता locked |
| | ◐ | Hint 2 "Highlight the crow / the toy duck / the hammer" — the whole scene is ringed, not the object (as S03) |
| 17 celebration | ✅ | the draft note was left as written; built as written |

## Two rulings the SME made on the draft — applied

* **No «शब्द» before a postposition.** The draft said «तोता शब्द पर टैप कीजिए», «घोड़ा शब्द में…»; the
  SME wrote «तोता पर», «घोड़ा में», «खिलौना को» throughout, keeping «शब्द» only on p.16
  («हथौड़ा शब्द को…»). Built exactly as written (`cite_shabd=False`).
* **No «अब» in the tap reveal.** Built as written; the clip that used to truncate (मोर) came out whole.

## Assets

| | |
|---|---|
| voice-over | **125 clips, `_verify_assets.py` 0 FAIL / 0 WARN.** 42 new. The check also caught **`vo_meet_mor` truncated at 0.97 s in the draft build** — re-recorded |
| ear-check | fallback voice/wrapper, timbre may differ: `vo_rev_wb_paudha`, `vo_name_w0928094c0915093e` (नौका), `vo_g7_hint1`, `vo_name_hathauda`, `vo_name_w091a094c0915` (चौक), `vo_rev_picture_daud`; still from the draft: `vo_akshara_1`, `vo_rev_mark_au`, `vo_akshara_3`, `vo_meet_kaua` |
| images | **16** — 13 cut-outs + 3 scenes, all looked at. 3 new objects, 1 bud, 4 re-rolled to the SME's image requirements, 2 new scenes and 1 re-drawn. See `ART_BRIEF.md` |
| JS errors | none — all 16 slides mounted |
