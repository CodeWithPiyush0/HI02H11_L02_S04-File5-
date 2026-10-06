# -*- coding: utf-8 -*-
"""Asset receipt for HI02H11_L02_S03 (भाग 1 — उ / ऊ). Shape-agnostic: every expectation is read from card.json,
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
dash = sorted(v for v in text if "—" in text[v] and len(text[v]) < 30)
if dash:
    FAIL.append("short lines still carrying an em-dash (the truncation trigger): %s" % dash)

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
        # TWO ASSET CLASSES, TWO RULES.
        #   obj_*  cut-outs  — must be keyed, so 100% opaque means the key FAILED
        #   scn_*  scenes    — full illustrations for SENTENCE_COMPLETE; their background IS
        #                      the content, so 100% opaque is CORRECT and the opacity test is
        #                      meaningless. Checking them as cut-outs produced 4 false FAILs
        #                      on the first run of this bundle.
        # The colour-spread test still applies to both: it is what catches a blank or flat fill,
        # and it is the check that caught the solid-white गुड़/कबूतर on the sibling.
        is_scene = k.startswith("scn_")
        if not is_scene and (op < 3 or op > 98.5):
            FAIL.append("%s is %.1f%% opaque — blank or un-keyed" % (k, op))
        if is_scene and op < 99:
            FAIL.append("%s is a scene but only %.1f%% opaque — it should NOT be keyed" % (k, op))
        if nc < 6:
            FAIL.append("%s has only %d colour buckets — likely a flat/blank fill" % (k, nc))
    n_obj = sum(1 for k in image if not k.startswith("scn_"))
    n_scn = len(image) - n_obj
    print("   %d cut-outs (opacity + colour spread) + %d scenes (colour spread only)"
          % (n_obj, n_scn))
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
