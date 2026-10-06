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

JS_BEGIN  = "/* == TRAIN MODULE SET :: BEGIN (engine_local, HI02H11_L02_S04) == */"
JS_END    = "/* == TRAIN MODULE SET :: END == */"
CSS_BEGIN = "/* == TRAIN STYLES :: BEGIN (engine_local, HI02H11_L02_S04) == */"
CSS_END   = "/* == TRAIN STYLES :: END == */"

js  = io.open(os.path.join(SCRATCH, "train_modules.js"), encoding="utf-8").read()
css = io.open(os.path.join(SCRATCH, "train_styles.css"), encoding="utf-8").read()
src = io.open(ENGINE, encoding="utf-8").read()

# ---- strip any previous injection (idempotent re-run)
def strip(s, a, b):
    i, j = s.find(a), s.find(b)
    if i >= 0 and j > i:
        return s[:i] + s[j + len(b):]
    return s
src = strip(src, JS_BEGIN, JS_END)
src = strip(src, CSS_BEGIN, CSS_END)

# LEGACY FENCES. This bundle's template was copied from HI02H11_L02_S02, so it arrives carrying
# a block fenced under THAT code. Renaming the fences to S03 without also stripping the old name
# left both blocks in the file — two definitions of every module, last one winning, and the
# verifier's "injected once" went False. Strip the inherited names too; harmless once gone.
for _old in ["HI02H11_L02_S02", "HI02H11_L02_S03"]:
    src = strip(src, JS_BEGIN.replace("HI02H11_L02_S04", _old), JS_END)
    src = strip(src, CSS_BEGIN.replace("HI02H11_L02_S04", _old), CSS_END)

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
mods = ["TRAIN_TAP", "TRAIN_SORT", "MATRA_BUILD", "MEET_PAIR", "MATRA_INTRO",
        "WORD_BUILD", "SENTENCE_COMPLETE"]
print("engine:", os.path.basename(ENGINE), "%.0f KB" % (len(out.encode("utf-8")) / 1024))
for m in mods:
    print("   %-16s registered: %s" % (m, ("SlideModules." + m + " = {") in out))
print("   CSS block present:", CSS_BEGIN in out)
print("   injected once:", out.count(JS_BEGIN) == 1 and out.count(CSS_BEGIN) == 1)
