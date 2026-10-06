# -*- coding: utf-8 -*-
"""«मात्राओं की रेल» — the shared lesson builder for the HI02H11_L02 matra-pair skills.

THE FLOW, THE HINT LADDER AND EVERY LINE THE CHILD HEARS LIVE HERE, ONCE.

This file is the SME's page-by-page review of HI02H11_L02_S03 (2026-09-30) turned into code. That
review is the ratified spec for the whole lesson family: "इसी फ्लो और इसी हिंट लॉजिक के हिसाब से हम
आगे की फाइल्स बनाएंगे" — we will build the next files on this flow and this hint logic. A skill's
own builder (build_skill_HI02H11_L02_S0N.py) supplies WORDS and nothing else; if a line of VO or a
hint rule needs to change, it changes here and every lesson gets it.

Why a library and not three copies: the three builders were copies, and so was the hint ladder
inside the engine, which drifted in five of its six copies before anyone noticed (hint_shown never
fired on 8 of 11 screens). Copies drift. This is the same fix applied one layer up.

THE RATIFIED FLOW — 17 screens (landing + 16)
---------------------------------------------
    landing                                  «चलिए, शुरू करें!» gate
    tutorial   MATRA_INTRO                   the two letters and their marks
               MATRA_BUILD   (matra 1)       base word -> consonant + mark -> word
               MEET_PAIR     (matra 1)
               MATRA_BUILD   (matra 2)
               MEET_PAIR     (matra 2)
                                             «चलिए, साथ में करें!» gate
    guided     TRAIN_TAP  x3                 hand at Hint 3
               TRAIN_SORT    words           hand at Hint 3
               TRAIN_SORT    marks           hand at Hint 3
               WORD_BUILD                    NO hand — see HINT3_HAND
               TRAIN_SORT    pictures        NO hand
               SENTENCE_COMPLETE x3          NO hand
                                             «अब आपकी बारी!» gate + the independent round
    independent CELEBRATION

THE PHASE MOVE. Until 2026-09-30 word-build, the picture sort and the sentences were `practice`,
and the «अब आपकी बारी!» gate fired before word-build. The SME moved that gate to after the last
sentence, which makes all ten test screens GUIDED. Round 3 is the independent round that follows
the gate (a runner the app shows, per the deck); in this HTML it is empty, so the engine — which
never gates into a CELEBRATION — shows no round-3 gate. See independent_round_note().

THE HAND. [28f] allows the guiding hand in guided. But the notes of the five screens that moved
still say "Pending confirmation, use glow and lock without a hand" (Ankita's decision). So the hand
is decided per SLIDE — `data.hint3_hand` — not per phase. When Ankita rules, flip HINT3_HAND.
"""
import json
import os
import re
import shutil
import sys

KIT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
FLN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CARD_TAG = re.compile(r'(<script type="application/json" id="cardData">)(.*?)(</script>)', re.S)
VER_RE = re.compile(r'ENGINE_VERSION\s*=\s*["\']([^"\']+)["\']')

TRAIN_MODULES = ["TRAIN_TAP", "TRAIN_SORT", "MATRA_BUILD", "MEET_PAIR", "MATRA_INTRO",
                 "WORD_BUILD", "SENTENCE_COMPLETE"]
TEST_TYPES = ("TRAIN_TAP", "TRAIN_SORT", "MATRA_FILL", "WORD_BUILD", "SENTENCE_COMPLETE")
COPY_AUDIO = ["vo_pt_tutorial", "vo_pt_guided", "vo_pt_practice",
              "sfx_celebrate", "sfx_correct", "sfx_wrong", "sfx_tap", "sfx_pop"]
ALL_MATRAS = set("ािीुूृेैोौंः")

# The ONE switch for the open ruling. Word-build, the picture sort and the sentences all carry
# "Practice-Round Hand Nudge: Confirm with Ankita … Pending confirmation, use glow and lock
# without a hand." Flip a value to True when she rules; nothing else changes.
HINT3_HAND = {"tap": True, "sort_words": True, "sort_marks": True,
              "word_build": False, "sort_pictures": False, "sentence": False}

# The engine hard-codes the gate headlines (PHASE_GATE_TITLE) and ignores the card's copy. These
# are written into the card only so the card stops CLAIMING something else — an earlier build
# carried «चलिए, रेल चलाएँ!», which no child ever saw.
GATE_TITLES = {"tutorial": "चलिए, शुरू करें!", "guided": "चलिए, साथ में करें!",
               "practice": "अब आपकी बारी!", "independent": "अब आपकी बारी!"}

# an em-dash before a short final word truncates this TTS voice (measured 0.73-1.05s against a
# 1.53-2.21s peer median on S02). The comma form reads the same and synthesises reliably.
def _tts_safe(text):
    return re.sub(r"\s*—\s*", ", ", text)


class Lesson:
    """One matra-pair lesson. Construct with the skill's content, call the screen methods in the
    ratified order via `standard_flow`, then `emit()`."""

    def __init__(self, code, m1, m2, names, obj, scene, sibling, title_en, skill_hi,
                 recap, landing_vo=None, fem=(), mark_ring=False, tap_hint3_ab=False,
                 tap_words=None, lesson_notes="", after_marks=(), cite_shabd=True,
                 extra_images=None, pair_line_override=None):
        self.code = code
        self.m1, self.m2 = m1, m2
        self.names = names                     # matra -> the LETTER the child says ("ए")
        self.obj = obj                         # key -> (word, emoji, matra or None)
        self.scene = scene                     # key -> emoji
        self.tap_words = tap_words or {}       # word -> matra, for tap-only words (no picture)
        self.sibling = sibling
        self.title_en, self.skill_hi, self.recap = title_en, skill_hi, recap
        self.landing_vo = landing_vo or "हेलो दोस्त! मैं हूँ स्विफ्टी। आज हम मात्राओं के बारे में जानेंगे।"
        self.fem = set(fem)                    # nouns taking feminine agreement («बन गई»)
        self.mark_ring = mark_ring
        # «अब» before the tap reveal's second clause. Measured need on S04: without it the line
        # truncated on the short word मोर in 9 of 10 attempts. Off unless a lesson needs it.
        self.tap_hint3_ab = tap_hint3_ab
        self.lesson_notes = lesson_notes
        # marks written AFTER their akshara, not on it — the visarga. «इसमें द पर अः की मात्रा»
        # is simply wrong: the two dots follow दु. For these the pair line says «दु के बाद».
        self.after_marks = set(after_marks)
        # «तोता शब्द पर» or «तोता पर»? See cite(). True until the SME rules for a lesson; S04's
        # review (2026-10-05) ruled: «मोर पर टैप कीजिए», «तोता में ओ की मात्रा है», «कौआ को …».
        self.cite_shabd = cite_shabd
        # pictures that are not a word of the lesson — key -> emoji. The bud that opens into the
        # «खिलना» flower (MATRA_BUILD base_img_from).
        self.extra_images = dict(extra_images or {})
        # word -> the whole MEET_PAIR line, for a word the TTS cannot start a line with. Measured
        # 2026-10-05: every line beginning «दुःख,» stopped after that word (17 takes, 5 voices,
        # 0.77-1.21s against a 4.85s peer median); «यह शब्द है दुःख। …» came out whole 2 of 2.
        self.pair_line_override = dict(pair_line_override or {})
        self.audio = {}
        self.bundle = os.path.join(FLN_ROOT, "G2", code)
        self.engine = os.path.join(self.bundle, "engine_local", "lesson_template.html")

    # ------------------------------------------------------------------ primitives
    def vo(self, vid, text):
        text = _tts_safe(text)
        if vid in self.audio and self.audio[vid] != text:
            raise ValueError("clip %s registered twice with different text:\n  %s\n  %s"
                             % (vid, self.audio[vid], text))
        self.audio[vid] = text
        return vid

    def key_of(self, word):
        for k, v in self.obj.items():
            if v[0] == word:
                return k
        return None

    def matra_of(self, word):
        k = self.key_of(word)
        if k:
            m = self.obj[k][2]
        else:
            m = self.tap_words.get(word)
        if m is None:
            sys.exit("X  no target matra known for %r" % word)
        return m

    def slug(self, word):
        k = self.key_of(word)
        if k:
            return k[4:] if k.startswith("obj_") else k
        # tap-only words: a stable ascii id from the code points, so it never collides
        return "w" + "".join("%04x" % ord(c) for c in word)[:24]

    def name_clip(self, word):
        return self.vo("vo_name_" + self.slug(word), word)

    def N(self, m):
        return self.names[m]

    def cite(self, word):
        """The word as a word, safe in front of a postposition.

        The SME's picture-round template drops «शब्द» — «शाबाश! शेर में ए की मात्रा है।» — and
        that is fine for S03, whose picture words (शेर पेड़ गैस पैर) never change form. But a
        masculine noun in -ा takes the OBLIQUE before में / पर / को: «पंखा में» and «तोता पर टैप
        कीजिए» are wrong Hindi. «पंखे में» would be right, and wrong for THIS lesson — the child is
        reading «पंखा» on the card and would hear a different form of it. So words ending in ा
        keep «शब्द», which takes the postposition in their place and leaves the word as written:
        «पंखा शब्द में…», «तोता शब्द पर टैप कीजिए।».

        THE SME CAN OVERRULE THIS, and for S04 did. Shown «तोता शब्द पर», their 2026-10-05 review
        wrote «तोता पर टैप कीजिए», «घोड़ा में ओ की मात्रा है», «खिलौना को खाली जगह में डालिए»
        throughout, and kept «शब्द» only where they wrote it («‘हथौड़ा’ शब्द को…», passed as an
        override). So `cite_shabd=False` uses the word as written. Their text is the spec."""
        if not self.cite_shabd:
            return word
        return word + " शब्द" if word.endswith("ा") else word

    @staticmethod
    def cons(word):
        """the consonant that carries the mark — the first akshara's base letter"""
        return word[0]

    def akshara_before(self, word, mark):
        """the whole akshara the mark follows: दुःख -> दु, प्रातः -> त, छः -> छ"""
        i = word.index(mark)
        j = i - 1
        while j > 0 and not ("क" <= word[j] <= "ह" or "अ" <= word[j] <= "औ"):
            j -= 1
        return word[j:i]

    def _rungs(self, sid, prompt, hint1, hint2, hint3=None, correct=None):
        a = {"prompt": self.vo("vo_%s_prompt" % sid.lower(), prompt),
             "hint1": self.vo("vo_%s_hint1" % sid.lower(), hint1),
             "hint2": self.vo("vo_%s_hint2" % sid.lower(), hint2)}
        if hint3:
            a["hint3"] = self.vo("vo_%s_hint3" % sid.lower(), hint3)
        if correct:
            a["correct"] = self.vo("vo_%s_correct" % sid.lower(), correct)
        return a

    # ------------------------------------------------------------------ tutorial
    def intro(self, sid="T1", pair_lines=None, instruction=None):
        M1, M2 = self.N(self.m1), self.N(self.m2)
        p = "आज हम %s और %s की मात्रा वाले शब्द पढ़ेंगे।" % (M1, M2)
        pl = pair_lines or {self.m1: "यह है %s। इसकी मात्रा देखिए।" % M1,
                            self.m2: "यह है %s। इसकी मात्रा देखिए।" % M2}
        a = {"prompt": self.vo("vo_%s_prompt" % sid.lower(), p)}
        if instruction:
            a["instruction"] = self.vo("vo_%s_instruction" % sid.lower(), instruction)
        mv = {m: self.vo("vo_matra_" + self._mslug(m), "%s की मात्रा" % self.N(m))
              for m in (self.m1, self.m2)}
        return {"id": sid, "phase": "tutorial", "eis": "enactive", "type": "MATRA_INTRO",
                "prompt_hi": p, "audio": a,
                "data": {"pairs": [{"letter": self.N(m), "matra": m,
                                    "audio": self.vo("vo_pair_" + self._mslug(m), pl[m])}
                                   for m in (self.m1, self.m2)],
                         "phonemes": mv, "auto": True}}

    def _mslug(self, m):
        return {"े": "e", "ै": "ai", "ो": "o", "ौ": "au",
                "ं": "anu", "ः": "vis", "ु": "u", "ू": "uu"}.get(m, "m")

    def build(self, sid, base_word, consonant, matra, syllable, result_word, tail,
              base_gloss=None, base_pic=True, cap_result=None, explain=None, base_img_from=None):
        """SME pages 3/5: «यह शब्द देखिए — सब। ये सब बच्चे हैं।» → «स के साथ ए की मात्रा लगाने पर
        ‘से’ बनता है।» → «अब ‘ब’ जुड़ने पर ‘सेब’ बनता है।» The base word carries a picture."""
        M = self.N(matra)
        rk = self.key_of(result_word)
        bk = self.key_of(base_word) if base_pic else None
        base_line = "यह शब्द देखिए, %s।" % base_word + ((" " + base_gloss) if base_gloss else "")
        a = {"prompt": self.vo("vo_%s_prompt" % sid.lower(),
                               "आइए, देखें कि %s की मात्रा लगने से शब्द की आवाज़ कैसे बदलती है।" % M),
             "base": self.vo("vo_base_" + (self.slug(base_word) if bk else sid.lower()), base_line),
             "matra_name": self.vo("vo_matra_" + self._mslug(matra), "%s की मात्रा" % M),
             "onset": self.vo("vo_onset_" + self.slug(result_word),
                              "%s के साथ %s की मात्रा लगाने पर, %s बनता है।" % (consonant, M, syllable)),
             "result": self.name_clip(result_word),
             "explain": self.vo("vo_%s_explain" % sid.lower(),
                                explain or ("अब %s जुड़ने पर, %s बनता है।" % (tail, result_word)))}
        return {"id": sid, "phase": "tutorial", "eis": "symbolic", "type": "MATRA_BUILD",
                "prompt_hi": "%s में %s की मात्रा लगाने पर %s बनता है।" % (base_word, M, result_word),
                "audio": a,
                "data": {"base_word": base_word, "consonant": consonant, "matra": matra,
                         "syllable": syllable, "result_word": result_word,
                         "result_img": rk, "result_emoji": self.obj[rk][1],
                         "base_img": bk, "base_emoji": self.obj[bk][1] if bk else None,
                         "base_img_from": base_img_from,
                         "travel": "down",
                         "cap_base": "यह शब्द देखिए, %s" % base_word,
                         "cap_mid": "%s के साथ %s की मात्रा लगाने पर %s बनता है।"
                                    % (consonant, M, syllable),
                         "cap_result": cap_result or ("%s से बना %s" % (base_word, result_word))}}

    def pair(self, sid, words, matra):
        """SME pages 4/6: «खेल — बोलकर देखिए। इसमें ख पर ए की मात्रा लगी है।»"""
        M = self.N(matra)
        ex = []
        for w in words:
            k = self.key_of(w)
            ex.append({"word": w, "matra": self.matra_of(w), "img": k, "emoji": self.obj[k][1],
                       "audio_line": self.vo("vo_meet_" + self.slug(w),
                                             self.pair_line_override.get(w) or
                                             ("%s — बोलकर देखिए। इसमें %s के बाद %s की मात्रा लगी है।"
                                              % (w, self.akshara_before(w, matra), M))
                                             if matra in self.after_marks else
                                             ("%s — बोलकर देखिए। इसमें %s पर %s की मात्रा लगी है।"
                                              % (w, self.akshara_before(w, matra)[:1], M))),
                       "matra_audio": self.vo("vo_matra_" + self._mslug(matra), "%s की मात्रा" % M)})
        return {"id": sid, "phase": "tutorial", "eis": "iconic", "type": "MEET_PAIR",
                "prompt_hi": "%s की मात्रा वाले शब्द पढ़िए।" % M,
                "audio": {"prompt": self.vo("vo_%s_prompt" % sid.lower(),
                                            "आइए, %s की मात्रा वाले कुछ शब्द देखें।" % M)},
                "data": {"examples": ex}}

    # ------------------------------------------------------------------ guided
    def tap(self, sid, words, target):
        """SME pages 7/8/9. Heading quotes the letter — «“ए” की मात्रा…» — as the SME writes it."""
        m = self.matra_of(target)
        M = self.N(m)
        ab = "अब " if self.tap_hint3_ab else ""
        return {"id": sid, "phase": "guided", "eis": "symbolic", "type": "TRAIN_TAP",
                "prompt_hi": "“%s” की मात्रा वाले शब्द पर टैप कीजिए।" % M,
                "audio": self._rungs(
                    sid,
                    "जिस डिब्बे में %s की मात्रा वाला शब्द है, उस डिब्बे पर टैप कीजिए।" % M,
                    "फिर से पढ़िए। %s की मात्रा वाले शब्द पर टैप कीजिए।" % M,
                    "%s की मात्रा वाले शब्द पर टैप कीजिए।" % M,
                    "%s शब्द में %s की मात्रा है। %s%s पर टैप कीजिए।" % (target, M, ab, self.cite(target)),
                    "शाबाश! %s शब्द में %s की मात्रा है।" % (target, M)),
                "data": {"target": target, "matra": m, "hint3_hand": HINT3_HAND["tap"],
                         "coaches": [{"word": w, "correct": (w == target),
                                      "matra": self.matra_of(w), "audio": self.name_clip(w)}
                                     for w in words]}}

    def _card(self, word, kind):
        k = self.key_of(word)
        m = self.matra_of(word)
        M = self.N(m)
        # the picture round drops «शब्द» (SME p.13) — except where the word would then need an
        # oblique form it does not have on the card (see cite())
        sh = " शब्द" if (kind != "picture" or (self.cite_shabd and word.endswith("ा"))) else ""
        return {"bin": m, "word": word, "img": k, "emoji": self.obj[k][1] if k else None,
                "audio": self.name_clip(word),
                "reveal": self.vo("vo_rev_%s_%s" % (kind, self.slug(word)),
                                  "%s%s में %s की मात्रा है। इसे %s वाले डिब्बे में डालिए।"
                                  % (word, sh, M, M)),
                "correct": self.vo("vo_ok_%s_%s" % (kind, self.slug(word)),
                                   "शाबाश! %s%s में %s की मात्रा है।" % (word, sh, M))}

    def sort_words(self, sid, words):
        """SME page 10. Authored order, per-card praise, NO completion VO."""
        p = "हर शब्द को उसकी सही मात्रा वाले डिब्बे में डालिए।"
        return {"id": sid, "phase": "guided", "eis": "enactive", "type": "TRAIN_SORT",
                "prompt_hi": p,
                "audio": self._rungs(sid, p,
                                     "फिर से पढ़िए। इस शब्द को उसकी सही मात्रा वाले डिब्बे में डालिए।",
                                     "इस शब्द को उसकी सही मात्रा वाले डिब्बे में डालिए।"),
                "data": {"kind": "word", "shuffle": False,
                         "hint3_hand": HINT3_HAND["sort_words"],
                         "bins": [{"key": b, "label": self.N(b)} for b in (self.m1, self.m2)],
                         "cards": [self._card(w, "word") for w in words]}}

    def sort_marks(self, sid, order=None):
        """SME page 11. Hint 2 does NOT name the mark — the module enforces that."""
        p = "सही मात्रा को सही डिब्बे में डालिए।"
        cards = []
        for m in (order or (self.m2, self.m1)):       # SME: "◌ै and ◌े, as in the attached screen"
            M = self.N(m)
            cards.append({"bin": m, "word": "◌" + m, "img": None, "emoji": None,
                          "audio": self.vo("vo_matra_" + self._mslug(m), "%s की मात्रा" % M),
                          "reveal": self.vo("vo_rev_mark_" + self._mslug(m),
                                            "यह %s की मात्रा है। इसे %s वाले डिब्बे में डालिए।" % (M, M)),
                          "correct": self.vo("vo_ok_mark_" + self._mslug(m),
                                             "शाबाश! यह %s की मात्रा है।" % M)})
        return {"id": sid, "phase": "guided", "eis": "enactive", "type": "TRAIN_SORT",
                "prompt_hi": p,
                "audio": self._rungs(sid, p, "फिर से देखिए। " + p,
                                     "मात्रा का आकार ध्यान से देखिए। इसे सही डिब्बे में डालिए।"),
                "data": {"kind": "matra", "shuffle": False,
                         "hint3_hand": HINT3_HAND["sort_marks"],
                         "bins": [{"key": b, "label": self.N(b)} for b in (self.m1, self.m2)],
                         "cards": cards}}

    def word_build(self, sid, slots, options):
        """SME page 12. slots = [(word, post, answer)]; options in the SME's authored order."""
        out = []
        for word, post, answer in slots:
            k = self.key_of(word)
            f = word in self.fem
            out.append({"word": word, "post": post, "answer": answer, "matra": self.matra_of(word),
                        "img": k, "emoji": self.obj[k][1], "audio": self.name_clip(word),
                        "reveal": self.vo("vo_rev_wb_" + self.slug(word),
                                          "%s लगाने से %s %s। %s को खाली जगह में डालिए।"
                                          % (answer, word, "बनती है" if f else "बनता है", answer)),
                        "correct": self.vo("vo_ok_wb_" + self.slug(word),
                                           "शाबाश! %s बन %s।" % (word, "गई" if f else "गया"))})
        p = "चित्र देखकर सही अक्षर से शब्द पूरा कीजिए।"
        return {"id": sid, "phase": "guided", "eis": "enactive", "type": "WORD_BUILD",
                "prompt_hi": p,
                "audio": self._rungs(sid, p, "फिर से देखिए। " + p, p),
                "data": {"slots": out, "options": list(options), "shuffle": False,
                         "hint3_hand": HINT3_HAND["word_build"],
                         "option_audio": {o: self.vo("vo_akshara_%d" % i, o)
                                          for i, o in enumerate(options)}}}

    def sort_pictures(self, sid, words):
        """SME page 13. Pictures only; Hint 2 shows the missed card's name until it is placed."""
        p = "चित्र का नाम सुनिए और उसे सही मात्रा वाले डिब्बे में डालिए।"
        return {"id": sid, "phase": "guided", "eis": "enactive", "type": "TRAIN_SORT",
                "prompt_hi": p,
                "audio": dict(self._rungs(sid, p, "फिर से सुनिए।",
                                          "मात्रा देखिए। चित्र को सही मात्रा वाले डिब्बे में डालिए।"),
                              # SME p.13 Hint 1: «फिर से सुनिए।» — "Play the current picture's name,
                              # then:" — «चित्र को…». The module plays hint1, the name, hint1_tail.
                              hint1_tail=self.vo("vo_%s_hint1_tail" % sid.lower(),
                                                 "चित्र को सही मात्रा वाले डिब्बे में डालिए।")),
                "data": {"kind": "picture", "shuffle": False,
                         "hint3_hand": HINT3_HAND["sort_pictures"],
                         "bins": [{"key": b, "label": self.N(b)} for b in (self.m1, self.m2)],
                         "cards": [self._card(w, "picture") for w in words]}}

    def sentence(self, sid, pre, post, answer, scene, options, hint3=None):
        """SME pages 14/16/17. Hint 2 reads the WHOLE sentence with each option in the blank."""
        p = "चित्र देखकर सही शब्द चुनकर वाक्य पूरा कीजिए।"
        opts = []
        for w in options:
            k = self.key_of(w)
            opts.append({"word": w, "img": k, "emoji": self.obj[k][1], "audio": self.name_clip(w),
                         "sent": self.vo("vo_sent_%s_%s" % (sid.lower(), self.slug(w)),
                                         pre + w + post)})
        return {"id": sid, "phase": "guided", "eis": "symbolic", "type": "SENTENCE_COMPLETE",
                "prompt_hi": "सही शब्द चुनकर वाक्य पूरा कीजिए।",
                "audio": self._rungs(
                    sid, p + " शब्द को खाली जगह में डालिए।", "फिर से देखिए। " + p, p,
                    hint3 or ("चित्र में %s%s%s %s को खाली जगह में डालिए।"
                              % (pre, answer, post, self.cite(answer))),
                    "शाबाश! %s%s%s" % (pre, answer, post)),
                "data": {"sentence_pre": pre, "sentence_post": post, "answer": answer,
                         "matra": self.matra_of(answer), "hint3_hand": HINT3_HAND["sentence"],
                         "scene_img": scene, "scene_emoji": self.scene[scene], "options": opts}}

    def celebration(self):
        return {"id": "CEL", "phase": "independent", "eis": "iconic", "type": "CELEBRATION",
                "prompt_hi": self.recap,
                "audio": {"prompt": self.vo("vo_cel_prompt", self.recap)}, "data": {}}

    # ------------------------------------------------------------------ the whole flow
    def standard_flow(self, build1, pair1, build2, pair2, taps, sort_words, word_build,
                      sort_pictures, sentences, sort_marks_order=None, intro_kw=None):
        """The SME-ratified 17-screen order. Every argument is CONTENT; the order is not."""
        S = [self.intro(**(intro_kw or {})),
             self.build("T2", *build1[:6], **(build1[6] if len(build1) > 6 else {})),
             self.pair("T3", pair1, self.m1),
             self.build("T4", *build2[:6], **(build2[6] if len(build2) > 6 else {})),
             self.pair("T5", pair2, self.m2)]
        for i, (words, target) in enumerate(taps, start=1):
            S.append(self.tap("G%d" % i, words, target))
        S.append(self.sort_words("G4", sort_words))
        S.append(self.sort_marks("G5", sort_marks_order))
        S.append(self.word_build("G6", *word_build))
        S.append(self.sort_pictures("G7", sort_pictures))
        for i, sn in enumerate(sentences, start=8):
            S.append(self.sentence("G%d" % i, *sn[:5], **(sn[5] if len(sn) > 5 else {})))
        S.append(self.celebration())
        return S

    # ------------------------------------------------------------------ card
    def card(self, slides):
        self.vo("vo_landing", self.landing_vo)
        self.vo("vo_try_again", "एक बार फिर सुनिए।")
        counts = {}
        for s in slides:
            counts[s["phase"]] = counts.get(s["phase"], 0) + 1
        audio = {v: "assets/Audio/%s.ogg" % v for v in sorted(self.audio)}
        for v in COPY_AUDIO:
            audio.setdefault(v, "assets/Audio/%s.ogg" % v)
        image = {k: "assets/Images/%s.png" % k
                 for k in sorted(list(self.obj) + list(self.scene) + list(self.extra_images))}
        M1, M2 = self.N(self.m1), self.N(self.m2)
        rules = {"nudge_timeout_ms": {"guided": 6000, "practice": 8000},
                 "idle_hint_ms": 9000, "max_attempts": 3, "hand_on_attempt": 3,
                 "reveal_on_attempt": 3, "silent_after_reveal": True}
        if self.mark_ring:
            rules["mark_ring"] = True
        return {
            "version": "0.1", "skill_code": self.code, "lo_code": "HI02H11_L02",
            "grade": "02", "attribute": "H11", "skill_type": "CORE", "medium": "hi",
            "title": {"hi": "मात्राओं की रेल", "en": self.title_en}, "subtitle_hi": "",
            "theme": "toybox", "skill_description_hi": self.skill_hi,
            "landing_audio": "vo_landing",
            # the SME's landing: the two marks riding in two train bogies (renderTrainLanding)
            "landing_hero": {"kind": "train", "cells": [
                {"type": "letter", "letter": "◌" + self.m1, "label": M1},
                {"type": "letter", "letter": "◌" + self.m2, "label": M2}]},
            "phase_transition_audio": {"tutorial": "vo_pt_tutorial", "guided": "vo_pt_guided",
                                       "practice": "vo_pt_practice"},
            "phase_transition_title": dict(GATE_TITLES),
            "phase_distribution": counts,
            "scaffold_rules": rules,
            "signals_expected": ["slide_entered", "slide_completed", "train_tap_first_try",
                                 "matra_sort_item", "matra_sort_first_try", "word_build_item",
                                 "word_build_first_try", "sentence_complete", "answer_wrong",
                                 "hint_shown", "idle_cue", "phase_transition", "mastery_score",
                                 "lesson_completed"],
            "_emoji_fallback": dict({k: v[1] for k, v in self.obj.items()}, **self.scene,
                                    **self.extra_images),
            "assets": {"audio": audio, "audio_text": dict(self.audio), "image": image,
                       "audio_ext": "ogg", "img_ext": "png"},
            "slides": slides}

    # ------------------------------------------------------------------ guards
    def guard_engine(self, src):
        m = VER_RE.search(src)
        if not m:
            sys.exit("X  no ENGINE_VERSION in engine_local")
        for name in TRAIN_MODULES:
            if ("SlideModules." + name + " = {") not in src:
                sys.exit("X  engine_local is missing %s — re-run engine_local/inject_train.py" % name)
        for need, why in (("_markMask", "the per-pixel highlight (a box clip reddens 37-42% of the "
                                        "consonant under ो/ौ)"),
                          ("function revealHand(", "the per-slide Hint-3 hand switch"),
                          ("function sayLocked(", "the per-item praise under an input lock"),
                          ("d.shuffle === false", "the SME's authored card order"),
                          ("function renderTrainLanding(", "the train landing"),
                          ("hooks.hint1Name", "the picture round's Hint 1 with the name inside it "
                                              "(«फिर से सुनिए।» + name + «चित्र को…»)"),
                          ("d.base_img_from", "the base picture shown as an action (bud → flower)")):
            if need not in src:
                sys.exit("X  engine_local has no %s. Re-run engine_local/inject_train.py." % why)
        print("  OK  engine: %s  (per-game engine_local, shared train modules)" % m.group(1))
        return m.group(1)

    def guard_target_matra(self):
        extra = []
        for k, (w, _e, m) in self.obj.items():
            t = [c for c in w if c in (self.m1, self.m2)]
            if m is None:
                if t:
                    sys.exit("X  matra guard: base word %r already carries %r" % (w, t[0]))
                continue
            if len(t) != 1 or t[0] != m:
                sys.exit("X  matra guard: %r carries %r, expected exactly one %r"
                         % (w, "".join(t) or "none", m))
            o = [c for c in w if c in ALL_MATRAS and c not in (self.m1, self.m2)]
            if o:
                extra.append((w, "".join(o)))
        for w, m in self.tap_words.items():
            t = [c for c in w if c in (self.m1, self.m2)]
            if len(t) != 1 or t[0] != m:
                sys.exit("X  matra guard: tap word %r carries %r, expected one %r" % (w, t, m))
        print("  OK  matra guard: every word carries exactly one of %s/%s"
              % (self.N(self.m1), self.N(self.m2)))
        if extra:
            print("      relaxed rule (SME ruling, S03 review) — non-target mark stays uncoloured: "
                  + ", ".join("%s(+%s)" % x for x in extra))

    def guard_flow(self, slides):
        want = (["MATRA_INTRO", "MATRA_BUILD", "MEET_PAIR", "MATRA_BUILD", "MEET_PAIR"]
                + ["TRAIN_TAP"] * 3 + ["TRAIN_SORT", "TRAIN_SORT", "WORD_BUILD", "TRAIN_SORT"]
                + ["SENTENCE_COMPLETE"] * 3 + ["CELEBRATION"])
        got = [s["type"] for s in slides]
        if got != want:
            sys.exit("X  flow guard:\n   got      %s\n   expected %s" % (got, want))
        ph = [s["phase"] for s in slides]
        if ph != ["tutorial"] * 5 + ["guided"] * 10 + ["independent"]:
            sys.exit("X  flow guard: phases are %s — the SME's 2026-09-30 placement puts all ten "
                     "test screens in guided, after «चलिए, साथ में करें!»" % ph)
        print("  OK  flow guard: 17 screens — tutorial 5 · guided 10 · independent 1 "
              "(the SME's 2026-09-30 gate positions)")

    def guard_prompts(self, slides):
        for s in slides:
            if not (s.get("prompt_hi") or "").strip():
                sys.exit("X  prompt guard: %s has no heading" % s["id"])
        print("  OK  prompt guard: %d/%d slides carry heading text" % (len(slides), len(slides)))

    def guard_register(self, slides):
        bad_tum = ["करो", "देखो", "सुनो", "बताओ", "डालो", "चुनो", "सोचो", "पढ़ो", "तुम"]
        texts = list(self.audio.values()) + [s.get("prompt_hi", "") for s in slides]
        for t in texts:
            for b in bad_tum:
                if re.search(r"(?<![ऀ-ॿ])" + b + r"(?![ऀ-ॿ])", t):
                    sys.exit("X  register guard: %r is a तुम form.\n     in: %s" % (b, t))
            for b in ("छोटी", "बड़ी"):
                if b in t:
                    sys.exit("X  register guard: %r appears — the SME: never छोटी/बड़ी.\n     in: %s"
                             % (b, t))
        print("  OK  register guard: आप throughout, no छोटी/बड़ी (%d clips)" % len(self.audio))

    def guard_hints(self, src, slides, card):
        """Three rungs everywhere; per-item praise and reveal on the multi-item screens; the hand
        exactly where the notes put it. Invisible in a click-through that never fails 3 times."""
        for bind in ("dataset.reveal", "dataset.sent", "dataset.correct"):
            if bind not in src:
                sys.exit("X  hint guard: no module binds %s" % bind)
        body = src[src.index("function makeHints("):]
        if body[body.index("SlideModules."):].count('A(slide, "hint1")'):
            sys.exit("X  hint guard: a module plays hint1 directly — the ladder has forked again")
        for s in slides:
            if s["type"] not in TEST_TYPES:
                continue
            a, d = s.get("audio") or {}, s.get("data") or {}
            for need in ("prompt", "hint1", "hint2"):
                if not a.get(need):
                    sys.exit("X  hint guard: %s has no %s" % (s["id"], need))
            multi = s["type"] in ("TRAIN_SORT", "WORD_BUILD")
            items = d.get("cards") or d.get("slots") or []
            if multi:
                if a.get("correct"):
                    sys.exit("X  hint guard: %s has a screen-level praise clip. The SME: "
                             "\"Completion: No extra completion VO is required.\"" % s["id"])
                for it in items:
                    for k in ("reveal", "correct"):
                        if not it.get(k):
                            sys.exit("X  hint guard: %s item %r has no %s clip — \"Play Only the "
                                     "Matching Line\"" % (s["id"], it.get("word"), k))
            else:
                for need in ("hint3", "correct"):
                    if not a.get(need):
                        sys.exit("X  hint guard: %s has no %s" % (s["id"], need))
            if s["type"] == "SENTENCE_COMPLETE":
                for o in d["options"]:
                    if not o.get("sent"):
                        sys.exit("X  hint guard: %s option %r has no sentence clip" % (s["id"], o["word"]))
            if "hint3_hand" not in d:
                sys.exit("X  hint guard: %s does not say whether Hint 3 shows the hand" % s["id"])
        hand = [s["id"] for s in slides if (s.get("data") or {}).get("hint3_hand")]
        nohand = [s["id"] for s in slides if (s.get("data") or {}).get("hint3_hand") is False]
        print("  OK  hint guard: 3 rungs; per-item praise + reveal; hand at Hint 3 on %s; "
              "glow+lock only on %s (Ankita's ruling pending)" % (",".join(hand), ",".join(nohand)))

    def guard_pictures(self, slides, card):
        declared, used = set(card["assets"]["image"]), set()
        for s in slides:
            d = s.get("data") or {}
            for k in ("result_img", "base_img", "scene_img", "base_img_from"):
                if d.get(k):
                    used.add(d[k])
            for lst in ("examples", "cards", "slots", "options"):
                for it in (d.get(lst) or []):
                    if isinstance(it, dict) and it.get("img"):
                        used.add(it["img"])
        if used - declared:
            sys.exit("X  picture guard: used but not declared: %s" % sorted(used - declared))
        if declared - used:
            sys.exit("X  picture guard: declared but never used: %s" % sorted(declared - used))
        print("  OK  picture guard: %d images, all declared and all used" % len(declared))

    def guard_audio(self, slides, card):
        declared = set(card["assets"]["audio"])
        for s in slides:
            for k, v in (s.get("audio") or {}).items():
                if isinstance(v, str) and v not in declared:
                    sys.exit("X  audio guard: %s/%s -> %r not declared" % (s["id"], k, v))
            d = s.get("data") or {}
            for lst in ("examples", "cards", "slots", "options", "pairs"):
                for it in (d.get(lst) or []):
                    if isinstance(it, dict):
                        for kk in ("audio", "audio_line", "matra_audio", "reveal", "sent", "correct"):
                            if it.get(kk) and it[kk] not in declared:
                                sys.exit("X  audio guard: %s %s -> %r not declared" % (s["id"], kk, it[kk]))
        print("  OK  audio guard: every id declared (%d clips)" % len(declared))

    # ------------------------------------------------------------------ stale audio
    def quarantine_stale_audio(self):
        """A clip whose TEXT changed but whose ID did not would keep its old recording for ever:
        gen_tts.py skips any id whose file exists. So compare against the last build's script and
        move every changed id's recording aside, so the next TTS run re-records exactly those."""
        script = os.path.join(self.bundle, "_vo_script.json")
        adir = os.path.join(self.bundle, "assets", "Audio")
        old = None
        if os.path.exists(script):
            old = json.load(open(script, encoding="utf-8"))
        else:
            # A bundle built before this library never wrote _vo_script.json — S03 did not, and
            # the first run of this library silently skipped the whole check, leaving 48 old
            # recordings under ids whose text had changed. Fall back to the card's own
            # audio_text, which is why emit() calls this BEFORE card.json is overwritten.
            cj = os.path.join(self.bundle, "card.json")
            if os.path.exists(cj):
                try:
                    old = json.load(open(cj, encoding="utf-8"))["assets"]["audio_text"]
                except Exception:
                    old = None
        if old is None:
            # no record of what any clip says: nothing can be trusted, so nothing is kept
            old = {}
            print("  !!  no record of the previous VO text — every existing recording is treated as stale")
            for fn in (os.listdir(adir) if os.path.isdir(adir) else []):
                if fn.endswith(".ogg") and fn[:-4] not in COPY_AUDIO:
                    old[fn[:-4]] = None
        moved = []
        qdir = os.path.join(self.bundle, "_quarantine", "stale_audio")
        for vid, text in self.audio.items():
            f = os.path.join(adir, vid + ".ogg")
            if vid in old and old[vid] != text and os.path.exists(f):
                os.makedirs(qdir, exist_ok=True)
                shutil.move(f, os.path.join(qdir, vid + ".ogg"))
                moved.append(vid)
        # clips the lesson no longer uses at all: out of the bundle, into quarantine
        for fn in (os.listdir(adir) if os.path.isdir(adir) else []):
            vid = fn.rsplit(".", 1)[0]
            if fn.endswith(".ogg") and vid not in self.audio and vid not in COPY_AUDIO:
                os.makedirs(qdir, exist_ok=True)
                shutil.move(os.path.join(adir, fn), os.path.join(qdir, fn))
                moved.append(vid + " (unused)")
        return moved

    def quarantine_unused_images(self):
        idir = os.path.join(self.bundle, "assets", "Images")
        keep = set(self.obj) | set(self.scene) | set(self.extra_images)
        moved = []
        for fn in (os.listdir(idir) if os.path.isdir(idir) else []):
            if fn.endswith(".png") and fn[:-4] not in keep:
                q = os.path.join(self.bundle, "_quarantine", "unused_images")
                os.makedirs(q, exist_ok=True)
                shutil.move(os.path.join(idir, fn), os.path.join(q, fn))
                moved.append(fn[:-4])
        return moved

    # ------------------------------------------------------------------ emit
    def emit(self, slides):
        if not os.path.exists(self.engine):
            sys.exit("X  no engine_local/lesson_template.html")
        src = open(self.engine, encoding="utf-8").read()
        ver = self.guard_engine(src)
        self.guard_target_matra()
        self.guard_flow(slides)
        self.guard_prompts(slides)
        self.guard_register(slides)
        card = self.card(slides)
        self.guard_pictures(slides, card)
        self.guard_hints(src, slides, card)
        self.guard_audio(slides, card)

        for sub in ("UI", "Audio", "Images"):
            os.makedirs(os.path.join(self.bundle, "assets", sub), exist_ok=True)
        sib = os.path.join(FLN_ROOT, "G2", self.sibling)
        for v in COPY_AUDIO:
            s_ = os.path.join(sib, "assets", "Audio", v + ".ogg")
            d_ = os.path.join(self.bundle, "assets", "Audio", v + ".ogg")
            if os.path.exists(s_) and not os.path.exists(d_):
                shutil.copy2(s_, d_)

        stale = self.quarantine_stale_audio()
        gone = self.quarantine_unused_images()

        with open(os.path.join(self.bundle, "card.json"), "w", encoding="utf-8") as f:
            json.dump(card, f, ensure_ascii=False, indent=2)
        payload = json.dumps(card, ensure_ascii=False, indent=2)
        out = CARD_TAG.sub(lambda m: m.group(1) + "\n" + payload + "\n" + m.group(3), src, count=1)
        with open(os.path.join(self.bundle, self.code + ".html"), "w", encoding="utf-8") as f:
            f.write(out)
        with open(os.path.join(self.bundle, "_vo_script.json"), "w", encoding="utf-8") as f:
            json.dump(self.audio, f, ensure_ascii=False, indent=2)

        have = sum(1 for v in self.audio
                   if os.path.exists(os.path.join(self.bundle, "assets", "Audio", v + ".ogg")))
        allimg = list(self.obj) + list(self.scene) + list(self.extra_images)
        imgs = sum(1 for k in allimg
                   if os.path.exists(os.path.join(self.bundle, "assets", "Images", k + ".png")))
        print("  OK  card:   %d slides  %s" % (len(slides), card["phase_distribution"]))
        print("  %s  audio:  %d/%d recorded%s" % ("OK" if have == len(self.audio) else "..",
                                                  have, len(self.audio),
                                                  ("  — %d stale/unused quarantined" % len(stale)) if stale else ""))
        print("  %s  images: %d/%d present%s" % ("OK" if imgs == len(allimg) else "..",
                                                 imgs, len(allimg),
                                                 ("  — quarantined unused: %s" % ", ".join(gone)) if gone else ""))
        print("  OK  html:   %s.html  (engine %s)" % (self.code, ver))
        return card, stale
