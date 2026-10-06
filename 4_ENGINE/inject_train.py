# -*- coding: utf-8 -*-
"""Inject the train module set + styles into this bundle's engine_local copy.

Run from anywhere:  PYTHONUTF8=1 py -3.13 engine_local/inject_train.py
Then RE-RUN THE BUILDER — the served HTML is generated from this template, so
patching the template alone leaves the game running the old code.

Idempotent: re-running replaces the previously injected block rather than stacking copies, so
iterating on the modules never leaves two definitions fighting each other.
"""
import io, os, re, sys

ENGINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lesson_template.html")
SCRATCH = os.path.dirname(os.path.abspath(__file__))   # sources sit beside this script

JS_BEGIN  = "/* == TRAIN MODULE SET :: BEGIN (engine_local, HI02H11_L02_S02) == */"
JS_END    = "/* == TRAIN MODULE SET :: END == */"
CSS_BEGIN = "/* == TRAIN STYLES :: BEGIN (engine_local, HI02H11_L02_S02) == */"
CSS_END   = "/* == TRAIN STYLES :: END == */"

js  = io.open(os.path.join(SCRATCH, "train_modules.js"), encoding="utf-8").read()
css = io.open(os.path.join(SCRATCH, "train_styles.css"), encoding="utf-8").read()
src = io.open(ENGINE, encoding="utf-8").read()

# ---- closing-tag guard ---------------------------------------------------------------------
# A literal </style> or </script> anywhere in these sources -- INCLUDING INSIDE A COMMENT --
# ends the host element at that point, and everything after it becomes body text. It builds
# clean, the receipt stays green, and the page silently comes apart: on 2026-09-23 exactly this
# comment...
#     "This block is injected before the last </style>, so it is later ..."
# ...pushed the entire stage to x=1797 behind a run of stray CSS text, killed position:fixed on
# the new sky layers, and made the start button unclickable. Half an hour to find, one line to
# catch. Write the tag with a break in it (</sty" + "le>) if a comment must mention it.
for _name, _txt, _bad in (("train_styles.css", css, "</style>"),
                          ("train_modules.js", js,  "</script>")):
    if _bad in _txt:
        _ln = _txt[:_txt.find(_bad)].count("\n") + 1
        sys.exit("X  %s line %d contains a literal %s -- it would truncate the host element.\n"
                 "   Break the tag up, even in a comment." % (_name, _ln, _bad))


# ---- strip any previous injection (idempotent re-run)
def strip(s, a, b, pre="", post=""):
    """Take the previous block out AND the padding it was put in with.
    [r68] It used to take only the markers and what lay between them, so the newlines the insert
    below wraps round the block stayed behind - three more blank lines in the engine on every
    rebuild, measured as +12 and +18 blank lines after half a dozen runs."""
    i, j = s.find(a), s.find(b)
    if i >= 0 and j > i:
        j += len(b)
        if pre and s[max(0, i - len(pre)):i] == pre:
            i -= len(pre)
        if post and s[j:j + len(post)] == post:
            j += len(post)
        return s[:i] + s[j:]
    return s
src = strip(src, JS_BEGIN, JS_END, "\n\n", "\n")
src = strip(src, CSS_BEGIN, CSS_END, "\n", "\n")

# ---- JS: after the LAST SlideModules alias, so SlideModules exists and nothing shadows us
aliases = list(re.finditer(r"SlideModules\.[A-Z_0-9]+\s*=\s*SlideModules\.[A-Z_0-9]+;", src))
if not aliases:
    sys.exit("X  no SlideModules aliases found — cannot locate the injection point")
at = aliases[-1].end()
src = src[:at] + "\n\n" + JS_BEGIN + "\n" + js + "\n" + JS_END + "\n" + src[at:]

# ---- CSS: before the LAST </style>, so our rules win on equal specificity
i = src.rfind("</style>")
if i < 0:
    sys.exit("X  no </style> found")
src = src[:i] + "\n" + CSS_BEGIN + "\n" + css + "\n" + CSS_END + "\n" + src[i:]

io.open(ENGINE, "w", encoding="utf-8").write(src)

# ---- verify what landed
out = io.open(ENGINE, encoding="utf-8").read()
mods = ["TRAIN_TAP", "TRAIN_SORT", "MATRA_FILL", "MATRA_BUILD", "MEET_PAIR",
        "CONTRAST_PAIR", "POEM_SEARCH"]
print("engine:", os.path.basename(ENGINE), "%.0f KB" % (len(out.encode("utf-8")) / 1024))
for m in mods:
    print("   %-16s registered: %s" % (m, ("SlideModules." + m + " = {") in out))
print("   CSS block present:", CSS_BEGIN in out)
print("   injected once:", out.count(JS_BEGIN) == 1 and out.count(CSS_BEGIN) == 1)
