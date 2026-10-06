# -*- coding: utf-8 -*-
"""Build HI02H11_L02_S04 (ओ / औ) — «मात्राओं की रेल».

Curriculum: Hindi_content progression.xlsx, Grade 2 · H11 · L02.
    ओ, औ मात्रा वाले शब्द पढ़ता है। शब्दों में आने वाली मात्रा पहचानता है।

=======================================================================================
WHAT THIS IS
=======================================================================================
The lesson rebuilt on HI02H11_L02_S02's engine (File3 — the उ / ऊ lesson): its painted train,
title-on-a-cloud cover, Swifty gate / talking heads / lip-synced celebration, background music,
button sounds, matra highlight and screen-by-screen animation flow — with THIS lesson's words,
pictures and voice-over, which come from the SME's review of 2026-10-05
(`1_SPEC/HI02H11_L02_S04_SME_Review.pptx`, notes verbatim in `_SME_RECOMMENDATIONS.md`).

Where the two disagree on CONTENT (a word, a VO line, a heading, the hint ladder's wording and
behaviour) the deck wins. Where they disagree on LOOK and FLOW, File3 wins — that is the ask.
Every point where that rule had to be applied is listed in `../CHANGES.md`.

Decisions taken with the developer on 2026-10-06:
  · the independent round (the SME's word-catch game, deck position 21) is NOT in this build yet;
  · File3's watch-only drag-and-drop demo screen (G4D) IS kept, with this lesson's words;
  · Hint 3 shows the hand on screens 7-11 and NOT on 12-16 (the deck: "Pending confirmation, use
    glow and lock without a hand") — the one switch is HINT3_HAND below.

Run:  PYTHONUTF8=1 python 1_SPEC/build_skill_HI02H11_L02_S04.py   (from the folder root)
"""
import hashlib
import os, re, sys, json, argparse
import array
import contextlib, wave

CODE = "HI02H11_L02_S04"
HANDOFF  = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BUNDLE   = os.path.join(HANDOFF, "3_BUILD")
ENGINE   = os.path.join(HANDOFF, "4_ENGINE", "lesson_template.html")
SPEC_DIR = os.path.dirname(os.path.abspath(__file__))
IMG_DIR  = os.path.join(BUNDLE, "assets", "Images")
AUD_DIR  = os.path.join(BUNDLE, "assets", "Audio")
CARD_TAG = re.compile(r'(<script type="application/json" id="cardData">)(.*?)(</script>)', re.S)
VER_RE   = re.compile(r'ENGINE_VERSION\s*=\s*["\']([^"\']+)["\']')

TRAIN_MODULES = ["TRAIN_TAP", "TRAIN_SORT", "MATRA_BUILD", "MEET_PAIR", "MATRA_PAIRS",
                 "WORD_BUILD", "SENTENCE_COMPLETE"]
STOCK_MODULES = ["CELEBRATION"]
COPY_AUDIO = ["vo_pt_tutorial", "vo_pt_guided", "vo_pt_practice",
              "sfx_celebrate", "sfx_correct", "sfx_wrong", "sfx_tap", "sfx_pop",
              "sfx_fb_correct", "sfx_fb_incorrect",
              "sfx_play_button", "sfx_next_button",
              "sfx_train_arrive", "sfx_train_move", "sfx_whistle"]

O, AU = "ो", "ौ"

# The one switch for the open ruling (Ankita). The deck's notes on word-build, the picture sort and
# the three sentences: "Pending confirmation, use glow and lock without a hand."
HINT3_HAND = {"tap": True, "sort_words": True, "sort_marks": True,
              "word_build": False, "sort_pictures": False, "sentence": False}

# ---------------------------------------------------------------- content
# key -> (word, emoji, matra). Every word carries exactly ONE target mark (ो or ौ). Other marks
# (तोता's ा, खिलौना's ि and ा) are allowed and stay uncoloured — the SME's ruling for this family.
OBJ = {
    "obj_mor":      ("मोर",    "\U0001F99A", O),
    "obj_koyal":    ("कोयल",   "\U0001F426", O),
    "obj_ghoda":    ("घोड़ा",   "\U0001F434", O),
    "obj_tota":     ("तोता",   "\U0001F99C", O),
    "obj_dhol":     ("ढोल",    "\U0001F941", O),
    "obj_kaua":     ("कौआ",    "\U0001F426", AU),
    "obj_khilona":  ("खिलौना", "\U0001F9F8", AU),
    "obj_paudha":   ("पौधा",   "\U0001F331", AU),
    "obj_daud":     ("दौड़",    "\U0001F3C3", AU),
    "obj_hathauda": ("हथौड़ा",  "\U0001F528", AU),
}
# words that appear only on a tap coach, with no picture
TAP_WORDS = {"चौक": AU, "गोल": O, "नौका": AU}
# MATRA_BUILD base words: the form BEFORE the mark, so they live outside OBJ (no target matra)
BASE_OBJ = {
    "घड़ा":   ("obj_ghada",  "\U0001F3FA"),
    "खिलना": ("obj_khilna", "\U0001F338"),
}
EXTRA_IMG = {"obj_khilna_bud": "\U0001F331"}     # the bud that opens into the खिलना flower
SCENE = {
    "scn_ped_kaua": "\U0001F426",
    "scn_khel":     "\U0001F9F8",
    "scn_hathauda": "\U0001F528",
}
# Hint 2 on the sentence screens glows the part of the picture the sentence is about, as
# fractions of the ARTWORK (cx, cy, rx, ry). Read off the shipped 1024x1024 scenes.
SCENE_GLOW = {
    "scn_ped_kaua": [[0.540, 0.500, 0.250, 0.250]],   # the crow on its branch
    "scn_khel":     [[0.470, 0.660, 0.230, 0.230]],   # the pull-along duck, wheels and string
    "scn_hathauda": [[0.655, 0.340, 0.160, 0.230]],   # the hammer in his hand
}
NAME = {O: "ओ", AU: "औ"}
SLUG = {O: "o", AU: "au"}

AUDIO_TEXT = {}
TEXT2ID = {}
PENDING_ART = []


def _tts_safe(text):
    """The SME writes «मोर — बोलकर देखिए।». An em-dash before a short word makes this TTS voice
    stop after that word (measured on S02 and again on the S04 draft), and the comma reads the
    same. Applied to every clip, exactly as both earlier builds did."""
    return re.sub(r"\s*—\s*", ", ", text)


def vo(vid, text):
    text = _tts_safe(text)
    if vid in AUDIO_TEXT and AUDIO_TEXT[vid] != text:
        raise ValueError("clip %s registered twice with different text:\n  %s\n  %s"
                         % (vid, AUDIO_TEXT[vid], text))
    AUDIO_TEXT[vid] = text
    return vid


def once(vid, text):
    """One clip per LINE, never per slide - a line spoken on three screens is recorded once."""
    t = _tts_safe(text)
    if t in TEXT2ID:
        return TEXT2ID[t]
    TEXT2ID[t] = vid
    return vo(vid, t)


def key_of(word):
    for k, v in OBJ.items():
        if v[0] == word:
            return k
    if word in BASE_OBJ:
        return BASE_OBJ[word][0]
    return None


def slug_of(word):
    k = key_of(word)
    if k:
        return k[4:] if k.startswith("obj_") else k
    return {"चौक": "chauk", "गोल": "gol", "नौका": "nauka"}[word]


def matra_of(word):
    for _k, (w, _e, m) in OBJ.items():
        if w == word:
            return m
    if word in TAP_WORDS:
        return TAP_WORDS[word]
    sys.exit("X  no matra known for %r" % word)


def emoji_of(word):
    k = key_of(word)
    if k in OBJ:
        return OBJ[k][1]
    if word in BASE_OBJ:
        return BASE_OBJ[word][1]
    return None


def pic(key):
    if key and os.path.isfile(os.path.join(IMG_DIR, key + ".png")):
        return key
    if key and key not in PENDING_ART:
        PENDING_ART.append(key)
    return None


def name_clip(word):
    return vo("vo_name_" + slug_of(word), word)


# ---------------------------------------------------------------- timing cues off the clips
def _clip_secs(audio_id):
    path = os.path.join(AUD_DIR, audio_id + ".ogg")
    try:
        with contextlib.closing(wave.open(path)) as w:
            return w.getnframes() / float(w.getframerate())
    except Exception:
        return None


def _matra_cue_ms(audio_id, line, phrase, fallback=1300):
    """When `phrase` starts inside `line`'s recording, in ms — the clip's real duration scaled by
    where the phrase begins in the text. See File3's builder for why a constant cannot do this."""
    secs = _clip_secs(audio_id)
    if secs is None:
        return fallback
    i = line.find(phrase)
    if i < 0:
        return int(secs * 1000 * 0.35)
    before = len(line[:i].replace(" ", ""))
    total = len(line.replace(" ", ""))
    return int(secs * 1000 * (before / float(total)))


def _sound_cues_ms(audio_id, n):
    """Where each of the `n` sounds STARTS inside «घ। घो। घोड़ा।», from the silences between them."""
    path = os.path.join(AUD_DIR, audio_id + ".ogg")
    try:
        with contextlib.closing(wave.open(path)) as w:
            if w.getsampwidth() != 2 or w.getnchannels() != 1:
                return None
            sr = float(w.getframerate())
            a = array.array("h"); a.frombytes(w.readframes(w.getnframes()))
    except Exception:
        return None
    if not len(a):
        return None
    hop = max(1, int(sr * 0.01))
    peak = max(1, max(abs(v) for v in a))
    loud = [max(abs(v) for v in a[i:i + hop]) > peak * 0.10 for i in range(0, len(a) - hop, hop)]
    runs, i, minq = [], 0, int(0.18 / 0.01)
    while i < len(loud):
        if loud[i]:
            j, q = i, 0
            while j < len(loud) and q < minq:
                j += 1
                q = 0 if (j < len(loud) and loud[j]) else q + 1
            runs.append(i)
            i = j
        else:
            i += 1
    if len(runs) != n:
        return None
    return [int(r * 0.01 * 1000) for r in runs]


# ---------------------------------------------------------------- screens
def s_intro(sid):
    """Page 2 (deck slide 4) — «ओ → ◌ो», «औ → ◌ौ», one pair at a time (File3's MATRA_PAIRS).
    The S04 note: "Keep the heading: «आज हम ओ और औ की मात्रा वाले शब्द पढ़ेंगे।»" — so unlike
    File3 (whose note asked for it to go) the heading band stays."""
    p = "आज हम ओ और औ की मात्रा वाले शब्द पढ़ेंगे।"
    pairs = []
    for m in (O, AU):
        line = "यह है %s। इसकी मात्रा देखिए।" % NAME[m]
        vid = vo("vo_pair_" + SLUG[m], line)
        pairs.append({"letter": NAME[m], "matra": m, "audio": vid,
                      "cue_ms": _matra_cue_ms(vid, line, "इसकी")})
    return {"id": sid, "phase": "tutorial", "eis": "enactive", "type": "MATRA_PAIRS",
            "prompt_hi": p,
            "audio": {"prompt": vo("vo_%s_prompt" % sid.lower(), p)},
            "data": {"pairs": pairs, "auto": True,
                     "phonemes": {m: vo("vo_matra_" + SLUG[m], "%s की मात्रा" % NAME[m])
                                  for m in (O, AU)}}}


def s_build(sid, base_word, consonant, matra, syllable, result_word, result_line, join_word,
            sounds, cap_result, base_img_from=None):
    """Pages 3 / 5 — base word -> consonant + mark -> the new word (File3's MATRA_BUILD).
    VO is the deck's, word for word (em-dash -> comma, see _tts_safe)."""
    M = NAME[matra]
    rk = key_of(result_word)
    g = slug_of(result_word)
    a = {
        "prompt": vo("vo_%s_prompt" % sid.lower(),
                     "आइए, देखें कि %s की मात्रा लगने से शब्द की आवाज़ कैसे बदलती है।" % M),
        "base": vo("vo_base_" + slug_of(base_word), "यह शब्द देखिए — %s।" % base_word),
        "matra_name": vo("vo_matra_" + SLUG[matra], "%s की मात्रा" % M),
        "onset": vo("vo_onset_" + g, "%s के साथ %s की मात्रा लगाने पर, %s बनता है।"
                    % (consonant, M, syllable)),
        "result": vo("vo_result_" + g, result_line),
        "sounds": vo("vo_sounds_" + g, sounds),
    }
    bk = key_of(base_word)
    return {"id": sid, "phase": "tutorial", "eis": "symbolic", "type": "MATRA_BUILD",
            # NO HEADING: the deck gives these two pages no heading section and asks to keep the
            # screen focused; File3's equivalent screens carry none either.
            "prompt_hi": "", "audio": a,
            "data": {"base_word": base_word, "consonant": consonant, "matra": matra,
                     "syllable": syllable, "result_word": result_word,
                     "result_img": pic(rk), "result_emoji": OBJ[rk][1],
                     # ो / ौ come down onto the consonant from above-right
                     "travel": "up",
                     "syl_ms":  _matra_cue_ms(a["onset"], AUDIO_TEXT[a["onset"]], "बनता", 340),
                     "join_ms": _matra_cue_ms(a["result"], AUDIO_TEXT[a["result"]], join_word, 320),
                     "sound_ms": _sound_cues_ms(a["sounds"], 3),
                     "base_img": pic(bk), "base_emoji": BASE_OBJ[base_word][1],
                     "base_img_from": pic(base_img_from) if base_img_from else None,
                     "cap_base": None, "cap_mid": None, "cap_result": cap_result,
                     "no_heading": True}}


def s_pair(sid, words, matra):
    """Pages 4 / 6 — two example words, one at a time (File3's MEET_PAIR). The S04 note keeps a
    heading here: «ओ की मात्रा वाले शब्द पढ़िए।»."""
    M = NAME[matra]
    ex = []
    for w in words:
        k = key_of(w)
        line = "%s — बोलकर देखिए। इसमें %s पर %s की मात्रा लगी है।" % (w, w[0], M)
        vid = vo("vo_meet_" + slug_of(w), line)
        t = AUDIO_TEXT[vid]
        ex.append({"word": w, "matra": matra_of(w), "img": pic(k), "emoji": OBJ[k][1],
                   "audio_line": vid,
                   "pic_ms":   _matra_cue_ms(vid, t, "बोलकर", 520),
                   "matra_ms": _matra_cue_ms(vid, t, "इसमें", 900),
                   "matra_audio": None})
    return {"id": sid, "phase": "tutorial", "eis": "iconic", "type": "MEET_PAIR",
            "prompt_hi": "%s की मात्रा वाले शब्द पढ़िए।" % M,
            "audio": {"prompt": vo("vo_%s_prompt" % sid.lower(),
                                   "आइए, %s की मात्रा वाले कुछ शब्द देखें।" % M)},
            "data": {"examples": ex}}


def s_tap(sid, words, target):
    """Pages 7-9. The deck's ladder, word for word."""
    m = matra_of(target)
    M = NAME[m]
    return {"id": sid, "phase": "guided", "eis": "symbolic", "type": "TRAIN_TAP",
            "prompt_hi": "“%s” की मात्रा वाले शब्द पर टैप कीजिए।" % M,
            "audio": {
                "prompt": once("vo_tap_prompt_" + SLUG[m],
                               "जिस डिब्बे में %s की मात्रा वाला शब्द है, उस डिब्बे पर टैप कीजिए।" % M),
                "hint1": once("vo_tap_h1_" + SLUG[m],
                              "फिर से पढ़िए। %s की मात्रा वाले शब्द पर टैप कीजिए।" % M),
                "hint2": once("vo_tap_h2_" + SLUG[m], "%s की मात्रा वाले शब्द पर टैप कीजिए।" % M),
                "hint3": vo("vo_%s_h3" % sid.lower(),
                            "%s शब्द में %s की मात्रा है। %s पर टैप कीजिए।" % (target, M, target)),
                "correct": vo("vo_%s_correct" % sid.lower(),
                              "शाबाश! %s शब्द में %s की मात्रा है।" % (target, M))},
            "data": {"target": target, "matra": m, "shuffle": False,
                     "h2_keep_marks": True, "hint3_hand": HINT3_HAND["tap"],
                     "coaches": [{"word": w, "correct": (w == target),
                                  "audio": name_clip(w), "matra": matra_of(w)} for w in words]}}


def bins():
    return [{"key": m, "label": NAME[m], "matra": m} for m in (O, AU)]


def sort_card(word, kind):
    k = key_of(word)
    m = matra_of(word)
    M = NAME[m]
    sh = " शब्द" if kind == "word" else ""      # the picture round drops «शब्द» (deck p.13)
    s = slug_of(word)
    return {"bin": m, "word": word, "img": pic(k), "emoji": OBJ[k][1], "audio": name_clip(word),
            "hint3_audio": vo("vo_rev_%s_%s" % (kind, s),
                              "%s%s में %s की मात्रा है। इसे %s वाले डिब्बे में डालिए।" % (word, sh, M, M)),
            "correct_audio": vo("vo_ok_%s_%s" % (kind, s),
                                "शाबाश! %s%s में %s की मात्रा है।" % (word, sh, M))}


def s_demo(sid, words):
    """File3's [r83] watch-only drag-and-drop page, kept (developer, 2026-10-06), with this
    lesson's two anchor words: घोड़ा (page 3) and खिलौना (page 5)."""
    cards = []
    for w in words:
        k = key_of(w)
        m = matra_of(w)
        cards.append({"bin": m, "word": w, "img": pic(k), "emoji": OBJ[k][1],
                      "audio": name_clip(w),
                      "correct_audio": vo("vo_g4d_" + slug_of(w),
                                          "%s में %s की मात्रा है, इसलिए %s %s वाले डिब्बे में गया।"
                                          % (w, NAME[m], w, NAME[m]))})
    return {"id": sid, "phase": "guided", "eis": "iconic", "type": "TRAIN_SORT",
            "prompt_hi": "देखिए, शब्द को सही डिब्बे में कैसे डालते हैं।",
            "audio": {"prompt": vo("vo_g4d_prompt",
                                   "देखिए, शब्द को उसकी मात्रा वाले डिब्बे में कैसे डालते हैं।"),
                      "outro": vo("vo_g4d_end", "अब आप भी ऐसे ही करके देखिए।")},
            "data": {"kind": "word", "bins": bins(), "single": False, "demo": True,
                     "shuffle": False, "cards": cards}}


def s_sort_words(sid, words):
    """Page 10. Hint 2 reads ONLY the dropped word (no coach-label walk)."""
    p = "हर शब्द को उसकी सही मात्रा वाले डिब्बे में डालिए।"
    return {"id": sid, "phase": "guided", "eis": "enactive", "type": "TRAIN_SORT",
            "prompt_hi": p,
            "audio": {"prompt": vo("vo_%s_prompt" % sid.lower(), p),
                      "hint1": vo("vo_%s_h1" % sid.lower(),
                                  "फिर से पढ़िए। इस शब्द को उसकी सही मात्रा वाले डिब्बे में डालिए।"),
                      "hint2": vo("vo_%s_h2" % sid.lower(),
                                  "इस शब्द को उसकी सही मात्रा वाले डिब्बे में डालिए।")},
            "data": {"kind": "word", "bins": bins(), "single": False, "shuffle": False,
                     "h2_read_bins": False, "hint3_hand": HINT3_HAND["sort_words"],
                     "cards": [sort_card(w, "word") for w in words]}}


def s_sort_marks(sid):
    """Page 11. The cards carry NO clip: «Do not announce the matra's name on initial pick-up»."""
    p = "सही मात्रा को सही डिब्बे में डालिए।"
    cards = []
    for m in (AU, O):                     # the deck: "◌ौ and ◌ो, as in the attached screen"
        M = NAME[m]
        cards.append({"bin": m, "word": "◌" + m,
                      "hint3_audio": vo("vo_rev_mark_" + SLUG[m],
                                        "यह %s की मात्रा है। इसे %s वाले डिब्बे में डालिए।" % (M, M)),
                      "correct_audio": vo("vo_ok_mark_" + SLUG[m], "शाबाश! यह %s की मात्रा है।" % M)})
    return {"id": sid, "phase": "guided", "eis": "enactive", "type": "TRAIN_SORT",
            "prompt_hi": p,
            "audio": {"prompt": vo("vo_%s_prompt" % sid.lower(), p),
                      "hint1": vo("vo_%s_h1" % sid.lower(), "फिर से देखिए। " + p),
                      "hint2": vo("vo_%s_h2" % sid.lower(),
                                  "मात्रा का आकार ध्यान से देखिए। इसे सही डिब्बे में डालिए।")},
            "data": {"kind": "matra", "bins": bins(), "single": True, "shuffle": False,
                     "h2_mark_only": True, "hint3_hand": HINT3_HAND["sort_marks"],
                     "cards": cards}}


def s_word_build(sid, slots, options):
    """Page 12. slots = [(word, tail, head)]; options in the SME's order."""
    out = []
    for word, tail, head in slots:
        k = key_of(word)
        s = slug_of(word)
        out.append({"word": word, "head": head, "tail": tail, "matra": matra_of(word),
                    "img": pic(k), "emoji": OBJ[k][1], "name_audio": name_clip(word),
                    "hint3_audio": vo("vo_rev_wb_" + s, "%s लगाने से %s बनता है। %s को खाली जगह में डालिए।"
                                      % (head, word, head)),
                    "correct_audio": vo("vo_ok_wb_" + s, "शाबाश! %s बन गया।" % word)})
    opts = []
    for o in options:
        m = O if O in o else AU
        opts.append({"akshar": o, "matra": m, "audio": vo("vo_ak_" + {
            "मो": "mo", "नौ": "nau", "ढो": "dho", "पौ": "pau", "कौ": "kau"}[o], o)})
    p = "चित्र देखकर सही अक्षर से शब्द पूरा कीजिए।"
    return {"id": sid, "phase": "guided", "eis": "enactive", "type": "WORD_BUILD",
            "prompt_hi": p,
            "audio": {"prompt": once("vo_wb_prompt", p),
                      "hint1": vo("vo_%s_h1" % sid.lower(), "फिर से देखिए। " + p),
                      "hint2": once("vo_wb_prompt", p),
                      # fallback only - every slot carries its own Hint-3 line
                      "hint3": vo("vo_%s_h3_any" % sid.lower(),
                                  "जो अक्षर चमक रहा है, उसे खाली जगह में डालिए।")},
            "data": {"slots": out, "options": opts, "shuffle": False, "h2_akshar": True,
                     "hint3_hand": HINT3_HAND["word_build"]}}


def s_sort_pictures(sid, words):
    """Page 13. Hint 1 plays the picture's name between its two lines; Hint 2 leaves the name
    under the picture until it is placed."""
    p = "चित्र का नाम सुनिए और उसे सही मात्रा वाले डिब्बे में डालिए।"
    return {"id": sid, "phase": "guided", "eis": "enactive", "type": "TRAIN_SORT",
            "prompt_hi": p,
            "audio": {"prompt": vo("vo_%s_prompt" % sid.lower(), p),
                      "hint1": vo("vo_%s_h1" % sid.lower(), "फिर से सुनिए।"),
                      "hint1_tail": vo("vo_%s_h1_tail" % sid.lower(),
                                       "चित्र को सही मात्रा वाले डिब्बे में डालिए।"),
                      "hint2": vo("vo_%s_h2" % sid.lower(),
                                  "मात्रा देखिए। चित्र को सही मात्रा वाले डिब्बे में डालिए।")},
            "data": {"kind": "picture", "bins": bins(), "single": False, "shuffle": False,
                     "h2_keep_word": True, "hint3_hand": HINT3_HAND["sort_pictures"],
                     "cards": [sort_card(w, "picture") for w in words]}}


SC_HEADING = "सही शब्द चुनकर वाक्य पूरा कीजिए।"


def s_sentence(sid, scene, pre, post, answer, options, hint3):
    """Pages 14-16. The prompt, then the sentence read with a pause at the blank."""
    o = []
    for w in options:
        k = key_of(w)
        o.append({"word": w, "img": pic(k), "emoji": OBJ[k][1], "audio": name_clip(w),
                  "sentence_audio": vo("vo_%s_try_%s" % (sid.lower(), slug_of(w)), pre + w + post)})
    p = "चित्र देखकर सही शब्द चुनकर वाक्य पूरा कीजिए।"
    return {"id": sid, "phase": "guided", "eis": "symbolic", "type": "SENTENCE_COMPLETE",
            "prompt_hi": SC_HEADING,
            "audio": {
                "prompt": once("vo_sc_prompt", p + " शब्द को खाली जगह में डालिए।"),
                "sent_pre": vo("vo_%s_sent_a" % sid.lower(), pre.strip()),
                "sent_post": once("vo_%s_sent_b" % sid.lower(), post.strip()),
                "hint1": once("vo_sc_h1", "फिर से देखिए। " + p),
                "hint2": once("vo_sc_h2", p),
                "hint3": vo("vo_%s_h3" % sid.lower(), hint3),
                "correct": vo("vo_%s_correct" % sid.lower(), "शाबाश! " + pre + answer + post)},
            "data": {"scene_img": pic(scene), "scene_emoji": SCENE[scene],
                     "sentence_pre": pre, "sentence_post": post, "answer": answer,
                     "options": o, "shuffle": False, "hint3_hand": HINT3_HAND["sentence"],
                     "scene_glow": SCENE_GLOW.get(scene, [])}}


def build_slides():
    S = []
    # ---- tutorial ·  deck pages 2-6 ----------------------------------------------------
    S.append(s_intro("T1"))
    S.append(s_build("T2", "घड़ा", "घ", O, "घो", "घोड़ा",
                     "अब ड़ा जुड़ने पर, घोड़ा बनता है।", "जुड़ने", "घ। घो। घोड़ा।",
                     "घो + ड़ा = घोड़ा"))
    S.append(s_pair("T3", ["मोर", "कोयल"], O))
    S.append(s_build("T4", "खिलना", "ल", AU, "लौ", "खिलौना",
                     "अब खि, लौ और ना को जोड़ने पर, खिलौना बनता है।", "जोड़ने",
                     "ल। लौ। खिलौना।", "खि + लौ + ना = खिलौना", base_img_from="obj_khilna_bud"))
    S.append(s_pair("T5", ["कौआ", "पौधा"], AU))
    # ---- guided · deck pages 7-16 (the deck moves every test screen into guided) ---------
    S.append(s_tap("G1", ["मोर", "दौड़", "चौक"], "मोर"))
    S.append(s_tap("G2", ["ढोल", "कौआ", "गोल"], "कौआ"))
    S.append(s_tap("G3", ["नौका", "तोता", "कौआ"], "तोता"))
    S.append(s_demo("G4D", ["घोड़ा", "खिलौना"]))
    S.append(s_sort_words("G4", ["पौधा", "ढोल", "कौआ", "तोता"]))
    S.append(s_sort_marks("G5"))
    S.append(s_word_build("G6", [("मोर", "र", "मो"), ("ढोल", "ल", "ढो"), ("पौधा", "धा", "पौ")],
                          ["मो", "नौ", "ढो", "पौ", "कौ"]))
    S.append(s_sort_pictures("G7", ["दौड़", "तोता", "घोड़ा", "हथौड़ा"]))
    S.append(s_sentence("G8", "scn_ped_kaua", "पेड़ पर एक ", " बैठा है।", "कौआ",
                        ["कौआ", "घोड़ा", "मोर"],
                        "चित्र में पेड़ पर एक कौआ बैठा है। कौआ को खाली जगह में डालिए।"))
    S.append(s_sentence("G9", "scn_khel", "बच्चे के पास एक ", " है।", "खिलौना",
                        ["खिलौना", "मोर", "ढोल"],
                        "चित्र में बच्चे के पास एक खिलौना है। खिलौना को खाली जगह में डालिए।"))
    S.append(s_sentence("G10", "scn_hathauda", "आदमी के हाथ में एक ", " है।", "हथौड़ा",
                        ["ढोल", "हथौड़ा", "तोता"],
                        "चित्र में आदमी के हाथ में एक हथौड़ा है। हथौड़ा शब्द को खाली जगह में डालिए।"))
    # ---- the independent round (deck position 21) is not in this build — see the header ----
    recap = "शाबाश! आज हमने सीखा, ओ और औ की मात्रा पहचानना, और मात्रा वाले शब्द पढ़ना।"
    S.append({"id": "CEL", "phase": "practice", "eis": "iconic", "type": "CELEBRATION",
              "prompt_hi": recap, "audio": {"prompt": vo("vo_cel_prompt", recap)}, "data": {}})
    return S


def used_images(slides):
    used = set()
    for s in slides:
        d = s.get("data", {}) or {}
        for k in ("result_img", "base_img", "scene_img", "base_img_from"):
            if d.get(k):
                used.add(d[k])
        for group in ("examples", "cards", "slots", "options"):
            for it in d.get(group, []) or []:
                if isinstance(it, dict) and it.get("img"):
                    used.add(it["img"])
    return used


def build_card(slides):
    vo("vo_landing", "हेलो दोस्त! मैं हूँ स्विफ्टी। आज हम मात्राओं के बारे में जानेंगे।")
    vo("vo_try_again", "एक बार फिर सुनिए।")
    counts = {}
    for s in slides:
        counts[s["phase"]] = counts.get(s["phase"], 0) + 1
    audio = {v: "assets/Audio/%s.ogg" % v for v in sorted(AUDIO_TEXT)}
    for v in COPY_AUDIO:
        audio.setdefault(v, "assets/Audio/%s.ogg" % v)
    image = {k: "assets/Images/%s.png" % k for k in sorted(used_images(slides))}
    emoji = {k: v[1] for k, v in OBJ.items()}
    emoji.update({v[0]: v[1] for v in BASE_OBJ.values()})
    emoji.update(EXTRA_IMG)
    emoji.update(SCENE)
    return {
        "version": "0.1", "skill_code": CODE, "lo_code": "HI02H11_L02",
        "grade": "02", "attribute": "H11", "skill_type": "CORE", "medium": "hi",
        "title": {"hi": "मात्राओं की रेल", "en": "Matra train — the o / au matras"},
        "subtitle_hi": "",
        "theme": "toybox",
        "skill_description_hi": "ओ, औ मात्रा वाले शब्द पढ़ता है। शब्दों में आने वाली मात्रा पहचानता है।",
        "landing_audio": "vo_landing",
        # deck p.1: "1st box: ‘ओ’ (◌ो) · 2nd box: ‘औ’ (◌ौ)", inside two bogies of the painted train
        "landing_hero": {"kind": "matra_train", "matras": [O, AU], "letters": ["ओ", "औ"]},
        "phase_transition_audio": {"tutorial": "vo_pt_tutorial", "guided": "vo_pt_guided",
                                   "practice": "vo_pt_practice"},
        "phase_transition_title": {"tutorial": "चलिए, शुरू करें!", "guided": "चलिए, साथ में करें!",
                                   "practice": "अब आपकी बारी!"},
        "phase_distribution": counts,
        "ui_sfx": {"play": "sfx_play_button", "next": "sfx_next_button"},
        "gate": {"img": "assets/UI/swifty_gate_seek.webp", "talk_at_ms": 1960},
        # the deck's ladder: rung 1 at the 1st miss, 2 at the 2nd, 3 at the 3rd; a win after
        # Hint 3 is silent ("No additional VO is needed"), any earlier win is praised
        "scaffold_rules": {"nudge_timeout_ms": {"guided": 6000, "practice": 8000},
                           "max_attempts": 3, "hint_levels": 3, "hand_on_attempt": 3,
                           "hand_on_hint3": True, "lock_after_hint3": True,
                           "reveal_on_attempt": None, "silent_on_late_correct": True,
                           "silent_from_attempt": 3},
        "signals_expected": ["slide_entered", "slide_completed",
                             "train_tap_first_try", "matra_sort_item", "matra_sort_first_try",
                             "word_build_item", "word_build_first_try",
                             "sentence_complete_first_try",
                             "answer_wrong", "hint_shown",
                             "phase_transition", "mastery_score", "lesson_completed"],
        "_emoji_fallback": emoji,
        "assets": {"audio": audio, "audio_text": AUDIO_TEXT, "image": image,
                   "audio_ext": "ogg", "img_ext": "png"},
        "slides": slides,
    }


# ---------------------------------------------------------------- guards
def guard_engine(src):
    m = VER_RE.search(src)
    if not m:
        sys.exit("X  no ENGINE_VERSION in 4_ENGINE/lesson_template.html")
    for name in TRAIN_MODULES:
        if ("SlideModules." + name + " = {") not in src:
            sys.exit("X  the engine copy is missing %s. Re-run 4_ENGINE/inject_train.py." % name)
    for name in STOCK_MODULES:
        if not (re.search(r'^\s{2}"?' + name + r'"?\s*[:(]', src, re.M)
                or re.search(r'SlideModules\.' + name + r'\s*=', src)):
            sys.exit("X  the engine copy is missing the stock module %s" % name)
    for need, why in (("TRAIN STYLES :: BEGIN", "the train CSS block"),
                      ("dressLandingTrain", "the painted landing train"),
                      ("TrainChrome", "the painted train chrome"),
                      ("_markMaskK", "the per-pixel ो/ौ highlight"),
                      ("silent_from_attempt", "the deck's silent-after-Hint-3 rule"),
                      ("hint3_hand === false", "the per-screen Hint-3 hand switch"),
                      ("d.shuffle === false", "the SME's authored option order"),
                      ("hint1_tail", "the picture round's Hint 1 with the name inside it"),
                      ("base_img_from", "the bud opening into the flower"),
                      ("sent_pre", "the sentence read with a pause at the blank")):
        if need not in src:
            sys.exit("X  engine has no %s. Re-run 4_ENGINE/inject_train.py." % why)
    print("  OK  engine: %s  (4_ENGINE, File3's engine + the S04 additions)" % m.group(1))
    return m.group(1)


def guard_flow(slides):
    want = (["MATRA_PAIRS", "MATRA_BUILD", "MEET_PAIR", "MATRA_BUILD", "MEET_PAIR"]
            + ["TRAIN_TAP"] * 3 + ["TRAIN_SORT"] * 3 + ["WORD_BUILD", "TRAIN_SORT"]
            + ["SENTENCE_COMPLETE"] * 3 + ["CELEBRATION"])
    got = [s["type"] for s in slides]
    if got != want:
        sys.exit("X  flow guard:\n   want %s\n   got  %s" % (want, got))
    print("  OK  flow guard: landing + %d slides (deck order + File3's G4D demo)" % len(slides))


def guard_single_matra():
    bad = []
    for w, m in [(v[0], v[2]) for v in OBJ.values()] + list(TAP_WORDS.items()):
        found = [c for c in w if c in (O, AU)]
        if found != [m]:
            bad.append("%s carries %s, declared %r" % (w, found or "none", m))
    for w in BASE_OBJ:
        if any(c in (O, AU) for c in w):
            bad.append("base word %s already carries the mark" % w)
    if bad:
        sys.exit("X  single-matra rule broken:\n     " + "\n     ".join(bad))
    print("  OK  single-matra rule: every word carries exactly one of ो / ौ")


def guard_sentences(slides):
    bad = []
    for s in slides:
        if s["type"] != "SENTENCE_COMPLETE":
            continue
        d = s["data"]
        words = [o["word"] for o in d["options"]]
        if d["answer"] not in words:
            bad.append("%s: answer not an option" % s["id"])
        if d["answer"] in (d["sentence_pre"] + d["sentence_post"]):
            bad.append("%s: answer pre-printed" % s["id"])
    if bad:
        sys.exit("X  sentence audit:\n     " + "\n     ".join(bad))
    print("  OK  sentence audit: answer is an option and never pre-printed")


def guard_word_build(slides):
    for s in slides:
        if s["type"] != "WORD_BUILD":
            continue
        d = s["data"]
        for sl in d["slots"]:
            hits = [o["akshar"] for o in d["options"] if o["akshar"] + sl["tail"] == sl["word"]]
            if len(hits) != 1:
                sys.exit("X  word-build: %r completed by %s" % (sl["word"], hits))
        dis = [o["akshar"] for o in d["options"]
               if not any(o["akshar"] + sl["tail"] == sl["word"] for sl in d["slots"])]
        print("  OK  word-build: %d coaches, one option each, distractors %s" % (len(d["slots"]), dis))


def guard_prompts(slides):
    bad = [sl["id"] for sl in slides
           if not (sl.get("prompt_hi") or "").strip() and not (sl.get("data") or {}).get("no_heading")]
    if bad:
        sys.exit("X  guard_prompts: empty heading on %s" % bad)
    print("  OK  headings: every slide has one, or opted out (%s)"
          % ", ".join(s["id"] for s in slides if (s.get("data") or {}).get("no_heading")))


BAD_REGISTER = ["करो", "सोचो", "देखो", "डालो", "सुनो", "चुनो", "पढ़ो", "बोलो", "तुम"]


def guard_register(slides, card):
    hits = []
    for where, text in ([("%s (clip)" % v, t) for v, t in AUDIO_TEXT.items()]
                        + [("%s heading" % s["id"], s.get("prompt_hi") or "") for s in slides]):
        if any(re.search(r"(?<![ऀ-ॿ])" + b + r"(?![ऀ-ॿ])", text) for b in BAD_REGISTER):
            hits.append("%s: %s" % (where, text))
        if "छोटी" in text or "बड़ी" in text:
            hits.append("%s: «छोटी/बड़ी» — the deck: never — %s" % (where, text))
    if hits:
        sys.exit("X  register guard:\n     " + "\n     ".join(hits))
    print("  OK  register guard: आप throughout, no छोटी / बड़ी")


GESTURE = {"TRAIN_TAP": "pick", "TRAIN_SORT": "drag", "WORD_BUILD": "drag",
           "SENTENCE_COMPLETE": "drag"}


def guard_pictures(slides, card):
    used = used_images(slides)
    missing = [k for k, p in card["assets"]["image"].items()
               if not os.path.isfile(os.path.join(BUNDLE, p))]
    if missing:
        sys.exit("X  declared images missing from disk: %s" % sorted(missing))
    print("  OK  picture guard: %d images, all declared, all on disk" % len(used))


def guard_audio(slides, card):
    declared = set(card["assets"]["audio"])
    miss, ladders = [], []
    for s in slides:
        d = s.get("data", {}) or {}
        for k, v in (s.get("audio") or {}).items():
            if v and v not in declared:
                miss.append("%s.%s -> %s" % (s["id"], k, v))
        items = (d.get("cards") or []) + (d.get("slots") or [])
        for group in ("cards", "slots", "options", "examples", "pairs", "coaches"):
            for it in d.get(group, []) or []:
                if not isinstance(it, dict):
                    continue
                for k in ("audio", "correct_audio", "audio_line", "hint3_audio", "name_audio",
                          "sentence_audio"):
                    if it.get(k) and it[k] not in declared:
                        miss.append("%s %s.%s -> %s" % (s["id"], group, k, it[k]))
        if s["type"] in GESTURE and not d.get("demo"):
            per_ok = bool(items) and all(c.get("correct_audio") for c in items)
            per_h3 = bool(items) and all(c.get("hint3_audio") for c in items)
            for rung in ("prompt", "hint1", "hint2", "hint3", "correct"):
                if (s.get("audio") or {}).get(rung):
                    continue
                if rung == "correct" and per_ok:
                    continue
                if rung == "hint3" and per_h3:
                    continue
                ladders.append("%s missing %s" % (s["id"], rung))
            if "hint3_hand" not in d:
                ladders.append("%s does not say whether Hint 3 shows the hand" % s["id"])
    if miss:
        sys.exit("X  undeclared audio ids:\n     " + "\n     ".join(miss))
    if ladders:
        sys.exit("X  incomplete ladder:\n     " + "\n     ".join(ladders))
    print("  OK  audio guard: every id declared; every test slide has the 3-rung ladder")


def prune_stale(card):
    """Delete exactly the clips whose TEXT changed since the last build (gen_tts skips ids that
    already have a file, so a changed line would otherwise keep its old recording)."""
    old_path = os.path.join(BUNDLE, "card.json")
    if not os.path.isfile(old_path):
        return [], [], []
    try:
        old = json.load(open(old_path, encoding="utf-8"))
    except Exception:
        return [], [], []
    old_text = (old.get("assets") or {}).get("audio_text") or {}
    new_text = card["assets"]["audio_text"]
    stale, orphan = [], []
    for vid, text in sorted(old_text.items()):
        if vid not in new_text:
            orphan.append(vid)
        elif new_text[vid] != text:
            stale.append(vid)
    for vid in stale + orphan:
        f = os.path.join(AUD_DIR, vid + ".ogg")
        if os.path.isfile(f):
            os.remove(f)
    old_img = set((old.get("assets") or {}).get("image") or {})
    return stale, orphan, sorted(old_img - set(card["assets"]["image"]))


def write_vo_list():
    with open(os.path.join(SPEC_DIR, "VO_RECORDING_LIST.md"), "w", encoding="utf-8") as f:
        f.write("# %s (ओ / औ) · «मात्राओं की रेल» — VO recording list\n\n" % CODE)
        f.write("%d clips. Shown text == spoken text; record exactly this. Register is आप.\n\n"
                % len(AUDIO_TEXT))
        f.write("| clip id | spoken text |\n|---|---|\n")
        for v in sorted(AUDIO_TEXT):
            f.write("| `%s` | %s |\n" % (v, AUDIO_TEXT[v]))
        f.write("\n## Copied, do NOT record\n\n")
        for v in COPY_AUDIO:
            f.write("- `%s`\n" % v)


def check_chrome():
    ui = os.path.join(BUNDLE, "assets", "UI")
    n = len(os.listdir(ui)) if os.path.isdir(ui) else 0
    missing = [v for v in COPY_AUDIO if not os.path.isfile(os.path.join(AUD_DIR, v + ".ogg"))]
    print("  OK  chrome in place: %d UI files, %d/%d fixed clips"
          % (n, len(COPY_AUDIO) - len(missing), len(COPY_AUDIO)))
    if missing:
        print("  !!  fixed clips MISSING: %s" % missing)


LETTER_GLOW_CSS = """
<style id="bundleLetterGlow">
.sg-ex-letter{
  box-shadow:0 0 0 6px rgba(255,206,46,.65),0 0 18px 4px rgba(252,188,24,.50),
             0 12px 28px rgba(11,61,140,.16);
  animation:sgLetterGlow 2.2s ease-in-out infinite;
}
.sg-acell:nth-child(1) .sg-ex-letter{animation-delay:.95s;}
.sg-acell:nth-child(2) .sg-ex-letter{animation-delay:1.40s;}
@keyframes sgLetterGlow{
  0%,100%{box-shadow:0 0 0 6px rgba(255,206,46,.65),0 0 18px 4px rgba(252,188,24,.50),
                     0 12px 28px rgba(11,61,140,.16);}
  50%    {box-shadow:0 0 0 10px rgba(255,206,46,.92),0 0 28px 8px rgba(252,188,24,.70),
                     0 14px 32px rgba(11,61,140,.22);}
}
@media (prefers-reduced-motion:reduce){ .sg-ex-letter{animation:none;} }
</style>
"""


# ---------------------------------------------------------------- the celebration Swiftie (File3 r85)
KIT = os.path.join(HANDOFF, "celebration_kit")
CEL_DIR = os.path.join(BUNDLE, "assets", "UI", "celebration")


def celebration_anim(slides):
    import shutil, filecmp, tempfile, subprocess
    cel = [x for x in slides if x["type"] == "CELEBRATION"]
    vo_id = cel and (cel[0].get("audio") or {}).get("prompt")
    vo_path = vo_id and os.path.join(AUD_DIR, vo_id + ".ogg")
    if not (os.path.isdir(KIT) and vo_path and os.path.isfile(vo_path)):
        print("  !!  celebration Swiftie skipped (kit or %s missing) - the stock mascot stays" % vo_id)
        return None
    meta = json.load(open(os.path.join(KIT, "sheets", "cel_meta.json"), encoding="utf-8"))
    os.makedirs(CEL_DIR, exist_ok=True)
    for sheet in (meta["shabaash"]["src"], meta["talk"]["src"], meta["idle"]["src"]):
        a, b = os.path.join(KIT, "sheets", sheet), os.path.join(CEL_DIR, sheet)
        if not (os.path.isfile(b) and filecmp.cmp(a, b, shallow=False)):
            shutil.copy2(a, b)
    out = os.path.join(tempfile.gettempdir(), "cel_track_%s.json" % CODE)
    subprocess.run([sys.executable, os.path.join(KIT, "make_lipsync.py"), vo_path, "--json", out],
                   check=True, capture_output=True)
    track = json.load(open(out, encoding="utf-8"))
    if "1" not in track["bits"]:
        sys.exit("X  the celebration VO measured silent - no lip-sync track")
    print("  OK  celebration Swiftie: lip-sync track from %s (%d ms)" % (vo_id, track["ms"]))
    return {"base": "assets/UI/celebration/", "vo": vo_id, "meta": meta, "track": track}


def _file3_cel_wrap():
    """The kit's CELEBRATION.mount wrapper, taken verbatim from File3's builder so the two lessons
    run the identical celebration."""
    src = os.path.join(SPEC_DIR, "_cel_wrap.js")
    return open(src, encoding="utf-8").read()


def inject_celebration(html, card):
    if not card.get("end_anim") or 'id="swcKit"' in html:
        return html
    css = open(os.path.join(KIT, "swiftie_celebration.css"), encoding="utf-8").read()
    js = open(os.path.join(KIT, "swiftie_celebration.js"), encoding="utf-8").read()
    html, n1 = re.subn(r"</head>", lambda m: '<style id="swcKitCss">\n' + css + "</style>\n</head>",
                       html, count=1)
    i = html.rfind("</body>")
    if n1 != 1 or i < 0:
        sys.exit("X  could not inject the celebration Swiftie")
    html = html[:i] + '<script id="swcKit">\n' + js + "\n" + _file3_cel_wrap() + "</script>\n" + html[i:]
    print("  OK  celebration Swiftie injected")
    return html


def main():
    argparse.ArgumentParser().parse_args()
    if not os.path.isfile(ENGINE):
        sys.exit("X  no engine at %s" % ENGINE)
    src = open(ENGINE, encoding="utf-8").read()
    ver = guard_engine(src)
    guard_single_matra()
    slides = build_slides()
    guard_flow(slides)
    guard_sentences(slides)
    guard_word_build(slides)
    card = build_card(slides)
    guard_prompts(slides)
    guard_register(slides, card)
    guard_pictures(slides, card)
    guard_audio(slides, card)
    for d in ("assets/Audio", "assets/Images", "assets/UI"):
        os.makedirs(os.path.join(BUNDLE, d), exist_ok=True)
    check_chrome()

    stale, orphan, img_orphan = prune_stale(card)
    if stale or orphan:
        print("  OK  cleared %d stale + %d orphan clip(s) - gen_tts re-records exactly these"
              % (len(stale), len(orphan)))
    if img_orphan:
        print("  !!  images no longer used: %s" % img_orphan)

    card["end_anim"] = celebration_anim(slides)
    if not card["end_anim"]:
        del card["end_anim"]
    payload = json.dumps(card, ensure_ascii=False, indent=1)
    html = CARD_TAG.sub(lambda m: m.group(1) + payload + m.group(3), src, count=1)

    first = [k for k in ("obj_ghoda", "obj_khilona") if k in card["assets"]["image"]]
    links = "".join('<link rel="preload" as="image" fetchpriority="high" '
                    'href="assets/Images/%s.png">' % k for k in first)
    html, n_pre = re.subn(r'(?:<link rel="preload" as="image"[^>]*>)+', links, html, count=1)
    print("  OK  preload retargeted to %s (%d block)" % (first, n_pre))
    if 'id="bundleLetterGlow"' not in html:
        html = re.sub(r"</head>", LETTER_GLOW_CSS + "</head>", html, count=1)
    html = inject_celebration(html, card)

    _h = hashlib.sha1()
    for _f in sorted(os.listdir(AUD_DIR)):
        if _f.endswith(".ogg"):
            _h.update(_f.encode("utf-8"))
            _h.update(open(os.path.join(AUD_DIR, _f), "rb").read())
    html = html.replace("__AUDIO_V_STAMP__", _h.hexdigest()[:12])
    html = html.replace("__MR_AUDIO_V_STAMP__", _h.hexdigest()[:12])
    open(os.path.join(BUNDLE, CODE + ".html"), "w", encoding="utf-8").write(html)
    open(os.path.join(BUNDLE, "card.json"), "w", encoding="utf-8").write(payload + "\n")
    write_vo_list()

    print("  OK  card:   %d slides  %s" % (len(slides), card["phase_distribution"]))
    print("  OK  audio:  %d clips + %d copied" % (len(AUDIO_TEXT), len(COPY_AUDIO)))
    print("  OK  images: %d" % len(card["assets"]["image"]))
    if PENDING_ART:
        print("  !!  ART PENDING: %s" % ", ".join(PENDING_ART))
    gap = [v for v in AUDIO_TEXT if not os.path.isfile(os.path.join(AUD_DIR, v + ".ogg"))]
    if gap:
        print("  !!  VO PENDING (%d of %d): %s" % (len(gap), len(AUDIO_TEXT), " ".join(sorted(gap))))
    print("  OK  html:   %s.html  (engine %s)" % (CODE, ver))


if __name__ == "__main__":
    main()
