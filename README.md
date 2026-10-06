# HI02H11_L02_S04 · «मात्राओं की रेल» — ओ / औ

**Skill:** ओ, औ मात्रा वाले शब्द पढ़ता है। शब्दों में आने वाली मात्रा पहचानता है। (Grade 2 Hindi FLN)

The SME's review deck applied, on File3's engine (`HI02H11_L02_S02`, the उ/ऊ lesson): same cover,
train, animations, Swifty, sounds, colours and flow, with this lesson's words, pictures and VO.
**Read `CHANGES.md` first**: every deck ask, its status and its proof.

## Folder

| | |
|---|---|
| `1_SPEC/` | SME deck + verbatim notes, independent-round words, **the builder** (`build_skill_HI02H11_L02_S04.py`), the verifiers and drivers |
| `2_REVIEW_DECK/` | this build page by page (`HI02H11_L02_S04_Review_File3Style.pptx`) |
| `2_BUILT_REVIEW_DECK/` | the draft's old review deck (left in place because it was open in PowerPoint) |
| `3_BUILD/` | **the lesson**: `HI02H11_L02_S04.html` + `card.json` + `assets/` |
| `4_ENGINE/` | File3's engine copy + the S04 additions (`CHANGES.md` → "S04") |
| `5_SCREENSHOTS/` | every page settled, plus `hints/` (Hint 2 / Hint 3 on each test screen) |
| `celebration_kit/` | File3's lip-synced celebration Swifty |
| `_DRAFT_ORIGINAL/` | the SME's draft as received (old engine). Safe to delete once signed off |

## Run

```bash
cd 3_BUILD && python -m http.server 8000
# open http://127.0.0.1:8000/HI02H11_L02_S04.html
```

## Deploy (Vercel)

Deploy the repo root as-is (framework preset **Other**, no build command, no output directory).
`vercel.json` serves `3_BUILD/HI02H11_L02_S04.html` at `/` and maps `/assets/*` to
`3_BUILD/assets/*`; `.vercelignore` uploads only `3_BUILD/` (never `.env`). Commit both files;
`.vercel/` (created by `vercel link`) stays local and is git-ignored.

## Rebuild

```bash
PYTHONUTF8=1 python 4_ENGINE/inject_train.py           # only after editing 4_ENGINE/train_*.{js,css}
PYTHONUTF8=1 python 1_SPEC/build_skill_HI02H11_L02_S04.py
```

New or changed VO (the builder deletes a clip whose text changed; `gen_tts` records only missing ids):

```bash
cd 3_BUILD && export GEMINI_KEY="$(grep '^GKEY=' .env | cut -d= -f2-)"
python <swiftpal-game-revise>/scripts/gen_tts.py card.json --voice Leda --ext ogg
cd .. && PYTHONUTF8=1 python 1_SPEC/build_skill_HI02H11_L02_S04.py   # re-measures the timing cues
```

Checks: `cd 3_BUILD && PYTHONUTF8=1 python ../1_SPEC/_verify_assets.py` ·
`1_SPEC/_verify_vo_overlap.py <url> 3_BUILD/card.json out.txt` ·
`1_SPEC/_drive_ladder_s04.py <url> out.json shots/` · `1_SPEC/_capture_settled.py <url> shots/`.

## Open items

- **Independent round** (word-catch game after «अब आपकी बारी!») is not built yet.
- **Hint-3 hand on pages 12–16** waits on Ankita: `HINT3_HAND` in the builder.
- **Size:** `3_BUILD` is not optimised (raw-WAV audio). Re-encode to Opus on a copy before delivery.
