# -*- coding: utf-8 -*-
"""Drive every S04 test screen through the deck's ladder and record what happened.

For each test screen: miss 1 -> miss 2 -> miss 3 -> the right answer, recording after each step
the clips spoken (play() is stubbed to 20 ms and logged), the hand, the glows/locks and the
highlights; a screenshot after Hint 2 and after Hint 3. Then a second pass answers every screen
RIGHT FIRST TIME, which is the path a hint round is most likely to break.

    PYTHONUTF8=1 python 1_SPEC/_drive_ladder_s04.py <url> <out.json> <shots_dir>
"""
import json, sys, time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains

sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
URL, OUT, SHOTS = sys.argv[1], sys.argv[2], sys.argv[3]

STUB = """
window.__log = [];
window.play = function(src, onEnd){ window.__log.push(String(src).split('/').pop().split('.')[0]);
                                    if(onEnd) setTimeout(onEnd, 20); };
"""
BUSY = ("return (typeof isPlaying !== 'undefined' && !!isPlaying) ||"
        " (typeof state !== 'undefined' && !!(state && state.revealing));")

o = Options()
for a in ("--headless=new", "--window-size=1400,900", "--force-device-scale-factor=1",
          "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--hide-scrollbars"):
    o.add_argument(a)
o.set_capability("goog:loggingPrefs", {"browser": "ALL"})
d = webdriver.Chrome(options=o)
d.set_window_size(1400, 900)
d.get(URL)
time.sleep(3)


def start():
    for _ in range(80):
        if not d.execute_script("const b=document.getElementById('sgBtn');return !b||b.disabled;"):
            break
        time.sleep(0.25)
    for _ in range(4):
        ActionChains(d).move_to_element(d.find_element("id", "sgBtn")).click().perform()
        for _ in range(24):
            if d.execute_script("return document.getElementById('startGate').classList.contains('hidden');"):
                return
            time.sleep(0.25)
    raise RuntimeError("start gate never opened")


start()
time.sleep(4)
d.execute_script(STUB)


def idle(limit=20.0):
    t0 = time.time()
    while time.time() - t0 < limit:
        if not d.execute_script(BUSY):
            time.sleep(0.4)
            if not d.execute_script(BUSY):
                return
        time.sleep(0.15)


def mount(i):
    d.execute_script("mountSlide(arguments[0]);", i)
    time.sleep(0.5)
    d.execute_script("window.__log=[];")
    pid = d.execute_script("const a=CARD.slides[arguments[0]].audio||{};return a.prompt||null;", i)
    t0 = time.time()
    while pid and time.time() - t0 < 20:
        if pid in d.execute_script("return window.__log.slice();"):
            break
        time.sleep(0.2)
    idle()
    time.sleep(0.4)
    entry = d.execute_script("return window.__log.slice();")
    d.execute_script("window.__log=[];")
    return entry


def logs():
    v = d.execute_script("return window.__log.slice();")
    d.execute_script("window.__log=[];")
    return v


def state():
    return d.execute_script("""
      const q=s=>document.querySelectorAll(s).length;
      return {hand:q('#nudgeHand.show'), nudge:q('.is-nudge'), out:q('.is-out'),
              glow:q('.tr-glow'), wait:q('.tr-wait'), big:q('.tr-h2big'), marks:q('.mh-ov'),
              revealword:q('.tr-revealword'), locked:q('.sc-locked'), blankglow:q('.sc-blankglow'),
              wbpulse:q('.wb-pulse'), attempts:state.attempts, nav:!document.getElementById('navBtn').disabled};""")


def drag(tile, zone):
    ActionChains(d).click_and_hold(tile).pause(0.15).move_to_element(zone).pause(0.15) \
        .move_by_offset(1, 1).pause(0.1).release().perform()


def shot(name):
    d.save_screenshot("%s/%s.png" % (SHOTS, name))


def tap(el):
    ActionChains(d).move_to_element(el).click().perform()


def find(sel):
    return d.find_elements("css selector", sel)


slides = d.execute_script("return CARD.slides.map(s=>({id:s.id,type:s.type,data:s.data}));")
rep = {"ladder": {}, "first_try": {}, "errors": []}


def step(rec, label, act):
    act()
    time.sleep(0.3)
    idle()
    time.sleep(0.3)
    rec.append({"step": label, "clips": logs(), "state": state()})


def run_ladder(i, s, shots=True):
    t, sid, dd = s["type"], s["id"], s["data"]
    rec = [{"step": "entry", "clips": mount(i), "state": state()}]
    if t == "TRAIN_TAP":
        def coach(word):
            return d.execute_script("""const w=arguments[0];
              const x=[...document.querySelectorAll('.tr-word')].find(e=>(e.dataset.mhWord||e.textContent.trim())===w);
              return x && x.closest('.is-tappable,.is-out');""", word)
        wrong = [c["word"] for c in dd["coaches"] if not c["correct"]]
        right = [c["word"] for c in dd["coaches"] if c["correct"]][0]
        for k, w in enumerate([wrong[0], wrong[1], wrong[0]]):
            step(rec, "miss%d(%s)" % (k + 1, w), lambda w=w: tap(coach(w)))
            if shots and k == 1: shot(sid + "_h2")
            if shots and k == 2: shot(sid + "_h3")
        step(rec, "right(%s)" % right, lambda: tap(coach(right)))
    elif t == "TRAIN_SORT" and not dd.get("demo"):
        card = dd["cards"][0]
        tile = lambda: d.execute_script("""const w=arguments[0];
            return [...document.querySelectorAll('.tr-tray .tr-card')].find(c=>c.dataset.word===w);""", card["word"])
        bins = [b["key"] for b in dd["bins"]]
        wi = 1 - bins.index(card["bin"])
        zone = lambda k: find(".tr-body")[k]
        for k in range(3):
            step(rec, "miss%d(%s)" % (k + 1, card["word"]), lambda: drag(tile(), zone(wi)))
            if shots and k == 1: shot(sid + "_h2")
            if shots and k == 2: shot(sid + "_h3")
        step(rec, "4th drop on wrong coach (locked)", lambda: drag(tile(), zone(wi)))
        step(rec, "right(%s)" % card["word"], lambda: drag(tile(), zone(bins.index(card["bin"]))))
    elif t == "WORD_BUILD":
        # a DISTRACTOR three times on the first blank (counted against that blank), then the right one
        dis = [o["akshar"] for o in dd["options"]
               if not any(o["akshar"] + sl["tail"] == sl["word"] for sl in dd["slots"])]
        sl0 = dd["slots"][0]
        tileA = lambda a: d.execute_script("""return [...document.querySelectorAll('.wb-tray .tr-card')]
              .find(c=>c.dataset.akshar===arguments[0]);""", a)
        blank = lambda: find(".wb-blank")[0]
        for k, a in enumerate([dis[0], dis[1], dis[0]]):
            step(rec, "miss%d(%s on _%s)" % (k + 1, a, sl0["tail"]), lambda a=a: drag(tileA(a), blank()))
            if shots and k == 1: shot(sid + "_h2")
            if shots and k == 2: shot(sid + "_h3")
        step(rec, "right(%s)" % sl0["head"], lambda: drag(tileA(sl0["head"]), blank()))
    elif t == "SENTENCE_COMPLETE":
        opt = lambda w: d.execute_script("""return [...document.querySelectorAll('.sc-opt')]
              .find(b=>b.dataset.word===arguments[0]);""", w)
        bl = lambda: find(".sc-blank")[0]
        wrong = [o["word"] for o in dd["options"] if o["word"] != dd["answer"]]
        for k, w in enumerate([wrong[0], wrong[1], wrong[0]]):
            step(rec, "miss%d(%s)" % (k + 1, w), lambda w=w: drag(opt(w), bl()))
            if shots and k == 1: shot(sid + "_h2")
            if shots and k == 2: shot(sid + "_h3")
        step(rec, "right(%s)" % dd["answer"], lambda: drag(opt(dd["answer"]), bl()))
    else:
        return None
    return rec


def run_first_try(i, s):
    t, dd = s["type"], s["data"]
    entry = mount(i)
    out = []
    if t == "TRAIN_TAP":
        right = [c["word"] for c in dd["coaches"] if c["correct"]][0]
        el = d.execute_script("""return [...document.querySelectorAll('.is-tappable')]
              .find(c=>c.textContent.trim()===arguments[0]);""", right)
        tap(el)
    elif t == "TRAIN_SORT" and not dd.get("demo"):
        for c in dd["cards"]:
            el = d.execute_script("""return [...document.querySelectorAll('.tr-tray .tr-card')]
                  .find(x=>x.dataset.word===arguments[0]);""", c["word"])
            drag(el, find(".tr-body")[[b["key"] for b in dd["bins"]].index(c["bin"])])
            time.sleep(0.3); idle(); out += logs()
    elif t == "WORD_BUILD":
        for k, sl in enumerate(dd["slots"]):
            el = d.execute_script("""return [...document.querySelectorAll('.wb-tray .tr-card')]
                  .find(c=>c.dataset.akshar===arguments[0]);""", sl["head"])
            drag(el, find(".wb-blank")[0])
            time.sleep(0.6); idle(); out += logs()
    elif t == "SENTENCE_COMPLETE":
        el = d.execute_script("""return [...document.querySelectorAll('.sc-opt')]
              .find(b=>b.dataset.word===arguments[0]);""", dd["answer"])
        drag(el, find(".sc-blank")[0])
    elif t == "TRAIN_SORT":
        time.sleep(8)          # the demo runs itself
    else:
        return None
    time.sleep(0.6); idle(); out += logs()
    return {"entry": entry, "clips": out, "state": state()}


for i, s in enumerate(slides):
    try:
        r = run_ladder(i, s)
        if r is not None:
            rep["ladder"][s["id"]] = r
            print(s["id"], "ladder done")
    except Exception as e:
        rep["errors"].append("%s ladder: %r" % (s["id"], e)); print(s["id"], "ERR", e)
for i, s in enumerate(slides):
    try:
        r = run_first_try(i, s)
        if r is not None:
            rep["first_try"][s["id"]] = r
    except Exception as e:
        rep["errors"].append("%s first: %r" % (s["id"], e)); print(s["id"], "ERR first", e)
rep["console"] = [l["message"][:300] for l in d.get_log("browser") if l["level"] in ("SEVERE", "WARNING")]
json.dump(rep, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
d.quit()
print("done")
