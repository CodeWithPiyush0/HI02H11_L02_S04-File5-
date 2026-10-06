# -*- coding: utf-8 -*-
"""Find VO clashes: two clips sounding at the same time.

Run:  PYTHONUTF8=1 python 1_SPEC/_verify_vo_overlap.py <url> 3_CURRENT_BUILD/card.json out.txt

TWO WAYS THIS TEST LIES TO YOU, both of which it did on its first run — read these before
believing a red result:

  1. **Do not re-mount slide 0.** The start button already mounted it. Mounting it again runs TWO
     copies of the module at once and each drives its own chain, which reports as the first clip
     overlapping ITSELF. That is the harness, not the game.
  2. **Give each slide longer than its chain.** The longest teach chain here runs ~24s. At 14s per
     slide one screen's tail lands on the next and reports as a cross-slide clash.

A test that manufactures the defect it reports is worse than no test. Both are handled below.

House rule: never overlap two VO clips. Nothing in the bundle checks it, and it is invisible to
every other test — each clip exists, is the right length and plays. So instrument `play()` with
REAL durations (from the card's own files) and record every interval, then report any pair that
overlaps. Run per slide, letting each screen's chain run to its natural end.
"""
import contextlib, json, os, sys, time, wave
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains

URL, CARD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
card = json.load(open(CARD, encoding="utf-8"))
AUD = card["assets"]["audio"]
base = os.path.dirname(CARD)

dur = {}
for vid, rel in AUD.items():
    p = os.path.join(base, rel)
    try:
        with contextlib.closing(wave.open(p)) as w:
            dur[rel] = w.getnframes() / float(w.getframerate())
    except Exception:
        dur[rel] = 0.0

# play() is replaced by one that waits the clip's REAL duration before calling onEnd, so the
# chains run at true speed and a genuine overlap shows up as a genuine overlap.
STUB = """
window.__ev = [];
window.__dur = arguments[0];
(function(){
  window.play = function(src, onEnd){
    const s = String(src || "");
    const d = (window.__dur[s] || 0.35) * 1000;
    const t0 = performance.now();
    window.__ev.push({src:s, t0:t0, t1:t0 + d});
    try{ isPlaying = true; }catch(e){}
    setTimeout(function(){ try{ isPlaying = false; }catch(e){} if(onEnd) onEnd(); }, d);
  };
})();
"""

o = Options()
for a in ("--headless=new", "--window-size=1400,900",
          "--autoplay-policy=no-user-gesture-required", "--mute-audio"):
    o.add_argument(a)
d = webdriver.Chrome(options=o)
d.get(URL); time.sleep(2.5)
d.execute_script(STUB, dur)

rep = []
def note(s):
    rep.append(s); print(s, flush=True)

# --- the landing, before anything is pressed
time.sleep(7.0)
ev = d.execute_script("return window.__ev.slice();")
def clashes(ev):
    out = []
    for i in range(len(ev)):
        for j in range(i + 1, len(ev)):
            a, b = ev[i], ev[j]
            ov = min(a["t1"], b["t1"]) - max(a["t0"], b["t0"])
            if ov > 120:                      # >120ms of true simultaneity
                out.append((round(ov), a["src"].split("/")[-1], b["src"].split("/")[-1]))
    return out
c = clashes(ev)
note("LANDING  clips=%d  clashes=%d" % (len(ev), len(c)))
for ms, a, b in c: note("    %5dms  %s  ||  %s" % (ms, a, b))

# PRESSING शुरू करें RELIABLY. Two things bite here, both headless-only and both confirmed
# against the sibling build before being worked around:
#   · the button is genuinely disabled while the landing greeting plays, so wait for it;
#   · the first synthetic press can deliver pointerdown ALONE - no mousedown, no click - so the
#     handler never runs. A second press goes through. Without this the gate never opens, slide 0
#     is never mounted, and T1 silently reports 0 clips: a screen that was never measured looks
#     exactly like a screen with no clashes.
for _ in range(80):                       # 20s, above the engine's 12s stranding backstop
    if not d.execute_script("const b=document.getElementById('sgBtn');return !b||b.disabled;"):
        break
    time.sleep(0.25)
_opened = False
for _attempt in range(4):
    ActionChains(d).move_to_element(d.find_element("id", "sgBtn")).click().perform()
    for _ in range(24):                   # 6s per attempt
        if d.execute_script(
                "return document.getElementById('startGate').classList.contains('hidden');"):
            _opened = True
            break
        time.sleep(0.25)
    if _opened:
        break
if not _opened:
    raise RuntimeError("landing gate never opened after 4 presses - slide 0 would go unmeasured")
time.sleep(4.0)
d.execute_script(STUB, dur)
n = d.execute_script("return CARD.slides.length")
total = 0
# SLIDE 0 IS ALREADY MOUNTED by the start button. Mounting it again ran TWO copies of the module
# at once, which is what produced `vo_pair_u` overlapping itself — a harness artefact, not a
# product bug. And 14s was shorter than a teach chain, so one slide's tail landed on the next.
for i in range(n):
    d.execute_script("window.__ev = [];")
    if i:
        d.execute_script("mountSlide(arguments[0]);", i)
        time.sleep(0.4); d.execute_script("window.__ev = [];")
    time.sleep(26.0)                          # the longest teach chain runs ~24s
    ev = d.execute_script("return window.__ev.slice();")
    sid = d.execute_script("return CARD.slides[arguments[0]].id + ' ' + CARD.slides[arguments[0]].type;", i)
    c = clashes(ev)
    total += len(c)
    note("%-22s clips=%2d  clashes=%d" % (sid, len(ev), len(c)))
    for ms, a, b in c:
        note("    %5dms  %s  ||  %s" % (ms, a, b))
note("\nTOTAL CLASHES: %d" % total)
d.quit()
open(OUT, "w", encoding="utf-8").write("\n".join(rep))
