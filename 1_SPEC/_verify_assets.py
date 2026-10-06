# -*- coding: utf-8 -*-
"""Asset receipt for HI02H11_L02_S02 (भाग 1 — उ / ऊ). Shape-agnostic: every expectation is read from card.json,
so this stays honest if the card changes.

Run:  PYTHONUTF8=1 py -3.13 _verify_assets.py

The duration/length check exists because of a real defect this build hit: four clips had their
TEXT changed in the builder while KEEPING their clip ids, so the old audio stayed on disk and
nothing flagged it — `vo_t1_instruction` was still a 16.25 s recording of a line that had been cut
to 56 characters. A stale clip is invisible to an existence check and to a file-size check. Speech
runs at a fairly steady rate, so seconds-per-character outside a generous band means the file and
the text have drifted apart.
"""
import json, os, sys, wave, contextlib

FAIL, WARN = [], []
card = json.load(open("card.json", encoding="utf-8"))
A = card["assets"]
audio, text, image = A["audio"], A["audio_text"], A["image"]
inherited = set(audio) - set(text)          # derived, never hardcoded


def dur(rel):
    try:
        with contextlib.closing(wave.open(rel)) as w:
            return w.getnframes() / float(w.getframerate())
    except Exception:
        return None


print("=" * 78)
print("%s — asset receipt" % card["skill_code"])
print("=" * 78)

# ---- 1. existence
miss_a = [v for v, p in audio.items() if not os.path.isfile(p)]
miss_i = [k for k, p in image.items() if not os.path.isfile(p)]
if miss_a:
    FAIL.append("%d declared clips missing: %s" % (len(miss_a), sorted(miss_a)))
if miss_i:
    FAIL.append("%d declared images missing: %s" % (len(miss_i), sorted(miss_i)))
print("\n1. EXISTENCE")
print("   clips  : %d/%d present  (%d recorded for this lesson, %d inherited)"
      % (len(audio) - len(miss_a), len(audio), len(text), len(inherited)))
print("   images : %d/%d present" % (len(image) - len(miss_i), len(image)))

# ---- 2. every slide speaks its prompt, and every referenced id is declared
print("\n2. WIRING")
silent = [s["id"] for s in card["slides"] if not (s.get("audio") or {}).get("prompt")]
if silent:
    FAIL.append("slides with no spoken prompt: %s" % silent)


def ids(o, out):
    if isinstance(o, dict):
        for v in o.values():
            ids(v, out)
    elif isinstance(o, list):
        for v in o:
            ids(v, out)
    elif isinstance(o, str) and (o.startswith("vo_") or o.startswith("sfx_")):
        out.add(o)


ref = set()
ids(card["slides"], ref)
ids({k: v for k, v in card.items() if k.endswith("_audio")}, ref)
undecl = sorted(ref - set(audio))
if undecl:
    FAIL.append("clip ids referenced by slides but NOT declared: %s" % undecl)
unused = sorted(set(text) - ref - {"vo_landing", "vo_try_again"})
if unused:
    WARN.append("declared-and-recorded but referenced by nothing: %s" % unused)
print("   every slide speaks a prompt : %s" % ("YES" if not silent else "NO"))
print("   all referenced ids declared : %s" % ("YES" if not undecl else "NO"))
print("   orphaned recordings         : %d" % len(unused))

# ---- 3. truncation detection, by PEER COMPARISON
print("\n3. TRUNCATION CHECK  (a clip much shorter than its same-length peers is cut off)")
#
# An absolute seconds-per-character band does not work: a 3-character word carries fixed
# leading/trailing silence, so its s/char is naturally 4x a long sentence's, and the band needed
# to accept both is too wide to catch anything. What DOES work is comparing each clip against
# other clips of the SAME text length — the lesson is full of templated lines, so most clips have
# real peers. This is how the em-dash truncation was actually found: `vo_yes_din` ran 0.89-1.29 s
# over four takes while its 39-character siblings ran 4.09 s and 4.29 s.
#
# Cause, for the record: an em-dash before a short final word makes the TTS model cut the clip.
# Probed head to head — em-dash 0.73-1.05 s, comma 1.53-2.21 s, danda 1.13-2.01 s for the same
# words. Every affected line now uses a comma or a danda instead.
import statistics
buckets, nodur = {}, []
for v in sorted(text):
    if not os.path.isfile(audio[v]):
        continue
    d = dur(audio[v])
    if d is None:
        nodur.append(v)
        continue
    buckets.setdefault(len(text[v]), []).append((v, d))
short, checked = [], 0
for n, grp in sorted(buckets.items()):
    if len(grp) < 3:                      # no peer group -> nothing to compare against
        continue
    med = statistics.median(d for _v, d in grp)
    for v, d in grp:
        checked += 1
        if d < 0.55 * med:
            short.append((v, n, d, med, len(grp)))
for v, n, d, med, k in short:
    FAIL.append("%s: %.2fs against a %.2fs median across %d peers of %d chars — TRUNCATED"
                % (v, d, med, k, n))
print("   %d clips had a peer group of 3+; %d flagged as truncated" % (checked, len(short)))

# ---- 3b. SECONDS-PER-CHARACTER, against the whole corpus
#
# THE PEER-BUCKET TEST HAS A HOLE AND IT LET A REAL TRUNCATION THROUGH. It needs three clips of
# the SAME text length to form a group, so a line with only one sibling is never compared to
# anything. `vo_base_pal` («यह शब्द देखिए — पल।») came back at 0.69s while its identical-length
# twin `vo_base_phal` ran 2.49s — a 3.6x gap, the exact em-dash truncation this file exists to
# catch, and it scored clean because the two of them were a bucket of two.
#
# Speech runs at a fairly steady rate, so the corpus median seconds-per-character predicts any
# line's duration well enough to catch a clip that lost most of its words. The band is generous
# (40%) because short clips carry proportionally more leading and trailing silence; it is looking
# for a clip that is a fraction of its length, not for natural variation.
rates = []
for v in sorted(text):
    if not os.path.isfile(audio[v]):
        continue
    d = dur(audio[v])
    if d and len(text[v]) >= 3:
        rates.append(d / len(text[v]))
if len(rates) >= 10:
    sps = statistics.median(rates)
    thin = []
    for v in sorted(text):
        if not os.path.isfile(audio[v]) or len(text[v]) < 3:
            continue
        d = dur(audio[v]) or 0
        want = max(0.55, sps * len(text[v]))
        if d < 0.40 * want:
            thin.append((v, d, want))
    for v, d, want in thin:
        FAIL.append("%s: %.2fs but ~%.2fs expected for %d chars at the corpus rate — TRUNCATED"
                    % (v, d, want, len(text[v])))
    print("   corpus rate %.3f s/char; %d clips checked against it; %d flagged"
          % (sps, len(rates), len(thin)))
if nodur:
    WARN.append("%d clips could not be read as WAV: %s" % (len(nodur), nodur[:5]))
# Belt and braces: nothing should be under 0.6s except a one-word name.
for v in sorted(text):
    if not os.path.isfile(audio[v]):
        continue
    d = dur(audio[v]) or 0
    if d < 0.60 and len(text[v]) > 6:
        FAIL.append("%s: %.2fs for %d chars — far too short to contain the line"
                    % (v, d, len(text[v])))
# And no em-dash should survive in a SHORT line, which is where it truncates.
#
# ROUND 3 SPLIT THIS INTO TWO OUTCOMES, because the rule started firing on lines that are the
# SME's own wording and that measured fine. The em-dash is a RISK, not a defect: what makes it a
# defect is the clip actually coming back short. So — if the clip does not exist yet, or it failed
# the peer comparison above, that is a FAIL and the line must be rewritten. If it exists and
# measured normal against its peers, the risk did not materialise on this take and it drops to a
# WARN: worth a human ear, and worth re-checking after any re-record, but not a reason to hold the
# build. `flagged` is the set of ids the truncation check already condemned.
dash = sorted(v for v in text if "—" in text[v] and len(text[v]) < 30)
_bad = [v for v in dash if not os.path.isfile(audio[v])
        or any(v in str(f) for f in FAIL)]
_ok = [v for v in dash if v not in _bad]
if _bad:
    FAIL.append("short lines carrying an em-dash AND unverified/short: %s" % _bad)
if _ok:
    WARN.append("short lines carry an em-dash (the truncation trigger) but measured NORMAL "
                "against their peers — EAR-CHECK, and re-check after any re-record: %s" % _ok)

# ---- 4. long-clip watch
print("\n4. LONGEST CLIPS  (a locked tutorial slide should not be a long watch)")
ds = sorted(((dur(audio[v]) or 0, v) for v in text), reverse=True)[:6]
for d, v in ds:
    print("   %6.2fs  %-26s %s" % (d, v, text[v][:52]))
for d, v in ds:
    if d > 12:
        WARN.append("%s is %.1fs — long for one beat" % (v, d))

# ---- 5. image sanity (the obj_sapna blank-PNG class of defect)
print("\n5. IMAGE SANITY")
try:
    from PIL import Image
    import numpy as np
    for k in sorted(image):
        p = image[k]
        if not os.path.isfile(p):
            continue
        im = Image.open(p).convert("RGBA")
        a = np.array(im)[:, :, 3]
        op = float((a > 16).mean()) * 100
        rgb = np.array(im)[:, :, :3][a > 16]
        nc = len(np.unique(rgb.reshape(-1, 3) // 24, axis=0)) if len(rgb) else 0
        # ROUND 3 ADDED A SECOND IMAGE CLASS. Everything in this lesson used to be a keyed
        # cut-out, for which "fully opaque" means the chroma key failed and the subject is still
        # sitting on its background — a real defect, and what this check exists to catch. The four
        # `scn_*` SCENES on the sentence screens are full-bleed illustrations that are opaque ON
        # PURPOSE (they have a background; that is the point), so the opacity rule is inverted for
        # them: a scene that is mostly TRANSPARENT is the broken one, because it means somebody
        # ran it through the key pipeline after all.
        scene = k.startswith("scn_")
        if scene:
            if op < 95:
                FAIL.append("%s is only %.1f%% opaque — a SCENE must be full-bleed; it looks "
                            "like it was run through the chroma key" % (k, op))
        elif op < 3 or op > 98.5:
            FAIL.append("%s is %.1f%% opaque — blank or un-keyed" % (k, op))
        if nc < 6:
            FAIL.append("%s has only %d colour buckets — likely a flat/blank fill" % (k, nc))
    n_scn = len([k for k in image if k.startswith("scn_")])
    print("   %d images checked for the blank-PNG defect (opacity + colour spread)" % len(image))
    print("   %d cut-outs must be keyed; %d scenes must NOT be" % (len(image) - n_scn, n_scn))
except ImportError:
    WARN.append("Pillow/numpy unavailable — image sanity NOT checked")

# ---- 6. emoji fallback for every image
print("\n6. FALLBACKS")
fb = card.get("_emoji_fallback", {})
nofb = sorted(set(image) - set(fb))
if nofb:
    FAIL.append("images with no emoji fallback: %s" % nofb)
print("   every image has an emoji fallback : %s" % ("YES" if not nofb else "NO"))
print("   declared img_ext = %r, files on disk = %s"
      % (A.get("img_ext"),
         sorted({os.path.splitext(p)[1].lstrip(".") for p in image.values()}) or "none"))
exts = {os.path.splitext(p)[1].lstrip(".") for p in image.values()}
if exts and A.get("img_ext") not in exts:
    FAIL.append("img_ext is %r but the files are %s — every picture would 404 to its emoji "
                "(kit defect A3)" % (A.get("img_ext"), sorted(exts)))

print("\n" + "=" * 78)
print("%d FAIL   %d WARN" % (len(FAIL), len(WARN)))
for x in FAIL:
    print("  FAIL  " + x)
for x in WARN:
    print("  WARN  " + x)
print("=" * 78)
sys.exit(1 if FAIL else 0)
