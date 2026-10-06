# -*- coding: utf-8 -*-
"""Build HI02H11_L02_S04 (ओ / औ) — «मात्राओं की रेल».

CONTENT ONLY. The flow, the three-rung ladder, the VO templates, the phases and the guards are the
SME's 2026-09-30 review of S03, and live in matra_train_lib.py. This file says which words.

REVIEWED BY THE SME on 2026-10-05 (HI02H11_L02_S04_SME_Review.pptx, their notes in the speaker
notes). Every word below is theirs:

  p.3   घड़ा → घो → घोड़ा, no gloss line («यह शब्द देखिए — घड़ा।» only)
  p.4   मोर, कोयल                       (was मोर, तोता)
  p.5   खिलना → लौ → खिलौना, «अब खि, लौ और ना को जोड़ने पर, खिलौना बनता है।», the bud opening
        into the flower as an animation, «खि + लौ + ना = खिलौना» shown
  p.6   कौआ, पौधा                       (was कौआ, नौका)
  p.7   मोर · दौड़ · चौक → मोर
  p.8   ढोल · कौआ · गोल → कौआ
  p.9   नौका · तोता · कौआ → तोता
  p.10  पौधा · ढोल · कौआ · तोता, picture-and-word cards
  p.12  मोर · ढोल · पौधा from मो नौ ढो पौ कौ
  p.13  दौड़ · तोता · घोड़ा · हथौड़ा
  p.14  पेड़ पर एक कौआ बैठा है।          (कौआ, घोड़ा, मोर)
  p.15  बच्चे के पास एक खिलौना है।        (खिलौना, मोर, ढोल)
  p.16  आदमी के हाथ में एक हथौड़ा है।      (ढोल, हथौड़ा, तोता)
  p.21  the independent round — 12 ओ + 12 औ words, built by the developer (see the handoff).

Their two rulings on my draft:
  * «शब्द» is NOT added before a postposition: «मोर पर टैप कीजिए», «तोता में ओ की मात्रा है»,
    «खिलौना को खाली जगह में डालिए» — `cite_shabd=False`. Kept only where they wrote it (p.16).
  * no «अब» in the tap reveal: «मोर शब्द में ओ की मात्रा है। मोर पर टैप कीजिए।» — `tap_hint3_ab`
    off. It was there because that line truncated on मोर; the asset verifier watches for it.

Run:  PYTHONUTF8=1 py -3.13 build_skill_HI02H11_L02_S04.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from matra_train_lib import Lesson   # noqa: E402

O, AU = "ो", "ौ"

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
    "obj_ghada":    ("घड़ा",    "\U0001F3FA", None),
    "obj_khilna":   ("खिलना",  "\U0001F338", None),
}
SCENE = {
    "scn_ped_kaua": "\U0001F426",
    "scn_khel":     "\U0001F9F8",
    "scn_hathauda": "\U0001F528",
}

L = Lesson(
    code="HI02H11_L02_S04", m1=O, m2=AU, names={O: "ओ", AU: "औ"},
    obj=OBJ, scene=SCENE, sibling="HI02H11_L02_S03",
    title_en="Matra train — the o / au matras",
    skill_hi="ओ, औ मात्रा वाले शब्द पढ़ता है। शब्दों में आने वाली मात्रा पहचानता है।",
    recap="शाबाश! आज हमने सीखा, ओ और औ की मात्रा पहचानना, और मात्रा वाले शब्द पढ़ना।",
    tap_words={"चौक": AU, "गोल": O, "नौका": AU},
    extra_images={"obj_khilna_bud": "\U0001F331"},
    cite_shabd=False,
)

slides = L.standard_flow(
    build1=("घड़ा", "घ", O, "घो", "घोड़ा", "ड़ा", {"cap_result": "घो + ड़ा = घोड़ा"}),
    pair1=["मोर", "कोयल"],
    build2=("खिलना", "ल", AU, "लौ", "खिलौना", "ना",
            {"explain": "अब खि, लौ और ना को जोड़ने पर, खिलौना बनता है।",
             "cap_result": "खि + लौ + ना = खिलौना",
             "base_img_from": "obj_khilna_bud"}),
    pair2=["कौआ", "पौधा"],
    taps=[(["मोर", "दौड़", "चौक"], "मोर"),
          (["ढोल", "कौआ", "गोल"], "कौआ"),
          (["नौका", "तोता", "कौआ"], "तोता")],
    sort_words=["पौधा", "ढोल", "कौआ", "तोता"],
    word_build=([("मोर", "र", "मो"), ("ढोल", "ल", "ढो"), ("पौधा", "धा", "पौ")],
                ["मो", "नौ", "ढो", "पौ", "कौ"]),
    sort_pictures=["दौड़", "तोता", "घोड़ा", "हथौड़ा"],
    sentences=[
        ("पेड़ पर एक ", " बैठा है।", "कौआ", "scn_ped_kaua", ["कौआ", "घोड़ा", "मोर"]),
        ("बच्चे के पास एक ", " है।", "खिलौना", "scn_khel", ["खिलौना", "मोर", "ढोल"]),
        ("आदमी के हाथ में एक ", " है।", "हथौड़ा", "scn_hathauda", ["ढोल", "हथौड़ा", "तोता"],
         {"hint3": "चित्र में आदमी के हाथ में एक हथौड़ा है। हथौड़ा शब्द को खाली जगह में डालिए।"}),
    ],
)

if __name__ == "__main__":
    L.emit(slides)
