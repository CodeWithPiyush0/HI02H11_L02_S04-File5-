# -*- coding: utf-8 -*-
"""Drive every mechanic (wrong -> wrong -> right) and capture the SETTLED state of each screen.

Selectors follow the TrainChrome port: a coach is a painted slice, the tappable one carries
`.is-tappable`, and `.is-nudge` is added in exactly one place so it needs no qualifier.

Two things this does that capture_pages.py cannot right now:
  · it strips EVERY `*seq-hidden` variant (`mb-seq-hidden`, `tr-seq-hidden`), not just the bare
    `.seq-hidden` the shipped harness removes, so a staged teach screen photographs finished;
  · it stubs `play()` so a missing clip returns instantly instead of sitting out say()'s 9-second
    fallback — with 61 clips still to record, an un-stubbed run never reaches the end of a chain.
"""
import io, json, sys, time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def _click_start(d):
    """Press शुरू करें and wait until the landing is really gone.

    ActionChains, not element.click(): the latter delivers only pointerdown under Chrome 153
    headless, so the handler never runs. Verified against the sibling build — same driver, same
    behaviour there, so it is the driver and not either lesson.

    Then poll `startGate.hidden` instead of sleeping: the handler awaits an audio warm-up (capped
    at 3s) and the phase gate holds its peek for ~2s, so any fixed sleep is a race. Polling also
    asserts the gate DID open, which is the thing every later screenshot depends on.
    """
    import time as _t
    from selenium.webdriver.common.action_chains import ActionChains as _AC
    for _ in range(80):                       # 20s: above the engine's 12s stranding backstop
        if not d.execute_script("const b=document.getElementById('sgBtn');return !b||b.disabled;"):
            break
        _t.sleep(0.25)
    else:
        raise RuntimeError("start button never became enabled - the 12s backstop did not fire")
    # THE FIRST PRESS IS NOT RELIABLE under this driver: it can deliver pointerdown alone, with
    # no mousedown and no click, so the handler never runs. A second press goes through. The
    # sibling build behaves the same, and removing the star layer / the burst handler / the new
    # disabled state each changed nothing - it is the driver. So press, watch, press again.
    for attempt in range(4):
        _AC(d).move_to_element(d.find_element("id", "sgBtn")).click().perform()
        for _ in range(24):                   # 6s per attempt
            if d.execute_script(
                    "return document.getElementById('startGate').classList.contains('hidden');"):
                return
            _t.sleep(0.25)
    raise RuntimeError("landing gate never opened after 4 presses of the start button")

from selenium.webdriver.common.action_chains import ActionChains

URL, OUT, SHOTS = sys.argv[1], sys.argv[2], sys.argv[3]

STUB = """
window.__log = [];
(function(){
  const o = window.play;
  window.play = function(src, onEnd){ window.__log.push(String(src)); if(onEnd) setTimeout(onEnd, 20); };
  window.__origPlay = o;
})();
try{ document.documentElement.style.setProperty('--scale','1'); }catch(e){}
const st=document.createElement('style'); st.id='__cap';
st.textContent='*{animation:none !important;transition:none !important;caret-color:transparent !important;}';
document.head.appendChild(st);
"""

SETTLE = """
document.querySelectorAll('[class]').forEach(function(e){
  [...e.classList].forEach(function(c){ if(/seq-hidden$/.test(c)) e.classList.remove(c); });
});
document.querySelectorAll('.mb-panel,.mb-arrow,.mb-cons,.mb-matra,.mb-syl,.cp-side,.cp-vs')
  .forEach(function(e){ e.classList.add('mb-in'); });
document.querySelectorAll('.mp-card,.mp-pic,.mp-callout').forEach(function(e){ e.classList.add('mp-in'); });
document.querySelectorAll('.mi-pair').forEach(function(e){ e.classList.remove('is-dim'); });
"""

CLICK = """
const el = arguments[0];
const r = el.getBoundingClientRect();
const x = r.left + r.width/2, y = r.top + r.height/2;
['mousedown','mouseup','click'].forEach(function(t){
  el.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y}));
});
"""

def drag(tile, zone):
    """A REAL pointer drag through the CDP input pipeline.

    Synthetic MouseEvents are not enough here: makeDraggable resolves its drop target with
    document.elementFromPoint, so the drag has to move an actual cursor, not just fire events at
    coordinates."""
    ActionChains(d).click_and_hold(tile).pause(0.15).move_to_element(zone).pause(0.15)         .move_by_offset(1, 1).pause(0.1).release().perform()

o = Options()
for a in ("--headless=new", "--window-size=1400,900", "--force-device-scale-factor=2",
          "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--hide-scrollbars"):
    o.add_argument(a)
o.set_capability("goog:loggingPrefs", {"browser": "ALL"})
d = webdriver.Chrome(options=o)
d.set_window_size(1400, 900)
d.get(URL)
time.sleep(2.5)
d.execute_script(STUB)
# START THROUGH THE REAL GATE. mountSlide() can jump to any slide, but until शुरू करें is pressed
# the body keeps `is-start` and the stage is not interactive: getBoundingClientRect still returns
# sensible numbers while elementFromPoint returns the stage itself, so makeDraggable never finds
# its .dd-zone and every drag silently does nothing. Taps look fine throughout, because a tap is
# dispatched on the element and never hit-tests — which is exactly what made this read as a
# drag-only bug in the module rather than a harness one.
_click_start(d)
time.sleep(4.0)
d.execute_script(STUB)          # re-stub: the gate reloads state

rep = []


def note(s):
    rep.append(s)
    print(s)


def shot(name):
    d.execute_script(SETTLE)
    time.sleep(0.25)
    d.save_screenshot("%s/%s" % (SHOTS, name))


BUSY = ("return (typeof isPlaying !== 'undefined' && !!isPlaying) ||"
        "       (typeof state !== 'undefined' && !!(state && state.revealing));")


def idle(limit=25.0):
    """Wait until the screen is neither speaking nor mid-demonstration.

    `state` and `isPlaying` are top-level `let`/`const` in a classic script, so they live in the
    global LEXICAL environment and are NOT on `window` - reading `window.state` returns undefined
    and every wait passes instantly. And since the Review-1 round, `state.revealing` is also
    raised for the whole of a rung-2 demonstration, so this is what keeps one miss from landing in
    the middle of the last one's chain. """
    t0 = time.time()
    while time.time() - t0 < limit:
        if not d.execute_script(BUSY):
            time.sleep(0.35)
            if not d.execute_script(BUSY):
                return
        time.sleep(0.2)


def mount(i):
    d.execute_script("mountSlide(arguments[0]);", i)
    time.sleep(0.6)
    d.execute_script("window.__log=[];")
    # THE SCREEN IS READY WHEN ITS PROMPT HAS SPOKEN, not when it is quiet. `isPlaying` is false
    # in the gap before the entry chain reaches say(prompt) - and since Review-1 the tap carts do
    # not arm until that moment, so a tap before it is simply dropped and every miss reads as
    # "no hint fired".
    pid = d.execute_script("const a = CARD.slides[arguments[0]].audio || {};"
                           "return a.prompt || null;", i)
    t0 = time.time()
    while pid and time.time() - t0 < 25:
        if pid in " ".join(d.execute_script("return window.__log.slice();")):
            break
        time.sleep(0.25)
    idle()
    d.execute_script("window.__log=[];")


def el(sel, n=0):
    e = d.find_elements("css selector", sel)
    return e[n] if len(e) > n else None


def hand():
    """[28f] the GUIDING HAND — `.nudge-hand.show`.

    NOT `.is-nudge`, which is the coach GLOW and which [28f] explicitly DOES allow in practice
    ("tutorial and guided get the hand, practice gets the coach glow only"). The train blocks
    used to report .is-nudge under the heading `hand=`, so a practice slide showing a legitimate
    glow read as a ruling violation, and a real hand on a practice slide would have read as
    normal. Both columns are now reported, under their own names.
    """
    return d.execute_script("return document.querySelectorAll('.nudge-hand.show').length;")


def logs():
    return d.execute_script("return window.__log.slice();")


slides = d.execute_script("return CARD.slides.map(s=>({id:s.id,type:s.type,phase:s.phase}));")
shot("01_landing.png")

for i, s in enumerate(slides):
    mount(i)
    t, sid = s["type"], s["id"]

    if t == "TRAIN_TAP":
        coaches = d.find_elements("css selector", ".is-tappable")
        # BY WORD, NOT BY INDEX. [r29] deals the coaches in a fresh order on every mount, so the
        # n-th coach on screen is not the n-th entry in data.coaches - this used to find the
        # "correct" coach by position and so, two runs in three, tapped the answer as a miss.
        right = d.execute_script(
            "const t = CARD.slides[arguments[0]].data.target;"
            "return [...document.querySelectorAll('.is-tappable')].findIndex(c=>{"
            "  const w = c.querySelector('.tr-word');"
            "  return w && w.textContent.trim() === t; });", i)
        wrongs = [c for n, c in enumerate(coaches) if n != right]
        idle(); d.execute_script(CLICK, wrongs[0]); time.sleep(0.6)
        a1 = logs(); hand1 = d.execute_script("return document.querySelectorAll('.is-nudge').length;"); hh1 = hand()
        d.execute_script("window.__log=[];")
        idle(); d.execute_script(CLICK, wrongs[1]); time.sleep(0.8)
        a2 = logs(); hand2 = d.execute_script("return document.querySelectorAll('.is-nudge').length;"); hh2 = hand()
        d.execute_script("window.__log=[];")
        idle(); d.execute_script(CLICK, coaches[right]); time.sleep(0.9)
        a3 = logs()
        nav = d.execute_script("return !document.getElementById('navBtn').classList.contains('disabled')"
                               " && !document.getElementById('navBtn').disabled;")
        ov = d.execute_script("return document.querySelectorAll('.tr-word .mh-ov').length;")
        note("%-4s %-18s miss1 vo=%s glow=%d hand=%d | miss2 vo=%s glow=%d hand=%d | win vo=%s matraHL=%d nav=%s"
             % (sid, t, a1, hand1, hh1, a2, hand2, hh2, a3, ov, nav))

    elif t == "SENTENCE_COMPLETE":
        ans = d.execute_script("return CARD.slides[arguments[0]].data.answer;", i)
        opts = d.find_elements("css selector", ".sc-opt")
        right = d.execute_script(
            "return [...document.querySelectorAll('.sc-opt')].findIndex(o=>o.dataset.word===arguments[0]);", ans)
        wrongs = [c for n, c in enumerate(opts) if n != right]
        idle(); d.execute_script(CLICK, wrongs[0]); time.sleep(0.7)
        a1 = logs(); nudge1 = d.execute_script("return document.querySelectorAll('.sc-opt.sc-nudge').length;")
        d.execute_script("window.__log=[];")
        idle(); d.execute_script(CLICK, wrongs[1]); time.sleep(0.9)
        a2 = logs(); nudge2 = d.execute_script("return document.querySelectorAll('.sc-opt.sc-nudge').length;")
        hand = d.execute_script("var n=document.getElementById('nudgeHand');"
                                "return !!(n && n.classList.contains('show'));")
        d.execute_script("window.__log=[];")
        idle(); d.execute_script(CLICK, opts[right]); time.sleep(0.9)
        a3 = logs()
        filled = d.execute_script("var b=document.querySelector('.sc-blank');"
                                  "return b ? b.textContent.trim() : null;")
        nav = d.execute_script("return !document.getElementById('navBtn').classList.contains('disabled');")
        note("%-4s %-18s miss1 vo=%s glow=%d | miss2 vo=%s glow=%d hand=%s | win vo=%s blank=%r nav=%s"
             % (sid, t, a1, nudge1, a2, nudge2, hand, a3, filled, nav))

    elif t == "TRAIN_SORT":
        d.execute_script("state.revealing=false;"
                         "document.querySelectorAll('.tr-card').forEach(c=>c.classList.remove('tr-seq-hidden'));")
        tiles = d.find_elements("css selector", ".tr-card")
        bodies = d.find_elements("css selector", ".tr-body")
        bins = d.execute_script("return CARD.slides[arguments[0]].data.bins.map(b=>b.key);", i)
        t0 = tiles[0]
        want = t0.get_attribute("data-bin")
        wrong_i = 0 if bins[0] != want else 1
        idle(); drag(t0, bodies[wrong_i]); time.sleep(0.7)
        a1 = logs(); h1 = d.execute_script("return document.querySelectorAll('.is-nudge').length;"); hh1 = hand()
        d.execute_script("window.__log=[];")
        idle(); drag(t0, bodies[wrong_i]); time.sleep(0.9)
        a2 = logs(); h2 = d.execute_script("return document.querySelectorAll('.is-nudge').length;"); hh2 = hand()
        d.execute_script("window.__log=[];")
        ok_i = bins.index(want)
        idle(); drag(t0, bodies[ok_i]); time.sleep(0.8)
        a3 = logs()
        snapped = d.execute_script("return document.querySelectorAll('.tr-card.snapped').length;")
        # finish the rest
        for tl in d.find_elements("css selector", ".tr-card:not(.snapped)"):
            wb = tl.get_attribute("data-bin")
            drag(tl, d.find_elements("css selector", ".tr-body")[bins.index(wb)])
            time.sleep(0.5)
        d.execute_script("window.__log=[];"); time.sleep(0.8)
        done = d.execute_script("return {snap:document.querySelectorAll('.tr-card.snapped').length,"
                                "finish:!!document.querySelector('.tr-wrap.tr-done'),"
                                "nav:!document.getElementById('navBtn').classList.contains('disabled')};")
        note("%-4s %-18s miss1 vo=%s glow=%d hand=%d | miss2 vo=%s glow=%d hand=%d | win vo=%s snapped=%d | all=%s"
             % (sid, t, a1, h1, hh1, a2, h2, hh2, a3, snapped, json.dumps(done)))

    elif t == "WORD_BUILD":
        tiles = d.find_elements("css selector", ".tr-card")
        # blanks are addressed by data-idx, never by position: a completed coach REPLACES its
        # split form with the whole word, so the .wb-blank list shrinks as the screen is solved.
        def blank(n):
            e = d.find_elements("css selector", ".wb-blank[data-idx='%d']" % n)
            return e[0] if e else None
        slots = d.execute_script("return CARD.slides[arguments[0]].data.slots;", i)
        # the tray is shuffled, so tiles[0] may be the DISTRACTOR — drive a tile that has a home
        t0, ak, home = None, None, None
        for tl in tiles:
            a_ = tl.get_attribute("data-akshar")
            h_ = next((n for n, s2 in enumerate(slots) if a_ + s2["tail"] == s2["word"]), None)
            if h_ is not None:
                t0, ak, home = tl, a_, h_
                break
        bad = next(n for n in range(len(slots)) if n != home)
        drag(t0, blank(bad)); time.sleep(0.7)
        a1 = logs(); h1 = d.execute_script("return document.querySelectorAll('.is-nudge').length;"); hh1 = hand()
        d.execute_script("window.__log=[];")
        drag(t0, blank(bad)); time.sleep(0.9)
        a2 = logs()
        h2 = d.execute_script("return {coach:document.querySelectorAll('.is-nudge').length,"
                              "blank:document.querySelectorAll('.wb-blank.wb-pulse').length};"); hh2 = hand()
        d.execute_script("window.__log=[];")
        drag(t0, blank(home)); time.sleep(1.0)
        a3 = logs()
        w1 = d.execute_script("return [...document.querySelectorAll('.tr-doneword')].map(e=>e.dataset.mhWord||e.textContent);")
        for tl in d.find_elements("css selector", ".tr-card:not(.snapped)"):
            ak2 = tl.get_attribute("data-akshar")
            hm = next((n for n, s2 in enumerate(slots) if ak2 + s2["tail"] == s2["word"]), None)
            if hm is None:
                continue
            z = blank(hm)
            if z is None:
                continue
            idle(); drag(tl, z); time.sleep(0.9)
        time.sleep(1.0)
        fin = d.execute_script("return {words:[...document.querySelectorAll('.tr-doneword')]"
                               ".map(e=>e.dataset.mhWord||e.textContent),"
                               "ov:document.querySelectorAll('.tr-doneword .mh-ov').length,"
                               "finish:!!document.querySelector('.tr-wrap.tr-done'),"
                               "nav:!document.getElementById('navBtn').classList.contains('disabled')};")
        note("%-4s %-18s miss1 vo=%s glow=%d hand=%d | miss2 vo=%s nudge=%s hand=%d | win vo=%s built=%s | all=%s"
             % (sid, t, a1, h1, hh1, a2, json.dumps(h2), hh2, a3, w1, json.dumps(fin)))

    else:
        note("%-4s %-18s (teach / celebration — render only)" % (sid, t))

    shot("%02d_%s.png" % (i + 2, t))

sev = [l for l in d.get_log("browser") if l["level"] == "SEVERE"
       and ".ogg" not in l["message"] and "favicon" not in l["message"]]
rep.append("\n--- non-audio SEVERE console entries: %d ---" % len(sev))
for l in sev:
    rep.append("  " + l["message"][:300])
d.quit()
io.open(OUT, "w", encoding="utf-8").write("\n".join(rep))
print("\nwrote", OUT)
