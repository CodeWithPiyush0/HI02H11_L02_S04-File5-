# -*- coding: utf-8 -*-
"""Speaker notes for the SME-layout review decks.

Two sources, never mixed:

  carry(reviewed_notes.json, page_order)
      The SME's OWN notes, lifted out of their reviewed deck and re-attached to the page they
      describe after the build has been rebuilt. Verbatim, except for two kinds of noise the deck
      itself introduced: a trailing line that is only the old slide number, and pasted chat
      timestamps ("11:19"). This is how an implemented build is re-presented for sign-off.

  draft(card)
      For a lesson the SME has NOT reviewed yet: notes generated from card.json in the SAME
      section order the SME uses (Heading / On Screen / VO / Hint 1-2-3 / Developer Notes), so
      they open the deck and edit in place instead of writing from nothing. Every note starts with
      a DRAFT banner — generated text must never be mistaken for a signed-off spec.
"""
import json
import re

DRAFT = ("[DRAFT — generated from the card, in the format ratified in the S03 review "
         "(2026-09-30). Not yet reviewed by the SME.]")


def carry(notes_json, page_order):
    """page_order: the SME's page labels in the order the rebuilt deck shows them."""
    raw = {p["page"]: p["notes"] for p in json.load(open(notes_json, encoding="utf-8")) if p["page"]}
    out = {}
    for i, pg in enumerate(page_order, 1):
        lines = [l.rstrip() for l in raw.get(pg, [])]
        lines = [l for l in lines if not re.fullmatch(r"\s*\d{1,3}\s*", l)
                 and not re.fullmatch(r"\s*\d{1,2}:\d{2}\s*", l)]
        while lines and not lines[-1].strip():
            lines.pop()
        if lines:
            out["%02d" % i] = lines
    return out


def _t(card, vid):
    return (card["assets"]["audio_text"] or {}).get(vid, "")


def _q(card, vid):
    t = _t(card, vid)
    return "“%s”" % t if t else "—"


def draft(card):
    out = {}
    out["01"] = [DRAFT, "Recommendation: Landing, मात्राओं की रेल",
                 "On screen", "Show only the two target marks inside the train bogies.",
                 "VO", _q(card, card.get("landing_audio", "vo_landing")),
                 "Navigation", "Enable Start after the introductory VO."]
    for n, s in enumerate(card["slides"], 2):
        a, d, t = s.get("audio") or {}, s.get("data") or {}, s["type"]
        L = [DRAFT, "Recommendation: %s, %s, %s" % (s["id"], t, s["phase"]),
             "Heading / Question Text:", "“%s”" % s.get("prompt_hi", "")]
        hand = "Show a hand nudge on the correct answer." if d.get("hint3_hand") else \
               "No hand — glow and lock only (Ankita's ruling pending)."
        if t == "MATRA_INTRO":
            L += ["VO:", _q(card, a.get("prompt"))]
            L += [_q(card, p["audio"]) for p in d.get("pairs", [])]
            L += ["Show each letter with its mark as a pair, one pair lit at a time. Keep आगे "
                  "disabled until both pairs have been shown and spoken."]
        elif t == "MATRA_BUILD":
            L += ["VO:", _q(card, a.get("prompt")), _q(card, a.get("base")),
                  _q(card, a.get("onset")), _q(card, a.get("explain")),
                  "On Screen:", "%s → %s + ◌%s = %s → %s" % (d["base_word"], d["consonant"], d["matra"],
                                                           d["syllable"], d["result_word"]),
                  "Highlight only the mark in red. Keep the consonant and headline unchanged."]
        elif t == "MEET_PAIR":
            L += ["VO:", _q(card, a.get("prompt"))]
            L += [_q(card, e["audio_line"]) for e in d.get("examples", [])]
            L += ["One example at a time: word, then picture, then the mark glows in red."]
        elif t == "TRAIN_TAP":
            words = [c["word"] for c in d["coaches"]]
            L += ["On Screen:", "Coaches: " + " · ".join(words) + ". No mark highlighted before the answer.",
                  "Instruction VO:", _q(card, a.get("prompt")),
                  "Correct Answer: " + d["target"], "Correct Response VO:", _q(card, a.get("correct")),
                  "Hint 1: Clarify — After the 1st Wrong Attempt",
                  "Shake the selected coach. No highlight, no glow, no hand.", "VO:", _q(card, a.get("hint1")),
                  "Hint 2: Strong Hint — After the 2nd Wrong Attempt",
                  "Read all three words left to right, mark each one's matra in red and keep the marks.",
                  "VO: “%s”" % "। ".join(words) + "।", "Then:", _q(card, a.get("hint2")),
                  "Hint 3: Show the Answer — After the 3rd Wrong Attempt",
                  "Glow %s, lock the other two, wait for the child. %s" % (d["target"], hand),
                  "VO:", _q(card, a.get("hint3")),
                  "Correct Response After Hint 3:", "No additional VO is needed.",
                  "Developer Notes:", "One wrong-attempt counter for the screen. Disable taps while any VO plays."]
        elif t == "TRAIN_SORT":
            kind = d.get("kind")
            L += ["On Screen:",
                  "Coaches: " + " · ".join(b["label"] for b in d["bins"]) +
                  ". Cards in this order: " + " · ".join(c["word"] for c in d["cards"]) +
                  (" (pictures only — no written names)" if kind == "picture" else ""),
                  "Instruction VO:", _q(card, a.get("prompt")),
                  "Correct Response VO — Play Only the Matching Line:"]
            L += [_q(card, c.get("correct")) for c in d["cards"]]
            L += ["Hint 1: Clarify — After the 1st Wrong Drop for That Card",
                  "Shake and return the card. No highlight, no glow, no hand.", "VO:", _q(card, a.get("hint1")),
                  "Hint 2: Strong Hint — After the 2nd Wrong Drop for That Card"]
            if kind == "matra":
                L += ["Do not announce the matra's name. Shape cue only.", "VO:", _q(card, a.get("hint2"))]
            else:
                L += (["Temporarily show the wrongly dropped picture's name and mark its matra, until it is placed."]
                      if kind == "picture" else ["Read only the wrongly dropped word and mark its matra."])
                L += ["Then:", _q(card, a.get("hint2"))]
            L += ["Hint 3: Show the Answer — After the 3rd Wrong Drop for That Card",
                  "Glow the card and its coach, lock the wrong coach, freeze the other cards. " + hand,
                  "VO — Play Only the Matching Line:"]
            L += [_q(card, c.get("reveal")) for c in d["cards"]]
            L += ["Correct Placement After Hint 3:", "No additional VO is needed.",
                  "Completion:", "No extra completion VO is required.",
                  "Developer Notes:", "A separate wrong-attempt counter for each card; a new card starts at zero."]
        elif t == "WORD_BUILD":
            L += ["On Screen:",
                  " · ".join("%s (_%s)" % (x["word"], x["post"]) for x in d["slots"]) +
                  ". Options in this order: " + ", ".join(d["options"]) + ".",
                  "Instruction VO:", _q(card, a.get("prompt")),
                  "Correct Response VO — Play Only the Matching Line:"]
            L += [_q(card, x.get("correct")) for x in d["slots"]]
            L += ["Hint 1: Clarify — After the 1st Wrong Drop", "VO:", _q(card, a.get("hint1")),
                  "Hint 2: Strong Hint — After the 2nd Wrong Drop",
                  "Read only the wrongly dropped अक्षर, enlarge it and mark its matra.",
                  "Then:", _q(card, a.get("hint2")),
                  "Hint 3: Show the Answer — After the 3rd Wrong Drop",
                  "Glow the correct अक्षर and its blank, lock everything else. " + hand]
            L += [_q(card, x.get("reveal")) for x in d["slots"]]
            L += ["Completion:", "No extra completion VO is required.",
                  "Developer Notes:", "A counter per correct अक्षर, plus one per blank for distractor drops."]
        elif t == "SENTENCE_COMPLETE":
            opts = [o["word"] for o in d["options"]]
            L += ["On Screen:", "Sentence: “%s___%s”" % (d["sentence_pre"], d["sentence_post"]),
                  "Options: " + " · ".join(opts),
                  "Instruction VO:", _q(card, a.get("prompt")),
                  "Correct Answer: " + d["answer"], "Correct Response VO:", _q(card, a.get("correct")),
                  "Hint 1: Clarify — After the 1st Wrong Drop", "VO:", _q(card, a.get("hint1")),
                  "Hint 2: Strong Hint — After the 2nd Wrong Drop",
                  "Read the whole sentence with each option previewed in the blank; light the scene.",
                  "VO:"]
            L += [_q(card, o["sent"]) for o in d["options"]]
            L += ["Then:", _q(card, a.get("hint2")),
                  "Hint 3: Show the Answer — After the 3rd Wrong Drop",
                  "Glow %s and the blank, lock the other two. %s" % (d["answer"], hand),
                  "VO:", _q(card, a.get("hint3")),
                  "Developer Notes:", "One wrong-attempt counter for the sentence blank."]
        elif t == "CELEBRATION":
            L = [DRAFT, "CELEBRATION — no text on the page. VO:", _q(card, a.get("prompt"))]
        out["%02d" % n] = L
    return out
