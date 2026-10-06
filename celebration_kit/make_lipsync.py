# -*- coding: utf-8 -*-
"""Swiftie celebration kit — make the lip-sync track for ONE celebration voice-over.

The track is a string with one character per 25 ms of the clip: "1" = a syllable beat (mouth open),
"0" = a dip / silence (mouth shut). The mouth opens where the clip is loud AND near its local peak
(+-100 ms), so it opens on each syllable and closes between syllables, not just "while there is sound".

Usage:
    python make_lipsync.py <vo_file>                -> prints the track
    python make_lipsync.py <vo_file> --json out.json -> writes {"bits": ..., "step_ms": 25, "ms": ...}
Needs ffmpeg on PATH. Re-run whenever the celebration VO is re-recorded.
"""
import sys, json, math, array, subprocess

STEP_MS = 25

def lipsync(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    a = array.array("h"); a.frombytes(raw[: len(raw) // 2 * 2])
    step = 16000 * STEP_MS // 1000
    rms = [math.sqrt(sum(x * x for x in a[i:i + step]) / step) for i in range(0, len(a) - step, step)]
    mx = max(rms) or 1
    W = 4
    t = "".join("1" if (r > 0.10 * mx and r >= 0.62 * max(rms[max(0, i - W):i + W + 1])) else "0"
                for i, r in enumerate(rms))
    t = t.replace("101", "111").replace("101", "111")     # a 25 ms close inside a syllable = flicker
    t = t.replace("010", "000")                           # a lone 25 ms open = flicker
    return t, round(len(a) / 16)

if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(__doc__)
    bits, ms = lipsync(sys.argv[1])
    if "--json" in sys.argv:
        out = sys.argv[sys.argv.index("--json") + 1]
        json.dump({"bits": bits, "step_ms": STEP_MS, "ms": ms}, open(out, "w"), indent=1)
        print("wrote", out, "(%d ms, %d steps)" % (ms, len(bits)))
    else:
        print(bits)
